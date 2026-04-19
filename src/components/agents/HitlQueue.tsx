import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { portraitFor, roleAccentFor } from "@/data/agent-personas";
import type { HitlRow, PersonaRow } from "@/hooks/queries/useAgents";

const sevTone: Record<string, string> = {
  info: "bg-muted text-muted-foreground border-border",
  low: "bg-primary/10 text-primary border-primary/20",
  medium: "bg-warning/10 text-warning border-warning/30",
  high: "bg-warning/15 text-warning border-warning/40",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

interface Props {
  rows: HitlRow[];
  personaIndex: Record<string, PersonaRow>;
  loading: boolean;
  pendingCount: number;
  onPick: (h: HitlRow) => void;
}

/** Live HITL queue panel (read-only; click a row to act in parent dialog). */
export const HitlQueue = ({ rows, personaIndex, loading, pendingCount, onPick }: Props) => (
  <section className="lg:col-span-2 rounded-xl border border-border bg-card-grad">
    <header className="p-4 border-b border-border flex items-center justify-between">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-warning">
          Human in the Loop
        </div>
        <h2 className="text-base font-semibold mt-0.5">Review Queue</h2>
      </div>
      <Badge variant="secondary" className="font-mono">
        {pendingCount} pending
      </Badge>
    </header>

    <div className="max-h-[640px] overflow-auto divide-y divide-border">
      {loading && <div className="p-6 text-sm text-muted-foreground font-mono">loading…</div>}
      {!loading && rows.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing waiting on a human"
          description="Agents will queue items here when they need approval, override, or judgment."
        />
      )}
      {rows.map((h) => {
        const persona = personaIndex[h.persona_id];
        const accent = roleAccentFor(persona?.slug);
        return (
          <button
            key={h.id}
            onClick={() => onPick(h)}
            className="relative w-full text-left p-4 hover:bg-secondary/40 transition-colors"
            style={
              accent
                ? ({ ["--row-accent" as string]: accent } as CSSProperties)
                : undefined
            }
          >
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
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-md object-cover object-top border"
                  style={
                    accent
                      ? { borderColor: `hsl(var(--row-accent) / 0.45)` }
                      : undefined
                  }
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{h.title}</span>
                  <Badge className={`font-mono text-[10px] border ${sevTone[h.severity]}`}>{h.severity}</Badge>
                  <Badge variant="secondary" className="font-mono text-[10px]">{h.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{h.summary}</div>
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
);
