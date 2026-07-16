import { createContext } from "react";

export type FocusedVisualization =
  | { type: "bar"; labelKey: string; valueKey: string }
  | { type: "line"; dateKey: string; valueKey: string };

export interface FocusedChart {
  kind: "chart";
  title: string;
  rows: Array<Record<string, unknown>>;
  viz: FocusedVisualization;
}

// A long/truncated prose answer expanded into the side panel, alongside the
// full (possibly multi-sub-question) row data behind it - see
// combineSubResultRows in lib/resultVisualization.ts.
export interface FocusedAnswer {
  kind: "answer";
  title: string;
  text: string;
  rows: Array<Record<string, unknown>>;
}

// Only one panel (a chart or an answer) can be expanded at a time - opening
// a new one replaces whatever was there, same as most single-pane
// "artifact" panels.
export type FocusedPanel = FocusedChart | FocusedAnswer;

export interface ChartFocusValue {
  focused: FocusedPanel | null;
  focus: (panel: FocusedPanel) => void;
  unfocus: () => void;
}

export const ChartFocusContext = createContext<ChartFocusValue | null>(null);
