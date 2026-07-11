import { useCallback, useEffect, useRef, useState } from "react";
import type { QueryRequest, StreamLine, SubQuestionResult, TraceEvent } from "../types";

// Empty base URL: in dev, Vite's proxy (see vite.config.ts) forwards these
// paths to the FastAPI backend; in prod, serve the built frontend behind
// the same reverse proxy as the API so paths stay relative.
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

interface StreamState {
  trace: TraceEvent[];
  subResults: SubQuestionResult[];
  finalAnswer: string | null;
  isStreaming: boolean;
  error: string | null;
}

const idleState: StreamState = {
  trace: [],
  subResults: [],
  finalAnswer: null,
  isStreaming: false,
  error: null,
};

// POST /query with stream: true returns a chunked NDJSON body - one JSON
// object per line, discriminated by `type` ("trace" as each graph node
// finishes, "sub_result" per resolved sub-question, then a closing
// "final" line). This reads the body incrementally via a ReadableStream
// reader so the UI reflects each node as the backend actually runs it,
// rather than replaying a trace that already arrived in full.
export function useStreamingQuery() {
  const [state, setState] = useState<StreamState>(idleState);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(async (request: Omit<QueryRequest, "stream">) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ trace: [], subResults: [], finalAnswer: null, isStreaming: true, error: null });

    const applyLine = (line: StreamLine) => {
      if (line.type === "trace") {
        const event: TraceEvent = line;
        setState((s) => ({ ...s, trace: [...s.trace, event] }));
      } else if (line.type === "sub_result") {
        setState((s) => ({ ...s, subResults: [...s.subResults, line.result] }));
      } else if (line.type === "final") {
        setState((s) => ({
          ...s,
          finalAnswer: line.final_answer,
          subResults: line.sub_results,
          isStreaming: false,
        }));
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
        throw new Error(`Request failed (${res.status})`);
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
      // error mid-run) - don't leave the UI stuck showing "pending".
      setState((s) => (s.isStreaming ? { ...s, isStreaming: false, error: "Stream ended unexpectedly" } : s));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Request failed";
      setState((s) => ({ ...s, isStreaming: false, error: message }));
    }
  }, []);

  return { ...state, run };
}
