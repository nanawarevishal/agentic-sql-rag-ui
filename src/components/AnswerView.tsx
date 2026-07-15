import { useEffect, useRef, useState } from "react";
import type { QueryResponse } from "../types";
import { detectVisualization, detectMultiSubResultBar } from "../lib/resultVisualization";
import { ResultChart } from "./ResultChart";
import { TrendChart } from "./TrendChart";
import { StatTile } from "./StatTile";
import { AnswerExplain } from "./AnswerExplain";

interface Props {
  result: Omit<QueryResponse, "conversation_id">;
}

// The SQL behind each sub-question already lives in the trace panel above
// (Generate SQL / Execute SQL step details), so it doesn't repeat here. But
// for a single-question data-retrieval query, the result *rows* are part of
// the takeaway, not implementation detail - when they resolve to a clean
// category+measure shape, they're worth visualizing rather than leaving
// buried in a collapsed trace step.
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

// Once the trace collapses and this mounts, nothing else scrolls the page -
// the last "keep the active trace step visible" auto-scroll (in TraceView)
// happened before this existed, so the viewport can easily be left sitting
// wherever that stopped. Bring the freshly-revealed answer (and any chart
// under it) into view once, the same way the trace already does per-step.
const HEADER_CLEARANCE = 90;
const DOCK_CLEARANCE = 200;

export function AnswerView({ result }: Props) {
  const hasAnswer = Boolean(result.final_answer);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const isVisible = rect.top >= HEADER_CLEARANCE && rect.bottom <= window.innerHeight - DOCK_CLEARANCE;
    if (!isVisible) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const singleSubResult = result.sub_results.length === 1 ? result.sub_results[0] : null;
  const visualization = singleSubResult ? detectVisualization(singleSubResult.rows) : null;
  // Decomposition can split one time-series/comparison question into N
  // single-value sub-questions, each too small to chart alone - recombine
  // them into a ranked bar rather than losing the visualization entirely.
  const multiBar = !singleSubResult && result.sub_results.length > 1 ? detectMultiSubResultBar(result.sub_results) : null;

  return (
    <div ref={rootRef} className={`answer-view ${hasAnswer ? "" : "is-empty"}`}>
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
      {hasAnswer && <AnswerExplain trace={result.trace} subResults={result.sub_results} />}
      {visualization && singleSubResult?.rows && (
        <>
          {visualization.type === "stat" && (
            <StatTile row={singleSubResult.rows[0]} valueKey={visualization.valueKey} labelKey={visualization.labelKey} />
          )}
          {visualization.type === "bar" && (
            <ResultChart rows={singleSubResult.rows} labelKey={visualization.labelKey} valueKey={visualization.valueKey} />
          )}
          {visualization.type === "line" && (
            <TrendChart rows={singleSubResult.rows} dateKey={visualization.dateKey} valueKey={visualization.valueKey} />
          )}
        </>
      )}
      {multiBar && <ResultChart rows={multiBar.rows} labelKey={multiBar.labelKey} valueKey={multiBar.valueKey} />}
    </div>
  );
}
