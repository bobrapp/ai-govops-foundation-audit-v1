// unseed-demo — removes everything created by seed-demo (tag: demo:seed-v1).
// Admin-only. Deletes in dependency-safe order: attestations → comp controls →
// engagements → findings → artifacts → reviews → QAGAs → firm → auth users.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAILS = [
  "demo.qaga.alpha@aigovops.demo",
  "demo.qaga.beta@aigovops.demo",
  "demo.submitter@aigovops.demo",
];

const FIRM_NAME = "Northstar Audit Partners (Demo)";

const REVIEW_TITLES = [
  "Helix Health — Triage Bot Policy v3.0 (PENDING)",
  "Globex Bank — Vector DB Adoption v0.7 (PASS w/ COMP)",
  "Harmonia Labs — Music Model Release v1.4 (FAIL)",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

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
    // Find review IDs by exact title
    const { data: reviews } = await admin.from("reviews").select("id, title").in("title", REVIEW_TITLES);
    const reviewIds = (reviews ?? []).map((r) => r.id);
    log.push(`reviews matched: ${reviewIds.length}`);

    if (reviewIds.length > 0) {
      // attestations
      const { count: attCount } = await admin.from("attestations").delete({ count: "exact" }).in("review_id", reviewIds);
      log.push(`attestations deleted: ${attCount ?? 0}`);

      // compensating_controls
      const { count: ccCount } = await admin.from("compensating_controls").delete({ count: "exact" }).in("review_id", reviewIds);
      log.push(`compensating_controls deleted: ${ccCount ?? 0}`);

      // engagements
      const { count: engCount } = await admin.from("assessor_engagements").delete({ count: "exact" }).in("review_id", reviewIds);
      log.push(`engagements deleted: ${engCount ?? 0}`);

      // findings
      const { count: fCount } = await admin.from("agent_findings").delete({ count: "exact" }).in("review_id", reviewIds);
      log.push(`findings deleted: ${fCount ?? 0}`);

      // artifacts
      const { count: aCount } = await admin.from("review_artifacts").delete({ count: "exact" }).in("review_id", reviewIds);
      log.push(`artifacts deleted: ${aCount ?? 0}`);

      // audit_log entries scoped to these reviews
      await admin.from("audit_log").delete().in("review_id", reviewIds);

      // reviews
      const { count: rCount } = await admin.from("reviews").delete({ count: "exact" }).in("id", reviewIds);
      log.push(`reviews deleted: ${rCount ?? 0}`);
    }

    // Resolve demo auth user IDs
    const userIdByEmail = new Map<string, string>();
    let page = 1;
    while (true) {
      const { data: list, error: lerr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (lerr) throw lerr;
      for (const u of list.users) {
        if (u.email && DEMO_EMAILS.includes(u.email)) userIdByEmail.set(u.email, u.id);
      }
      if (!list.users.length || list.users.length < 200) break;
      page++;
      if (page > 10) break;
    }
    const demoUserIds = Array.from(userIdByEmail.values());
    log.push(`demo auth users matched: ${demoUserIds.length}`);

    // Delete QAGAs tied to demo users (if any survived)
    if (demoUserIds.length > 0) {
      const { count: qCount } = await admin.from("qaga_assessors").delete({ count: "exact" }).in("user_id", demoUserIds);
      log.push(`qaga_assessors deleted: ${qCount ?? 0}`);
    }

    // Firm
    const { data: firm } = await admin.from("qagac_firms").select("id").eq("name", FIRM_NAME).maybeSingle();
    if (firm) {
      // Clear any lingering qagas/engagements pointing to this firm
      await admin.from("qaga_assessors").delete().eq("firm_id", firm.id);
      await admin.from("firm_dev_engagements").delete().eq("firm_id", firm.id);
      const { error: fde } = await admin.from("qagac_firms").delete().eq("id", firm.id);
      if (fde) throw fde;
      log.push(`firm deleted: ${FIRM_NAME}`);
    } else {
      log.push("firm: none");
    }

    // Profiles + auth users (last — they cascade out of user_roles)
    if (demoUserIds.length > 0) {
      await admin.from("profiles").delete().in("id", demoUserIds);
      await admin.from("user_roles").delete().in("user_id", demoUserIds);
      for (const uid of demoUserIds) {
        const { error: ue } = await admin.auth.admin.deleteUser(uid);
        if (ue) log.push(`auth delete error ${uid}: ${ue.message}`);
      }
      log.push(`auth users deleted: ${demoUserIds.length}`);
    }

    // Audit
    await admin.from("audit_log").insert({
      review_id: null,
      actor_id: callerId,
      actor_kind: "user",
      event: "demo.unseeded",
      payload: { reviews: reviewIds.length, users: demoUserIds.length, tag: "demo:seed-v1" },
    });

    return json({ ok: true, log });
  } catch (e) {
    console.error("unseed-demo error", e);
    return json({ error: e instanceof Error ? e.message : String(e), log }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
