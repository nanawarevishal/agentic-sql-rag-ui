import { useGetSchemaStatsQuery, useIngestSchemaMutation } from "../api/apiSlice";

export function AdminPage() {
  const { data: stats, isFetching, refetch } = useGetSchemaStatsQuery();
  const [ingestSchema, { isLoading: isIngesting }] = useIngestSchemaMutation();

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2>Schema RAG index</h2>
            <p>Rebuild the vector index from the live database schema.</p>
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={isIngesting}
            onClick={async () => {
              await ingestSchema();
              refetch();
            }}
          >
            {isIngesting ? (
              <>
                <span className="spinner" />
                Rebuilding
              </>
            ) : (
              "Rebuild index"
            )}
          </button>
        </div>

        <div className="admin-card-body">
          <h3>Index stats</h3>
          {isFetching ? (
            <div className="loading-banner">
              <span className="dot-pulse" />
              Loading...
            </div>
          ) : (
            <pre className="sql-block">{JSON.stringify(stats?.stats ?? {}, null, 2)}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
