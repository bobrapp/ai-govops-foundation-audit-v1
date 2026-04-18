import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { BookOpen, AlertTriangle } from "lucide-react";

interface Control {
  control_id: string;
  level: number;
  domain: string;
  objective: string;
  testing_procedure: string;
  evidence_expected: string;
  framework_refs: string[];
}

const domainColor: Record<string, string> = {
  pipeline: "bg-primary/15 text-primary",
  evidence: "bg-accent/15 text-accent",
  decisioning: "bg-warning/15 text-warning",
  safety: "bg-destructive/15 text-destructive",
  data: "bg-muted text-foreground",
  model: "bg-primary/10 text-primary",
  ops: "bg-accent/10 text-accent",
};

const AosCatalog = () => {
  const [version, setVersion] = useState<{ version: string; status: string; notes: string | null } | null>(null);
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: v } = await supabase
        .from("aos_versions").select("id, version, status, notes")
        .eq("status", "active").order("created_at", { ascending: false }).limit(1).single();
      if (!v) { setLoading(false); return; }
      setVersion(v);
      const { data: c } = await supabase
        .from("aos_controls").select("*").eq("version_id", v.id).order("control_id");
      setControls((c as Control[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">AOS Control Catalog</h1>
          {version && <Badge className="bg-primary/20 text-primary font-mono">v{version.version}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          The AiGovOps Standard control catalog drives every agent finding and assessor sign-off.
        </p>
        {version?.notes && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 mb-6 flex gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div className="text-warning-foreground/90">{version.notes}</div>
          </div>
        )}

        {loading ? (
          <div className="font-mono text-sm text-muted-foreground">loading…</div>
        ) : (
          <div className="space-y-3">
            {controls.map((c) => (
              <div key={c.control_id} className="rounded-lg border border-border bg-card-grad p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-primary">{c.control_id}</span>
                  <Badge className={domainColor[c.domain] ?? "bg-muted"}>{c.domain}</Badge>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">L{c.level}</span>
                </div>
                <div className="mt-2 font-medium text-sm">{c.objective}</div>
                <div className="grid md:grid-cols-2 gap-3 mt-3 text-xs">
                  <div>
                    <div className="font-mono uppercase text-[10px] text-muted-foreground tracking-wider">Testing procedure</div>
                    <div className="mt-1 text-foreground/90">{c.testing_procedure}</div>
                  </div>
                  <div>
                    <div className="font-mono uppercase text-[10px] text-muted-foreground tracking-wider">Evidence expected</div>
                    <div className="mt-1 text-foreground/90">{c.evidence_expected}</div>
                  </div>
                </div>
                {c.framework_refs?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {c.framework_refs.map((f) => (
                      <span key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default AosCatalog;
