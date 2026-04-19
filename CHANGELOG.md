# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Public **PRD & Docs** hub on the landing page (`/docs`, `/docs/prd`,
  `/docs/prd-faq`, `/docs/aos-spec`)
- Versioned, machine-readable AOS spec at `public/specs/aos-v1.0.yaml`
- Apache-2.0 `LICENSE`, `NOTICE`, `CONTRIBUTING.md` (with DCO),
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, `GOVERNANCE.md`
- GitHub `.github/` templates: bug, feature, **AOS control proposal**,
  security, PR template, `CODEOWNERS`, `FUNDING.yml`, `dependabot.yml`
- "Read the PRD" secondary CTA and Foundation badge row on the landing page

### Security
- Tightened `qaga_assessors` self-update RLS policy to forbid changes to
  credentialing fields
- Switched authenticated registry reads to the `qagac_firms_public` view
  to hide contact and indemnity columns
- Scoped `audit_log` insert policy to require ownership of the related review
- Removed broad SELECT policy on the `attestations` storage bucket
- Edge function ownership/role checks added to `run-agent-pipeline` and
  `sign-decision`

## [0.1.0] - 2026-04-19

Initial public draft of the AiGovOps Review Framework.
