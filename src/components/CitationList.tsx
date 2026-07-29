import { useState } from "react";
import type { Passage, SubQuestionResult } from "../types";

// Sources behind a document answer.
//
// The numbering matters: the answer text cites "[2]", and the agent built
// those markers from the passage order it was given, so this list must
// render in the same order it arrived in. Sorting by score here would
// silently repoint every citation in the prose.
export function CitationList({ subResults }: { subResults: SubQuestionResult[] }) {
  const passages = subResults.flatMap((result) => result.passages ?? []);
  if (passages.length === 0) return null;

  return (
    <div className="citation-list">
      <h4 className="citation-list-title">Sources</h4>
      <ol className="citation-items">
        {passages.map((passage, index) => (
          <CitationItem key={`${passage.chunk_id}-${index}`} passage={passage} index={index + 1} />
        ))}
      </ol>
    </div>
  );
}

function CitationItem({ passage, index }: { passage: Passage; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const heading = (passage.headings ?? []).filter(Boolean).join(" › ");

  return (
    <li className="citation-item">
      <div className="citation-item-head">
        <span className="citation-index">[{index}]</span>
        <span className="citation-source">
          {passage.document}
          {passage.page ? `, p.${passage.page}` : ""}
        </span>
        {passage.modality !== "text" && (
          <span className="citation-modality">{passage.modality}</span>
        )}
      </div>

      {heading && <p className="citation-heading">{heading}</p>}

      {/* Only image/table passages carry an artifact. Rendering it is what
          makes a figure citation checkable rather than a filename to trust. */}
      {passage.asset_url && (
        <img
          className="citation-asset"
          src={passage.asset_url}
          alt={passage.text || `${passage.modality} from ${passage.document}`}
          loading="lazy"
        />
      )}

      {passage.text && (
        <>
          <p className={`citation-text ${expanded ? "is-expanded" : ""}`}>{passage.text}</p>
          {passage.text.length > 240 && (
            <button type="button" className="link-button" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </>
      )}
    </li>
  );
}
