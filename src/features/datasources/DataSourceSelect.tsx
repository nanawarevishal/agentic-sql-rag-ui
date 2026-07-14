import { useEffect } from "react";
import { useGetDataSourcesQuery } from "./dataSourcesApi";

interface Props {
  value: string | null;
  onChange: (dataSourceId: string) => void;
  disabled: boolean;
}

// Which data source a new chat will query. Disabled once a conversation
// exists - a conversation is bound to one data source at creation time
// (see app/api/routers/query.py::_resolve_conversation) and keeps querying
// it for every later turn, so switching here wouldn't do anything anyway.
export function DataSourceSelect({ value, onChange, disabled }: Props) {
  const { data: dataSources = [] } = useGetDataSourcesQuery();

  // Default to the builtin data source once the list loads, if the caller
  // hasn't picked one yet.
  useEffect(() => {
    if (value || dataSources.length === 0) return;
    const builtin = dataSources.find((ds) => ds.kind === "builtin") ?? dataSources[0];
    onChange(builtin.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSources, value]);

  if (dataSources.length === 0) return null;

  return (
    <label className="data-source-select">
      <span>Data source</span>
      <select value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {dataSources.map((ds) => (
          <option key={ds.id} value={ds.id} disabled={ds.status !== "ready"}>
            {ds.name}
            {ds.status !== "ready" ? ` (${ds.status})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
