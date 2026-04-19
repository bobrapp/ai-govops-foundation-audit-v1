import { Link, useLocation, useNavigate } from "react-router-dom";
import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Shield, LogOut, Activity, UserCog, BookOpen, Crown,
  Building2, Heart, Users, Zap, MessagesSquare, Play, ChevronDown, ChevronRight, Wrench,
} from "lucide-react";

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { isAdmin, canChat } = useRoles();
  const nav = useNavigate();
  const loc = useLocation();
  const [opsOpen, setOpsOpen] = useState(
    loc.pathname.startsWith("/audit") ||
      loc.pathname.startsWith("/aos") ||
      loc.pathname.startsWith("/firms") ||
      loc.pathname.startsWith("/admin"),
  );

  // Primary nav — daily-driver actions only.
  // Chat is open to ALL signed-in users (intake mode); curators+ unlock full council.
  const primary = [
    { to: "/quick-audit", label: "Quick Audit", icon: Zap, accent: true },
    { to: "/agents/chat", label: "Talk to Ken & Bob", icon: MessagesSquare, accent: true },
    { to: "/dashboard", label: "Reviews", icon: LayoutDashboard },
    { to: "/agents", label: "Agent Council", icon: Users },
    { to: "/agents/dashboard", label: "Agent Activity", icon: Activity },
    { to: "/demo/enterprise_oss", label: "Watch the Demo", icon: Play },
    { to: "/me/assessor", label: "My QAGA Path", icon: Crown },
  ];

  // Advanced — collapsed under "Operations".
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

  const renderLink = (l: { to: string; label: string; icon: typeof LayoutDashboard; accent?: boolean }) => {
    const active = loc.pathname === l.to || (l.to !== "/" && loc.pathname.startsWith(l.to));
    const Icon = l.icon;
    return (
      <Link
        key={l.to}
        to={l.to}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        } ${l.accent && !active ? "border border-primary/30 bg-primary/5" : ""}`}
      >
        <Icon className={`h-4 w-4 ${l.accent ? "text-primary" : ""}`} />
        {l.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-60 border-r border-border bg-sidebar flex flex-col">
        <Link to="/dashboard" className="px-5 py-5 border-b border-sidebar-border flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-emerald-grad bg-gradient-to-br from-primary to-accent grid place-items-center">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight">AiGovOps</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Review Framework</div>
          </div>
        </Link>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {primary.map(renderLink)}

          <button
            onClick={() => setOpsOpen((o) => !o)}
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            {opsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <Wrench className="h-3 w-3" /> Operations
          </button>
          {opsOpen && <div className="space-y-1">{ops.map(renderLink)}</div>}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <div className="text-xs text-muted-foreground truncate font-mono">{user?.email}</div>
          <Link
            to="/donate"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
          >
            <Heart className="h-4 w-4" /> Support the Foundation
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
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
};
