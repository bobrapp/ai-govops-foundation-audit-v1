import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft, Download, BookOpen, Layers, Target, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CONTROL_OBJECTIVES, RISK_TIERS } from "@/lib/control-objectives";
import { STANDARD } from "@/lib/config";

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

  const controlsForObjective = (objectiveDomains: ReadonlyArray<string>) =>
    spec ? spec.controls.filter((c) => objectiveDomains.includes(c.domain)) : [];

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
                {STANDARD.longName} Specification
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
            {STANDARD.longName} ({STANDARD.shortName})
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {STANDARD.shortName} {spec?.version ?? STANDARD.version}{" "}
            <span className="text-base font-mono text-muted-foreground align-middle ml-2">
              {spec?.status ?? STANDARD.status}
            </span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            A horizontal, machine-readable governance standard for AI deployments. Built in the
            tradition of <strong>SLSA, Sigstore, and in-toto</strong> — signed cryptographic
            attestations that downstream systems verify independently. Stewarded by the AiGovOps
            Foundation, intended home: OpenSSF.
          </p>
          {spec && (
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-mono">
              <Badge variant="outline">6 control objectives</Badge>
              <Badge variant="outline">{spec.control_count} expanded controls</Badge>
              <Badge variant="outline">{spec.domains.length} domains</Badge>
              <Badge variant="outline">3 risk tiers</Badge>
              <Badge variant="outline">Steward: {spec.steward}</Badge>
              <Badge variant="outline">License: {spec.license}</Badge>
            </div>
          )}

          {/* Three-axis architecture box */}
          <div className="mt-6 grid md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-primary">
                <Layers className="h-3 w-3" /> Horizontal
              </div>
              <div className="mt-1 text-sm font-medium">6 Control Objectives</div>
              <div className="text-xs text-muted-foreground mt-1">
                Apply to every review. One spec, one attestation schema. This is what insurers price.
              </div>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-warning">
                <Target className="h-3 w-3" /> Orthogonal
              </div>
              <div className="mt-1 text-sm font-medium">Risk Tier (Medium / High / Critical)</div>
              <div className="text-xs text-muted-foreground mt-1">
                Drives rigor across all industries. Cross-references EU AI Act and NAIC loss models.
              </div>
            </div>
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-accent-foreground">
                <Lock className="h-3 w-3" /> Vertical
              </div>
              <div className="mt-1 text-sm font-medium">Scenario Packs</div>
              <div className="text-xs text-muted-foreground mt-1">
                Healthcare, IP, HR, OSS — contextual stress tests loaded at review time. Extend
                coverage; never fork the standard.
              </div>
            </div>
          </div>
        </section>

        {error && (
          <section className="container max-w-6xl mx-auto pb-8">
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Could not load spec: {error}
            </div>
          </section>
        )}

        <section className="container max-w-6xl mx-auto pb-12">
          <Tabs defaultValue="objectives">
            <TabsList>
              <TabsTrigger value="objectives">
                <Target className="h-3.5 w-3.5 mr-1.5" /> 6 Control Objectives
              </TabsTrigger>
              <TabsTrigger value="controls">
                <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Expanded Controls
              </TabsTrigger>
              <TabsTrigger value="tiers">
                <Layers className="h-3.5 w-3.5 mr-1.5" /> Risk Tiers
              </TabsTrigger>
            </TabsList>

            {/* ---- 6 Control Objectives rollup ---- */}
            <TabsContent value="objectives" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground max-w-3xl">
                The canonical {STANDARD.shortName} {STANDARD.version} catalog. These six objectives
                are what the position paper publishes; the expanded controls below are the
                machine-readable testing procedures underneath each one.
              </p>
              {CONTROL_OBJECTIVES.map((co) => {
                const expanded = controlsForObjective(co.domains);
                return (
                  <div
                    key={co.id}
                    className="rounded-xl border border-border bg-card-grad p-5 shadow-elev"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-xs font-mono uppercase tracking-wider text-primary">
                          {co.id} · Objective {co.number}
                        </div>
                        <h3 className="text-lg font-semibold mt-0.5">{co.title}</h3>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {expanded.length} expanded control{expanded.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-foreground/90">{co.description}</p>
                    <div className="mt-3 grid md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="font-mono uppercase text-[10px] tracking-wider text-muted-foreground mb-1">
                          Evidence expected
                        </div>
                        <div className="text-muted-foreground">{co.evidence}</div>
                      </div>
                      <div>
                        <div className="font-mono uppercase text-[10px] tracking-wider text-muted-foreground mb-1">
                          External references
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {co.refs.map((r) => (
                            <span
                              key={r}
                              className="text-[10px] font-mono border border-border rounded px-1.5 py-0.5 text-muted-foreground"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {expanded.length > 0 && (
                      <details className="mt-3 group">
                        <summary className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-foreground">
                          ▸ Expanded controls ({expanded.map((c) => c.control_id).join(", ")})
                        </summary>
                        <div className="mt-2 space-y-1.5 pl-4 border-l border-border">
                          {expanded.map((c) => (
                            <div key={c.control_id} className="text-xs">
                              <span className="font-mono text-primary">{c.control_id}</span>{" "}
                              <span className="text-muted-foreground">{c.objective}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </TabsContent>

            {/* ---- Expanded controls (the 18) ---- */}
            <TabsContent value="controls" className="space-y-6 mt-4">
              {spec &&
                spec.domains.map((domain) => (
                  <div key={domain}>
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
                  </div>
                ))}
            </TabsContent>

            {/* ---- Risk Tiers ---- */}
            <TabsContent value="tiers" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground max-w-3xl">
                Risk Tier is the orthogonal axis insurers price against. Same scale across all
                industries; cross-references EU AI Act risk classification and NAIC AI Bulletin
                practice. A submitter declares an initial tier; the agent pipeline can escalate
                (never de-escalate) based on findings.
              </p>
              {RISK_TIERS.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-border bg-card-grad p-5 shadow-elev"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg font-semibold">{t.label}-tier</h3>
                    <Badge
                      variant="outline"
                      className={
                        t.id === "critical"
                          ? "border-destructive/40 text-destructive"
                          : t.id === "high"
                          ? "border-warning/40 text-warning"
                          : "border-primary/40 text-primary"
                      }
                    >
                      tier: {t.id}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground/90">{t.description}</p>
                  <div className="mt-3 grid md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-mono uppercase text-[10px] tracking-wider text-muted-foreground mb-1">
                        EU AI Act mapping
                      </div>
                      <div className="text-muted-foreground">{t.euAiActMapping}</div>
                    </div>
                    <div>
                      <div className="font-mono uppercase text-[10px] tracking-wider text-muted-foreground mb-1">
                        Insurance implication
                      </div>
                      <div className="text-muted-foreground">{t.insuranceImplication}</div>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </section>

        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground font-mono">
          Stewarded by the AiGovOps Foundation · CC-BY-4.0 · Reference implementation:{" "}
          <Link to="/" className="underline">AiGovOps Review Framework</Link>
        </footer>
      </div>
    </div>
  );
};

export default AosSpec;
