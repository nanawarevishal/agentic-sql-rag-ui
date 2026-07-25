// This UI is for people who ask questions in English, not people who read
// SQL, so generated queries never reach the screen - the trace shows what the
// agent looked at and what came back instead.
//
// Trace `detail` payloads are arbitrary backend-shaped JSON, and node names
// aren't an enum this repo controls (see traceModules.ts), so a new node that
// carries SQL would otherwise leak through TraceDetail's raw-JSON fallback.
// Filtering here rather than at each call site keeps that from happening.

const SQL_KEY = /^(sql|query|statement|sql_query|generated_sql|corrected_sql|raw_sql)$/i;
const LOOKS_LIKE_SQL = /\bselect\b[\s\S]*\bfrom\b/i;

const HIDDEN = "[query hidden]";

// Deep copy with SQL-carrying keys dropped and SQL-looking strings replaced.
export function redactSqlDetail(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSqlDetail);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SQL_KEY.test(key)) continue;
      out[key] = redactSqlDetail(nested);
    }
    return out;
  }
  if (typeof value === "string" && LOOKS_LIKE_SQL.test(value)) return HIDDEN;
  return value;
}

// Database drivers routinely quote the failing statement back in the error
// text ("syntax error at or near ... LINE 1: SELECT ..."). Keep the part a
// person can act on, drop the statement. Only touches text that actually
// contains a SELECT ... FROM, so ordinary prose is left alone.
export function stripSql(text: string): string {
  if (!LOOKS_LIKE_SQL.test(text)) return text;
  return text
    .replace(/\b(?:with|select)\b[\s\S]*?(?:;|$)/gi, HIDDEN)
    .replace(/\s+/g, " ")
    .trim();
}
