// Public no-auth chain verifier. Recomputes the HMAC chain for a review using the
// canonical signing format defined in _shared/audit.ts, returns any QAGA attestation,
// AND every co-signed compliance certification (with re-fetched PDF SHA-256 to confirm
// the stored hash matches the bytes currently in storage).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyChain } from "../_shared/audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", bytes));
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ---------- Audit chain ----------
    const { data: entries, error } = await admin
      .from("audit_log")
      .select("id, created_at, actor_id, actor_kind, event, review_id, payload, prev_hash, entry_hash, signature")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const chainResult = await verifyChain(signingKey, (entries ?? []).map((e) => ({
      event: e.event,
      actor_id: e.actor_id,
      actor_kind: e.actor_kind,
      review_id: e.review_id,
      payload: e.payload,
      prev_hash: e.prev_hash,
      entry_hash: e.entry_hash,
      signature: e.signature,
      created_at: e.created_at,
    })));

    const results = (entries ?? []).map((e, i) => ({
      id: e.id,
      event: e.event,
      created_at: e.created_at,
      actor_kind: e.actor_kind,
      ok: chainResult.results[i]?.ok ?? false,
      reason: chainResult.results[i]?.reason,
    }));

    // ---------- QAGA attestation (formal) ----------
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

    // ---------- Compliance certifications (Ken + Bob co-signed) ----------
    const { data: certs } = await admin
      .from("certifications")
      .select("id, determination, organization, scope_statement, aos_version, scenarios, pdf_path, pdf_sha256, ken_signature, bob_signature, signature_kind, trigger_kind, audit_prev_hash, audit_entry_hash, chain_manifest, issued_at")
      .eq("review_id", reviewId)
      .order("issued_at", { ascending: false });

    // Re-fetch each PDF and recompute its SHA-256 to confirm storage integrity.
    // Anchor verification: the cert's audit_entry_hash must exist in the live audit chain.
    const certsOut = await Promise.all((certs ?? []).map(async (c) => {
      let pdfHashLive: string | null = null;
      let pdfHashOk = false;
      let pdfUrl: string | null = null;
      if (c.pdf_path) {
        pdfUrl = `${SUPABASE_URL}/storage/v1/object/public/attestations/${c.pdf_path}`;
        try {
          const resp = await fetch(pdfUrl);
          if (resp.ok) {
            const bytes = new Uint8Array(await resp.arrayBuffer());
            pdfHashLive = await sha256Hex(bytes);
            pdfHashOk = pdfHashLive === c.pdf_sha256;
          }
        } catch {
          // network/fetch failed — leave nulls
        }
      }
      const anchorOk = !!c.audit_entry_hash &&
        (entries ?? []).some((e) => e.entry_hash === c.audit_entry_hash);
      return {
        id: c.id,
        determination: c.determination,
        organization: c.organization,
        scope_statement: c.scope_statement,
        aos_version: c.aos_version,
        scenarios: c.scenarios,
        trigger_kind: c.trigger_kind,
        signature_kind: c.signature_kind,
        ken_signature: c.ken_signature,
        bob_signature: c.bob_signature,
        audit_prev_hash: c.audit_prev_hash,
        audit_entry_hash: c.audit_entry_hash,
        manifest_entries: Array.isArray(c.chain_manifest) ? c.chain_manifest.length : 0,
        issued_at: c.issued_at,
        pdf_url: pdfUrl,
        pdf_sha256_stored: c.pdf_sha256,
        pdf_sha256_live: pdfHashLive,
        pdf_hash_ok: pdfHashOk,
        anchor_ok: anchorOk,
      };
    }));

    return new Response(JSON.stringify({
      reviewId,
      valid: chainResult.ok,
      entries: results.length,
      results,
      attestation: att ? { ...att, assessor_name: assessorName, firm_name: firmName } : null,
      certifications: certsOut,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
