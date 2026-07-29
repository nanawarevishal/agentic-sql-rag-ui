import { useState } from "react";
import { UndoToast } from "../components/UndoToast";
import { usePendingDelete } from "../hooks/usePendingDelete";
import { CreateProjectWizard } from "../features/projects/CreateProjectWizard";
import {
  useDeleteProjectMutation,
  useGetProjectStatsQuery,
  useGetProjectsQuery,
  useTriggerProjectIngestMutation,
  type Project,
} from "../features/projects/projectsApi";

// Formerly AdminPage ("Data sources"). Same page, generalized: it lists
// projects of every type and creates them through the schema-driven wizard
// instead of a hardcoded connection-string form.

function ProjectRow({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const [triggerIngest, { isLoading: isIngesting }] = useTriggerProjectIngestMutation();
  const [showStats, setShowStats] = useState(false);
  const { data: stats } = useGetProjectStatsQuery(project.id, { skip: !showStats });

  return (
    <div className="ds-item">
      <div className="ds-item-main">
        <div className="ds-item-title">
          <span>{project.name}</span>
          <span className="ds-kind">{project.type === "doc_rag" ? "documents" : "database"}</span>
          <span className={`ds-status ds-status-${project.status}`}>{project.status}</span>
        </div>
        {project.error_message && <p className="ds-error">{project.error_message}</p>}
        <p className="ds-meta">
          Created {new Date(project.created_at).toLocaleString()}
          {project.last_ingested_at &&
            ` · last indexed ${new Date(project.last_ingested_at).toLocaleString()}`}
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
          onClick={() => triggerIngest(project.id)}
        >
          {isIngesting ? <span className="spinner" /> : "Re-index"}
        </button>
        {!project.is_builtin && (
          <button
            type="button"
            className="btn-secondary ds-delete"
            onClick={() => {
              // Heavier than deleting a conversation - it takes the index
              // (and, for a document project, the uploaded files) with it -
              // so this keeps a confirm on top of the undo window rather
              // than relying on the undo window alone.
              const ok = confirm(
                `Delete project "${project.name}"? Its index will be removed and the agent will no longer be able to query it. You'll have a few seconds to undo.`
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

export function ProjectsPage() {
  // Poll only while something is actually mid-index, so a
  // pending -> ready/failed transition shows up without a manual refresh and
  // polling goes idle once everything has settled. Document projects index
  // out-of-process, so this is also what surfaces the remote's status.
  const { data: projects = [], isFetching } = useGetProjectsQuery();
  const hasPending = projects.some((p) => p.status === "pending");
  useGetProjectsQuery(undefined, { pollingInterval: hasPending ? 3000 : 0 });

  const [showWizard, setShowWizard] = useState(false);

  // Held at page level rather than per row so the list can hide the pending
  // row and only ever one undo toast is on screen.
  const [deleteProject] = useDeleteProjectMutation();
  const {
    pending: pendingDelete,
    schedule: scheduleDelete,
    undo: undoDelete,
  } = usePendingDelete((id) => deleteProject(id).unwrap(), {
    onFailed: (item) => alert(`Failed to delete "${item.label}". Please try again.`),
  });
  const visibleProjects = projects.filter((p) => p.id !== pendingDelete?.id);

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2>Projects</h2>
            <p>Everything the agent can answer from - each with its own isolated index.</p>
          </div>
          {!showWizard && (
            <button type="button" className="btn-primary" onClick={() => setShowWizard(true)}>
              New project
            </button>
          )}
        </div>
        <div className="admin-card-body">
          {isFetching && projects.length === 0 ? (
            <div className="loading-banner">
              <span className="dot-pulse" />
              Loading...
            </div>
          ) : (
            <div className="ds-list">
              {visibleProjects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onDelete={() => scheduleDelete({ id: project.id, label: project.name })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showWizard && (
        <div className="admin-card">
          <div className="admin-card-body">
            <CreateProjectWizard
              onCreated={() => setShowWizard(false)}
              onCancel={() => setShowWizard(false)}
            />
          </div>
        </div>
      )}

      {pendingDelete && (
        <UndoToast message={`Deleted "${pendingDelete.label}"`} onUndo={undoDelete} />
      )}
    </div>
  );
}
