# Result Visualization

Auto-generated charts/stat tiles rendered alongside the agent's natural-language
answer, so a result isn't just prose + a collapsed trace of raw rows. **This is
already implemented** (frontend-only, no backend involvement) — this doc exists
because the feature was never written up anywhere; `PROJECT_CONTEXT.md`'s
"agentic orchestration ... ideally with a chart or summary table" bullet still
reads as an open item and is stale against the actual code.

## Where it lives

All in `agentic-sql-rag-ui`, purely client-side — the backend `/query` response
(`sub_results[].rows`) is unchanged; visualization is entirely a rendering
decision made from data that was already being returned.

| File | Role |
|---|---|
| `src/lib/resultVisualization.ts` | Heuristics that pick a chart type (or none) from a result's shape |
| `src/lib/format.ts` | Number/label formatting shared by every chart (`titleize`, `formatValue`) |
| `src/components/StatTile.tsx` | Single-aggregate result → one hero number |
| `src/components/ResultChart.tsx` | Category + measure → ranked horizontal bar chart |
| `src/components/TrendChart.tsx` | Date + measure → line/area trend chart |
| `src/components/ChartCard.tsx` | Shared chrome: title, Chart/Table toggle, expand button |
| `src/context/ChartFocusContext.ts`, `ChartFocusProvider.tsx`, `useChartFocus.ts` | Lets any chart expand into a larger side panel |
| `src/components/ChartFocusPanel.tsx` | Renders the currently-expanded chart |
| `src/components/AnswerView.tsx` | Wires it all together under the answer text |

## How the chart type is chosen

`detectVisualization()` (`src/lib/resultVisualization.ts:30`) runs once per
answer, on the single sub-question's `rows` (only when there's exactly one
sub-question — see the multi-sub-question fallback below). It never asks an
LLM — it's a pure shape check against the "is it even a chart?" rule of thumb:

| Shape | Result |
|---|---|
| 1 row, 1 numeric column (+ optional label column) | **Stat tile** — a single number is never forced into a one-bar bar chart |
| 1 string column + 1 numeric column, values look like dates (`YYYY-MM` / `YYYY-MM-DD`), 2–60 rows | **Trend line** |
| 1 string column + 1 numeric column, not date-like, 2–20 rows | **Ranked bar chart** |
| Anything else (multiple string/numeric columns, 1 row with 2+ metrics, >20/60 rows, all-null numerics, etc.) | **Nothing** — falls back to prose + the trace's raw-rows table only |

The row/column-count bounds exist so a chart is never rendered when it'd be
either meaningless (1 bar) or unreadable (60+ bars) — in those cases the
answer text and the trace's row table are considered sufficient on their own.

### Multi-sub-question fallback

When the planner decomposes a question into 2+ sub-questions (e.g. "compare Q1
vs Q2 revenue"), each sub-question's own result is often just 1 row — too
small to chart individually. `detectMultiSubResultBar()`
(`src/lib/resultVisualization.ts:110`) recombines them: if every sub-result is
exactly 1 row and they all share one common numeric column, it builds a single
ranked bar chart across sub-questions, using `sub_question` text (with the
longest common prefix/suffix stripped, so "...revenue in Q1 2017" / "...revenue
in Q2 2017" becomes "Q1 2017" / "Q2 2017") as the bar labels. Deliberately never
a line chart here — there's no reliable way to recover chronological order from
sub-question text without date-parsing.

## Rendering (`AnswerView.tsx`)

```
visualization = detectVisualization(singleSubResult.rows)   // when 1 sub-question
multiBar      = detectMultiSubResultBar(sub_results)         // when 2+ sub-questions
```
Whichever fires (at most one ever does) renders directly below the prose
answer. If neither fires, nothing extra renders — the answer is always shown
regardless of whether a visualization exists.

## Accessibility: every chart has a table twin

`ChartCard` wraps every chart with a **Chart / Table** toggle
(`src/components/ChartCard.tsx:17`) — switching to "Table" renders the same
rows via `RowsTable` (shared with the trace panel's raw-row view). No value is
ever only reachable by hovering/interacting with the chart.

## Expand-to-panel

Every chart has an expand button that opens it larger in a side panel
(`ChartFocusProvider`/`ChartFocusPanel`), one at a time — opening a new chart
replaces whichever was already focused, and `Escape` closes it. Scoped to the
chat page only (the only place charts render), not the whole app.

## Formatting rules

- **Compact numbers** (`StatTile` / `formatCompact`): values ≥ 1M render as
  `1.2M` / `3.4B`; the stat tile is the one exception where a large number
  still renders in full precision-abbreviated form even next to prose stating
  the exact figure, per `src/components/StatTile.tsx:11-23`.
- **Money detection**: any column matching `/revenue|price|amount|cost|payment|earnings|spend/i`
  gets a `$` prefix (`src/lib/format.ts`) — a deliberately narrow pattern so it
  doesn't misfire on `total_orders`-style counts.
- **Bar color**: single accent hue, sequential ramp from dark (rank 1) to
  light (last rank) using sqrt easing so the top bars separate clearly even
  with many rows — never a rainbow across unrelated categories, since the
  categories have no inherent color identity.
- **Line chart baseline**: scaled to the data's own min/max (not forced to
  zero) since the point is the shape of change, not an absolute-magnitude bar
  comparison.

## Explicitly out of scope (known gaps, not bugs)

- No pie/donut charts — never proposed by the detection heuristic.
- No grouped/stacked multi-series charts (e.g. one category broken down by
  two measures at once, or compared across 3+ periods in one chart) — only
  single-measure bar/line.
- No backend/LLM involvement in chart-type selection — purely a client-side
  shape heuristic on rows the backend already returns. A visually-ambiguous
  result (e.g. 3 numeric columns) always falls back to no chart, even if a
  human would obviously chart it.
- No image/CSV export of a chart or its underlying rows.
