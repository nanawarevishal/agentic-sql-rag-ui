import { titleize, formatValue } from "../lib/format";
import { ChartCard } from "./ChartCard";
import { useChartFocus } from "../hooks/useChartFocus";

interface Props {
  rows: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
  inPanel?: boolean;
}

// Horizontal bars, ranked highest to lowest. One measure across nominal
// categories (product/region/month names have no inherent order), so color
// isn't identity here - it's a sequential ramp on the same accent hue,
// darkest at the top, tracking the ranking bar length already shows. That
// keeps it one hue (never a rainbow across unrelated categories) while
// still giving each bar a distinct shade, which reads clean specifically
// because the bars are sorted - an unsorted ramp would look scattered.
// Value labels sit outside the bar's tip, never inside, so they're never at
// risk of being clipped by a short bar.
export function ResultChart({ rows, labelKey, valueKey, inPanel }: Props) {
  const { focus } = useChartFocus();
  const sorted = [...rows].sort((a, b) => (Number(b[valueKey]) || 0) - (Number(a[valueKey]) || 0));
  const max = Math.max(...sorted.map((r) => Number(r[valueKey]) || 0), 0) || 1;
  const title = `${titleize(valueKey)} by ${titleize(labelKey)}`;

  return (
    <ChartCard
      title={title}
      rows={sorted}
      onExpand={inPanel ? undefined : () => focus({ title, rows: sorted, viz: { type: "bar", labelKey, valueKey } })}
    >
      <ul className="result-bars">
        {sorted.map((row, i) => {
          const value = Number(row[valueKey]) || 0;
          const label = String(row[labelKey]);
          const pct = Math.max((Math.max(value, 0) / max) * 100, 2);
          // Linear-by-rank spread the 45pt range too thin across many rows (e.g. 13
          // rows -> ~3.75pt/step, imperceptible on a single hue). Front-load the
          // contrast with sqrt easing so the long, prominent top bars separate
          // clearly; the tail bars are short anyway so their compression is fine.
          const t = sorted.length > 1 ? i / (sorted.length - 1) : 0;
          const mix = 100 - Math.sqrt(t) * 60;
          return (
            <li key={i} className="result-bar-row" tabIndex={0}>
              <span className="result-bar-label" title={label}>
                {label}
              </span>
              <span className="result-bar-track">
                <span
                  className="result-bar-fill"
                  style={{ width: `${pct}%`, background: `color-mix(in srgb, var(--accent) ${mix}%, var(--surface-hover))` }}
                />
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
