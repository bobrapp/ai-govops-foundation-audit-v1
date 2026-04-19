# AiGovOps Review Framework — Product Requirements Document

**Version:** 0.1 · **Status:** Draft · **Steward:** AiGovOps Foundation

## 1. Problem

Organizations deploying AI systems face an evidence gap between their internal AI governance policies and the external attestations required by regulators, customers, and insurers. Existing GRC tools collect documents; they do not run the policy bundle through a reproducible, signed, multi-agent review and produce a verifiable Attestation of Conformance.

## 2. Vision

Make every consequential AI deployment governed by **versioned policy-as-code**, reviewed by a **crew of specialist agents**, decided by an **accountable human reviewer**, and stamped with a **cryptographically chained attestation** that any third party can verify in one click.

## 3. Target users

- **Submitters** — engineering teams shipping AI-touching code or policy bundles
- **QAGA Reviewers** — qualified AiGovOps Assessors who issue attestations
- **QAGAC Firms** — chartered firms that employ QAGAs and carry indemnity
- **Regulators / Customers / Insurers** — third parties who verify attestations

## 4. Core capabilities (v1.0)

1. **Submit** a policy bundle (paste, upload, GitHub URL) tagged with risk scenarios
2. **Run agent pipeline** — Linter, Risk & Ethics Assessor, Compliance Mapper, Scenario Risk Analyst, Human gate
3. **AOS conformance scoring** against the active AiGovOps Operational Standard
4. **Compensating controls** workflow for findings the QAGA accepts as mitigated
5. **Issue attestation** — signed PDF AOC referencing the AOS version and review hash
6. **Verify chain** — public `/verify/:reviewId` page that walks the HMAC-SHA256 audit chain
7. **Registry** of chartered QAGAC firms and their public-listed QAGAs
8. **Independence enforcement** — firms that did development work for a client cannot assess that client within 12 months

## 5. Architecture (current)

- **Frontend:** React 18 + Vite + Tailwind + shadcn/ui
- **Backend:** Lovable Cloud (Supabase) — Postgres with RLS, Storage, Edge Functions (Deno)
- **AI:** Lovable AI Gateway (Gemini / GPT-5 family)
- **Audit chain:** HMAC-SHA256 with `prev_hash` linkage in `audit_log`
- **Attestations:** PDF generated and stored in `attestations` bucket with SHA-256 manifest

## 6. Key entities

`reviews`, `agent_findings`, `compensating_controls`, `attestations`, `audit_log`, `aos_versions`, `aos_controls`, `scenario_packs`, `qagac_firms`, `qaga_assessors`, `assessor_engagements`, `firm_dev_engagements`, `user_roles`, `profiles`.

## 7. Non-goals (v1.0)

- Not a runtime policy enforcer (does not block deployments)
- Not a SIEM or log aggregator
- Not a substitute for legal counsel or a notified body

## 8. Success metrics

- Time-from-submission to AOC issuance < 30 minutes for a passing review
- 100% of attestations independently verifiable via the `/verify` page
- Zero broken-chain incidents in `audit_log`
- AOS version diffs reviewed publicly in PRs before each release

## 9. Roadmap

- **v1.0** Cartographic Trust visual system, AOS v1.0, public registry, signed AOCs
- **v1.1** SBOM + SLSA attestations on dependencies, canary file-integrity manifest
- **v1.2** Verifier CLI (`npx @aigovops/verify-attestation <id>`), webhook notifications
- **v2.0** Federated assessor firms, AOS v2 with sector packs (healthcare, finance, defense)

## 10. Risks

- **AOS drift** — controls evolve faster than mappings to external frameworks. Mitigation: every change is a PR against `spec/aos-vX.Y.yaml` with reviewer sign-off.
- **Reviewer capacity** — chartered QAGA pool must scale with submission volume. Mitigation: training program + firm chartering pipeline.
- **Independence conflicts** — firms doing both development and assessment for the same client. Mitigation: enforced 12-month cooling-off via `firm_dev_engagements`.
