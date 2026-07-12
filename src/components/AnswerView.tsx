import { useState } from "react";
import type { QueryResponse } from "../types";

interface Props {
  result: QueryResponse;
}

// The SQL/row-level detail behind each sub-question already lives in the
// trace panel above (Generate SQL / Execute SQL step details) - this view's
// only job is the takeaway, so it stays prose-only rather than repeating it.
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );
}

function FormattedAnswer({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);

  return (
    <div className="final-answer">
      {blocks.map((block, i) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const isBulleted = lines.length > 0 && lines.every((l) => /^[-*]\s+/.test(l));
        const isNumbered = lines.length > 0 && lines.every((l) => /^\d+\.\s+/.test(l));

        if (isBulleted) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        if (isNumbered) {
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\d+\.\s+/, ""))}</li>
              ))}
            </ol>
          );
        }
        return <p key={i}>{renderInline(lines.join(" "))}</p>;
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="copy-answer-btn"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function AnswerView({ result }: Props) {
  const hasAnswer = Boolean(result.final_answer);

  return (
    <div className={`answer-view ${hasAnswer ? "" : "is-empty"}`}>
      <div className="answer-header">
        <span className="answer-icon">
          {hasAnswer ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
        </span>
        {hasAnswer ? "Answer" : "No answer"}
        {hasAnswer && <CopyButton text={result.final_answer as string} />}
      </div>
      {hasAnswer ? (
        <FormattedAnswer text={result.final_answer as string} />
      ) : (
        <p className="answer-empty-hint">
          The agent couldn't produce a final answer for this one. Try rephrasing the question, being more
          specific about what you're asking, or splitting it into smaller questions.
        </p>
      )}
    </div>
  );
}
