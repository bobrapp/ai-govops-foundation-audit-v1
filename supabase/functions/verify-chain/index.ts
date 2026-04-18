// Public no-auth chain verifier. Recomputes HMAC chain for a review.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function canonical(payload: unknown): string {
  if (payload === null || typeof payload !== "object") return JSON.stringify(payload);
  if (Array.isArray(payload)) return "[" + payload.map(canonical).join(",") + "]";
  const keys = Object.keys(payload as Record<string, unknown>).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical((payload as Record<string, unknown>)[k])).join(",") + "}";
}

async function hmacSha256Hex(keyStr: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(keyStr),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const reviewId = url.searchParams.get("reviewId");
    if (!reviewId) {
      return new Response(JSON.stringify({ error: "reviewId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const signingKey = Deno.env.get("AUDIT_SIGNING_KEY");
    if (!signingKey) throw new Error("AUDIT_SIGNING_KEY missing");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: entries, error } = await admin
      .from("audit_log")
      .select("id, created_at, actor_kind, event, payload, prev_hash, entry_hash, signature")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    let prev = "GENESIS";
    let valid = true;
    const results = [] as Array<{ id: string; event: string; ok: boolean; reason?: string }>;
    for (const e of entries ?? []) {
      const recomputed = await hmacSha256Hex(signingKey, prev + canonical(e.payload));
      const ok = recomputed === e.entry_hash && recomputed === e.signature && e.prev_hash === prev;
      if (!ok) valid = false;
      results.push({ id: e.id, event: e.event, ok, reason: ok ? undefined : "hash mismatch or chain break" });
      prev = e.entry_hash ?? prev;
    }

    // Attestation summary
    const { data: att } = await admin
      .from("attestations")
      .select("organization, scope_statement, aos_version, determination, scenarios, issued_at, qaga_assessor_id, qaga_firm_id, pdf_path, pdf_sha256")
      .eq("review_id", reviewId)
      .maybeSingle();

    let assessorName: string | null = null;
    let firmName: string | null = null;
    if (att?.qaga_assessor_id) {
      const { data: a } = await admin.from("qaga_assessors").select("display_name").eq("id", att.qaga_assessor_id).maybeSingle();
      assessorName = a?.display_name ?? null;
    }
    if (att?.qaga_firm_id) {
      const { data: f } = await admin.from("qagac_firms").select("name").eq("id", att.qaga_firm_id).maybeSingle();
      firmName = f?.name ?? null;
    }

    return new Response(JSON.stringify({
      reviewId, valid, entries: results.length, results,
      attestation: att ? { ...att, assessor_name: assessorName, firm_name: firmName } : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
