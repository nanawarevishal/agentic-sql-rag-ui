// The two project types report different stats. A SQL project's schema index
// is one vector namespace; a document project counts documents, chunks per
// modality (with how many of them are embedded) and the vectors actually in
// the index. Both reduce to labelled figures for the stats card.
//
// Chunks and vectors are listed separately on purpose: embedded chunks in
// Postgres and vectors in the index should match, and when they don't, that
// gap is the thing worth seeing.

export interface StatFigure {
  label: string;
  value: string;
}

interface ModalityCounts {
  chunks?: number;
  embedded?: number;
}

interface NamespaceCounts {
  modality?: string;
  vector_count?: number;
}

const count = (n: unknown) => (typeof n === "number" ? n.toLocaleString() : "-");
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function statFigures(stats: Record<string, unknown>): StatFigure[] {
  const figures: StatFigure[] = [];

  if (typeof stats.documents === "number") {
    figures.push({ label: "Documents", value: count(stats.documents) });
  }

  const byModality = (stats.chunks_by_modality ?? {}) as Record<string, ModalityCounts>;
  for (const [modality, c] of Object.entries(byModality)) {
    figures.push({
      label: `${titleCase(modality)} chunks`,
      value: c.embedded === c.chunks ? count(c.chunks) : `${count(c.chunks)} (${count(c.embedded)} embedded)`,
    });
  }

  if (Array.isArray(stats.namespaces)) {
    for (const ns of stats.namespaces as NamespaceCounts[]) {
      figures.push({ label: `${titleCase(ns.modality ?? "index")} vectors`, value: count(ns.vector_count) });
    }
  }

  if (typeof stats.vector_count === "number") {
    figures.push({ label: "Indexed vectors", value: count(stats.vector_count) });
  }

  return figures;
}
