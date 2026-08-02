import { describe, expect, it } from "vitest";
import type { TraceEvent } from "../types";
import { groupIntoModules, moduleStatus, type ProjectKind } from "./traceModules";

// The rules are keyword regexes over node names this repo doesn't own, and
// two services feed them different names for the same stage. The failures
// that produced these tests were both silent: a doc run labelled "Find the
// relevant tables", and "contextualize_question" swallowed by the SQL
// retrieve rule's "context" keyword. Nothing errors when a label is wrong -
// it just reads as a stage that never ran.
//
// So this pins the mapping explicitly, node name by node name, against the
// real graphs: agentic-doc-rag's and agentic-sql-rag's app/agent/graph.py.

function event(node: string, overrides: Partial<TraceEvent> = {}): TraceEvent {
  return {
    step: 1,
    node,
    summary: "",
    detail: {},
    timestamp: "2026-08-02T00:00:00+00:00",
    sub_question: null,
    ...overrides,
  };
}

function keyFor(node: string, projectType?: ProjectKind): string {
  return groupIntoModules([event(node)], projectType)[0].key;
}

function labelFor(node: string, projectType?: ProjectKind): string {
  return groupIntoModules([event(node)], projectType)[0].label;
}

// Every node name in agentic-doc-rag's app/agent/graph.py.
const DOC_NODES: Array<[string, string]> = [
  ["contextualize_question", "contextualize"],
  ["planner", "decompose"],
  ["retrieve_passages", "retrieve"],
  ["rerank_passages", "rerank"],
  ["trim_passages", "trim"],
  ["grade_relevance", "grade"],
  ["request_clarification", "clarify"],
  ["answer", "draft_answer"],
  ["critique", "critique"],
  // Closes a sub-question branch, and reads as part of writing the answer.
  ["finalize", "synthesize"],
  ["synthesize", "synthesize"],
];

// Every node name in agentic-sql-rag's app/agent/graph.py.
const SQL_NODES: Array<[string, string]> = [
  ["contextualize_question", "contextualize"],
  ["planner", "decompose"],
  ["retrieve_schema", "retrieve"],
  ["grade_relevance", "grade"],
  ["request_clarification", "clarify"],
  ["generate_sql", "generate_sql"],
  ["execute_sql", "execute_sql"],
  ["critique", "critique"],
  ["finalize", "synthesize"],
  ["synthesize", "synthesize"],
];

describe("node names map to the intended module", () => {
  it.each(DOC_NODES)("doc_rag %s -> %s", (node, key) => {
    expect(keyFor(node, "doc_rag")).toBe(key);
  });

  it.each(SQL_NODES)("sql_rag %s -> %s", (node, key) => {
    expect(keyFor(node, "sql_rag")).toBe(key);
  });

  it("orders rerank ahead of retrieve, since both match 'passage'", () => {
    // First match wins, so a rerank rule placed after the retrieve rule would
    // report re-ranking as another retrieval pass.
    expect(keyFor("rerank_passages", "doc_rag")).toBe("rerank");
    expect(keyFor("trim_passages", "doc_rag")).toBe("trim");
  });

  it("does not let the SQL retrieve rule swallow contextualize_question", () => {
    // The rule's keywords once included "context". A question rewrite is not
    // a schema lookup, and mislabelling it hid the rewrite entirely.
    expect(labelFor("contextualize_question", "sql_rag")).toBe("Read the question in context");
  });

  it("keeps an unrecognised node instead of dropping it", () => {
    const mod = groupIntoModules([event("some_future_node")], "doc_rag")[0];
    expect(mod.key).toBe("some_future_node");
    expect(mod.label).toBe("Some Future Node");
  });
});

describe("labels speak each agent's vocabulary", () => {
  it("names passages for doc runs and tables for SQL runs", () => {
    expect(labelFor("retrieve_passages", "doc_rag")).toBe("Find the relevant passages");
    expect(labelFor("retrieve_schema", "sql_rag")).toBe("Find the relevant tables");
    expect(labelFor("grade_relevance", "doc_rag")).toBe("Check the passages answer the question");
    expect(labelFor("grade_relevance", "sql_rag")).toBe("Check the tables fit the question");
  });

  it("falls back to SQL wording when the project hasn't loaded yet", () => {
    // A turn can render before its project does. SQL wording is the default
    // rather than a third neutral vocabulary - see rulesFor.
    expect(labelFor("grade_relevance")).toBe("Check the tables fit the question");
  });
});

describe("grouping", () => {
  it("merges consecutive events of one stage and splits when it changes", () => {
    const modules = groupIntoModules(
      [
        event("retrieve_passages"),
        event("retrieve_passages"),
        event("rerank_passages"),
        event("retrieve_passages"),
      ],
      "doc_rag"
    );

    // The CRAG loop re-enters retrieval after re-ranking, and that second
    // pass is a separate module - collapsing it would hide the retry.
    expect(modules.map((m) => m.key)).toEqual(["retrieve", "rerank", "retrieve"]);
    expect(modules[0].events).toHaveLength(2);
  });
});

describe("module status", () => {
  it("reports an error only for a real error detail or summary", () => {
    const failed = groupIntoModules([event("answer", { summary: "Answer generation failed: boom" })], "doc_rag")[0];
    expect(moduleStatus(failed)).toBe("error");

    const detailError = groupIntoModules(
      [event("execute_sql", { detail: { error: "relation does not exist" } })],
      "sql_rag"
    )[0];
    expect(moduleStatus(detailError)).toBe("error");
  });

  it("does not flip on a summary that rules the failure out", () => {
    const clean = groupIntoModules([event("critique", { summary: "Accepted, no retry needed" })], "doc_rag")[0];
    expect(moduleStatus(clean)).toBe("ok");
  });

  it("reports a retry when one actually happened", () => {
    const retried = groupIntoModules([event("finalize", { summary: "Retrying the answer (1/2)" })], "doc_rag")[0];
    expect(moduleStatus(retried)).toBe("retry");
  });
});
