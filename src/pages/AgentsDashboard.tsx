import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Activity, ShieldCheck, ShieldAlert, Users, MessagesSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  usePersonas, useDecisions, useHitlQueue, useResolveHitl, type HitlRow,
} from "@/hooks/queries/useAgents";
import { useRoles } from "@/hooks/useRoles";
import { usePageMeta } from "@/hooks/usePageMeta";
import { HitlQueue } from "@/components/agents/HitlQueue";
import { DecisionFeed } from "@/components/agents/DecisionFeed";
import { HitlActionDialog } from "@/components/agents/HitlActionDialog";

const AgentsDashboard = () => {
  usePageMeta({
    title: "Agent Activity — AIgovops",
    description:
      "Live activity feed of every AIgovops auditor agent: decisions, severity, and human-in-the-loop reviews awaiting action.",
  });
  const { isAdmin, isReviewer, canChat } = useRoles();
  const personasQ = usePersonas();
  const decisionsQ = useDecisions(80);
  const hitlQ = useHitlQueue();
  const resolveHitl = useResolveHitl();
  const qc = useQueryClient();

  // Realtime: agent_decisions + hitl_reviews
  useEffect(() => {
    const channel = supabase
      .channel("agents-dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_decisions" },
        () => qc.invalidateQueries({ queryKey: ["agent_decisions"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hitl_reviews" },
        () => qc.invalidateQueries({ queryKey: ["hitl_reviews"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const [openItem, setOpenItem] = useState<HitlRow | null>(null);
  const [note, setNote] = useState("");

  const personas = personasQ.data ?? [];
  const decisions = decisionsQ.data ?? [];
  const hitl = hitlQ.data ?? [];

  const personaIndex = useMemo(
    () => Object.fromEntries(personas.map((p) => [p.id, p])),
    [personas],
  );

  const pendingHitl = hitl.filter((h) => h.status === "pending");
  const resolvedToday = hitl.filter(
    (h) =>
      h.status !== "pending" &&
      h.resolved_at &&
      Date.now() - new Date(h.resolved_at).getTime() < 24 * 60 * 60 * 1000,
  ).length;
  const decisionsToday = decisions.filter(
    (d) => Date.now() - new Date(d.created_at).getTime() < 24 * 60 * 60 * 1000,
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
      toast.error(e instanceof Error ? e.message : "Failed to resolve");
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
            <div className="flex items-center gap-2">
              {canChat && (
                <Button asChild>
                  <Link to="/agents/chat"><MessagesSquare className="h-4 w-4 mr-2" /> Chat with the council</Link>
                </Button>
              )}
              <Button asChild variant="secondary">
                <Link to="/agents"><Users className="h-4 w-4 mr-2" /> View Roster</Link>
              </Button>
            </div>
          }
        />

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Agents" value={personas.length} icon={Users} hint="Including the Chiefs" />
          <StatCard label="Decisions (24h)" value={decisionsToday} icon={Activity} hint={`${decisions.length} total in feed`} />
          <StatCard label="HITL Pending" value={pendingHitl.length} icon={ShieldAlert} hint="Needs human review" tone={pendingHitl.length > 0 ? "warning" : "neutral"} />
          <StatCard label="HITL Resolved (24h)" value={resolvedToday} icon={ShieldCheck} />
        </div>

        <div className="mt-8 grid lg:grid-cols-5 gap-6">
          <HitlQueue
            rows={hitl}
            personaIndex={personaIndex}
            loading={hitlQ.isLoading}
            pendingCount={pendingHitl.length}
            onPick={setOpenItem}
          />
          <DecisionFeed
            rows={decisions}
            personaIndex={personaIndex}
            loading={decisionsQ.isLoading}
          />
        </div>
      </div>

      <HitlActionDialog
        item={openItem}
        personaIndex={personaIndex}
        canResolve={canResolve}
        note={note}
        onNoteChange={setNote}
        onClose={() => setOpenItem(null)}
        onSubmit={submit}
        busy={resolveHitl.isPending}
      />
    </AppShell>
  );
};

export default AgentsDashboard;
