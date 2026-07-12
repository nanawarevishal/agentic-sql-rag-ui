import { titleize } from "../lib/format";

interface Props {
  row: Record<string, unknown>;
  valueKey: string;
  labelKey?: string;
}

const MONEY_KEY_PATTERN = /revenue|price|amount|cost|payment|earnings|spend/i;

// Auto-compact above a million, per the dataviz figure contract - but this
// tile sits right next to the prose answer stating the exact figure (e.g.
// "There are 96,096 customers"), so unlike a dashboard hero metric, showing
// "96.1K" here would read as an inconsistency, not a simplification.
// Proportional figures, not tabular-nums (that's for columns that must
// align vertically; a standalone hero number reads loose with it).
function formatCompact(value: number, key: string): string {
  const prefix = MONEY_KEY_PATTERN.test(key) ? "$" : "";
  const abs = Math.abs(value);
  if (abs < 1_000_000) return prefix + value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (abs < 1_000_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  return `${prefix}${(value / 1_000_000_000).toFixed(1)}B`;
}

// A single aggregate value is a stat tile, not a one-bar bar chart - the
// number already fully visible as text, no hover/table twin needed since
// nothing is hidden behind interaction.
export function StatTile({ row, valueKey, labelKey }: Props) {
  const value = Number(row[valueKey]) || 0;
  const label = labelKey ? String(row[labelKey]) : titleize(valueKey);

  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value">{formatCompact(value, valueKey)}</span>
    </div>
  );
}
