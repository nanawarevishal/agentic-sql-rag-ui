import { titleize, formatValue } from "../lib/format";
import { ChartCard } from "./ChartCard";
import { useChartFocus } from "../hooks/useChartFocus";

interface Props {
  rows: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
  inPanel?: boolean;
}

// Horizontal bars: one nominal series (product/category/region names have no
// inherent order), so every bar takes the same accent hue rather than a
// value-ramp - color would just double-encode what bar length already shows.
// Value labels sit outside the bar's tip, never inside, so they're never at
// risk of being clipped by a short bar.
export function ResultChart({ rows, labelKey, valueKey, inPanel }: Props) {
  const { focus } = useChartFocus();
  const max = Math.max(...rows.map((r) => Number(r[valueKey]) || 0), 0) || 1;
  const title = `${titleize(valueKey)} by ${titleize(labelKey)}`;

  return (
    <ChartCard
      title={title}
      rows={rows}
      onExpand={inPanel ? undefined : () => focus({ title, rows, viz: { type: "bar", labelKey, valueKey } })}
    >
      <ul className="result-bars">
        {rows.map((row, i) => {
          const value = Number(row[valueKey]) || 0;
          const label = String(row[labelKey]);
          const pct = Math.max((Math.max(value, 0) / max) * 100, 2);
          return (
            <li key={i} className="result-bar-row" tabIndex={0}>
              <span className="result-bar-label" title={label}>
                {label}
              </span>
              <span className="result-bar-track">
                <span className="result-bar-fill" style={{ width: `${pct}%` }} />
              </span>
              <span className="result-bar-value">{formatValue(value, valueKey)}</span>
              <span className="result-bar-tooltip">
                <strong>{formatValue(value, valueKey)}</strong>
                <span>{label}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}
