import { useCallback, useRef, useState } from "react";
import type { QueryRequest, StreamLine, SubQuestionResult, TraceEvent } from "../types";
import { parseErrorBody } from "../lib/parseErrorBody";
import { api } from "../api/apiSlice";
import { useRefreshSessionMutation } from "../features/auth/authApi";
import { clearCredentials, setCredentials } from "../features/auth/authSlice";
import type { ConversationMessage } from "../features/conversations/conversationsApi";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useChartFocus } from "./useChartFocus";
import { combineSubResultRows } from "../lib/resultVisualization";

// A long answer auto-expands the side panel with its full row data even
// when the prose itself wasn't truncated - past this many rows, "the
// answer" is really the data, not the paragraph above it.
const LONG_ANSWER_ROW_THRESHOLD = 15;

// Empty base URL: in dev, Vite's proxy (see vite.config.ts) forwards these
// paths to the FastAPI backend; in prod, serve the built frontend behind
// the same reverse proxy as the API so paths stay relative.
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export interface ChatTurn {
  id: string;
  question: string;
  trace: TraceEvent[];
  subResults: SubQuestionResult[];
  finalAnswer: string | null;
  answerTruncated: boolean;
  whyExplanation: string | null;
  isStreaming: boolean;
  error: string | null;
}

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

type AskableRequest = Omit<QueryRequest, "stream" | "conversation_id">;

// One conversation's worth of turns, each independently streamed. POST
// /query with stream: true returns a chunked NDJSON body - one JSON object
// per line, discriminated by `type` ("trace" as each graph node finishes,
// "sub_result" per resolved sub-question, then a closing "final" line).
// Each turn tracks its own state so earlier answers stay visible (and keep
// their own collapsed trace) while a new question streams in below them.
//
// This hook does its own fetch (not RTK Query, which can't consume a
// streamed body) and so duplicates apiSlice.ts's auth header + 401
// reauth-once-then-retry handling rather than sharing it.
export function useStreamingChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  // Which DataSource a NEW conversation will be bound to (see
  // app/api/routers/query.py::_resolve_conversation) - null means "use the
  // builtin one". Once conversationId is set, the backend ignores this
  // field anyway (an existing conversation always keeps its own data
  // source), so ChatPage disables the picker at that point too.
  const [dataSourceId, setDataSourceId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [refreshSession] = useRefreshSessionMutation();
  const { focus } = useChartFocus();

  const updateTurn = useCallback((id: string, patch: Partial<ChatTurn> | ((t: ChatTurn) => Partial<ChatTurn>)) => {
    setTurns((all) => all.map((t) => (t.id === id ? { ...t, ...(typeof patch === "function" ? patch(t) : patch) } : t)));
  }, []);

  const startNewConversation = useCallback(() => {
    abortRef.current?.abort();
    setConversationId(null);
    setTurns([]);
  }, []);

  const loadConversation = useCallback((id: string, dataSourceId: string | null, messages: ConversationMessage[]) => {
    abortRef.current?.abort();
    const mapped: ChatTurn[] = [];
    // Messages are stored/returned in pairs (user, then assistant) per turn
    // - see _record_turn in app/api/routers/query.py.
    for (let i = 0; i < messages.length; i += 2) {
      const userMessage = messages[i];
      const assistantMessage = messages[i + 1];
      if (!userMessage) continue;
      mapped.push({
        id: userMessage.id,
        question: userMessage.content,
        trace: assistantMessage?.trace ?? [],
        subResults: assistantMessage?.sub_results ?? [],
        finalAnswer: assistantMessage?.content ?? null,
        answerTruncated: false,
        whyExplanation: assistantMessage?.why_explanation ?? null,
        isStreaming: false,
        error: null,
      });
    }
    setConversationId(id);
    setDataSourceId(dataSourceId);
    setTurns(mapped);
  }, []);

  const ask = useCallback(
    async (request: AskableRequest) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const id = makeId();
      setTurns((all) => [
        ...all,
        {
          id,
          question: request.question,
          trace: [],
          subResults: [],
          finalAnswer: null,
          answerTruncated: false,
          whyExplanation: null,
          isStreaming: true,
          error: null,
        },
      ]);

      const applyLine = (line: StreamLine) => {
        if (line.type === "trace") {
          const event: TraceEvent = line;
          updateTurn(id, (t) => ({ trace: [...t.trace, event] }));
        } else if (line.type === "sub_result") {
          updateTurn(id, (t) => ({ subResults: [...t.subResults, line.result] }));
        } else if (line.type === "final") {
          updateTurn(id, {
            finalAnswer: line.final_answer,
            answerTruncated: line.answer_truncated,
            whyExplanation: line.why_explanation,
            subResults: line.sub_results,
            isStreaming: false,
          });
          setConversationId(line.conversation_id);
          dispatch(api.util.invalidateTags(["Conversations"]));

          const rows = combineSubResultRows(line.sub_results);
          if (line.final_answer && (line.answer_truncated || rows.length > LONG_ANSWER_ROW_THRESHOLD)) {
            focus({ kind: "answer", title: request.question, text: line.final_answer, rows });
          }
        } else if (line.type === "error") {
          updateTurn(id, { isStreaming: false, error: line.message ?? "The agent run failed" });
        }
      };

      const requestBody = JSON.stringify({
        ...request,
        conversation_id: conversationId,
        data_source_id: dataSourceId,
        stream: true,
      });
      const doFetch = (token: string | null) =>
        fetch(`${baseUrl}/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: requestBody,
          signal: controller.signal,
        });

      try {
        let res = await doFetch(accessToken);

        if (res.status === 401) {
          try {
            const session = await refreshSession().unwrap();
            dispatch(setCredentials(session));
            res = await doFetch(session.access_token);
          } catch {
            dispatch(clearCredentials());
            updateTurn(id, { isStreaming: false, error: "Session expired. Please sign in again." });
            return;
          }
        }

        if (!res.ok || !res.body) {
          let message = `Request failed (${res.status})`;
          try {
            message = parseErrorBody(await res.json()) ?? message;
          } catch {
            // Body wasn't JSON (or there was none) - keep the generic message.
          }
          throw new Error(message);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const raw of lines) {
            const line = raw.trim();
            if (line) applyLine(JSON.parse(line) as StreamLine);
          }
        }

        const trailing = buffer.trim();
        if (trailing) applyLine(JSON.parse(trailing) as StreamLine);

        // Stream ended without a "final" line (connection dropped, backend
        // error mid-run) - don't leave the turn stuck showing "pending".
        updateTurn(id, (t) => (t.isStreaming ? { isStreaming: false, error: "Stream ended unexpectedly" } : {}));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Request failed";
        updateTurn(id, { isStreaming: false, error: message });
      }
    },
    [accessToken, conversationId, dataSourceId, dispatch, focus, refreshSession, updateTurn]
  );

  return { turns, ask, conversationId, dataSourceId, setDataSourceId, startNewConversation, loadConversation };
}
