// Admin: manage QAGAC firms, their dev engagements (independence basis), and assessor promotions.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useRoles";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Plus, ShieldCheck, Trash2, Crown } from "lucide-react";

const Firms = () => {
  const { isAdmin, loading: rolesLoading } = useRoles();
  const [firms, setFirms] = useState<any[]>([]);
  const [assessors, setAssessors] = useState<any[]>([]);
  const [devEng, setDevEng] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newFirm, setNewFirm] = useState({ name: "", jurisdiction: "", indemnity_carrier: "", indemnity_amount_usd: "", contact_email: "", website: "" });
  const [selectedFirm, setSelectedFirm] = useState<string | null>(null);
  const [newDev, setNewDev] = useState({ client_org: "", engagement_kind: "development" });

  const load = async () => {
    const [{ data: f }, { data: a }, { data: d }] = await Promise.all([
      supabase.from("qagac_firms").select("*").order("created_at", { ascending: false }),
      supabase.from("qaga_assessors").select("*").order("display_name"),
      supabase.from("firm_dev_engagements").select("*").order("created_at", { ascending: false }),
    ]);
    setFirms(f ?? []);
    setAssessors(a ?? []);
    setDevEng(d ?? []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); else if (!rolesLoading) setLoading(false); }, [isAdmin, rolesLoading]);

  const createFirm = async () => {
    if (!newFirm.name) { toast.error("Name required"); return; }
    const { error } = await supabase.from("qagac_firms").insert({
      name: newFirm.name,
      jurisdiction: newFirm.jurisdiction || null,
      indemnity_carrier: newFirm.indemnity_carrier || null,
      indemnity_amount_usd: newFirm.indemnity_amount_usd ? parseInt(newFirm.indemnity_amount_usd) : null,
      contact_email: newFirm.contact_email || null,
      website: newFirm.website || null,
      status: "charter",
      charter_at: new Date().toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Firm chartered");
    setNewFirm({ name: "", jurisdiction: "", indemnity_carrier: "", indemnity_amount_usd: "", contact_email: "", website: "" });
    load();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("qagac_firms").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const assignAssessorToFirm = async (assessorId: string, firmId: string | null) => {
    const { error } = await supabase.from("qaga_assessors").update({ firm_id: firmId }).eq("id", assessorId);
    if (error) { toast.error(error.message); return; }
    toast.success("Assessor assignment updated");
    load();
  };

  const issueQaga = async (assessorId: string) => {
    const credId = `QAGA-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { error } = await supabase.from("qaga_assessors").update({
      training_level: "qaga",
      exam_passed_at: new Date().toISOString(),
      qaga_credential_id: credId,
      qaga_issued_at: new Date().toISOString(),
      qaga_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq("id", assessorId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Issued ${credId}`);
    load();
  };

  const addDevEng = async () => {
    if (!selectedFirm || !newDev.client_org) { toast.error("Pick a firm and enter a client org"); return; }
    const { error } = await supabase.from("firm_dev_engagements").insert({
      firm_id: selectedFirm,
      client_org: newDev.client_org,
      engagement_kind: newDev.engagement_kind,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Dev engagement recorded (will block conflicting assessments)");
    setNewDev({ client_org: "", engagement_kind: "development" });
    load();
  };

  const deleteDevEng = async (id: string) => {
    const { error } = await supabase.from("firm_dev_engagements").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  if (rolesLoading || loading) return <AppShell><div className="p-8 font-mono text-sm text-muted-foreground">loading…</div></AppShell>;
  if (!isAdmin) return <AppShell><div className="p-8 text-sm text-muted-foreground">Admin only.</div></AppShell>;

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">QAGAC Firms & Assessors</h1>
        </div>

        {/* Create firm */}
        <section className="rounded-lg border border-border bg-card-grad p-5">
          <div className="flex items-center gap-2 mb-3"><Plus className="h-4 w-4 text-primary" /><span className="font-medium">Charter a new firm</span></div>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Name</Label><Input value={newFirm.name} onChange={(e) => setNewFirm({ ...newFirm, name: e.target.value })} /></div>
            <div><Label>Jurisdiction</Label><Input value={newFirm.jurisdiction} onChange={(e) => setNewFirm({ ...newFirm, jurisdiction: e.target.value })} /></div>
            <div><Label>Website</Label><Input value={newFirm.website} onChange={(e) => setNewFirm({ ...newFirm, website: e.target.value })} /></div>
            <div><Label>Indemnity carrier</Label><Input value={newFirm.indemnity_carrier} onChange={(e) => setNewFirm({ ...newFirm, indemnity_carrier: e.target.value })} /></div>
            <div><Label>Indemnity (USD)</Label><Input type="number" value={newFirm.indemnity_amount_usd} onChange={(e) => setNewFirm({ ...newFirm, indemnity_amount_usd: e.target.value })} /></div>
            <div><Label>Contact email</Label><Input value={newFirm.contact_email} onChange={(e) => setNewFirm({ ...newFirm, contact_email: e.target.value })} /></div>
          </div>
          <Button onClick={createFirm} className="mt-3">Charter firm</Button>
        </section>

        {/* Firms list */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Firms ({firms.length})</h2>
          <div className="space-y-2">
            {firms.map((f) => (
              <div key={f.id} className={`rounded-lg border p-4 ${selectedFirm === f.id ? "border-primary bg-primary/5" : "border-border bg-card-grad"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <button onClick={() => setSelectedFirm(selectedFirm === f.id ? null : f.id)} className="font-medium hover:text-primary text-left">{f.name}</button>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {f.jurisdiction ?? "—"} · {f.active_assessor_count} QAGAs · {f.indemnity_carrier ?? "no carrier"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={f.status === "active" ? "bg-primary/20 text-primary" : "bg-warning/20 text-warning"}>{f.status}</Badge>
                    {f.status !== "active" && <Button size="sm" variant="outline" onClick={() => setStatus(f.id, "active")}>Activate</Button>}
                    {f.status === "active" && <Button size="sm" variant="outline" onClick={() => setStatus(f.id, "suspended")}>Suspend</Button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dev engagements for selected firm */}
        {selectedFirm && (
          <section className="rounded-lg border border-border bg-card-grad p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-warning" />
              <span className="font-medium">Independence: development engagements (Arthur Andersen rule)</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Any client org listed here will be refused as an assessment target for this firm (12-month lookback).
            </p>
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <div><Label>Client org</Label><Input value={newDev.client_org} onChange={(e) => setNewDev({ ...newDev, client_org: e.target.value })} /></div>
              <div>
                <Label>Kind</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={newDev.engagement_kind} onChange={(e) => setNewDev({ ...newDev, engagement_kind: e.target.value })}>
                  <option>design</option><option>development</option><option>implementation</option><option>mlops</option>
                </select>
              </div>
              <div className="flex items-end"><Button onClick={addDevEng}>Record</Button></div>
            </div>
            <div className="space-y-1">
              {devEng.filter((d) => d.firm_id === selectedFirm).map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/40">
                  <span><span className="font-mono">{d.client_org}</span> <span className="text-muted-foreground">· {d.engagement_kind}</span></span>
                  <Button size="sm" variant="ghost" onClick={() => deleteDevEng(d.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Assessors */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Assessors ({assessors.length})</h2>
          <div className="space-y-2">
            {assessors.map((a) => {
              const firm = firms.find((f) => f.id === a.firm_id);
              return (
                <div key={a.id} className="rounded-lg border border-border bg-card-grad p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{a.display_name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {a.training_level} · {a.qaga_credential_id ?? "no cred id"} · {a.jurisdiction ?? "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={a.firm_id ?? ""} onChange={(e) => assignAssessorToFirm(a.id, e.target.value || null)}>
                        <option value="">— no firm —</option>
                        {firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                      {a.training_level !== "qaga" && a.firm_id && (
                        <Button size="sm" variant="outline" onClick={() => issueQaga(a.id)}>
                          <Crown className="h-3 w-3 mr-1" /> Issue QAGA
                        </Button>
                      )}
                      {firm && <Badge className="bg-primary/15 text-primary">{firm.name}</Badge>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default Firms;
