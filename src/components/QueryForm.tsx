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
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question about the database..."
        rows={3}
      />
      <div className="query-toggles">
        {TOGGLES.map(({ key, label }) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={() => dispatch(toggle(key))}
            />
            {label}
          </label>
        ))}
      </div>
      <button type="submit" disabled={pending || !question.trim()}>
        {pending ? "Running..." : "Ask"}
      </button>
    </form>
  );
}
