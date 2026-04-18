import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilePlus2, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ingesting: "bg-accent/20 text-accent",
  analyzing: "bg-accent/20 text-accent",
  pending_human: "bg-warning/20 text-warning",
  approved: "bg-primary/20 text-primary",
  rejected: "bg-destructive/20 text-destructive",
  failed: "bg-destructive/20 text-destructive",
};

const Dashboard = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      setReviews(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
            <p className="text-sm text-muted-foreground">Policy-as-code submissions and their agent review state.</p>
          </div>
          <Link to="/submit">
            <Button><FilePlus2 className="h-4 w-4 mr-2" /> New review</Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-muted-foreground font-mono text-sm">loading…</div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card-grad">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="mt-3 font-medium">No reviews yet</div>
            <div className="text-sm text-muted-foreground">Submit your first policy-as-code bundle to begin.</div>
            <Link to="/submit"><Button className="mt-4"><FilePlus2 className="h-4 w-4 mr-2" /> Start a review</Button></Link>
          </div>
        ) : (
          <div className="space-y-2">
            {reviews.map((r) => (
              <Link key={r.id} to={`/review/${r.id}`} className="block rounded-lg border border-border bg-card-grad p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {r.source_type} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {(r.scenarios ?? []).slice(0, 3).map((s: string) => (
                      <span key={s} className="text-[10px] font-mono text-muted-foreground uppercase">{s}</span>
                    ))}
                    {r.overall_score !== null && (
                      <span className="font-mono text-sm tabular-nums">
                        {r.overall_score}<span className="text-muted-foreground text-xs">/100</span>
                      </span>
                    )}
                    <Badge className={statusColor[r.status] ?? ""}>{r.status}</Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Dashboard;
