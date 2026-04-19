import { Link } from "react-router-dom";
import { Check, MapPin, Sparkles, Eye, Stamp, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 5-step journey rail used across Landing, Submit/QuickAudit, AgentChat, ReviewDetail.
 *
 * Council-mandated narrative: "Land → Request → Watch → Attest → Certificate"
 * Plain English. No jargon. Same shape on every page so users can locate themselves.
 */

export type JourneyStepId = "land" | "request" | "watch" | "attest" | "certificate";

interface StepDef {
  id: JourneyStepId;
  label: string;
  hint: string;
  icon: typeof MapPin;
  to?: string;
}

const STEPS: StepDef[] = [
  { id: "land",        label: "1 · Choose your path",     hint: "Pick what you're auditing",        icon: MapPin,       to: "/" },
  { id: "request",     label: "2 · Request the audit",    hint: "Paste, upload, or link a policy",  icon: Sparkles,     to: "/quick-audit" },
  { id: "watch",       label: "3 · Watch the council",    hint: "Agents review in real time",       icon: Eye,          to: "/agents/chat" },
  { id: "attest",      label: "4 · Human attestation",    hint: "A chartered human co-signs",       icon: Stamp },
  { id: "certificate", label: "5 · Verifiable cert",      hint: "Math seals it. Anyone can verify.", icon: ShieldCheck },
];

interface JourneyStepperProps {
  current: JourneyStepId;
  /** Optional plain-English line shown under the rail. Sets context for the page. */
  guide?: string;
  className?: string;
}

export const JourneyStepper = ({ current, guide, className }: JourneyStepperProps) => {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <div className={cn("rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-4 shadow-elev", className)}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Where you are in the journey
        </span>
      </div>

      {/* Rail */}
      <ol className="flex items-stretch gap-1 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {STEPS.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const Icon = done ? Check : s.icon;

          const inner = (
            <div
              className={cn(
                "flex-1 min-w-[140px] snap-start rounded-xl border px-3 py-2.5 transition-colors",
                active
                  ? "border-primary/60 bg-primary/10 shadow-glow"
                  : done
                  ? "border-primary/25 bg-primary/5"
                  : "border-border/60 bg-background/40 hover:border-border",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-6 w-6 rounded-full grid place-items-center shrink-0",
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <div
                    className={cn(
                      "text-[11px] font-semibold leading-tight truncate",
                      active ? "text-foreground" : done ? "text-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground leading-tight truncate">
                    {s.hint}
                  </div>
                </div>
              </div>
            </div>
          );

          return (
            <li key={s.id} className="flex-1 min-w-[140px]">
              {s.to && !active ? (
                <Link to={s.to} aria-current={active ? "step" : undefined}>{inner}</Link>
              ) : (
                <div aria-current={active ? "step" : undefined}>{inner}</div>
              )}
            </li>
          );
        })}
      </ol>

      {guide && (
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
          <span className="font-mono uppercase tracking-wider text-foreground/70 mr-1.5">Guide:</span>
          {guide}
        </p>
      )}
    </div>
  );
};
