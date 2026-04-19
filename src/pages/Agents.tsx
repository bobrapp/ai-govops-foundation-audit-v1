import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/page-header";
import { PersonaCard } from "@/components/agents/PersonaCard";
import { PERSONAS } from "@/data/agent-personas";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

const Agents = () => {
  usePageMeta({
    title: "Agent Roster — AIgovops",
    description:
      "Meet the AIgovops auditor agents. Each persona is modeled on a historical figure from math, science, audit, engineering, or security — with explicit skills and guardrails.",
  });

  const chiefs = PERSONAS.filter((p) => p.is_chief);
  const team = PERSONAS.filter((p) => !p.is_chief);

  return (
    <AppShell>
      <div className="p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Agent Roster"
          eyebrow="The AIgovops Council"
          description="Each auditor agent is modeled on a historical (or fictional) figure whose life's work makes them historically fit for the role. Every agent operates under explicit skills and hard guardrails — and answers to the Chiefs."
          actions={
            <Button asChild variant="secondary">
              <Link to="/agents/dashboard">
                <Activity className="h-4 w-4 mr-2" />
                Activity Dashboard
              </Link>
            </Button>
          }
        />

        {/* Co-Chiefs — featured */}
        <section className="mt-8">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-warning/80 mb-2">
            Chief Auditors · sign jointly
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {chiefs.map((c) => (
              <PersonaCard key={c.slug} persona={c} />
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-warning/20 bg-card-grad p-5 text-sm text-muted-foreground leading-relaxed">
            Final determinations require <span className="text-warning font-medium">both chiefs to co-sign</span>:
            Ken weighs the evidence and applies independence rules; Bob, the Fair Witness, attests only to what was
            directly observed in the audit chain. Critical findings cannot be signed solo.
          </div>
        </section>

        {/* Specialists */}
        <section className="mt-12">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80 mb-2">
            Specialist Agents
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {team.map((p) => (
              <PersonaCard key={p.slug} persona={p} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default Agents;
