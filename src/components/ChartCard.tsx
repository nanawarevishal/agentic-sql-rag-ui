import { useState, type ReactNode } from "react";
import { RowsTable } from "./TraceDetail";
import { downloadCsv } from "../lib/csvExport";

interface Props {
  title: string;
  rows: Array<Record<string, unknown>>;
  children: ReactNode;
  onExpand?: () => void;
}

// Shared chrome for every result visualization: a title, a Chart/Table
// toggle, and the table view itself - the WCAG-clean twin every chart needs
// (every value stays reachable without relying on the chart rendering).
// onExpand is omitted entirely when this card is already the one rendering
// inside the focus panel, so there's no button to expand an already-expanded
// chart into itself.
export function ChartCard({ title, rows, children, onExpand }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <div className="result-chart">
      <div className="result-chart-header">
        <span className="result-chart-title">{title}</span>
        <div className="result-chart-header-actions">
          <div className="result-chart-toggle" role="tablist">
            <button type="button" role="tab" aria-selected={view === "chart"} className={view === "chart" ? "is-active" : ""} onClick={() => setView("chart")}>
              Chart
            </button>
            <button type="button" role="tab" aria-selected={view === "table"} className={view === "table" ? "is-active" : ""} onClick={() => setView("table")}>
              Table
            </button>
          </div>
          <button
            type="button"
            className="result-chart-export"
            onClick={() => downloadCsv(title, rows)}
            disabled={rows.length === 0}
            aria-label="Export CSV"
            title="Export CSV"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
          </button>
          {onExpand && (
            <button type="button" className="result-chart-expand" onClick={onExpand} aria-label="Expand chart" title="Expand chart">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {view === "chart" ? children : <RowsTable rows={rows} limit={rows.length} />}
    </div>
  );
}
