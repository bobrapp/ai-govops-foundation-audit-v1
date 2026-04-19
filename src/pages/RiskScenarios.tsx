import { Link } from "react-router-dom";
import {
  Shield,
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  DollarSign,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  RISK_SCENARIOS,
  AI_FAILS,
  COMMUNITY_VOICES,
} from "@/data/risk-scenarios";

const RiskScenarios = () => {
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
                Risk Scenarios &amp; AI-Fails
              </div>
            </div>
          </Link>
          <Link to="/docs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> All docs
            </Button>
          </Link>
        </header>

        <section className="container max-w-6xl mx-auto pt-8 pb-10">
          <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider mb-2">
            Why an AOC matters
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Lawsuits, IP loss, and eight-figure write-downs that an AOS attestation
            would have caught.
          </h1>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            Every scenario, every dollar figure, and every quote on this page is backed
            by a public, verifiable URL. The AOS controls listed against each row are
            drawn directly from{" "}
            <Link to="/docs/aos-spec" className="text-primary hover:underline">
              the published v0.1 spec
            </Link>
            .
          </p>
        </section>

        {/* Industry × scenario matrix */}
        <section className="container max-w-6xl mx-auto pb-16">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              End-to-end scenarios by industry
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {RISK_SCENARIOS.map((s) => (
              <article
                key={s.id}
                className="rounded-xl border border-border bg-card-grad p-5 shadow-elev"
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
                  <span className="text-primary">{s.industry}</span>
                  <span className="text-muted-foreground border border-border rounded px-1.5 py-0.5">
                    {s.scenarioType}
                  </span>
                </div>
                <h3 className="mt-2 font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.summary}</p>

                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Risk
                    </dt>
                    <dd className="mt-1">{s.risk}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-primary" /> How AOS mitigates
                    </dt>
                    <dd className="mt-1">{s.mitigation}</dd>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.aosControls.map((c) => (
                        <span
                          key={c}
                          className="font-mono text-[10px] border border-primary/40 text-primary rounded px-1.5 py-0.5"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> Value at stake
                    </dt>
                    <dd className="mt-1">{s.value}</dd>
                  </div>
                </dl>

                <div className="mt-4 pt-3 border-t border-border">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider mb-1">
                    Sources
                  </div>
                  <ul className="space-y-1">
                    {s.sources.map((src) => (
                      <li key={src.url}>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {src.label} <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* AI-fails table */}
        <section className="container max-w-6xl mx-auto pb-16">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              AI-fail register — verified incidents
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl mb-4">
            Curated from public records. The mitigation column shows which AOS controls
            would have failed the build, blocked the deploy, or produced the evidence
            needed to defend the decision.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border bg-card-grad shadow-elev">
            <table className="w-full text-sm">
              <thead className="bg-card text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Org / Year</th>
                  <th className="px-4 py-3">Headline</th>
                  <th className="px-4 py-3">Damage</th>
                  <th className="px-4 py-3">AOS mitigation</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {AI_FAILS.map((f) => (
                  <tr key={f.id} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{f.org}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {f.year}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{f.headline}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{f.summary}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{f.damage}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">{f.mitigation}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {f.aosControls.map((c) => (
                          <span
                            key={c}
                            className="font-mono text-[10px] border border-primary/40 text-primary rounded px-1.5 py-0.5"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ul className="space-y-1">
                        {f.sources.map((src) => (
                          <li key={src.url}>
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {src.label} <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Voices */}
        <section className="container max-w-6xl mx-auto pb-20">
          <div className="flex items-center gap-2 mb-4">
            <Quote className="h-4 w-4 text-primary" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Voices that informed AOS
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl mb-4">
            Public LinkedIn positions from Ken Johnston (AiGovOps Foundation, VP Data /
            Analytics / AI at Envorso) and Bob Rapp (AiGovOps Foundation). Click each
            link to read the full post.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {COMMUNITY_VOICES.map((v) => (
              <article
                key={v.id}
                className="rounded-xl border border-border bg-card-grad p-5 shadow-elev"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{v.author}</div>
                    <div className="text-xs text-muted-foreground">{v.role}</div>
                  </div>
                  <Quote className="h-4 w-4 text-primary opacity-60" />
                </div>
                <blockquote className="mt-3 text-sm italic text-foreground/90 border-l-2 border-primary/40 pl-3">
                  “{v.quote}”
                </blockquote>
                <p className="mt-3 text-xs text-muted-foreground">{v.takeaway}</p>
                <a
                  href={v.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  {v.sourceLabel} <ExternalLink className="h-3 w-3" />
                </a>
              </article>
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

export default RiskScenarios;
