// AIGovOps multi-agent review pipeline.
// Calls Lovable AI Gateway with structured tool-calling per specialist agent.
// Every audit entry is HMAC-signed and chained.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { insertSignedAudit } from "../_shared/audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type Severity = "info" | "low" | "medium" | "high" | "critical";

interface AgentSpec {
  name: string;
  systemPrompt: string;
  toolName: string;
  toolDescription: string;
  scenarioFocus?: string;
}

const findingsSchema = (extraProps: Record<string, unknown> = {}, controlIds: string[] = []) => ({
  type: "object",
  properties: {
    summary: { type: "string", description: "1-2 sentence summary of overall findings." },
    score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "0-100. 100 = fully compliant / no risk.",
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          severity: { type: "string", enum: ["info", "low", "medium", "high", "critical"] },
          category: { type: "string" },
          message: { type: "string", description: "Clear, business-impact framed explanation." },
          evidence: { type: "string", description: "Quoted snippet or line reference from the policy." },
          frameworks: {
            type: "array",
            items: { type: "string" },
            description: "Refs like 'EU AI Act Art. 9', 'NIST AI RMF GOVERN-1.4', 'ISO 42001 6.1.2', 'HIPAA §164.312'.",
          },
          aos_control_id: controlIds.length
            ? {
                type: "string",
                enum: controlIds,
                description: "Most relevant AOS control id from the active catalog. Pick the single best match.",
              }
            : { type: "string", description: "AOS control id if applicable." },
          recommendation: { type: "string" },
          ...extraProps,
        },
        required: ["title", "severity", "message", "recommendation"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "score", "findings"],
  additionalProperties: false,
});

const AGENTS: AgentSpec[] = [
  {
    name: "Policy Linter",
    toolName: "report_lint",
    toolDescription: "Report syntactic, structural, and authoring issues in the policy-as-code.",
    systemPrompt:
      "You are a policy-as-code linter for OPA/Rego, YAML, JSON, and Cedar. Identify syntax errors, missing metadata (package, version, owner, description), unscoped rules, dead code, missing test hooks, and unsafe defaults (e.g. 'default allow = true'). Be specific and quote evidence.",
  },
  {
    name: "Risk & Ethics Assessor",
    toolName: "report_risk",
    toolDescription: "Score AI risk and ethics dimensions of the policy.",
    systemPrompt:
      "You are an AI risk & ethics auditor. Score the policy against bias mitigation, transparency, human oversight, hallucination/output reliability, data minimization, and safety. Flag where the policy permits behavior that could cause user harm, discrimination, or unsafe automation.",
  },
  {
    name: "Compliance Mapper",
    toolName: "report_compliance",
    toolDescription: "Map policy clauses to regulatory frameworks and identify gaps.",
    systemPrompt:
      "You are a compliance mapper. Map clauses in the supplied policy-as-code to: EU AI Act (Articles 9, 13, 14, 15), NIST AI RMF (GOVERN, MAP, MEASURE, MANAGE), ISO 42001, SOC 2 CC, and HIPAA where applicable. For each finding, name the framework + clause in the 'frameworks' array. Flag missing controls.",
  },
  {
    name: "Scenario Risk Analyst",
    toolName: "report_scenarios",
    toolDescription: "Evaluate against high-risk deployment scenarios.",
    systemPrompt:
      "You are a deployment scenario risk analyst. For each selected scenario, identify whether the policy adequately controls the AI behaviors that create LEGAL, INSURABLE, or HR risk. Scenarios you must evaluate (only those provided):\n" +
      "- enterprise_oss: An enterprise installs an open-source AI tool (e.g. OpenCLAW). Risks: dependency provenance, license, model supply chain, telemetry leakage.\n" +
      "- healthcare_codegen: AI generates code or content in a regulated healthcare environment. Risks: HIPAA violations, PHI leakage, FDA SaMD classification, audit trail.\n" +
      "- generative_ip: AI generates music, art, images, video the org wants to assert copyright over. Risks: training data provenance, human authorship test, registration evidence chain.\n" +
      "- hr_behavior: AI-driven decisions or content that could trigger HR/employment liability (discrimination, harassment, hostile workplace). Risks: bias in screening, monitoring overreach, EEOC exposure.\n" +
      "For each gap, set 'scenario' to the matching tag.",
  },
];

async function callGatewayWithTool(
  agent: AgentSpec,
  policyText: string,
  scenarios: string[],
  apiKey: string,
  controlCatalog: Array<{ control_id: string; objective: string; domain: string }>,
) {
  const isScenario = agent.name === "Scenario Risk Analyst";
  const controlIds = controlCatalog.map((c) => c.control_id);
  const toolParams = isScenario
    ? findingsSchema({
        scenario: {
          type: "string",
          enum: ["enterprise_oss", "healthcare_codegen", "generative_ip", "hr_behavior", "general"],
        },
      }, controlIds)
    : findingsSchema({}, controlIds);

  const catalogText = controlCatalog.length
    ? "\n\n--- ACTIVE AOS CONTROL CATALOG (tag every finding with the most relevant control_id) ---\n" +
      controlCatalog.map((c) => `${c.control_id} [${c.domain}] ${c.objective}`).join("\n")
    : "";

  const userContent = (isScenario
    ? `Selected scenarios: ${scenarios.join(", ") || "general"}\n\n--- POLICY-AS-CODE ---\n${policyText}`
    : `--- POLICY-AS-CODE ---\n${policyText}`) + catalogText;

  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: agent.systemPrompt },
      { role: "user", content: userContent },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: agent.toolName,
          description: agent.toolDescription,
          parameters: toolParams,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: agent.toolName } },
  };

  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gateway ${resp.status}: ${text.slice(0, 400)}`);
  }
  const data = await resp.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error(`Agent ${agent.name} returned no tool call`);
  const args = JSON.parse(call.function.arguments);
  return args as {
    summary: string;
    score: number;
    findings: Array<{
      title: string;
      severity: Severity;
      category?: string;
      message: string;
      evidence?: string;
      frameworks?: string[];
      recommendation: string;
      scenario?: string;
      aos_control_id?: string;
    }>;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { reviewId } = await req.json();
    if (!reviewId) {
      return new Response(JSON.stringify({ error: "reviewId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const signingKey = Deno.env.get("AUDIT_SIGNING_KEY");
    if (!signingKey) throw new Error("AUDIT_SIGNING_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: review, error: rErr } = await admin
      .from("reviews")
      .select("*")
      .eq("id", reviewId)
      .single();
    if (rErr || !review) throw new Error("review not found");

    const { data: artifacts } = await admin
      .from("review_artifacts")
      .select("file_path, language, content")
      .eq("review_id", reviewId);

    const policyText =
      (artifacts ?? [])
        .map((a) => `# FILE: ${a.file_path} (${a.language ?? "text"})\n${a.content}`)
        .join("\n\n") || "(no artifacts)";

    // Load active AOS catalog
    const { data: activeVersionRow } = await admin
      .from("aos_versions").select("id, version").eq("status", "active")
      .order("created_at", { ascending: false }).limit(1).single();
    const aosVersion: string = activeVersionRow?.version ?? "unspecified";
    const { data: catalogRows } = await admin
      .from("aos_controls").select("control_id, objective, domain")
      .eq("version_id", activeVersionRow?.id ?? "00000000-0000-0000-0000-000000000000")
      .order("control_id");
    const controlCatalog = catalogRows ?? [];

    // Load scenario packs matching this review's tagged scenarios
    const reviewScenarios: string[] = (review.scenarios ?? []).filter((s: string) => s !== "general");
    let scenarioPackText = "";
    if (reviewScenarios.length) {
      const { data: packs } = await admin
        .from("scenario_packs").select("scenario, name, scenario_pack_controls(control_ref, framework, objective, severity_if_missing, aos_control_hint)")
        .in("scenario", reviewScenarios);
      if (packs?.length) {
        scenarioPackText = "\n\n--- ACTIVE SCENARIO RULE PACKS (every listed control MUST be evaluated) ---\n" +
          packs.map((p: any) => {
            const items = (p.scenario_pack_controls ?? []).map((c: any) =>
              `  • [${c.framework}] ${c.control_ref} — ${c.objective} (severity if missing: ${c.severity_if_missing}${c.aos_control_hint ? `, hint→${c.aos_control_hint}` : ""})`,
            ).join("\n");
            return `### ${p.name} [${p.scenario}]\n${items}`;
          }).join("\n\n");
      }
    }

    await admin.from("reviews").update({ status: "analyzing" }).eq("id", reviewId);
    await insertSignedAudit(admin, signingKey, {
      review_id: reviewId,
      actor_id: user.id,
      actor_kind: "system",
      event: "pipeline.start",
      payload: { agents: AGENTS.map((a) => a.name), aos_version: aosVersion, controls_loaded: controlCatalog.length },
    });

    // Clear previous findings (re-runs)
    await admin.from("agent_findings").delete().eq("review_id", reviewId);

    let totalScore = 0;
    let agentsRun = 0;

    for (const agent of AGENTS) {
      try {
        const result = await callGatewayWithTool(agent, policyText + scenarioPackText, review.scenarios ?? [], apiKey, controlCatalog);
        totalScore += result.score;
        agentsRun++;

        const rows = result.findings.map((f) => ({
          review_id: reviewId,
          agent_name: agent.name,
          severity: f.severity,
          category: f.category ?? null,
          title: f.title,
          message: f.message,
          evidence: f.evidence ?? null,
          frameworks: f.frameworks ?? [],
          scenario: (f.scenario as string | undefined) ?? null,
          recommendation: f.recommendation,
          aos_control_id: f.aos_control_id ?? null,
          aos_version: aosVersion,
        }));
        if (rows.length) await admin.from("agent_findings").insert(rows);

        await insertSignedAudit(admin, signingKey, {
          review_id: reviewId,
          actor_id: user.id,
          actor_kind: "agent",
          event: "agent.completed",
          payload: { agent: agent.name, score: result.score, findings: result.findings.length, summary: result.summary },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await insertSignedAudit(admin, signingKey, {
          review_id: reviewId,
          actor_id: user.id,
          actor_kind: "agent",
          event: "agent.failed",
          payload: { agent: agent.name, error: msg },
        });
      }
    }

    const overall = agentsRun ? Math.round(totalScore / agentsRun) : 0;
    await admin.from("reviews").update({
      status: "pending_human",
      overall_score: overall,
    }).eq("id", reviewId);

    await insertSignedAudit(admin, signingKey, {
      review_id: reviewId,
      actor_id: user.id,
      actor_kind: "system",
      event: "pipeline.complete",
      payload: { overall_score: overall, agents_run: agentsRun },
    });

    return new Response(JSON.stringify({ ok: true, overall_score: overall }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("pipeline error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
