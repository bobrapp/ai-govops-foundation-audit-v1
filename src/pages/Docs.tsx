import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOCS } from "@/lib/docs-manifest";
import { DocCard } from "@/components/DocCard";

const Docs = () => {
  return (
    <div className="min-h-screen bg-hero text-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="relative">
        <header className="container max-w-6xl mx-auto flex items-center justify-between py-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-accent grid place-items-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">AiGovOps</div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                Documentation
              </div>
            </div>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
        </header>

        <section className="container max-w-6xl mx-auto pt-12 pb-12">
          <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider mb-2">
            Documentation index
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">All documents</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            The PRD, FAQ, executive summary, pitch deck, AOS spec, and visual artifacts. Everything
            the AiGovOps Foundation publishes to support open review of this framework.
          </p>
        </section>

        <section className="container max-w-6xl mx-auto pb-20">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOCS.map((doc) => (
              <DocCard key={doc.id} doc={doc} />
            ))}
          </div>
        </section>

        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground font-mono">
          Stewarded by the AiGovOps Foundation · Apache-2.0 · CC-BY-4.0 spec
        </footer>
      </div>
    </div>
  );
};

export default Docs;
