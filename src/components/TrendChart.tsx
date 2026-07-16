import { titleize, formatValue } from "../lib/format";
import { ChartCard } from "./ChartCard";
import { useChartFocus } from "../hooks/useChartFocus";

interface Props {
  rows: Array<Record<string, unknown>>;
  dateKey: string;
  valueKey: string;
  inPanel?: boolean;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Parsed from the ISO string directly rather than via `new Date(...)` -
// Date's local-timezone rendering can shift a UTC-midnight date to the
// previous day depending on the viewer's timezone.
function formatDateLabel(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!m) return iso;
  const [, year, month, day] = m;
  const monthName = MONTH_NAMES[Number(month) - 1] ?? month;
  if (!day || day === "01") return `${monthName} ${year}`;
  return `${monthName} ${Number(day)}, ${year}`;
}

// A single-series trend: 2px line + a ~10% area wash beneath it, scaled to
// the data's own min/max (not forced to a zero baseline) since the job here
// is the shape of change, not an absolute magnitude comparison. Line shape
// renders in SVG (viewBox 0-100 on both axes, non-uniform scaling to fill
// the container); points, labels and tooltips are plain HTML positioned by
// the same 0-100% coordinates so text never inherits the SVG's stretch.
export function TrendChart({ rows, dateKey, valueKey, inPanel }: Props) {
  const { focus } = useChartFocus();
  const values = rows.map((r) => Number(r[valueKey]) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const paddedMin = min - range * 0.15;
  const paddedMax = max + range * 0.15;
  const span = paddedMax - paddedMin || 1;

  const points = rows.map((row, i) => {
    const value = Number(row[valueKey]) || 0;
    const x = rows.length > 1 ? 2 + (i / (rows.length - 1)) * 96 : 50;
    const y = 10 + (1 - (value - paddedMin) / span) * 80;
    return { x, y, value, date: String(row[dateKey]) };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x},100 L ${points[0].x},100 Z`;
  const last = points[points.length - 1];
  const first = points[0];
  const title = `${titleize(valueKey)} over time`;

  return (
    <ChartCard title={title} rows={rows} onExpand={inPanel ? undefined : () => focus({ kind: "chart", title, rows, viz: { type: "line", dateKey, valueKey } })}>
      <div className="result-line-plot">
        <div className="result-line-canvas">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="result-line-svg">
            <path d={areaPath} className="result-line-area" />
            <path d={linePath} className="result-line-stroke" vectorEffect="non-scaling-stroke" />
          </svg>
          {points.map((p, i) => (
            <div key={i} className="result-line-point" style={{ left: `${p.x}%`, top: `${p.y}%` }} tabIndex={0}>
              <span className="result-line-dot" />
              <span className="result-bar-tooltip result-line-tooltip">
                <strong>{formatValue(p.value, valueKey)}</strong>
                <span>{formatDateLabel(p.date)}</span>
              </span>
            </div>
          ))}
          <span className="result-line-endlabel" style={{ left: `${last.x}%`, top: `${last.y}%` }}>
            {formatValue(last.value, valueKey)}
          </span>
        </div>
        <div className="result-line-axis-row">
          <span className="result-line-axis-label">{formatDateLabel(first.date)}</span>
          <span className="result-line-axis-label">{formatDateLabel(last.date)}</span>
        </div>
      </div>
    </ChartCard>
  );
}
