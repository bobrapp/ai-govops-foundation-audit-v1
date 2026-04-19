import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShieldCheck, ScrollText, UserPlus, Loader2, FileSignature } from "lucide-react";

const DEFAULT_ATTESTATION =
  "I attest that I have no design, development, implementation, or MLOps engagement with the assessed organization within the last 12 months, that my employing QAGAC has none such on file with the Foundation, and that I will perform this assessment in accordance with the AOS Testing Procedures Guide.";

export const EngagementPanel = ({ reviewId }: { reviewId: string }) => {
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const [engagements, setEngagements] = useState<any[]>([]);
  const [assessors, setAssessors] = useState<any[]>([]);
  const [pickAssessor, setPickAssessor] = useState("");
  const [busy, setBusy] = useState(false);
  const [attestation, setAttestation] = useState(DEFAULT_ATTESTATION);

  const load = async () => {
    const { data: e } = await supabase
      .from("assessor_engagements")
      .select("*, qaga_assessors(display_name, qaga_credential_id, user_id), qagac_firms_public(name)")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: false });
    setEngagements(e ?? []);
    if (isAdmin) {
      const { data: a } = await supabase
        .from("qaga_assessors")
        .select("id, display_name, qaga_credential_id, firm_id, training_level, status, qagac_firms_public(name)")
        .eq("training_level", "qaga").eq("status", "active");
      setAssessors(a ?? []);
    }
  };

  useEffect(() => { load(); }, [reviewId, isAdmin]);

  const request = async () => {
    if (!pickAssessor) { toast.error("Pick an assessor"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("request_engagement", { _review_id: reviewId, _assessor_id: pickAssessor });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Engagement requested");
    setPickAssessor("");
    load();
  };

  const sign = async (engId: string) => {
    setBusy(true);
    const { error } = await supabase.rpc("sign_independence_declaration", {
      _engagement_id: engId, _attestation: attestation,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await supabase.functions.invoke("sign-decision", {
      body: { reviewId, event: "admin.role_assigned", payload: { engagement: engId, kind: "independence_signed" } },
    });
    toast.success("Independence declaration signed · engagement active");
    load();
  };

  return (
    <div className="rounded-lg border border-border bg-card-grad p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileSignature className="h-5 w-5 text-primary" />
        <span className="font-medium">QAGA Engagement</span>
      </div>

      {engagements.length === 0 ? (
        <div className="text-sm text-muted-foreground">No assessor engaged yet.</div>
      ) : (
        <div className="space-y-2">
          {engagements.map((e: any) => {
            const isMine = e.qaga_assessors?.user_id === user?.id;
            return (
              <div key={e.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.qaga_assessors?.display_name} <span className="text-xs font-mono text-muted-foreground">· {e.qaga_assessors?.qaga_credential_id}</span></div>
                    <div className="text-xs text-muted-foreground">{e.qagac_firms_public?.name} · client: <span className="font-mono">{e.client_org}</span></div>
                  </div>
                  <Badge className={
                    e.status === "active" ? "bg-primary/20 text-primary" :
                    e.status === "requested" ? "bg-warning/20 text-warning" :
                    "bg-muted"
                  }>{e.status}</Badge>
                </div>
                {e.status === "requested" && isMine && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Independence declaration</div>
                    <Textarea rows={4} value={attestation} onChange={(ev) => setAttestation(ev.target.value)} className="text-xs" />
                    <Button size="sm" onClick={() => sign(e.id)} disabled={busy}>
                      <ScrollText className="h-3 w-3 mr-1" /> Sign & activate
                    </Button>
                  </div>
                )}
                {e.status === "active" && e.independence_attestation && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-mono uppercase text-[10px]">signed:</span> {new Date(e.independence_declared_at).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Assign QAGA</span>
          </div>
          <div className="flex gap-2">
            <select className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm" value={pickAssessor} onChange={(e) => setPickAssessor(e.target.value)}>
              <option value="">— pick a qualified assessor —</option>
              {assessors.map((a: any) => (
                <option key={a.id} value={a.id}>{a.display_name} ({a.qaga_credential_id}) — {a.qagac_firms_public?.name}</option>
              ))}
            </select>
            <Button onClick={request} disabled={busy || !pickAssessor}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />} Request
            </Button>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Requests are blocked if the firm has a recorded development engagement with the submitter org.
          </div>
        </div>
      )}
    </div>
  );
};
