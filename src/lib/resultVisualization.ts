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

// SQL aggregates (SUM/AVG) over an empty group come back NULL, not 0 - a
// month with zero delivered orders is real, chartable "no data", not a
// reason to disqualify the whole column. Treated as 0 wherever it's read
// (chart components already do `Number(v) || 0`); a column only needs at
// least one row with an actual number to count as numeric.
function isNumericOrNull(v: unknown): boolean {
  return v === null || (typeof v === "number" && Number.isFinite(v));
}

function isNumericColumn(rows: Array<Record<string, unknown>>, key: string): boolean {
  return rows.every((r) => isNumericOrNull(r[key])) && rows.some((r) => typeof r[key] === "number");
}

export function detectVisualization(rows: Array<Record<string, unknown>> | undefined): Visualization | null {
  if (!rows || rows.length === 0) return null;

  const keys = Object.keys(rows[0]);
  const isStringCol = (k: string) => rows.every((r) => typeof r[k] === "string");

  const stringCols = keys.filter(isStringCol);
  const numberCols = keys.filter((k) => isNumericColumn(rows, k));

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

function longestCommonPrefix(strings: string[]): string {
  let prefix = strings[0];
  for (const s of strings.slice(1)) {
    while (prefix && !s.startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (!prefix) return "";
  }
  return prefix;
}

function longestCommonSuffix(strings: string[]): string {
  const reverse = (s: string) => [...s].reverse().join("");
  return reverse(longestCommonPrefix(strings.map(reverse)));
}

// Decomposition often produces sub-questions that share a template with only
// one span varying ("...revenue in April 2018?" / "...revenue in May
// 2018?"), so stripping the longest common prefix/suffix recovers a clean
// label ("April", "May") without parsing dates or any domain-specific
// pattern - it works for any decomposed-by-one-dimension set, not just time.
function stripCommonAffixes(labels: string[]): string[] {
  if (labels.length < 2) return labels;
  const prefix = longestCommonPrefix(labels);
  const suffix = longestCommonSuffix(labels);

  const stripped = labels.map((l) => {
    let s = l;
    if (prefix && s.length > prefix.length) s = s.slice(prefix.length);
    if (suffix && s.length > suffix.length) s = s.slice(0, s.length - suffix.length);
    return s.trim().replace(/^[,:;\-–—\s]+|[,:;\-–—\s]+$/g, "");
  });

  const collapsedToNothingOrDuplicates = stripped.some((s) => s.length === 0) || new Set(stripped).size !== stripped.length;
  return collapsedToNothingOrDuplicates ? labels : stripped;
}

export interface MultiResultBar {
  rows: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
}

// Fallback for decomposed answers: when the planner splits one time-series
// or comparison question into N single-value sub-questions (each losing its
// own chart eligibility by being just 1 row), recombine them into a ranked
// bar chart instead of showing nothing. Deliberately NOT a line chart here -
// there's no reliable way to recover chronological order from sub-question
// text without date-parsing, which is exactly the fragility this avoids.
export function detectMultiSubResultBar(
  subResults: Array<{ sub_question?: string; rows?: Array<Record<string, unknown>> }>
): MultiResultBar | null {
  if (subResults.length < MIN_SERIES_ROWS || subResults.length > MAX_BAR_ROWS) return null;
  if (!subResults.every((s) => Array.isArray(s.rows) && s.rows.length === 1)) return null;
  if (!subResults.every((s) => typeof s.sub_question === "string" && s.sub_question.trim().length > 0)) return null;

  const singleRows = subResults.map((s) => s.rows![0]);
  const candidateKeys = Object.keys(singleRows[0]);
  const sharedNumericKeys = candidateKeys.filter((k) => isNumericColumn(singleRows, k));
  if (sharedNumericKeys.length !== 1) return null;

  const valueKey = sharedNumericKeys[0];
  const labels = stripCommonAffixes(subResults.map((s) => s.sub_question!.trim()));
  const rows = subResults.map((s, i) => ({ sub_question: labels[i], [valueKey]: s.rows![0][valueKey] ?? 0 }));

  return { rows, labelKey: "sub_question", valueKey };
}
