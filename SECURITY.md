# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in the AiGovOps Review Framework,
please report it privately. **Do not open a public GitHub issue.**

**Email:** `security@aigovopsfoundation.org`
**PGP key:** Available on request from the same address.

We aim to:

- Acknowledge your report within **72 hours**
- Provide an initial assessment within **7 days**
- Resolve confirmed high-severity issues within **90 days**

We will coordinate a public disclosure with you after a fix is shipped.

## Scope

In scope:

- The web application (`src/`)
- Edge functions (`supabase/functions/`)
- Database schema, RLS policies, and migrations (`supabase/migrations/`)
- The audit chain (HMAC-SHA256 linkage in `audit_log`)
- The attestation PDF integrity manifest
- The AOS spec artifact (`public/specs/aos-v*.yaml`)

Out of scope:

- Third-party dependencies (please report to the upstream project)
- Lovable Cloud / Supabase platform issues (report to the platform vendor)
- Self-hosted deployments with non-default configurations

## Sensitive areas

Particular care is taken in these areas; reports here will be triaged first:

- **Audit chain integrity** — any way to break, fork, or replay the chain
- **Privilege escalation** in `qaga_assessors` or `user_roles`
- **Independence enforcement** in `assessor_engagements` and `firm_dev_engagements`
- **Attestation forgery** — issuing a valid AOC without an active engagement
- **PII exposure** through `qagac_firms` or `profiles`

## Hall of Fame

We publicly credit researchers who responsibly disclose. Let us know whether
you'd like to be credited in `CHANGELOG.md` and on our website.
