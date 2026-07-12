import type { TraceEvent } from "../types";

// Renders each trace step's `detail` payload the way that node's shape
// actually reads best, instead of a raw JSON.stringify dump - SQL as code,
// execute_sql rows as a compact table, retrieve_schema chunks as pills,
// grade/critique/finalize as a verdict badge + reason. Unrecognized nodes
// fall back to the raw dump so nothing silently disappears.

type Row = Record<string, unknown>;

function VerdictBadge({ verdict }: { verdict: string }) {
  const negative = ["insufficient", "retry", "ambiguous"].includes(verdict);
  return (
    <span className={`trace-verdict ${negative ? "is-negative" : "is-positive"}`}>{verdict}</span>
  );
}

function RowsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return <p className="trace-detail-note">No rows returned.</p>;
  const columns = Object.keys(rows[0]);
  const preview = rows.slice(0, 5);
  return (
    <div className="trace-rows-wrap">
      <table className="trace-rows-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c}>{row[c] === null || row[c] === undefined ? "—" : String(row[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > preview.length && (
        <p className="trace-detail-note">+{rows.length - preview.length} more row(s)</p>
      )}
    </div>
  );
}

export function TraceDetail({ event }: { event: TraceEvent }) {
  const d = event.detail as Record<string, unknown>;
  if (!d || Object.keys(d).length === 0) return null;

  switch (event.node) {
    case "planner": {
      const subQuestions = (d.sub_questions as string[] | undefined) ?? [];
      if (subQuestions.length <= 1) return null;
      return (
        <ol className="trace-subq-list">
          {subQuestions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      );
    }

    case "retrieve_schema": {
      const chunks =
        (d.chunks as Array<{ table_name?: string; chunk_type?: string }> | undefined) ?? [];
      if (chunks.length === 0) return null;
      return (
        <div className="trace-chunk-list">
          {chunks.map((c, i) => (
            <span key={i} className="trace-chunk-pill">
              {c.table_name ?? "?"}
              {c.chunk_type && <em>{c.chunk_type}</em>}
            </span>
          ))}
        </div>
      );
    }

    case "grade_relevance": {
      const verdict = d.verdict as string | undefined;
      const confidence = d.confidence as number | undefined;
      const reason = d.reason as string | undefined;
      return (
        <div className="trace-verdict-row">
          {verdict && <VerdictBadge verdict={verdict} />}
          {typeof confidence === "number" && (
            <span className="trace-confidence">{Math.round(confidence * 100)}% confidence</span>
          )}
          {reason && <p className="trace-detail-note">{reason}</p>}
        </div>
      );
    }

    case "generate_sql": {
      const sql = d.sql as string | undefined;
      const explanation = d.explanation as string | undefined;
      return (
        <div>
          {explanation && <p className="trace-detail-note">{explanation}</p>}
          {sql && <pre className="sql-block">{sql}</pre>}
        </div>
      );
    }

    case "execute_sql": {
      const sql = d.sql as string | undefined;
      const error = d.error as string | null | undefined;
      const rows = d.rows as Row[] | null | undefined;
      return (
        <div>
          {sql && <pre className="sql-block">{sql}</pre>}
          {error ? <p className="trace-error-text">{error}</p> : rows && <RowsTable rows={rows} />}
        </div>
      );
    }

    case "critique":
    case "finalize": {
      const verdict = d.verdict as string | undefined;
      const reason = d.reason as string | undefined;
      return (
        <div className="trace-verdict-row">
          {verdict && <VerdictBadge verdict={verdict} />}
          {reason && <p className="trace-detail-note">{reason}</p>}
        </div>
      );
    }

    default:
      return <pre>{JSON.stringify(d, null, 2)}</pre>;
  }
}
