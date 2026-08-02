import type { TraceEvent } from "../types";
import { redactSqlDetail, stripSql } from "../lib/redactSql";
import { describeFilters, type RetrievalFilters } from "../lib/retrievalFilters";

// Renders each trace step's `detail` payload the way that node's shape
// actually reads best, instead of a raw JSON.stringify dump - execute_sql
// rows as a compact table, retrieve_schema chunks and retrieve_passages
// documents as pills, grade/critique/finalize as a verdict badge + reason.
// Unrecognized nodes fall back to the raw dump so nothing silently
// disappears.
//
// The generated query itself is never rendered - the rows it returned are
// the part a non-technical reader can use, and the SQL is what makes this
// panel look like a debugger. See lib/redactSql.ts.

type Row = Record<string, unknown>;

function VerdictBadge({ verdict }: { verdict: string }) {
  const negative = ["insufficient", "retry", "ambiguous"].includes(verdict);
  return (
    <span className={`trace-verdict ${negative ? "is-negative" : "is-positive"}`}>{verdict}</span>
  );
}

export function RowsTable({ rows, limit = 5 }: { rows: Row[]; limit?: number }) {
  if (rows.length === 0) return <p className="trace-detail-note">No rows returned.</p>;
  const columns = Object.keys(rows[0]);
  const preview = rows.slice(0, limit);
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

    case "retrieve_passages": {
      const documents = (d.documents as string[] | undefined) ?? [];
      const filters = d.filters as RetrievalFilters | undefined;
      // Reported whenever the search differed from the default, including -
      // especially - when it came back with nothing. An empty passage list
      // plus a filter is the case where the filter is the explanation.
      // Whether it differed is the service's verdict, never re-derived here:
      // exclude_superseded is set on every query, so a client deciding for
      // itself flags every search as scoped.
      const restricted = Boolean(d.filters_restricted);
      const widened = Boolean(d.filters_widened);
      const scope =
        filters && (restricted || widened)
          ? describeFilters({ filters, restricted, widened })
          : [];
      if (documents.length === 0 && scope.length === 0) return null;

      return (
        <div className="trace-retrieval-detail">
          {scope.length > 0 && (
            <p className="trace-detail-note">Search scope: {scope.join(" · ")}</p>
          )}
          {documents.length > 0 && (
            <div className="trace-chunk-list">
              {documents.map((document) => (
                <span key={document} className="trace-chunk-pill">
                  {document}
                </span>
              ))}
            </div>
          )}
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
      const explanation = d.explanation as string | undefined;
      // Without the query there's nothing left to show unless the backend
      // wrote a plain-language explanation of what it's about to look up.
      if (!explanation) return null;
      return <p className="trace-detail-note">{stripSql(explanation)}</p>;
    }

    case "execute_sql": {
      const error = d.error as string | null | undefined;
      const rows = d.rows as Row[] | null | undefined;
      if (!error && !rows) return null;
      return (
        <div>
          {error ? (
            <p className="trace-error-text">{stripSql(error)}</p>
          ) : (
            rows && <RowsTable rows={rows} />
          )}
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

    default: {
      const safe = redactSqlDetail(d) as Record<string, unknown>;
      if (Object.keys(safe).length === 0) return null;
      return <pre>{JSON.stringify(safe, null, 2)}</pre>;
    }
  }
}
