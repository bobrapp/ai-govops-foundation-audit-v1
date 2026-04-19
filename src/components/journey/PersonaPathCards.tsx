import { Link } from "react-router-dom";
import { Stethoscope, Rocket, Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The three "I am…" persona cards the council mandated for the Landing hero.
 * Clicking pre-fills the scenario_tag downstream via ?scenario= query param.
 *
 * NOTE: scenario values map 1:1 to the `scenario_tag` enum in the database.
 */

interface PathCard {
  scenario: "healthcare_codegen" | "general" | "enterprise_oss";
  emoji: string;
  icon: typeof Stethoscope;
  iam: string;
  what: string;
  packLabel: string;
  example: string;
  tone: "rose" | "primary" | "accent";
}

const CARDS: PathCard[] = [
  {
    scenario: "healthcare_codegen",
    emoji: "🏥",
    icon: Stethoscope,
    iam: "Patient harm from AI",
    what: "I'm shipping a model whose output reaches a patient. I need to prove it won't hurt them.",
    packLabel: "Healthcare · HIPAA + EU AI Act Art. 6",
    example: "e.g. cancer risk-scoring · clinical triage · diagnosis aid",
    tone: "rose",
  },
  {
    scenario: "general",
    emoji: "🚀",
    icon: Rocket,
    iam: "Shipping GenAI without a lawyer in the room",
    what: "I'm a founder. I need a defensible answer to 'is this safe to launch?' before the first paying customer.",
    packLabel: "Founder · AI product governance",
    example: "e.g. B2B copilot · agentic workflow · LLM-backed feature",
    tone: "primary",
  },
  {
    scenario: "enterprise_oss",
    emoji: "🏛️",
    icon: Building2,
    iam: "Certifying somebody else's AI",
    what: "I'm an auditor or CPA firm. I need a chain my client's regulator and their insurer will accept.",
    packLabel: "Auditor · QAGAC certification",
    example: "e.g. SOC 2 + AI add-on · ISO 42001 readiness",
    tone: "accent",
  },
];

const TONE: Record<PathCard["tone"], string> = {
  rose: "border-secondary/30 hover:border-secondary/60 hover:shadow-violet",
  primary: "border-primary/30 hover:border-primary/60 hover:shadow-glow",
  accent: "border-accent/30 hover:border-accent/60 hover:shadow-gold",
};

const TONE_TEXT: Record<PathCard["tone"], string> = {
  rose: "text-secondary",
  primary: "text-primary",
  accent: "text-accent",
};

export const PersonaPathCards = ({ className }: { className?: string }) => {
  return (
    <div className={cn("grid sm:grid-cols-3 gap-3", className)}>
      {CARDS.map((c) => {
        const Icon = c.icon;
        return (
          <Link
            key={c.scenario}
            to={`/auth?next=${encodeURIComponent(`/quick-audit?scenario=${c.scenario}`)}`}
            className={cn(
              "group rounded-2xl border bg-card-grad p-5 transition-all",
              TONE[c.tone],
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-2xl leading-none" aria-hidden>{c.emoji}</span>
              <Icon className={cn("h-4 w-4", TONE_TEXT[c.tone])} />
            </div>
            <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
              {c.packLabel}
            </div>
            <div className={cn("mt-1 font-bold text-base leading-snug", TONE_TEXT[c.tone])}>{c.iam}</div>
            <div className="text-xs text-foreground/85 mt-1.5 leading-relaxed">{c.what}</div>
            <div className="mt-3 text-[10px] font-mono text-muted-foreground/70 leading-relaxed">{c.example}</div>
            <div className={cn("mt-4 inline-flex items-center gap-1 text-xs font-semibold", TONE_TEXT[c.tone])}>
              Pick this problem <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        );
      })}
    </div>
  );
};
