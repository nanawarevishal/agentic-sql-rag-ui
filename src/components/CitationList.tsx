import { useState } from "react";
import type { Citation, SubQuestionResult } from "../types";
import { citationSources, type Source } from "../lib/citationSources";
import { useAssetObjectUrl } from "../hooks/useAssetObjectUrl";

// Sources behind a document answer.
//
// The numbering comes from `citations`, never from this list's own order.
// The answer text cites "[2]", and the backend decided what [2] means when
// it merged the sub-answers - it drops passages the prose never cites and
// renumbers the rest - so counting passages here would silently repoint
// every marker (see the Citation type). What that means for undefined vs [],
// and for a citation whose passage is missing, lives in lib/citationSources.
export function CitationList({
  citations,
  subResults,
}: {
  citations?: Citation[];
  subResults: SubQuestionResult[];
}) {
  const sources = citationSources(citations, subResults);
  if (sources.length === 0) return null;

  return (
    <div className="citation-list">
      <h4 className="citation-list-title">Sources</h4>
      <ol className="citation-items">
        {sources.map((source) => (
          <CitationItem key={`${source.chunk_id}-${source.marker}`} source={source} />
        ))}
      </ol>
    </div>
  );
}

function CitationItem({ source }: { source: Source }) {
  const [expanded, setExpanded] = useState(false);
  const heading = (source.headings ?? []).filter(Boolean).join(" › ");

  return (
    <li className="citation-item">
      <div className="citation-item-head">
        <span className="citation-index">[{source.marker}]</span>
        <span className="citation-source">
          {source.document}
          {source.page ? `, p.${source.page}` : ""}
        </span>
        {source.modality !== "text" && <span className="citation-modality">{source.modality}</span>}
      </div>

      {heading && <p className="citation-heading">{heading}</p>}

      {source.asset_url && <CitationAsset source={source} />}

      {source.text ? (
        <>
          <p className={`citation-text ${expanded ? "is-expanded" : ""}`}>{source.text}</p>
          {source.text.length > 240 && (
            <button type="button" className="link-button" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </>
      ) : (
        source.excerptMissing && (
          <p className="citation-text-missing">
            Excerpt not available in this turn - open the document to check this one.
          </p>
        )
      )}
    </li>
  );
}

// Only image/table passages carry an artifact. Rendering it is what makes a
// figure citation checkable rather than a filename to trust.
//
// The src is an object URL rather than asset_url itself: the artifact route
// is behind the API's bearer auth, and a browser sends no Authorization
// header for an <img>, so pointing at it directly always 401s.
function CitationAsset({ source }: { source: Source }) {
  const { objectUrl, failed } = useAssetObjectUrl(source.asset_url);

  if (failed) {
    return <p className="citation-asset-error">Couldn't load this {source.modality}.</p>;
  }
  if (!objectUrl) {
    return <div className="citation-asset-placeholder" aria-hidden="true" />;
  }
  return (
    <img
      className="citation-asset"
      src={objectUrl}
      alt={source.text || `${source.modality} from ${source.document}`}
    />
  );
}
