# AiGovOps Review Framework — PRD-FAQ

A working-backwards FAQ for stakeholders evaluating the AiGovOps Review Framework.

## What is the AiGovOps Review Framework?

A web application that runs your AI governance policy bundle through a multi-agent review pipeline, lets a chartered human reviewer (QAGA) issue or reject an Attestation of Conformance (AOC), and writes every step into a tamper-evident audit chain that anyone can verify.

## Who is it for?

Three audiences:
- **Submitters** — engineering or compliance teams who need an attestation
- **Reviewers (QAGAs)** — qualified assessors at chartered firms (QAGACs)
- **Verifiers** — regulators, customers, insurers who receive an AOC and want to confirm it is real

## Why now?

The EU AI Act, NIST AI RMF, and ISO/IEC 42001 all require evidence of operational AI governance. Today that evidence is collected in spreadsheets and PDFs that no one can independently verify. The AiGovOps Foundation publishes a single Operational Standard (AOS) and this Framework operationalizes it.

## What does a review look like?

1. Submit a policy bundle (paste, upload, or GitHub URL) and tag the risk scenarios it covers
2. The Linter, Risk & Ethics Assessor, Compliance Mapper, and Scenario Risk Analyst agents produce findings
3. A QAGA reviewer examines findings, accepts compensating controls where appropriate, and issues or rejects an AOC
4. The AOC PDF is stored, the audit chain is sealed, and a public `/verify/:reviewId` URL is generated

## How is this different from a SOC 2 audit?

SOC 2 attests to general security controls. An AiGovOps AOC attests specifically to AI governance controls under the AOS, with machine-readable evidence and a cryptographic chain back to the source. They are complementary.

## What is the AOS?

The **AiGovOps Operational Standard** — a versioned, machine-readable list of controls (currently 18 in v0.1) grouped into seven domains: pipeline, evidence, decisioning, safety, data, model, ops. Each control maps to one or more external frameworks (EU AI Act, NIST AI RMF, ISO 42001, SOC 2, HIPAA, GDPR).

## Who decides what goes into the AOS?

The AiGovOps Foundation, through a public RFC process. AOS changes are proposed as PRs against `spec/aos-vX.Y.yaml` and reviewed before each release.

## How do I trust the attestation?

Every audit log entry is HMAC-SHA256 signed and chains to the previous entry's hash. The `/verify` page walks the chain and confirms (a) signature validity, (b) hash continuity, (c) AOC PDF SHA-256 match, and (d) the issuing QAGA was active at issuance time.

## What if a finding is a false positive?

The QAGA can record a **compensating control** with a written rationale and evidence URL. The AOC determination becomes "pass with compensations" rather than "fail" or "pass". All compensating controls are public on the AOC.

## Can a firm assess its own client?

No. If a QAGAC firm has a development engagement with a client in the last 12 months (`firm_dev_engagements`), the system blocks that firm from being assigned to assess that client.

## What does it cost?

The framework code is open source under Apache-2.0. Hosting, AI inference, and assessor engagement fees are separate. The Foundation operates a reference instance.

## Is my submission private?

Yes. Source artifacts are visible only to the submitter, the assigned reviewer's firm, and admins. The AOC and the audit chain are public; the underlying source code is not.

## How do I become a QAGA?

Apply through a chartered QAGAC firm. Complete the AiGovOps Foundation training program and exam. The firm is responsible for indemnity coverage and ongoing QA.

## How is this related to the OpenCLAW Installer?

OpenCLAW is a sister AiGovOps Foundation project that handles guided installation of governance tooling on macOS / cloud hosts. The AiGovOps Review Framework handles the *attestation* side: was the policy bundle correctly written and is the deployment in conformance.

## What is on the roadmap?

- v1.1 — SBOM + SLSA attestations, canary file-integrity manifest
- v1.2 — Verifier CLI for one-line third-party verification
- v2.0 — Federated assessor firms, sector-specific AOS packs
