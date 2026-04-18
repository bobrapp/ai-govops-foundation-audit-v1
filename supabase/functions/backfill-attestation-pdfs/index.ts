// Admin-only: regenerate signed PDFs for any attestation row missing pdf_path.
// Reuses the same PDF + QR + audit-chain logic as issue-attestation, but runs
// over existing rows (does NOT call the issue_attestation RPC again).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import QRCode from "https://esm.sh/qrcode@1.5.3";
import { insertSignedAudit } from "../_shared/audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const signingKey = Deno.env.get("AUDIT_SIGNING_KEY");
    if (!signingKey) throw new Error("AUDIT_SIGNING_KEY missing");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find attestations needing a PDF (pdf_path null OR force=true on all)
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;
    const query = admin.from("attestations").select("*");
    const { data: rows, error: qErr } = force ? await query : await query.is("pdf_path", null);
    if (qErr) throw qErr;

    const origin = new URL(req.url).origin.replace(/\/functions\/v1$/, "");
    const generated: Array<{ id: string; review_id: string; pdf_path: string }> = [];

    for (const att of rows ?? []) {
      let assessorName = "QAGA"; let firmName = "QAGAC Firm";
      if (att.qaga_assessor_id) {
        const { data: a } = await admin.from("qaga_assessors").select("display_name").eq("id", att.qaga_assessor_id).maybeSingle();
        assessorName = a?.display_name ?? assessorName;
      }
      if (att.qaga_firm_id) {
        const { data: f } = await admin.from("qagac_firms").select("name").eq("id", att.qaga_firm_id).maybeSingle();
        firmName = f?.name ?? firmName;
      }

      const publicVerifyPage = `${origin}/verify/${att.review_id}`;
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const W = doc.internal.pageSize.getWidth();
      let y = 60;
      doc.setFont("helvetica","bold"); doc.setFontSize(20);
      doc.text("Attestation of AOS Conformance", W/2, y, { align: "center" }); y += 28;
      doc.setFontSize(11); doc.setFont("helvetica","normal");
      doc.text("AiGovOps Review Framework — Policy-as-Code (PAC)", W/2, y, { align: "center" }); y += 30;

      const verdictColor: Record<string,[number,number,number]> = {
        pass: [22,163,74], pass_with_compensations: [217,119,6], fail: [220,38,38],
      };
      const c = verdictColor[att.determination] ?? [80,80,80];
      doc.setFillColor(c[0],c[1],c[2]); doc.rect(60, y, W-120, 36, "F");
      doc.setTextColor(255); doc.setFont("helvetica","bold"); doc.setFontSize(16);
      doc.text(`Determination: ${String(att.determination).toUpperCase().replace(/_/g," ")}`, W/2, y+24, { align: "center" });
      doc.setTextColor(0); y += 56;

      doc.setFont("helvetica","bold"); doc.setFontSize(11);
      const fields: Array<[string,string]> = [
        ["Organization", att.organization],
        ["Scope", att.scope_statement],
        ["AOS Version", att.aos_version],
        ["Scenarios", (att.scenarios ?? []).join(", ") || "general"],
        ["QAGA Assessor", assessorName],
        ["QAGAC Firm", firmName],
        ["Issued", new Date(att.issued_at).toUTCString()],
        ["Attestation ID", att.id],
        ["Review ID", att.review_id],
      ];
      for (const [k,v] of fields) {
        doc.setFont("helvetica","bold"); doc.text(k+":", 70, y);
        doc.setFont("helvetica","normal");
        const lines = doc.splitTextToSize(String(v ?? ""), W-200);
        doc.text(lines, 180, y); y += 14 * lines.length + 4;
      }

      y += 10;
      doc.setDrawColor(200); doc.line(60, y, W-60, y); y += 18;
      doc.setFont("helvetica","italic"); doc.setFontSize(9);
      doc.text("This attestation is cryptographically signed via HMAC-SHA256 chain. Scan QR or visit the URL", 60, y); y += 12;
      doc.text("below to independently verify the audit chain — no login required.", 60, y); y += 18;
      doc.setFont("helvetica","normal"); doc.setFontSize(9);
      doc.text(publicVerifyPage, 60, y); y += 14;

      const qrData = await QRCode.toDataURL(publicVerifyPage, { margin: 1, width: 220 });
      doc.addImage(qrData, "PNG", W-180, y-30, 110, 110);

      y = doc.internal.pageSize.getHeight() - 60;
      doc.setFontSize(8); doc.setTextColor(120);
      doc.text("Generated by AiGovOps Review Framework. AOS v0.1-draft is unofficial.", W/2, y, { align: "center" });

      const pdfBytes = new Uint8Array(doc.output("arraybuffer"));
      const pdfHash = await sha256Hex(pdfBytes);
      const path = `aoc/${att.review_id}.pdf`;
      const { error: upErr } = await admin.storage.from("attestations").upload(path, pdfBytes, {
        contentType: "application/pdf", upsert: true,
      });
      if (upErr) throw upErr;

      await admin.from("attestations").update({ pdf_path: path, pdf_sha256: pdfHash }).eq("id", att.id);

      await insertSignedAudit(admin, signingKey, {
        review_id: att.review_id, actor_id: user.id, actor_kind: "human",
        event: "attestation.pdf_backfilled",
        payload: { attestation_id: att.id, pdf_sha256: pdfHash, organization: att.organization },
      });

      generated.push({ id: att.id, review_id: att.review_id, pdf_path: path });
    }

    return new Response(JSON.stringify({ ok: true, generated: generated.length, items: generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("backfill-attestation-pdfs", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
