import type { SubQuestionResult, TraceEvent } from "../types";
import { buildExplanation } from "../lib/explainAnswer";

interface Props {
  trace: TraceEvent[];
  subResults: SubQuestionResult[];
}

// A terser, user-facing twin of the dev-facing trace panel above - no raw
// SQL, no confidence numbers, just the narrative of what the agent did.
export function AnswerExplain({ trace, subResults }: Props) {
  const sections = buildExplanation(trace, subResults);
  if (sections.length === 0) return null;

  return (
    <details className="answer-explain">
      <summary>Why this answer</summary>
      <div className="answer-explain-body">
        {sections.map((section, i) => (
          <div key={i} className="answer-explain-section">
            {section.subQuestion && <p className="answer-explain-subq">{section.subQuestion}</p>}
            <ul>
              {section.lines.map((line, j) => (
                <li key={j}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
