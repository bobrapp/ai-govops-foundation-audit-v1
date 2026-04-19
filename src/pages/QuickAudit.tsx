import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, Zap, Crown, ArrowRight, AlertTriangle, ShieldCheck, Play, Gauge } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { usePageMeta } from "@/hooks/usePageMeta";
import { NamedCameo, PersonaAvatar } from "@/components/agents/PersonaPrimitives";

const SAMPLE = `package aigovops.openclaw

default allow = true   # unsafe default

# Hardcoded API key — never do this
API_KEY = "sk-live-9J2xQp4z4Hk3WqVbRnP1YgC7Xt"

# GPL-3.0 dep pulled into a proprietary bundle
import data.openclaw.gpl3.utils

allow {
  input.actor.role == "engineer"
}`;

const sevTone: Record<string, string> = {
  info: "bg-muted text-muted-foreground border-border",
  low: "bg-primary/10 text-primary border-primary/20",
  medium: "bg-warning/10 text-warning border-warning/30",
  high: "bg-warning/15 text-warning border-warning/40",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

interface Finding {
  id: string;
  agent_name: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  recommendation: string | null;
  aos_control_id: string | null;
}

const QuickAudit = () => {
  usePageMeta({
    title: "Quick Audit — free agentic review",
    description:
      "Paste your policy and get a free Enterprise OSS audit from the AIgovops Agent Council. Findings, AOS control mapping, and a 24-hour fair-use limit.",
  });
  const nav = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isCurator } = useRoles();
  const bypass = isAdmin || isCurator;

  const [code, setCode] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [overall, setOverall] = useState<number | null>(null);
  const [derivedTier, setDerivedTier] = useState<"medium" | "high" | "critical" | null>(null);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  // Cooldown: 1 free run / 24h (bypass for admin + curator)
  useEffect(() => {
    if (!user || bypass) return;
    (async () => {
      const { data } = await supabase
        .from("quick_audit_runs")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.[0]) setLastRunAt(new Date(data[0].created_at));
    })();
  }, [user, bypass]);

  const cooldownLeft = useMemo(() => {
    if (bypass || !lastRunAt) return 0;
    const diff = 24 * 60 * 60 * 1000 - (Date.now() - lastRunAt.getTime());
    return Math.max(diff, 0);
  }, [lastRunAt, bypass]);

  const fmtCooldown = (ms: number) => {
    const h = Math.floor(ms / 3600_000);
    const m = Math.floor((ms % 3600_000) / 60_000);
    return `${h}h ${m}m`;
  };

  const run = async () => {
    if (!user) return;
    if (!code.trim()) {
      toast.error("Paste some policy code first.");
      return;
    }
    if (cooldownLeft > 0) {
      toast.error(`Free quota used — try again in ${fmtCooldown(cooldownLeft)}.`);
      return;
    }
    setBusy(true);
    setFindings([]);
    setOverall(null);
    setDerivedTier(null);
    try {
      // 1. Create review (locked to enterprise_oss)
      const { data: review, error: rErr } = await supabase
        .from("reviews")
        .insert({
          submitter_id: user.id,
          title: "Quick Audit — Enterprise OSS",
          description: "Free quick audit run",
          source_type: "paste",
          scenarios: ["enterprise_oss"],
          status: "ingesting",
        })
        .select()
        .single();
      if (rErr) throw rErr;

      // 2. Artifact
      const { error: aErr } = await supabase.from("review_artifacts").insert({
        review_id: review.id,
        file_path: "policy.rego",
        language: "rego",
        content: code.slice(0, 200_000),
      });
      if (aErr) throw aErr;

      // 3. Record the run for rate limiting
      await supabase.from("quick_audit_runs").insert({
        user_id: user.id,
        scenario: "enterprise_oss",
        review_id: review.id,
      });
      setLastRunAt(new Date());
      setReviewId(review.id);

      // 4. Fire the pipeline
      toast.success("Council is reviewing — this takes ~20s.");
      const { error: invErr } = await supabase.functions.invoke("run-agent-pipeline", {
        body: { reviewId: review.id },
      });
      if (invErr) throw invErr;

      // 5. Pull findings
      const { data: fRows } = await supabase
        .from("agent_findings")
        .select("id, agent_name, severity, title, message, recommendation, aos_control_id")
        .eq("review_id", review.id)
        .order("severity", { ascending: false });
      setFindings((fRows ?? []) as Finding[]);

      const { data: rRow } = await supabase
        .from("reviews").select("overall_score").eq("id", review.id).maybeSingle();
      setOverall(rRow?.overall_score ?? null);

      // 6. Ask Florence Nightingale (via derive_risk_tier RPC) for an evidence-derived tier
      try {
        const { data: tier } = await supabase.rpc("derive_risk_tier", { _review_id: review.id });
        if (tier) setDerivedTier(tier as "medium" | "high" | "critical");
      } catch {
        // non-fatal — tier badge just won't render
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Quick audit failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const tierTone: Record<string, string> = {
    medium: "bg-primary/10 text-primary border-primary/30",
    high: "bg-warning/15 text-warning border-warning/40",
    critical: "bg-destructive/10 text-destructive border-destructive/40",
  };

  return (
    <AppShell>
      <div className="relative">
        {/* Aurora wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 15% 0%, hsl(248 70% 22% / 0.55), transparent 65%), radial-gradient(ellipse 60% 50% at 100% 30%, hsl(160 70% 28% / 0.30), transparent 70%)",
          }}
        />
        <div className="p-8 max-w-5xl mx-auto">
          <PageHeader
            eyebrow="Free · Enterprise OSS scenario"
            title="Quick Audit"
            description="Paste any policy-as-code, and the Agent Council runs a real audit. One free run every 24h — full attestation requires a chartered QAGA assessor."
            actions={
              <div className="flex items-center gap-2">
                <Link to="/demo/enterprise_oss">
                  <Button variant="outline">
                    <Play className="h-4 w-4 mr-1.5" /> Watch the demo
                  </Button>
                </Link>
                <Link to="/submit">
                  <Button variant="secondary">
                    Full review <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            }
          />

          {/* Ken intake cameo banner */}
          <div className="mb-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 flex items-center gap-4 shadow-glow">
            <PersonaAvatar slug="ken-newton" size="lg" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-warning flex items-center gap-1.5">
                <Crown className="h-3 w-3" /> Ken Newton · Chief auditor on intake
              </div>
              <h2 className="text-lg font-semibold mt-0.5">
                Paste your policy. I'll convene the council.
              </h2>
              <p className="text-sm text-muted-foreground">
                Eight specialists score it against the active AOS catalog. Florence Nightingale derives an evidence-based risk tier. Bob co-signs only if it's defensible.
              </p>
            </div>
            <Link to="/agents/chat" className="hidden md:inline-block">
              <Button variant="ghost" size="sm">
                Talk to Ken first <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3 p-4 bg-card-grad">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-primary/80">policy.rego</div>
              {bypass ? (
                <Badge className="font-mono text-[10px] bg-warning/15 text-warning border-warning/30">Unlimited (admin/curator)</Badge>
              ) : cooldownLeft > 0 ? (
                <Badge variant="secondary" className="font-mono text-[10px]">
                  Next run in {fmtCooldown(cooldownLeft)}
                </Badge>
              ) : (
                <Badge variant="secondary" className="font-mono text-[10px]">1 free run available</Badge>
              )}
            </div>
            <Textarea
              rows={20}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono text-xs"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCode(SAMPLE)} disabled={busy}>
                Reset to sample
              </Button>
              <Button onClick={run} disabled={busy || (cooldownLeft > 0 && !bypass)}>
                {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Council reviewing…</> : <><Zap className="h-4 w-4 mr-2" /> Run quick audit</>}
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4 bg-card-grad">
              <div className="text-[10px] font-mono uppercase tracking-wider text-primary/80 mb-2">Result</div>
              {!findings.length && !busy && (
                <div className="text-sm text-muted-foreground">
                  Run the audit and the Agent Council's findings appear here, scored 0–100 against the active AOS catalog.
                </div>
              )}
              {busy && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> The 9-agent council is reviewing your policy.
                </div>
              )}
              {!busy && overall !== null && (
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold tracking-tight">{overall}<span className="text-base text-muted-foreground">/100</span></div>
                  <Badge className="font-mono text-[10px]">overall score</Badge>
                </div>
              )}

              {/* Florence Nightingale derived risk-tier badge */}
              {!busy && derivedTier && (
                <div className="mt-3 flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3">
                  <PersonaAvatar slug="nightingale" size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-primary/80 flex items-center gap-1">
                      <Gauge className="h-3 w-3" /> Florence Nightingale · derived tier
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className={`font-mono text-[10px] border ${tierTone[derivedTier]}`}>
                        {derivedTier}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        evidence-weighted, independent of any declared tier
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!busy && reviewId && (
                <Link to={`/review/${reviewId}`} className="text-xs font-mono text-primary hover:underline mt-3 inline-block">
                  open full review →
                </Link>
              )}
            </Card>

            <Card className="p-4 bg-warning/5 border-warning/30">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <div className="font-semibold">Need a signed AOC?</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    A chartered <Link to="/registry" className="text-primary hover:underline">QAGA assessor</Link> can issue a tamper-evident attestation with hash chain + PDF export.
                  </div>
                  <div className="mt-2 text-[11px] font-mono text-muted-foreground">
                    Co-signed by <NamedCameo slug="ken-newton" size="xs" /> and <NamedCameo slug="bob-smith" size="xs" />.
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {!!findings.length && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Findings <span className="text-sm text-muted-foreground font-mono">({findings.length})</span>
            </h2>
            <div className="space-y-2">
              {findings.map((f) => (
                <article key={f.id} className="rounded-xl border border-border bg-card-grad p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {f.severity === "critical" || f.severity === "high" ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    )}
                    <span className="font-medium">{f.title}</span>
                    <Badge className={`font-mono text-[10px] border ${sevTone[f.severity]}`}>{f.severity}</Badge>
                    <Badge variant="secondary" className="font-mono text-[10px]">{f.agent_name}</Badge>
                    {f.aos_control_id && (
                      <Badge variant="outline" className="font-mono text-[10px]">{f.aos_control_id}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground/85 mt-2">{f.message}</p>
                  {f.recommendation && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="font-mono uppercase tracking-wider mr-1.5">Fix:</span>{f.recommendation}
                    </p>
                  )}
                </article>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => nav(`/review/${reviewId}`)} disabled={!reviewId}>
                Open full review <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </section>
        )}
        </div>
      </div>
    </AppShell>
  );
};

export default QuickAudit;
