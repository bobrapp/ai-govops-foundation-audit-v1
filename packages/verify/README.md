# @aigovops/verify

> Reference verifier for the **AiGovOps Open Standard (AOS)**.
> Independently verify attestations without trusting the issuing server.

[![npm](https://img.shields.io/npm/v/@aigovops/verify.svg)](https://www.npmjs.com/package/@aigovops/verify)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)

This package is the **reference implementation of the AOS verification protocol**. The hosted platform at aigovops.com is one implementation of AOS — this library lets anyone build another, audit an existing one, or ingest attestations into their own pipelines (insurance, procurement, regulator dashboards).

It is intentionally:

- **Dependency-free** — only WebCrypto + `fetch`.
- **Runtime-agnostic** — Node 18+, Deno, Bun, Cloudflare Workers, browsers.
- **Tiny** — under 500 LOC of source.

## Install

```bash
npm install @aigovops/verify
```

## What it verifies

Every AOS attestation is anchored by three independently-checkable claims:

| Claim | How `@aigovops/verify` checks it |
|-------|----------------------------------|
| **The audit log was not tampered with** | Recompute `HMAC-SHA256(secret, prev_hash \|\| canonical_payload)` for every entry and confirm the chain links back to the genesis hash `0×64`. |
| **The attestation PDF matches the anchor** | Fetch the PDF, compute SHA-256, compare to the value embedded in the certification record + signed audit chain. |
| **The certification anchors into the live chain** | Confirm the cert's `audit_entry_hash` exists in the current audit log. |

These three checks together are the AOS analogue of [SLSA provenance](https://slsa.dev) + [Sigstore transparency logs](https://www.sigstore.dev) for AI governance.

## Quick start

### Verify a single review

```ts
import { verifyReview } from "@aigovops/verify";

const result = await verifyReview({
  host: "https://aigovops.example.com",
  reviewId: "9f1b...-uuid",
  // Optional. Only the issuing org has the signing key.
  // Without it, you trust the server's `valid` field but still independently
  // check PDF SHA-256 and anchor presence.
  signingKey: process.env.AOS_SIGNING_KEY,
});

console.log(result.ok); // true if everything checks out
console.log(result.pdfs); // per-PDF SHA-256 results
console.log(result.anchors); // per-cert anchor presence
console.log(result.chain); // full chain re-verification (if signingKey provided)
```

### Ingest the public attestation feed (insurer use case)

```ts
import { fetchFeed, activeOnly, expiringWithinDays } from "@aigovops/verify";

const feed = await fetchFeed({
  host: "https://aigovops.example.com",
  risk_tier: "high",
  since: "2026-01-01",
});

const active = activeOnly(feed);
const renewSoon = expiringWithinDays(feed, 30);

for (const a of active) {
  if (a.risk_tier_disagreement) {
    console.warn(
      `[${a.organization}] self-classified ${a.risk_tier_declared} but AOS evidence supports ${a.risk_tier_derived}`,
    );
  }
}
```

The feed schema is stable at `aos.attestation-feed.v1`. Breaking changes will bump the schema version.

### Verify a PDF directly

```ts
import { verifyPdf } from "@aigovops/verify";

const r = await verifyPdf(
  "https://aigovops.example.com/storage/v1/object/public/attestations/abc.pdf",
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
);
console.log(r.ok);
```

### Lower-level building blocks

```ts
import { canonicalize, signPayload, verifyChain, sha256Hex } from "@aigovops/verify";
```

## CLI

```bash
npx aigovops-verify review --host https://aigovops.example.com --review-id <uuid>
npx aigovops-verify feed   --host https://aigovops.example.com --risk-tier high
npx aigovops-verify pdf    --url https://.../attestation.pdf --sha256 <hex>
```

Exit codes: `0` ok, `1` verification failed, `2` usage/network error.

## Use it in CI

A common pattern: fail your build pipeline if the AOS attestation for your release is missing, expired, or revoked. See [`.github/workflows/verify.example.yml`](./.github/workflows/verify.example.yml).

## Wire format guarantees

The audit-chain canonicalization rules in [`src/canonical.ts`](./src/canonical.ts) are part of the AOS spec. The reference server in `supabase/functions/_shared/audit.ts` MUST produce byte-identical canonical strings — this package's tests include a fixture that pins the format.

If you find a divergence, that is a **spec-level bug** in either implementation. Open an issue.

## Related

- [AOS specification](../../public/specs/aos-v1.0.yaml)
- [SLSA](https://slsa.dev) — supply-chain attestations precedent
- [Sigstore](https://www.sigstore.dev) — transparency log precedent
- [EU AI Act risk tiering](https://artificialintelligenceact.eu) — risk classification

## License

Apache-2.0
