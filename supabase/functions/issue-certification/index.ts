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

    // Risk tier — submitter's declared tier (from review) + agent-derived tier.
    // Insurers price against the disagreement: a self-classified Medium that the
    // platform derives as High is the strongest underwriting signal in this dataset.
    const { data: reviewTierRow } = await admin.from("reviews")
      .select("risk_tier_declared").eq("id", reviewId).maybeSingle();
    const riskTierDeclared = (reviewTierRow?.risk_tier_declared ?? null) as string | null;
    const { data: derivedTierRaw } = await admin.rpc("derive_risk_tier", { _review_id: reviewId });
    const riskTierDerived = (derivedTierRaw ?? "medium") as string;

    // 12-month expiry (NAIC AI Bulletin practice + matches QAGAC re-attestation cycle)
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt);
    expiresAt.setUTCMonth(expiresAt.getUTCMonth() + 12);

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

    // ---------- Build PDF (Aurora style) ----------
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Aurora palette (matches src/index.css tokens, converted from HSL → approx RGB)
    const COLOR = {
      indigoDeep: [14, 16, 38] as [number, number, number],     // #0E1026
      indigo:     [55, 65, 168] as [number, number, number],    // ~ hsl(232 52% 44%)
      emerald:    [16, 185, 129] as [number, number, number],   // primary
      violet:     [139, 92, 246] as [number, number, number],   // secondary
      gold:       [212, 175, 55] as [number, number, number],   // accent
      goldSoft:   [240, 215, 140] as [number, number, number],
      ink:        [20, 22, 36] as [number, number, number],
      muted:      [110, 116, 140] as [number, number, number],
      hairline:   [228, 230, 240] as [number, number, number],
    };
    const setFill = (rgb: [number, number, number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    const setText = (rgb: [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    const setStroke = (rgb: [number, number, number]) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

    // ---- Aurora header band: layered indigo → emerald simulated via stacked bars
    setFill(COLOR.indigoDeep); doc.rect(0, 0, W, 96, "F");
    // Emerald glow band (lower edge)
    setFill(COLOR.indigo); doc.rect(0, 70, W, 16, "F");
    setFill(COLOR.emerald); doc.rect(0, 84, W, 6, "F");
    setFill(COLOR.gold); doc.rect(0, 90, W, 2, "F");

    // Header text (white)
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); setText([255, 255, 255]);
    doc.text("Compliance Certification", 60, 44);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); setText([200, 210, 240]);
    doc.text("AiGovOps · Co-signed by the Chief Auditors of the Agent Council", 60, 62);

    // Gold seal (top right)
    const sealCx = W - 70, sealCy = 48, sealR = 28;
    setFill(COLOR.gold); doc.circle(sealCx, sealCy, sealR, "F");
    setFill(COLOR.indigoDeep); doc.circle(sealCx, sealCy, sealR - 4, "F");
    setStroke(COLOR.goldSoft); doc.setLineWidth(1.2); doc.circle(sealCx, sealCy, sealR - 8, "S");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); setText(COLOR.goldSoft);
    doc.text("AOS", sealCx, sealCy - 3, { align: "center" });
    doc.text(aosVersion.toUpperCase(), sealCx, sealCy + 8, { align: "center" });

    setText(COLOR.ink);
    let y = 124;

    // Verdict banner (uses Aurora-tinted accent stripe)
    const verdictColor: Record<string, [number, number, number]> = {
      pass: [22, 163, 74],
      pass_with_compensations: [217, 119, 6],
      fail: [220, 38, 38],
    };
    const c = verdictColor[verdict] ?? [80, 80, 80];
    setFill(c); doc.roundedRect(50, y, W - 100, 42, 6, 6, "F");
    setText([255, 255, 255]); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text(`Determination: ${verdict.toUpperCase().replace(/_/g, " ")}`, W / 2, y + 27, { align: "center" });
    setText(COLOR.ink); y += 60;

    // ---- Risk-tier banner: declared vs derived (the underwriting signal)
    const tierLabel = (t: string | null) => (t ? t.toUpperCase() : "—");
    const tierAgree = riskTierDeclared && riskTierDeclared === riskTierDerived;
    const bannerHeight = 56;
    setFill([245, 247, 252]); doc.roundedRect(50, y, W - 100, bannerHeight, 4, 4, "F");
    // Left vertical accent bar — gold if agree, violet if disagree
    setFill(tierAgree ? COLOR.emerald : COLOR.violet);
    doc.rect(50, y, 4, bannerHeight, "F");

    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); setText(COLOR.muted);
    doc.text("RISK TIER", 64, y + 14);

    // Declared
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); setText(COLOR.muted);
    doc.text("Declared by submitter", 64, y + 28);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); setText(COLOR.ink);
    doc.text(tierLabel(riskTierDeclared), 64, y + 46);

    // Arrow
    doc.setFont("helvetica", "normal"); doc.setFontSize(14); setText(COLOR.muted);
    doc.text("→", W / 2 - 10, y + 38);

    // Derived
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); setText(COLOR.muted);
    doc.text("Derived by Agent Council", W / 2 + 30, y + 28);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    setText(tierAgree ? COLOR.emerald : COLOR.violet);
    doc.text(tierLabel(riskTierDerived), W / 2 + 30, y + 46);

    // Right-side verdict tag
    const agreeLabel = riskTierDeclared
      ? (tierAgree ? "AGREE" : "DISAGREE — underwriting signal")
      : "NO DECLARATION";
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    setText(tierAgree ? COLOR.emerald : COLOR.violet);
    doc.text(agreeLabel, W - 60, y + 46, { align: "right" });
    setText(COLOR.ink);
    y += bannerHeight + 18;

    // ---- Meta block
    const rows: Array<[string, string]> = [
      ["Organization", organization],
      ["Scope", scopeStatement],
      ["AOS Version", aosVersion],
      ["Scenarios", (review.scenarios ?? []).join(", ") || "general"],
      ["Findings", `${conf.total_findings ?? 0} total · ${conf.critical ?? 0} critical · ${conf.high ?? 0} high · ${conf.medium ?? 0} medium`],
      ["Compensating controls", String(conf.compensations ?? 0)],
      ["Review ID", reviewId],
      ["Issued", issuedAt.toUTCString()],
      ["Expires", `${expiresAt.toUTCString()}  (12-month cycle)`],
      ["Trigger", trigger === "auto" ? "Automatic on Quick Audit completion" : "Manual re-issue"],
    ];
    doc.setFontSize(10);
    for (const [k, v] of rows) {
      doc.setFont("helvetica", "bold"); setText(COLOR.ink); doc.text(`${k}:`, 60, y);
      doc.setFont("helvetica", "normal");
      y = wrapPdfText(doc, String(v), W - 220, 170, y, 12);
      y += 2;
    }

    y += 8;
    setStroke(COLOR.hairline); doc.line(50, y, W - 50, y); y += 16;

    // ---- Findings summary (top 6)
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); setText(COLOR.ink);
    doc.text("Top findings", 60, y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const top = (findings ?? [])
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as Record<string, number>;
        return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
      })
      .slice(0, 6);
    if (!top.length) {
      setText(COLOR.muted);
      doc.text("No agent findings recorded for this review.", 60, y); y += 14;
      setText(COLOR.ink);
    } else {
      for (const f of top) {
        const tag = `[${f.severity.toUpperCase()}] ${f.aos_control_id ? f.aos_control_id + " · " : ""}${f.agent_name}`;
        doc.setFont("helvetica", "bold"); doc.text(tag, 60, y); y += 11;
        doc.setFont("helvetica", "normal");
        y = wrapPdfText(doc, f.title, W - 120, 60, y, 11);
        y += 3;
        if (y > H - 220) break;
      }
    }

    // Canonical content hash (must be computed BEFORE writing signatures so they
    // certify content, not the bytes that contain themselves).
    const canonicalCertBody = JSON.stringify({
      review_id: reviewId,
      organization,
      scope_statement: scopeStatement,
      aos_version: aosVersion,
      determination: verdict,
      conformance: conf,
      risk_tier_declared: riskTierDeclared,
      risk_tier_derived: riskTierDerived,
      expires_at: expiresAt.toISOString(),
      chain_manifest: chainManifest.map((r: any) => ({
        event: r.event, prev_hash: r.prev_hash, entry_hash: r.entry_hash, signature: r.signature, created_at: r.created_at,
      })),
      issued_at: issuedAt.toISOString(),
    });
    const contentHash = await sha256Hex(enc.encode(canonicalCertBody));
    const kenSig = await hmacHex(`${signingKey}::ken-newton`, contentHash);
    const bobSig = await hmacHex(`${signingKey}::bob-smith`, contentHash);

    // ---------- Signature page (with portrait silhouettes) ----------
    if (y > H - 280) { doc.addPage(); y = 60; } else { y += 16; }
    setStroke(COLOR.hairline); doc.line(50, y, W - 50, y); y += 18;
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); setText(COLOR.ink);
    doc.text("Co-signed by the Chief Auditors", 60, y); y += 18;

    // Vector portrait silhouette: indigo medallion with emerald ring + gold initial.
    // (Can't bundle binary images in a Deno function without a fetch round-trip;
    // a stylised vector bust keeps the cert self-contained and on-brand.)
    const drawPortrait = (cx: number, cy: number, initial: string, accent: [number, number, number]) => {
      // Outer gold ring
      setFill(COLOR.gold); doc.circle(cx, cy, 26, "F");
      // Indigo medallion
      setFill(COLOR.indigoDeep); doc.circle(cx, cy, 23, "F");
      // Emerald accent ring
      setStroke(accent); doc.setLineWidth(1.5); doc.circle(cx, cy, 19, "S");
      // Bust silhouette — head + shoulders, in soft gold
      setFill(COLOR.goldSoft);
      doc.circle(cx, cy - 5, 7, "F"); // head
      // Shoulders: rounded rectangle clipped by medallion edge (approx with ellipse)
      doc.ellipse(cx, cy + 13, 14, 8, "F");
      // Initial in lower-right gold pip
      setFill(COLOR.gold); doc.circle(cx + 18, cy + 18, 7, "F");
      setText(COLOR.indigoDeep); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text(initial, cx + 18, cy + 21, { align: "center" });
    };

    const sigBlock = (
      portraitCx: number, portraitCy: number, initial: string, accent: [number, number, number],
      name: string, role: string, sig: string, blockX: number,
    ) => {
      drawPortrait(portraitCx, portraitCy, initial, accent);
      const tx = blockX + 64;
      doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); setText(COLOR.ink);
      doc.text(name, tx, portraitCy - 8);
      doc.setFont("helvetica", "italic"); doc.setFontSize(9); setText(COLOR.muted);
      doc.text(role, tx, portraitCy + 4);
      // Signature line + sig hash
      setStroke(COLOR.hairline); doc.setLineWidth(0.6);
      doc.line(tx, portraitCy + 18, blockX + 220, portraitCy + 18);
      doc.setFont("courier", "normal"); doc.setFontSize(7); setText(COLOR.muted);
      const shortSig = sig.length > 48 ? `${sig.slice(0, 24)}…${sig.slice(-20)}` : sig;
      doc.text(shortSig, tx, portraitCy + 28);
      setText(COLOR.ink);
    };

    // Two side-by-side signature blocks
    const blockY = y + 30;
    sigBlock(82, blockY, "K", COLOR.emerald, ken.display_name, ken.role_title, kenSig, 56);
    sigBlock(W / 2 + 26, blockY, "B", COLOR.violet, bob.display_name, bob.role_title, bobSig, W / 2);
    y = blockY + 50;

    // Full sig hashes in fine print (auditors can verify via /verify)
    doc.setFont("courier", "normal"); doc.setFontSize(7); setText(COLOR.muted);
    y = wrapPdfText(doc, `Ken signature (HMAC-SHA256): ${kenSig}`, W - 120, 60, y, 9);
    y = wrapPdfText(doc, `Bob signature (HMAC-SHA256): ${bobSig}`, W - 120, 60, y, 9);
    y = wrapPdfText(doc, `Content sha256:              ${contentHash}`, W - 120, 60, y, 9);
    y += 8;
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); setText(COLOR.muted);
    doc.text("Demonstration signatures — HMAC-SHA256 over the canonical content hash. Ed25519 upgrade pending.", 60, y);
    setText(COLOR.ink);

    // ---------- Chain of custody page ----------
    doc.addPage();
    // Slim Aurora ribbon at top of subsequent pages for brand continuity
    setFill(COLOR.indigoDeep); doc.rect(0, 0, W, 28, "F");
    setFill(COLOR.emerald); doc.rect(0, 26, W, 2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); setText([255, 255, 255]);
    doc.text("AiGovOps · Compliance Certification · Chain of Custody", 60, 18);
    setText(COLOR.ink);
    y = 60;

    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("Chain of custody", 60, y); y += 18;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); setText(COLOR.muted);
    doc.text(`Snapshot of every audit_log entry for this review at issue time. Each row's prev_hash equals the previous`, 60, y); y += 11;
    doc.text(`row's entry_hash, forming an HMAC-chained tamper-evident log.`, 60, y); y += 16;
    setText(COLOR.ink); doc.setFontSize(8); doc.setFont("courier", "normal");

    if (!chainManifest.length) {
      doc.text("(no audit entries — review may pre-date hash chaining)", 60, y); y += 12;
    } else {
      for (const r of chainManifest as any[]) {
        const ts = new Date(r.created_at).toISOString();
        const line1 = `${ts}  ${r.event}  by:${r.actor_kind}`;
        const line2 = `   prev:  ${r.prev_hash ?? "(none)"}`;
        const line3 = `   entry: ${r.entry_hash ?? "(none)"}`;
        if (y > H - 80) {
          doc.addPage();
          setFill(COLOR.indigoDeep); doc.rect(0, 0, W, 28, "F");
          setFill(COLOR.emerald); doc.rect(0, 26, W, 2, "F");
          doc.setFont("helvetica", "bold"); doc.setFontSize(10); setText([255, 255, 255]);
          doc.text("AiGovOps · Compliance Certification · Chain of Custody (cont.)", 60, 18);
          setText(COLOR.ink); doc.setFont("courier", "normal"); doc.setFontSize(8);
          y = 60;
        }
        doc.text(line1, 60, y); y += 10;
        doc.text(line2, 60, y); y += 10;
        doc.text(line3, 60, y); y += 14;
      }
    }

    // ---------- Verifier footer on EVERY page (QR + /verify link) ----------
    const verifierUrl = `${new URL(req.url).origin.replace(/\/functions\/v1$/, "")}/verify/${reviewId}`;
    const qrData = await QRCode.toDataURL(verifierUrl, { margin: 1, width: 200, color: { dark: "#0E1026", light: "#FFFFFF" } });
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      // Footer divider
      setStroke(COLOR.hairline); doc.setLineWidth(0.5);
      doc.line(50, H - 64, W - 50, H - 64);
      // QR (right)
      doc.addImage(qrData, "PNG", W - 110, H - 56, 46, 46);
      // Verifier text (left)
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); setText(COLOR.indigoDeep);
      doc.text("Independently verify this certificate", 60, H - 46);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); setText(COLOR.muted);
      doc.text("Open the OSS verifier and confirm the content hash + signatures.", 60, H - 34);
      doc.setFont("courier", "normal"); doc.setFontSize(7.5); setText(COLOR.indigo);
      doc.text(verifierUrl, 60, H - 22);
      // Page number (centered)
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); setText(COLOR.muted);
      doc.text(`Page ${p} of ${pageCount}`, W / 2, H - 14, { align: "center" });
      setText(COLOR.ink);
    }

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
        risk_tier_declared: riskTierDeclared,
        risk_tier_derived: riskTierDerived,
        expires_at: expiresAt.toISOString(),
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
      risk_tier_declared: riskTierDeclared as any,
      risk_tier_derived: riskTierDerived as any,
      expires_at: expiresAt.toISOString(),
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
