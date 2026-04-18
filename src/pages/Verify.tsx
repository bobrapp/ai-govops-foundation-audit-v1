import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Shield, ShieldCheck, ShieldX, Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const FUNCTION_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

const Verify = () => {
  const { reviewId } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reviewId) return;
    fetch(`${FUNCTION_BASE}/verify-chain?reviewId=${encodeURIComponent(reviewId)}`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch((e) => setError(String(e)));
  }, [reviewId]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-accent grid place-items-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold text-sm tracking-tight">AiGovOps Review Framework</div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Public chain verifier</div>
            </div>
          </Link>
          <Link to="/registry" className="text-xs font-mono text-muted-foreground hover:text-foreground">
            Registry <ExternalLink className="inline h-3 w-3" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Audit Chain Verification</h1>
        <div className="text-xs font-mono text-muted-foreground mb-6">review: {reviewId}</div>

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

            {data.attestation && (
              <div className="mt-6 rounded-lg border border-border bg-card-grad p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium">Attestation of AOS Conformance</div>
                  <Badge className={
                    data.attestation.determination === "pass" ? "bg-primary/20 text-primary"
                    : data.attestation.determination === "pass_with_compensations" ? "bg-warning/20 text-warning"
                    : "bg-destructive/20 text-destructive"
                  }>{data.attestation.determination.replace(/_/g, " ")}</Badge>
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

            <div className="mt-6 rounded-lg border border-border bg-card-grad divide-y divide-border">
              {data.results.map((r: any, i: number) => (
                <div key={r.id} className="px-4 py-2 text-sm flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-6">{i + 1}</span>
                  <span className="font-mono text-xs flex-1 text-primary">{r.event}</span>
                  {r.ok ? <span className="text-[10px] font-mono text-primary">✓ valid</span>
                       : <span className="text-[10px] font-mono text-destructive">✗ {r.reason}</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Verify;
