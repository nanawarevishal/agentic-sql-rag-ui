// Picks a visualization for a single sub-question's result rows, per the
// dataviz "is it even a chart?" table: a single aggregate is a stat tile
// (never a one-bar bar chart), a date column + one measure is a trend line,
// and a category column + one measure is a ranked bar chart. Anything that
// doesn't resolve unambiguously to one of these renders nothing extra - the
// prose answer is always there regardless, this only ever supplements it.
export type Visualization =
  | { type: "stat"; valueKey: string; labelKey?: string }
  | { type: "line"; dateKey: string; valueKey: string }
  | { type: "bar"; labelKey: string; valueKey: string };

const DATE_PATTERN = /^\d{4}-\d{2}(-\d{2})?/;
const MIN_SERIES_ROWS = 2;
const MAX_BAR_ROWS = 20;
const MAX_LINE_ROWS = 60;

export function detectVisualization(rows: Array<Record<string, unknown>> | undefined): Visualization | null {
  if (!rows || rows.length === 0) return null;

  const keys = Object.keys(rows[0]);
  const isStringCol = (k: string) => rows.every((r) => typeof r[k] === "string");
  const isNumberCol = (k: string) => rows.every((r) => typeof r[k] === "number" && Number.isFinite(r[k]));

  const stringCols = keys.filter(isStringCol);
  const numberCols = keys.filter(isNumberCol);

  if (rows.length === 1 && numberCols.length === 1 && keys.length <= 2) {
    return { type: "stat", valueKey: numberCols[0], labelKey: stringCols[0] };
  }

  if (stringCols.length !== 1 || numberCols.length !== 1) return null;
  const [labelKey] = stringCols;
  const [valueKey] = numberCols;

  const isDateLike = rows.every((r) => DATE_PATTERN.test(String(r[labelKey])));

  if (isDateLike) {
    if (rows.length >= MIN_SERIES_ROWS && rows.length <= MAX_LINE_ROWS) {
      return { type: "line", dateKey: labelKey, valueKey };
    }
    return null;
  }

  if (rows.length >= MIN_SERIES_ROWS && rows.length <= MAX_BAR_ROWS) {
    return { type: "bar", labelKey, valueKey };
  }

  return null;
}
