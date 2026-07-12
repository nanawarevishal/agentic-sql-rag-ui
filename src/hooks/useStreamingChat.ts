import { useCallback, useRef, useState } from "react";
import type { QueryRequest, StreamLine, SubQuestionResult, TraceEvent } from "../types";
import { parseErrorBody } from "../lib/parseErrorBody";

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
  isStreaming: boolean;
  error: string | null;
}

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

// One conversation's worth of turns, each independently streamed. POST
// /query with stream: true returns a chunked NDJSON body - one JSON object
// per line, discriminated by `type` ("trace" as each graph node finishes,
// "sub_result" per resolved sub-question, then a closing "final" line).
// Each turn tracks its own state so earlier answers stay visible (and keep
// their own collapsed trace) while a new question streams in below them.
export function useStreamingChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const updateTurn = useCallback((id: string, patch: Partial<ChatTurn> | ((t: ChatTurn) => Partial<ChatTurn>)) => {
    setTurns((all) => all.map((t) => (t.id === id ? { ...t, ...(typeof patch === "function" ? patch(t) : patch) } : t)));
  }, []);

  const ask = useCallback(
    async (request: Omit<QueryRequest, "stream">) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const id = makeId();
      setTurns((all) => [
        ...all,
        { id, question: request.question, trace: [], subResults: [], finalAnswer: null, isStreaming: true, error: null },
      ]);

      const applyLine = (line: StreamLine) => {
        if (line.type === "trace") {
          const event: TraceEvent = line;
          updateTurn(id, (t) => ({ trace: [...t.trace, event] }));
        } else if (line.type === "sub_result") {
          updateTurn(id, (t) => ({ subResults: [...t.subResults, line.result] }));
        } else if (line.type === "final") {
          updateTurn(id, { finalAnswer: line.final_answer, subResults: line.sub_results, isStreaming: false });
        } else if (line.type === "error") {
          updateTurn(id, { isStreaming: false, error: line.message ?? "The agent run failed" });
        }
      };

      try {
        const res = await fetch(`${baseUrl}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...request, stream: true }),
          signal: controller.signal,
        });

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
    [updateTurn]
  );

  return { turns, ask };
}
