/**
 * Recompute and verify an AOS HMAC-chained audit log.
 *
 * Each entry's signature = HMAC(secret, prev_hash || canonical_payload)
 * Each entry's entry_hash  = SHA-256(prev_hash || signature)
 * The next entry's prev_hash MUST equal the previous entry's entry_hash.
 * The first entry chains from GENESIS = "0" * 64.
 */
import { canonicalize } from "./canonical.js";
import { hmacSha256Hex, sha256Hex } from "./crypto.js";

export const GENESIS = "0".repeat(64);

export interface AuditEntry {
  event: string;
  actor_id: string | null;
  actor_kind: string;
  review_id: string | null;
  payload: unknown;
  prev_hash: string | null;
  entry_hash: string | null;
  signature: string | null;
  created_at: string;
}

export interface EntryResult {
  ok: boolean;
  reason?: string;
  index: number;
  event: string;
  created_at: string;
}

export interface ChainResult {
  ok: boolean;
  count: number;
  results: EntryResult[];
}

export async function signPayload(
  secret: string,
  prevHash: string,
  payload: {
    event: string;
    actor_id: string | null;
    actor_kind: string;
    review_id: string | null;
    payload: unknown;
  },
): Promise<{ signature: string; entry_hash: string }> {
  const canonical = `${prevHash}|${canonicalize(payload)}`;
  const signature = await hmacSha256Hex(secret, canonical);
  const entry_hash = await sha256Hex(`${prevHash}|${signature}`);
  return { signature, entry_hash };
}

export async function verifyChain(
  secret: string,
  entries: AuditEntry[],
): Promise<ChainResult> {
  const sorted = [...entries].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const results: EntryResult[] = [];
  let expectedPrev = GENESIS;

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]!;
    const base = {
      index: i,
      event: e.event,
      created_at: e.created_at,
    };

    if (!e.prev_hash || !e.entry_hash || !e.signature) {
      results.push({ ...base, ok: false, reason: "missing chain fields (legacy entry)" });
      expectedPrev = e.entry_hash ?? expectedPrev;
      continue;
    }
    if (e.prev_hash !== expectedPrev) {
      results.push({ ...base, ok: false, reason: "prev_hash mismatch (chain broken)" });
      expectedPrev = e.entry_hash;
      continue;
    }

    const recomputed = await signPayload(secret, e.prev_hash, {
      event: e.event,
      actor_id: e.actor_id,
      actor_kind: e.actor_kind,
      review_id: e.review_id,
      payload: e.payload,
    });

    if (recomputed.signature !== e.signature) {
      results.push({ ...base, ok: false, reason: "signature mismatch (tampered payload)" });
    } else if (recomputed.entry_hash !== e.entry_hash) {
      results.push({ ...base, ok: false, reason: "entry_hash mismatch" });
    } else {
      results.push({ ...base, ok: true });
    }
    expectedPrev = e.entry_hash;
  }

  return {
    ok: results.length > 0 && results.every((r) => r.ok),
    count: results.length,
    results,
  };
}
