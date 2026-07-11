import type { QueryResponse } from "../types";

interface Props {
  result: QueryResponse;
}

export function AnswerView({ result }: Props) {
  return (
    <div className="answer-view">
      <h2>Answer</h2>
      <p className="final-answer">
        {result.final_answer ?? "No answer produced."}
      </p>

      {result.sub_results.length > 0 && (
        <details className="sub-results" open>
          <summary>{result.sub_results.length} sub-question result(s)</summary>
          {result.sub_results.map((sub, i) => (
            <div key={i} className="sub-result">
              {sub.sub_question && <strong>{sub.sub_question}</strong>}
              {sub.sql && <pre>{sub.sql}</pre>}
              {typeof sub.retries === "number" && sub.retries > 0 && (
                <span className="retry-badge">{sub.retries} retry(ies)</span>
              )}
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
