/**
 * Comprehensive vocabulary for the AiGovOps Review Framework.
 *
 * Each term is tagged with a category and (when applicable) carries:
 *  - `verifyUrl`: the canonical, citable source (regulator page, ISO catalog,
 *    NIST publication, RFC, vendor docs). Use this to verify the definition.
 *  - `pointer`: an in-app or in-repo pointer to where the term is operationalized
 *    (a route, a file path under /public, or a section of the AOS spec).
 *
 * Categories:
 *  - framework  : terms unique to AiGovOps (AOS, AOC, QAGA, canary, etc.)
 *  - regulation : binding law (EU AI Act, GDPR, HIPAA, …)
 *  - standard   : published voluntary standard (ISO/IEC, NIST, SOC 2, …)
 *  - proposed   : drafts / pre-release standards (NIST GenAI profile, …)
 *  - process    : audit / review process concepts (attestation, RACI, SoD, …)
 *  - concept    : AI/ML governance technical concepts (model card, SBOM, …)
 */

export type VocabCategory =
  | "framework"
  | "regulation"
  | "standard"
  | "proposed"
  | "process"
  | "concept";

export interface VocabTerm {
  term: string;
  acronym?: string;
  category: VocabCategory;
  /** One- or two-sentence definition. Plain language. */
  definition: string;
  /** Canonical URL where the definition can be verified. */
  verifyUrl?: string;
  /** Friendly label for the verifyUrl host (e.g. "EUR-Lex", "NIST"). */
  verifyLabel?: string;
  /** In-app route or in-repo file path that operationalizes the term. */
  pointer?: { label: string; href: string };
  /** Search-only synonyms. */
  aliases?: string[];
}

export const CATEGORY_META: Record<
  VocabCategory,
  { label: string; description: string; tone: string }
> = {
  framework: {
    label: "Framework",
    description: "Terms unique to the AiGovOps Review Framework.",
    tone: "border-primary/40 bg-primary/10 text-primary",
  },
  regulation: {
    label: "Regulation",
    description: "Binding law that governs AI systems and personal data.",
    tone: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  },
  standard: {
    label: "Standard",
    description: "Published voluntary standards used as conformance evidence.",
    tone: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  },
  proposed: {
    label: "Proposed standard",
    description: "Draft or pre-release standards relevant to AI governance.",
    tone: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
  process: {
    label: "Audit process",
    description: "Audit, attestation, and review-process concepts.",
    tone: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  },
  concept: {
    label: "Concept",
    description: "AI/ML governance technical concepts and artifacts.",
    tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  },
};

export const VOCABULARY: VocabTerm[] = [
  // ─────────────────────────── FRAMEWORK ───────────────────────────
  {
    term: "AiGovOps Operational Standard",
    acronym: "AOS",
    category: "framework",
    definition:
      "Versioned, machine-readable list of controls (currently 18 in v0.1) grouped into seven domains — pipeline, evidence, decisioning, safety, data, model, ops — each mapped to one or more external frameworks.",
    pointer: { label: "AOS v0.1 spec", href: "/docs/aos-spec" },
  },
  {
    term: "Attestation of Conformance",
    acronym: "AOC",
    category: "framework",
    definition:
      "Signed PDF artifact issued by a chartered QAGA after a successful review. States the AOS version, scope, determination, scenarios, and chain hash.",
    pointer: { label: "Verify any AOC", href: "/registry" },
  },
  {
    term: "Qualified AiGovOps Assessor",
    acronym: "QAGA",
    category: "framework",
    definition:
      "An individual reviewer chartered to issue Attestations of Conformance. Trained, examined, and indemnified through a QAGAC firm.",
    pointer: { label: "Public assessor registry", href: "/firms" },
  },
  {
    term: "Qualified AiGovOps Assessor Charter",
    acronym: "QAGAC",
    category: "framework",
    definition:
      "A chartered firm permitted to employ QAGAs and issue AOCs. Subject to indemnity, independence, and ongoing-QA requirements set by the AiGovOps Foundation.",
    pointer: { label: "Firm registry", href: "/firms" },
  },
  {
    term: "Canary manifest",
    category: "framework",
    definition:
      "Tamper-evident SHA-256 hash list for every governance-critical file in this repository. Verified weekly by GitHub Actions; drift opens a security issue.",
    pointer: { label: "Live manifest", href: "/docs/canary" },
  },
  {
    term: "Compensating control",
    category: "framework",
    definition:
      "A QAGA-recorded mitigation that addresses a finding the agent pipeline raised. The AOC determination then becomes “pass with compensations” rather than fail.",
    pointer: { label: "Operations runbook", href: "/docs/operations" },
  },
  {
    term: "Audit chain",
    category: "framework",
    definition:
      "Hash-chained, HMAC-SHA256 signed log where every event references the previous entry’s hash. Independently walkable from the /verify page or the verify CLI.",
    pointer: { label: "Verify CLI", href: "https://www.npmjs.com/package/@aigovops/verify" },
  },
  {
    term: "Risk tier",
    category: "framework",
    definition:
      "Derived classification (medium / high / critical) for a submission, based on declared scenarios and AOS-driven heuristics. Drives reviewer assignment and AOC expiry.",
    pointer: { label: "Derivation logic", href: "/docs/operations" },
  },
  {
    term: "Scenario tag",
    category: "framework",
    definition:
      "Submitter-declared label that narrows the applicable AOS controls — e.g. enterprise_oss, healthcare_codegen, generative_ip, hr_behavior.",
    pointer: { label: "Risk scenarios", href: "/docs/risk-scenarios" },
  },
  {
    term: "Scenario pack",
    category: "framework",
    definition:
      "Curated list of objectives + control references the agent pipeline checks for a given scenario tag. Versioned and published.",
    pointer: { label: "Scenarios doc", href: "/docs/risk-scenarios" },
  },
  {
    term: "The Council",
    category: "framework",
    definition:
      "The named multi-agent panel — chiefs and specialists — that performs the automated portion of every review. Each agent has guardrails and a historical persona.",
    pointer: { label: "Meet the council", href: "/agents" },
  },

  // ─────────────────────────── REGULATION ──────────────────────────
  {
    term: "EU Artificial Intelligence Act",
    acronym: "EU AI Act",
    category: "regulation",
    definition:
      "Regulation (EU) 2024/1689. Risk-based regulation that prohibits certain AI practices, imposes obligations on high-risk systems, and adds transparency rules for general-purpose AI.",
    verifyUrl: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
    verifyLabel: "EUR-Lex",
    pointer: { label: "AOS framework_refs: EU_AI_ACT", href: "/docs/aos-spec" },
  },
  {
    term: "General Data Protection Regulation",
    acronym: "GDPR",
    category: "regulation",
    definition:
      "Regulation (EU) 2016/679. Governs processing of personal data of EU data subjects, including a right to meaningful information about automated decisions (Art. 22).",
    verifyUrl: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    verifyLabel: "EUR-Lex",
    pointer: { label: "AOS framework_refs: GDPR", href: "/docs/aos-spec" },
  },
  {
    term: "Health Insurance Portability and Accountability Act",
    acronym: "HIPAA",
    category: "regulation",
    definition:
      "U.S. statute and HHS rules governing protected health information (PHI). The Security Rule (45 CFR §164.300) drives controls for AI systems that process PHI.",
    verifyUrl: "https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html",
    verifyLabel: "HHS",
    pointer: { label: "AOS framework_refs: HIPAA", href: "/docs/aos-spec" },
  },
  {
    term: "Colorado AI Act",
    acronym: "CAIA / SB24-205",
    category: "regulation",
    definition:
      "Colorado Senate Bill 24-205. First U.S. state law regulating high-risk AI systems used to make consequential decisions; effective February 1, 2026.",
    verifyUrl: "https://leg.colorado.gov/bills/sb24-205",
    verifyLabel: "Colorado General Assembly",
  },
  {
    term: "California Consumer Privacy Act",
    acronym: "CCPA / CPRA",
    category: "regulation",
    definition:
      "California’s consumer-privacy statute (as amended by the CPRA) including draft regulations on automated decision-making technology.",
    verifyUrl: "https://oag.ca.gov/privacy/ccpa",
    verifyLabel: "California AG",
  },
  {
    term: "NYC Local Law 144",
    acronym: "LL 144",
    category: "regulation",
    definition:
      "New York City law requiring an annual independent bias audit of automated employment decision tools (AEDTs) and disclosure to candidates.",
    verifyUrl: "https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page",
    verifyLabel: "NYC DCWP",
    pointer: { label: "Maps to AOS hr_behavior pack", href: "/docs/risk-scenarios" },
  },
  {
    term: "Digital Services Act",
    acronym: "DSA",
    category: "regulation",
    definition:
      "Regulation (EU) 2022/2065. Imposes risk-assessment, transparency, and recommender-system disclosure duties on online platforms — relevant to generative content systems.",
    verifyUrl: "https://eur-lex.europa.eu/eli/reg/2022/2065/oj",
    verifyLabel: "EUR-Lex",
  },

  // ─────────────────────────── STANDARDS ───────────────────────────
  {
    term: "ISO/IEC 42001",
    category: "standard",
    definition:
      "International management-system standard for AI: requirements for establishing, implementing, maintaining and continually improving an AI management system (AIMS).",
    verifyUrl: "https://www.iso.org/standard/81230.html",
    verifyLabel: "ISO catalog",
    pointer: { label: "AOS framework_refs: ISO_42001", href: "/docs/aos-spec" },
  },
  {
    term: "ISO/IEC 23894",
    category: "standard",
    definition:
      "Guidance on AI risk management. Companion to ISO 31000 tailored to AI lifecycle risks.",
    verifyUrl: "https://www.iso.org/standard/77304.html",
    verifyLabel: "ISO catalog",
  },
  {
    term: "ISO/IEC 27001",
    category: "standard",
    definition:
      "Requirements for an information-security management system (ISMS). Underpins many AOS evidence-handling controls.",
    verifyUrl: "https://www.iso.org/standard/27001",
    verifyLabel: "ISO catalog",
  },
  {
    term: "NIST AI Risk Management Framework",
    acronym: "AI RMF 1.0",
    category: "standard",
    definition:
      "Voluntary U.S. framework (Govern, Map, Measure, Manage) for managing risks across the AI lifecycle.",
    verifyUrl: "https://www.nist.gov/itl/ai-risk-management-framework",
    verifyLabel: "NIST",
    pointer: { label: "AOS framework_refs: NIST_AI_RMF", href: "/docs/aos-spec" },
  },
  {
    term: "NIST SP 800-53",
    category: "standard",
    definition:
      "U.S. federal catalog of security and privacy controls for information systems. Frequently mapped from AOS evidence-domain controls.",
    verifyUrl: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    verifyLabel: "NIST CSRC",
  },
  {
    term: "SOC 2",
    category: "standard",
    definition:
      "AICPA reporting framework on Trust Services Criteria (security, availability, processing integrity, confidentiality, privacy). Complementary to an AiGovOps AOC.",
    verifyUrl: "https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2",
    verifyLabel: "AICPA",
  },
  {
    term: "OWASP Top 10 for LLM Applications",
    category: "standard",
    definition:
      "Community-maintained list of the most critical security risks for LLM-based applications (prompt injection, insecure output handling, training-data poisoning, …).",
    verifyUrl: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
    verifyLabel: "OWASP",
  },
  {
    term: "MITRE ATLAS",
    category: "standard",
    definition:
      "Adversarial Threat Landscape for AI Systems. ATT&CK-style knowledge base of tactics and techniques targeting AI/ML systems.",
    verifyUrl: "https://atlas.mitre.org/",
    verifyLabel: "MITRE",
  },

  // ──────────────────── PROPOSED / DRAFT STANDARDS ─────────────────
  {
    term: "NIST AI 600-1 — Generative AI Profile",
    category: "proposed",
    definition:
      "NIST AI RMF Generative AI Profile. Companion document to AI RMF 1.0 with risks and actions specific to generative AI systems.",
    verifyUrl: "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf",
    verifyLabel: "NIST publication",
  },
  {
    term: "ISO/IEC AWI 42005",
    category: "proposed",
    definition:
      "Draft international standard for AI system impact assessment. Under development by ISO/IEC JTC 1/SC 42.",
    verifyUrl: "https://www.iso.org/standard/44545.html",
    verifyLabel: "ISO catalog",
  },
  {
    term: "ISO/IEC FDIS 42006",
    category: "proposed",
    definition:
      "Draft requirements for bodies providing audit and certification of AI management systems — the eventual basis for QAGAC accreditation.",
    verifyUrl: "https://www.iso.org/standard/44546.html",
    verifyLabel: "ISO catalog",
  },
  {
    term: "EU AI Act — Code of Practice for GPAI",
    category: "proposed",
    definition:
      "Voluntary code of practice for providers of general-purpose AI models, drafted under the EU AI Office to bridge until harmonised standards land.",
    verifyUrl: "https://digital-strategy.ec.europa.eu/en/policies/ai-code-practice",
    verifyLabel: "EU Commission",
  },
  {
    term: "C2PA Content Credentials",
    category: "proposed",
    definition:
      "Coalition for Content Provenance and Authenticity. Open technical standard for cryptographically signed media provenance — increasingly cited for generative-content disclosure.",
    verifyUrl: "https://c2pa.org/specifications/",
    verifyLabel: "C2PA",
  },

  // ─────────────────────────── AUDIT PROCESS ───────────────────────
  {
    term: "Attestation",
    category: "process",
    definition:
      "A formal statement by an independent practitioner that, in their professional judgment, an assertion meets defined criteria. The AOC is an attestation in this sense.",
    verifyUrl: "https://www.aicpa-cima.com/resources/landing/standards-attest",
    verifyLabel: "AICPA SSAE",
  },
  {
    term: "Independence",
    category: "process",
    definition:
      "The reviewer’s freedom from relationships that would compromise objectivity. Enforced here by blocking firms with a recent dev engagement on the same client.",
    pointer: { label: "Operations runbook", href: "/docs/operations" },
  },
  {
    term: "Conflict of interest",
    category: "process",
    definition:
      "A circumstance that creates risk that professional judgment is unduly influenced. Recorded explicitly on each engagement and surfaced on the AOC.",
  },
  {
    term: "Scope statement",
    category: "process",
    definition:
      "Bounded description of what the AOC covers (system, version, environment, AOS controls, scenarios). Anything outside the scope is not attested.",
  },
  {
    term: "Determination",
    category: "process",
    definition:
      "The QAGA’s decision on a review: pass, pass-with-compensations, or fail. Recorded on the AOC and chain-sealed.",
  },
  {
    term: "Material finding",
    category: "process",
    definition:
      "A finding severe enough that, individually or combined, it would change the determination. The pipeline tags severity (info → critical) to support this judgment.",
  },
  {
    term: "Segregation of duties",
    acronym: "SoD",
    category: "process",
    definition:
      "Splitting authority so no single actor can both perform and approve a sensitive action — e.g. the submitter cannot also be the assigned reviewer.",
  },
  {
    term: "Human in the loop",
    acronym: "HITL",
    category: "process",
    definition:
      "Workflow checkpoint where a human reviewer is required before an agent decision becomes binding. Surfaced in the HITL queue.",
    pointer: { label: "HITL queue", href: "/agents/dashboard" },
  },
  {
    term: "Working-backwards FAQ",
    acronym: "PRD-FAQ",
    category: "process",
    definition:
      "Amazon-style document that begins with the imagined press release / FAQ and works backward to engineering requirements. Used here for stakeholder evaluation.",
    pointer: { label: "Read the PRD-FAQ", href: "/docs/prd-faq" },
  },
  {
    term: "RACI",
    category: "process",
    definition:
      "Responsibility-assignment matrix: Responsible, Accountable, Consulted, Informed. Used to map AOS controls to organizational roles during scoping.",
  },

  // ─────────────────────────── CONCEPTS ────────────────────────────
  {
    term: "Model card",
    category: "concept",
    definition:
      "Short structured document describing a model’s intended use, performance, limitations, and ethical considerations. Often required evidence under AOS model-domain controls.",
    verifyUrl: "https://arxiv.org/abs/1810.03993",
    verifyLabel: "Mitchell et al., 2019",
  },
  {
    term: "Data sheet for datasets",
    category: "concept",
    definition:
      "Structured documentation of a dataset’s motivation, composition, collection, labeling, recommended uses, and known limitations.",
    verifyUrl: "https://arxiv.org/abs/1803.09010",
    verifyLabel: "Gebru et al., 2018",
  },
  {
    term: "Software Bill of Materials",
    acronym: "SBOM",
    category: "concept",
    definition:
      "Machine-readable inventory of components in a piece of software. Supported formats include CycloneDX and SPDX. Required evidence for supply-chain AOS controls.",
    verifyUrl: "https://www.cisa.gov/sbom",
    verifyLabel: "CISA",
  },
  {
    term: "Supply-chain Levels for Software Artifacts",
    acronym: "SLSA",
    category: "concept",
    definition:
      "Tiered framework (v1.0) describing build-integrity guarantees: provenance, isolation, hermeticity. Used as evidence for the AOS pipeline domain.",
    verifyUrl: "https://slsa.dev/spec/v1.0/",
    verifyLabel: "slsa.dev",
  },
  {
    term: "Sigstore",
    category: "concept",
    definition:
      "Open infrastructure for keyless signing of software artifacts (cosign, Fulcio, Rekor). Common provenance signal for AOS pipeline evidence.",
    verifyUrl: "https://www.sigstore.dev/",
    verifyLabel: "sigstore.dev",
  },
  {
    term: "Red teaming",
    category: "concept",
    definition:
      "Structured adversarial testing of a model or system to surface failure modes (jailbreaks, harmful outputs, privacy leakage) before release.",
    verifyUrl: "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf",
    verifyLabel: "NIST AI 600-1 §3",
  },
  {
    term: "Hallucination",
    category: "concept",
    definition:
      "Confident generation of content that is not grounded in input or training data. Treated as a safety-domain hazard and tested via the scenario packs.",
    verifyUrl: "https://dl.acm.org/doi/10.1145/3571730",
    verifyLabel: "Ji et al., 2023",
  },
  {
    term: "Prompt injection",
    category: "concept",
    definition:
      "Attack where untrusted input causes an LLM to ignore prior instructions or exfiltrate data. OWASP LLM01.",
    verifyUrl: "https://genai.owasp.org/llmrisk/llm01-prompt-injection/",
    verifyLabel: "OWASP",
  },
  {
    term: "Retrieval-Augmented Generation",
    acronym: "RAG",
    category: "concept",
    definition:
      "Architecture that grounds an LLM by retrieving documents at inference time. AOS data-domain controls require provenance and freshness for the retrieval index.",
    verifyUrl: "https://arxiv.org/abs/2005.11401",
    verifyLabel: "Lewis et al., 2020",
  },
  {
    term: "Differential privacy",
    category: "concept",
    definition:
      "Mathematical guarantee that the output of an analysis reveals little about any individual record. Cited in AOS data-domain controls for sensitive datasets.",
    verifyUrl: "https://www.nist.gov/itl/applied-cybersecurity/privacy-engineering/collaboration-space/focus-areas/de-id/dp",
    verifyLabel: "NIST",
  },
  {
    term: "Disparate impact",
    category: "concept",
    definition:
      "Outcome disparity across protected groups, even from facially neutral processes. Measured under AOS decisioning controls (e.g. four-fifths rule).",
    verifyUrl: "https://www.eeoc.gov/laws/guidance/section-15-race-and-color-discrimination",
    verifyLabel: "EEOC",
  },
  {
    term: "Explainability",
    category: "concept",
    definition:
      "Ability to provide human-meaningful reasons for a model’s output. Required for high-risk decisioning under EU AI Act Art. 13–14.",
    verifyUrl: "https://nvlpubs.nist.gov/nistpubs/ir/2021/NIST.IR.8312.pdf",
    verifyLabel: "NIST IR 8312",
  },
  {
    term: "Drift",
    category: "concept",
    definition:
      "Change over time in the input distribution (data drift) or relationship between inputs and outputs (concept drift). Monitored under AOS ops-domain controls.",
  },
  {
    term: "Eval harness",
    category: "concept",
    definition:
      "Reusable suite of automated tests that score a model against fixed prompts. Eval results are evidence for AOS model-domain controls.",
    verifyUrl: "https://github.com/EleutherAI/lm-evaluation-harness",
    verifyLabel: "lm-evaluation-harness",
  },
  {
    term: "Guardrail",
    category: "concept",
    definition:
      "Inference-time filter, classifier, or policy that constrains an agent’s behavior. Each Council persona declares its own guardrails.",
    pointer: { label: "Council guardrails", href: "/agents" },
  },
  {
    term: "General-purpose AI model",
    acronym: "GPAI",
    category: "concept",
    definition:
      "Per the EU AI Act, an AI model with significant generality that can be integrated into a wide range of downstream systems. Triggers specific transparency duties.",
    verifyUrl: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
    verifyLabel: "EU AI Act Art. 51",
  },
  {
    term: "Foundation model",
    category: "concept",
    definition:
      "Large model trained on broad data, adaptable to many downstream tasks. Overlaps with — but is not identical to — the EU AI Act’s GPAI definition.",
    verifyUrl: "https://arxiv.org/abs/2108.07258",
    verifyLabel: "Bommasani et al., 2021",
  },
  {
    term: "Agentic system",
    category: "concept",
    definition:
      "AI system that plans and takes multi-step actions (tool calls, side effects) toward a goal with limited per-step human oversight. Drives the HITL design.",
  },
  {
    term: "HMAC-SHA256",
    category: "concept",
    definition:
      "Keyed-hash message authentication code based on SHA-256. The signature primitive used to seal each entry in the AiGovOps audit chain.",
    verifyUrl: "https://datatracker.ietf.org/doc/html/rfc2104",
    verifyLabel: "RFC 2104",
  },
  {
    term: "Merkle / hash chain",
    category: "concept",
    definition:
      "Construction where each entry references the cryptographic hash of the previous entry, making any retroactive edit detectable. Backbone of the audit log.",
    verifyUrl: "https://datatracker.ietf.org/doc/html/rfc6962",
    verifyLabel: "RFC 6962",
  },
];
