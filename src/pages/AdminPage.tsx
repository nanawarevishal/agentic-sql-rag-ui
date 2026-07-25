import { useState, type FormEvent } from "react";
import { parseErrorBody } from "../lib/parseErrorBody";
import { usePendingDelete } from "../hooks/usePendingDelete";
import { UndoToast } from "../components/UndoToast";
import {
  useCreateDataSourceMutation,
  useDeleteDataSourceMutation,
  useGetDataSourceStatsQuery,
  useGetDataSourcesQuery,
  useTriggerDataSourceIngestMutation,
  type DataSource,
} from "../features/datasources/dataSourcesApi";

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "data" in error) {
    return parseErrorBody((error as { data?: unknown }).data) ?? fallback;
  }
  return fallback;
}

function DataSourceRow({ dataSource, onDelete }: { dataSource: DataSource; onDelete: () => void }) {
  const [triggerIngest, { isLoading: isIngesting }] = useTriggerDataSourceIngestMutation();
  const [showStats, setShowStats] = useState(false);
  const { data: stats } = useGetDataSourceStatsQuery(dataSource.id, { skip: !showStats });
  const isBuiltin = dataSource.kind === "builtin";

  return (
    <div className="ds-item">
      <div className="ds-item-main">
        <div className="ds-item-title">
          <span>{dataSource.name}</span>
          <span className="ds-kind">{dataSource.kind}</span>
          <span className={`ds-status ds-status-${dataSource.status}`}>{dataSource.status}</span>
        </div>
        {dataSource.error_message && <p className="ds-error">{dataSource.error_message}</p>}
        <p className="ds-meta">
          Created {new Date(dataSource.created_at).toLocaleString()}
          {dataSource.last_ingested_at && ` · last ingested ${new Date(dataSource.last_ingested_at).toLocaleString()}`}
        </p>
        {showStats && <pre className="sql-block">{JSON.stringify(stats ?? {}, null, 2)}</pre>}
      </div>
      <div className="ds-item-actions">
        <button type="button" className="btn-secondary" onClick={() => setShowStats((v) => !v)}>
          {showStats ? "Hide stats" : "Stats"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={isIngesting}
          onClick={() => triggerIngest(dataSource.id)}
        >
          {isIngesting ? <span className="spinner" /> : "Re-ingest"}
        </button>
        {!isBuiltin && (
          <button
            type="button"
            className="btn-secondary ds-delete"
            onClick={() => {
              // Heavier than deleting a conversation - it takes the schema
              // index with it - so this keeps a confirm on top of the undo
              // window rather than relying on the undo window alone.
              const ok = confirm(
                `Delete data source "${dataSource.name}"? The agent will no longer be able to query it. You'll have a few seconds to undo.`
              );
              if (ok) onDelete();
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function ConnectForm() {
  const [name, setName] = useState("");
  const [connectionString, setConnectionString] = useState("");
  const [createDataSource, { isLoading, error }] = useCreateDataSourceMutation();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createDataSource({ name, connection_string: connectionString }).unwrap();
      setName("");
      setConnectionString("");
    } catch {
      // surfaced via `error` below
    }
  };

  return (
    <form className="ds-form" onSubmit={submit}>
      <label className="ds-field">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Postgres DB" required />
      </label>
      <label className="ds-field">
        <span>Connection string</span>
        <input
          value={connectionString}
          onChange={(e) => setConnectionString(e.target.value)}
          placeholder="postgresql://user:password@host:5432/dbname"
          required
        />
      </label>
      {error && <p className="ds-error">{mutationErrorMessage(error, "Could not connect to that database.")}</p>}
      <button type="submit" className="btn-primary" disabled={isLoading}>
        {isLoading ? (
          <>
            <span className="spinner" />
            Connecting
          </>
        ) : (
          "Connect"
        )}
      </button>
    </form>
  );
}

export function AdminPage() {
  // Poll only while a data source is actually mid-ingest, so a
  // pending -> ready/failed transition shows up without a manual refresh,
  // and polling goes idle once everything has settled.
  const { data: dataSources = [], isFetching } = useGetDataSourcesQuery();
  const hasPending = dataSources.some((ds) => ds.status === "pending");
  useGetDataSourcesQuery(undefined, { pollingInterval: hasPending ? 3000 : 0 });

  // Held at page level rather than per row so the list can hide the pending
  // row and only ever one undo toast is on screen.
  const [deleteDataSource] = useDeleteDataSourceMutation();
  const {
    pending: pendingDelete,
    schedule: scheduleDelete,
    undo: undoDelete,
  } = usePendingDelete((id) => deleteDataSource(id).unwrap(), {
    onFailed: (item) => alert(`Failed to delete "${item.label}". Please try again.`),
  });
  const visibleDataSources = dataSources.filter((ds) => ds.id !== pendingDelete?.id);

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2>Data sources</h2>
            <p>Databases the agent can query - each with its own isolated schema-RAG index.</p>
          </div>
        </div>
        <div className="admin-card-body">
          {isFetching && dataSources.length === 0 ? (
            <div className="loading-banner">
              <span className="dot-pulse" />
              Loading...
            </div>
          ) : (
            <div className="ds-list">
              {visibleDataSources.map((ds) => (
                <DataSourceRow
                  key={ds.id}
                  dataSource={ds}
                  onDelete={() => scheduleDelete({ id: ds.id, label: ds.name })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2>Connect to a database</h2>
            <p>Paste a connection string for a Postgres database you already run.</p>
          </div>
        </div>
        <div className="admin-card-body">
          <ConnectForm />
        </div>
      </div>

      {pendingDelete && (
        <UndoToast message={`Deleted "${pendingDelete.label}"`} onUndo={undoDelete} />
      )}
    </div>
  );
}
