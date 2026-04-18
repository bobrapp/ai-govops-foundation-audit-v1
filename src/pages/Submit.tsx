import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, GitBranch, FileCode, UploadCloud, Sparkles, ChevronDown } from "lucide-react";

type Scenario = "enterprise_oss" | "healthcare_codegen" | "generative_ip" | "hr_behavior" | "general";

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

type Preset = {
  id: string;
  label: string;
  desc: string;
  title: string;
  description: string;
  scenarios: Scenario[];
  code: string;
};

const PRESETS: Preset[] = [
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
];

const SCENARIOS: { id: Scenario; label: string; desc: string }[] = [
  { id: "enterprise_oss", label: "Enterprise OSS adoption", desc: "OpenCLAW, vector DBs, foundation models inside a regulated org." },
  { id: "healthcare_codegen", label: "Healthcare codegen", desc: "AI generating or touching code in HIPAA / FDA settings." },
  { id: "generative_ip", label: "Generative IP", desc: "Music, art, video — provable copyright chain." },
  { id: "hr_behavior", label: "HR & insurable risk", desc: "Bias, harassment, discrimination, EEOC exposure." },
  { id: "general", label: "General governance", desc: "Baseline policy review without scenario specialization." },
];

const Submit = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"paste" | "upload" | "github">("paste");
  const [scenarios, setScenarios] = useState<Scenario[]>(["general"]);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const loadPreset = (preset: Preset) => {
    setTab("paste");
    setCode(preset.code);
    setTitle(preset.title);
    setDescription(preset.description);
    setScenarios(preset.scenarios);
    toast.success(`Loaded: ${preset.label}`);
  };

  const toggle = (s: Scenario) =>
    setScenarios((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const titleVal = title.trim();
    const descVal = description.trim();
    if (!titleVal) { toast.error("Title required"); return; }
    if (scenarios.length === 0) { toast.error("Select at least one scenario"); return; }

    setBusy(true);
    try {
      let artifacts: { file_path: string; language: string; content: string }[] = [];
      let source_url: string | null = null;

      if (tab === "paste") {
        if (!code.trim()) throw new Error("Paste your policy code");
        artifacts = [{ file_path: "policy.rego", language: "rego", content: code.slice(0, 200_000) }];
      } else if (tab === "upload") {
        const files = (fd.getAll("files") as File[]).filter((f) => f.size > 0);
        if (files.length === 0) throw new Error("Select at least one file");
        for (const f of files.slice(0, 25)) {
          const text = await f.text();
          const ext = f.name.split(".").pop()?.toLowerCase() ?? "txt";
          artifacts.push({ file_path: f.name, language: ext, content: text.slice(0, 200_000) });
        }
      } else {
        source_url = String(fd.get("repo_url") ?? "").trim();
        if (!source_url) throw new Error("Repo URL required");
        const { data, error } = await supabase.functions.invoke("github-fetch", { body: { url: source_url } });
        if (error) throw new Error(error.message);
        if (!data.files?.length) throw new Error("No policy files (.rego/.yaml/.json/.cedar/.md) found in repo");
        artifacts = data.files;
      }

      const { data: review, error: rErr } = await supabase
        .from("reviews")
        .insert({
          submitter_id: user.id,
          title: titleVal, description: descVal,
          source_type: tab,
          source_url,
          scenarios,
          status: "ingesting",
        })
        .select()
        .single();
      if (rErr) throw rErr;

      const { error: aErr } = await supabase
        .from("review_artifacts")
        .insert(artifacts.map((a) => ({ ...a, review_id: review.id })));
      if (aErr) throw aErr;

      await supabase.from("audit_log").insert({
        review_id: review.id, actor_id: user.id, actor_kind: "user",
        event: "review.created", payload: { artifacts: artifacts.length, scenarios },
      });

      toast.success("Review created — running agent pipeline");
      // Fire and forget; review page polls
      supabase.functions.invoke("run-agent-pipeline", { body: { reviewId: review.id } });
      nav(`/review/${review.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "submit failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">New review</h1>
            <p className="text-sm text-muted-foreground">Submit a policy-as-code bundle for end-to-end agentic review.</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Sparkles className="h-4 w-4 mr-1.5" /> Load sample <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Pre-built policy presets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PRESETS.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => loadPreset(p)} className="flex flex-col items-start gap-0.5 py-2">
                  <span className="text-sm font-medium">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.desc}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Title</Label>
              <Input name="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. OpenCLAW deployment policy v0.3" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input name="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Context for reviewers" />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Scenarios to stress-test against</Label>
            <div className="grid md:grid-cols-2 gap-2">
              {SCENARIOS.map((s) => (
                <label key={s.id} className="flex items-start gap-2 rounded-md border border-border bg-card-grad p-3 cursor-pointer hover:border-primary/40">
                  <Checkbox
                    checked={scenarios.includes(s.id)}
                    onCheckedChange={() => toggle(s.id)}
                  />
                  <div>
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="paste"><FileCode className="h-4 w-4 mr-1.5" /> Paste</TabsTrigger>
              <TabsTrigger value="upload"><UploadCloud className="h-4 w-4 mr-1.5" /> Upload</TabsTrigger>
              <TabsTrigger value="github"><GitBranch className="h-4 w-4 mr-1.5" /> GitHub</TabsTrigger>
            </TabsList>
            <TabsContent value="paste">
              <Label className="mt-3 block">Policy code (Rego / YAML / JSON / Cedar)</Label>
              <Textarea name="code" rows={12} value={code} onChange={(e) => setCode(e.target.value)} className="font-mono text-xs" placeholder={'package aigovops.example\n\ndefault allow = false\n\nallow {\n  input.actor.role == "reviewer"\n}'} />
            </TabsContent>
            <TabsContent value="upload">
              <Label className="mt-3 block">Files (.rego, .yaml, .json, .cedar, .md)</Label>
              <Input type="file" name="files" multiple accept=".rego,.yaml,.yml,.json,.cedar,.md,.txt" />
              <div className="text-xs text-muted-foreground mt-2 font-mono">Up to 25 files, 200KB each.</div>
            </TabsContent>
            <TabsContent value="github">
              <Label className="mt-3 block">Public GitHub URL</Label>
              <Input name="repo_url" placeholder="https://github.com/owner/repo or .../tree/branch/path" />
              <div className="text-xs text-muted-foreground mt-2 font-mono">Pulls .rego/.yaml/.json/.cedar/.md files (max 25).</div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => nav("/dashboard")}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit for review"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
};

export default Submit;
