import { useState } from "react";
import { useAppSelector } from "../store/hooks";
import { useStreamingQuery } from "../hooks/useStreamingQuery";
import { QueryForm } from "../components/QueryForm";
import { TraceView } from "../components/TraceView";
import { AnswerView } from "../components/AnswerView";

export function ChatPage() {
  const settings = useAppSelector((state) => state.settings);
  const { trace, subResults, finalAnswer, isStreaming, error, run } = useStreamingQuery();
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null);

  const handleSubmit = (question: string) => {
    setAskedQuestion(question);
    run({
      question,
      enable_decomposition: settings.enableDecomposition,
      enable_crag_grading: settings.enableCragGrading,
      enable_self_rag_critique: settings.enableSelfRagCritique,
    });
  };

  const hasStarted = askedQuestion !== null;
  const isDone = hasStarted && !isStreaming && !error;

  return (
    <div className="chat-page">
      <div className="chat-scroll">
        {!hasStarted && (
          <div className="chat-hero">
            <span className="chat-hero-eyebrow">Text-to-SQL agent</span>
            <h1>Ask your database anything</h1>
            <p>
              Natural-language questions, decomposed and answered over your live schema —
              with every reasoning step traced.
            </p>
          </div>
        )}

        {hasStarted && (
          <div className="chat-user-message">
            <span className="chat-user-label">You asked</span>
            <p>{askedQuestion}</p>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <strong>Request failed</strong>
            <span>{error}</span>
          </div>
        )}

        {isStreaming && trace.length === 0 && (
          <div className="loading-banner">
            <span className="dot-pulse" />
            Running agent graph...
          </div>
        )}

        {trace.length > 0 && (
          <div className="results">
            <TraceView events={trace} isStreaming={isStreaming} />
            {isDone && (
              <AnswerView
                result={{
                  question: askedQuestion ?? "",
                  final_answer: finalAnswer,
                  sub_results: subResults,
                  trace,
                }}
              />
            )}
          </div>
        )}
      </div>

      <div className="chat-composer-dock">
        <div className="chat-composer-dock-inner">
          <QueryForm onSubmit={handleSubmit} pending={isStreaming} />
        </div>
      </div>
    </div>
  );
}
