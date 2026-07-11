import { useEffect, useState } from "react";
import type { TraceEvent } from "../types";

// The backend runs the whole agent graph before responding (POST /query
// returns the complete trace, not a stream), so we replay it client-side
// at a fixed cadence to get the "watch it reason, then respond" reveal.
// Paced slow enough (~800ms/step) that the step-by-step connection is
// actually perceptible instead of the whole trace populating in a blink.
const REVEAL_INTERVAL_MS = 800;

export function useTraceReveal(trace: TraceEvent[]) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    if (trace.length === 0) return;

    const id = setInterval(() => {
      setVisibleCount((count) => {
        if (count >= trace.length) {
          clearInterval(id);
          return count;
        }
        return count + 1;
      });
    }, REVEAL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [trace]);

  return {
    visibleEvents: trace.slice(0, visibleCount),
    isStreaming: visibleCount < trace.length,
  };
}
