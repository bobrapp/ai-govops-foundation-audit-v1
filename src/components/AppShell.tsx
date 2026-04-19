import { Link, useLocation, useNavigate } from "react-router-dom";
import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { PersonaAvatar } from "@/components/agents/PersonaPrimitives";
import {
  LayoutDashboard, Shield, LogOut, Activity, UserCog, BookOpen, Crown,
  Building2, Heart, Users, Zap, MessagesSquare, Play, ChevronDown, ChevronRight, Wrench,
} from "lucide-react";

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useRoles();
  const nav = useNavigate();
  const loc = useLocation();
  const [opsOpen, setOpsOpen] = useState(
    loc.pathname.startsWith("/audit") ||
      loc.pathname.startsWith("/aos") ||
      loc.pathname.startsWith("/firms") ||
      loc.pathname.startsWith("/admin"),
  );

  const primary = [
    { to: "/quick-audit", label: "Quick Audit", icon: Zap, accent: "primary" as const },
    { to: "/agents/chat", label: "Talk to Ken & Bob", icon: MessagesSquare, accent: "accent" as const },
    { to: "/dashboard", label: "Reviews", icon: LayoutDashboard },
    { to: "/agents", label: "Agent Council", icon: Users },
    { to: "/agents/dashboard", label: "Agent Activity", icon: Activity },
    { to: "/demo/enterprise_oss", label: "Watch the Demo", icon: Play },
    { to: "/me/assessor", label: "My QAGA Path", icon: Crown },
  ];

  const ops = [
    { to: "/aos", label: "AOS Catalog", icon: BookOpen },
    { to: "/audit", label: "Audit Log", icon: Activity },
    ...(isAdmin
      ? [
          { to: "/firms", label: "Firms (QAGAC)", icon: Building2 },
          { to: "/admin", label: "Roles & Access", icon: UserCog },
        ]
      : [{ to: "/admin", label: "Bootstrap Admin", icon: UserCog }]),
  ];

  type LinkSpec = { to: string; label: string; icon: typeof LayoutDashboard; accent?: "primary" | "accent" };

  const renderLink = (l: LinkSpec) => {
    const active = loc.pathname === l.to || (l.to !== "/" && loc.pathname.startsWith(l.to));
    const Icon = l.icon;
    const accentBg =
      l.accent === "accent"
        ? "border border-accent/40 bg-accent/10"
        : l.accent === "primary"
        ? "border border-primary/40 bg-primary/10"
        : "";
    const accentIcon =
      l.accent === "accent" ? "text-accent" : l.accent === "primary" ? "text-primary" : "";
    return (
      <Link
        key={l.to}
        to={l.to}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-glass"
            : `text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground ${l.accent && !active ? accentBg : ""}`
        }`}
      >
        <Icon className={`h-4 w-4 ${accentIcon}`} />
        {l.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col relative overflow-hidden">
        {/* Aurora wash */}
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/10 via-transparent to-primary/10 pointer-events-none" />

        <Link to="/dashboard" className="relative px-5 py-5 border-b border-sidebar-border flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-emerald-grad grid place-items-center shadow-glow">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight leading-none">AiGovOps</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-1">Review Framework</div>
          </div>
        </Link>

        {/* On-duty chiefs */}
        <div className="relative px-3 py-3 border-b border-sidebar-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2 px-2">On duty</div>
          <Link to="/agents" className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent/60 transition-colors">
            <div className="flex -space-x-2">
              <PersonaAvatar slug="ken-newton" size="sm" />
              <PersonaAvatar slug="bob-smith" size="sm" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold leading-tight">Ken &amp; Bob</div>
              <div className="text-[10px] font-mono text-accent leading-tight">Co-chief auditors</div>
            </div>
          </Link>
        </div>

        <nav className="relative flex-1 p-2 space-y-1 overflow-y-auto">
          {primary.map(renderLink)}

          <button
            onClick={() => setOpsOpen((o) => !o)}
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            {opsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <Wrench className="h-3 w-3" /> Operations
          </button>
          {opsOpen && <div className="space-y-1 animate-fade-in">{ops.map(renderLink)}</div>}
        </nav>

        <div className="relative p-3 border-t border-sidebar-border space-y-1">
          <div className="text-xs text-muted-foreground truncate font-mono px-1">{user?.email}</div>
          <Link
            to="/donate"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
          >
            <Heart className="h-4 w-4 text-accent" /> Support the Foundation
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={async () => { await signOut(); nav("/"); }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-aurora">
        <div className="absolute inset-0 bg-grid opacity-[0.06] pointer-events-none" />
        <div className="relative">{children}</div>
      </main>
    </div>
  );
};
