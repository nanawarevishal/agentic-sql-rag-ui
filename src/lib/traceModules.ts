import type { TraceEvent } from "../types";
import { titleize } from "./format";

export interface TraceModule {
  key: string;
  label: string;
  events: TraceEvent[];
}

interface ModuleRule {
  key: string;
  label: string;
  test: RegExp;
}

// Backend node names aren't a fixed enum we control from this repo, so we
// classify by keyword instead of hardcoding exact strings - anything that
// doesn't match a known pipeline stage still gets its own titleized module
// rather than being dropped.
// Labels are what a non-technical reader sees in the trace panel, so they
// describe the *intent* of each stage in plain language - the keys stay as
// they are because icons and status chips are keyed off them.
const MODULE_RULES: ModuleRule[] = [
  { key: "decompose", label: "Break the question down", test: /decompos/i },
  { key: "retrieve", label: "Find the relevant tables", test: /retriev|schema|context|embed/i },
  { key: "grade", label: "Check the tables fit the question", test: /grad|crag|relevan/i },
  { key: "critique", label: "Double-check the answer", test: /critiqu|self.?rag|reflect/i },
  { key: "generate_sql", label: "Work out what to look up", test: /generate.?sql|sql.?gen|write.?sql|draft/i },
  { key: "validate_sql", label: "Safety check", test: /validat|lint|static.?sql/i },
  { key: "execute_sql", label: "Fetch the data", test: /execut|run.?sql|query.?db/i },
  { key: "synthesize", label: "Write the answer", test: /synthes|final.?answer|compose|answer/i },
];

function classify(node: string): { key: string; label: string } {
  const rule = MODULE_RULES.find((r) => r.test.test(node));
  return rule ?? { key: node, label: titleize(node) };
}

export function groupIntoModules(events: TraceEvent[]): TraceModule[] {
  const modules: TraceModule[] = [];
  for (const event of events) {
    const { key, label } = classify(event.node);
    const last = modules[modules.length - 1];
    if (last && last.key === key) {
      last.events.push(event);
    } else {
      modules.push({ key, label, events: [event] });
    }
  }
  return modules;
}

export type ModuleStatus = "ok" | "retry" | "error";

// Only the summary (backend-written prose meant to be read) is scanned by
// keyword. `detail` is never stringified for this - it's arbitrary payload
// (SQL, retrieved chunk text, row data) that legitimately contains an
// "error" *key* set to null, or words like "error"/"fail" inside unrelated
// schema documentation, and blindly regexing its JSON text produces false
// positives that don't reflect what actually happened.
function hasExplicitError(mod: TraceModule): boolean {
  return mod.events.some((e) => {
    const err = (e.detail as Record<string, unknown> | undefined)?.error;
    return typeof err === "string" && err.trim().length > 0;
  });
}

export function moduleStatus(mod: TraceModule): ModuleStatus {
  if (hasExplicitError(mod)) return "error";

  // Strip negated mentions ("no retry needed", "without failure") first so
  // a summary explicitly ruling something out doesn't flip the status chip.
  const text = mod.events
    .map((e) => e.summary)
    .join(" ")
    .toLowerCase()
    .replace(/\b(no|without|zero)\s+(\w+\s+)?(retr\w*|fail\w*|error\w*)\b/g, "");
  if (/\berror\b|\bfail(ed|ure)?\b/.test(text)) return "error";
  if (/\bretr(y|ying|ied)\b/.test(text)) return "retry";
  return "ok";
}
