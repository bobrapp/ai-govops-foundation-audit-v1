/**
 * Fetch and validate the public AOS attestation feed.
 *
 * Reference endpoint shape (insurer-ingestion friendly, stable v1):
 *   GET {host}/functions/v1/attestation-feed?risk_tier=high&since=2025-01-01
 *
 * The feed is intentionally read-only and does NOT require an API key.
 */
export type RiskTier = "medium" | "high" | "critical";
export type CertStatus = "active" | "expired" | "revoked";

export interface FeedAttestation {
  id: string;
  review_id: string;
  organization: string;
  scope_statement: string;
  determination: string;
  aos_version: string;
  scenarios: string[];
  risk_tier_declared: RiskTier | null;
  risk_tier_derived: RiskTier | null;
  risk_tier_disagreement: boolean;
  issued_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  status: CertStatus;
  pdf_url: string | null;
  pdf_sha256: string | null;
  audit_entry_hash: string | null;
  verify_url: string;
}

export interface FeedResponse {
  schema: string; // "aos.attestation-feed.v1"
  generated_at: string;
  count: number;
  attestations: FeedAttestation[];
}

export interface FetchFeedOptions {
  /** Base URL of the AOS reference server (e.g. https://aigovops.example.com). */
  host: string;
  /** Filter by risk tier. */
  risk_tier?: RiskTier;
  /** ISO-8601 lower bound on issued_at. */
  since?: string;
  /** Override fetch (useful in tests / Node <18 polyfills). */
  fetchImpl?: typeof fetch;
}

export async function fetchFeed(opts: FetchFeedOptions): Promise<FeedResponse> {
  const f = opts.fetchImpl ?? fetch;
  const url = new URL("/functions/v1/attestation-feed", opts.host);
  if (opts.risk_tier) url.searchParams.set("risk_tier", opts.risk_tier);
  if (opts.since) url.searchParams.set("since", opts.since);
  const resp = await f(url.toString());
  if (!resp.ok) {
    throw new Error(`attestation-feed returned HTTP ${resp.status}`);
  }
  const json = (await resp.json()) as FeedResponse;
  if (!json || typeof json !== "object" || !Array.isArray(json.attestations)) {
    throw new Error("attestation-feed payload is not a v1 feed response");
  }
  return json;
}

/** Filter helpers an underwriter is likely to want. */
export function activeOnly(feed: FeedResponse): FeedAttestation[] {
  return feed.attestations.filter((a) => a.status === "active");
}

export function expiringWithinDays(feed: FeedResponse, days: number): FeedAttestation[] {
  const cutoff = Date.now() + days * 86_400_000;
  return feed.attestations.filter(
    (a) => a.status === "active" && a.expires_at && new Date(a.expires_at).getTime() <= cutoff,
  );
}
