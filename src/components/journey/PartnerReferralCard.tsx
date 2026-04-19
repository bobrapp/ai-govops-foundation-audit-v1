import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ArrowRight, Globe2, ShieldCheck } from "lucide-react";

/**
 * Partner referral — Step 5+: "send to a chartered firm for deep dive".
 *
 * Always shown after attestation regardless of verdict (per locked Q3),
 * because the partner program is the long-tail revenue + trust loop.
 * Pulls 1-3 active firms from the public view; deep-link to /firms for full list.
 */

interface FirmRow {
  id: string;
  name: string | null;
  jurisdiction: string | null;
  active_assessor_count: number | null;
  website: string | null;
}

export function PartnerReferralCard({ reviewId, scenarios }: { reviewId: string; scenarios?: string[] }) {
  const [firms, setFirms] = useState<FirmRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("qagac_firms_public")
        .select("id, name, jurisdiction, active_assessor_count, website")
        .eq("status", "active")
        .eq("public_listed", true)
        .order("active_assessor_count", { ascending: false })
        .limit(3);
      if (!cancelled) {
        setFirms(data ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-accent/30 bg-card-grad shadow-gold p-5 md:p-6">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="h-10 w-10 rounded-xl border border-accent/40 bg-accent/10 grid place-items-center">
          <Building2 className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-accent">
            Step 5+ · Optional human deep-dive
          </div>
          <h3 className="text-lg md:text-xl font-bold tracking-tight mt-1">
            Want a chartered firm to audit this in depth?
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-2xl">
            The council issued the attestation. A QAGAC partner firm can run a deeper engagement —
            on-site evidence collection, regulator-facing letter, liability-bearing opinion.
            Pick a firm; they'll request engagement on this review.
          </p>
        </div>
      </div>

      {/* Firm shortlist */}
      <div className="mt-5 grid sm:grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl border border-border bg-background/40 animate-pulse" />
            ))
          : firms.length === 0
            ? (
              <div className="sm:col-span-3 rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
                No partner firms listed yet.{" "}
                <Link to="/firms" className="text-accent hover:underline font-medium">
                  Browse the registry →
                </Link>
              </div>
            )
            : firms.map((f) => (
                <Link
                  key={f.id}
                  to={`/firms#firm-${f.id}`}
                  className="group rounded-xl border border-border bg-background/40 p-3 hover:border-accent/60 hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-accent shrink-0" />
                    <div className="font-semibold text-sm truncate">{f.name ?? "Unnamed firm"}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {f.jurisdiction && (
                      <span className="inline-flex items-center gap-1">
                        <Globe2 className="h-3 w-3" /> {f.jurisdiction}
                      </span>
                    )}
                    <span>· {f.active_assessor_count ?? 0} QAGAs</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                    Request engagement{" "}
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] font-mono text-muted-foreground">
          Independence rules block firms with prior dev engagements with your org.
        </p>
        <Link
          to="/firms"
          className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
        >
          See all chartered firms <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Reference reviewId so referrals from outside can deep-link the same review */}
      <input type="hidden" value={reviewId} aria-hidden readOnly />
      {scenarios && scenarios.length > 0 && (
        <input type="hidden" value={scenarios.join(",")} aria-hidden readOnly />
      )}
    </div>
  );
}
