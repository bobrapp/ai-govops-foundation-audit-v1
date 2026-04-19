/**
 * Deterministic JSON canonicalization — MUST match the format used by the
 * AOS reference server in supabase/functions/_shared/audit.ts.
 *
 * Rules:
 *   - Object keys sorted lexicographically
 *   - No whitespace between tokens
 *   - Arrays preserve order
 *   - Primitives use JSON.stringify
 *
 * Any deviation here will produce signature mismatches. Treat this file as
 * part of the AOS wire format.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k]))
      .join(",") +
    "}"
  );
}
