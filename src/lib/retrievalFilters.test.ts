import { describe, expect, it } from "vitest";
import type { TraceEvent } from "../types";
import {
  appliedFilters,
  describeFilters,
  describeRemedy,
  turnRestrictions,
  type RetrievalFilters,
} from "./retrievalFilters";

// Pre-search metadata filters are invisible in the results: a filter that
// excluded the document holding the answer leaves a passage list that looks
// perfectly ordinary. Everything here exists so a decline can say what was
// searched - which makes a wrong reading of these flags worse than no reading
// at all, since it produces a confident, specific, wrong explanation.

function retrieveEvent(
  filters: RetrievalFilters,
  flags: { restricted?: boolean; widened?: boolean } = {}
): TraceEvent {
  return {
    step: 1,
    node: "retrieve_passages",
    summary: "Retrieved 4 passage(s)",
    detail: {
      filters,
      filters_restricted: flags.restricted ?? false,
      filters_widened: flags.widened ?? false,
    },
    timestamp: "2026-08-02T00:00:00+00:00",
    sub_question: null,
  };
}

const DEFAULTS: RetrievalFilters = { doc_types: [], effective_year: null, exclude_superseded: true };
const POLICY: RetrievalFilters = { ...DEFAULTS, doc_types: ["policy"] };
const YEAR: RetrievalFilters = { ...DEFAULTS, effective_year: 2023 };
const HISTORY: RetrievalFilters = { ...DEFAULTS, exclude_superseded: false };

describe("reading the service's verdicts", () => {
  it("ignores a search that ran with the defaults", () => {
    expect(appliedFilters([retrieveEvent(DEFAULTS)])).toEqual([]);
  });

  it("never re-derives the verdict from the raw fields", () => {
    // exclude_superseded is true on every query. A client deciding for itself
    // whether the filters were "non-default" flags every single search - which
    // is the whole reason the service sends the two booleans.
    const trace = [retrieveEvent(POLICY, { restricted: false })];
    expect(appliedFilters(trace)).toEqual([]);
    expect(turnRestrictions(trace)).toEqual([]);
  });

  it("keeps one entry per distinct filter set", () => {
    // A decomposed question retrieves once per sub-question, and the CRAG
    // loop can retrieve again - same filters, several events.
    const trace = [
      retrieveEvent(POLICY, { restricted: true }),
      retrieveEvent(POLICY, { restricted: true }),
      retrieveEvent(YEAR, { restricted: true }),
    ];
    expect(appliedFilters(trace)).toHaveLength(2);
  });

  it("skips events from other nodes", () => {
    const other: TraceEvent = { ...retrieveEvent(POLICY, { restricted: true }), node: "rerank_passages" };
    expect(appliedFilters([other])).toEqual([]);
  });
});

describe("describing what was searched", () => {
  it("names document types and years", () => {
    expect(describeFilters({ filters: POLICY, restricted: true, widened: false })).toEqual([
      "policy documents",
    ]);
    expect(describeFilters({ filters: YEAR, restricted: true, widened: false })).toEqual([
      "documents in effect in 2023",
    ]);
  });

  it("mentions a widening in the trace panel, which shows scope not caveats", () => {
    expect(describeFilters({ filters: HISTORY, restricted: false, widened: true })).toEqual([
      "superseded versions included",
    ]);
  });
});

describe("what a decline is allowed to claim", () => {
  it("excludes a widening from the restrictions", () => {
    // Asking for version history drops the supersession guard: that search
    // covered MORE than usual. Reporting it as a limit would tell the reader
    // their question was narrowed by the one thing that broadened it.
    expect(turnRestrictions([retrieveEvent(HISTORY, { widened: true })])).toEqual([]);
  });

  it("keeps the restriction from a question that both narrowed and widened", () => {
    const both = { ...HISTORY, doc_types: ["policy"] };
    expect(turnRestrictions([retrieveEvent(both, { restricted: true, widened: true })])).toEqual([
      { kind: "doc_type", phrase: "policy documents" },
    ]);
  });

  it("dedupes phrases across sub-questions", () => {
    const trace = [
      retrieveEvent(POLICY, { restricted: true }),
      retrieveEvent({ ...POLICY, effective_year: 2023 }, { restricted: true }),
    ];
    expect(turnRestrictions(trace).map((r) => r.phrase)).toEqual([
      "policy documents",
      "documents in effect in 2023",
    ]);
  });
});

describe("the remedy names the restriction that fired", () => {
  it("suggests dropping the document name only when a document was named", () => {
    expect(describeRemedy([{ kind: "doc_type", phrase: "policy documents" }])).toContain(
      "without naming a document"
    );
  });

  it("suggests dropping the year when the filter was a year", () => {
    // The failure this replaced: telling someone to drop a document name they
    // never wrote. They rephrase, get the same decline, and conclude the
    // corpus has no answer - a wrong-but-fluent explanation of a wrong-but-
    // fluent decline.
    const remedy = describeRemedy([{ kind: "effective_year", phrase: "documents in effect in 2023" }]);
    expect(remedy).toContain("without the year");
    expect(remedy).not.toContain("naming a document");
  });

  it("covers both when both fired", () => {
    const remedy = describeRemedy([
      { kind: "doc_type", phrase: "policy documents" },
      { kind: "effective_year", phrase: "documents in effect in 2023" },
    ]);
    expect(remedy).toContain("naming a document or a time period");
  });
});
