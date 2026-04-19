# Project Governance

The AiGovOps Review Framework is stewarded by the **AiGovOps Foundation**,
a nonprofit organization that publishes the AiGovOps Operational Standard
(AOS) and operates the reference instance of this framework.

## Roles

### Foundation Board
Sets strategic direction, approves AOS major-version releases, and ratifies
changes to this governance document.

### Maintainers
- Triage issues and pull requests
- Review and merge contributions
- Cut releases
- Two maintainer approvals required to merge any change to:
  - `public/specs/aos-*.yaml`
  - `supabase/migrations/`
  - `supabase/functions/`
  - This `GOVERNANCE.md`

### Contributors
Anyone who has had a PR merged. Listed in `CHANGELOG.md` per release.

### Reviewers (QAGAs)
Chartered Qualified AiGovOps Assessors. Operate within QAGAC firms. Bound
by the independence rules enforced in `firm_dev_engagements`.

## Decision Making

We default to **lazy consensus**: a proposal is accepted if no maintainer
objects within the discussion window.

For larger changes (AOS additions, schema migrations, new edge functions):

1. Open an RFC issue
2. **14-day** discussion window minimum
3. At least **2 maintainer approvals** required
4. If unresolved, escalate to the Foundation Board

## AOS Stewardship

The AOS is the normative artifact this framework enforces. The current version
lives at `public/specs/aos-v0.1.yaml`. Changes are versioned semantically:

- **Patch** — clarifications that do not change conformance outcomes
- **Minor** — new controls, new scenario packs, additional framework mappings
- **Major** — removed controls, changed control IDs, breaking semantics

Every AOS PR must include:
- A diff of the YAML spec
- Justification linked to a regulatory or industry source
- A migration note in `CHANGELOG.md` if conformance outcomes can change

## Trademark policy

"AiGovOps", "AOS", "QAGA", and "QAGAC" are trademarks of the AiGovOps
Foundation. You may use these names to refer to the project in good faith
(documentation, blog posts, conference talks). You may not use them to imply
endorsement of a fork or a competing service.

## Amendments

This document may be amended by Foundation Board ratification of a PR with
two maintainer approvals.
