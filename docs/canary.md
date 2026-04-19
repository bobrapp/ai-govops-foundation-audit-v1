# Canary Manifest

`.canary-manifest.json` is a tamper-evident SHA-256 manifest of the files that
materially define how the AiGovOps Review Framework behaves at runtime:

- `supabase/functions/**` — edge functions (audit chain, attestation issuance,
  agent pipeline, verifier).
- `supabase/migrations/**` — database schema and RLS policies.
- `public/specs/**` — machine-readable AOS spec.

If any of these files change without a matching update to the manifest, the
weekly **Canary Verify** GitHub Action (`.github/workflows/canary-verify.yml`)
opens a `security` issue and fails any PR that touches a covered path.

## Why

Reviewers, regulators, and customers can compare the manifest in any historical
commit against the live repository state and prove that the rules they audited
are the rules that ran. This is the same pattern openclaw-installer uses for
binary distribution; we use it for the governance surface.

## Local commands

```bash
# Verify (exit 0 on match, 1 on drift)
node scripts/verify-canary.mjs

# Machine-readable
node scripts/verify-canary.mjs --json

# Regenerate after an intentional change, then commit
node scripts/verify-canary.mjs --update
git add .canary-manifest.json
git commit -m "chore(canary): refresh manifest"
```

## What the workflow does

| Trigger | Behaviour |
| --- | --- |
| Weekly cron (Mon 13:00 UTC) | Verify; on drift, open or update a `[canary]` security issue. |
| `workflow_dispatch` | Same as cron — for ad-hoc checks. |
| Pull request touching covered paths | Verify; fail the PR check on drift so the manifest must be refreshed in the same PR. |

The workflow uploads `canary-report.json` as a build artifact on every run for
auditors who want the raw data.
