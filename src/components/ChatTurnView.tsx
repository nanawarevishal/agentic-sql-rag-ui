import { useState } from "react";
import type { ChatTurn } from "../hooks/useStreamingChat";
import type { ProjectKind } from "../lib/traceModules";
import { TraceView } from "./TraceView";
import { AnswerView } from "./AnswerView";

interface Props {
  turn: ChatTurn;
  // Which agent produced this turn, so the trace panel can name its stages
  // in the right vocabulary (passages vs tables).
  projectType?: ProjectKind;
}

function TraceToggleButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="trace-toggle-btn"
      onClick={onClick}
      aria-expanded={open}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v6h6M20 20v-6h-6M4 10a8 8 0 0 1 14.5-4.5M20 14a8 8 0 0 1-14.5 4.5" />
      </svg>
      {open ? "Hide agent trace" : "Agent trace"}
    </button>
  );
}

export function ChatTurnView({ turn, projectType }: Props) {
  const isDone = !turn.isStreaming && !turn.error;
  const hasTrace = turn.trace.length > 0;
  const [showTrace, setShowTrace] = useState(false);

  // The trace streams live and stays visible while the run is in progress -
  // that's the "wow moment" of watching the agent reason. Once the answer is
  // complete, it collapses behind a toggle in the question header instead:
  // the answer is the point at that stage, and the reasoning steps are still
  // one click away for anyone who wants to inspect them.
  const traceVisible = hasTrace && (!isDone || showTrace);

  return (
    <div className="chat-turn">
      <div className="chat-user-message">
        <div className="chat-user-message-header">
          <span className="chat-user-label">You asked</span>
          {isDone && hasTrace && (
            <TraceToggleButton open={showTrace} onClick={() => setShowTrace((v) => !v)} />
          )}
        </div>
        <p>{turn.question}</p>
      </div>

      {turn.error && (
        <div className="error-banner">
          <strong>Request failed</strong>
          <span>{turn.error}</span>
        </div>
      )}

      {turn.isStreaming && turn.trace.length === 0 && (
        <div className="loading-banner">
          <span className="dot-pulse" />
          Running agent graph...
        </div>
      )}

      {(traceVisible || isDone) && (
        <div className="results">
          {traceVisible && (
            <TraceView events={turn.trace} isStreaming={turn.isStreaming} projectType={projectType} />
          )}
          {isDone && (
            <AnswerView
              result={{
                question: turn.question,
                final_answer: turn.finalAnswer,
                answer_truncated: turn.answerTruncated,
                why_explanation: turn.whyExplanation,
                sub_results: turn.subResults,
                citations: turn.citations,
                resolution: turn.resolution,
                trace: turn.trace,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
