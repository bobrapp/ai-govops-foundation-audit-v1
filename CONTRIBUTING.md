# Contributing to the AiGovOps Review Framework

Thank you for your interest in contributing. This project is stewarded by the
**AiGovOps Foundation** and welcomes contributions from anyone willing to abide
by the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Developer Certificate of Origin (DCO)

We use the [Developer Certificate of Origin](https://developercertificate.org/)
instead of a CLA. Every commit must be signed off:

```bash
git commit -s -m "feat: add scenario pack for finance"
```

This appends a `Signed-off-by: Your Name <you@example.com>` line. By signing
off, you certify that you wrote the patch or otherwise have the right to
contribute it under the project's license (Apache-2.0).

## How to contribute

1. **Open an issue first** for any non-trivial change so we can discuss scope.
2. Fork the repo, create a branch named `feat/...`, `fix/...`, or `docs/...`.
3. Make focused commits with clear messages (Conventional Commits preferred).
4. Run the test suite locally and ensure the build passes.
5. Open a pull request using the PR template. Link the originating issue.

## Proposing changes to the AOS

The AiGovOps Operational Standard (`public/specs/aos-v1.0.yaml`) is the
normative artifact this project enforces. Changes follow an RFC process:

1. Open an issue using the **AOS Control Proposal** template
2. Discussion period: minimum 14 days
3. If accepted, open a PR that updates `public/specs/aos-vX.Y.yaml` with
   `version` bumped and the change documented in `CHANGELOG.md`
4. Two maintainer approvals required before merge

## Scope of contributions we welcome

- Bug fixes and security patches
- New scenario packs and AOS controls (via the RFC process above)
- Documentation, examples, and translations
- Test coverage improvements
- Accessibility and performance fixes

## Out of scope

- Removing or weakening RLS policies
- Changes to the audit-chain hashing algorithm (requires a versioned migration plan)
- Replacing the attestation PDF format (breaks downstream verifiers)

## Reporting security issues

Do **not** open a public issue. See [SECURITY.md](./SECURITY.md).
