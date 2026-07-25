import { useEffect, useRef, useState } from "react";
import type { TraceEvent } from "../types";
import { groupIntoModules, moduleStatus, type TraceModule } from "../lib/traceModules";
import { TraceDetail } from "./TraceDetail";

interface Props {
  events: TraceEvent[];
  isStreaming: boolean;
}

const MODULE_ICON_PATHS: Record<string, string> = {
  decompose: "M12 3v6M12 15v6M12 9l-6 3 6 3M12 9l6 3-6 3",
  retrieve: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.35-4.35",
  grade: "M4 6h16M4 12h10M4 18h6M17 15l3 3 3-3",
  critique: "M4 4v6h6M20 20v-6h-6M4 10a8 8 0 0 1 14.5-4.5M20 14a8 8 0 0 1-14.5 4.5",
  generate_sql: "M8 4 3 12l5 8M16 4l5 8-5 8M13 4l-2 16",
  validate_sql: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3zM9 12l2 2 4-4",
  execute_sql: "M8 5v14l11-7z",
  synthesize: "M12 3v3M12 18v3M3 12h3M18 12h3M6.3 6.3l2 2M15.7 15.7l2 2M6.3 17.7l2-2M15.7 8.3l2-2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
};

function ModuleIcon({ moduleKey }: { moduleKey: string }) {
  const path = MODULE_ICON_PATHS[moduleKey];
  if (!path) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="5" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function Module({
  mod,
  activeStep,
  isStreaming,
  activeStepRef,
}: {
  mod: TraceModule;
  activeStep: number | null;
  isStreaming: boolean;
  activeStepRef: React.RefObject<HTMLLIElement | null>;
}) {
  const status = moduleStatus(mod);
  const isActiveModule = activeStep !== null && mod.events.some((e) => e.step === activeStep);
  return (
    <li className={`trace-module status-${status} ${isActiveModule && isStreaming ? "is-active" : ""}`}>
      <div className="trace-module-header">
        <span className="trace-module-marker">
          <ModuleIcon moduleKey={mod.key} />
          {isActiveModule && isStreaming && <span className="trace-marker-ring" />}
        </span>
        <span className="trace-module-title">{mod.label}</span>
        {mod.events.length > 1 && <span className="trace-module-count">{mod.events.length} steps</span>}
        {status === "retry" && <span className="trace-status-chip status-retry">retried</span>}
        {status === "error" && <span className="trace-status-chip status-error">failed</span>}
      </div>

      <ul className="trace-steps">
        {mod.events.map((event) => {
          const isActive = event.step === activeStep;
          return (
            <li
              key={`${event.sub_question ?? "main"}-${event.step}`}
              ref={isActive ? activeStepRef : undefined}
              className={`trace-step-row ${isActive && isStreaming ? "is-active" : ""}`}
            >
              {/* The raw backend node name (generate_sql, execute_sql, ...)
                  used to lead each step; the module header above already
                  says the same thing in plain language, so only the
                  sub-question it belongs to is worth repeating here. */}
              {event.sub_question && (
                <div className="trace-step-line">
                  <span className="trace-subq">{event.sub_question}</span>
                </div>
              )}
              <p className="trace-summary">{event.summary}</p>
              {(() => {
                // TraceDetail returns null when a node's detail has nothing
                // worth showing (e.g. planner with only one sub-question) -
                // calling it directly (it's a plain function, no hooks) lets
                // the collapsible wrapper itself disappear instead of
                // rendering an empty "Detail" toggle.
                const content = TraceDetail({ event });
                return (
                  content && (
                    <details>
                      <summary>Detail</summary>
                      {content}
                    </details>
                  )
                );
              })()}
            </li>
          );
        })}
      </ul>
    </li>
  );
}

// Clearance (in px) reserved above/below the active step so it doesn't land
// under the sticky header or the fixed composer dock - must match the
// scroll-margin-top/bottom set on .trace-step-row in App.css.
const HEADER_CLEARANCE = 90;
const DOCK_CLEARANCE = 200;

export function TraceView({ events, isStreaming }: Props) {
  const activeStepRef = useRef<HTMLLIElement | null>(null);
  const listRef = useRef<HTMLOListElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const wasStreaming = useRef(isStreaming);

  const activeStep = events.length > 0 ? events[events.length - 1].step : null;

  useEffect(() => {
    if (!isStreaming || !activeStepRef.current) return;
    // Check the active step's own visibility rather than distance from the
    // page bottom - a burst of several trace lines arriving at once (e.g.
    // parallel sub-questions) can grow the page by more than any fixed
    // threshold in one jump, which would permanently wedge a "keep up with
    // the bottom" check. Re-deriving visibility fresh each time always
    // self-corrects instead.
    const rect = activeStepRef.current.getBoundingClientRect();
    const isVisible = rect.top >= HEADER_CLEARANCE && rect.bottom <= window.innerHeight - DOCK_CLEARANCE;
    if (!isVisible) {
      activeStepRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeStep, isStreaming]);

  useEffect(() => {
    if (wasStreaming.current && !isStreaming) {
      setCollapsed(true);
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      });
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming]);

  if (events.length === 0) return null;

  const modules = groupIntoModules(events);

  return (
    <div className={`trace-panel ${collapsed ? "is-collapsed" : ""}`}>
      <div className="trace-panel-header">
        <span>Steps taken</span>
        {isStreaming && <span className="dot-pulse" />}
        {!isStreaming && (
          <button type="button" className="trace-collapse-toggle" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
            {collapsed ? "Show full trace" : "Collapse"}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={collapsed ? "" : "is-flipped"}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>
      <ol className="trace-modules" ref={listRef}>
        {modules.map((mod, i) => (
          <Module key={`${mod.key}-${i}`} mod={mod} activeStep={activeStep} isStreaming={isStreaming} activeStepRef={activeStepRef} />
        ))}
      </ol>
    </div>
  );
}
