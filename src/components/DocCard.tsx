import { Link } from "react-router-dom";
import { ArrowUpRight, Download } from "lucide-react";
import type { DocEntry } from "@/lib/docs-manifest";

interface Props {
  doc: DocEntry;
}

export function DocCard({ doc }: Props) {
  const Icon = doc.icon;
  const isDownload = !!doc.file;

  const inner = (
    <div className="group h-full rounded-2xl border border-border bg-card-grad p-5 shadow-elev transition-all hover:border-primary/40 hover:shadow-glow hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="h-11 w-11 rounded-xl border border-primary/30 bg-primary/10 grid place-items-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground border border-border bg-glass rounded-md px-2 py-0.5">
          {doc.badge}
        </span>
      </div>
      <div className="mt-4 font-semibold tracking-tight">{doc.title}</div>
      <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{doc.description}</p>
      <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <span>{doc.size} · upd {doc.updated}</span>
        <span className="inline-flex items-center gap-1 text-primary group-hover:translate-x-0.5 transition-transform">
          {isDownload ? (
            <>
              Download <Download className="h-3 w-3" />
            </>
          ) : (
            <>
              View <ArrowUpRight className="h-3 w-3" />
            </>
          )}
        </span>
      </div>
    </div>
  );

  if (isDownload) {
    return (
      <a href={doc.file} download className="block h-full">
        {inner}
      </a>
    );
  }
  return (
    <Link to={doc.route!} className="block h-full">
      {inner}
    </Link>
  );
}
