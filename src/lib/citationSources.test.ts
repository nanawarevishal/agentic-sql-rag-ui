import { describe, expect, it } from "vitest";
import type { Citation, Passage, SubQuestionResult } from "../types";
import { citationSources } from "./citationSources";

// Two rules that were both wrong at some point and rendered without a
// complaint either way: the numbering must come from `citations`, and
// "no citations field" must not be confused with "cited nothing".

function passage(chunk_id: string, text: string): Passage {
  return { chunk_id, document: "handbook.pdf", modality: "text", text };
}

function citation(marker: number, chunk_id: string): Citation {
  return { marker, chunk_id, document: "handbook.pdf", modality: "text" };
}

function subResults(...passages: Passage[]): SubQuestionResult[] {
  return [{ sub_question: "q", passages }];
}

describe("numbering comes from the citations, not the passage order", () => {
  it("uses the markers the answer's prose was written against", () => {
    // The service resolves markers across the merged answer: it drops
    // passages nothing cites and renumbers what survives. Here the cited
    // chunk is third in the passage list, so indexing passages would render
    // it as [3] under an answer that says [1].
    const sources = citationSources(
      [citation(1, "c3")],
      subResults(passage("c1", "one"), passage("c2", "two"), passage("c3", "three"))
    );

    expect(sources).toHaveLength(1);
    expect(sources[0].marker).toBe(1);
    expect(sources[0].text).toBe("three");
  });

  it("joins the excerpt body on chunk_id across sub-questions", () => {
    const sources = citationSources(
      [citation(1, "b1"), citation(2, "a1")],
      [
        { sub_question: "a", passages: [passage("a1", "from a")] },
        { sub_question: "b", passages: [passage("b1", "from b")] },
      ]
    );

    expect(sources.map((s) => s.text)).toEqual(["from b", "from a"]);
  });
});

describe("a citation whose passage didn't come back", () => {
  it("keeps the entry and marks the excerpt missing", () => {
    // Dropping it would leave a hole in the numbering the prose uses; showing
    // it silently would look like a source that simply has nothing to say.
    const [source] = citationSources([citation(1, "gone")], subResults(passage("c1", "one")));

    expect(source.marker).toBe(1);
    expect(source.text).toBeUndefined();
    expect(source.excerptMissing).toBe(true);
  });

  it("does not mark a passage that exists but is empty", () => {
    const [source] = citationSources([citation(1, "c1")], subResults(passage("c1", "")));
    expect(source.excerptMissing).toBe(false);
  });
});

describe("undefined citations vs an empty list", () => {
  it("falls back to passage order when there is no numbering at all", () => {
    // A SQL turn, or a doc turn recorded before the backend stored citations.
    // Passage order is all there is, and it beats showing no sources.
    const sources = citationSources(undefined, subResults(passage("c1", "one"), passage("c2", "two")));

    expect(sources.map((s) => s.marker)).toEqual([1, 2]);
    expect(sources.map((s) => s.text)).toEqual(["one", "two"]);
  });

  it("shows nothing when the answer cited nothing", () => {
    // [] is a real answer: the prose used no markers. Numbering the retrieved
    // passages under it would point at markers that were never written -
    // which is what the old `citations?.length` check did, because it treated
    // [] and undefined the same way.
    expect(citationSources([], subResults(passage("c1", "one")))).toEqual([]);
  });
});
