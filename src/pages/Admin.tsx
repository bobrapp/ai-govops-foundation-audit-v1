import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useRoles, AppRole } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, UserCog, Crown, Loader2, KeyRound, Sparkles, Trash2, FileSignature } from "lucide-react";

interface Member {
  id: string;
  display_name: string | null;
  organization: string | null;
  roles: AppRole[];
}

const Admin = () => {
  const { isAdmin, loading: rolesLoading } = useRoles();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [adminCount, setAdminCount] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [unseeding, setUnseeding] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const backfillPdfs = async () => {
    setBackfilling(true);
    const { data, error } = await supabase.functions.invoke("backfill-attestation-pdfs", { body: {} });
    if (error) { toast.error(error.message); setBackfilling(false); return; }
    if (data?.error) { toast.error(data.error); setBackfilling(false); return; }
    toast.success(`Generated ${data?.generated ?? 0} signed PDF${data?.generated === 1 ? "" : "s"}`);
    setBackfilling(false);
  };

  const seedDemo = async () => {
    if (!confirm("Seed demo dataset? Creates 1 firm, 2 demo QAGAs, 3 reviews. Safe to re-run.")) return;
    setSeeding(true);
    const { data, error } = await supabase.functions.invoke("seed-demo");
    if (error) { toast.error(error.message); setSeeding(false); return; }
    if (data?.error) { toast.error(data.error); setSeeding(false); return; }
    toast.success(`Demo seeded — ${data?.reviewIds?.length ?? 0} reviews, ${data?.qagaIds?.length ?? 0} QAGAs`);
    setSeeding(false);
    load();
  };

  const unseedDemo = async () => {
    if (!confirm("Delete ALL demo data (firm, QAGAs, reviews, findings, attestations, auth users tagged demo:seed-v1)? This cannot be undone.")) return;
    setUnseeding(true);
    const { data, error } = await supabase.functions.invoke("unseed-demo");
    if (error) { toast.error(error.message); setUnseeding(false); return; }
    if (data?.error) { toast.error(data.error); setUnseeding(false); return; }
    toast.success("Demo dataset removed");
    setUnseeding(false);
    load();
  };

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: rolesRows }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, organization"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const byUser = new Map<string, AppRole[]>();
    (rolesRows ?? []).forEach((r) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      byUser.set(r.user_id, arr);
    });
    setMembers((profiles ?? []).map((p) => ({
      id: p.id,
      display_name: p.display_name,
      organization: p.organization,
      roles: byUser.get(p.id) ?? [],
    })));
    setAdminCount((rolesRows ?? []).filter((r) => r.role === "admin").length);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const claimAdmin = async () => {
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_first_admin");
    if (error) { toast.error(error.message); setClaiming(false); return; }
    if (data) {
      toast.success("You are now admin");
      await supabase.functions.invoke("sign-decision", {
        body: { event: "admin.claimed", payload: {} },
      });
      window.location.reload();
    } else {
      toast.error("An admin already exists");
    }
    setClaiming(false);
  };

  const toggle = async (userId: string, role: AppRole, has: boolean) => {
    setBusy(`${userId}:${role}`);
    const fn = has ? "revoke_role" : "assign_role";
    const { error } = await supabase.rpc(fn, { _target_user: userId, _role: role });
    if (error) { toast.error(error.message); setBusy(null); return; }
    await supabase.functions.invoke("sign-decision", {
      body: {
        event: has ? "admin.role_revoked" : "admin.role_assigned",
        payload: { target_user: userId, role },
      },
    });
    toast.success(`${has ? "Revoked" : "Assigned"} ${role}`);
    setBusy(null);
    load();
  };

  if (rolesLoading) return <AppShell><div className="p-8 font-mono text-sm text-muted-foreground">loading…</div></AppShell>;

  // Bootstrap mode: no admins yet
  if (adminCount === 0 && !loading) {
    return (
      <AppShell>
        <div className="p-8 max-w-2xl mx-auto">
          <div className="rounded-xl border border-border bg-card-grad p-6">
            <KeyRound className="h-8 w-8 text-warning" />
            <h1 className="text-xl font-semibold mt-3">Bootstrap admin</h1>
            <p className="text-sm text-muted-foreground mt-2">
              No admin exists yet for this AiGovOps Review Framework deployment.
              The first signed-in user can claim the admin role — this is a one-time action.
            </p>
            <Button onClick={claimAdmin} disabled={claiming} className="mt-5">
              {claiming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
              Claim admin
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="p-8 max-w-2xl mx-auto">
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <ShieldCheck className="h-6 w-6 mx-auto text-muted-foreground" />
            <div className="mt-2 text-sm text-muted-foreground">Admin access required.</div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div className="flex items-center gap-3">
            <UserCog className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Roles & access</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={seedDemo} disabled={seeding || unseeding}>
              {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Seed demo dataset
            </Button>
            <Button variant="outline" size="sm" onClick={backfillPdfs} disabled={backfilling || seeding || unseeding}>
              {backfilling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSignature className="h-4 w-4 mr-2" />}
              Generate signed PDFs
            </Button>
            <Button variant="outline" size="sm" onClick={unseedDemo} disabled={seeding || unseeding || backfilling} className="text-destructive hover:text-destructive">
              {unseeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Unseed
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Assign reviewer or admin roles. Reviewers can approve/reject any review. Admins can manage roles.
        </p>

        <div className="rounded-lg border border-border bg-card-grad overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border">
            <div className="col-span-5">Member</div>
            <div className="col-span-3">Org</div>
            <div className="col-span-2">Reviewer</div>
            <div className="col-span-2">Admin</div>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">loading…</div>
          ) : members.map((m) => {
            const hasReviewer = m.roles.includes("reviewer");
            const hasAdmin = m.roles.includes("admin");
            return (
              <div key={m.id} className="grid grid-cols-12 items-center px-4 py-3 border-b border-border last:border-0">
                <div className="col-span-5">
                  <div className="font-medium text-sm">{m.display_name ?? "—"}</div>
                  <div className="font-mono text-[10px] text-muted-foreground truncate">{m.id}</div>
                </div>
                <div className="col-span-3 text-sm text-muted-foreground">{m.organization ?? "—"}</div>
                <div className="col-span-2">
                  <Button
                    size="sm"
                    variant={hasReviewer ? "default" : "outline"}
                    disabled={busy === `${m.id}:reviewer`}
                    onClick={() => toggle(m.id, "reviewer", hasReviewer)}
                  >
                    {hasReviewer ? "Revoke" : "Assign"}
                  </Button>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={hasAdmin ? "default" : "outline"}
                    disabled={busy === `${m.id}:admin`}
                    onClick={() => toggle(m.id, "admin", hasAdmin)}
                  >
                    {hasAdmin ? "Revoke" : "Assign"}
                  </Button>
                  {hasAdmin && <Badge className="bg-primary/20 text-primary"><Crown className="h-3 w-3 mr-1" />admin</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
};

export default Admin;
