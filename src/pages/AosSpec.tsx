import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft, Download, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Control {
  control_id: string;
  domain: string;
  level: number;
  objective: string;
  evidence_expected: string;
  framework_refs: string[];
  testing_procedure: string;
}

interface Spec {
  spec: string;
  version: string;
  status: string;
  exported_at: string;
  steward: string;
  license: string;
  summary: string;
  domains: string[];
  control_count: number;
  controls: Control[];
}

/** Minimal YAML parser sufficient for our generated, well-formed spec file. */
function parseSpecYaml(text: string): Spec {
  // Strip comments
  const lines = text.split("\n").filter((l) => !l.trimStart().startsWith("#"));
  const out: any = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!m) { i++; continue; }
    const key = m[1];
    const val = m[2].trim();
    if (key === "controls" && val === "") {
      const controls: Control[] = [];
      i++;
      while (i < lines.length && (lines[i].startsWith("-") || lines[i].startsWith("  "))) {
        if (lines[i].startsWith("- ")) {
          const c: any = { framework_refs: [] };
          // first field on the "- " line
          const first = lines[i].slice(2);
          parseField(first, c);
          i++;
          while (i < lines.length && lines[i].startsWith("  ") && !lines[i].startsWith("- ")) {
            const inner = lines[i].slice(2);
            if (inner.startsWith("- ")) {
              c.framework_refs.push(stripQuotes(inner.slice(2).trim()));
            } else {
              parseField(inner, c);
            }
            i++;
          }
          controls.push(c as Control);
        } else {
          i++;
        }
      }
      out.controls = controls;
      continue;
    }
    if (key === "domains" && val === "") {
      const arr: string[] = [];
      i++;
      while (i < lines.length && lines[i].trimStart().startsWith("- ")) {
        arr.push(stripQuotes(lines[i].trim().slice(2).trim()));
        i++;
      }
      out.domains = arr;
      continue;
    }
    out[key] = coerce(val);
    i++;
  }
  return out as Spec;
}

function parseField(line: string, obj: any) {
  const m = line.match(/^([a-z_]+):\s*(.*)$/);
  if (!m) return;
  const k = m[1];
  const v = m[2].trim();
  if (v === "") return;
  obj[k] = coerce(v);
}

function stripQuotes(s: string) {
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
}

function coerce(v: string): any {
  const stripped = stripQuotes(v);
  if (/^\d+$/.test(stripped)) return parseInt(stripped, 10);
  return stripped;
}

const AosSpec = () => {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/specs/aos-v1.0.yaml")
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((t) => setSpec(parseSpecYaml(t)))
      .catch((e) => setError(e.message));
  }, []);

  const byDomain = spec
    ? spec.domains.reduce<Record<string, Control[]>>((acc, d) => {
        acc[d] = spec.controls.filter((c) => c.domain === d);
        return acc;
      }, {})
    : {};

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
                AOS Specification
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <a href="/specs/aos-v1.0.yaml" download>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> YAML
              </Button>
            </a>
            <Link to="/docs">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> All docs
              </Button>
            </Link>
          </div>
        </header>

        <section className="container max-w-6xl mx-auto pt-8 pb-8">
          <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider mb-2">
            AiGovOps Operational Standard
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            AOS {spec?.version ?? "v0.1"}{" "}
            <span className="text-base font-mono text-muted-foreground align-middle ml-2">
              {spec?.status}
            </span>
          </h1>
          {spec && (
            <p className="mt-3 text-muted-foreground max-w-3xl">{spec.summary}</p>
          )}
          {spec && (
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="border border-border rounded px-2 py-0.5">
                {spec.control_count} controls
              </span>
              <span className="border border-border rounded px-2 py-0.5">
                {spec.domains.length} domains
              </span>
              <span className="border border-border rounded px-2 py-0.5">
                Steward: {spec.steward}
              </span>
              <span className="border border-border rounded px-2 py-0.5">
                License: {spec.license}
              </span>
              <span className="border border-border rounded px-2 py-0.5">
                Exported: {spec.exported_at}
              </span>
            </div>
          )}
        </section>

        {error && (
          <section className="container max-w-6xl mx-auto pb-8">
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Could not load spec: {error}
            </div>
          </section>
        )}

        {spec &&
          spec.domains.map((domain) => (
            <section key={domain} className="container max-w-6xl mx-auto pb-10">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold tracking-tight uppercase font-mono">
                  {domain}
                </h2>
                <span className="text-xs text-muted-foreground font-mono">
                  ({byDomain[domain].length})
                </span>
              </div>
              <div className="rounded-xl border border-border bg-card-grad shadow-elev overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border">
                  <div className="col-span-2">Control</div>
                  <div className="col-span-4">Objective</div>
                  <div className="col-span-3">Evidence expected</div>
                  <div className="col-span-3">Frameworks</div>
                </div>
                {byDomain[domain].map((c) => (
                  <div
                    key={c.control_id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-border last:border-b-0"
                  >
                    <div className="col-span-2 font-mono text-xs text-primary">
                      {c.control_id}
                      <div className="text-[10px] text-muted-foreground mt-0.5">L{c.level}</div>
                    </div>
                    <div className="col-span-4">{c.objective}</div>
                    <div className="col-span-3 text-muted-foreground text-xs">
                      {c.evidence_expected}
                    </div>
                    <div className="col-span-3 flex flex-wrap gap-1">
                      {c.framework_refs.map((f) => (
                        <span
                          key={f}
                          className="text-[10px] font-mono border border-border rounded px-1.5 py-0.5 text-muted-foreground"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground font-mono">
          Stewarded by the AiGovOps Foundation · CC-BY-4.0
        </footer>
      </div>
    </div>
  );
};

export default AosSpec;
