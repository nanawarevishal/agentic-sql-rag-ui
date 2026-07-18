import type { SubQuestionResult, TraceEvent } from "../types";
import { buildExplanation } from "../lib/explainAnswer";

interface Props {
  whyExplanation: string | null;
  trace: TraceEvent[];
  subResults: SubQuestionResult[];
}

// A terser, user-facing twin of the dev-facing trace panel above - no raw
// SQL, no confidence numbers, just the narrative of what the agent did.
//
// whyExplanation is synthesize's plain-language, LLM-written account of why
// this answer is correct (see app/agent/nodes/synthesize.py's _explain) -
// grounded in the same SQL/rows as final_answer itself, so it can describe
// the actual reasoning (what was compared/filtered/calculated) without any
// database jargon. It leads the panel when present; the per-sub-question
// facts below it (tables actually used, retries, row counts) are cheap,
// deterministic bullets rather than LLM output, so they stay even when the
// explanation call didn't run or failed.
export function AnswerExplain({ whyExplanation, trace, subResults }: Props) {
  const sections = buildExplanation(trace, subResults);
  if (!whyExplanation && sections.length === 0) return null;

  return (
    <details className="answer-explain">
      <summary>Why this answer</summary>
      <div className="answer-explain-body">
        {whyExplanation && <p className="answer-explain-summary">{whyExplanation}</p>}
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
