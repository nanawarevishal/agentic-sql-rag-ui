import { useGetSchemaStatsQuery, useIngestSchemaMutation } from "../api/apiSlice";

export function AdminPage() {
  const { data: stats, isFetching, refetch } = useGetSchemaStatsQuery();
  const [ingestSchema, { isLoading: isIngesting }] = useIngestSchemaMutation();

  return (
    <div className="admin-page">
      <h2>Schema RAG index</h2>
      <button
        type="button"
        disabled={isIngesting}
        onClick={async () => {
          await ingestSchema();
          refetch();
        }}
      >
        {isIngesting ? "Rebuilding..." : "Rebuild index from live schema"}
      </button>

      <h3>Index stats</h3>
      {isFetching ? (
        <p>Loading...</p>
      ) : (
        <pre>{JSON.stringify(stats?.stats ?? {}, null, 2)}</pre>
      )}
    </div>
  );
}
