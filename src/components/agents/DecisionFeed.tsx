import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity, ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { portraitFor, roleAccentFor } from "@/data/agent-personas";
import type { DecisionRow, PersonaRow } from "@/hooks/queries/useAgents";

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

interface Props {
  rows: DecisionRow[];
  personaIndex: Record<string, PersonaRow>;
  loading: boolean;
}

/** Append-only decision feed; updates live via parent's realtime subscription. */
export const DecisionFeed = ({ rows, personaIndex, loading }: Props) => (
  <section className="lg:col-span-3 rounded-xl border border-border bg-card-grad">
    <header className="p-4 border-b border-border flex items-center justify-between">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-primary/80">Activity</div>
        <h2 className="text-base font-semibold mt-0.5">Agent Decision Feed</h2>
      </div>
      <Badge variant="secondary" className="font-mono">
        {rows.length} entries
      </Badge>
    </header>

    <div className="max-h-[640px] overflow-auto divide-y divide-border">
      {loading && <div className="p-6 text-sm text-muted-foreground font-mono">loading…</div>}
      {!loading && rows.length === 0 && (
        <EmptyState
          icon={Activity}
          title="No agent activity yet"
          description="Decisions land here as the agent pipeline runs against new reviews."
        />
      )}
      {rows.map((d) => {
        const persona = personaIndex[d.persona_id];
        const accent = roleAccentFor(persona?.slug);
        return (
          <article
            key={d.id}
            className="relative p-4 transition-colors hover:bg-secondary/20"
            style={
              accent
                ? ({ ["--row-accent" as string]: accent } as CSSProperties)
                : undefined
            }
          >
            {/* Role-tinted left accent stripe */}
            {accent && (
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-2 bottom-2 w-[3px] rounded-r-sm"
                style={{
                  background:
                    "linear-gradient(180deg, hsl(var(--row-accent) / 0.85), hsl(var(--row-accent) / 0.25))",
                  boxShadow: "0 0 18px -2px hsl(var(--row-accent) / 0.45)",
                }}
              />
            )}
            <div className="flex items-start gap-3">
              {persona && portraitFor(persona.slug) && (
                <img
                  src={portraitFor(persona.slug)}
                  alt={persona.display_name}
                  loading="lazy"
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-md object-cover object-top border"
                  style={
                    accent
                      ? { borderColor: `hsl(var(--row-accent) / 0.45)` }
                      : undefined
                  }
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{persona?.display_name ?? "Unknown agent"}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">{persona?.role_title}</span>
                  <Badge className={`font-mono text-[10px] border ${sevTone[d.severity]}`}>{d.severity}</Badge>
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
                  <span>{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
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
);
