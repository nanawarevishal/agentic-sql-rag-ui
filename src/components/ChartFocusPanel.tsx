import { useEffect } from "react";
import { useChartFocus } from "../hooks/useChartFocus";
import { ResultChart } from "./ResultChart";
import { TrendChart } from "./TrendChart";
import { FormattedAnswer, CopyButton } from "./AnswerView";
import { downloadCsv } from "../lib/csvExport";
import { RowsTable } from "./TraceDetail";

function AnswerPanelBody({ text, rows }: { text: string; rows: Array<Record<string, unknown>> }) {
  return (
    <div className="answer-focus-panel-body">
      <div className="answer-header">
        <span className="answer-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        Full answer
        <CopyButton text={text} />
        <button
          type="button"
          className="result-chart-export"
          onClick={() => downloadCsv("answer-data", rows)}
          disabled={rows.length === 0}
          aria-label="Download data as CSV"
          title="Download data as CSV"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </button>
      </div>
      <FormattedAnswer text={text} />
      {rows.length > 0 && (
        <>
          <p className="answer-focus-data-label">Full result data ({rows.length} row{rows.length === 1 ? "" : "s"})</p>
          <RowsTable rows={rows} limit={rows.length} />
        </>
      )}
    </div>
  );
}

export function ChartFocusPanel() {
  const { focused, unfocus } = useChartFocus();

  useEffect(() => {
    if (!focused) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") unfocus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [focused, unfocus]);

  if (!focused) return null;

  return (
    <div className="chart-focus-panel">
      <div className="chart-focus-panel-header">
        <span>{focused.title}</span>
        <button type="button" className="chart-focus-panel-close" onClick={unfocus} aria-label="Close panel">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="chart-focus-panel-body">
        {focused.kind === "chart" && focused.viz.type === "bar" && (
          <ResultChart rows={focused.rows} labelKey={focused.viz.labelKey} valueKey={focused.viz.valueKey} inPanel />
        )}
        {focused.kind === "chart" && focused.viz.type === "line" && (
          <TrendChart rows={focused.rows} dateKey={focused.viz.dateKey} valueKey={focused.viz.valueKey} inPanel />
        )}
        {focused.kind === "answer" && <AnswerPanelBody text={focused.text} rows={focused.rows} />}
      </div>
    </div>
  );
}
