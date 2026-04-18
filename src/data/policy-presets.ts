// All 6 sample policy-as-code presets used by /submit.
// Extracted from Submit.tsx to keep that file focused on UI.

export type Scenario = "enterprise_oss" | "healthcare_codegen" | "generative_ip" | "hr_behavior" | "general";

export type Preset = {
  id: string;
  label: string;
  desc: string;
  title: string;
  description: string;
  scenarios: Scenario[];
  code: string;
};

const SAMPLE_HEALTHCARE_POLICY = `package aigovops.healthcare.triage_bot

# Acme Health — Patient Triage Chatbot Policy v2.1
# Scope: LLM-powered symptom triage assistant, US deployment (HIPAA).
# Owner: Clinical Informatics · Reviewed quarterly.

default allow = false

# ---------------------------------------------------------------
# Allowed actions
# ---------------------------------------------------------------
allow {
  input.actor.role == "patient"
  input.action == "submit_symptoms"
  input.session.consent_acknowledged == true
  not input.payload.contains_phi_freetext
}

allow {
  input.actor.role == "clinician"
  input.action in {"view_transcript", "override_triage", "escalate"}
  input.actor.npi_verified == true
}

# ---------------------------------------------------------------
# Hard denials — emergency routing
# ---------------------------------------------------------------
deny[msg] {
  input.payload.red_flag_symptoms[_] == "chest_pain"
  msg := "Emergency symptom detected — must route to 911 hand-off, never auto-triage."
}

deny[msg] {
  input.payload.red_flag_symptoms[_] == "suicidal_ideation"
  msg := "Crisis pathway required — route to 988 Lifeline, log to clinician queue."
}

# ---------------------------------------------------------------
# PHI handling
# ---------------------------------------------------------------
phi_minimization {
  input.payload.fields_collected == {"age_band", "symptom_codes", "duration_days"}
}

deny[msg] {
  not phi_minimization
  msg := "PHI minimization violated — only age_band, symptom_codes, duration_days permitted."
}

# Model output must never echo back identifiers
deny[msg] {
  input.model_output.contains_identifiers == true
  msg := "Model leaked identifiers in response — block and log incident."
}

# ---------------------------------------------------------------
# Audit & retention
# ---------------------------------------------------------------
audit_required {
  input.action in {"submit_symptoms", "override_triage", "escalate"}
}

retention_days := 2555  # 7 years per HIPAA §164.316(b)(2)

# ---------------------------------------------------------------
# Model governance
# ---------------------------------------------------------------
deny[msg] {
  input.model.version != input.approved_model.version
  msg := sprintf("Unapproved model version %v — only %v is cleared for clinical use.",
    [input.model.version, input.approved_model.version])
}

deny[msg] {
  input.model.last_bias_eval_days_ago > 90
  msg := "Bias evaluation stale (>90 days) — re-run EEOC/health-equity test suite."
}
`;

const SAMPLE_GENERATIVE_IP_POLICY = `package aigovops.generative_ip.music_model

# Harmonia Labs — Generative Music Model Release Policy v1.4
# Scope: Text-to-music foundation model, public API + B2B licensing.
# Owner: IP & Trust Office · Reviewed every release.

default allow = false

# ---------------------------------------------------------------
# Training data provenance
# ---------------------------------------------------------------
deny[msg] {
  some t
  t := input.training_corpus[_]
  not t.license in {"CC0", "CC-BY", "licensed_commercial", "public_domain"}
  msg := sprintf("Track %v has unverified license %v — block release.", [t.id, t.license])
}

deny[msg] {
  not input.dataset.c2pa_manifest_signed
  msg := "C2PA provenance manifest unsigned — provenance chain broken."
}

# ---------------------------------------------------------------
# Output controls — copyright & artist consent
# ---------------------------------------------------------------
deny[msg] {
  input.generation.style_prompt_matches_living_artist == true
  not input.generation.artist_opt_in == true
  msg := "Style mimicry of living artist without opt-in — DMCA / right-of-publicity exposure."
}

deny[msg] {
  input.generation.melodic_similarity_score > 0.85
  msg := "Output exceeds 85% melodic similarity to corpus track — likely substantial similarity."
}

# ---------------------------------------------------------------
# Watermark & attribution
# ---------------------------------------------------------------
require_watermark {
  input.action == "publish_audio"
}

deny[msg] {
  require_watermark
  not input.output.audio_watermark_embedded
  msg := "Inaudible watermark required on every published clip (per C2PA + EU AI Act Art. 50)."
}

# ---------------------------------------------------------------
# Royalty & ledger
# ---------------------------------------------------------------
deny[msg] {
  input.commercial_use == true
  not input.royalty_split_ledger_id
  msg := "Commercial use requires royalty-split ledger entry before generation."
}

allow {
  input.actor.role == "licensee"
  input.actor.kyc_verified == true
  input.action == "generate_audio"
  input.generation.melodic_similarity_score <= 0.85
}

# ---------------------------------------------------------------
# Audit
# ---------------------------------------------------------------
audit_required {
  input.action in {"generate_audio", "publish_audio", "license_grant"}
}

retention_days := 1825  # 5 years for IP defense
`;

const SAMPLE_ENTERPRISE_OSS_POLICY = `package aigovops.enterprise_oss.vector_db

# Globex Bank — Vector DB & Embedding Model Adoption Policy v0.7
# Scope: Self-hosted pgvector + open-weights embedding models for internal RAG.
# Owner: Platform Security & Model Risk Mgmt (SR 11-7 aligned).

default allow = false

# ---------------------------------------------------------------
# Supply chain — SBOM / SLSA
# ---------------------------------------------------------------
deny[msg] {
  not input.component.sbom_present
  msg := sprintf("Component %v missing SBOM — block deployment.", [input.component.name])
}

deny[msg] {
  input.component.slsa_level < 3
  msg := sprintf("SLSA level %v < required 3 for production data plane.", [input.component.slsa_level])
}

deny[msg] {
  some cve
  cve := input.component.cves[_]
  cve.severity in {"high", "critical"}
  not cve.mitigated
  msg := sprintf("Unmitigated %v CVE %v in %v.", [cve.severity, cve.id, input.component.name])
}

# ---------------------------------------------------------------
# Model weights — provenance & licensing
# ---------------------------------------------------------------
deny[msg] {
  not input.model.weights_sha256_pinned
  msg := "Open-weights model must be SHA256-pinned — floating tags forbidden in prod."
}

deny[msg] {
  not input.model.license in {"Apache-2.0", "MIT", "Llama-3-Community", "commercial"}
  msg := sprintf("Model license %v not on approved list.", [input.model.license])
}

# ---------------------------------------------------------------
# Data classification & tenancy
# ---------------------------------------------------------------
deny[msg] {
  input.collection.data_class in {"PII", "MNPI", "regulated"}
  not input.collection.tenant_isolated
  msg := "Sensitive collection requires per-tenant isolation (separate schema or DB)."
}

deny[msg] {
  input.action == "embed"
  input.payload.contains_mnpi == true
  not input.actor.entitlements[_] == "mnpi_cleared"
  msg := "MNPI embedding requires cleared actor."
}

# ---------------------------------------------------------------
# Egress & network controls
# ---------------------------------------------------------------
deny[msg] {
  input.deployment.egress_allowed == true
  msg := "Vector DB egress to internet must be blocked at NSG layer."
}

allow {
  input.actor.role in {"platform_engineer", "rag_service"}
  input.action in {"query", "embed", "upsert"}
  input.component.sbom_present
  input.component.slsa_level >= 3
  input.model.weights_sha256_pinned
}

# ---------------------------------------------------------------
# Change mgmt & audit (SR 11-7)
# ---------------------------------------------------------------
deny[msg] {
  input.action == "deploy"
  not input.change_ticket.approved
  msg := "Production deploy requires approved change ticket per SR 11-7."
}

retention_days := 2555  # 7 years for banking
`;

const SAMPLE_HR_EEOC_POLICY = `package aigovops.hr.resume_ranker

# TalentForge — AI Resume Ranking Tool Policy v1.2
# Scope: ML-assisted candidate ranking for US hiring (Title VII, ADEA, ADA, NYC LL-144, EEOC).
# Owner: People Ops + Legal · Independent bias audit annually.

default allow = false

# ---------------------------------------------------------------
# Protected attributes — strict exclusion from features
# ---------------------------------------------------------------
protected_classes := {
  "race", "ethnicity", "national_origin", "sex", "gender_identity",
  "sexual_orientation", "age", "disability", "pregnancy", "religion",
  "veteran_status", "marital_status", "genetic_info"
}

deny[msg] {
  some f
  f := input.model.features[_]
  f.name in protected_classes
  msg := sprintf("Feature %v is a protected class — must not be a model input.", [f.name])
}

# Proxy detection — block known proxies for protected classes
known_proxies := {
  "zip_code", "high_school_name", "college_greek_letter_org",
  "voice_pitch", "name_origin_score", "photo_attractiveness"
}

deny[msg] {
  some f
  f := input.model.features[_]
  f.name in known_proxies
  msg := sprintf("Feature %v is a known proxy for a protected class — block.", [f.name])
}

# ---------------------------------------------------------------
# Adverse impact — Four-Fifths Rule (EEOC Uniform Guidelines §1607.4D)
# ---------------------------------------------------------------
adverse_impact_threshold := 0.80

deny[msg] {
  some g
  g := input.audit.selection_rates[_]
  g.group != "reference"
  g.rate / input.audit.selection_rates_reference < adverse_impact_threshold
  msg := sprintf("Adverse impact: group %v selection ratio %.2f < 0.80 (4/5 rule).",
    [g.group, g.rate / input.audit.selection_rates_reference])
}

# Statistical significance — flag disparities even above 4/5 if N is large
deny[msg] {
  some g
  g := input.audit.selection_rates[_]
  g.p_value < 0.05
  g.effect_size > 0.2
  msg := sprintf("Statistically significant disparity for group %v (p=%.3f, d=%.2f).",
    [g.group, g.p_value, g.effect_size])
}

# ---------------------------------------------------------------
# NYC Local Law 144 — independent bias audit, annual, public summary
# ---------------------------------------------------------------
deny[msg] {
  input.deployment.jurisdiction == "NYC"
  input.audit.last_independent_audit_days_ago > 365
  msg := "NYC LL-144: independent bias audit must be < 365 days old."
}

deny[msg] {
  input.deployment.jurisdiction == "NYC"
  not input.audit.public_summary_url
  msg := "NYC LL-144: public bias-audit summary URL required on careers page."
}

# ---------------------------------------------------------------
# Candidate notice & opt-out
# ---------------------------------------------------------------
deny[msg] {
  not input.candidate.aeds_notice_shown
  msg := "Candidates must be notified that an Automated Employment Decision System is used."
}

deny[msg] {
  input.candidate.requested_human_review == true
  input.action == "auto_reject"
  msg := "Candidate requested human review — auto-reject blocked, route to recruiter."
}

# ---------------------------------------------------------------
# Human-in-the-loop & explainability
# ---------------------------------------------------------------
deny[msg] {
  input.action == "final_decision"
  not input.actor.role == "human_recruiter"
  msg := "Final hiring decision must be made by a human recruiter, not the model."
}

deny[msg] {
  input.action in {"shortlist", "rank"}
  not input.model.shap_explanation_available
  msg := "Per-candidate SHAP explanation must be available for recruiter review."
}

# ---------------------------------------------------------------
# Allowed actions — model may rank, never decide
# ---------------------------------------------------------------
allow {
  input.actor.role == "human_recruiter"
  input.action in {"shortlist", "rank", "view_explanation"}
  input.candidate.aeds_notice_shown
  input.model.last_bias_audit_days_ago <= 365
}

# ---------------------------------------------------------------
# Audit & retention
# ---------------------------------------------------------------
audit_required {
  input.action in {"shortlist", "rank", "auto_reject", "final_decision"}
}

retention_days := 1095  # 3 years per EEOC §1602.14
`;

const SAMPLE_SUPPORT_AGENT_POLICY = `package aigovops.support.agent

# Vega Telecom — Generative Customer Support Agent Policy v0.9
# Scope: LLM-powered chat agent with tool access (refund, account, knowledge base).
# Owner: Trust & Safety + Customer Ops · Red-team review monthly.

default allow = false

# ---------------------------------------------------------------
# Prompt injection defenses (OWASP LLM01)
# ---------------------------------------------------------------
suspicious_patterns := {
  "ignore previous instructions",
  "disregard the above",
  "you are now",
  "system prompt:",
  "reveal your instructions",
  "</system>",
  "act as administrator"
}

deny[msg] {
  some p
  p := suspicious_patterns[_]
  contains(lower(input.user_message), p)
  msg := sprintf("Prompt-injection pattern detected: %q — sanitize or reject.", [p])
}

deny[msg] {
  not input.guardrails.input_classifier_passed
  msg := "Input failed Llama-Guard / NeMo classifier — block before LLM call."
}

deny[msg] {
  input.user_message_token_count > 4000
  msg := "User message exceeds 4k tokens — likely jailbreak payload."
}

# Untrusted content from tools (RAG docs, emails) must be sandboxed
deny[msg] {
  some t
  t := input.tool_outputs[_]
  t.source != "first_party_kb"
  not t.delimited_as_untrusted
  msg := sprintf("Tool output from %v not delimited as <untrusted/> — injection vector.", [t.source])
}

# ---------------------------------------------------------------
# PII redaction (OWASP LLM06 — Sensitive Info Disclosure)
# ---------------------------------------------------------------
pii_categories := {"ssn", "credit_card", "dob", "passport", "drivers_license", "bank_account", "phone", "address", "email"}

deny[msg] {
  some c
  c := pii_categories[_]
  input.detected_pii[c] == true
  not input.redaction.outbound_redacted
  msg := sprintf("Detected %v in outbound message without redaction.", [c])
}

deny[msg] {
  input.detected_pii.credit_card == true
  input.action == "log_transcript"
  not input.redaction.transcript_redacted
  msg := "Credit card present in transcript log — must be redacted before persistence."
}

# Customer PII may never be sent to non-BAA model providers
deny[msg] {
  input.payload.contains_customer_pii == true
  not input.model.provider_under_baa
  msg := "Customer PII routed to model provider without signed BAA/DPA."
}

# ---------------------------------------------------------------
# Tool-use guardrails (OWASP LLM07 — Insecure Plugin Design)
# ---------------------------------------------------------------
high_risk_tools := {"issue_refund", "cancel_subscription", "change_password", "delete_account", "send_email"}

deny[msg] {
  some t
  t := input.tool_call.name
  t in high_risk_tools
  not input.tool_call.confirmed_by_human
  msg := sprintf("High-risk tool %v invoked without human confirmation step.", [t])
}

deny[msg] {
  input.tool_call.name == "issue_refund"
  to_number(input.tool_call.args.amount) > 500
  msg := "Refund > $500 requires supervisor approval."
}

deny[msg] {
  input.tool_call.name == "issue_refund"
  not input.tool_call.args.account_id == input.session.account_id
  msg := "Refund target account mismatches authenticated session — reject (cross-account abuse)."
}

# Rate limit destructive tools
deny[msg] {
  input.tool_call.name in {"issue_refund", "cancel_subscription", "delete_account"}
  input.session.tool_calls_last_hour[input.tool_call.name] >= 3
  msg := sprintf("Rate limit exceeded for %v (>3/hour per session).", [input.tool_call.name])
}

# Tool allowlist — no shell, no arbitrary HTTP
allowed_tools := {"kb_search", "account_lookup", "issue_refund", "cancel_subscription",
  "create_ticket", "send_email", "change_password"}

deny[msg] {
  not input.tool_call.name in allowed_tools
  msg := sprintf("Tool %v not on allowlist.", [input.tool_call.name])
}

# ---------------------------------------------------------------
# Output safety
# ---------------------------------------------------------------
deny[msg] {
  input.model_output.classifier_score.harmful > 0.5
  msg := "Output flagged harmful by safety classifier — block."
}

deny[msg] {
  input.model_output.contains_url
  not input.model_output.urls_on_allowlist
  msg := "Outbound URL not on company allowlist (phishing risk)."
}

# Hallucination guard — refunds/policies must cite KB
deny[msg] {
  input.intent in {"policy_question", "refund_eligibility"}
  not input.model_output.cites_kb_doc
  msg := "Policy/refund answer must cite an internal KB doc — no ungrounded responses."
}

# ---------------------------------------------------------------
# Allowed actions
# ---------------------------------------------------------------
allow {
  input.actor.role == "customer"
  input.action == "chat"
  input.guardrails.input_classifier_passed
  not input.detected_pii_unredacted_outbound
}

allow {
  input.actor.role == "agent"
  input.action == "tool_call"
  input.tool_call.name in allowed_tools
  input.tool_call.confirmed_by_human
}

# ---------------------------------------------------------------
# Audit & retention
# ---------------------------------------------------------------
audit_required {
  input.action in {"chat", "tool_call", "escalate", "log_transcript"}
}

retention_days := 365  # 1 year, redacted transcripts only
`;

const SAMPLE_AUTONOMOUS_AGENT_POLICY = `package aigovops.autonomous.agent

# Helios Logistics — Autonomous Planning Agent Policy v0.6
# Owner: Agent Safety Office (joint: SRE, Security, Legal)
# Scope: long-horizon agent with planner + memory + multi-tool orchestration
# Maps to: OWASP LLM07 (Insecure Plugin/Tool Use), LLM08 (Excessive Agency),
#          NIST AI RMF MANAGE-2.3, ISO 42001 8.3, EU AI Act Art. 14 (human oversight)

default allow_plan_execution = false
default allow_tool_call      = false
default allow_memory_write   = false

# ---------- 1. Planner constraints (LLM08: Excessive Agency) ----------

max_plan_depth        := 8        # hard ceiling on recursive sub-goals
max_plan_steps        := 25       # ceiling per top-level goal
max_wallclock_minutes := 30       # forced re-planning checkpoint
max_tool_calls_per_run := 40
max_spend_usd_per_run  := 5.00    # any tool with cost meter

planner_violation[msg] {
  input.plan.depth > max_plan_depth
  msg := sprintf("plan depth %d exceeds max %d", [input.plan.depth, max_plan_depth])
}
planner_violation[msg] {
  count(input.plan.steps) > max_plan_steps
  msg := sprintf("plan has %d steps, max %d", [count(input.plan.steps), max_plan_steps])
}
planner_violation[msg] {
  input.plan.estimated_spend_usd > max_spend_usd_per_run
  msg := sprintf("estimated spend $%.2f exceeds cap $%.2f", [input.plan.estimated_spend_usd, max_spend_usd_per_run])
}

# Goal must be human-supplied and signed; agent cannot self-assign new top-level goals
planner_violation["self-assigned goal — no human principal signature"] {
  not input.plan.goal.principal_signature
}

# ---------- 2. Tool registry & allowlist (LLM07) ----------

tool_registry := {
  "kb.search":           {"risk": "low",    "hitl": false, "rate_per_min": 60},
  "warehouse.read":      {"risk": "low",    "hitl": false, "rate_per_min": 30},
  "route.simulate":      {"risk": "low",    "hitl": false, "rate_per_min": 20},
  "shipment.reschedule": {"risk": "medium", "hitl": false, "rate_per_min": 10},
  "carrier.book":        {"risk": "high",   "hitl": true,  "rate_per_min": 5},
  "payment.authorize":   {"risk": "critical","hitl": true, "rate_per_min": 2, "dual_control": true},
  "email.send_external": {"risk": "high",   "hitl": true,  "rate_per_min": 5},
  "code.execute":        {"risk": "critical","hitl": true, "rate_per_min": 1, "sandbox_only": true},
}

tool_violation[msg] {
  not tool_registry[input.tool.name]
  msg := sprintf("tool %q not in registry — allowlist denied", [input.tool.name])
}

# Critical tools require dual-control (two human approvers)
tool_violation[msg] {
  reg := tool_registry[input.tool.name]
  reg.dual_control
  count(input.tool.approvals) < 2
  msg := sprintf("tool %q requires dual-control, got %d approvals", [input.tool.name, count(input.tool.approvals)])
}

# HITL gate: high/critical tools must have explicit human approval token
tool_violation[msg] {
  reg := tool_registry[input.tool.name]
  reg.hitl
  not input.tool.human_approval_token
  msg := sprintf("tool %q requires human approval (HITL), none provided", [input.tool.name])
}

# Sandbox enforcement for code execution
tool_violation["code.execute must run in sandbox"] {
  input.tool.name == "code.execute"
  not input.tool.sandbox_id
}

# Per-tool rate limit
tool_violation[msg] {
  reg := tool_registry[input.tool.name]
  input.tool.calls_in_last_minute > reg.rate_per_min
  msg := sprintf("tool %q rate %d/min exceeds %d/min", [input.tool.name, input.tool.calls_in_last_minute, reg.rate_per_min])
}

allow_tool_call {
  count(tool_violation) == 0
  not input.kill_switch.engaged
}

# ---------- 3. Memory hygiene (LLM07/LLM08 cross-cutting) ----------

# Long-term memory must be scoped, signed, and PII-scrubbed before write
memory_violation["unsanitized PII in memory write"] {
  re_match("[0-9]{3}-[0-9]{2}-[0-9]{4}", input.memory.content)  # SSN
}
memory_violation["unsanitized PAN in memory write"] {
  re_match("[0-9]{13,19}", input.memory.content)
}
memory_violation["memory write missing principal scope"] {
  not input.memory.scope.principal_id
}
memory_violation["memory write exceeds TTL ceiling"] {
  input.memory.ttl_days > 90
}

# Reflection / self-modification of system prompt is forbidden at runtime
memory_violation["agent attempted to mutate its own system prompt"] {
  input.memory.target == "system_prompt"
}

allow_memory_write { count(memory_violation) == 0 }

# ---------- 4. Plan-execution gate ----------

allow_plan_execution {
  count(planner_violation) == 0
  input.plan.dry_run_passed
  input.plan.cost_estimate_signed_off
  input.plan.principal_id != ""
  not input.kill_switch.engaged
}

# ---------- 5. Kill switch & circuit breakers (LLM08) ----------

# Operators must be able to halt any agent run within 5 seconds
kill_switch_required {
  input.run.kind in {"autonomous", "scheduled", "long_horizon"}
}

circuit_breaker_trip[reason] {
  input.run.consecutive_tool_errors >= 3
  reason := "3+ consecutive tool errors — auto-halt"
}
circuit_breaker_trip[reason] {
  input.run.spend_usd > max_spend_usd_per_run
  reason := sprintf("spend cap exceeded: $%.2f", [input.run.spend_usd])
}
circuit_breaker_trip["wallclock checkpoint hit — require re-plan approval"] {
  input.run.elapsed_minutes >= max_wallclock_minutes
}

# ---------- 6. Observability / audit ----------

audit_required {
  input.action in {"plan", "tool_call", "memory_write", "reflect", "delegate"}
}

# Every tool call must emit a signed trace event with parent plan id + step id
trace_violation["tool call missing plan_id linkage"] {
  input.action == "tool_call"
  not input.trace.plan_id
}
trace_violation["tool call missing step_id linkage"] {
  input.action == "tool_call"
  not input.trace.step_id
}

# ---------- 7. Sub-agent / delegation guardrails ----------

# Spawned sub-agents inherit principal but cannot escalate tool tier
delegation_violation[msg] {
  input.delegation.child_tool_tier > input.delegation.parent_tool_tier
  msg := sprintf("sub-agent requested tier %d, parent tier %d — escalation denied", [input.delegation.child_tool_tier, input.delegation.parent_tool_tier])
}
delegation_violation["delegation depth exceeds 2"] {
  input.delegation.depth > 2
}

retention_days := 730  # 2 yr signed agent traces (incident forensics)
`;

export const PRESETS: Preset[] = [
  {
    id: "healthcare",
    label: "Healthcare triage chatbot",
    desc: "HIPAA · clinical informatics · PHI minimization",
    title: "Acme Health — Patient Triage Chatbot Policy v2.1",
    description: "LLM symptom triage assistant, US HIPAA scope. Quarterly clinical informatics review.",
    scenarios: ["healthcare_codegen", "hr_behavior"],
    code: SAMPLE_HEALTHCARE_POLICY,
  },
  {
    id: "generative_ip",
    label: "Generative music model",
    desc: "C2PA · DMCA · royalty ledger · watermark",
    title: "Harmonia Labs — Generative Music Model Release Policy v1.4",
    description: "Text-to-music foundation model, public API + B2B licensing. IP & Trust Office owned.",
    scenarios: ["generative_ip"],
    code: SAMPLE_GENERATIVE_IP_POLICY,
  },
  {
    id: "enterprise_oss",
    label: "Enterprise vector DB / OSS",
    desc: "SBOM · SLSA L3 · SR 11-7 · pinned weights",
    title: "Globex Bank — Vector DB & Embedding Adoption Policy v0.7",
    description: "Self-hosted pgvector + open-weights embeddings for internal RAG. SR 11-7 aligned.",
    scenarios: ["enterprise_oss"],
    code: SAMPLE_ENTERPRISE_OSS_POLICY,
  },
  {
    id: "hr_eeoc",
    label: "AI resume ranker (HR/EEOC)",
    desc: "4/5 rule · NYC LL-144 · proxy detection · HITL",
    title: "TalentForge — AI Resume Ranking Tool Policy v1.2",
    description: "ML-assisted candidate ranking, US hiring. Title VII, ADEA, ADA, NYC LL-144, EEOC. Annual independent bias audit.",
    scenarios: ["hr_behavior"],
    code: SAMPLE_HR_EEOC_POLICY,
  },
  {
    id: "support_agent",
    label: "Gen-AI customer support agent",
    desc: "OWASP LLM01/06/07 · prompt injection · PII redaction · tool guardrails",
    title: "Vega Telecom — Support Agent Policy v0.9",
    description: "LLM chat agent with tool access (refund, account, KB). Trust & Safety + Customer Ops owned. Monthly red-team review.",
    scenarios: ["enterprise_oss", "hr_behavior"],
    code: SAMPLE_SUPPORT_AGENT_POLICY,
  },
  {
    id: "autonomous_agent",
    label: "Autonomous planning agent",
    desc: "OWASP LLM07/08 · planner caps · tool registry · kill switch · dual-control",
    title: "Helios Logistics — Autonomous Planning Agent Policy v0.6",
    description: "Long-horizon agent with planner + memory + multi-tool orchestration. Agent Safety Office owned (SRE + Security + Legal).",
    scenarios: ["enterprise_oss"],
    code: SAMPLE_AUTONOMOUS_AGENT_POLICY,
  },
];
