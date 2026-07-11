import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { toggle, type SettingsState } from "../store/settingsSlice";

interface Props {
  onSubmit: (question: string) => void;
  pending: boolean;
}

const TOGGLES: Array<{ key: keyof SettingsState; label: string }> = [
  { key: "enableDecomposition", label: "Multi-step decomposition" },
  { key: "enableCragGrading", label: "CRAG relevance grading" },
  { key: "enableSelfRagCritique", label: "Self-RAG critique/retry" },
];

export function QueryForm({ onSubmit, pending }: Props) {
  const [question, setQuestion] = useState("");
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  return (
    <form
      className="query-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (question.trim() && !pending) onSubmit(question.trim());
      }}
    >
      <div className="query-toggles">
        {TOGGLES.map(({ key, label }) => (
          <label key={key} className={`chip-toggle ${settings[key] ? "is-checked" : ""}`}>
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={() => dispatch(toggle(key))}
            />
            {label}
          </label>
        ))}
      </div>

      <div className="query-composer">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about the database..."
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              if (question.trim() && !pending) onSubmit(question.trim());
            }
          }}
        />
        <div className="query-composer-footer">
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
      </div>
    </form>
  );
}
