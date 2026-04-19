import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pause, Play, RotateCcw, ArrowRight, Crown, Stamp, ChevronLeft, ArrowLeft, ArrowRight as ArrowRightIcon, MousePointerClick,
} from "lucide-react";
import { DEMOS, demoBySlug, type DemoBeat } from "@/data/demo-scenarios";
import { portraitFor, personaBySlug } from "@/data/agent-personas";
import { usePageMeta } from "@/hooks/usePageMeta";

const sevTone: Record<string, string> = {
  info: "bg-muted text-muted-foreground border-border",
  low: "bg-primary/10 text-primary border-primary/20",
  medium: "bg-warning/10 text-warning border-warning/30",
  high: "bg-warning/15 text-warning border-warning/40",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

const Demo = () => {
  const { scenario } = useParams<{ scenario?: string }>();
  const nav = useNavigate();
  const demo = useMemo(() => demoBySlug(scenario ?? "healthcare_insurance") ?? DEMOS[0], [scenario]);

  usePageMeta({
    title: `${demo.label} — animated audit demo`,
    description: `Watch the AIgovops Agent Council audit a ${demo.label.toLowerCase()} scenario, with live handoffs between specialists and a final determination.`,
  });

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const timer = useRef<number | null>(null);

  useEffect(() => { setIdx(0); setPaused(false); }, [demo.id]);

  useEffect(() => {
    if (paused) return;
    const beat = demo.beats[idx];
    if (!beat) return;
    if (idx >= demo.beats.length - 1) return; // hold on the last beat
    const dwell = Math.max(300, Math.round(beat.dwell / speed));
    timer.current = window.setTimeout(() => setIdx((i) => i + 1), dwell);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [idx, paused, demo, speed]);

  const beat = demo.beats[idx];
  const total = demo.beats.length;

  const replay = () => { setIdx(0); setPaused(false); };
  const next = () => setIdx((i) => Math.min(i + 1, total - 1));
  const prev = () => setIdx((i) => Math.max(i - 1, 0));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          {DEMOS.map((d) => (
            <button
              key={d.id}
              onClick={() => nav(`/demo/${d.id}`)}
              className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition-colors ${
                d.id === demo.id ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-0.5 mr-1 rounded border border-border bg-muted/30 p-0.5">
            {([0.5, 1, 2] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                  s === speed ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={s === speed}
                title={`Playback speed ${s}x`}
              >
                {s}x
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={prev} disabled={idx === 0}><ArrowLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={next} disabled={idx === total - 1}><ArrowRightIcon className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={replay}><RotateCcw className="h-4 w-4 mr-1.5" /> Replay</Button>
        </div>
      </header>

      {/* Scene */}
      <main className="flex-1 grid place-items-center px-6 py-8 overflow-hidden">
        <div key={idx} className="w-full max-w-5xl animate-fade-in space-y-6">
          {beat?.step && <StepBanner beat={beat} />}
          {beat && <Scene beat={beat} />}
        </div>
      </main>

      {/* Progress + meta */}
      <footer className="border-t border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">
          {demo.label} · {idx + 1} / {total}
          {beat?.stepLabel && <span className="text-primary"> · Step {beat.step}: {beat.stepLabel}</span>}
        </div>
        <div className="flex-1 mx-4 h-1 rounded bg-border overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${((idx + 1) / total) * 100}%` }}
          />
        </div>
        <Link to="/quick-audit">
          <Button size="sm" variant="secondary">Run a real audit <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
        </Link>
      </footer>
    </div>
  );
};

/** Big numbered banner shown above the scene whenever the beat marks a customer-journey step. */
const StepBanner = ({ beat }: { beat: DemoBeat }) => {
  return (
    <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 shadow-glow px-6 py-4 flex items-center gap-5">
      <div className="shrink-0 h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-elev">
        <span className="text-3xl md:text-4xl font-bold tabular-nums">{beat.step}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary/80">
          Step {beat.step} of 5 · {beat.stepLabel}
        </div>
        {beat.youDo && (
          <div className="mt-1 flex items-start gap-2">
            <MousePointerClick className="h-5 w-5 md:h-6 md:w-6 text-primary mt-0.5 shrink-0" />
            <p className="text-xl md:text-3xl font-semibold tracking-tight leading-tight">
              {beat.youDo}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const Scene = ({ beat }: { beat: DemoBeat }) => {
  if (beat.kind === "intro") {
    return (
      <div className="text-center">
        <div className="text-xs font-mono uppercase tracking-[0.3em] text-primary/80 mb-4">scene</div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-4">{beat.title}</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">{beat.body}</p>
      </div>
    );
  }
  if (beat.kind === "code") {
    return (
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">{beat.title}</div>
        <pre className="rounded-xl border border-border bg-card-grad p-6 text-sm md:text-base font-mono leading-relaxed overflow-auto whitespace-pre">
{beat.code}
        </pre>
      </div>
    );
  }
  if (beat.kind === "handoff") {
    const from = beat.personaSlug ? personaBySlug(beat.personaSlug) : null;
    const to = beat.handoffSlug ? personaBySlug(beat.handoffSlug) : null;
    return (
      <div className="flex items-center justify-center gap-8">
        {from && (
          <div className="text-center">
            <img src={from.portrait} alt={from.display_name} className="h-32 w-32 rounded-2xl object-cover object-top border border-border mx-auto" />
            <div className="mt-2 font-medium">{from.display_name}</div>
          </div>
        )}
        <div className="flex flex-col items-center">
          <div className="text-xs font-mono uppercase tracking-[0.3em] text-warning mb-2">handoff</div>
          <ArrowRight className="h-12 w-12 text-warning" />
          {beat.body && <div className="text-sm text-muted-foreground mt-2 max-w-xs text-center">{beat.body}</div>}
        </div>
        {to && (
          <div className="text-center">
            <img src={to.portrait} alt={to.display_name} className="h-32 w-32 rounded-2xl object-cover object-top border border-warning mx-auto shadow-[0_0_0_3px_hsl(var(--warning)/0.3)]" />
            <div className="mt-2 font-medium">{to.display_name}</div>
          </div>
        )}
      </div>
    );
  }
  if (beat.kind === "stamp") {
    const persona = beat.personaSlug ? personaBySlug(beat.personaSlug) : null;
    const tone = beat.severity === "critical" ? "destructive" : beat.severity === "high" ? "warning" : "primary";
    return (
      <div className="text-center">
        {persona && (
          <img src={persona.portrait} alt={persona.display_name} className="h-32 w-32 rounded-2xl object-cover object-top border border-warning mx-auto shadow-[0_0_0_3px_hsl(var(--warning)/0.3)] mb-4" />
        )}
        <div className="text-xs font-mono uppercase tracking-[0.3em] text-warning flex items-center justify-center gap-1.5 mb-2">
          <Crown className="h-3.5 w-3.5" /> Chief auditor signs
        </div>
        <h1 className={`text-5xl md:text-7xl font-bold tracking-tight ${tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-primary"}`}>
          <Stamp className="inline h-12 w-12 mr-3 -mt-2" />
          {beat.title}
        </h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">{beat.body}</p>
      </div>
    );
  }
  // agent + finding
  const persona = beat.personaSlug ? personaBySlug(beat.personaSlug) : null;
  return (
    <div className="grid md:grid-cols-[180px_1fr] gap-6 items-center">
      {persona && (
        <img
          src={persona.portrait} alt={persona.display_name}
          className={`h-44 w-44 rounded-2xl object-cover object-top border ${persona.is_chief ? "border-warning" : "border-border"} mx-auto`}
        />
      )}
      <div>
        {persona && (
          <div className="text-xs font-mono uppercase tracking-wider text-primary/80 mb-1">{persona.display_name} · {persona.role_title}</div>
        )}
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-3">{beat.title}</h2>
        <p className="text-base md:text-lg text-foreground/85">{beat.body}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {beat.severity && (
            <Badge className={`font-mono text-[10px] border ${sevTone[beat.severity]}`}>{beat.severity}</Badge>
          )}
          {beat.controlId && (
            <Badge variant="outline" className="font-mono text-[10px]">{beat.controlId}</Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default Demo;
