import { useEffect, useRef, useState } from "react";
import type { QueryResponse, Resolution, SubQuestionResult, TraceEvent } from "../types";
import { describeRemedy, turnRestrictions } from "../lib/retrievalFilters";
import { detectVisualization, detectMultiSubResultBar, combineSubResultRows } from "../lib/resultVisualization";
import { ResultChart } from "./ResultChart";
import { TrendChart } from "./TrendChart";
import { StatTile } from "./StatTile";
import { AnswerExplain } from "./AnswerExplain";
import { CitationList } from "./CitationList";
import { useChartFocus } from "../hooks/useChartFocus";

interface Props {
  // conversation_id and resolution_verdicts are omitted: ChatTurn doesn't
  // carry them and nothing in here reads them. Requiring them only made this
  // component impossible to call from ChatTurnView. `resolution` IS read -
  // see DeclinedScopeNote - but stays optional because a turn restored from
  // history has no resolution to restore.
  result: Omit<QueryResponse, "conversation_id" | "resolution" | "resolution_verdicts"> & {
    resolution?: Resolution | null;
  };
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

export function FormattedAnswer({ text }: { text: string }) {
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

export function CopyButton({ text }: { text: string }) {
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

function ExpandAnswerButton({ title, text, rows }: { title: string; text: string; rows: Array<Record<string, unknown>> }) {
  const { focus } = useChartFocus();
  return (
    <button
      type="button"
      className="result-chart-expand"
      onClick={() => focus({ kind: "answer", title, text, rows })}
      aria-label="Expand full answer"
      title="Expand full answer"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
      </svg>
    </button>
  );
}

// Warning only: the answer is still shown. "Partly supported" is the honest
// reading - some of the prose goes beyond what the cited excerpts say, and
// the Sources list below is how a reader checks which parts.
//
// `weakly_grounded` is the document service's own verdict, not this file
// comparing `faithfulness` against a threshold. The threshold is tunable
// config in that repo; a copy of the number here would keep warning by the
// old rule after it moved, with nothing to catch the mismatch.
//
// KNOWN GAP: doc turns recorded before that flag existed have sub_results
// without it, so this can never fire for them on reload. Absent is treated as
// UNKNOWN, not as "grounded" - the reason nothing renders is that there is no
// verdict to report, not that a verdict came back clean. Re-deriving one from
// the stored `faithfulness` is exactly the threshold copy this avoids, so the
// gap stays until those turns age out. It only affects history: any turn run
// since carries the flag.
function GroundingWarning({ subResults }: { subResults: SubQuestionResult[] }) {
  const weak = subResults.some((result) => result.weakly_grounded);
  if (!weak) return null;

  return (
    <div className="grounding-warning" role="status">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4M12 17h.01" />
        <circle cx="12" cy="12" r="9" />
      </svg>
      <span>
        Parts of this answer aren't fully supported by the sources below - worth checking the excerpts
        before relying on it.
      </span>
    </div>
  );
}

// A decline is the one outcome where a silent pre-filter does real damage:
// "nothing here covers that" reads as a fact about the whole corpus, when it
// may only be a fact about the slice that was searched. The narrowing comes
// from the question's own phrasing ("in the safety policy", "in 2023"), so
// naming it is usually enough for someone to see what to rephrase.
//
// The suggestion follows the restriction that actually fired. Advice to drop
// a document name when the filter was a year is the same wrong-but-fluent
// failure in a different costume: it sounds actionable, changes nothing, and
// leaves the reader concluding the corpus has no answer.
//
// Restrictions only - asking for version history widens the search, and
// reporting that as a limit would be backwards. See lib/retrievalFilters.
function DeclinedScopeNote({
  resolution,
  trace,
}: {
  resolution?: Resolution | null;
  trace: TraceEvent[];
}) {
  if (resolution !== "declined") return null;

  const restrictions = turnRestrictions(trace);
  if (restrictions.length === 0) return null;

  return (
    <div className="scope-note" role="note">
      <span>
        This searched only <strong>{restrictions.map((r) => r.phrase).join(" and ")}</strong>,
        because that's what the question asked for. {describeRemedy(restrictions)}
      </span>
    </div>
  );
}

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
        {hasAnswer && (
          <ExpandAnswerButton
            title={result.question}
            text={result.final_answer as string}
            rows={combineSubResultRows(result.sub_results)}
          />
        )}
      </div>
      {hasAnswer ? (
        <FormattedAnswer text={result.final_answer as string} />
      ) : (
        <p className="answer-empty-hint">
          The agent couldn't produce a final answer for this one. Try rephrasing the question, being more
          specific about what you're asking, or splitting it into smaller questions.
        </p>
      )}
      <DeclinedScopeNote resolution={result.resolution} trace={result.trace} />
      {hasAnswer && (
        <AnswerExplain
          whyExplanation={result.why_explanation}
          trace={result.trace}
          subResults={result.sub_results}
        />
      )}
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
      {hasAnswer && <GroundingWarning subResults={result.sub_results} />}
      {/* Document answers cite passages instead of returning rows, so the
          charts above simply find nothing to draw and this renders instead.
          Both branches are driven by what the sub-results actually contain
          rather than by the project type, so neither has to know which agent
          produced the turn. */}
      <CitationList citations={result.citations} subResults={result.sub_results} />
    </div>
  );
}
