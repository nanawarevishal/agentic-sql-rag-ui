import type { ProjectField } from "./projectsApi";

// Config helpers for the create wizard. Split out of ProjectFieldInput.tsx
// so that file only exports a component (react-refresh/only-export-components).

export function defaultConfigFor(fields: ProjectField[]): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  fields.forEach((field) => {
    if (field.default !== undefined) config[field.name] = field.default;
    else if (field.kind === "boolean") config[field.name] = false;
  });
  return config;
}

export function missingRequiredFields(
  fields: ProjectField[],
  config: Record<string, unknown>
): string[] {
  return fields
    .filter((field) => {
      if (!field.required) return false;
      const value = config[field.name];
      return value === undefined || value === null || String(value).trim() === "";
    })
    .map((field) => field.label);
}
