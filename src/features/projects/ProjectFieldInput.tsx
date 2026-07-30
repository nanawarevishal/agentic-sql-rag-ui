import type { ProjectField } from "./projectsApi";

interface Props {
  field: ProjectField;
  value: unknown;
  invalid?: boolean;
  onChange: (value: unknown) => void;
}

// Renders ONE field from a type descriptor. This is the only place that knows
// how a `kind` maps to a control, which is what keeps the wizard
// type-agnostic: the backend publishes fields, this renders them, and neither
// side hardcodes the other's shape.
//
// An unrecognized `kind` falls back to a text input rather than rendering
// nothing - a service that ships a new kind against an older frontend should
// degrade to a usable form, not a silently missing field.
export function ProjectFieldInput({ field, value, invalid, onChange }: Props) {
  const id = `project-field-${field.name}`;

  if (field.kind === "boolean") {
    return (
      <label className="project-field project-field-inline" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          <span className="project-field-label">{field.label}</span>
          {field.help && <span className="project-field-help">{field.help}</span>}
        </span>
      </label>
    );
  }

  return (
    <label className={`project-field ${invalid ? "is-invalid" : ""}`} htmlFor={id}>
      <span className="project-field-label">
        {field.label}
        {field.required && <span className="project-field-required"> *</span>}
      </span>

      {field.kind === "select" ? (
        <select id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          // "secret" is a password input so a pasted connection string isn't
          // left on screen. Not a security control - the value still travels
          // to the server - just shoulder-surfing hygiene.
          type={field.kind === "secret" ? "password" : field.kind === "number" ? "number" : "text"}
          value={value === undefined || value === null ? "" : String(value)}
          placeholder={field.placeholder}
          autoComplete={field.kind === "secret" ? "off" : undefined}
          spellCheck={field.kind === "secret" ? false : undefined}
          onChange={(e) =>
            onChange(field.kind === "number" ? toNumber(e.target.value) : e.target.value)
          }
        />
      )}

      {invalid && <span className="project-field-error">{field.label} is required.</span>}
      {field.help && <span className="project-field-help">{field.help}</span>}
    </label>
  );
}

// An empty number input yields "", which must stay undefined rather than
// becoming 0 - the backend treats a missing optional number as "use the
// default", and 0 is a real (invalid) value.
function toNumber(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}
