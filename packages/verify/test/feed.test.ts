import { describe, it, expect } from "vitest";
import { activeOnly, expiringWithinDays, fetchFeed, type FeedResponse } from "../src/feed.js";

const sample: FeedResponse = {
  schema: "aos.attestation-feed.v1",
  generated_at: "2026-04-19T00:00:00Z",
  count: 3,
  attestations: [
    {
      id: "1", review_id: "r1", organization: "Acme", scope_statement: "x",
      determination: "pass", aos_version: "v1.0", scenarios: ["enterprise_oss"],
      risk_tier_declared: "medium", risk_tier_derived: "high", risk_tier_disagreement: true,
      issued_at: "2026-01-01T00:00:00Z",
      expires_at: new Date(Date.now() + 5 * 86400000).toISOString(),
      revoked_at: null, revoked_reason: null, status: "active",
      pdf_url: "https://x/y.pdf", pdf_sha256: "abc", audit_entry_hash: "h",
      verify_url: "https://aigovops/verify/r1",
    },
    {
      id: "2", review_id: "r2", organization: "B", scope_statement: "x",
      determination: "pass", aos_version: "v1.0", scenarios: [],
      risk_tier_declared: "high", risk_tier_derived: "high", risk_tier_disagreement: false,
      issued_at: "2026-01-01T00:00:00Z",
      expires_at: new Date(Date.now() + 100 * 86400000).toISOString(),
      revoked_at: null, revoked_reason: null, status: "active",
      pdf_url: null, pdf_sha256: null, audit_entry_hash: null,
      verify_url: "https://aigovops/verify/r2",
    },
    {
      id: "3", review_id: "r3", organization: "C", scope_statement: "x",
      determination: "pass", aos_version: "v1.0", scenarios: [],
      risk_tier_declared: null, risk_tier_derived: null, risk_tier_disagreement: false,
      issued_at: "2026-01-01T00:00:00Z", expires_at: null,
      revoked_at: "2026-02-01T00:00:00Z", revoked_reason: "policy change", status: "revoked",
      pdf_url: null, pdf_sha256: null, audit_entry_hash: null,
      verify_url: "https://aigovops/verify/r3",
    },
  ],
};

describe("feed helpers", () => {
  it("activeOnly drops revoked + expired", () => {
    expect(activeOnly(sample)).toHaveLength(2);
  });
  it("expiringWithinDays catches near-expiry only", () => {
    const soon = expiringWithinDays(sample, 7);
    expect(soon.map((a) => a.id)).toEqual(["1"]);
  });
});

describe("fetchFeed", () => {
  it("builds the right URL and parses v1 payload", async () => {
    let calledUrl = "";
    const mockFetch = (async (input: string) => {
      calledUrl = input;
      return new Response(JSON.stringify(sample), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;
    const r = await fetchFeed({
      host: "https://aigovops.example.com",
      risk_tier: "high",
      since: "2026-01-01",
      fetchImpl: mockFetch,
    });
    expect(calledUrl).toContain("/functions/v1/attestation-feed");
    expect(calledUrl).toContain("risk_tier=high");
    expect(calledUrl).toContain("since=2026-01-01");
    expect(r.schema).toBe("aos.attestation-feed.v1");
    expect(r.attestations).toHaveLength(3);
  });

  it("throws on non-2xx", async () => {
    const mockFetch = (async () =>
      new Response("nope", { status: 500 })) as unknown as typeof fetch;
    await expect(
      fetchFeed({ host: "https://x", fetchImpl: mockFetch }),
    ).rejects.toThrow(/500/);
  });
});
