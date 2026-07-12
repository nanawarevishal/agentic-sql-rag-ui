import { createContext } from "react";

export type FocusedVisualization =
  | { type: "bar"; labelKey: string; valueKey: string }
  | { type: "line"; dateKey: string; valueKey: string };

export interface FocusedChart {
  title: string;
  rows: Array<Record<string, unknown>>;
  viz: FocusedVisualization;
}

export interface ChartFocusValue {
  focused: FocusedChart | null;
  focus: (chart: FocusedChart) => void;
  unfocus: () => void;
}

export const ChartFocusContext = createContext<ChartFocusValue | null>(null);
