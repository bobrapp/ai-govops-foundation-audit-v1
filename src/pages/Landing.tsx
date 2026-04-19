import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ScanLine,
  Scale,
  FileLock,
  Brain,
  Stamp,
  ArrowRight,
  Activity,
  Heart,
  Zap,
  Play,
  Crown,
  Sparkles,
  Package,
  Rss,
  Terminal,
  ShieldCheck,
} from "lucide-react";
import { DocsSection } from "@/components/DocsSection";
import { PublicShell } from "@/components/PublicShell";
import { PersonaAvatar, PersonaStrip, NamedCameo } from "@/components/agents/PersonaPrimitives";
import { personaBySlug } from "@/data/agent-personas";
import { usePageMeta } from "@/hooks/usePageMeta";
import { FOUNDATION, PROJECT, STANDARD } from "@/lib/config";

const Landing = () => {
  usePageMeta({
    title: "AiGovOps Review Framework — Agents review. Humans decide. Math proves.",
    description:
      "Reference implementation of the AiGovOps Open Standard (AOS). SLSA-style signed attestations for AI governance — verified by anyone, priceable by insurers, hostable at OpenSSF.",
    canonical: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: PROJECT.name,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      url: PROJECT.publishedUrl,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: FOUNDATION.name, url: FOUNDATION.url },
    },
  });

  return (
    <PublicShell>
      {/* HERO */}
      <section className="container max-w-6xl mx-auto pt-12 pb-20">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Left: pitch */}
          <div className="lg:col-span-7 space-y-7 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-glass text-xs font-mono text-muted-foreground">
              <span className="pulse-dot" /> Reference implementation · {STANDARD.longName} {STANDARD.version}
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
              Agents review.
              <br />
              Humans decide.
              <br />
              <span className="text-aurora font-display italic">Math proves.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              SLSA-style signed attestations, applied to AI governance. A ten-agent council
              assesses your policy, two chartered humans co-sign, and an HMAC-chained audit trail
              any third party can verify — without your cooperation.
            </p>

            {/* Named cameos */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
              <NamedCameo slug="ken-newton" action="qualifies your scope" />
              <NamedCameo slug="bob-smith" action="co-signs the determination" />
              <NamedCameo slug="turing" action="verifies the chain" />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/auth?next=/agents/chat">
                <Button size="lg" className="bg-emerald-grad text-primary-foreground hover:opacity-90 shadow-glow">
                  <Sparkles className="h-4 w-4 mr-2" /> Talk to Ken or Bob
                </Button>
              </Link>
              <Link to="/demo/enterprise_oss">
                <Button size="lg" variant="outline" className="border-secondary/40 hover:bg-secondary/10">
                  <Play className="h-4 w-4 mr-2" /> Watch the 90-sec demo
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground pt-2">
              <span className="border border-border bg-glass rounded-md px-2 py-1">Apache-2.0</span>
              <span className="border border-border bg-glass rounded-md px-2 py-1">{STANDARD.shortName} {STANDARD.version}</span>
              <span className="border border-primary/30 bg-primary/5 text-primary rounded-md px-2 py-1">SLSA-style attestations</span>
              <span className="border border-secondary/30 bg-secondary/5 text-secondary rounded-md px-2 py-1">Audit chain verified</span>
            </div>
          </div>

          {/* Right: agent council collage */}
          <div className="lg:col-span-5 relative">
            <div className="relative lg:aspect-[4/5] rounded-3xl border border-border bg-glass shadow-elev overflow-hidden p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-transparent to-primary/20 pointer-events-none" />
              <div className="relative h-full flex flex-col">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                  <span className="pulse-dot" /> The council, on duty
                </div>

                {/* Chiefs row */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {(["ken-newton", "bob-smith"] as const).map((slug) => (
                    <Link key={slug} to="/agents" className="group rounded-2xl border border-accent/30 bg-card-grad p-3 hover:border-accent/60 transition-colors shadow-gold">
                      <PersonaAvatar slug={slug} size="lg" className="mx-auto" />
                      <div className="mt-2 text-center">
                        <div className="text-xs font-semibold">{slug === "ken-newton" ? "Ken Newton" : "Bob Smith"}</div>
                        <div className="text-[9px] font-mono uppercase tracking-wider text-accent flex items-center gap-1 justify-center mt-0.5">
                          <Crown className="h-2.5 w-2.5" /> Chief
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Specialists grid — push to bottom of the card so portraits aren't stranded mid-air */}
                <div className="grid grid-cols-4 gap-y-3 gap-x-2 flex-1 content-end">
                  {["turing", "kerckhoffs", "nightingale", "lovelace", "hopper", "pacioli", "arendt", "hamilton"].map((slug) => {
                    const p = personaBySlug(slug);
                    const shortName = p?.display_name.replace(/"[^"]+"\s?/g, "").split(" ").slice(-1)[0] ?? slug;
                    return (
                      <Link
                        key={slug}
                        to="/agents"
                        className="group relative flex flex-col items-center"
                        aria-label={p ? `${p.display_name} — ${p.role_title}` : slug}
                      >
                        <PersonaAvatar slug={slug} size="md" className="group-hover:scale-105 transition-transform" />
                        {/* Subtle hover label — fades in, doesn't shift layout */}
                        <span className="pointer-events-none absolute top-full mt-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-background/90 backdrop-blur-sm border border-border text-[9px] font-mono uppercase tracking-wider text-foreground/90 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 shadow-sm z-10">
                          {shortName}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-border/60 text-center">
                  <Link to="/agents" className="text-xs font-mono text-primary hover:underline inline-flex items-center gap-1">
                    Meet the full council <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ENTRY POINTS */}
      <section className="container max-w-6xl mx-auto pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <EntryCard
            to="/auth?next=/agents/chat"
            icon={Sparkles}
            tone="primary"
            title="Talk to Ken or Bob"
            body="Free intake. A chief auditor qualifies your scope and drafts a Review."
          />
          <EntryCard
            to="/auth?next=/quick-audit"
            icon={Zap}
            tone="primary"
            title="Run a free audit"
            body="Sign in, paste code, get findings in ~20 sec."
          />
          <EntryCard
            to="/demo/enterprise_oss"
            icon={Play}
            tone="secondary"
            title="Watch the 90-sec demo"
            body="See agents hand off live, no login needed."
          />
          <EntryCard
            to="/registry"
            icon={Crown}
            tone="accent"
            title="Become a QAGA"
            body="Charter a firm or get individually credentialed."
          />
        </div>
      </section>

      {/* AGENT MARQUEE */}
      <section className="pb-20">
        <div className="container max-w-6xl mx-auto mb-6 text-center">
          <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
            Ten named agents · two chiefs · every decision attributed
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-2">
            Modeled on the historical figures
            <br />
            who made auditing <span className="text-aurora font-display italic">trustworthy.</span>
          </h2>
        </div>
        <PersonaStrip marquee />
      </section>

      {/* HOW IT WORKS — agent-led narrative */}
      <section className="container max-w-6xl mx-auto pb-20">
        <div className="grid md:grid-cols-3 gap-4">
          <NarrativeCard
            slug="ken-newton"
            step="01"
            action="Qualifies"
            body="Ken Newton receives your intake — paste code, paste a policy, or describe the scope. He drafts a Review with a declared risk tier."
          />
          <NarrativeCard
            slug="nightingale"
            step="02"
            action="Assesses"
            body="The eight specialists score every artifact against AOS controls. Florence Nightingale derives an independent risk tier from the evidence."
          />
          <NarrativeCard
            slug="bob-smith"
            step="03"
            action="Co-signs"
            body="Bob Smith — the Fair Witness — corroborates and co-signs. The HMAC audit chain extends. The certification PDF is sealed."
          />
        </div>
      </section>

      {/* FOR DEVELOPERS & INSURERS */}
      <section className="container max-w-6xl mx-auto pb-20">
        <div className="rounded-3xl border border-border bg-glass shadow-elev p-8 md:p-10">
          <div className="grid md:grid-cols-2 gap-8 mb-8 items-end">
            <div>
              <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider mb-3">
                For developers &amp; insurers · third-party verification, no login required
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                We don't ask you to trust us.
                <br />
                <span className="text-aurora font-display italic">We give you the tools to check.</span>
              </h2>
            </div>
            <p className="text-sm text-muted-foreground md:text-base leading-relaxed">
              The OSS verifier and the public attestation feed are first-class entry points — equal
              to the console. Anyone can re-prove every signed determination, and underwriters can
              ingest the full portfolio over HTTP.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Link to="/developers" className="group rounded-2xl border border-border bg-card-grad hover:border-primary/50 hover:shadow-glow p-6 transition-all">
              <div className="flex items-center justify-between">
                <Package className="h-6 w-6 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">npm · @aigovops/verify</span>
              </div>
              <div className="mt-4 text-xl font-semibold flex items-center gap-2">
                OSS verifier <ArrowRight className="h-4 w-4 opacity-60 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Recompute PDF SHA-256, re-verify the HMAC audit chain, and confirm anchor presence —
                from your own CI, with no access to our database.
              </div>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/60 border border-border text-[11px] font-mono">
                <Terminal className="h-3 w-3 text-primary" /> npm i @aigovops/verify
              </div>
            </Link>
            <Link to="/feed" className="group rounded-2xl border border-border bg-card-grad hover:border-secondary/50 hover:shadow-violet p-6 transition-all">
              <div className="flex items-center justify-between">
                <Rss className="h-6 w-6 text-secondary" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">JSON v1.0 · stable schema</span>
              </div>
              <div className="mt-4 text-xl font-semibold flex items-center gap-2">
                Attestation feed <ArrowRight className="h-4 w-4 opacity-60 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Machine-readable feed of every active certification with declared vs. derived risk
                tier and 12-month expiry — priceable across an entire portfolio.
              </div>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/60 border border-border text-[11px] font-mono">
                <Terminal className="h-3 w-3 text-secondary" /> curl /functions/v1/attestation-feed
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* DOCS */}
      <DocsSection />

      {/* AGENT CAPABILITIES */}
      <section className="container max-w-6xl mx-auto pb-20">
        <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider mb-3">
          Agent capabilities · what the council actually does
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {agentCards.map((c) => (
            <div key={c.title} className="group rounded-2xl border border-border bg-card-grad p-5 shadow-elev hover:border-secondary/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet-grad/20 border border-secondary/30 grid place-items-center">
                  <c.icon className="h-5 w-5 text-secondary" />
                </div>
                <div className="font-semibold">{c.title}</div>
              </div>
              <div className="text-sm text-muted-foreground mt-3 leading-relaxed">{c.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SCENARIOS */}
      <section className="container max-w-6xl mx-auto pb-20">
        <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider mb-3">
          Scenario packs · contextual stress tests over the horizontal {STANDARD.shortName} pipeline
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          {scenarios.map((s) => (
            <div key={s.title} className="rounded-xl border border-border bg-card-grad p-4 hover:border-warning/40 transition-colors">
              <div className="font-mono text-[10px] uppercase tracking-wider text-warning">{s.tag}</div>
              <div className="font-semibold mt-1.5 text-sm">{s.title}</div>
              <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{s.body}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] font-mono text-muted-foreground">
          Scenario packs <em>extend coverage</em>. They never fork the standard — every review runs the
          same {STANDARD.shortName} pipeline regardless of vertical.
        </p>
      </section>

      {/* CLOSING CTA */}
      <section className="container max-w-6xl mx-auto pb-24">
        <div className="rounded-3xl border border-primary/30 bg-glass shadow-glow p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
          <div className="relative">
            <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-2xl mx-auto">
              Reviewable. Reproducible. <span className="text-aurora font-display italic">Reference-grade.</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Run an audit, watch the council deliberate, ship the signed PDF — and let any third
              party re-prove it from scratch.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth?next=/quick-audit">
                <Button size="lg" className="bg-emerald-grad text-primary-foreground hover:opacity-90 shadow-glow">
                  <Zap className="h-4 w-4 mr-2" /> Run a free audit
                </Button>
              </Link>
              <Link to="/donate">
                <Button size="lg" variant="ghost">
                  <Heart className="h-4 w-4 mr-2" /> Support the Foundation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
};

interface EntryCardProps {
  to: string;
  icon: typeof Sparkles;
  tone: "primary" | "secondary" | "accent";
  title: string;
  body: string;
}
const toneMap: Record<EntryCardProps["tone"], string> = {
  primary: "border-primary/40 bg-primary/5 hover:bg-primary/10 hover:shadow-glow",
  secondary: "border-secondary/40 bg-secondary/5 hover:bg-secondary/10 hover:shadow-violet",
  accent: "border-accent/40 bg-accent/5 hover:bg-accent/10 hover:shadow-gold",
};
const toneIconMap: Record<EntryCardProps["tone"], string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
};

function EntryCard({ to, icon: Icon, tone, title, body }: EntryCardProps) {
  return (
    <Link to={to} className={`group rounded-2xl border bg-card-grad p-5 transition-all ${toneMap[tone]}`}>
      <Icon className={`h-5 w-5 ${toneIconMap[tone]}`} />
      <div className="mt-3 font-semibold flex items-center gap-1.5">
        {title} <ArrowRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{body}</div>
    </Link>
  );
}

function NarrativeCard({ slug, step, action, body }: { slug: string; step: string; action: string; body: string }) {
  const p = personaBySlug(slug);
  const name = p ? p.display_name.replace(/"[^"]+"\s?/g, "").trim() : slug;
  return (
    <div className="rounded-2xl border border-border bg-card-grad p-5 shadow-elev relative overflow-hidden group hover:border-primary/40 transition-colors">
      <div className="absolute top-3 right-3 text-[10px] font-mono text-muted-foreground/50">{step}</div>
      <div className="flex items-center gap-3">
        <PersonaAvatar slug={slug} size="md" />
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-primary">{action}</div>
          <div className="font-semibold text-sm tracking-tight">{name}</div>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

const agentCards = [
  { icon: ScanLine, title: "Policy Linter", body: "Parses Rego, YAML, JSON, Cedar. Flags syntax errors, unsafe defaults, missing metadata." },
  { icon: Brain, title: "Risk & Ethics Assessor", body: "Scores bias, transparency, oversight, hallucination risk, data minimization." },
  { icon: Scale, title: "Compliance Mapper", body: "Maps clauses to EU AI Act, NIST AI RMF, ISO 42001, SOC 2, HIPAA, NAIC AI Bulletin." },
  { icon: FileLock, title: "Scenario Pack Analyst", body: "Loads vertical scenario packs (healthcare, IP, HR, OSS) over the horizontal pipeline." },
  { icon: Stamp, title: "Human-in-the-Loop", body: "Reviewer approves, rejects or requests changes — every action signed." },
  { icon: Activity, title: "Append-only Audit Log", body: "Every agent run + decision recorded for evidence-grade compliance." },
];

const scenarios = [
  { tag: "enterprise_oss", title: "Enterprise OSS adoption", body: "Installing tools like OpenCLAW into a regulated org." },
  { tag: "healthcare_codegen", title: "Healthcare code generation", body: "AI building or touching code in HIPAA / FDA contexts." },
  { tag: "generative_ip", title: "Generative IP", body: "Music, art, image, video — provable copyright assertion chain." },
  { tag: "hr_behavior", title: "HR & insurable risk", body: "AI behaviors that create EEOC, harassment, or insurance exposure." },
];

export default Landing;
