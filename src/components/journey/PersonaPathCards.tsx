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
    iam: "I am a healthcare team",
    what: "shipping a model that affects a patient",
    packLabel: "High-stakes AI",
    example: "e.g. a cancer risk-scoring tool",
    tone: "rose",
  },
  {
    scenario: "general",
    emoji: "🛠️",
    icon: Rocket,
    iam: "I am a tech founder",
    what: "shipping a generative AI product",
    packLabel: "AI Product Governance",
    example: "e.g. a B2B GenAI feature",
    tone: "primary",
  },
  {
    scenario: "enterprise_oss",
    emoji: "🏛️",
    icon: Building2,
    iam: "I am an auditor or CPA firm",
    what: "certifying a client's AI system",
    packLabel: "QAGAC Certification",
    example: "e.g. SOC 2 + AI add-on",
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
            <div className="mt-1 font-semibold text-sm leading-tight">{c.iam}</div>
            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.what}</div>
            <div className="mt-3 text-[10px] font-mono text-muted-foreground/70">{c.example}</div>
            <div className={cn("mt-3 inline-flex items-center gap-1 text-xs font-semibold", TONE_TEXT[c.tone])}>
              Start here <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        );
      })}
    </div>
  );
};
