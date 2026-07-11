import type { QueryResponse } from "../types";

interface Props {
  result: QueryResponse;
}

export function AnswerView({ result }: Props) {
  return (
    <div className="answer-view">
      <div className="answer-header">
        <span className="answer-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        Answer
      </div>
      <p className="final-answer">{result.final_answer ?? "No answer produced."}</p>

      {result.sub_results.length > 0 && (
        <details className="sub-results">
          <summary>{result.sub_results.length} sub-question result(s)</summary>
          <div className="sub-results-list">
            {result.sub_results.map((sub, i) => (
              <div key={i} className="sub-result">
                {sub.sub_question && <strong>{sub.sub_question}</strong>}
                {sub.sql && <pre className="sql-block">{sub.sql}</pre>}
                {typeof sub.retries === "number" && sub.retries > 0 && (
                  <span className="retry-badge">
                    {sub.retries} {sub.retries === 1 ? "retry" : "retries"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
