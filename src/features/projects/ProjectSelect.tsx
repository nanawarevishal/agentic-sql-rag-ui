import { useEffect } from "react";
import { useGetProjectsQuery } from "./projectsApi";

interface Props {
  value: string | null;
  onChange: (projectId: string) => void;
  disabled: boolean;
}

// Which project a new chat will query. Disabled once a conversation exists -
// a conversation is bound to one project at creation time (see
// app/api/routers/query.py::_resolve_conversation) and keeps querying it for
// every later turn, so switching here wouldn't do anything anyway.
export function ProjectSelect({ value, onChange, disabled }: Props) {
  const { data: projects = [] } = useGetProjectsQuery();

  // Default to the builtin project once the list loads, if the caller
  // hasn't picked one yet.
  useEffect(() => {
    if (value || projects.length === 0) return;
    const builtin = projects.find((p) => p.is_builtin) ?? projects[0];
    onChange(builtin.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, value]);

  if (projects.length === 0) return null;

  return (
    <label className="data-source-select">
      <span>Project</span>
      <select value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {projects.map((project) => (
          <option key={project.id} value={project.id} disabled={project.status !== "ready"}>
            {project.name}
            {project.status !== "ready" ? ` (${project.status})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
