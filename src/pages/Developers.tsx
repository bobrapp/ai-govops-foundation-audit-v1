import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ShieldCheck, FileCheck2, Anchor, Package, Github, Copy, Check, ExternalLink } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePageMeta } from "@/hooks/usePageMeta";
import { EDGE_BASE, PROJECT } from "@/lib/config";

/** Default sample reviewId — a passing cert in the live database. */
const SAMPLE_REVIEW_ID = "6b670008-34cb-4c02-a6bf-36e194474507";

interface PdfCheck {
  url: string;
  expected: string;
  actual: string | null;
  ok: boolean;
  bytes: number | null;
  reason?: string;
}

interface VerifyResult {
  reviewId: string;
  server_valid: boolean;
  entries: number;
  certifications_count: number;
  pdfs: PdfCheck[];
  anchors: Array<{ id: string; entry_hash: string; anchored: boolean }>;
  ok: boolean;
  raw: unknown;
}

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // Slice into a fresh ArrayBuffer to satisfy strict BufferSource typing.
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return toHex(await crypto.subtle.digest("SHA-256", buf));
}

/**
 * Browser equivalent of @aigovops/verify's verifyReview() — recomputes PDF
 * SHA-256 and confirms each cert's audit_entry_hash anchor exists in the
 * returned chain. Inlined here so the live demo has zero npm install cost.
 */
async function verifyReviewInBrowser(reviewId: string): Promise<VerifyResult> {
  const resp = await fetch(`${EDGE_BASE}/verify-chain?reviewId=${encodeURIComponent(reviewId)}`);
  if (!resp.ok) throw new Error(`verify-chain returned HTTP ${resp.status}`);
  const data = await resp.json() as {
    reviewId: string;
    valid: boolean;
    entries: number;
    results: Array<{ id: string; event: string; ok: boolean }>;
    certifications: Array<{
      id: string;
      pdf_url: string | null;
      pdf_sha256_stored: string | null;
      audit_entry_hash: string | null;
      anchor_ok: boolean;
    }>;
  };

  const pdfs: PdfCheck[] = [];
  for (const c of data.certifications) {
    if (!c.pdf_url || !c.pdf_sha256_stored) continue;
    try {
      const r = await fetch(c.pdf_url);
      if (!r.ok) {
        pdfs.push({ url: c.pdf_url, expected: c.pdf_sha256_stored, actual: null, ok: false, bytes: null, reason: `HTTP ${r.status}` });
        continue;
      }
      const bytes = new Uint8Array(await r.arrayBuffer());
      const actual = await sha256Hex(bytes);
      pdfs.push({
        url: c.pdf_url,
        expected: c.pdf_sha256_stored,
        actual,
        ok: actual === c.pdf_sha256_stored,
        bytes: bytes.byteLength,
        reason: actual === c.pdf_sha256_stored ? undefined : "sha256 mismatch",
      });
    } catch (e) {
      pdfs.push({ url: c.pdf_url, expected: c.pdf_sha256_stored, actual: null, ok: false, bytes: null, reason: e instanceof Error ? e.message : "fetch failed" });
    }
  }

  const anchors = data.certifications
    .filter((c) => c.audit_entry_hash)
    .map((c) => ({ id: c.id, entry_hash: c.audit_entry_hash!, anchored: c.anchor_ok }));

  const ok = data.valid && pdfs.every((p) => p.ok) && anchors.every((a) => a.anchored);

  return {
    reviewId,
    server_valid: data.valid,
    entries: data.entries,
    certifications_count: data.certifications.length,
    pdfs,
    anchors,
    ok,
    raw: data,
  };
}

function CodeBlock({ children, language = "bash" }: { children: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-muted/50 border border-border rounded-md p-4 text-xs font-mono overflow-x-auto">
        <code className={`language-${language}`}>{children}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={async () => {
          await navigator.clipboard.writeText(children);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

const NPM_URL = `https://www.npmjs.com/package/${PROJECT.verifierPackage}`;
const REPO_VERIFY = `${PROJECT.repoUrl}/tree/main/packages/verify`;
const REPO_WORKFLOW = `${PROJECT.repoUrl}/blob/main/packages/verify/.github/workflows/verify.example.yml`;

const Developers = () => {
  usePageMeta({
    title: "Developers · @aigovops/verify · AiGovOps",
    description:
      "Independent verifier for the AiGovOps Open Standard. Recompute the audit chain, confirm PDF SHA-256, and anchor presence — without trusting the issuing server.",
    canonical: "/developers",
  });

  const [reviewId, setReviewId] = useState(SAMPLE_REVIEW_ID);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const r = await verifyReviewInBrowser(reviewId.trim());
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "verification failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <PublicShell eyebrow="Developers">
      <main className="container max-w-5xl mx-auto pt-12 pb-20 space-y-10">
        <PageHeader
          eyebrow="Open-source verifier"
          title={PROJECT.verifierPackage}
          description="Reference implementation of the AOS verification protocol. Anyone — insurer, regulator, customer, journalist — can independently verify an attestation without trusting the issuing server. Dependency-free, runtime-agnostic, Apache-2.0."
        />

        {/* ---------- Install ---------- */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Install
              </CardTitle>
              <div className="flex items-center gap-2">
                <a href={NPM_URL} target="_blank" rel="noreferrer">
                  <Badge variant="outline" className="font-mono">npm <ExternalLink className="h-3 w-3 ml-1" /></Badge>
                </a>
                <a href={REPO_VERIFY} target="_blank" rel="noreferrer">
                  <Badge variant="outline" className="font-mono"><Github className="h-3 w-3 mr-1" /> source</Badge>
                </a>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CodeBlock>{`npm install ${PROJECT.verifierPackage}`}</CodeBlock>
            <p className="text-sm text-muted-foreground">
              Works in Node 18+, Deno, Bun, Cloudflare Workers, and modern browsers. Only depends on WebCrypto and <code className="font-mono">fetch</code>.
            </p>
          </CardContent>
        </Card>

        {/* ---------- The three claims ---------- */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">The three claims it verifies</h2>
            <p className="text-sm text-muted-foreground">
              Every AOS attestation is anchored by three independently-checkable claims — analogous to{" "}
              <a href="https://slsa.dev" className="underline hover:text-foreground" target="_blank" rel="noreferrer">SLSA provenance</a> +{" "}
              <a href="https://www.sigstore.dev" className="underline hover:text-foreground" target="_blank" rel="noreferrer">Sigstore transparency logs</a> for AI governance.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <ShieldCheck className="h-5 w-5 text-primary mb-1" />
                <CardTitle className="text-sm">1. Audit log integrity</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>Recompute <code className="font-mono">HMAC-SHA256(secret, prev_hash ‖ canonical_payload)</code> for every entry and confirm the chain links back to the genesis hash <code className="font-mono">0×64</code>.</p>
                <p>Catches: tampered payloads, deleted entries, re-ordered events.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <FileCheck2 className="h-5 w-5 text-primary mb-1" />
                <CardTitle className="text-sm">2. PDF integrity</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>Fetch the attestation PDF, compute SHA-256, compare to the hash embedded in the certification record + signed audit chain.</p>
                <p>Catches: storage tampering, swapped or re-uploaded PDFs.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Anchor className="h-5 w-5 text-primary mb-1" />
                <CardTitle className="text-sm">3. Anchor presence</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>Confirm each certification's <code className="font-mono">audit_entry_hash</code> exists in the live audit log.</p>
                <p>Catches: forged certs that point at non-existent audit events.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ---------- Try it live ---------- */}
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
              Try it — runs in your browser
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Fetches the public verify-chain endpoint for the review below, then independently re-downloads every PDF and recomputes its SHA-256 in your browser using WebCrypto. No backend trust required.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Input
                value={reviewId}
                onChange={(e) => setReviewId(e.target.value)}
                placeholder="reviewId (uuid)"
                className="font-mono text-xs flex-1 min-w-[280px]"
              />
              <Button onClick={run} disabled={running || !reviewId.trim()}>
                {running ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…</> : "Run verifyReview()"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setReviewId(SAMPLE_REVIEW_ID); setResult(null); setError(null); }}
                disabled={running}
              >
                Reset
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={result.ok ? "default" : "destructive"} className="font-mono">
                    {result.ok ? "✓ all checks passed" : "✗ one or more checks failed"}
                  </Badge>
                  <Badge variant="outline" className="font-mono">
                    chain: {result.server_valid ? "valid" : "invalid"} ({result.entries} entries)
                  </Badge>
                  <Badge variant="outline" className="font-mono">
                    certs: {result.certifications_count}
                  </Badge>
                  <Badge variant="outline" className="font-mono">
                    pdfs: {result.pdfs.filter((p) => p.ok).length}/{result.pdfs.length} ok
                  </Badge>
                  <Badge variant="outline" className="font-mono">
                    anchors: {result.anchors.filter((a) => a.anchored).length}/{result.anchors.length} ok
                  </Badge>
                </div>

                {result.pdfs.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">PDF SHA-256 (recomputed in your browser)</div>
                    <div className="space-y-2">
                      {result.pdfs.map((p, i) => (
                        <div key={i} className="bg-muted/30 border border-border rounded p-3 text-xs font-mono space-y-1 break-all">
                          <div className="flex items-center gap-2">
                            <Badge variant={p.ok ? "default" : "destructive"} className="text-[10px]">{p.ok ? "MATCH" : "MISMATCH"}</Badge>
                            <span className="text-muted-foreground">{p.bytes ?? "?"} bytes</span>
                          </div>
                          <div className="text-muted-foreground">expected: {p.expected}</div>
                          <div className="text-muted-foreground">actual&nbsp;&nbsp;: {p.actual ?? "(fetch failed)"}</div>
                          {p.reason && <div className="text-destructive">{p.reason}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw verify-chain response</summary>
                  <pre className="mt-2 bg-muted/50 border border-border rounded p-3 overflow-x-auto max-h-96">{JSON.stringify(result.raw, null, 2)}</pre>
                </details>
              </div>
            )}

            {!result && !error && (
              <div className="text-xs text-muted-foreground font-mono">
                Sample reviewId is a passing cert with both Ken &amp; Bob co-signatures. Replace with any reviewId from the public registry.
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---------- Code samples ---------- */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Use it in code</h2>

          <div>
            <h3 className="text-sm font-semibold mb-2">Verify a single review</h3>
            <CodeBlock language="typescript">{`import { verifyReview } from "${PROJECT.verifierPackage}";

const result = await verifyReview({
  host: "${PROJECT.publishedUrl}",
  reviewId: "${SAMPLE_REVIEW_ID}",
  // Optional. Only the issuing org has the signing key.
  // Without it you trust the server's \`valid\` field but still
  // independently check PDF SHA-256 and anchor presence.
  signingKey: process.env.AOS_SIGNING_KEY,
});

console.log(result.ok); // true if all three claims hold
console.log(result.pdfs); // per-PDF SHA-256 results
console.log(result.anchors); // per-cert anchor presence`}</CodeBlock>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Ingest the public attestation feed (insurer use case)</h3>
            <CodeBlock language="typescript">{`import { fetchFeed, activeOnly, expiringWithinDays } from "${PROJECT.verifierPackage}";

const feed = await fetchFeed({
  host: "${PROJECT.publishedUrl}",
  risk_tier: "high",
  since: "2026-01-01",
});

for (const a of activeOnly(feed)) {
  if (a.risk_tier_disagreement) {
    console.warn(
      \`[\${a.organization}] self-classified \${a.risk_tier_declared} \` +
      \`but AOS evidence supports \${a.risk_tier_derived}\`,
    );
  }
}

const renewSoon = expiringWithinDays(feed, 30);`}</CodeBlock>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Or use the CLI</h3>
            <CodeBlock>{`npx aigovops-verify review --host ${PROJECT.publishedUrl} --review-id ${SAMPLE_REVIEW_ID}
npx aigovops-verify feed   --host ${PROJECT.publishedUrl} --risk-tier high
npx aigovops-verify pdf    --url https://.../attestation.pdf --sha256 <hex>`}</CodeBlock>
            <p className="text-xs text-muted-foreground mt-2">
              Exit codes: <code className="font-mono">0</code> ok, <code className="font-mono">1</code> verification failed, <code className="font-mono">2</code> usage/network error.
            </p>
          </div>
        </section>

        {/* ---------- CI workflow ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-4 w-4" /> Gate your release pipeline on AOS
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Fail your build if the AOS attestation for your project is missing, expired, or revoked. Re-checks daily so a revocation breaks the build even when no new commits land.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <CodeBlock language="yaml">{`# .github/workflows/aos-attestation.yml
name: AOS attestation gate
on:
  pull_request:
  push: { branches: [main] }
  schedule:
    - cron: "17 6 * * *"
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm install -g ${PROJECT.verifierPackage}
      - run: |
          aigovops-verify review \\
            --host \${{ vars.AOS_HOST }} \\
            --review-id \${{ vars.AOS_REVIEW_ID }} \\
            | tee aos-verify.json
          jq -e '.ok == true' aos-verify.json`}</CodeBlock>
            <a href={REPO_WORKFLOW} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Github className="h-3 w-3 mr-2" /> Full example on GitHub
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* ---------- Why ---------- */}
        <Card className="bg-muted/20">
          <CardHeader>
            <CardTitle className="text-base">Why this package exists</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              The hosted platform at this domain is <strong className="text-foreground">one</strong> implementation of AOS — not the standard itself.
              This package is what makes AiGovOps a real open standard rather than a single-vendor product.
            </p>
            <p>
              If a regulator wants to spot-check 10,000 attestations overnight, an insurer wants to ingest the feed into their underwriting model, or a security researcher wants to prove a cert was tampered with — they reach for{" "}
              <code className="font-mono">{PROJECT.verifierPackage}</code>, not a screenshot of <Link to="/verify/sample" className="underline hover:text-foreground">/verify</Link>.
            </p>
            <p className="text-xs">
              Wire format guarantees, fixture-pinned canonicalization, and 18 unit tests live in the{" "}
              <a href={REPO_VERIFY} target="_blank" rel="noreferrer" className="underline hover:text-foreground">source repo</a>.
              Spec divergence is treated as a bug in either the server or the package.
            </p>
          </CardContent>
        </Card>
      </main>
    </PublicShell>
  );
};

export default Developers;
