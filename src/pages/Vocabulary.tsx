import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ExternalLink, ArrowRight, X } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  VOCABULARY,
  CATEGORY_META,
  type VocabCategory,
  type VocabTerm,
} from "@/data/vocabulary";

const CATEGORY_ORDER: VocabCategory[] = [
  "framework",
  "regulation",
  "standard",
  "proposed",
  "process",
  "concept",
];

type Filter = "all" | VocabCategory;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const Vocabulary = () => {
  usePageMeta({
    title: "Vocabulary · AiGovOps Review Framework",
    description:
      "Comprehensive glossary of AiGovOps framework terms, regulations, standards, audit-process concepts, and AI governance terminology — every entry links to a verifiable source.",
    canonical: "/docs/vocabulary",
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VOCABULARY.filter((t) => {
      if (filter !== "all" && t.category !== filter) return false;
      if (!q) return true;
      const hay = [
        t.term,
        t.acronym ?? "",
        t.definition,
        ...(t.aliases ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [filter, query]);

  // Group filtered terms by category, sort alphabetically inside each.
  const grouped = useMemo(() => {
    const map = new Map<VocabCategory, VocabTerm[]>();
    for (const t of filtered) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.term.localeCompare(b.term));
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      meta: CATEGORY_META[c],
      terms: map.get(c)!,
    }));
  }, [filtered]);

  const totalCount = VOCABULARY.length;
  const shownCount = filtered.length;

  return (
    <PublicShell eyebrow="Vocabulary">
      <main className="container max-w-6xl mx-auto pt-12 pb-20">
        <PageHeader
          eyebrow="Documentation index"
          title="Vocabulary"
          description={
            <>
              Every term used across the framework — defined, sourced, and pointed back to where
              it’s operationalized. Each entry links to its canonical source so you can verify the
              definition and to the in-app surface where it lives. {totalCount} terms across six
              categories.
            </>
          }
        />

        {/* ── Search + category chips ─────────────────────────────── */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms, acronyms, or definitions…"
              className="pl-9 pr-9"
              aria-label="Search vocabulary"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className="h-8"
            >
              All <span className="ml-1.5 text-[10px] font-mono opacity-70">{totalCount}</span>
            </Button>
            {CATEGORY_ORDER.map((c) => {
              const count = VOCABULARY.filter((t) => t.category === c).length;
              const active = filter === c;
              return (
                <Button
                  key={c}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(c)}
                  className="h-8"
                >
                  {CATEGORY_META[c].label}
                  <span className="ml-1.5 text-[10px] font-mono opacity-70">{count}</span>
                </Button>
              );
            })}
          </div>

          <div className="text-xs font-mono text-muted-foreground">
            Showing {shownCount} of {totalCount}
            {query && <> · matching “{query}”</>}
          </div>
        </div>

        {/* ── Grouped term list ───────────────────────────────────── */}
        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card-grad p-10 text-center">
            <div className="text-sm text-muted-foreground">No terms match this filter.</div>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Reset
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(({ category, meta, terms }) => (
              <section key={category} id={`cat-${category}`} aria-labelledby={`h-${category}`}>
                <div className="flex items-baseline justify-between mb-3">
                  <div className="flex items-baseline gap-3">
                    <h2
                      id={`h-${category}`}
                      className="text-lg font-semibold tracking-tight"
                    >
                      {meta.label}
                    </h2>
                    <span className="text-xs font-mono text-muted-foreground">
                      {terms.length} term{terms.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:block max-w-md text-right">
                    {meta.description}
                  </span>
                </div>

                <ul className="grid gap-3 md:grid-cols-2">
                  {terms.map((t) => (
                    <li
                      key={t.term}
                      id={slugify(t.term)}
                      className="rounded-xl border border-border bg-card-grad p-4 shadow-elev scroll-mt-24"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold tracking-tight leading-snug">
                            {t.term}
                            {t.acronym && (
                              <span className="ml-2 text-xs font-mono text-muted-foreground">
                                ({t.acronym})
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 font-mono text-[10px] uppercase tracking-wider border rounded-md px-1.5 py-0.5 ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {t.definition}
                      </p>

                      {(t.verifyUrl || t.pointer) && (
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono">
                          {t.verifyUrl && (
                            <a
                              href={t.verifyUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              Verify
                              {t.verifyLabel && (
                                <span className="text-muted-foreground">· {t.verifyLabel}</span>
                              )}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {t.pointer &&
                            (t.pointer.href.startsWith("/") ? (
                              <Link
                                to={t.pointer.href}
                                className="inline-flex items-center gap-1 text-foreground/80 hover:text-foreground"
                              >
                                {t.pointer.label}
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            ) : (
                              <a
                                href={t.pointer.href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-foreground/80 hover:text-foreground"
                              >
                                {t.pointer.label}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </PublicShell>
  );
};

export default Vocabulary;
