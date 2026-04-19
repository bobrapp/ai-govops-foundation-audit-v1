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
} from "lucide-react";
import { DocsSection } from "@/components/DocsSection";
import { PublicShell } from "@/components/PublicShell";
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
      <section className="container max-w-6xl mx-auto pt-16 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card-grad text-xs font-mono text-muted-foreground mb-6">
          <span className="pulse-dot" /> Reference implementation · {STANDARD.longName} {STANDARD.version}
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] max-w-4xl mx-auto">
          Agents review. Humans decide. <span className="text-emerald-grad">Math proves.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          SLSA-style signed attestations, applied to AI governance. A 10-agent council assesses your
          policy, a chartered human approves, and an HMAC-chained audit trail any third party can
          verify — without your cooperation.
        </p>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto text-left">
          <Link to="/auth?next=/agents/chat" className="group rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/15 p-5 transition-colors">
            <Sparkles className="h-5 w-5 text-primary" />
            <div className="mt-3 font-semibold flex items-center gap-1">Talk to Ken or Bob <ArrowRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 transition-transform" /></div>
            <div className="text-xs text-muted-foreground mt-1">Free intake. A chief auditor qualifies your scope and drafts a Review.</div>
          </Link>
          <Link to="/auth?next=/quick-audit" className="group rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 p-5 transition-colors">
            <Zap className="h-5 w-5 text-primary" />
            <div className="mt-3 font-semibold flex items-center gap-1">Run a free audit <ArrowRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 transition-transform" /></div>
            <div className="text-xs text-muted-foreground mt-1">Sign in, paste code, get findings in ~20 sec.</div>
          </Link>
          <Link to="/demo/enterprise_oss" className="group rounded-xl border border-border bg-card-grad hover:border-primary/40 p-5 transition-colors">
            <Play className="h-5 w-5 text-primary" />
            <div className="mt-3 font-semibold flex items-center gap-1">Watch the 90-sec demo <ArrowRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 transition-transform" /></div>
            <div className="text-xs text-muted-foreground mt-1">See agents hand off live, no login needed.</div>
          </Link>
          <Link to="/registry" className="group rounded-xl border border-warning/30 bg-warning/5 hover:bg-warning/10 p-5 transition-colors">
            <Crown className="h-5 w-5 text-warning" />
            <div className="mt-3 font-semibold flex items-center gap-1">Become a QAGA <ArrowRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 transition-transform" /></div>
            <div className="text-xs text-muted-foreground mt-1">Charter a firm or get individually credentialed.</div>
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Link to="/donate">
            <Button size="sm" variant="ghost"><Heart className="h-4 w-4 mr-1" /> Support the Foundation</Button>
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <span className="border border-border rounded px-2 py-0.5">Apache-2.0</span>
          <span className="border border-border rounded px-2 py-0.5">AOS v0.1</span>
          <span className="border border-border rounded px-2 py-0.5">Audit Chain Verified</span>
          <span className="border border-border rounded px-2 py-0.5">{FOUNDATION.name}</span>
        </div>
      </section>

      <DocsSection />

      <section className="container max-w-6xl mx-auto pb-20">
        <div className="grid md:grid-cols-3 gap-4">
          {agentCards.map((c) => (
            <div key={c.title} className="rounded-xl border border-border bg-card-grad p-5 shadow-elev">
              <c.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-semibold">{c.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{c.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container max-w-6xl mx-auto pb-24">
        <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider mb-3">
          Hardened against
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          {scenarios.map((s) => (
            <div key={s.title} className="rounded-lg border border-border bg-card p-4">
              <div className="font-mono text-[10px] uppercase tracking-wider text-warning">{s.tag}</div>
              <div className="font-medium mt-1 text-sm">{s.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.body}</div>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
};

const agentCards = [
  { icon: ScanLine, title: "Policy Linter", body: "Parses Rego, YAML, JSON, Cedar. Flags syntax errors, unsafe defaults, missing metadata." },
  { icon: Brain, title: "Risk & Ethics Assessor", body: "Scores bias, transparency, oversight, hallucination risk, data minimization." },
  { icon: Scale, title: "Compliance Mapper", body: "Maps clauses to EU AI Act, NIST AI RMF, ISO 42001, SOC 2, HIPAA." },
  { icon: FileLock, title: "Scenario Risk Analyst", body: "Stress-tests against legal, insurable & HR-risk deployment scenarios." },
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
