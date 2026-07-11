import { useAppSelector } from "../store/hooks";
import { useRunQueryMutation } from "../api/apiSlice";
import { QueryForm } from "../components/QueryForm";
import { TraceView } from "../components/TraceView";
import { AnswerView } from "../components/AnswerView";
import { useTraceReveal } from "../hooks/useTraceReveal";

export function ChatPage() {
  const [runQuery, { data, error, isLoading }] = useRunQueryMutation();
  const settings = useAppSelector((state) => state.settings);
  const { visibleEvents, isStreaming } = useTraceReveal(data?.trace ?? []);

  const handleSubmit = (question: string) => {
    runQuery({
      question,
      enable_decomposition: settings.enableDecomposition,
      enable_crag_grading: settings.enableCragGrading,
      enable_self_rag_critique: settings.enableSelfRagCritique,
    });
  };

  const hasResult = Boolean(data);

  return (
    <div className="chat-page">
      {!hasResult && !isLoading && (
        <div className="chat-hero">
          <span className="chat-hero-eyebrow">Text-to-SQL agent</span>
          <h1>Ask your database anything</h1>
          <p>
            Natural-language questions, decomposed and answered over your live schema —
            with every reasoning step traced.
          </p>
        </div>
      )}

      <QueryForm onSubmit={handleSubmit} pending={isLoading} />

      {error && (
        <div className="error-banner">
          <strong>Request failed</strong>
          <span>{"status" in error ? `Status ${error.status}` : "Please try again."}</span>
        </div>
      )}

      {isLoading && !data && (
        <div className="loading-banner">
          <span className="dot-pulse" />
          Running agent graph...
        </div>
      )}

      {data && (
        <div className="results">
          <TraceView events={visibleEvents} isStreaming={isStreaming} />
          {!isStreaming && <AnswerView result={data} />}
        </div>
      )}
    </div>
  );
}
