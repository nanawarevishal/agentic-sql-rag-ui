import { describe, expect, it } from "vitest";
import { statFigures } from "./projectStats";

describe("statFigures", () => {
  it("lists a document project's documents, chunks and vectors", () => {
    const figures = statFigures({
      documents: 12,
      chunks_by_modality: { text: { chunks: 340, embedded: 340 }, image: { chunks: 9, embedded: 7 } },
      last_ingested_at: "2026-10-01T10:00:00",
      namespaces: [{ namespace: "p-text", modality: "text", vector_count: 338, dimension: 1536 }],
    });

    expect(figures).toEqual([
      { label: "Documents", value: "12" },
      { label: "Text chunks", value: "340" },
      // The un-embedded remainder is the point of showing both numbers.
      { label: "Image chunks", value: "9 (7 embedded)" },
      { label: "Text vectors", value: "338" },
    ]);
  });

  it("lists a SQL project's vector count", () => {
    expect(statFigures({ namespace: "p", vector_count: 48, dimension: 1536 })).toEqual([
      { label: "Indexed vectors", value: "48" },
    ]);
  });

  it("returns nothing for stats it does not recognise", () => {
    expect(statFigures({})).toEqual([]);
  });
});
