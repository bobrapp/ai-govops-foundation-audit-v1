/**
 * High-level convenience: verify a single review against a public AOS server.
 *
 * Hits {host}/functions/v1/verify-chain?reviewId=... which returns the audit
 * entries + attestation + certifications. We then independently:
 *   1. Recompute the HMAC chain (requires the AUDIT_SIGNING_KEY — typically
 *      only the issuing org has this; third parties trust the server's
 *      `valid` field but can still verify PDF SHA-256 + anchor presence).
 *   2. Recompute SHA-256 of every PDF and compare to the stored hash.
 *   3. Confirm each certification's audit_entry_hash anchor exists in the chain.
 */
import { verifyChain, type AuditEntry, type ChainResult } from "./chain.js";
import { verifyPdf, type PdfVerifyResult } from "./pdf.js";

export interface ServerCertification {
  id: string;
  determination: string;
  pdf_url: string | null;
  pdf_sha256_stored: string | null;
  audit_entry_hash: string | null;
  status: "active" | "expired" | "revoked";
  risk_tier_declared: string | null;
  risk_tier_derived: string | null;
  expires_at: string | null;
}

export interface ServerVerifyResponse {
  reviewId: string;
  valid: boolean;
  entries: number;
  results: Array<{ id: string; event: string; ok: boolean; reason?: string }>;
  certifications: ServerCertification[];
  // raw entries are not always returned to third parties; only included when host trusts caller.
  raw_entries?: AuditEntry[];
}

export interface ReviewVerifyResult {
  reviewId: string;
  server_valid: boolean;
  chain?: ChainResult; // populated when secret + raw_entries available
  pdfs: PdfVerifyResult[];
  anchors: Array<{ certification_id: string; entry_hash: string; anchored: boolean }>;
  ok: boolean;
}

export interface VerifyReviewOptions {
  host: string;
  reviewId: string;
  /** Optional — only the issuing org has this. When provided, full chain re-verification runs. */
  signingKey?: string;
  fetchImpl?: typeof fetch;
}

export async function verifyReview(opts: VerifyReviewOptions): Promise<ReviewVerifyResult> {
  const f = opts.fetchImpl ?? fetch;
  const url = new URL("/functions/v1/verify-chain", opts.host);
  url.searchParams.set("reviewId", opts.reviewId);
  const resp = await f(url.toString());
  if (!resp.ok) throw new Error(`verify-chain returned HTTP ${resp.status}`);
  const data = (await resp.json()) as ServerVerifyResponse;

  let chain: ChainResult | undefined;
  if (opts.signingKey && data.raw_entries) {
    chain = await verifyChain(opts.signingKey, data.raw_entries);
  }

  const pdfs: PdfVerifyResult[] = [];
  for (const c of data.certifications) {
    if (c.pdf_url && c.pdf_sha256_stored) {
      pdfs.push(await verifyPdf(c.pdf_url, c.pdf_sha256_stored, f));
    }
  }

  const knownHashes = new Set(
    (data.raw_entries ?? []).map((e) => e.entry_hash).filter((h): h is string => !!h),
  );
  const anchors = data.certifications
    .filter((c) => c.audit_entry_hash)
    .map((c) => ({
      certification_id: c.id,
      entry_hash: c.audit_entry_hash!,
      // If we don't have raw_entries, trust the server's `valid` field for anchor presence.
      anchored: knownHashes.size > 0 ? knownHashes.has(c.audit_entry_hash!) : data.valid,
    }));

  const ok =
    data.valid &&
    pdfs.every((p) => p.ok) &&
    anchors.every((a) => a.anchored) &&
    (!chain || chain.ok);

  return {
    reviewId: opts.reviewId,
    server_valid: data.valid,
    chain,
    pdfs,
    anchors,
    ok,
  };
}
