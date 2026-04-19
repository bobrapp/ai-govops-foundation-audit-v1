import { ShieldCheck, AlertTriangle, ShieldX, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Ship-readiness verdict — the single most important number on the page.
 *
 * Council doctrine: findings are Pass / Flag / Fail, not naked numbers.
 * User mandate: a measurable % to ship.
 *
 * Compromise (per locked Q2): traffic-light verdict is the headline,
 * the % rides as a supporting subtitle. Severity counts shown as chips
 * underneath, with the underlying severity name visible on hover.
 *
 * Math:
 *   raw_risk = 4·critical + 2·high + 1·medium
 *   readiness = max(0, 100 - raw_risk·10)         // simple, explainable, monotonic
 *   verdict   = critical>0       → RED do-not-ship
 *               high>0           → YELLOW ship-with-changes
 *               otherwise        → GREEN ship
 */

interface Finding {
  severity: "info" | "low" | "medium" | "high" | "critical";
}

type Verdict = "green" | "yellow" | "red";

const VERDICT_META: Record<Verdict, { label: string; sub: string; icon: typeof ShieldCheck; tone: string; ring: string }> = {
  green: {
    label: "Ready to ship",
    sub: "No blocking findings. Proceed to attestation.",
    icon: ShieldCheck,
    tone: "text-primary",
    ring: "ring-primary/40 bg-primary/5 border-primary/30",
  },
  yellow: {
    label: "Ship with changes",
    sub: "High-severity flags must be resolved or compensated before attestation.",
    icon: AlertTriangle,
    tone: "text-warning",
    ring: "ring-warning/40 bg-warning/5 border-warning/30",
  },
  red: {
    label: "Do not ship",
    sub: "Critical findings present. Remediate or seek QAGAC partner deep-dive before re-running.",
    icon: ShieldX,
    tone: "text-destructive",
    ring: "ring-destructive/40 bg-destructive/5 border-destructive/30",
  },
};

// Plain-English severity translation (council doctrine: Pass/Flag/Fail in UI)
const SEV_BUCKET: Record<Finding["severity"], { bucket: "pass" | "flag" | "fail"; label: string }> = {
  info: { bucket: "pass", label: "Pass" },
  low: { bucket: "pass", label: "Pass" },
  medium: { bucket: "flag", label: "Flag" },
  high: { bucket: "fail", label: "Fail" },
  critical: { bucket: "fail", label: "Fail" },
};

export function ShipReadiness({ findings, className }: { findings: Finding[]; className?: string }) {
  const counts = findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    },
    { info: 0, low: 0, medium: 0, high: 0, critical: 0 } as Record<Finding["severity"], number>,
  );

  const rawRisk = 4 * counts.critical + 2 * counts.high + 1 * counts.medium;
  const readiness = Math.max(0, 100 - rawRisk * 10);
  const verdict: Verdict = counts.critical > 0 ? "red" : counts.high > 0 ? "yellow" : "green";

  const meta = VERDICT_META[verdict];
  const Icon = meta.icon;

  // Pass/Flag/Fail bucket totals for the chip row
  const buckets = {
    pass: counts.info + counts.low,
    flag: counts.medium,
    fail: counts.high + counts.critical,
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "rounded-2xl border p-5 ring-1 shadow-elev backdrop-blur-sm",
          meta.ring,
          className,
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "h-14 w-14 shrink-0 rounded-2xl grid place-items-center border",
              meta.ring,
            )}
          >
            <Icon className={cn("h-7 w-7", meta.tone)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-[10px] font-mono uppercase tracking-[0.18em]", meta.tone)}>
                Ship-readiness verdict
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="How is this calculated?">
                    <HelpCircle className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Verdict comes from the council's findings, not a number.
                  GREEN = no high/critical · YELLOW = high present · RED = critical present.
                  The % below is supporting context: 100 minus weighted risk
                  (critical×4 + high×2 + medium×1, ×10).
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="mt-1 flex items-baseline gap-3 flex-wrap">
              <h2 className={cn("text-3xl md:text-4xl font-bold tracking-tight", meta.tone)}>
                {meta.label}
              </h2>
              <span className="font-mono text-2xl tabular-nums text-foreground/80">
                {readiness}<span className="text-base text-muted-foreground">%</span>
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{meta.sub}</p>

            {/* Pass / Flag / Fail chip row — plain-English buckets */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <BucketChip label="Pass" count={buckets.pass} tone="primary" hint="info + low severity" />
              <BucketChip label="Flag" count={buckets.flag} tone="warning" hint="medium severity" />
              <BucketChip label="Fail" count={buckets.fail} tone="destructive" hint="high + critical severity" />
              <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {findings.length} finding{findings.length === 1 ? "" : "s"} reviewed
              </span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function BucketChip({
  label,
  count,
  tone,
  hint,
}: {
  label: string;
  count: number;
  tone: "primary" | "warning" | "destructive";
  hint: string;
}) {
  const toneCls =
    tone === "primary"
      ? "border-primary/30 bg-primary/10 text-primary"
      : tone === "warning"
        ? "border-warning/30 bg-warning/10 text-warning"
        : "border-destructive/30 bg-destructive/10 text-destructive";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono uppercase tracking-wider",
            toneCls,
            count === 0 && "opacity-50",
          )}
        >
          {label} <span className="tabular-nums">{count}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}
