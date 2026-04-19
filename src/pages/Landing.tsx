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
  BookOpen,
  Heart,
} from "lucide-react";
import { DocsSection } from "@/components/DocsSection";
import { PublicShell } from "@/components/PublicShell";
import { usePageMeta } from "@/hooks/usePageMeta";
import { FOUNDATION, PROJECT } from "@/lib/config";

const Landing = () => {
  usePageMeta({
    title: "AiGovOps Review Framework — Policy-as-Code, audited & sealed",
    description:
      "Run your AI governance policy bundle through agent reviewers, attest with a chartered human, and seal every step in an HMAC-SHA256 audit chain anyone can verify.",
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
      <section className="container max-w-6xl mx-auto pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card-grad text-xs font-mono text-muted-foreground mb-6">
          <span className="pulse-dot" /> Agentic review pipeline · signed audit chain
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] max-w-4xl mx-auto">
          Deploy <span className="text-emerald-grad">Policy-as-Code</span> with an end-to-end agent review.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          The AiGovOps Review Framework runs your AIGovOps Foundation policy bundle through a crew of
          specialist agents — lint, risk-score, map to EU AI Act / NIST AI RMF / ISO 42001, and stress-test
          against your highest-liability scenarios. Every step is HMAC-signed into a tamper-evident audit
          chain.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
              Start a review <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Link to="/docs/prd">
            <Button size="lg" variant="secondary">
              <BookOpen className="h-4 w-4 mr-1" /> Read the PRD
            </Button>
          </Link>
          <Link to="/donate">
            <Button size="lg" variant="outline">
              <Heart className="h-4 w-4 mr-1" /> Support the Foundation
            </Button>
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
