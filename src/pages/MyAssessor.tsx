import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Crown, BookOpen, ScrollText, GraduationCap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Assessor {
  id: string;
  user_id: string;
  firm_id: string | null;
  display_name: string;
  jurisdiction: string | null;
  training_level: "practitioner" | "trainee" | "qaga";
  training_completed_at: string | null;
  exam_passed_at: string | null;
  qaga_credential_id: string | null;
  badges: string[];
  status: string;
}

const LEVELS = [
  { id: "practitioner", label: "AOS Practitioner", icon: BookOpen, body: "Completed the 30-day starter. Foundation literacy." },
  { id: "trainee", label: "AOS Assessor Trainee", icon: GraduationCap, body: "Completed Foundation Assessor Training. Eligible to sit the QAGA exam." },
  { id: "qaga", label: "QAGA", icon: Crown, body: "Passed the proctored exam, employed by an active QAGAC. Can sign Attestations." },
];

const MyAssessor = () => {
  const { user } = useAuth();
  const [me, setMe] = useState<Assessor | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("qaga_assessors").select("*").eq("user_id", user.id).maybeSingle();
    setMe((data as Assessor) ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const enroll = async () => {
    if (!user) return;
    setCreating(true);
    const { error } = await supabase.from("qaga_assessors").insert({
      user_id: user.id,
      display_name: name || user.email?.split("@")[0] || "Practitioner",
      jurisdiction: jurisdiction || null,
      training_level: "practitioner",
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Enrolled as AOS Practitioner");
    load();
  };

  const completeTraining = async () => {
    if (!me) return;
    const { error } = await supabase.from("qaga_assessors").update({
      training_level: "trainee",
      training_completed_at: new Date().toISOString(),
    }).eq("id", me.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Training marked complete");
    load();
  };

  if (loading) return <AppShell><div className="p-8 font-mono text-sm text-muted-foreground">loading…</div></AppShell>;

  if (!me) {
    return (
      <AppShell>
        <div className="p-8 max-w-2xl mx-auto">
          <div className="rounded-xl border border-border bg-card-grad p-6">
            <Crown className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold mt-3">Enroll as an AOS Practitioner</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Start the path toward Qualified AiGovOps Assessor (QAGA). Begins as Practitioner, advances to
              Trainee on training completion, and to QAGA after passing the proctored exam (admin-issued).
            </p>
            <div className="grid gap-3 mt-5">
              <div>
                <Label>Display name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="As listed on the public registry" />
              </div>
              <div>
                <Label>Jurisdiction</Label>
                <Input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="e.g. US-CA, EU, UK" />
              </div>
              <Button onClick={enroll} disabled={creating}>Enroll</Button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const levelIdx = LEVELS.findIndex((l) => l.id === me.training_level);

  return (
    <AppShell>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <Crown className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">{me.display_name}</h1>
          <Badge className="bg-primary/20 text-primary font-mono">{me.training_level}</Badge>
        </div>
        <div className="text-xs text-muted-foreground font-mono mt-1">
          {me.qaga_credential_id ?? "no credential id yet"} · {me.jurisdiction ?? "—"}
        </div>

        <div className="grid md:grid-cols-3 gap-3 mt-6">
          {LEVELS.map((l, i) => {
            const Icon = l.icon;
            const passed = i <= levelIdx;
            return (
              <div key={l.id} className={`rounded-lg border p-4 ${passed ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${passed ? "text-primary" : "text-muted-foreground"}`} />
                  {passed && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <div className="mt-2 font-medium text-sm">{l.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{l.body}</div>
              </div>
            );
          })}
        </div>

        {me.training_level === "practitioner" && (
          <div className="mt-6 rounded-lg border border-border bg-card-grad p-5">
            <div className="flex items-center gap-2"><ScrollText className="h-5 w-5 text-primary" /><span className="font-medium">Mark Foundation Training complete</span></div>
            <p className="text-sm text-muted-foreground mt-1">Self-attest you completed the AOS Assessor Training course. Admin can audit completion records.</p>
            <Button onClick={completeTraining} className="mt-3">Complete training → Trainee</Button>
          </div>
        )}
        {me.training_level === "trainee" && (
          <div className="mt-6 rounded-lg border border-warning/40 bg-warning/10 p-5">
            <div className="font-medium">Awaiting QAGA exam</div>
            <p className="text-sm mt-1">Schedule your proctored, scenario-based exam through the Foundation. Pass results are issued by an admin.</p>
          </div>
        )}
        {me.training_level === "qaga" && (
          <div className="mt-6 rounded-lg border border-primary/40 bg-primary/5 p-5">
            <div className="font-medium">QAGA in good standing</div>
            <p className="text-sm mt-1">You can sign Attestations of AOS Conformance under your employing QAGAC.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default MyAssessor;
