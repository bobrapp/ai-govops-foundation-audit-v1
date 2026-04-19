import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { EngagementPanel } from "@/components/EngagementPanel";
import { CompensatingControlsPanel } from "@/components/CompensatingControlsPanel";
import { AttestationPanel } from "@/components/AttestationPanel";
import { CertificationPanel } from "@/components/CertificationPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle2, XCircle, RefreshCw, ShieldAlert, Loader2, FileText, ScanLine, Brain, Scale, FileLock, Activity, ShieldCheck, ShieldX } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PersonaAvatar } from "@/components/agents/PersonaPrimitives";
import { agentNameToSlug } from "@/lib/agent-name-mapping";
import { personaBySlug } from "@/data/agent-personas";

const sevColor: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  low: "bg-accent/20 text-accent",
  medium: "bg-warning/20 text-warning",
  high: "bg-destructive/20 text-destructive",
  critical: "bg-destructive/30 text-destructive",
};

const agentIcons: Record<string, any> = {
  "Policy Linter": ScanLine,
  "Risk & Ethics Assessor": Brain,
  "Compliance Mapper": Scale,
  "Scenario Risk Analyst": FileLock,
};

const ReviewDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [review, setReview] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [decision, setDecision] = useState("");
  const [busy, setBusy] = useState(false);
  const [chain, setChain] = useState<{ ok: boolean; count: number; results?: Array<{ ok: boolean; reason?: string }> } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  // Initialize from URL hash so deep-links restore filter state
  const initialHash = (() => {
    const h = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const params = new URLSearchParams(h);
    return {
      hide: new Set((params.get("hide") ?? "").split(",").filter(Boolean)),
      agent: params.get("agent") ?? null,
    };
  })();
  const [hiddenSeverities, setHiddenSeverities] = useState<Set<string>>(initialHash.hide);
  const [pendingAgentScroll, setPendingAgentScroll] = useState<string | null>(initialHash.agent);

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: r }, { data: f }, { data: a }, { data: au }] = await Promise.all([
      supabase.from("reviews").select("*").eq("id", id).single(),
      supabase.from("agent_findings").select("*").eq("review_id", id).order("severity"),
      supabase.from("review_artifacts").select("*").eq("review_id", id),
      supabase.from("audit_log").select("*").eq("review_id", id).order("created_at", { ascending: false }),
    ]);
    setReview(r);
    setFindings(f ?? []);
    setArtifacts(a ?? []);
    setAudit(au ?? []);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Poll while pipeline is running
  useEffect(() => {
    if (!review) return;
    if (["ingesting", "analyzing"].includes(review.status)) {
      const t = setInterval(load, 2500);
      return () => clearInterval(t);
    }
  }, [review, load]);

  // Highlight active agent pill based on which group is in view
  useEffect(() => {
    if (findings.length === 0) return;
    const slugs = Array.from(new Set(findings.map((f) => agentNameToSlug(f.agent_name))));
    const elements = slugs
      .map((slug) => document.getElementById(`agent-${slug}`))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const visibility = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const slug = entry.target.id.replace(/^agent-/, "");
          visibility.set(slug, entry.intersectionRatio);
        }
        // Pick the slug with the highest intersection ratio (>0)
        let bestSlug: string | null = null;
        let bestRatio = 0;
        for (const [slug, ratio] of visibility) {
          if (ratio > bestRatio) { bestRatio = ratio; bestSlug = slug; }
        }
        setActiveSlug(bestRatio > 0 ? bestSlug : null);
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [findings]);

  // Scroll to ?agent= from hash once that group renders
  useEffect(() => {
    if (!pendingAgentScroll || findings.length === 0) return;
    const el = document.getElementById(`agent-${pendingAgentScroll}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
      setPendingAgentScroll(null);
    }
  }, [findings, pendingAgentScroll]);

  // Persist filter + active agent in URL hash for shareable deep links
  useEffect(() => {
    const params = new URLSearchParams();
    if (hiddenSeverities.size > 0) {
      params.set("hide", Array.from(hiddenSeverities).join(","));
    }
    if (activeSlug) params.set("agent", activeSlug);
    const newHash = params.toString();
    const target = newHash ? `#${newHash}` : "";
    if (window.location.hash !== target) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${target}`);
    }
  }, [hiddenSeverities, activeSlug]);

  const rerun = async () => {
    setBusy(true);
    await supabase.from("reviews").update({ status: "analyzing", overall_score: null, decided_at: null, decided_by: null, decision_notes: null }).eq("id", id);
    await supabase.functions.invoke("run-agent-pipeline", { body: { reviewId: id } });
    setBusy(false);
    load();
  };

  const decide = async (verdict: "approved" | "rejected") => {
    if (!user || !id) return;
    setBusy(true);
    await supabase.from("reviews").update({
      status: verdict, decision_notes: decision, decided_by: user.id, decided_at: new Date().toISOString(),
    }).eq("id", id);
    // Server signs and inserts the audit entry into the chain
    await supabase.functions.invoke("sign-decision", {
      body: { reviewId: id, event: `human.${verdict}`, payload: { notes: decision } },
    });
    setBusy(false);
    toast.success(`Review ${verdict} · audit entry signed`);
    setChain(null);
    load();
  };

  const verify = async () => {
    if (!id) return;
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke("audit-verify", { body: { reviewId: id } });
    setVerifying(false);
    if (error) { toast.error(error.message); return; }
    setChain(data);
    toast[data.ok ? "success" : "error"](data.ok ? "Audit chain valid" : "Audit chain INVALID");
  };

  if (!review) return <AppShell><div className="p-8 font-mono text-sm text-muted-foreground">loading…</div></AppShell>;

  const running = ["ingesting", "analyzing"].includes(review.status);
  const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
  const sevCounts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1; return acc;
  }, {});
  const visibleFindings = findings.filter((f) => !hiddenSeverities.has(f.severity));
  const byAgent = visibleFindings.reduce<Record<string, any[]>>((acc, f) => {
    (acc[f.agent_name] ??= []).push(f); return acc;
  }, {});
  const toggleSeverity = (sev: string) => {
    setHiddenSeverities((cur) => {
      const next = new Set(cur);
      if (next.has(sev)) next.delete(sev); else next.add(sev);
      return next;
    });
  };

  return (
    <AppShell>
      <div className="relative">
        {/* Aurora wash — matches Quick Audit & Submit */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 15% 0%, hsl(248 70% 22% / 0.55), transparent 65%), radial-gradient(ellipse 60% 50% at 100% 30%, hsl(160 70% 28% / 0.30), transparent 70%)",
          }}
        />
        <div className="p-8 max-w-6xl mx-auto">
          <button onClick={() => nav("/dashboard")} className="text-xs font-mono text-muted-foreground hover:text-foreground mb-3">← back</button>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{review.title}</h1>
            <div className="text-sm text-muted-foreground mt-1">{review.description || <span className="italic">no description</span>}</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(review.scenarios ?? []).map((s: string) => (
                <span key={s} className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-border text-warning">{s}</span>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <Badge className={running ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"}>
              {running && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {review.status}
            </Badge>
            {review.overall_score !== null && (
              <div className="mt-2 font-mono text-3xl tabular-nums">
                {review.overall_score}<span className="text-muted-foreground text-base">/100</span>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="findings">
          <TabsList>
            <TabsTrigger value="findings">Findings ({findings.length})</TabsTrigger>
            <TabsTrigger value="artifacts">Artifacts ({artifacts.length})</TabsTrigger>
            <TabsTrigger value="audit">Audit log ({audit.length})</TabsTrigger>
            <TabsTrigger value="engagement">QAGA</TabsTrigger>
            <TabsTrigger value="compensations">Compensations</TabsTrigger>
            <TabsTrigger value="attestation">Attestation</TabsTrigger>
            <TabsTrigger value="certification">Certification</TabsTrigger>
            <TabsTrigger value="decision">Decision</TabsTrigger>
          </TabsList>

          <TabsContent value="engagement" className="mt-4">
            <EngagementPanel reviewId={id!} />
          </TabsContent>

          <TabsContent value="compensations" className="mt-4">
            <CompensatingControlsPanel reviewId={id!} findings={findings} />
          </TabsContent>

          <TabsContent value="attestation" className="mt-4">
            <AttestationPanel reviewId={id!} />
          </TabsContent>

          <TabsContent value="certification" className="mt-4">
            <CertificationPanel reviewId={id!} />
          </TabsContent>

          <TabsContent value="findings" className="mt-4 space-y-4">
            {running && findings.length === 0 && (
              <div className="rounded-lg border border-border bg-card-grad p-8 text-center">
                <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" />
                <div className="mt-3 font-medium">Agent crew running…</div>
                <div className="text-xs text-muted-foreground font-mono mt-1">Linter → Risk → Compliance → Scenarios</div>
              </div>
            )}

            {/* Agent + severity tab strip */}
            {findings.length > 0 && (
              <div className="sticky top-0 z-10 -mx-2 px-2 py-2 bg-background/80 backdrop-blur-sm border-b border-border/60 space-y-2">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition ${
                      activeSlug === null
                        ? "border-primary/60 bg-primary/10 text-primary shadow-glow"
                        : "border-border bg-card-grad text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    All <span className="tabular-nums">{visibleFindings.length}</span>
                  </button>
                  {Object.entries(byAgent).map(([agent, fs]) => {
                    const slug = agentNameToSlug(agent);
                    const persona = personaBySlug(slug);
                    const anchor = `agent-${slug}`;
                    const isActive = activeSlug === slug;
                    return (
                      <button
                        key={agent}
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(anchor);
                          if (el) {
                            const y = el.getBoundingClientRect().top + window.scrollY - 80;
                            window.scrollTo({ top: y, behavior: "smooth" });
                          }
                        }}
                        aria-current={isActive ? "true" : undefined}
                        className={`shrink-0 inline-flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 text-xs transition group ${
                          isActive
                            ? "border-primary/70 bg-primary/10 text-foreground shadow-glow"
                            : "border-border bg-card-grad hover:border-primary/50 hover:bg-primary/5"
                        }`}
                        title={persona ? `${persona.display_name} · ${persona.role_title}` : agent}
                      >
                        <PersonaAvatar slug={slug} size="xs" ring={isActive} />
                        <span className={`font-medium ${isActive ? "text-foreground" : "text-foreground/90 group-hover:text-foreground"}`}>{agent}</span>
                        <span className={`font-mono tabular-nums ${isActive ? "text-primary" : "text-muted-foreground"}`}>{fs.length}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Severity filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">severity</span>
                  {SEVERITIES.map((sev) => {
                    const count = sevCounts[sev] ?? 0;
                    if (count === 0) return null;
                    const hidden = hiddenSeverities.has(sev);
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => toggleSeverity(sev)}
                        aria-pressed={!hidden}
                        title={hidden ? `Show ${sev} findings` : `Hide ${sev} findings`}
                        className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider transition ${
                          hidden
                            ? "border-border bg-background/50 text-muted-foreground/60 line-through opacity-60 hover:opacity-100"
                            : `border-border ${sevColor[sev]} hover:border-primary/50`
                        }`}
                      >
                        {sev} <span className="tabular-nums">{count}</span>
                      </button>
                    );
                  })}
                  {hiddenSeverities.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setHiddenSeverities(new Set())}
                      className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-primary hover:underline"
                    >
                      reset
                    </button>
                  )}
                </div>
              </div>
            )}

            {findings.length > 0 && visibleFindings.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-card-grad/40 p-8 text-center text-sm text-muted-foreground">
                All findings hidden by severity filter.
                <button onClick={() => setHiddenSeverities(new Set())} className="ml-2 text-primary hover:underline font-medium">
                  Reset filter
                </button>
              </div>
            )}

            {Object.entries(byAgent).map(([agent, fs]) => {
              const Icon = agentIcons[agent] ?? FileText;
              const slug = agentNameToSlug(agent);
              const persona = personaBySlug(slug);
              return (
                <div key={agent} id={`agent-${slug}`} className="rounded-lg border border-border bg-card-grad overflow-hidden scroll-mt-24">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <PersonaAvatar slug={slug} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="font-medium text-sm">{agent}</span>
                        </div>
                        {persona && (
                          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">
                            {persona.display_name.replace(/"[^"]+"\s?/g, "").trim()} · {persona.role_title}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">{fs.length} finding{fs.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {fs.map((f) => (
                      <div key={f.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <Badge className={sevColor[f.severity]}>{f.severity}</Badge>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-medium text-sm">{f.title}</div>
                              {f.aos_control_id && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">{f.aos_control_id}</span>
                              )}
                            </div>
                            {f.scenario && <div className="text-[10px] font-mono uppercase text-warning mt-0.5">scenario: {f.scenario}</div>}
                            <div className="text-sm text-muted-foreground mt-1">{f.message}</div>
                            {f.evidence && (
                              <pre className="mt-2 p-2 rounded bg-background/60 border border-border text-[11px] font-mono overflow-x-auto">{f.evidence}</pre>
                            )}
                            {f.recommendation && (
                              <div className="mt-2 text-xs"><span className="font-mono uppercase text-primary">fix:</span> <span className="text-foreground/90">{f.recommendation}</span></div>
                            )}
                            {f.frameworks?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {f.frameworks.map((fr: string) => (
                                  <span key={fr} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{fr}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {!running && findings.length === 0 && (
              <div className="text-sm text-muted-foreground">No findings yet.</div>
            )}
          </TabsContent>

          <TabsContent value="artifacts" className="mt-4 space-y-3">
            {artifacts.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-card-grad overflow-hidden">
                <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                  <span className="font-mono text-xs">{a.file_path}</span>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">{a.language}</span>
                </div>
                <pre className="p-4 text-[11px] font-mono overflow-x-auto max-h-96 whitespace-pre-wrap">{a.content}</pre>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="audit" className="mt-4 space-y-3">
            <div className="rounded-lg border border-border bg-card-grad p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {chain ? (chain.ok
                  ? <ShieldCheck className="h-5 w-5 text-primary" />
                  : <ShieldX className="h-5 w-5 text-destructive" />)
                  : <ShieldAlert className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <div className="text-sm font-medium">
                    {chain ? (chain.ok ? "Audit chain verified" : "Audit chain INVALID") : "HMAC-SHA256 signed audit chain"}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {chain ? `${chain.count} entries · ${chain.results?.filter(r => r.ok).length}/${chain.count} valid` : "Click verify to recompute every signature."}
                  </div>
                </div>
              </div>
              <Button onClick={verify} disabled={verifying} variant="outline" size="sm">
                {verifying ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}
                Verify chain
              </Button>
            </div>
            <div className="rounded-lg border border-border bg-card-grad divide-y divide-border">
              {audit.map((e, idx) => {
                const verdict = chain?.results?.[audit.length - 1 - idx];
                return (
                  <div key={e.id} className="px-4 py-2.5 flex items-start gap-3 text-sm">
                    <Activity className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-primary">{e.event}</span>
                        <span className="text-[10px] font-mono uppercase text-muted-foreground">{e.actor_kind}</span>
                        {e.signature && (
                          <span className="text-[10px] font-mono text-muted-foreground" title={`sig: ${e.signature}`}>
                            sig:{e.signature.slice(0, 8)}…
                          </span>
                        )}
                        {verdict && (
                          verdict.ok
                            ? <span className="text-[10px] font-mono text-primary">✓ valid</span>
                            : <span className="text-[10px] font-mono text-destructive">✗ {verdict.reason}</span>
                        )}
                      </div>
                      {Object.keys(e.payload ?? {}).length > 0 && (
                        <pre className="text-[10px] font-mono text-muted-foreground mt-1 overflow-x-auto">{JSON.stringify(e.payload, null, 0)}</pre>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground shrink-0">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="decision" className="mt-4">
            {review.decided_at ? (
              <div className="rounded-lg border border-border bg-card-grad p-5">
                <div className="flex items-center gap-2">
                  {review.status === "approved"
                    ? <CheckCircle2 className="h-5 w-5 text-primary" />
                    : <XCircle className="h-5 w-5 text-destructive" />}
                  <span className="font-medium capitalize">{review.status}</span>
                  <span className="text-xs font-mono text-muted-foreground">· {new Date(review.decided_at).toLocaleString()}</span>
                </div>
                {review.decision_notes && <p className="mt-3 text-sm text-foreground/90 whitespace-pre-wrap">{review.decision_notes}</p>}
                <Button onClick={rerun} variant="outline" size="sm" className="mt-4" disabled={busy}>
                  <RefreshCw className="h-4 w-4 mr-1.5" /> Re-run agent pipeline
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card-grad p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="h-5 w-5 text-warning" />
                  <span className="font-medium">Human review required</span>
                </div>
                <Textarea
                  placeholder="Reasoning for your decision (will be entered into the audit log)…"
                  value={decision} onChange={(e) => setDecision(e.target.value)} rows={4}
                />
                <div className="flex gap-2 mt-3">
                  <Button onClick={() => decide("approved")} disabled={busy || running} className="bg-primary text-primary-foreground">
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
                  </Button>
                  <Button onClick={() => decide("rejected")} disabled={busy || running} variant="destructive">
                    <XCircle className="h-4 w-4 mr-1.5" /> Reject
                  </Button>
                  <Button onClick={rerun} disabled={busy || running} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-1.5" /> Re-run agents
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </AppShell>
  );
};

export default ReviewDetail;
