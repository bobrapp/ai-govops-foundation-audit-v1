import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Activity, ShieldCheck, ShieldAlert, Users, CheckCircle2, XCircle, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  usePersonas,
  useDecisions,
  useHitlQueue,
  useResolveHitl,
  type HitlRow,
} from "@/hooks/queries/useAgents";
import { portraitFor } from "@/data/agent-personas";
import { useRoles } from "@/hooks/useRoles";
import { usePageMeta } from "@/hooks/usePageMeta";
import { formatDistanceToNow } from "date-fns";

const sevTone: Record<string, string> = {
  info: "bg-muted text-muted-foreground border-border",
  low: "bg-primary/10 text-primary border-primary/20",
  medium: "bg-warning/10 text-warning border-warning/30",
  high: "bg-warning/15 text-warning border-warning/40",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

const decisionTone: Record<string, string> = {
  pass: "text-primary",
  fail: "text-destructive",
  warn: "text-warning",
  info: "text-muted-foreground",
  escalated: "text-warning",
};

const AgentsDashboard = () => {
  usePageMeta({
    title: "Agent Activity — AIgovops",
    description:
      "Live activity feed of every AIgovops auditor agent: decisions, severity, and human-in-the-loop reviews awaiting action.",
  });
  const { isAdmin, isReviewer } = useRoles();
  const personasQ = usePersonas();
  const decisionsQ = useDecisions(80);
  const hitlQ = useHitlQueue();
  const resolveHitl = useResolveHitl();
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("agents-dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_decisions" },
        () => qc.invalidateQueries({ queryKey: ["agent_decisions"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hitl_reviews" },
        () => qc.invalidateQueries({ queryKey: ["hitl_reviews"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const [openItem, setOpenItem] = useState<HitlRow | null>(null);
  const [note, setNote] = useState("");

  const personas = personasQ.data ?? [];
  const decisions = decisionsQ.data ?? [];
  const hitl = hitlQ.data ?? [];

  const personaIndex = useMemo(
    () => Object.fromEntries(personas.map((p) => [p.id, p])),
    [personas]
  );

  const pendingHitl = hitl.filter((h) => h.status === "pending");
  const resolvedToday = hitl.filter(
    (h) =>
      h.status !== "pending" &&
      h.resolved_at &&
      Date.now() - new Date(h.resolved_at).getTime() < 24 * 60 * 60 * 1000
  ).length;
  const decisionsToday = decisions.filter(
    (d) => Date.now() - new Date(d.created_at).getTime() < 24 * 60 * 60 * 1000
  ).length;

  const canResolve = isAdmin || isReviewer;

  const submit = async (status: "approved" | "rejected" | "withdrawn") => {
    if (!openItem) return;
    try {
      await resolveHitl.mutateAsync({ id: openItem.id, status, note });
      toast.success(`HITL item ${status}`);
      setOpenItem(null);
      setNote("");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to resolve";
      toast.error(message);
    }
  };

  return (
    <AppShell>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Agent Activity"
          eyebrow="Council Operations"
          description="Live feed of every agent decision, with the human-in-the-loop queue front and centre."
          actions={
            <Button asChild variant="secondary">
              <Link to="/agents">
                <Users className="h-4 w-4 mr-2" />
                View Roster
              </Link>
            </Button>
          }
        />

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Agents"
            value={personas.length}
            icon={Users}
            hint="Including the Chief"
          />
          <StatCard
            label="Decisions (24h)"
            value={decisionsToday}
            icon={Activity}
            hint={`${decisions.length} total in feed`}
          />
          <StatCard
            label="HITL Pending"
            value={pendingHitl.length}
            icon={ShieldAlert}
            hint="Needs human review"
            tone={pendingHitl.length > 0 ? "warning" : "neutral"}
          />
          <StatCard
            label="HITL Resolved (24h)"
            value={resolvedToday}
            icon={ShieldCheck}
          />
        </div>

        <div className="mt-8 grid lg:grid-cols-5 gap-6">
          {/* HITL queue */}
          <section className="lg:col-span-2 rounded-xl border border-border bg-card-grad">
            <header className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-warning">
                  Human in the Loop
                </div>
                <h2 className="text-base font-semibold mt-0.5">Review Queue</h2>
              </div>
              <Badge variant="secondary" className="font-mono">
                {pendingHitl.length} pending
              </Badge>
            </header>

            <div className="max-h-[640px] overflow-auto divide-y divide-border">
              {hitlQ.isLoading && (
                <div className="p-6 text-sm text-muted-foreground font-mono">loading…</div>
              )}
              {!hitlQ.isLoading && hitl.length === 0 && (
                <EmptyState
                  icon={ShieldCheck}
                  title="Nothing waiting on a human"
                  description="Agents will queue items here when they need approval, override, or judgment."
                />
              )}
              {hitl.map((h) => {
                const persona = personaIndex[h.persona_id];
                return (
                  <button
                    key={h.id}
                    onClick={() => setOpenItem(h)}
                    className="w-full text-left p-4 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {persona && portraitFor(persona.slug) && (
                        <img
                          src={portraitFor(persona.slug)}
                          alt={persona.display_name}
                          loading="lazy"
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-md object-cover object-top border border-border"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{h.title}</span>
                          <Badge className={`font-mono text-[10px] border ${sevTone[h.severity]}`}>
                            {h.severity}
                          </Badge>
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {h.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {h.summary}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-1.5">
                          {persona?.display_name ?? "—"} ·{" "}
                          {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Decision feed */}
          <section className="lg:col-span-3 rounded-xl border border-border bg-card-grad">
            <header className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-primary/80">
                  Activity
                </div>
                <h2 className="text-base font-semibold mt-0.5">Agent Decision Feed</h2>
              </div>
              <Badge variant="secondary" className="font-mono">
                {decisions.length} entries
              </Badge>
            </header>

            <div className="max-h-[640px] overflow-auto divide-y divide-border">
              {decisionsQ.isLoading && (
                <div className="p-6 text-sm text-muted-foreground font-mono">loading…</div>
              )}
              {!decisionsQ.isLoading && decisions.length === 0 && (
                <EmptyState
                  icon={Activity}
                  title="No agent activity yet"
                  description="Decisions land here as the agent pipeline runs against new reviews."
                />
              )}
              {decisions.map((d) => {
                const persona = personaIndex[d.persona_id];
                return (
                  <article key={d.id} className="p-4">
                    <div className="flex items-start gap-3">
                      {persona && portraitFor(persona.slug) && (
                        <img
                          src={portraitFor(persona.slug)}
                          alt={persona.display_name}
                          loading="lazy"
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-md object-cover object-top border border-border"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">
                            {persona?.display_name ?? "Unknown agent"}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {persona?.role_title}
                          </span>
                          <Badge className={`font-mono text-[10px] border ${sevTone[d.severity]}`}>
                            {d.severity}
                          </Badge>
                          <span className={`font-mono text-[11px] uppercase tracking-wider ${decisionTone[d.decision] ?? ""}`}>
                            {d.action} → {d.decision}
                          </span>
                          {d.needs_human && (
                            <Badge className="bg-warning/15 text-warning border-warning/30 font-mono text-[10px]">
                              HITL
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground/80 mt-1.5">{d.rationale}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-muted-foreground">
                          <span>
                            {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                          </span>
                          {d.review_id && (
                            <Link
                              to={`/review/${d.review_id}`}
                              className="inline-flex items-center gap-1 text-primary/80 hover:text-primary"
                            >
                              review <ArrowUpRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* HITL action dialog */}
      <Dialog open={!!openItem} onOpenChange={(o) => !o && setOpenItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{openItem?.title}</DialogTitle>
            <DialogDescription className="text-xs font-mono">
              {openItem && personaIndex[openItem.persona_id]?.display_name} ·{" "}
              <span className={sevTone[openItem?.severity ?? "info"]}>
                {openItem?.severity}
              </span>
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-foreground/85 leading-relaxed">{openItem?.summary}</p>

          {canResolve ? (
            <>
              <Textarea
                placeholder="Resolution note (visible in audit log)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="font-mono text-xs"
              />
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => submit("withdrawn")}
                  disabled={resolveHitl.isPending}
                >
                  Withdraw
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => submit("rejected")}
                  disabled={resolveHitl.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1.5" /> Reject
                </Button>
                <Button onClick={() => submit("approved")} disabled={resolveHitl.isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
                </Button>
              </DialogFooter>
            </>
          ) : (
            <p className="text-xs text-muted-foreground font-mono">
              You need reviewer or admin role to resolve HITL items.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default AgentsDashboard;
