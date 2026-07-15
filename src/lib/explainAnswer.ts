import type { SubQuestionResult, TraceEvent } from "../types";

export interface ExplainSection {
  subQuestion: string | null;
  lines: string[];
}

const REJECTING_VERDICTS = new Set(["insufficient", "retry", "ambiguous"]);

function detailOf(event: TraceEvent): Record<string, unknown> {
  return event.detail ?? {};
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
    const tables = Array.from(
      new Set(chunks.map((c) => c.table_name).filter((t): t is string => Boolean(t)))
    );
    if (tables.length > 0) {
      lines.push(`Looked at ${tables.length === 1 ? "table" : "tables"}: ${tables.join(", ")}.`);
    }
  }

  const retries = subResult?.retries ?? 0;
  if (retries > 0) {
    const rejectionReasons = events
      .filter((e) => e.node === "grade_relevance" || e.node === "critique")
      .map((e) => detailOf(e))
      .filter((d) => REJECTING_VERDICTS.has(d.verdict as string))
      .map((d) => d.reason as string | undefined)
      .filter((r): r is string => Boolean(r));
    const reason = rejectionReasons[rejectionReasons.length - 1];
    lines.push(`Retried ${retries} time${retries > 1 ? "s" : ""}${reason ? ` — ${reason}` : ""}.`);
  }

  if (subResult?.error) {
    lines.push(`Failed: ${subResult.error}`);
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
