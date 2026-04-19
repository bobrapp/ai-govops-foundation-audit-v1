import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { DOCS } from "@/lib/docs-manifest";
import { DocCard } from "@/components/DocCard";

export function DocsSection() {
  return (
    <section id="docs" className="container max-w-6xl mx-auto pb-20">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider mb-2">
            Specification &amp; Documentation
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Read the spec. Diff the controls.
            <br />
            <span className="text-aurora font-display italic">Verify the chain.</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
            Everything that defines the AiGovOps Review Framework — the PRD, the working-backwards
            FAQ, the executive summary, the pitch deck, and the machine-readable AOS spec — is
            published here for public review.
          </p>
        </div>
        <Link
          to="/docs"
          className="hidden sm:inline-flex items-center gap-1 text-sm font-mono text-primary hover:underline whitespace-nowrap"
        >
          All documents <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOCS.map((doc) => (
          <DocCard key={doc.id} doc={doc} />
        ))}
      </div>
    </section>
  );
}
