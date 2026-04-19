import { Link, useLocation, useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FilePlus2, Shield, LogOut, Activity, UserCog, BookOpen, Crown, Building2, Heart } from "lucide-react";

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useRoles();
  const nav = useNavigate();
  const loc = useLocation();

  const links = [
    { to: "/dashboard", label: "Reviews", icon: LayoutDashboard },
    { to: "/submit", label: "New Review", icon: FilePlus2 },
    { to: "/aos", label: "AOS Catalog", icon: BookOpen },
    { to: "/me/assessor", label: "My QAGA Path", icon: Crown },
    { to: "/audit", label: "Audit Log", icon: Activity },
    ...(isAdmin
      ? [
          { to: "/firms", label: "Firms (QAGAC)", icon: Building2 },
          { to: "/admin", label: "Roles & Access", icon: UserCog },
        ]
      : [{ to: "/admin", label: "Bootstrap Admin", icon: UserCog }]),
  ];

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
        <nav className="flex-1 p-2 space-y-1">
          {links.map((l) => {
            const active = loc.pathname.startsWith(l.to);
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
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
