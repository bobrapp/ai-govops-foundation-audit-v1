// Verify the signed audit chain for a review.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyChain } from "../_shared/audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const secret = Deno.env.get("AUDIT_SIGNING_KEY");
    if (!secret) throw new Error("AUDIT_SIGNING_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    // RLS will scope to reviews the caller can see
    const { data, error } = await userClient
      .from("audit_log")
      .select("event, actor_id, actor_kind, review_id, payload, prev_hash, entry_hash, signature, created_at")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    const result = await verifyChain(secret, data ?? []);
    return new Response(JSON.stringify({ count: data?.length ?? 0, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
