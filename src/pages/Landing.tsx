import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, GitBranch, ScanLine, Scale, FileLock, Brain, Stamp, ArrowRight, Activity } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-hero text-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="relative">
        <header className="container max-w-6xl mx-auto flex items-center justify-between py-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-accent grid place-items-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">AiGovOps</div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Review Framework</div>
            </div>
          </div>
          <Link to="/auth">
            <Button variant="secondary" size="sm">Open console</Button>
          </Link>
        </header>

        <section className="container max-w-6xl mx-auto pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card-grad text-xs font-mono text-muted-foreground mb-6">
            <span className="pulse-dot" /> Agentic review pipeline · signed audit chain
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] max-w-4xl mx-auto">
            Deploy{" "}
            <span className="text-emerald-grad">Policy-as-Code</span>{" "}
            with an end-to-end agent review.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            The AiGovOps Review Framework runs your AIGovOps Foundation policy bundle through a
            crew of specialist agents — lint, risk-score, map to EU AI Act / NIST AI RMF / ISO 42001,
            and stress-test against your highest-liability scenarios. Every step is HMAC-signed
            into a tamper-evident audit chain.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
                Start a review <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <a href="https://www.aigovopsfoundation.org/" target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline">About AIGovOps Foundation</Button>
            </a>
          </div>
        </section>

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
          <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider mb-3">Hardened against</div>
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

        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground font-mono">
          AiGovOps Review Framework · for the AIGovOps Foundation policy-as-code service
        </footer>
      </div>
    </div>
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
