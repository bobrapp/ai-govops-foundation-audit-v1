import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Shield, ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOCS } from "@/lib/docs-manifest";

const DOC_FILES: Record<string, { file: string; title: string; description: string }> = {
  prd: {
    file: "/docs/AiGovOps_PRD.md",
    title: "Product Requirements Document",
    description: "v0.1 Draft · Stewarded by the AiGovOps Foundation",
  },
  "prd-faq": {
    file: "/docs/AiGovOps_PRD_FAQ.md",
    title: "PRD-FAQ",
    description: "Working-backwards FAQ for non-technical stakeholders",
  },
};

/** Minimal markdown → HTML renderer (headings, lists, paragraphs, bold, code, links). */
function renderMarkdown(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    escape(s)
      .replace(/`([^`]+)`/g, '<code class="font-mono text-xs px-1 py-0.5 rounded bg-muted">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline">$1</a>');

  const lines = md.split("\n");
  const out: string[] = [];
  let inList: "ul" | "ol" | null = null;
  const closeList = () => {
    if (inList) {
      out.push(inList === "ul" ? "</ul>" : "</ol>");
      inList = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      const sizes = ["text-3xl mt-8 mb-3", "text-2xl mt-7 mb-3", "text-xl mt-6 mb-2", "text-lg mt-5 mb-2"];
      out.push(`<h${level} class="font-bold tracking-tight ${sizes[level - 1]}">${inline(h[2])}</h${level}>`);
      continue;
    }
    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) {
      if (inList !== "ul") {
        closeList();
        out.push('<ul class="list-disc pl-6 space-y-1 my-3">');
        inList = "ul";
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      if (inList !== "ol") {
        closeList();
        out.push('<ol class="list-decimal pl-6 space-y-1 my-3">');
        inList = "ol";
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p class="my-3 leading-relaxed text-muted-foreground">${inline(line)}</p>`);
  }
  closeList();
  return out.join("\n");
}

const DocViewer = () => {
  const { slug = "prd" } = useParams<{ slug: string }>();
  const meta = DOC_FILES[slug];
  const docEntry = DOCS.find((d) => d.id === slug);
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meta) {
      setError("Document not found.");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(meta.file)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((md) => setHtml(renderMarkdown(md)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, meta]);

  return (
    <div className="min-h-screen bg-hero text-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="relative">
        <header className="container max-w-4xl mx-auto flex items-center justify-between py-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-accent grid place-items-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">AiGovOps</div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                {docEntry?.title ?? "Document"}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {meta && (
              <a href={meta.file} download>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" /> Source
                </Button>
              </a>
            )}
            <Link to="/docs">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> All docs
              </Button>
            </Link>
          </div>
        </header>

        <article className="container max-w-3xl mx-auto pt-8 pb-20">
          {meta && (
            <div className="mb-8">
              <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider mb-2">
                {meta.description}
              </div>
              <h1 className="text-4xl font-bold tracking-tight">{meta.title}</h1>
            </div>
          )}
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && (
            <div
              className="text-foreground"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </article>

        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground font-mono">
          Stewarded by the AiGovOps Foundation
        </footer>
      </div>
    </div>
  );
};

export default DocViewer;
