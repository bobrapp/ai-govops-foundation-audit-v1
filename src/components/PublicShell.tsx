import { Link } from "react-router-dom";
import { ReactNode } from "react";
import { Shield, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FOUNDATION } from "@/lib/config";

interface Props {
  children: ReactNode;
  /** Subtitle under the AiGovOps logo (e.g. "Documentation", "Public Registry"). */
  eyebrow?: string;
  /** Right-side action override. Defaults to "Open console". */
  rightSlot?: ReactNode;
  /** Apply the aurora hero background. Default: true. */
  hero?: boolean;
}

/**
 * Shared chrome (header + footer) for all public-facing pages: Landing, Docs,
 * Registry, Verify, Donate, Developers, Feed. Aurora design system.
 */
export function PublicShell({ children, eyebrow = "Review Framework", rightSlot, hero = true }: Props) {
  return (
    <div className={`min-h-screen text-foreground relative overflow-hidden ${hero ? "bg-aurora" : "bg-background"}`}>
      {hero && (
        <>
          <div className="absolute inset-0 bg-grid opacity-[0.18] pointer-events-none" />
          <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-secondary/20 blur-3xl aurora-drift pointer-events-none" />
          <div className="absolute top-20 -right-40 h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-3xl aurora-drift pointer-events-none" style={{ animationDelay: "-9s" }} />
        </>
      )}
      <div className="relative flex flex-col min-h-screen">
        <header className="container max-w-6xl mx-auto flex items-center justify-between py-5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-emerald-grad grid place-items-center shadow-glow group-hover:scale-105 transition-transform">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold tracking-tight leading-none">AiGovOps</div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-1">{eyebrow}</div>
            </div>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/developers" className="hidden md:inline-flex">
              <Button variant="ghost" size="sm" className="story-link">Developers</Button>
            </Link>
            <Link to="/feed" className="hidden md:inline-flex">
              <Button variant="ghost" size="sm" className="story-link">Feed</Button>
            </Link>
            <Link to="/docs" className="hidden md:inline-flex">
              <Button variant="ghost" size="sm" className="story-link">Docs</Button>
            </Link>
            <Link to="/donate" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">
                <Heart className="h-4 w-4 mr-1" /> Donate
              </Button>
            </Link>
            {rightSlot ?? (
              <Link to="/auth">
                <Button size="sm" className="bg-emerald-grad text-primary-foreground hover:opacity-90 shadow-glow">
                  Open console
                </Button>
              </Link>
            )}
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-border/60 py-6 mt-12 bg-background/40 backdrop-blur">
          <div className="container max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
            <div>Stewarded by the {FOUNDATION.name} · Apache-2.0 · CC-BY-4.0 spec</div>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <Link to="/docs" className="hover:text-foreground transition-colors">Docs</Link>
              <Link to="/docs/vocabulary" className="hover:text-foreground transition-colors">Vocabulary</Link>
              <Link to="/developers" className="hover:text-foreground transition-colors">Developers</Link>
              <Link to="/feed" className="hover:text-foreground transition-colors">Feed</Link>
              <Link to="/registry" className="hover:text-foreground transition-colors">Registry</Link>
              <Link to="/donate" className="hover:text-foreground transition-colors">Donate</Link>
              <a href={FOUNDATION.githubOrgUrl} target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
