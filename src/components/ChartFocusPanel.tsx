import { useEffect } from "react";
import { useChartFocus } from "../hooks/useChartFocus";
import { ResultChart } from "./ResultChart";
import { TrendChart } from "./TrendChart";

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
        {focused.viz.type === "bar" && (
          <ResultChart rows={focused.rows} labelKey={focused.viz.labelKey} valueKey={focused.viz.valueKey} inPanel />
        )}
        {focused.viz.type === "line" && (
          <TrendChart rows={focused.rows} dateKey={focused.viz.dateKey} valueKey={focused.viz.valueKey} inPanel />
        )}
      </div>
    </div>
  );
}
