import type { CSSProperties } from "react";
import { Crown, Shield, Lock, BarChart3, Code2, Server, Scale, Heart, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PersonaMeta, RoleKind } from "@/data/agent-personas";

const roleIcon: Record<RoleKind, typeof Crown> = {
  chief: Crown,
  cryptography: Lock,
  security: Shield,
  risk: BarChart3,
  code: Code2,
  systems: Server,
  compliance: Scale,
  ethics: Heart,
  sre: Activity,
};

// Role-tinted ambient glow. HSL-only; tuned to sit *under* the shared aurora
// palette so the set still reads as one. Two stops per role: a warmer "key"
// and a cooler "rim" that breathes from opposite corners.
const roleGlow: Record<RoleKind, { key: string; rim: string; ring: string }> = {
  chief:        { key: "38 95% 60%",  rim: "42 100% 70%", ring: "38 95% 60%"  }, // gold
  cryptography: { key: "248 85% 62%", rim: "212 90% 60%", ring: "248 80% 60%" }, // indigo
  security:     { key: "188 85% 55%", rim: "158 78% 48%", ring: "188 80% 55%" }, // teal/emerald
  risk:         { key: "28 95% 60%",  rim: "350 80% 62%", ring: "28 95% 60%"  }, // amber→signal
  code:         { key: "295 75% 65%", rim: "252 70% 65%", ring: "278 75% 65%" }, // magenta/violet
  systems:      { key: "188 90% 55%", rim: "212 90% 60%", ring: "192 85% 55%" }, // cyan
  compliance:   { key: "158 78% 48%", rim: "178 70% 52%", ring: "168 75% 50%" }, // emerald
  ethics:       { key: "342 80% 65%", rim: "320 70% 62%", ring: "338 78% 62%" }, // rose
  sre:          { key: "172 80% 55%", rim: "208 85% 60%", ring: "188 80% 55%" }, // mint→sky
};

export const PersonaCard = ({ persona }: { persona: PersonaMeta }) => {
  const Icon = roleIcon[persona.role_kind] ?? Crown;
  const isChief = persona.is_chief;
  const glow = roleGlow[persona.role_kind] ?? roleGlow.chief;

  // Per-card CSS vars feed the glow layers; allows hover to intensify cleanly.
  const styleVars = {
    ["--glow-key" as string]: glow.key,
    ["--glow-rim" as string]: glow.rim,
    ["--glow-ring" as string]: glow.ring,
  } as React.CSSProperties;

  return (
    <article
      style={styleVars}
      className={`group relative overflow-hidden rounded-xl border bg-card-grad transition-all hover:-translate-y-0.5 ${
        isChief
          ? "border-warning/40 shadow-[0_0_0_1px_hsl(var(--warning)/0.25),0_18px_40px_-20px_hsl(var(--warning)/0.45)]"
          : "border-border hover:border-[hsl(var(--glow-ring)/0.5)]"
      }`}
    >
      {/* Role-tinted ambient glow — sits behind everything, intensifies on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `
            radial-gradient(ellipse 80% 55% at 18% 0%, hsl(var(--glow-key) / 0.32), transparent 60%),
            radial-gradient(ellipse 70% 50% at 100% 100%, hsl(var(--glow-rim) / 0.22), transparent 65%)
          `,
        }}
      />

      <div className="relative aspect-square w-full overflow-hidden bg-background">
        <img
          src={persona.portrait_hero ?? persona.portrait}
          alt={`${persona.display_name} — ${persona.role_title}`}
          loading="lazy"
          width={896}
          height={1200}
          className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
        />
        {/* Soft role-tinted vignette behind the portrait fade */}
        <div
          className="pointer-events-none absolute inset-0 mix-blend-soft-light opacity-60"
          style={{
            background: `radial-gradient(ellipse 65% 55% at 50% 35%, hsl(var(--glow-key) / 0.55), transparent 70%)`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      </div>

      <div className="relative -mt-20 p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${isChief ? "text-warning" : "text-primary"}`} />
              <h3 className="text-lg font-semibold tracking-tight">{persona.display_name}</h3>
            </div>
            <div className="mt-0.5 text-xs font-mono text-muted-foreground">
              {persona.era}
            </div>
          </div>
          {isChief && (
            <Badge className="bg-warning/15 text-warning border border-warning/30 font-mono text-[10px] uppercase tracking-wider">
              Chief
            </Badge>
          )}
        </div>

        <div className="text-xs font-mono uppercase tracking-wider text-primary/90">
          {persona.role_title}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-4">
          {persona.short_bio}
        </p>

        <div>
          <div className="mb-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {persona.skills.map((s) => (
              <Badge key={s} variant="secondary" className="font-mono text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Guardrails
          </div>
          <ul className="space-y-1">
            {persona.guardrails.map((g) => (
              <li key={g} className="flex items-start gap-1.5 text-[11px] font-mono text-foreground/80">
                <span className="mt-1 h-1 w-1 rounded-full bg-warning/70 shrink-0" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
};
