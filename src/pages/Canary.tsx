import { useEffect, useState } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

const Canary = () => {
  const [manifest, setManifest] = useState<CanaryManifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/canary-manifest.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setManifest)
      .catch((e) => setError(String(e)));
  }, []);

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
            <section className="container max-w-6xl mx-auto pb-10">
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
                            <th className="px-4 py-2.5">Path</th>
                            <th className="px-4 py-2.5 w-44">SHA-256 (short)</th>
                            <th className="px-4 py-2.5 w-24 text-right">Size</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((f) => (
                            <tr key={f.path} className="border-t border-border">
                              <td className="px-4 py-2 font-mono text-xs">{f.path}</td>
                              <td
                                className="px-4 py-2 font-mono text-xs text-primary"
                                title={f.sha256}
                              >
                                {f.sha256.slice(0, 16)}…
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                                {formatBytes(f.bytes)}
                              </td>
                            </tr>
                          ))}
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
