/**
 * Verify an AOS Review Attestation PDF by recomputing its SHA-256 and
 * comparing to the value embedded in the attestation/certification record.
 */
import { sha256Hex } from "./crypto.js";

export interface PdfVerifyResult {
  ok: boolean;
  url: string;
  expected_sha256: string;
  actual_sha256: string | null;
  bytes: number | null;
  reason?: string;
}

export async function verifyPdf(
  url: string,
  expectedSha256: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PdfVerifyResult> {
  try {
    const resp = await fetchImpl(url);
    if (!resp.ok) {
      return {
        ok: false,
        url,
        expected_sha256: expectedSha256,
        actual_sha256: null,
        bytes: null,
        reason: `HTTP ${resp.status}`,
      };
    }
    const buf = new Uint8Array(await resp.arrayBuffer());
    const actual = await sha256Hex(buf);
    return {
      ok: actual === expectedSha256,
      url,
      expected_sha256: expectedSha256,
      actual_sha256: actual,
      bytes: buf.byteLength,
      reason: actual === expectedSha256 ? undefined : "sha256 mismatch (PDF differs from anchor)",
    };
  } catch (e) {
    return {
      ok: false,
      url,
      expected_sha256: expectedSha256,
      actual_sha256: null,
      bytes: null,
      reason: e instanceof Error ? e.message : "fetch failed",
    };
  }
}
