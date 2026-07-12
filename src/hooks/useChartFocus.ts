import { useContext } from "react";
import { ChartFocusContext, type ChartFocusValue } from "../context/ChartFocusContext";

export function useChartFocus(): ChartFocusValue {
  const ctx = useContext(ChartFocusContext);
  if (!ctx) throw new Error("useChartFocus must be used within a ChartFocusProvider");
  return ctx;
}
