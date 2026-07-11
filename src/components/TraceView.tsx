import { useEffect, useState } from "react";
import type { TraceEvent } from "../types";

interface Props {
  trace: TraceEvent[];
}

// The backend runs the whole agent graph before responding (POST /query
// returns the complete trace, not a stream), so we replay it client-side
// at a fixed cadence to still get the "watch it reason, then self-correct"
// reveal PROJECT_CONTEXT.md calls the demo's wow moment.
const REVEAL_INTERVAL_MS = 400;

export function TraceView({ trace }: Props) {
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

  if (trace.length === 0) return null;

  return (
    <ol className="trace-view">
      {trace.slice(0, visibleCount).map((event) => (
        <li key={`${event.sub_question ?? "main"}-${event.step}`} className="trace-event">
          <div className="trace-event-header">
            <span className="trace-step">#{event.step}</span>
            <span className="trace-node">{event.node}</span>
            {event.sub_question && (
              <span className="trace-subq">{event.sub_question}</span>
            )}
          </div>
          <p className="trace-summary">{event.summary}</p>
          {Object.keys(event.detail).length > 0 && (
            <details>
              <summary>detail</summary>
              <pre>{JSON.stringify(event.detail, null, 2)}</pre>
            </details>
          )}
        </li>
      ))}
    </ol>
  );
}
