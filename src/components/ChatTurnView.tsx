import type { ChatTurn } from "../hooks/useStreamingChat";
import { TraceView } from "./TraceView";
import { AnswerView } from "./AnswerView";

interface Props {
  turn: ChatTurn;
}

export function ChatTurnView({ turn }: Props) {
  const isDone = !turn.isStreaming && !turn.error;

  return (
    <div className="chat-turn">
      <div className="chat-user-message">
        <span className="chat-user-label">You asked</span>
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

      {turn.trace.length > 0 && (
        <div className="results">
          <TraceView events={turn.trace} isStreaming={turn.isStreaming} />
          {isDone && (
            <AnswerView
              result={{
                question: turn.question,
                final_answer: turn.finalAnswer,
                sub_results: turn.subResults,
                trace: turn.trace,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
