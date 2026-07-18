import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { toggle, type SettingsState } from "../store/settingsSlice";

interface Props {
  onSubmit: (question: string) => void;
  pending: boolean;
}

type ToggleDef = { key: keyof SettingsState; label: string; hint: string; default: boolean };

// Opt-in extras: each one is an additional LLM round-trip, so they default
// off and the caller pays for them only on request.
const TOGGLES: ToggleDef[] = [
  { key: "enableDecomposition", label: "Multi-step decomposition", hint: "Split the question into sub-questions", default: false },
  { key: "enableCragGrading", label: "CRAG relevance grading", hint: "Grade retrieved chunks before use", default: false },
  { key: "enableSelfRagCritique", label: "Self-RAG critique/retry", hint: "Critique the answer and retry if weak", default: false },
];

// Opt-out safety rails: the backend already defaults these on, so this
// section is for turning one off (e.g. to see why a question got rejected
// as out-of-scope), not for enabling it.
const GUARDS: ToggleDef[] = [
  { key: "enableOutOfScopeFilter", label: "Out-of-scope filter", hint: "Reject questions unrelated to the schema before running them", default: true },
  { key: "enableStaticSqlValidation", label: "Static SQL validation", hint: "Validate generated SQL before executing it", default: true },
];

const ALL_TOGGLES = [...TOGGLES, ...GUARDS];

// Shown once to point first-time users at the reasoning-gate toggles, since
// they default off and are otherwise easy to miss behind a menu button.
const HINT_SEEN_KEY = "agentic-sql-rag:seenAgentBehaviorMenu";

function SettingsMenu({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(() => localStorage.getItem(HINT_SEEN_KEY) !== "1");
  const rootRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const activeCount = ALL_TOGGLES.filter(({ key, default: def }) => settings[key] !== def).length;

  const dismissHint = () => {
    if (!showHint) return;
    setShowHint(false);
    localStorage.setItem(HINT_SEEN_KEY, "1");
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="mode-menu" ref={rootRef}>
      <button
        type="button"
        className={`mode-menu-trigger ${activeCount > 0 ? "has-active" : ""}`}
        disabled={disabled}
        onClick={() => {
          setOpen((v) => !v);
          dismissHint();
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h14M22 18h0" />
          <circle cx="16" cy="6" r="2" />
          <circle cx="6" cy="12" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
        Agent behavior
        {activeCount > 0 && <span className="mode-menu-count">{activeCount}</span>}
        {showHint && activeCount === 0 && <span className="mode-menu-hint-dot" aria-hidden="true" />}
      </button>

      {open && (
        <div className="mode-menu-panel" role="menu">
          <div className="mode-menu-panel-title">Reasoning gates</div>
          {TOGGLES.map(({ key, label, hint }) => (
            <label key={key} className="mode-menu-item" role="menuitemcheckbox" aria-checked={settings[key]}>
              <input type="checkbox" checked={settings[key]} onChange={() => dispatch(toggle(key))} />
              <span className="mode-menu-item-text">
                <span className="mode-menu-item-label">{label}</span>
                <span className="mode-menu-item-hint">{hint}</span>
              </span>
              <span className="mode-menu-item-check">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
            </label>
          ))}

          <div className="mode-menu-panel-title">Safety guards</div>
          {GUARDS.map(({ key, label, hint }) => (
            <label key={key} className="mode-menu-item" role="menuitemcheckbox" aria-checked={settings[key]}>
              <input type="checkbox" checked={settings[key]} onChange={() => dispatch(toggle(key))} />
              <span className="mode-menu-item-text">
                <span className="mode-menu-item-label">{label}</span>
                <span className="mode-menu-item-hint">{hint}</span>
              </span>
              <span className="mode-menu-item-check">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function QueryForm({ onSubmit, pending }: Props) {
  const [question, setQuestion] = useState("");

  const submit = () => {
    if (!question.trim() || pending) return;
    onSubmit(question.trim());
    setQuestion("");
  };

  return (
    <form
      className="query-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <fieldset className="query-composer" disabled={pending}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={pending ? "Waiting for the agent to finish..." : "Ask a question about the database..."}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="query-composer-footer">
          <SettingsMenu disabled={pending} />
          <span className="query-hint">⌘/Ctrl + Enter to submit</span>
          <button type="submit" className="btn-primary" disabled={pending || !question.trim()}>
            {pending ? (
              <>
                <span className="spinner" />
                Running
              </>
            ) : (
              <>
                Ask
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
