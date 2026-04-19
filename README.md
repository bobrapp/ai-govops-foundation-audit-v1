# AiGovOps Review Framework

> **Policy-as-code, reviewed by agents, attested by humans, sealed by a chain.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![AOS](https://img.shields.io/badge/AOS-v0.1-vermillion)](./public/specs/aos-v1.0.yaml)
[![Stewarded by](https://img.shields.io/badge/Stewarded%20by-AiGovOps%20Foundation-navy)](https://www.aigovopsfoundation.org/)
[![Code of Conduct](https://img.shields.io/badge/Code%20of%20Conduct-Contributor%20Covenant%202.1-purple.svg)](./CODE_OF_CONDUCT.md)

The AiGovOps Review Framework runs your AI governance policy bundle through a
crew of specialist agents (linter, risk-scorer, framework-mapper, scenario
analyst), lets a chartered human reviewer issue an Attestation of Conformance
(AOC), and writes every step into an HMAC-SHA256 audit chain that anyone can
verify in one click.

## Documentation

All project artifacts are published in-app at `/docs`:

| Document | Path |
|---|---|
| Product Requirements Document | [`public/docs/AiGovOps_PRD.md`](./public/docs/AiGovOps_PRD.md) |
| PRD-FAQ (working backwards) | [`public/docs/AiGovOps_PRD_FAQ.md`](./public/docs/AiGovOps_PRD_FAQ.md) |
| Executive Summary (PDF) | [`public/docs/AiGovOps_Exec_Summary.pdf`](./public/docs/AiGovOps_Exec_Summary.pdf) |
| Pitch Deck (PPTX) | [`public/docs/AiGovOps_Pitch_Deck.pptx`](./public/docs/AiGovOps_Pitch_Deck.pptx) |
| **AOS v0.1 Spec (YAML)** | [`public/specs/aos-v1.0.yaml`](./public/specs/aos-v1.0.yaml) |
| Hero Poster (PNG) | [`public/docs/AiGovOps_Hero_Poster.png`](./public/docs/AiGovOps_Hero_Poster.png) |

## What is the AOS?

The **AiGovOps Operational Standard** is a versioned, machine-readable list of
controls (currently 18 in v0.1, across 7 domains: pipeline, evidence,
decisioning, safety, data, model, ops). Each control maps to one or more
external frameworks (EU AI Act, NIST AI RMF, ISO 42001, SOC 2, HIPAA, GDPR).

See [`public/specs/aos-v1.0.yaml`](./public/specs/aos-v1.0.yaml) — published
as a diffable artifact so changes can be reviewed in PRs.

## Stack

- **Frontend:** React 18 · Vite · Tailwind · shadcn/ui · TypeScript
- **Backend:** Lovable Cloud (Supabase) — Postgres + RLS + Storage + Edge Functions
- **AI:** Lovable AI Gateway (Gemini / GPT-5 family)
- **Audit chain:** HMAC-SHA256 with `prev_hash` linkage in `audit_log`

## Quick start (development)

This project is built and deployed via [Lovable](https://lovable.dev). For
local development against a self-hosted Supabase instance:

```bash
npm install
npm run dev
```

## Sister projects

- [openclaw-installer](https://github.com/bobrapp/openclaw-installer) — the
  AiGovOps Foundation's guided installer for governance tooling on macOS / cloud.

## Contributing

We welcome contributions. Read [CONTRIBUTING.md](./CONTRIBUTING.md) (DCO
sign-off required) and [GOVERNANCE.md](./GOVERNANCE.md) (AOS RFC process).

## Security

Report vulnerabilities privately to `security@aigovopsfoundation.org`. See
[SECURITY.md](./SECURITY.md).

## License

- **Code:** [Apache-2.0](./LICENSE)
- **AOS spec:** CC-BY-4.0 (credit "AiGovOps Foundation")
- **Trademarks:** "AiGovOps", "AOS", "QAGA", "QAGAC" — see [GOVERNANCE.md](./GOVERNANCE.md)
