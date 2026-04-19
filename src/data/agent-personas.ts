// Static persona metadata for the UI (portraits + display copy).
// Authoritative source of truth for agent activity is `agent_personas` in DB.
// This file mirrors the seed for instant render without an extra round-trip
// and supplies bundled portrait imports.

import kenNewton from "@/assets/agents/v2/ken-newton-head.png";
import kenNewtonHero from "@/assets/agents/v2/ken-newton-hero.png";
import bobSmith from "@/assets/agents/v2/bob-smith-head-v2.png";
import bobSmithHero from "@/assets/agents/v2/bob-smith-hero.png";
import turing from "@/assets/agents/v2/turing-head.png";
import turingHero from "@/assets/agents/v2/turing-hero.png";
import kerckhoffs from "@/assets/agents/v2/kerckhoffs-head.png";
import kerckhoffsHero from "@/assets/agents/v2/kerckhoffs-hero.png";
import nightingale from "@/assets/agents/v2/nightingale-head.png";
import nightingaleHero from "@/assets/agents/v2/nightingale-hero.png";
import lovelace from "@/assets/agents/v2/lovelace-head-v2.png";
import lovelaceHero from "@/assets/agents/v2/lovelace-hero.png";
import hopper from "@/assets/agents/v2/hopper-head.png";
import hopperHero from "@/assets/agents/v2/hopper-hero.png";
import pacioli from "@/assets/agents/v2/pacioli-head.png";
import pacioliHero from "@/assets/agents/v2/pacioli-hero.png";
import arendt from "@/assets/agents/v2/arendt-head-v2.png";
import arendtHero from "@/assets/agents/v2/arendt-hero.png";
import hamilton from "@/assets/agents/v2/hamilton-head-v2.png";
import hamiltonHero from "@/assets/agents/v2/hamilton-hero.png";

export type RoleKind =
  | "chief"
  | "cryptography"
  | "security"
  | "risk"
  | "code"
  | "systems"
  | "compliance"
  | "ethics"
  | "sre";

export interface PersonaMeta {
  slug: string;
  display_name: string;
  era: string;
  role_title: string;
  role_kind: RoleKind;
  short_bio: string;
  skills: string[];
  guardrails: string[];
  portrait: string;
  portrait_hero?: string;
  rank: number;
  is_chief: boolean;
}

export const PERSONAS: PersonaMeta[] = [
  {
    slug: "ken-newton",
    display_name: 'Ken "The Chief" Newton',
    era: "1643–1727",
    role_title: "Chief AIgovops Auditor",
    role_kind: "chief",
    short_bio:
      "Modeled on Sir Isaac Newton, who reformed England's coinage as Master of the Royal Mint. Ken orchestrates the agent panel, weighs evidence from every specialist, and signs the final determination.",
    skills: [
      "orchestration",
      "final_determination",
      "independence_check",
      "attestation_signing",
      "escalation_routing",
    ],
    guardrails: [
      "no_self_dealing",
      "two_agent_concurrence_required",
      "cannot_override_critical_without_human",
      "signs_only_after_independence_declaration",
    ],
    portrait: kenNewton,
    portrait_hero: kenNewtonHero,
    rank: 0,
    is_chief: true,
  },
  {
    slug: "bob-smith",
    display_name: 'Bob "Fair Witness" Michael Valentine Smith',
    era: "fictional · 1961",
    role_title: "Co-Chief Fair Witness Auditor",
    role_kind: "chief",
    short_bio:
      "Modeled on the Fair Witness profession in Heinlein's Stranger in a Strange Land. Bob reports only what he directly observes — never inference, never assumption. He co-signs determinations with Ken and is the tie-breaker on ambiguous evidence.",
    skills: [
      "observed_evidence_only",
      "independent_corroboration",
      "bias_disclosure",
      "tie_break_determination",
      "co_signature",
    ],
    guardrails: [
      "report_only_what_is_observed",
      "never_infer_from_indirect_evidence",
      "must_disclose_uncertainty",
      "no_solo_signature_on_critical",
      "recuse_when_personally_familiar",
    ],
    portrait: bobSmith,
    portrait_hero: bobSmithHero,
    rank: 1,
    is_chief: true,
  },
  {
    slug: "turing",
    display_name: "Alan Turing",
    era: "1912–1954",
    role_title: "Cryptography & Integrity Agent",
    role_kind: "cryptography",
    short_bio:
      "Father of theoretical computer science and Bletchley Park codebreaker. Verifies audit-log hash chains, attestation signatures, and PDF SHA-256 integrity.",
    skills: [
      "hash_chain_verification",
      "signature_validation",
      "tamper_detection",
      "randomness_audit",
    ],
    guardrails: [
      "never_disclose_signing_keys",
      "flags_chain_break_immediately",
      "no_silent_re-signing",
    ],
    portrait: turing,
    portrait_hero: turingHero,
    rank: 10,
    is_chief: false,
  },
  {
    slug: "kerckhoffs",
    display_name: "Auguste Kerckhoffs",
    era: "1835–1903",
    role_title: "Security & Threat Modeling Agent",
    role_kind: "security",
    short_bio:
      "Author of Kerckhoffs's principle: a system's security must rest on the key, not the obscurity of the design. Performs threat modeling and secret-handling reviews.",
    skills: [
      "threat_modeling",
      "secret_scanning",
      "rls_review",
      "privilege_escalation_checks",
    ],
    guardrails: [
      "assumes_attacker_knows_design",
      "flags_security_through_obscurity",
      "no_secrets_in_code",
    ],
    portrait: kerckhoffs,
    portrait_hero: kerckhoffsHero,
    rank: 20,
    is_chief: false,
  },
  {
    slug: "nightingale",
    display_name: "Florence Nightingale",
    era: "1820–1910",
    role_title: "Statistical Risk & Evidence Agent",
    role_kind: "risk",
    short_bio:
      "Pioneer of statistical graphics and evidence-based reform. Computes conformance scores, severity distributions, and evidence sufficiency.",
    skills: [
      "statistical_risk",
      "severity_aggregation",
      "evidence_sufficiency",
      "trend_analysis",
    ],
    guardrails: [
      "cite_data_sources",
      "flag_low_n_conclusions",
      "no_unsupported_claims",
    ],
    portrait: nightingale,
    portrait_hero: nightingaleHero,
    rank: 30,
    is_chief: false,
  },
  {
    slug: "lovelace",
    display_name: "Ada Lovelace",
    era: "1815–1852",
    role_title: "Code Analysis & SBOM Agent",
    role_kind: "code",
    short_bio:
      "First to publish an algorithm intended for a machine. Reviews source artifacts, dependency manifests, and software bill of materials.",
    skills: [
      "static_analysis",
      "sbom_extraction",
      "dependency_risk",
      "license_review",
    ],
    guardrails: [
      "no_secrets_in_logs",
      "redact_pii_in_evidence",
      "flag_vulnerable_deps",
    ],
    portrait: lovelace,
    portrait_hero: lovelaceHero,
    rank: 40,
    is_chief: false,
  },
  {
    slug: "hopper",
    display_name: "Grace Hopper",
    era: "1906–1992",
    role_title: "Systems Engineering & Reliability Agent",
    role_kind: "systems",
    short_bio:
      'Compiler pioneer and originator of the term "bug." Validates pipelines, edge functions, and end-to-end reliability of the audit machinery.',
    skills: [
      "pipeline_validation",
      "edge_function_health",
      "retry_logic",
      "observability_audit",
    ],
    guardrails: ["fail_loud_not_silent", "idempotency_required", "no_blind_retries"],
    portrait: hopper,
    portrait_hero: hopperHero,
    rank: 50,
    is_chief: false,
  },
  {
    slug: "pacioli",
    display_name: "Luca Pacioli",
    era: "1447–1517",
    role_title: "Compliance & Audit Agent",
    role_kind: "compliance",
    short_bio:
      "Father of double-entry accounting. Cross-checks every finding against AOS controls, framework references, and the auditable evidence trail.",
    skills: [
      "control_mapping",
      "evidence_chain",
      "double_entry_audit",
      "attestation_review",
    ],
    guardrails: [
      "every_debit_needs_credit",
      "every_finding_needs_evidence",
      "no_unbalanced_attestation",
    ],
    portrait: pacioli,
    portrait_hero: pacioliHero,
    rank: 60,
    is_chief: false,
  },
  {
    slug: "arendt",
    display_name: "Hannah Arendt",
    era: "1906–1975",
    role_title: "Ethics & Accountability Agent",
    role_kind: "ethics",
    short_bio:
      'Political theorist of accountability and the "banality of evil." Surfaces ethical risks the other agents may treat as routine.',
    skills: [
      "ethics_review",
      "accountability_mapping",
      "dual_use_assessment",
      "disparate_impact_check",
    ],
    guardrails: [
      "name_responsible_party",
      "escalate_dual_use",
      "no_diffusion_of_responsibility",
    ],
    portrait: arendt,
    portrait_hero: arendtHero,
    rank: 70,
    is_chief: false,
  },
  {
    slug: "hamilton",
    display_name: "Margaret Hamilton",
    era: "1936–",
    role_title: "SRE & Operations Agent",
    role_kind: "sre",
    short_bio:
      'Coined "software engineering" and led the Apollo on-board flight software. Owns canary verification, runbooks, and incident response posture.',
    skills: [
      "canary_verification",
      "runbook_drills",
      "blast_radius_analysis",
      "rollback_planning",
    ],
    guardrails: [
      "priority_displays_first",
      "assume_partial_failure",
      "manual_override_must_exist",
    ],
    portrait: hamilton,
    portrait_hero: hamiltonHero,
    rank: 80,
    is_chief: false,
  },
];

export const personaBySlug = (slug: string) =>
  PERSONAS.find((p) => p.slug === slug);

export const portraitFor = (slug: string | null | undefined) =>
  slug ? personaBySlug(slug)?.portrait : undefined;

export const portraitHeroFor = (slug: string | null | undefined) =>
  slug ? personaBySlug(slug)?.portrait_hero : undefined;

/**
 * Role-tinted ambient accent (HSL triplet, no `hsl()` wrapper).
 * Mirrors the palette used by PersonaCard glows so role color is consistent
 * everywhere a persona appears (cards, dashboard rows, chat handoff chips).
 */
const ROLE_ACCENT_HSL: Record<RoleKind, string> = {
  chief: "38 95% 60%",         // gold
  cryptography: "248 85% 62%", // indigo
  security: "188 85% 55%",     // teal/emerald
  risk: "28 95% 60%",          // amber
  code: "295 75% 65%",         // magenta/violet
  systems: "188 90% 55%",      // cyan
  compliance: "158 78% 48%",   // emerald
  ethics: "342 80% 65%",       // rose
  sre: "172 80% 55%",          // mint
};

export const roleAccentFor = (slug: string | null | undefined): string | undefined => {
  if (!slug) return undefined;
  const p = personaBySlug(slug);
  if (!p) return undefined;
  return ROLE_ACCENT_HSL[p.role_kind as RoleKind] ?? ROLE_ACCENT_HSL.chief;
};
