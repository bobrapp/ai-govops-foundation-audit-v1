# Changelog

## 0.1.0 — 2026-04-19

Initial release.

- `verifyChain(secret, entries)` — recompute HMAC-SHA256 audit chain
- `verifyPdf(url, sha256)` — confirm attestation PDF matches anchor
- `fetchFeed({ host, risk_tier?, since? })` — ingest public attestation feed
- `verifyReview({ host, reviewId })` — one-call review verification
- `aigovops-verify` CLI with `review`, `feed`, `pdf` subcommands
- Pinned wire format via `canonicalize()` + reference fixture test
