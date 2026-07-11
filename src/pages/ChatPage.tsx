import { useAppSelector } from "../store/hooks";
import { useRunQueryMutation } from "../api/apiSlice";
import { QueryForm } from "../components/QueryForm";
import { TraceView } from "../components/TraceView";
import { AnswerView } from "../components/AnswerView";

export function ChatPage() {
  const [runQuery, { data, error, isLoading }] = useRunQueryMutation();
  const settings = useAppSelector((state) => state.settings);

  const handleSubmit = (question: string) => {
    runQuery({
      question,
      enable_decomposition: settings.enableDecomposition,
      enable_crag_grading: settings.enableCragGrading,
      enable_self_rag_critique: settings.enableSelfRagCritique,
    });
  };

  return (
    <div className="chat-page">
      <QueryForm onSubmit={handleSubmit} pending={isLoading} />

      {error && (
        <p className="error-banner">
          {"status" in error
            ? `Request failed (${error.status})`
            : "Request failed"}
        </p>
      )}

      {data && (
        <div className="results">
          <TraceView trace={data.trace} />
          <AnswerView result={data} />
        </div>
      )}
    </div>
  );
}
