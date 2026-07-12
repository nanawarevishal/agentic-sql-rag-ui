import type { ApiErrorBody } from "../types";

// Pulls a human-readable message out of whatever shape FastAPI sent back -
// a plain string detail, a list of pydantic validation errors (422), or
// this backend's custom {error, message, details} shape (500s). Falls back
// to null (caller supplies a generic message) rather than guessing.
export function parseErrorBody(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("detail" in body)) return null;
  const detail = (body as ApiErrorBody).detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail.map((d) => d?.msg).filter((m): m is string => typeof m === "string" && m.length > 0);
    return messages.length > 0 ? messages.join("; ") : null;
  }

  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string") return detail.message;
    if (typeof detail.error === "string") return detail.error;
  }

  return null;
}
