// seed-demo — idempotently seeds a demo dataset for the AiGovOps Review Framework.
// Admin-only. Creates: 1 firm, 2 QAGAs (with auth users), 3 reviews (pending / pass_with_comp / fail),
// findings, a compensating control, and one issued attestation. Safe to re-run.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_TAG = "demo:seed-v1";

const DEMO_USERS = [
  { email: "demo.qaga.alpha@aigovops.demo", display_name: "Dr. Ada Lin (Demo QAGA)", organization: "Northstar Audit Partners", role: "qaga" as const },
  { email: "demo.qaga.beta@aigovops.demo", display_name: "Marcus Reyes (Demo QAGA)", organization: "Northstar Audit Partners", role: "qaga" as const },
  { email: "demo.submitter@aigovops.demo", display_name: "Priya Shah (Demo Submitter)", organization: "Helix Health", role: "submitter" as const },
];

const FIRM = {
  name: "Northstar Audit Partners (Demo)",
  jurisdiction: "US-CA",
  contact_email: "contact@northstar.demo",
  website: "https://northstar.demo",
  indemnity_carrier: "Beazley Specialty",
  indemnity_amount_usd: 5_000_000,
  status: "active",
};

const REVIEWS = [
  {
    title: "Helix Health — Triage Bot Policy v3.0 (PENDING)",
    description: "Awaiting QAGA review. Pre-pipeline ingestion.",
    scenarios: ["healthcare_codegen", "hr_behavior"] as const,
    status: "pending_human" as const,
    findings: [
      { severity: "high", agent_name: "compliance", title: "PHI minimization not enforced", message: "Policy permits free-text symptom entry without PHI scrubbing.", scenario: "healthcare_codegen" as const },
      { severity: "medium", agent_name: "risk", title: "Bias evaluation cadence unspecified", message: "No interval defined for re-running EEOC/health-equity test suite.", scenario: "hr_behavior" as const },
    ],
    compensation: false,
    attestation: false,
  },
  {
    title: "Globex Bank — Vector DB Adoption v0.7 (PASS w/ COMP)",
    description: "QAGA reviewed; one compensating control accepted.",
    scenarios: ["enterprise_oss"] as const,
    status: "approved" as const,
    findings: [
      { severity: "critical", agent_name: "compliance", title: "SLSA L3 not met by embedding model image", message: "Provenance attestation missing; mitigated via internal SBOM + signed re-build.", scenario: "enterprise_oss" as const },
      { severity: "low", agent_name: "linter", title: "Deprecated Rego v0 syntax", message: "Use future.keywords for set membership.", scenario: null },
    ],
    compensation: true,
    attestation: true,
    determination: "pass_with_compensations",
  },
  {
    title: "Harmonia Labs — Music Model Release v1.4 (FAIL)",
    description: "Insufficient provenance; flagged by Generative IP pack.",
    scenarios: ["generative_ip"] as const,
    status: "rejected" as const,
    findings: [
      { severity: "critical", agent_name: "compliance", title: "C2PA manifest not signed", message: "Provenance chain broken — DMCA exposure unresolved.", scenario: "generative_ip" as const },
      { severity: "critical", agent_name: "scenarios", title: "Style mimicry without artist opt-in", message: "Living-artist style prompts allowed with no consent ledger.", scenario: "generative_ip" as const },
      { severity: "high", agent_name: "risk", title: "Royalty ledger absent", message: "Commercial generation permitted without ledger entry.", scenario: "generative_ip" as const },
    ],
    compensation: false,
    attestation: true,
    determination: "fail",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (claimsErr || !claims?.claims?.sub) return json({ error: "unauthorized" }, 401);

  const callerId = claims.claims.sub as string;
  const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", { _user_id: callerId, _role: "admin" });
  if (roleErr || !isAdmin) return json({ error: "admin only" }, 403);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const log: string[] = [];

  try {
    // 1) Auth users (idempotent: create or fetch)
    const userIdByEmail = new Map<string, string>();
    for (const u of DEMO_USERS) {
      let userId: string | undefined;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: u.email,
        password: crypto.randomUUID() + "Aa1!",
        email_confirm: true,
        user_metadata: { display_name: u.display_name, organization: u.organization, demo: DEMO_TAG },
      });
      if (createErr) {
        // Already exists — find it
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        userId = list?.users.find((x) => x.email === u.email)?.id;
        if (!userId) throw new Error(`could not create or find ${u.email}: ${createErr.message}`);
        log.push(`user exists: ${u.email}`);
      } else {
        userId = created.user!.id;
        log.push(`user created: ${u.email}`);
      }
      userIdByEmail.set(u.email, userId!);

      // Ensure profile reflects demo display/org (handle_new_user trigger sets these on insert only)
      await admin.from("profiles").upsert({
        id: userId,
        display_name: u.display_name,
        organization: u.organization,
      }, { onConflict: "id" });
    }

    // 2) Firm (idempotent by name)
    const { data: existingFirm } = await admin.from("qagac_firms").select("id").eq("name", FIRM.name).maybeSingle();
    let firmId = existingFirm?.id;
    if (!firmId) {
      const { data: f, error: fe } = await admin.from("qagac_firms").insert({
        ...FIRM,
        charter_at: new Date().toISOString(),
      }).select("id").single();
      if (fe) throw fe;
      firmId = f.id;
      log.push("firm created");
    } else {
      log.push("firm exists");
    }

    // 3) QAGAs (one per qaga email)
    const qagaIds: string[] = [];
    for (const u of DEMO_USERS.filter((x) => x.role === "qaga")) {
      const userId = userIdByEmail.get(u.email)!;
      const { data: existing } = await admin.from("qaga_assessors").select("id").eq("user_id", userId).maybeSingle();
      let aid = existing?.id;
      const now = new Date();
      const expires = new Date(now.getTime() + 730 * 24 * 3600 * 1000).toISOString();
      const payload = {
        user_id: userId,
        display_name: u.display_name,
        firm_id: firmId,
        jurisdiction: "US-CA",
        training_level: "qaga",
        training_completed_at: now.toISOString(),
        exam_passed_at: now.toISOString(),
        qaga_credential_id: `QAGA-DEMO-${u.email.split("@")[0].toUpperCase()}`,
        qaga_issued_at: now.toISOString(),
        qaga_expires_at: expires,
        status: "active",
        public_listed: true,
      };
      if (!aid) {
        const { data, error } = await admin.from("qaga_assessors").insert(payload).select("id").single();
        if (error) throw error;
        aid = data.id;
        log.push(`qaga created: ${u.email}`);
      } else {
        await admin.from("qaga_assessors").update(payload).eq("id", aid);
        log.push(`qaga updated: ${u.email}`);
      }
      qagaIds.push(aid!);
    }

    // 4) Reviews + artifacts + findings + engagements + compensations + attestations
    const submitterId = userIdByEmail.get("demo.submitter@aigovops.demo")!;
    const reviewIds: string[] = [];

    for (let i = 0; i < REVIEWS.length; i++) {
      const r = REVIEWS[i];
      // Idempotent by exact title
      const { data: existing } = await admin.from("reviews").select("id").eq("title", r.title).maybeSingle();
      let rid = existing?.id;
      if (!rid) {
        const { data, error } = await admin.from("reviews").insert({
          submitter_id: submitterId,
          title: r.title,
          description: r.description,
          source_type: "paste",
          scenarios: r.scenarios,
          status: r.status,
        }).select("id").single();
        if (error) throw error;
        rid = data.id;
        await admin.from("review_artifacts").insert({
          review_id: rid,
          file_path: "policy.rego",
          language: "rego",
          content: `# Demo policy for "${r.title}"\npackage aigovops.demo\n\ndefault allow = false\n`,
        });
        for (const f of r.findings) {
          await admin.from("agent_findings").insert({
            review_id: rid,
            agent_name: f.agent_name,
            title: f.title,
            message: f.message,
            severity: f.severity,
            scenario: f.scenario,
          });
        }
        log.push(`review created: ${r.title}`);
      } else {
        log.push(`review exists: ${r.title}`);
      }
      reviewIds.push(rid!);

      // Engagement (active) — assign to first QAGA for review #1, second for the others
      const assessorId = qagaIds[i === 0 ? 0 : 1];
      const { data: eng } = await admin.from("assessor_engagements").select("id").eq("review_id", rid).maybeSingle();
      if (!eng) {
        await admin.from("assessor_engagements").insert({
          review_id: rid,
          assessor_id: assessorId,
          firm_id: firmId,
          status: r.status === "pending_human" ? "requested" : "active",
          client_org: "Helix Health",
          independence_attestation: r.status === "pending_human" ? null : "Signed independence declaration (demo).",
          independence_declared_at: r.status === "pending_human" ? null : new Date().toISOString(),
          independence_signed_by: r.status === "pending_human" ? null : userIdByEmail.get(DEMO_USERS[i === 0 ? 0 : 1].email),
        });
      }

      // Compensating control on review #2
      if (r.compensation) {
        const { data: existingComp } = await admin.from("compensating_controls").select("id").eq("review_id", rid).maybeSingle();
        if (!existingComp) {
          const { data: critFinding } = await admin.from("agent_findings").select("id").eq("review_id", rid).eq("severity", "critical").maybeSingle();
          await admin.from("compensating_controls").insert({
            review_id: rid,
            finding_id: critFinding?.id ?? null,
            aos_control_id: "AOS-SC-01",
            rationale: "Mitigated via internal signed re-build pipeline; equivalent to SLSA L3. Evidence audited Q1.",
            evidence_url: "https://northstar.demo/evidence/globex-slsa-equivalence.pdf",
            recorded_by: userIdByEmail.get(DEMO_USERS[1].email)!,
            status: "accepted",
          });
        }
      }

      // Attestation row (PDF generation skipped to keep seed fast & dependency-free)
      if (r.attestation) {
        const { data: existingAtt } = await admin.from("attestations").select("id").eq("review_id", rid).maybeSingle();
        if (!existingAtt) {
          await admin.from("attestations").insert({
            review_id: rid,
            organization: "Helix Health",
            scope_statement: `Demo scope for ${r.title}`,
            aos_version: "v0.1-draft",
            determination: r.determination,
            scenarios: r.scenarios,
            qaga_assessor_id: assessorId,
            qaga_firm_id: firmId,
            issued_by: userIdByEmail.get(DEMO_USERS[i === 0 ? 0 : 1].email)!,
          });
        }
      }
    }

    // Audit entry (caller is the admin)
    await admin.from("audit_log").insert({
      review_id: null,
      actor_id: callerId,
      actor_kind: "user",
      event: "demo.seeded",
      payload: { reviews: reviewIds.length, firm: FIRM.name, tag: DEMO_TAG },
    });

    return json({ ok: true, log, reviewIds, firmId, qagaIds });
  } catch (e) {
    console.error("seed-demo error", e);
    return json({ error: e instanceof Error ? e.message : String(e), log }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
