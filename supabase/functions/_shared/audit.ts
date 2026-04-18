// Shared HMAC-SHA256 chained audit utility.
// Each entry's signature = HMAC(key, prev_hash || canonical_payload)
// entry_hash = SHA-256(prev_hash || signature) — becomes the next entry's prev_hash.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const enc = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

// Canonicalize JSON deterministically (sorted keys, no whitespace)
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize((value as any)[k])).join(",") + "}";
}

export async function signPayload(
  secret: string,
  prevHash: string,
  payload: { event: string; actor_id: string | null; actor_kind: string; review_id: string | null; payload: unknown },
) {
  const key = await importKey(secret);
  const canonical = `${prevHash}|${canonicalize(payload)}`;
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(canonical));
  const signature = toHex(sigBuf);
  const hashBuf = await crypto.subtle.digest("SHA-256", enc.encode(`${prevHash}|${signature}`));
  const entryHash = toHex(hashBuf);
  return { signature, entry_hash: entryHash };
}

const GENESIS = "0".repeat(64);

/**
 * Insert a signed audit entry. Reads the latest entry_hash for the review,
 * chains from it (or genesis if none), signs, and inserts.
 */
export async function insertSignedAudit(
  admin: SupabaseClient,
  secret: string,
  entry: {
    review_id: string | null;
    actor_id: string | null;
    actor_kind: string;
    event: string;
    payload: unknown;
  },
) {
  // Find prev hash: latest entry for this review (or globally if review_id null)
  const q = admin.from("audit_log").select("entry_hash").order("created_at", { ascending: false }).limit(1);
  const { data: prev } = entry.review_id
    ? await q.eq("review_id", entry.review_id)
    : await q.is("review_id", null);
  const prevHash = prev?.[0]?.entry_hash ?? GENESIS;

  const { signature, entry_hash } = await signPayload(secret, prevHash, {
    event: entry.event,
    actor_id: entry.actor_id,
    actor_kind: entry.actor_kind,
    review_id: entry.review_id,
    payload: entry.payload,
  });

  const { error } = await admin.from("audit_log").insert({
    review_id: entry.review_id,
    actor_id: entry.actor_id,
    actor_kind: entry.actor_kind,
    event: entry.event,
    payload: entry.payload as any,
    prev_hash: prevHash,
    entry_hash,
    signature,
  });
  if (error) throw error;
  return { prev_hash: prevHash, entry_hash, signature };
}

export async function verifyChain(
  secret: string,
  entries: Array<{
    event: string;
    actor_id: string | null;
    actor_kind: string;
    review_id: string | null;
    payload: unknown;
    prev_hash: string | null;
    entry_hash: string | null;
    signature: string | null;
    created_at: string;
  }>,
) {
  // entries should be in chronological order
  const sorted = [...entries].sort((a, b) => a.created_at.localeCompare(b.created_at));
  let expectedPrev = GENESIS;
  const results: Array<{ ok: boolean; reason?: string }> = [];
  for (const e of sorted) {
    if (!e.prev_hash || !e.entry_hash || !e.signature) {
      results.push({ ok: false, reason: "missing chain fields (legacy entry)" });
      expectedPrev = e.entry_hash ?? expectedPrev;
      continue;
    }
    if (e.prev_hash !== expectedPrev) {
      results.push({ ok: false, reason: `prev_hash mismatch (chain broken)` });
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
      results.push({ ok: false, reason: "signature mismatch (tampered payload)" });
    } else if (recomputed.entry_hash !== e.entry_hash) {
      results.push({ ok: false, reason: "entry_hash mismatch" });
    } else {
      results.push({ ok: true });
    }
    expectedPrev = e.entry_hash;
  }
  return { ok: results.every((r) => r.ok), results };
}
