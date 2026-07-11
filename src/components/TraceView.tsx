import type { TraceEvent } from "../types";
import { groupIntoModules, moduleStatus, type TraceModule } from "../lib/traceModules";

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

function Module({ mod, activeStep, isStreaming }: { mod: TraceModule; activeStep: number | null; isStreaming: boolean }) {
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
        {mod.events.map((event) => (
          <li
            key={`${event.sub_question ?? "main"}-${event.step}`}
            className={`trace-step-row ${event.step === activeStep && isStreaming ? "is-active" : ""}`}
          >
            <div className="trace-step-line">
              <code className="trace-keyword">{event.node}</code>
              {event.sub_question && <span className="trace-subq">{event.sub_question}</span>}
            </div>
            <p className="trace-summary">{event.summary}</p>
            {Object.keys(event.detail).length > 0 && (
              <details>
                <summary>Detail</summary>
                <pre>{JSON.stringify(event.detail, null, 2)}</pre>
              </details>
            )}
          </li>
        ))}
      </ul>
    </li>
  );
}

export function TraceView({ events, isStreaming }: Props) {
  if (events.length === 0) return null;

  const modules = groupIntoModules(events);
  const activeStep = events[events.length - 1].step;

  return (
    <div className="trace-panel">
      <div className="trace-panel-header">
        <span>Agent trace</span>
        {isStreaming && <span className="dot-pulse" />}
      </div>
      <ol className="trace-modules">
        {modules.map((mod, i) => (
          <Module key={`${mod.key}-${i}`} mod={mod} activeStep={activeStep} isStreaming={isStreaming} />
        ))}
      </ol>
    </div>
  );
}
