// Server-side signed audit entry for human decisions (approve/reject/claim_admin/role_change).
// Frontend posts the event; server verifies auth, signs, and inserts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { insertSignedAudit } from "../_shared/audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_EVENTS = new Set([
  "human.approved",
  "human.rejected",
  "human.requested_changes",
  "admin.claimed",
  "admin.role_assigned",
  "admin.role_revoked",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { reviewId, event, payload } = await req.json();
    if (!event || !ALLOWED_EVENTS.has(event)) {
      return new Response(JSON.stringify({ error: "invalid event" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const signingKey = Deno.env.get("AUDIT_SIGNING_KEY");
    if (!signingKey) throw new Error("AUDIT_SIGNING_KEY missing");

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const result = await insertSignedAudit(admin, signingKey, {
      review_id: reviewId ?? null,
      actor_id: user.id,
      actor_kind: "user",
      event,
      payload: payload ?? {},
    });

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
