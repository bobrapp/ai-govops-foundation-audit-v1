import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, GitBranch, FileCode, UploadCloud, Sparkles, ChevronDown, ShieldAlert, Crown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { NamedCameo, PersonaAvatar } from "@/components/agents/PersonaPrimitives";
import { JourneyStepper } from "@/components/journey/JourneyStepper";

import { PRESETS, type Preset, type Scenario } from "@/data/policy-presets";
import { RISK_TIERS, type RiskTier } from "@/lib/control-objectives";

const SCENARIOS: { id: Scenario; label: string; desc: string }[] = [
  { id: "enterprise_oss", label: "Enterprise OSS adoption", desc: "OpenCLAW, vector DBs, foundation models inside a regulated org." },
  { id: "healthcare_codegen", label: "Healthcare codegen", desc: "AI generating or touching code in HIPAA / FDA settings." },
  { id: "generative_ip", label: "Generative IP", desc: "Music, art, video — provable copyright chain." },
  { id: "hr_behavior", label: "HR & insurable risk", desc: "Bias, harassment, discrimination, EEOC exposure." },
  { id: "general", label: "General governance", desc: "Baseline policy review without scenario specialization." },
];

const Submit = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"paste" | "upload" | "github">("paste");
  const [scenarios, setScenarios] = useState<Scenario[]>(["general"]);
  const [riskTier, setRiskTier] = useState<RiskTier | "">("");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Honor ?scenario= from the persona path cards
  useEffect(() => {
    const s = params.get("scenario") as Scenario | null;
    if (s && SCENARIOS.some((x) => x.id === s)) {
      setScenarios([s]);
    }
  }, [params]);

  const loadPreset = (preset: Preset) => {
    setTab("paste");
    setCode(preset.code);
    setTitle(preset.title);
    setDescription(preset.description);
    setScenarios(preset.scenarios);
    toast.success(`Loaded: ${preset.label}`);
  };

  const toggle = (s: Scenario) =>
    setScenarios((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const titleVal = title.trim();
    const descVal = description.trim();
    if (!titleVal) { toast.error("Title required"); return; }
    if (scenarios.length === 0) { toast.error("Select at least one scenario"); return; }

    setBusy(true);
    try {
      let artifacts: { file_path: string; language: string; content: string }[] = [];
      let source_url: string | null = null;

      if (tab === "paste") {
        if (!code.trim()) throw new Error("Paste your policy code");
        artifacts = [{ file_path: "policy.rego", language: "rego", content: code.slice(0, 200_000) }];
      } else if (tab === "upload") {
        const files = (fd.getAll("files") as File[]).filter((f) => f.size > 0);
        if (files.length === 0) throw new Error("Select at least one file");
        for (const f of files.slice(0, 25)) {
          const text = await f.text();
          const ext = f.name.split(".").pop()?.toLowerCase() ?? "txt";
          artifacts.push({ file_path: f.name, language: ext, content: text.slice(0, 200_000) });
        }
      } else {
        source_url = String(fd.get("repo_url") ?? "").trim();
        if (!source_url) throw new Error("Repo URL required");
        const { data, error } = await supabase.functions.invoke("github-fetch", { body: { url: source_url } });
        if (error) throw new Error(error.message);
        if (!data.files?.length) throw new Error("No policy files (.rego/.yaml/.json/.cedar/.md) found in repo");
        artifacts = data.files;
      }

      const { data: review, error: rErr } = await supabase
        .from("reviews")
        .insert({
          submitter_id: user.id,
          title: titleVal, description: descVal,
          source_type: tab,
          source_url,
          scenarios,
          risk_tier_declared: riskTier || null,
          status: "ingesting",
        })
        .select()
        .single();
      if (rErr) throw rErr;

      const { error: aErr } = await supabase
        .from("review_artifacts")
        .insert(artifacts.map((a) => ({ ...a, review_id: review.id })));
      if (aErr) throw aErr;

      await supabase.from("audit_log").insert({
        review_id: review.id, actor_id: user.id, actor_kind: "user",
        event: "review.created", payload: { artifacts: artifacts.length, scenarios },
      });

      toast.success("Review created — running agent pipeline");
      // Fire and forget; review page polls
      supabase.functions.invoke("run-agent-pipeline", { body: { reviewId: review.id } });
      nav(`/review/${review.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "submit failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="relative">
        {/* Aurora wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 15% 0%, hsl(248 70% 22% / 0.55), transparent 65%), radial-gradient(ellipse 60% 50% at 100% 30%, hsl(160 70% 28% / 0.30), transparent 70%)",
          }}
        />
        <div className="p-8 max-w-3xl mx-auto space-y-6">
          {/* Journey rail — step 2 of 5 */}
          <JourneyStepper
            current="request"
            guide="Three things only: a title, the policy bundle (paste / upload / GitHub), and the scenario pack(s). The agents do the rest. Tooltips on every term — hover the chips below to see what AOC, AOS, and QAGAC mean in plain English."
          />

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">New review</h1>
              <p className="text-sm text-muted-foreground">Submit a policy-as-code bundle for end-to-end agentic review.</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Sparkles className="h-4 w-4 mr-1.5" /> Load sample <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Scenario pack samples</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PRESETS.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => loadPreset(p)} className="flex flex-col items-start gap-0.5 py-2">
                    <span className="text-sm font-medium">{p.label}</span>
                    <span className="text-xs text-muted-foreground">{p.desc}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Ken intake cameo banner — matches Quick Audit */}
          <div className="mb-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 flex items-center gap-4 shadow-glow">
            <PersonaAvatar slug="ken-newton" size="lg" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-warning flex items-center gap-1.5">
                <Crown className="h-3 w-3" /> Ken Newton · Chief auditor on intake
              </div>
              <h2 className="text-lg font-semibold mt-0.5">
                Hand me your bundle. I'll route it through the council.
              </h2>
              <p className="text-sm text-muted-foreground">
                Pick scenarios, declare your tier honestly. The eight specialists will derive their own — insurers price the disagreement. Bob co-signs only if it's defensible.
              </p>
              <div className="mt-2 text-[11px] font-mono text-muted-foreground hidden md:block">
                Co-signed by <NamedCameo slug="ken-newton" size="xs" /> and <NamedCameo slug="bob-smith" size="xs" />.
              </div>
            </div>
            <Link to="/agents/chat" className="hidden md:inline-block">
              <Button variant="ghost" size="sm">
                Talk to Ken first <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Title</Label>
              <Input name="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. OpenCLAW deployment policy v0.3" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input name="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Context for reviewers" />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Scenario packs to load</Label>
            <p className="text-xs text-muted-foreground mb-2 -mt-1">
              Every review runs the same horizontal AOS pipeline. Scenario packs <em>extend</em> coverage
              with vertical stress tests — they don't fork the standard.
            </p>
            <div className="grid md:grid-cols-2 gap-2">
              {SCENARIOS.map((s) => (
                <label key={s.id} className="flex items-start gap-2 rounded-md border border-border bg-card-grad p-3 cursor-pointer hover:border-primary/40">
                  <Checkbox
                    checked={scenarios.includes(s.id)}
                    onCheckedChange={() => toggle(s.id)}
                  />
                  <div>
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" /> Risk tier — your self-classification
            </Label>
            <p className="text-xs text-muted-foreground mb-2 -mt-1">
              EU AI Act-style self-classification. The agent pipeline derives its own tier from findings;
              insurers price against the <em>disagreement</em>. Optional, but strongly recommended.
            </p>
            <div className="grid md:grid-cols-3 gap-2">
              {RISK_TIERS.map((t) => (
                <label
                  key={t.id}
                  className={`flex flex-col gap-1 rounded-md border p-3 cursor-pointer hover:border-primary/40 ${
                    riskTier === t.id ? "border-primary bg-primary/5" : "border-border bg-card-grad"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="risk_tier"
                      checked={riskTier === t.id}
                      onChange={() => setRiskTier(t.id)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    <span className="text-sm font-medium">{t.label}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-snug">{t.description}</div>
                  <div className="text-[10px] font-mono text-muted-foreground/70 pt-1">{t.euAiActMapping}</div>
                </label>
              ))}
            </div>
            {riskTier && (
              <button
                type="button"
                onClick={() => setRiskTier("")}
                className="text-[11px] text-muted-foreground hover:text-foreground mt-2 underline"
              >
                Clear self-classification
              </button>
            )}
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="paste"><FileCode className="h-4 w-4 mr-1.5" /> Paste</TabsTrigger>
              <TabsTrigger value="upload"><UploadCloud className="h-4 w-4 mr-1.5" /> Upload</TabsTrigger>
              <TabsTrigger value="github"><GitBranch className="h-4 w-4 mr-1.5" /> GitHub</TabsTrigger>
            </TabsList>
            <TabsContent value="paste">
              <Label className="mt-3 block">Policy code (Rego / YAML / JSON / Cedar)</Label>
              <Textarea name="code" rows={12} value={code} onChange={(e) => setCode(e.target.value)} className="font-mono text-xs" placeholder={'package aigovops.example\n\ndefault allow = false\n\nallow {\n  input.actor.role == "reviewer"\n}'} />
            </TabsContent>
            <TabsContent value="upload">
              <Label className="mt-3 block">Files (.rego, .yaml, .json, .cedar, .md)</Label>
              <Input type="file" name="files" multiple accept=".rego,.yaml,.yml,.json,.cedar,.md,.txt" />
              <div className="text-xs text-muted-foreground mt-2 font-mono">Up to 25 files, 200KB each.</div>
            </TabsContent>
            <TabsContent value="github">
              <Label className="mt-3 block">Public GitHub URL</Label>
              <Input name="repo_url" placeholder="https://github.com/owner/repo or .../tree/branch/path" />
              <div className="text-xs text-muted-foreground mt-2 font-mono">Pulls .rego/.yaml/.json/.cedar/.md files (max 25).</div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => nav("/dashboard")}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit for review"}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </AppShell>
  );
};

export default Submit;
