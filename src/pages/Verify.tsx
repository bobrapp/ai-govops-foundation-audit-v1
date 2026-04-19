import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, ShieldX, Loader2, ExternalLink, Download, Sparkles, CheckCircle2, XCircle, Anchor, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PublicShell } from "@/components/PublicShell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/usePageMeta";
import { EDGE_BASE } from "@/lib/config";

interface CertOut {
  id: string;
  determination: string;
  organization: string;
  scope_statement: string;
  aos_version: string;
  scenarios: string[];
  trigger_kind: string;
  signature_kind: string;
  ken_signature: string | null;
  bob_signature: string | null;
  audit_prev_hash: string | null;
  audit_entry_hash: string | null;
  manifest_entries: number;
  issued_at: string;
  pdf_url: string | null;
  pdf_sha256_stored: string | null;
  pdf_sha256_live: string | null;
  pdf_hash_ok: boolean;
  anchor_ok: boolean;
  risk_tier_declared: string | null;
  risk_tier_derived: string | null;
  risk_tier_disagreement: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  status: "active" | "expired" | "revoked";
  days_until_expiry: number | null;
}

const tierTone = (t: string | null) =>
  t === "critical" ? "bg-destructive/15 text-destructive border-destructive/30"
  : t === "high" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
  : t === "medium" ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30"
  : "";

const statusTone = (s: string) =>
  s === "active" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
  : s === "expired" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
  : "bg-destructive/15 text-destructive border-destructive/30";

const determinationTone = (d: string) =>
  d === "pass" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
  : d === "pass_with_compensations" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
  : "bg-destructive/15 text-destructive border-destructive/30";

const Verify = () => {
  const { reviewId } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  usePageMeta({
    title: `Verify chain · ${reviewId?.slice(0, 8) ?? ""}`,
    description: "Public HMAC-SHA256 verification of the audit chain and co-signed compliance certifications for an AiGovOps review.",
    canonical: `/verify/${reviewId ?? ""}`,
  });

  useEffect(() => {
    if (!reviewId) return;
    fetch(`${EDGE_BASE}/verify-chain?reviewId=${encodeURIComponent(reviewId)}`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch((e) => setError(String(e)));
  }, [reviewId]);

  return (
    <PublicShell
      eyebrow="Public chain verifier"
      hero={false}
      rightSlot={
        <Link to="/registry">
          <Button variant="ghost" size="sm">
            Registry <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      }
    >
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <PageHeader
          eyebrow={`review: ${reviewId}`}
          title="Audit Chain Verification"
          description="Independently verify a Review Attestation against the AiGovOps Open Standard. SLSA-style: re-fetches the PDF, recomputes the HMAC chain, and refuses to validate if anything has been touched. No cooperation from the insured required."
        />

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!data && !error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Recomputing HMAC chain…
          </div>
        )}

        {data && (
          <>
            <div className={`rounded-lg border p-5 ${data.valid ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/10"}`}>
              <div className="flex items-center gap-3">
                {data.valid ? <ShieldCheck className="h-7 w-7 text-primary" /> : <ShieldX className="h-7 w-7 text-destructive" />}
                <div>
                  <div className="font-semibold">{data.valid ? "Chain Verified" : "Chain INVALID"}</div>
                  <div className="text-xs font-mono text-muted-foreground">
                    {data.results.filter((r: any) => r.ok).length}/{data.entries} entries valid · HMAC-SHA256
                  </div>
                </div>
              </div>
            </div>

            {/* ---------- Review Attestations (Ken + Bob co-signed) ---------- */}
            {data.certifications?.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" /> Review Attestations · co-signed by Ken &amp; Bob
                </h2>
                {data.certifications.map((c: CertOut) => (
                  <div key={c.id} className="rounded-lg border border-border bg-card-grad p-5 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={determinationTone(c.determination)}>
                          {c.determination.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="outline" className={`font-mono text-[10px] ${statusTone(c.status)}`}>
                          {c.status}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">{c.trigger_kind}</Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">{c.signature_kind}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(c.issued_at).toLocaleString()}</span>
                      </div>
                      {c.pdf_url && (
                        <Button asChild variant="outline" size="sm">
                          <a href={c.pdf_url} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4 mr-1.5" />PDF
                          </a>
                        </Button>
                      )}
                    </div>

                    {/* Risk tier — declared vs derived (insurance-readiness panel) */}
                    <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-2">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Risk tier · EU AI Act-style</div>
                      <div className="grid sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Submitter declared:</span>
                          {c.risk_tier_declared
                            ? <Badge variant="outline" className={tierTone(c.risk_tier_declared)}>{c.risk_tier_declared}</Badge>
                            : <span className="italic text-muted-foreground">not declared</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Agent derived:</span>
                          {c.risk_tier_derived
                            ? <Badge variant="outline" className={tierTone(c.risk_tier_derived)}>{c.risk_tier_derived}</Badge>
                            : <span className="italic text-muted-foreground">—</span>}
                        </div>
                      </div>
                      {c.risk_tier_disagreement && (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          Tier disagreement — underwriting signal (insurer should price against derived).
                        </div>
                      )}
                      {c.expires_at && (
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Expires {new Date(c.expires_at).toLocaleString()}
                          {c.days_until_expiry !== null && c.status === "active" && ` · ${c.days_until_expiry}d remaining`}
                          {c.status === "expired" && " · expired — re-attestation required"}
                        </div>
                      )}
                    </div>

                    <dl className="grid grid-cols-[140px_1fr] gap-y-1.5 text-sm">
                      <dt className="text-muted-foreground">Organization</dt><dd>{c.organization}</dd>
                      <dt className="text-muted-foreground">Scope</dt><dd>{c.scope_statement}</dd>
                      <dt className="text-muted-foreground">AOS Version</dt><dd className="font-mono text-xs">{c.aos_version}</dd>
                      <dt className="text-muted-foreground">Scenarios</dt><dd className="font-mono text-xs">{(c.scenarios ?? []).join(", ") || "general"}</dd>
                      <dt className="text-muted-foreground">Manifest</dt><dd className="font-mono text-xs">{c.manifest_entries} audit row{c.manifest_entries === 1 ? "" : "s"}</dd>
                    </dl>

                    {/* Integrity checks */}
                    <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        {c.pdf_hash_ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                        <span className="font-medium">PDF SHA-256 integrity</span>
                        <span className="text-muted-foreground">
                          {c.pdf_hash_ok ? "stored hash matches live PDF bytes" : c.pdf_sha256_live ? "MISMATCH — file may have been replaced" : "could not fetch live PDF"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {c.anchor_ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                        <span className="font-medium flex items-center gap-1"><Anchor className="h-3 w-3" /> Audit anchor</span>
                        <span className="text-muted-foreground">
                          {c.anchor_ok ? "entry_hash present in live chain" : "anchor row missing from chain"}
                        </span>
                      </div>
                    </div>

                    {/* Co-signatures */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="rounded-md border border-border/60 p-3 space-y-1">
                        <div className="text-xs font-medium">Ken &quot;The Chief&quot; Newton</div>
                        <div className="text-[10px] text-muted-foreground">Chief AIgovops Auditor</div>
                        <div className="font-mono text-[10px] break-all text-muted-foreground pt-1">
                          sig: {c.ken_signature ?? "—"}
                        </div>
                      </div>
                      <div className="rounded-md border border-border/60 p-3 space-y-1">
                        <div className="text-xs font-medium">Bob &quot;Fair Witness&quot; Smith</div>
                        <div className="text-[10px] text-muted-foreground">Co-Chief Fair Witness Auditor</div>
                        <div className="font-mono text-[10px] break-all text-muted-foreground pt-1">
                          sig: {c.bob_signature ?? "—"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-[10px] font-mono text-muted-foreground break-all">
                      <div>pdf sha256 (stored): {c.pdf_sha256_stored ?? "—"}</div>
                      {c.pdf_sha256_live && <div>pdf sha256 (live):   {c.pdf_sha256_live}</div>}
                      <div>audit prev:  {c.audit_prev_hash ?? "—"}</div>
                      <div>audit entry: {c.audit_entry_hash ?? "—"}</div>
                    </div>

                    <p className="text-[10px] text-muted-foreground italic">
                      Demonstration HMAC-SHA256 co-signatures · Ed25519 upgrade pending.
                    </p>
                  </div>
                ))}
              </section>
            )}

            {/* ---------- Formal QAGA Attestation (if any) ---------- */}
            {data.attestation && (
              <div className="rounded-lg border border-border bg-card-grad p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium">Attestation of AOS Conformance · QAGA</div>
                  <Badge variant="outline" className={determinationTone(data.attestation.determination)}>
                    {data.attestation.determination.replace(/_/g, " ")}
                  </Badge>
                </div>
                <dl className="grid grid-cols-[140px_1fr] gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">Organization</dt><dd>{data.attestation.organization}</dd>
                  <dt className="text-muted-foreground">Scope</dt><dd>{data.attestation.scope_statement}</dd>
                  <dt className="text-muted-foreground">AOS Version</dt><dd className="font-mono text-xs">{data.attestation.aos_version}</dd>
                  <dt className="text-muted-foreground">Scenarios</dt><dd className="font-mono text-xs">{(data.attestation.scenarios ?? []).join(", ") || "—"}</dd>
                  <dt className="text-muted-foreground">QAGA</dt><dd>{data.attestation.assessor_name ?? "—"}</dd>
                  <dt className="text-muted-foreground">Firm</dt><dd>{data.attestation.firm_name ?? "—"}</dd>
                  <dt className="text-muted-foreground">Issued</dt><dd>{new Date(data.attestation.issued_at).toLocaleString()}</dd>
                  <dt className="text-muted-foreground">PDF SHA-256</dt><dd className="font-mono text-[10px] break-all">{data.attestation.pdf_sha256 ?? "—"}</dd>
                </dl>
              </div>
            )}

            {/* ---------- Per-entry chain ---------- */}
            <section>
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">Audit chain</h2>
              <div className="rounded-lg border border-border bg-card-grad divide-y divide-border">
                {data.results.map((r: any, i: number) => (
                  <div key={r.id} className="px-4 py-2 text-sm flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-6">{i + 1}</span>
                    <span className="font-mono text-xs flex-1 text-primary">{r.event}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{r.actor_kind}</span>
                    {r.ok ? <span className="text-[10px] font-mono text-primary">✓ valid</span>
                         : <span className="text-[10px] font-mono text-destructive">✗ {r.reason}</span>}
                  </div>
                ))}
                {data.results.length === 0 && (
                  <div className="px-4 py-6 text-sm text-muted-foreground text-center">No audit entries.</div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </PublicShell>
  );
};

export default Verify;
