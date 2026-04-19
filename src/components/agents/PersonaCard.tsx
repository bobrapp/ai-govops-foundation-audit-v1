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

export const PersonaCard = ({ persona }: { persona: PersonaMeta }) => {
  const Icon = roleIcon[persona.role_kind] ?? Crown;
  const isChief = persona.is_chief;

  return (
    <article
      className={`group relative overflow-hidden rounded-xl border bg-card-grad transition-all hover:-translate-y-0.5 ${
        isChief
          ? "border-warning/40 shadow-[0_0_0_1px_hsl(var(--warning)/0.25),0_18px_40px_-20px_hsl(var(--warning)/0.45)]"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className="aspect-square w-full overflow-hidden bg-background">
        <img
          src={persona.portrait_hero ?? persona.portrait}
          alt={`${persona.display_name} — ${persona.role_title}`}
          loading="lazy"
          width={896}
          height={1200}
          className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
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
