import type { Citation, Passage, SubQuestionResult } from "../types";

// One entry of the Sources list: a citation's identity plus the excerpt
// body, which only the passage carries. `excerptMissing` separates "the join
// found no passage for this chunk" from "the passage had no text" - the two
// look identical once text is undefined, and only the first is a gap worth
// telling the reader about.
export type Source = Citation & { text?: string; excerptMissing?: boolean };

// What the Sources list under a document answer should contain.
//
// Split out of CitationList so the rules below can be tested directly: both
// of them were wrong at some point in a way that rendered without complaint.
//
// `citations` undefined and [] mean different things:
//   undefined - no marker numbering exists for this turn (a SQL turn, or one
//               recorded before the backend stored citations), so passage
//               order is the only fallback available.
//   []        - the answer cited nothing. Numbering the retrieved passages
//               [1]..[n] under it would point at markers its prose never used.
export function citationSources(
  citations: Citation[] | undefined,
  subResults: SubQuestionResult[]
): Source[] {
  const passages = subResults.flatMap((result) => result.passages ?? []);
  return citations ? withText(citations, passages) : fromPassageOrder(passages);
}

// Citations carry identity only; the excerpt body lives on the passage, so
// the two are joined on chunk_id here.
//
// The join can miss: the citation numbering is resolved across the whole
// merged answer, while `passages` is whatever the sub-results still carry, so
// a chunk cited by an answer whose passages were dropped en route arrives
// with no body. The entry stays - a citation with a document and page is
// still checkable, and dropping it would leave a gap in the numbering the
// prose uses - but it's marked so the UI can say the excerpt is missing
// rather than render a source that happens to be quiet.
function withText(citations: Citation[], passages: Passage[]): Source[] {
  const textByChunk = new Map(passages.map((p) => [p.chunk_id, p.text]));
  return citations.map((citation) => ({
    ...citation,
    text: textByChunk.get(citation.chunk_id),
    excerptMissing: !textByChunk.has(citation.chunk_id),
  }));
}

// Passage order is what uncited answers were always rendered with, so it
// stays rather than showing no sources at all.
function fromPassageOrder(passages: Passage[]): Source[] {
  return passages.map((passage, index) => ({ ...passage, marker: index + 1 }));
}
