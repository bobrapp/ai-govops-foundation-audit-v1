import { describe, it, expect } from "vitest";
import { GENESIS, signPayload, verifyChain, type AuditEntry } from "../src/chain.js";

const SECRET = "test-secret-do-not-use-in-prod";

async function buildChain(events: Array<{ event: string; payload: unknown }>): Promise<AuditEntry[]> {
  const entries: AuditEntry[] = [];
  let prev = GENESIS;
  const t0 = Date.parse("2026-01-01T00:00:00Z");
  for (let i = 0; i < events.length; i++) {
    const e = events[i]!;
    const body = {
      event: e.event,
      actor_id: "actor-" + i,
      actor_kind: "human",
      review_id: "rev-1",
      payload: e.payload,
    };
    const { signature, entry_hash } = await signPayload(SECRET, prev, body);
    entries.push({
      ...body,
      prev_hash: prev,
      entry_hash,
      signature,
      created_at: new Date(t0 + i * 1000).toISOString(),
    });
    prev = entry_hash;
  }
  return entries;
}

describe("verifyChain", () => {
  it("accepts a valid chain", async () => {
    const entries = await buildChain([
      { event: "review.created", payload: { title: "X" } },
      { event: "agent.finding", payload: { severity: "low" } },
      { event: "human.approved", payload: {} },
    ]);
    const r = await verifyChain(SECRET, entries);
    expect(r.ok).toBe(true);
    expect(r.count).toBe(3);
    expect(r.results.every((x) => x.ok)).toBe(true);
  });

  it("detects a tampered payload (signature mismatch)", async () => {
    const entries = await buildChain([
      { event: "review.created", payload: { title: "X" } },
      { event: "human.approved", payload: { ok: true } },
    ]);
    entries[1]!.payload = { ok: false }; // tamper
    const r = await verifyChain(SECRET, entries);
    expect(r.ok).toBe(false);
    expect(r.results[1]!.reason).toMatch(/signature mismatch/);
  });

  it("detects a broken chain (prev_hash mismatch)", async () => {
    const entries = await buildChain([
      { event: "a", payload: {} },
      { event: "b", payload: {} },
      { event: "c", payload: {} },
    ]);
    entries[1]!.prev_hash = "0".repeat(64); // wrong
    const r = await verifyChain(SECRET, entries);
    expect(r.ok).toBe(false);
    expect(r.results[1]!.reason).toMatch(/prev_hash mismatch/);
  });

  it("rejects entries missing chain fields", async () => {
    const entries = await buildChain([{ event: "a", payload: {} }]);
    entries[0]!.signature = null;
    const r = await verifyChain(SECRET, entries);
    expect(r.ok).toBe(false);
    expect(r.results[0]!.reason).toMatch(/missing chain fields/);
  });

  it("rejects with wrong secret", async () => {
    const entries = await buildChain([{ event: "a", payload: { x: 1 } }]);
    const r = await verifyChain("wrong-secret", entries);
    expect(r.ok).toBe(false);
  });

  it("returns ok:false on empty input", async () => {
    const r = await verifyChain(SECRET, []);
    expect(r.ok).toBe(false);
    expect(r.count).toBe(0);
  });
});
