import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";

interface Props { reviewId: string; findings: Array<{ id: string; title: string; aos_control_id: string | null }>; }

export const CompensatingControlsPanel = ({ reviewId, findings }: Props) => {
  const [items, setItems] = useState<any[]>([]);
  const [verdict, setVerdict] = useState<any>(null);
  const [findingId, setFindingId] = useState<string>("");
  const [rationale, setRationale] = useState("");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: cs }, { data: v }] = await Promise.all([
      supabase.from("compensating_controls").select("*").eq("review_id", reviewId).order("recorded_at", { ascending: false }),
      supabase.rpc("compute_conformance", { _review_id: reviewId }),
    ]);
    setItems(cs ?? []);
    setVerdict(v);
  }, [reviewId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!rationale.trim()) { toast.error("Rationale required"); return; }
    setBusy(true);
    const f = findings.find((x) => x.id === findingId);
    const { error } = await supabase.rpc("record_compensating_control", {
      _review_id: reviewId,
      _finding_id: findingId || null,
      _aos_control_id: f?.aos_control_id ?? null,
      _rationale: rationale,
      _evidence_url: evidence || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Compensating control recorded");
    setRationale(""); setEvidence(""); setFindingId("");
    load();
  };

  const verdictColor: Record<string, string> = {
    pass: "text-primary",
    pass_with_compensations: "text-warning",
    fail: "text-destructive",
  };

  return (
    <div className="space-y-4">
      {verdict && (
        <div className="rounded-lg border border-border bg-card-grad p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className={`h-5 w-5 ${verdictColor[verdict.verdict] ?? ""}`} />
            <div>
              <div className="text-sm font-medium">Conformance: <span className={`font-mono uppercase ${verdictColor[verdict.verdict]}`}>{verdict.verdict.replace(/_/g, " ")}</span></div>
              <div className="text-[11px] font-mono text-muted-foreground">
                critical:{verdict.critical} · high:{verdict.high} · medium:{verdict.medium} · compensations:{verdict.compensations}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card-grad p-4 space-y-3">
        <div className="text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4" /> Record compensating control</div>
        <Select value={findingId} onValueChange={setFindingId}>
          <SelectTrigger><SelectValue placeholder="Link to a finding (optional)" /></SelectTrigger>
          <SelectContent>
            {findings.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.aos_control_id ? `[${f.aos_control_id}] ` : ""}{f.title.slice(0, 80)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea placeholder="Rationale: explain why the failed control is mitigated by an alternate control…"
          rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} />
        <Input placeholder="Evidence URL (link to ticket, runbook, control spec)"
          value={evidence} onChange={(e) => setEvidence(e.target.value)} />
        <Button onClick={add} disabled={busy} size="sm">Record (signs into chain on next pipeline event)</Button>
      </div>

      <div className="rounded-lg border border-border bg-card-grad divide-y divide-border">
        {items.length === 0 && <div className="p-4 text-sm text-muted-foreground">No compensating controls recorded.</div>}
        {items.map((it) => (
          <div key={it.id} className="p-4 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-warning/15 text-warning uppercase">compensation</span>
              {it.aos_control_id && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">{it.aos_control_id}</span>}
              <span className="text-[10px] font-mono text-muted-foreground">{new Date(it.recorded_at).toLocaleString()}</span>
            </div>
            <div className="mt-1 text-foreground/90 whitespace-pre-wrap">{it.rationale}</div>
            {it.evidence_url && <a href={it.evidence_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary underline break-all">{it.evidence_url}</a>}
          </div>
        ))}
      </div>
    </div>
  );
};
