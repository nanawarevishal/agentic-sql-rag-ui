import type { SubQuestionResult, TraceEvent } from "../types";
import { stripSql } from "./redactSql";

export interface ExplainSection {
  subQuestion: string | null;
  lines: string[];
}

const REJECTING_VERDICTS = new Set(["insufficient", "retry", "ambiguous"]);

function detailOf(event: TraceEvent): Record<string, unknown> {
  return event.detail ?? {};
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// retrieve_schema's chunks are RAG candidates picked by embedding similarity,
// not the tables the generated SQL ended up using - a loan question reliably
// pulls in neighboring loan-ish tables (e.g. loan_payments, accounts) that
// never appear in the final query. Reporting the raw candidate list as
// "looked at" overstates what actually produced the answer, so narrow it
// down to tables that literally appear (as a whole word) in the executed
// SQL. Falls back to the full candidate list when there's no SQL yet to
// check against (e.g. the sub-question errored before generation).
function tablesActuallyUsed(candidateTables: string[], sql: string | undefined): string[] {
  if (!sql) return candidateTables;
  return candidateTables.filter((table) => new RegExp(`\\b${escapeRegExp(table)}\\b`, "i").test(sql));
}

// Turns the raw trace + sub_results the app already has into short,
// user-facing sentences - a narrative twin of the dev-facing trace panel,
// built without any extra API call.
function buildSectionLines(events: TraceEvent[], subResult: SubQuestionResult | undefined): string[] {
  const lines: string[] = [];

  const retrieveEvent = events.find((e) => e.node === "retrieve_schema");
  if (retrieveEvent) {
    const chunks =
      (detailOf(retrieveEvent).chunks as Array<{ table_name?: string }> | undefined) ?? [];
    const candidateTables = Array.from(
      new Set(chunks.map((c) => c.table_name).filter((t): t is string => Boolean(t)))
    );
    const tables = tablesActuallyUsed(candidateTables, subResult?.sql);
    if (tables.length > 0) {
      lines.push(`Looked at ${tables.length === 1 ? "table" : "tables"}: ${tables.join(", ")}.`);
    }
  }

  const retries = subResult?.retries ?? 0;
  if (retries > 0) {
    const rejectionReasons = events
      // finalize is the only node that runs a retry decision when Self-RAG
      // critique is off (its default) - it's also where an execution-error
      // retry's reason lives even when critique did run, so it must be
      // included alongside grade_relevance/critique or most retries show
      // up with no reason at all.
      .filter((e) => e.node === "grade_relevance" || e.node === "critique" || e.node === "finalize")
      .map((e) => detailOf(e))
      .filter((d) => REJECTING_VERDICTS.has(d.verdict as string))
      .map((d) => d.reason as string | undefined)
      .filter((r): r is string => Boolean(r));
    const reason = rejectionReasons[rejectionReasons.length - 1];
    lines.push(`Retried ${retries} time${retries > 1 ? "s" : ""}${reason ? ` — ${reason}` : ""}.`);
  }

  if (subResult?.error) {
    // Driver errors quote the failing statement back at you - not something
    // to put in the user-facing explanation.
    lines.push(`Failed: ${stripSql(subResult.error)}`);
  } else if (subResult?.rows) {
    lines.push(`Returned ${subResult.rows.length} row${subResult.rows.length === 1 ? "" : "s"}.`);
  }

  if (subResult?.needs_clarification) {
    lines.push("The agent needed clarification to fully answer this.");
  }

  return lines;
}

export function buildExplanation(
  trace: TraceEvent[],
  subResults: SubQuestionResult[]
): ExplainSection[] {
  if (subResults.length <= 1) {
    const subResult = subResults[0];
    const lines = buildSectionLines(trace, subResult);
    return lines.length > 0 ? [{ subQuestion: subResult?.sub_question ?? null, lines }] : [];
  }

  return subResults
    .map((sr) => {
      const events = trace.filter((e) => (e.sub_question ?? null) === (sr.sub_question ?? null));
      const lines = buildSectionLines(events, sr);
      return { subQuestion: sr.sub_question ?? null, lines };
    })
    .filter((section) => section.lines.length > 0);
}
