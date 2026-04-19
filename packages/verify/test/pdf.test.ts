import { describe, it, expect } from "vitest";
import { verifyPdf } from "../src/pdf.js";
import { sha256Hex } from "../src/crypto.js";

function mockFetch(bytes: Uint8Array, status = 200): typeof fetch {
  return (async () =>
    new Response(bytes, { status })) as unknown as typeof fetch;
}

describe("verifyPdf", () => {
  it("returns ok when sha256 matches", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const sha = await sha256Hex(bytes);
    const r = await verifyPdf("https://example.com/a.pdf", sha, mockFetch(bytes));
    expect(r.ok).toBe(true);
    expect(r.actual_sha256).toBe(sha);
    expect(r.bytes).toBe(5);
  });

  it("returns mismatch when bytes differ", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const r = await verifyPdf("https://example.com/a.pdf", "0".repeat(64), mockFetch(bytes));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/mismatch/);
  });

  it("handles HTTP errors", async () => {
    const r = await verifyPdf(
      "https://example.com/a.pdf",
      "0".repeat(64),
      mockFetch(new Uint8Array(), 404),
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/HTTP 404/);
  });
});
