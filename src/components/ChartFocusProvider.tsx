import { useMemo, useState, type ReactNode } from "react";
import { ChartFocusContext, type ChartFocusValue, type FocusedPanel } from "../context/ChartFocusContext";

// Only one chart/answer can be expanded into the side panel at a time -
// opening a new one replaces whatever was there, same as most single-pane
// "artifact" panels. Scoped to the chat page rather than the whole app
// since it's the only place charts/answers render.
export function ChartFocusProvider({ children }: { children: ReactNode }) {
  const [focused, setFocused] = useState<FocusedPanel | null>(null);

  const value = useMemo<ChartFocusValue>(
    () => ({
      focused,
      focus: (panel) => setFocused(panel),
      unfocus: () => setFocused(null),
    }),
    [focused]
  );

  return <ChartFocusContext.Provider value={value}>{children}</ChartFocusContext.Provider>;
}
