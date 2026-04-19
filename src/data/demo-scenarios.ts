// Scripted, deterministic demo timelines for the animated /demo/:scenario page.
// Each beat is rendered with large text and a single action, then advances.
// Personas are referenced by slug — portraits resolve via portraitFor().

export type DemoBeatKind =
  | "intro"     // big-text scene setter
  | "code"      // shows a code/policy snippet
  | "agent"     // one persona speaks
  | "handoff"   // arrow + reason
  | "finding"   // result card
  | "stamp";    // final pass/fail stamp

export interface DemoBeat {
  kind: DemoBeatKind;
  /** ms to dwell before auto-advancing */
  dwell: number;
  /** persona slug for agent/handoff beats */
  personaSlug?: string;
  /** for handoff: who it goes to */
  handoffSlug?: string;
  title?: string;
  body?: string;
  code?: string;
  severity?: "info" | "low" | "medium" | "high" | "critical";
  controlId?: string;
}

export interface DemoScenario {
  id:
    | "enterprise_oss"
    | "healthcare_codegen"
    | "generative_ip"
    | "hr_behavior"
    | "general";
  label: string;
  tagline: string;
  /** color accent token — semantic only */
  accent: "primary" | "warning" | "destructive";
  beats: DemoBeat[];
}

export const DEMOS: DemoScenario[] = [
  // ---------- 1. ENTERPRISE OSS ----------
  {
    id: "enterprise_oss",
    label: "Enterprise OSS",
    tagline: "An engineer pushes a PR adding an open-source AI tool.",
    accent: "primary",
    beats: [
      { kind: "intro", dwell: 2200, title: "An engineer ships a PR.", body: "OpenCLAW added to a regulated codebase." },
      {
        kind: "code", dwell: 3000, title: "policy.rego",
        code: `package aigovops.openclaw

default allow = true   # ⚠ unsafe default

API_KEY = "sk-live-9J2xQp4z…"  # ⚠ hardcoded secret

# GPL-3.0 dependency pulled into proprietary bundle
import data.openclaw.gpl3.utils`,
      },
      { kind: "agent", dwell: 2600, personaSlug: "turing",
        title: "Hardcoded secret detected.",
        body: "Line 5: live API key in source. Hash chain rejects this artifact until the secret is revoked.",
        severity: "critical", controlId: "AOS-L1-14" },
      { kind: "handoff", dwell: 1400, personaSlug: "turing", handoffSlug: "lovelace",
        title: "Handing to Ada Lovelace", body: "License + SBOM check needed." },
      { kind: "agent", dwell: 2800, personaSlug: "lovelace",
        title: "GPL-3.0 contamination.",
        body: "openclaw.gpl3.utils is GPL-3.0. Linking into a proprietary bundle violates the license.",
        severity: "high", controlId: "AOS-L1-17" },
      { kind: "handoff", dwell: 1400, personaSlug: "lovelace", handoffSlug: "hopper",
        title: "Handing to Grace Hopper", body: "Need a fix that won't break the pipeline." },
      { kind: "agent", dwell: 2800, personaSlug: "hopper",
        title: "Proposed fix.",
        body: "Move secret to env var, swap GPL utils for Apache-2.0 alternative, add CI gate that fails on `default allow = true`.",
        severity: "medium", controlId: "AOS-L1-04" },
      { kind: "handoff", dwell: 1400, personaSlug: "hopper", handoffSlug: "pacioli",
        title: "Handing to Luca Pacioli", body: "Map to controls + frameworks." },
      { kind: "agent", dwell: 2600, personaSlug: "pacioli",
        title: "Mapped to AOS controls.",
        body: "AOS-L1-04 (CI gate), AOS-L1-14 (secrets), AOS-L1-17 (SBOM/provenance). Frameworks: NIST SSDF, ISO 42001 §6.1.2.",
        severity: "info" },
      { kind: "stamp", dwell: 3000, personaSlug: "ken-newton",
        title: "Pass with compensations.",
        body: "Ken signs the AOC. Audit-chain hash sealed.",
        severity: "low" },
    ],
  },

  // ---------- 2. HEALTHCARE CODEGEN ----------
  {
    id: "healthcare_codegen",
    label: "Healthcare codegen",
    tagline: "AI helper writes code that touches patient data.",
    accent: "destructive",
    beats: [
      { kind: "intro", dwell: 2200, title: "AI writes a logging helper.", body: "It logs the full request body — including PHI." },
      {
        kind: "code", dwell: 3000, title: "logger.py",
        code: `def log_request(req):
    # ⚠ entire body, including patient_name, ssn, dob
    logger.info("REQ %s", req.body)`,
      },
      { kind: "agent", dwell: 2800, personaSlug: "nightingale",
        title: "PHI in plaintext logs.",
        body: "Patient name, SSN, DOB written unredacted. Risk of HIPAA Breach Notification Rule trigger.",
        severity: "critical", controlId: "AOS-L1-14" },
      { kind: "handoff", dwell: 1400, personaSlug: "nightingale", handoffSlug: "pacioli",
        title: "Handing to Luca Pacioli", body: "Map to HIPAA controls." },
      { kind: "agent", dwell: 2600, personaSlug: "pacioli",
        title: "HIPAA §164.312(b) audit controls.",
        body: "Required: redact PHI from logs, retain access reports for 6 years. Also AOS-L1-08 (decision logs) + AOS-L1-14 (data classification).",
        severity: "high", controlId: "AOS-L1-08" },
      { kind: "handoff", dwell: 1400, personaSlug: "pacioli", handoffSlug: "hamilton",
        title: "Handing to Margaret Hamilton", body: "Safe pattern + rollback." },
      { kind: "agent", dwell: 2800, personaSlug: "hamilton",
        title: "Safe logging pattern.",
        body: "Wrap `req.body` in `redact_phi()` before any sink. Add canary alert when raw fields appear in log stream. Rollback plan: hot-disable verbose logging via flag.",
        severity: "medium" },
      { kind: "handoff", dwell: 1400, personaSlug: "hamilton", handoffSlug: "ken-newton",
        title: "Escalating to Ken", body: "Critical PHI exposure → HITL required." },
      { kind: "stamp", dwell: 3000, personaSlug: "ken-newton",
        title: "Escalated to Human-in-the-Loop.",
        body: "Cannot auto-approve PHI exposure. Privacy officer review required.",
        severity: "critical" },
    ],
  },

  // ---------- 3. GENERATIVE IP ----------
  {
    id: "generative_ip",
    label: "Generative IP",
    tagline: "A model trained partly on copyrighted material ships an asset.",
    accent: "warning",
    beats: [
      { kind: "intro", dwell: 2200, title: "Marketing wants to ship an AI image.", body: "Provenance is unclear." },
      {
        kind: "code", dwell: 3000, title: "manifest.yaml",
        code: `model: image-gen-v2
training:
  sources:
    - public_domain.tar
    - paywalled_news_archive.tar   # ⚠ no license
provenance:
  c2pa: false
  human_author: null`,
      },
      { kind: "agent", dwell: 2800, personaSlug: "arendt",
        title: "Accountability gap.",
        body: "No human author named, no license for the news archive. Diffusion of responsibility — escalate.",
        severity: "high", controlId: "AOS-L1-15" },
      { kind: "handoff", dwell: 1400, personaSlug: "arendt", handoffSlug: "lovelace",
        title: "Handing to Ada Lovelace", body: "Trace training-data lineage." },
      { kind: "agent", dwell: 2800, personaSlug: "lovelace",
        title: "Training-data lineage broken.",
        body: "paywalled_news_archive.tar lacks a license file and is unrelated to model card. AOS-L1-13 fails.",
        severity: "critical", controlId: "AOS-L1-13" },
      { kind: "handoff", dwell: 1400, personaSlug: "lovelace", handoffSlug: "pacioli",
        title: "Handing to Luca Pacioli", body: "Map to EU AI Act + copyright." },
      { kind: "agent", dwell: 2600, personaSlug: "pacioli",
        title: "EU AI Act Art. 53 transparency.",
        body: "Provider must publish a sufficiently detailed summary of training content. Current manifest fails AOS-L1-13 + AOS-L1-15.",
        severity: "high", controlId: "AOS-L1-15" },
      { kind: "handoff", dwell: 1400, personaSlug: "pacioli", handoffSlug: "ken-newton",
        title: "Escalating to Ken", body: "Pause release pending license cure." },
      { kind: "stamp", dwell: 3000, personaSlug: "ken-newton",
        title: "Release paused.",
        body: "AOC withheld until training-data license + C2PA provenance are in place.",
        severity: "critical" },
    ],
  },

  // ---------- 4. HR BEHAVIOR ----------
  {
    id: "hr_behavior",
    label: "HR & insurable risk",
    tagline: "Resume-screening model auto-rejects a protected class.",
    accent: "warning",
    beats: [
      { kind: "intro", dwell: 2200, title: "Recruiting deploys a screen.", body: "200 older applicants are auto-rejected before any human sees them." },
      {
        kind: "code", dwell: 3000, title: "screen.yaml",
        code: `rules:
  - if: applicant.age > 55
    action: auto_reject     # ⚠ disparate impact
log:
  decisions: false          # ⚠ no audit trail`,
      },
      { kind: "agent", dwell: 2800, personaSlug: "kerckhoffs",
        title: "Rule is observable to attackers.",
        body: "Hard age cut-off in plain rules. Anyone with read access can game it; protected-class signal exposed.",
        severity: "high" },
      { kind: "handoff", dwell: 1400, personaSlug: "kerckhoffs", handoffSlug: "nightingale",
        title: "Handing to Florence Nightingale", body: "Quantify disparate impact." },
      { kind: "agent", dwell: 2800, personaSlug: "nightingale",
        title: "Disparate-impact red flag.",
        body: "Selection ratio for ≥55 cohort = 0.0 vs 0.61 baseline — well below the 4/5ths rule. EEOC exposure analogous to iTutorGroup ($365K settlement).",
        severity: "critical", controlId: "AOS-L1-11" },
      { kind: "handoff", dwell: 1400, personaSlug: "nightingale", handoffSlug: "arendt",
        title: "Handing to Hannah Arendt", body: "Accountability + dual-use." },
      { kind: "agent", dwell: 2800, personaSlug: "arendt",
        title: "Name the responsible party.",
        body: "Current config has no logged owner and no decision logs. Cannot diffuse responsibility into 'the algorithm did it.'",
        severity: "high", controlId: "AOS-L1-09" },
      { kind: "handoff", dwell: 1400, personaSlug: "arendt", handoffSlug: "ken-newton",
        title: "Escalating to Ken", body: "Reject — no AOC possible." },
      { kind: "stamp", dwell: 3000, personaSlug: "ken-newton",
        title: "Rejected.",
        body: "Disparate impact + no audit trail = policy fails AOS-L1-09, -11, -12. Engagement closed.",
        severity: "critical" },
    ],
  },

  // ---------- 5. GENERAL ----------
  {
    id: "general",
    label: "General governance",
    tagline: "A baseline policy bundle, no scenario specialization.",
    accent: "primary",
    beats: [
      { kind: "intro", dwell: 2200, title: "A new governance bundle arrives.", body: "Generic policy-as-code, no scenario tag." },
      {
        kind: "code", dwell: 3000, title: "governance.yaml",
        code: `governance:
  owner: null               # ⚠ unowned
  review_cadence: never     # ⚠
  human_override: false     # ⚠`,
      },
      { kind: "agent", dwell: 2600, personaSlug: "pacioli",
        title: "Three control gaps.",
        body: "AOS-L1-09 (override), AOS-L1-10 (separation of duties), AOS-L1-04 (CI gate) all unsatisfied.",
        severity: "high", controlId: "AOS-L1-04" },
      { kind: "handoff", dwell: 1400, personaSlug: "pacioli", handoffSlug: "hopper",
        title: "Handing to Grace Hopper", body: "Operationalize the missing controls." },
      { kind: "agent", dwell: 2600, personaSlug: "hopper",
        title: "Add CI gate + override.",
        body: "Block deploys when `human_override=false`. Add reviewer role distinct from author. Quarterly cadence enforced by scheduler.",
        severity: "medium" },
      { kind: "handoff", dwell: 1400, personaSlug: "hopper", handoffSlug: "ken-newton",
        title: "Handing to Ken", body: "Determination requested." },
      { kind: "stamp", dwell: 3000, personaSlug: "ken-newton",
        title: "Pass with compensations.",
        body: "AOC issued contingent on adopting the proposed compensating controls.",
        severity: "low" },
    ],
  },
];

export const demoBySlug = (id: string) => DEMOS.find((d) => d.id === id);
