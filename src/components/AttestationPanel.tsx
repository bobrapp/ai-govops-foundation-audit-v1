import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileBadge, Loader2, Download, ExternalLink } from "lucide-react";

const SUPABASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;

export const AttestationPanel = ({ reviewId }: { reviewId: string }) => {
  const [att, setAtt] = useState<any>(null);
  const [org, setOrg] = useState("");
  const [scope, setScope] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("attestations").select("*").eq("review_id", reviewId).maybeSingle();
    setAtt(data);
    if (data) { setOrg(data.organization); setScope(data.scope_statement); }
  };
  useEffect(() => { load(); }, [reviewId]);

  const issue = async () => {
    if (!org.trim() || !scope.trim()) { toast.error("Organization + scope required"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("issue-attestation", {
      body: { reviewId, organization: org, scopeStatement: scope },
    });
    setBusy(false);
    if (error || data?.error) { toast.error(error?.message ?? data?.error ?? "failed"); return; }
    toast.success("Attestation of Conformance issued + PDF generated");
    load();
  };

  const pdfUrl = att?.pdf_path
    ? `${SUPABASE_URL}/storage/v1/object/public/attestations/${att.pdf_path}`
    : null;
  const verifyUrl = `${window.location.origin}/verify/${reviewId}`;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card-grad p-4 space-y-3">
        <div className="text-sm font-medium flex items-center gap-2"><FileBadge className="h-4 w-4 text-primary" />
          {att ? "Re-issue Attestation of Conformance" : "Issue Attestation of Conformance"}
        </div>
        <Input placeholder="Organization name (the assessed entity)" value={org} onChange={(e) => setOrg(e.target.value)} />
        <Textarea placeholder="Scope statement: which systems, models, environments are covered?" rows={3}
          value={scope} onChange={(e) => setScope(e.target.value)} />
        <Button onClick={issue} disabled={busy} size="sm">
          {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileBadge className="h-4 w-4 mr-1.5" />}
          {att ? "Re-issue" : "Issue AOC"}
        </Button>
        <div className="text-[11px] font-mono text-muted-foreground">
          Only the assigned QAGA on this engagement (or admin) can issue. Conformance is computed from findings + compensating controls.
        </div>
      </div>

      {att && (
        <div className="rounded-lg border border-border bg-card-grad p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-sm font-medium">Issued · {new Date(att.issued_at).toLocaleString()}</div>
              <div className="text-[11px] font-mono text-muted-foreground">determination: {att.determination} · aos {att.aos_version}</div>
              {att.pdf_sha256 && <div className="text-[10px] font-mono text-muted-foreground break-all mt-1">sha256: {att.pdf_sha256}</div>}
            </div>
            <div className="flex gap-2">
              {pdfUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={pdfUrl} target="_blank" rel="noreferrer"><Download className="h-4 w-4 mr-1.5" />PDF</a>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <a href={verifyUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1.5" />Public verify</a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
