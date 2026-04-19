import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Server,
  FileCode,
  Layout,
  BookOpen,
  Check,
  X,
  Minus,
  Loader2,
  RefreshCw,
  Copy,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CopyHashButtonProps {
  hash: string;
  path: string;
}

const CopyHashButton = ({ hash, path }: CopyHashButtonProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      toast({
        title: "SHA-256 copied",
        description: path,
      });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard access blocked by the browser.",
        variant: "destructive",
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy full SHA-256\n${hash}`}
      aria-label={`Copy full SHA-256 for ${path}`}
      className="inline-flex h-5 w-5 items-center justify-center rounded border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors shrink-0"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
};

interface CanaryEntry {
  path: string;
  sha256: string;
  bytes: number;
}

interface CanaryManifest {
  version: number;
  generated_at: string;
  description: string;
  covers: string[];
  files: CanaryEntry[];
}

type CategoryKey = "backend" | "migrations" | "spec" | "ui";

interface Category {
  key: CategoryKey;
  label: string;
  blurb: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
}

const CATEGORIES: Category[] = [
  {
    key: "backend",
    label: "Backend — edge functions",
    blurb:
      "Server-side code that issues attestations, signs decisions, and chains the audit log.",
    icon: Server,
    match: (p) => p.startsWith("supabase/functions/"),
  },
  {
    key: "migrations",
    label: "Database migrations & RLS",
    blurb:
      "Schema, triggers, and Row-Level-Security policies. Drift here means the access rules changed.",
    icon: FileCode,
    match: (p) => p.startsWith("supabase/migrations/"),
  },
  {
    key: "spec",
    label: "AOS spec & doc index",
    blurb:
      "Machine-readable AOS spec and the public Documentation index served from the landing page.",
    icon: BookOpen,
    match: (p) => p.startsWith("public/specs/") || p === "src/lib/docs-manifest.ts",
  },
  {
    key: "ui",
    label: "User-facing trust surfaces",
    blurb:
      "Pages a reviewer or regulator actually looks at: the AOS spec viewer, the audit log, and the public verifier.",
    icon: Layout,
    match: (p) =>
      p === "src/pages/AosSpec.tsx" ||
      p === "src/pages/AuditLog.tsx" ||
      p === "src/pages/Verify.tsx",
  },
];

// Repo path is best-effort — the page degrades gracefully if it isn't set.
const GITHUB_REPO = "aigovops-foundation/aigovops-framework-auditor";
const ACTIONS_URL = `https://github.com/${GITHUB_REPO}/actions/workflows/canary-verify.yml`;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

// --- In-browser verifier --------------------------------------------------
//
// IMPORTANT: only files actually served from the deployed origin can be
// re-hashed in the browser. Source files under src/** and supabase/** live
// in the Git repo and are bundled away — they are NOT fetchable as plain
// text from the live app. Honest verification means saying so.
//
// We map each manifest entry to either:
//   - a public URL (verifiable client-side), or
//   - null (CI-only — verified weekly by GitHub Actions over the repo).

type RowStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; actualShort: string }
  | { kind: "drift"; actualShort: string }
  | { kind: "error"; message: string }
  | { kind: "skipped"; reason: string };

function publicUrlFor(path: string): string | null {
  if (path.startsWith("public/")) return "/" + path.slice("public/".length);
  return null;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const StatusCell = ({ status }: { status: RowStatus }) => {
  switch (status.kind) {
    case "idle":
      return <span className="text-muted-foreground/50">—</span>;
    case "checking":
      return (
        <span
          className="inline-flex items-center gap-1 text-muted-foreground"
          title="Hashing…"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        </span>
      );
    case "ok":
      return (
        <span
          className="inline-flex items-center gap-1 text-primary"
          title={`Match — actual ${status.actualShort}…`}
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      );
    case "drift":
      return (
        <span
          className="inline-flex items-center gap-1 text-destructive"
          title={`Drift — got ${status.actualShort}…`}
        >
          <X className="h-3.5 w-3.5" />
        </span>
      );
    case "error":
      return (
        <span
          className="inline-flex items-center gap-1 text-destructive/80"
          title={status.message}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
      );
    case "skipped":
      return (
        <span
          className="inline-flex items-center gap-1 text-muted-foreground"
          title={status.reason}
        >
          <Minus className="h-3.5 w-3.5" />
        </span>
      );
  }
};

const Canary = () => {
  const [manifest, setManifest] = useState<CanaryManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const [verifying, setVerifying] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/canary-manifest.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setManifest)
      .catch((e) => setError(String(e)));
  }, []);

  const summary = useMemo(() => {
    const vals = Object.values(statuses);
    return {
      ok: vals.filter((s) => s.kind === "ok").length,
      drift: vals.filter((s) => s.kind === "drift").length,
      skipped: vals.filter((s) => s.kind === "skipped").length,
      error: vals.filter((s) => s.kind === "error").length,
    };
  }, [statuses]);

  async function reverify() {
    if (!manifest || verifying) return;
    setVerifying(true);

    // Initialize all rows: served files → checking, others → skipped.
    const initial: Record<string, RowStatus> = {};
    for (const f of manifest.files) {
      const url = publicUrlFor(f.path);
      initial[f.path] = url
        ? { kind: "checking" }
        : {
            kind: "skipped",
            reason:
              "Source file — not served by the app. Verified weekly in CI by Canary Verify.",
          };
    }
    setStatuses(initial);

    // Hash served files in parallel, but cap concurrency to keep the UI snappy.
    const targets = manifest.files
      .map((f) => ({ f, url: publicUrlFor(f.path) }))
      .filter((x): x is { f: CanaryEntry; url: string } => x.url !== null);

    await Promise.all(
      targets.map(async ({ f, url }) => {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          const actual = await sha256Hex(buf);
          setStatuses((prev) => ({
            ...prev,
            [f.path]:
              actual === f.sha256
                ? { kind: "ok", actualShort: actual.slice(0, 16) }
                : { kind: "drift", actualShort: actual.slice(0, 16) },
          }));
        } catch (e) {
          setStatuses((prev) => ({
            ...prev,
            [f.path]: { kind: "error", message: String(e) },
          }));
        }
      }),
    );

    setLastRunAt(new Date().toISOString());
    setVerifying(false);
  }

  return (
    <div className="min-h-screen bg-hero text-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="relative">
        <header className="container max-w-6xl mx-auto flex items-center justify-between py-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-accent grid place-items-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">AiGovOps</div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                Canary manifest
              </div>
            </div>
          </Link>
          <Link to="/docs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> All docs
            </Button>
          </Link>
        </header>

        <section className="container max-w-6xl mx-auto pt-8 pb-8">
          <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider mb-2">
            Tamper evidence
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Canary manifest — every file that defines how the framework behaves.
          </h1>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            We publish a SHA-256 hash for every governance-critical file in this
            repository. A weekly GitHub Action re-hashes them and opens a security
            issue if anything drifts. The manifest below is the live copy served
            from this app — diff it against any historical commit to prove the
            rules you audited are the rules that ran.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-mono">
            <a
              href={ACTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 hover:border-primary/40 hover:text-primary transition-colors"
            >
              GitHub Actions — Canary Verify run history{" "}
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="/canary-manifest.json"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 hover:border-primary/40 hover:text-primary transition-colors"
            >
              Raw manifest (JSON) <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </section>

        {error && (
          <section className="container max-w-6xl mx-auto pb-10">
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" /> Could not load manifest
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                {error}
              </div>
            </div>
          </section>
        )}

        {manifest && (
          <>
            {/* Summary strip */}
            <section className="container max-w-6xl mx-auto pb-6">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card-grad p-4 shadow-elev">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Files covered
                  </div>
                  <div className="mt-1 text-2xl font-bold tracking-tight inline-flex items-center gap-2">
                    {manifest.files.length}
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card-grad p-4 shadow-elev">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Manifest version
                  </div>
                  <div className="mt-1 text-2xl font-bold tracking-tight">
                    v{manifest.version}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card-grad p-4 shadow-elev">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Generated
                  </div>
                  <div className="mt-1 text-sm font-mono">{manifest.generated_at}</div>
                </div>
              </div>
            </section>

            {/* In-browser verifier */}
            <section className="container max-w-6xl mx-auto pb-10">
              <div className="rounded-xl border border-border bg-card-grad p-5 shadow-elev">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="max-w-2xl">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Live deployment check
                    </div>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight">
                      Re-verify in your browser
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Fetches every served asset listed below from this exact
                      origin and re-hashes it with{" "}
                      <code className="font-mono text-xs">
                        crypto.subtle.digest('SHA-256')
                      </code>
                      . Source files (
                      <code className="font-mono text-xs">src/</code>,{" "}
                      <code className="font-mono text-xs">supabase/</code>) are
                      bundled away by the build and can&apos;t be re-fetched here
                      — those are verified weekly in CI against the Git tree.
                    </p>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                    <Button
                      onClick={reverify}
                      disabled={verifying}
                      size="sm"
                      className="font-mono text-xs"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Verifying…
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                          Re-verify in browser
                        </>
                      )}
                    </Button>
                    {lastRunAt && (
                      <div className="font-mono text-[10px] text-muted-foreground">
                        Last run: {lastRunAt}
                      </div>
                    )}
                  </div>
                </div>

                {(summary.ok > 0 ||
                  summary.drift > 0 ||
                  summary.skipped > 0 ||
                  summary.error > 0) && (
                  <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs">
                    <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-primary">
                      <Check className="h-3 w-3" /> {summary.ok} match
                    </span>
                    {summary.drift > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-destructive">
                        <X className="h-3 w-3" /> {summary.drift} drift
                      </span>
                    )}
                    {summary.error > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-destructive/80">
                        <AlertTriangle className="h-3 w-3" /> {summary.error} error
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-muted-foreground">
                      <Minus className="h-3 w-3" /> {summary.skipped} CI-only
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Categories */}
            <section className="container max-w-6xl mx-auto pb-20 space-y-8">
              {CATEGORIES.map((cat) => {
                const rows = manifest.files.filter((f) => cat.match(f.path));
                if (rows.length === 0) return null;
                const Icon = cat.icon;
                return (
                  <div key={cat.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-md border border-border bg-card grid place-items-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight">
                          {cat.label}{" "}
                          <span className="font-mono text-xs text-muted-foreground">
                            ({rows.length})
                          </span>
                        </h2>
                        <p className="text-xs text-muted-foreground">{cat.blurb}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-border bg-card-grad shadow-elev">
                      <table className="w-full text-sm">
                        <thead className="bg-card text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2.5 w-10 text-center">✓</th>
                            <th className="px-4 py-2.5">Path</th>
                            <th className="px-4 py-2.5 w-44">SHA-256 (short)</th>
                            <th className="px-4 py-2.5 w-24 text-right">Size</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((f) => {
                            const status: RowStatus =
                              statuses[f.path] ?? { kind: "idle" };
                            return (
                              <tr key={f.path} className="border-t border-border">
                                <td className="px-4 py-2 text-center">
                                  <StatusCell status={status} />
                                </td>
                                <td className="px-4 py-2 font-mono text-xs">
                                  {f.path}
                                </td>
                                <td className="px-4 py-2 font-mono text-xs text-primary">
                                  <span className="inline-flex items-center gap-2">
                                    <span title={f.sha256}>
                                      {f.sha256.slice(0, 16)}…
                                    </span>
                                    <CopyHashButton
                                      hash={f.sha256}
                                      path={f.path}
                                    />
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                                  {formatBytes(f.bytes)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </section>
          </>
        )}

        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground font-mono">
          Stewarded by the AiGovOps Foundation · Apache-2.0 · CC-BY-4.0 spec
        </footer>
      </div>
    </div>
  );
};

export default Canary;
