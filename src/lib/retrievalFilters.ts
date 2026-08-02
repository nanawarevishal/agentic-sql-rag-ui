import type { TraceEvent } from "../types";

// Metadata filters the document service applied BEFORE searching, reported
// on its retrieve_passages trace events. They matter because they are
// invisible everywhere else: a filter that excluded the document holding the
// answer leaves a passage list that looks perfectly normal, just without the
// answer in it.
//
// `filters_restricted` and `filters_widened` are the backend's own verdicts,
// and nothing here re-derives them from the three raw fields below. They are
// two flags rather than one because they mean opposite things: restricted is
// "documents were removed, so an empty result may be the filter's doing",
// widened is "a history question dropped the supersession guard and this
// search reached further than usual". Only the first is a caveat on an
// answer. See agentic-doc-rag's app/rag/filters.py.
export interface RetrievalFilters {
  doc_types?: string[];
  effective_year?: number | null;
  exclude_superseded?: boolean;
}

interface RetrieveDetail {
  filters?: RetrievalFilters;
  filters_restricted?: boolean;
  filters_widened?: boolean;
}

// What kind of narrowing a phrase came from. The remedy a reader is offered
// depends on it: told to drop the document name when the filter was actually
// a year, they drop the name, get the same decline, and conclude the corpus
// has nothing - which is the failure this note exists to prevent.
export type RestrictionKind = "doc_type" | "effective_year";

export interface Restriction {
  kind: RestrictionKind;
  phrase: string;
}

interface AppliedFilters {
  filters: RetrievalFilters;
  restricted: boolean;
  widened: boolean;
}

// Every distinct filter set a turn actually retrieved under, with the
// service's verdicts attached. A decomposed question searches once per
// sub-question, and the CRAG loop can re-retrieve, so one turn can carry
// several.
export function appliedFilters(trace: TraceEvent[]): AppliedFilters[] {
  const seen = new Set<string>();
  const found: AppliedFilters[] = [];

  for (const event of trace) {
    if (event.node !== "retrieve_passages") continue;
    const detail = event.detail as RetrieveDetail | undefined;
    if (!detail?.filters) continue;
    if (!detail.filters_restricted && !detail.filters_widened) continue;

    const key = JSON.stringify(detail.filters);
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({
      filters: detail.filters,
      restricted: Boolean(detail.filters_restricted),
      widened: Boolean(detail.filters_widened),
    });
  }

  return found;
}

// Everything that differed from a default search, for the trace panel - which
// shows scope, not caveats, so a widening belongs there too.
export function describeFilters(applied: AppliedFilters): string[] {
  return [
    ...(applied.restricted ? restrictionsOf(applied.filters).map((r) => r.phrase) : []),
    ...(applied.widened ? ["superseded versions included"] : []),
  ];
}

function restrictionsOf(filters: RetrievalFilters): Restriction[] {
  const restrictions: Restriction[] = [];

  if (filters.doc_types?.length) {
    restrictions.push({
      kind: "doc_type",
      phrase: filters.doc_types.map((type) => `${type} documents`).join(" or "),
    });
  }
  if (filters.effective_year != null) {
    restrictions.push({
      kind: "effective_year",
      phrase: `documents in effect in ${filters.effective_year}`,
    });
  }

  return restrictions;
}

// The narrowings behind a whole turn, deduplicated by phrase, for a single
// sentence. Widenings are excluded on purpose: this feeds the "we may have
// searched less than everything" note, and a history question searched more.
export function turnRestrictions(trace: TraceEvent[]): Restriction[] {
  const byPhrase = new Map<string, Restriction>();

  for (const applied of appliedFilters(trace)) {
    if (!applied.restricted) continue;
    for (const restriction of restrictionsOf(applied.filters)) {
      byPhrase.set(restriction.phrase, restriction);
    }
  }

  return [...byPhrase.values()];
}

// What to try instead, named after the restriction that actually fired.
export function describeRemedy(restrictions: Restriction[]): string {
  const kinds = new Set(restrictions.map((r) => r.kind));
  const named = kinds.has("doc_type");
  const dated = kinds.has("effective_year");

  if (named && dated) return "Try asking without naming a document or a time period.";
  if (dated) return "Documents in effect at other times may cover it - try asking without the year.";
  return "Other documents may cover it - try asking without naming a document.";
}
