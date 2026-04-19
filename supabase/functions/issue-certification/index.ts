// issue-certification — Auto-fired by run-agent-pipeline (any verdict ≠ fail) or
// manually invoked from the Review page. Generates a chief-auditor co-signed
// compliance PDF (Ken + Bob), embeds the full chain-of-custody manifest, anchors
// into the existing HMAC audit chain.
//
// Signatures: HMAC-SHA256(AUDIT_SIGNING_KEY + "::" + persona_slug, pdf_sha256)
// Labelled "Demonstration signature — Ed25519 upgrade pending".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import QRCode from "https://esm.sh/qrcode@1.5.3";
import { insertSignedAudit } from "../_shared/audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", bytes));
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toHex(sig);
}

const wrapPdfText = (doc: jsPDF, text: string, maxWidth: number, x: number, y: number, lineHeight = 12) => {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 60; }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { reviewId, organization: orgInput, scopeStatement: scopeInput, trigger = "manual" } = body;
    if (!reviewId) {
      return new Response(JSON.stringify({ error: "reviewId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const signingKey = Deno.env.get("AUDIT_SIGNING_KEY");
    if (!signingKey) throw new Error("AUDIT_SIGNING_KEY missing");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth: manual triggers require auth; auto triggers from the pipeline are trusted (service-role caller).
    let actorId: string | null = null;
    if (trigger === "manual") {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      actorId = user.id;
    }

    // Fetch review + submitter org for default values.
    const { data: review } = await admin.from("reviews")
      .select("id, title, scenarios, status, submitter_id, overall_score, decision_notes")
      .eq("id", reviewId).maybeSingle();
    if (!review) throw new Error("review not found");

    const { data: submitterProfile } = await admin.from("profiles")
      .select("organization, display_name").eq("id", review.submitter_id).maybeSingle();

    const organization = (orgInput?.trim() || submitterProfile?.organization || "Unspecified Organization");
    const scopeStatement = (scopeInput?.trim() || review.title || "Quick Audit scope");

    // Verdict from canonical SQL function.
    const { data: confJson, error: confErr } = await admin.rpc("compute_conformance", { _review_id: reviewId });
    if (confErr) throw confErr;
    const conf = confJson as Record<string, unknown>;
    const verdict = String(conf?.verdict ?? "fail");

    // AOS version
    const { data: aosVer } = await admin.from("aos_versions").select("version").eq("status","active")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    const aosVersion = aosVer?.version ?? "v0.1-draft";

    // Pull chiefs
    const { data: chiefs } = await admin.from("agent_personas")
      .select("slug, display_name, role_title").in("slug", ["ken-newton","bob-smith"]);
    const ken = chiefs?.find((p) => p.slug === "ken-newton");
    const bob = chiefs?.find((p) => p.slug === "bob-smith");
    if (!ken || !bob) throw new Error("Chief auditors Ken and Bob must exist");

    // Snapshot full chain-of-custody manifest at issue time (every audit row for review).
    const { data: chainRows } = await admin.from("audit_log")
      .select("id, event, actor_kind, actor_id, payload, prev_hash, entry_hash, signature, created_at")
      .eq("review_id", reviewId).order("created_at", { ascending: true });
    const chainManifest = chainRows ?? [];

    // Pull a few finding stats for the PDF body.
    const { data: findings } = await admin.from("agent_findings")
      .select("severity, agent_name, title, aos_control_id, frameworks").eq("review_id", reviewId);

    // ---------- Build PDF ----------
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    let y = 56;

    // Header
    doc.setFont("helvetica","bold"); doc.setFontSize(18);
    doc.text("Compliance Certification", W/2, y, { align: "center" }); y += 22;
    doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(110);
    doc.text("AiGovOps · Co-signed by the Chief Auditors of the Agent Council", W/2, y, { align: "center" });
    doc.setTextColor(0); y += 22;

    // Verdict banner
    const verdictColor: Record<string,[number,number,number]> = {
      pass: [22,163,74], pass_with_compensations: [217,119,6], fail: [220,38,38],
    };
    const c = verdictColor[verdict] ?? [80,80,80];
    doc.setFillColor(c[0], c[1], c[2]); doc.rect(50, y, W-100, 38, "F");
    doc.setTextColor(255); doc.setFont("helvetica","bold"); doc.setFontSize(15);
    doc.text(`Determination: ${verdict.toUpperCase().replace(/_/g," ")}`, W/2, y+25, { align: "center" });
    doc.setTextColor(0); y += 56;

    // Meta block
    const rows: Array<[string,string]> = [
      ["Organization", organization],
      ["Scope", scopeStatement],
      ["AOS Version", aosVersion],
      ["Scenarios", (review.scenarios ?? []).join(", ") || "general"],
      ["Findings", `${conf.total_findings ?? 0} total · ${conf.critical ?? 0} critical · ${conf.high ?? 0} high · ${conf.medium ?? 0} medium`],
      ["Compensating controls", String(conf.compensations ?? 0)],
      ["Review ID", reviewId],
      ["Issued", new Date().toUTCString()],
      ["Trigger", trigger === "auto" ? "Automatic on Quick Audit completion" : "Manual re-issue"],
    ];
    doc.setFontSize(10);
    for (const [k,v] of rows) {
      doc.setFont("helvetica","bold"); doc.text(`${k}:`, 60, y);
      doc.setFont("helvetica","normal");
      y = wrapPdfText(doc, String(v), W-220, 170, y, 12);
      y += 2;
    }

    y += 8;
    doc.setDrawColor(220); doc.line(50, y, W-50, y); y += 16;

    // Findings summary (top 6)
    doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.text("Top findings", 60, y); y += 14;
    doc.setFont("helvetica","normal"); doc.setFontSize(9);
    const top = (findings ?? [])
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as Record<string, number>;
        return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
      })
      .slice(0, 6);
    if (!top.length) {
      doc.setTextColor(120);
      doc.text("No agent findings recorded for this review.", 60, y); y += 14;
      doc.setTextColor(0);
    } else {
      for (const f of top) {
        const tag = `[${f.severity.toUpperCase()}] ${f.aos_control_id ? f.aos_control_id + " · " : ""}${f.agent_name}`;
        doc.setFont("helvetica","bold"); doc.text(tag, 60, y); y += 11;
        doc.setFont("helvetica","normal");
        y = wrapPdfText(doc, f.title, W-120, 60, y, 11);
        y += 3;
        if (y > H - 200) break;
      }
    }

    // PDF body must be hashed BEFORE we write the signature blocks (otherwise the
    // hash includes the signatures of itself). Strategy: hash the bytes WITHOUT the
    // signature page, then add the signature page in a second render.
    // Simpler approach: compute the hash over the canonical metadata + manifest
    // (this is what we actually want to certify — the *content*, not the PDF bytes).
    const canonicalCertBody = JSON.stringify({
      review_id: reviewId,
      organization,
      scope_statement: scopeStatement,
      aos_version: aosVersion,
      determination: verdict,
      conformance: conf,
      chain_manifest: chainManifest.map((r: any) => ({
        event: r.event, prev_hash: r.prev_hash, entry_hash: r.entry_hash, signature: r.signature, created_at: r.created_at,
      })),
      issued_at: new Date().toISOString(),
    });
    const contentHash = await sha256Hex(enc.encode(canonicalCertBody));

    // Co-signatures over the content hash.
    const kenSig = await hmacHex(`${signingKey}::ken-newton`, contentHash);
    const bobSig = await hmacHex(`${signingKey}::bob-smith`, contentHash);

    // ---------- Signature page ----------
    if (y > H - 240) { doc.addPage(); y = 60; } else { y += 12; }
    doc.setDrawColor(220); doc.line(50, y, W-50, y); y += 16;
    doc.setFont("helvetica","bold"); doc.setFontSize(11);
    doc.text("Co-signed by the Chief Auditors", 60, y); y += 16;
    doc.setFont("helvetica","normal"); doc.setFontSize(9);

    const sigBlock = (name: string, role: string, sig: string) => {
      doc.setFont("helvetica","bold"); doc.text(name, 60, y); y += 11;
      doc.setFont("helvetica","italic"); doc.setTextColor(110);
      doc.text(role, 60, y); y += 11;
      doc.setFont("courier","normal"); doc.setTextColor(0); doc.setFontSize(8);
      y = wrapPdfText(doc, `sig: ${sig}`, W-120, 60, y, 10);
      doc.setFontSize(9); y += 4;
    };
    sigBlock(ken.display_name, ken.role_title, kenSig);
    sigBlock(bob.display_name, bob.role_title, bobSig);

    doc.setFont("helvetica","italic"); doc.setTextColor(140); doc.setFontSize(8);
    doc.text("Demonstration signatures — HMAC-SHA256 over the canonical content hash. Ed25519 upgrade pending.", 60, y); y += 12;
    doc.setTextColor(0);

    doc.setFont("courier","normal"); doc.setFontSize(8);
    y = wrapPdfText(doc, `content sha256: ${contentHash}`, W-120, 60, y, 10);

    // ---------- Chain of custody page ----------
    doc.addPage(); y = 60;
    doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.text("Chain of custody", 60, y); y += 18;
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`Snapshot of every audit_log entry for this review at issue time. Each row's prev_hash equals the previous`, 60, y); y += 11;
    doc.text(`row's entry_hash, forming an HMAC-chained tamper-evident log.`, 60, y); y += 16;
    doc.setTextColor(0); doc.setFontSize(8); doc.setFont("courier","normal");

    if (!chainManifest.length) {
      doc.text("(no audit entries — review may pre-date hash chaining)", 60, y); y += 12;
    } else {
      for (const r of chainManifest as any[]) {
        const ts = new Date(r.created_at).toISOString();
        const line1 = `${ts}  ${r.event}  by:${r.actor_kind}`;
        const line2 = `   prev:  ${r.prev_hash ?? "(none)"}`;
        const line3 = `   entry: ${r.entry_hash ?? "(none)"}`;
        if (y > H - 80) { doc.addPage(); y = 60; }
        doc.text(line1, 60, y); y += 10;
        doc.text(line2, 60, y); y += 10;
        doc.text(line3, 60, y); y += 14;
      }
    }

    // QR + verifier link on first page footer-ish spot
    const verifierUrl = `${new URL(req.url).origin.replace(/\/functions\/v1$/, "")}/verify/${reviewId}`;
    const qrData = await QRCode.toDataURL(verifierUrl, { margin: 1, width: 200 });
    doc.setPage(1);
    doc.addImage(qrData, "PNG", W - 110, H - 130, 70, 70);
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(120);
    doc.text("Independently verify:", W - 110, H - 50);
    doc.text(verifierUrl, W - 110, H - 40);
    doc.setTextColor(0);

    // Hash the actual PDF bytes too, for storage integrity.
    const pdfBytes = new Uint8Array(doc.output("arraybuffer"));
    const pdfHash = await sha256Hex(pdfBytes);

    const path = `cert/${reviewId}-${Date.now()}.pdf`;
    const { error: upErr } = await admin.storage.from("attestations").upload(path, pdfBytes, {
      contentType: "application/pdf", upsert: true,
    });
    if (upErr) throw upErr;

    // Anchor into the audit chain. Insert FIRST so we can read back our own row's hash.
    const audit = await insertSignedAudit(admin, signingKey, {
      review_id: reviewId,
      actor_id: actorId,
      actor_kind: trigger === "auto" ? "system" : "human",
      event: "certification.issued",
      payload: {
        organization,
        scope_statement: scopeStatement,
        determination: verdict,
        content_sha256: contentHash,
        pdf_sha256: pdfHash,
        signatures: { ken: kenSig, bob: bobSig },
        signature_kind: "hmac-sha256-demo",
        trigger,
        manifest_entries: chainManifest.length,
      },
    });

    // Persist cert row (separate from formal QAGA attestations).
    const { data: cert, error: certErr } = await admin.from("certifications").insert({
      review_id: reviewId,
      organization,
      scope_statement: scopeStatement,
      aos_version: aosVersion,
      determination: verdict,
      scenarios: review.scenarios ?? [],
      pdf_path: path,
      pdf_sha256: pdfHash,
      ken_signature: kenSig,
      bob_signature: bobSig,
      signature_kind: "hmac-sha256-demo",
      audit_entry_hash: audit.entry_hash,
      audit_prev_hash: audit.prev_hash,
      chain_manifest: chainManifest,
      issued_by: actorId,
      trigger_kind: trigger === "auto" ? "auto" : "manual",
    }).select().single();
    if (certErr) throw certErr;

    const { data: pub } = admin.storage.from("attestations").getPublicUrl(path);

    return new Response(JSON.stringify({
      ok: true,
      certificationId: cert.id,
      determination: verdict,
      pdfUrl: pub.publicUrl,
      pdfSha256: pdfHash,
      contentSha256: contentHash,
      signatures: { ken: kenSig, bob: bobSig, kind: "hmac-sha256-demo" },
      auditEntryHash: audit.entry_hash,
      verifyUrl: verifierUrl,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("issue-certification error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
