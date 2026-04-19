import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MessagesSquare, Plus, Send, Trash2, Users, ArrowRight, Crown, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { usePageMeta } from "@/hooks/usePageMeta";
import { usePersonas } from "@/hooks/queries/useAgents";
import {
  useThreads, useMessages, useCreateThread, useSendMessage, useDeleteThread,
} from "@/hooks/queries/useChat";
import { portraitFor } from "@/data/agent-personas";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { PortraitStage } from "@/components/agents/PortraitStage";
import { JourneyStepper } from "@/components/journey/JourneyStepper";

type Scenario = "enterprise_oss" | "healthcare_codegen" | "generative_ip" | "hr_behavior" | "general";

const AgentChat = () => {
  usePageMeta({
    title: "Agent Chat — talk to the AIgovops Council",
    description:
      "Open a free intake with Ken or Bob, our chief auditors. Curators, reviewers, and admins can also convene the full council.",
  });
  const nav = useNavigate();
  const { user } = useAuth();
  const { canChat, loading: rolesLoading } = useRoles();
  const personasQ = usePersonas();
  const threadsQ = useThreads();
  const personas = personasQ.data ?? [];
  const threads = threadsQ.data ?? [];

  const [activeId, setActiveId] = useState<string | null>(null);
  const messagesQ = useMessages(activeId);
  const createThread = useCreateThread();
  const sendMessage = useSendMessage();
  const deleteThread = useDeleteThread();
  const qc = useQueryClient();

  const [draft, setDraft] = useState("");
  const [openNew, setOpenNew] = useState(false);
  // Default to intake — that's what's open to everyone.
  const [newKind, setNewKind] = useState<"intake" | "1on1" | "council">("intake");
  const [newTitle, setNewTitle] = useState("");
  const [newPicked, setNewPicked] = useState<string[]>([]);
  const [activeSpeakerSlug, setActiveSpeakerSlug] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Realtime: refresh messages on insert
  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`thread-${activeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_messages", filter: `thread_id=eq.${activeId}` },
        () => qc.invalidateQueries({ queryKey: ["agent_messages", activeId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeId, qc]);

  // Auto-pick first thread
  useEffect(() => {
    if (!activeId && threads.length) setActiveId(threads[0].id);
  }, [threads, activeId]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messagesQ.data, sendMessage.isPending]);

  const personaIndex = useMemo(
    () => Object.fromEntries(personas.map((p) => [p.id, p])),
    [personas],
  );
  const activeThread = threads.find((t) => t.id === activeId);

  // Track active speaker (last agent message) for the 3D stage
  useEffect(() => {
    if (!messagesQ.data?.length) return;
    const lastAgent = [...messagesQ.data].reverse().find((m) => m.role === "agent" && m.persona_id);
    if (lastAgent && lastAgent.persona_id) {
      const p = personaIndex[lastAgent.persona_id];
      if (p?.slug) setActiveSpeakerSlug(p.slug);
    } else if (activeThread) {
      // No agent reply yet — default to first persona on thread
      const head = personaIndex[(activeThread.persona_ids ?? [])[0]];
      if (head?.slug) setActiveSpeakerSlug(head.slug);
    }
  }, [messagesQ.data, personaIndex, activeThread]);

  const togglePicked = (id: string) =>
    setNewPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  // Quick start an intake thread with both Ken + Bob
  const startIntakeWithChiefs = async () => {
    const chiefs = personas.filter((p) => p.is_chief);
    if (!chiefs.length) return toast.error("Chief auditors not loaded yet.");
    try {
      const t = await createThread.mutateAsync({
        kind: "intake",
        personaIds: chiefs.map((p) => p.id),
        title: "Intake — Ken & Bob",
      });
      setActiveId(t.id);
      // Seed first agent question
      await sendMessage.mutateAsync({
        threadId: t.id,
        userMessage: "Hi — I'd like to qualify a system for an AIgovops audit. Can you walk me through what you need?",
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to start intake");
    }
  };

  const startThread = async () => {
    if (newKind === "intake") {
      // Force chiefs only
      const chiefs = personas.filter((p) => p.is_chief);
      if (!chiefs.length) return toast.error("Chief auditors not loaded yet.");
      try {
        const t = await createThread.mutateAsync({
          kind: "intake",
          personaIds: chiefs.map((p) => p.id),
          title: newTitle.trim() || "Intake — Ken & Bob",
        });
        setActiveId(t.id);
        setOpenNew(false);
        setNewTitle("");
        return;
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to start thread");
        return;
      }
    }
    if (!newPicked.length) return toast.error("Pick at least one agent.");
    if (newKind === "1on1" && newPicked.length !== 1) return toast.error("1:1 mode = exactly one agent.");
    try {
      let ids = newPicked;
      if (newKind === "council") {
        const ken = personas.find((p) => p.is_chief);
        if (ken && !ids.includes(ken.id)) ids = [ken.id, ...ids];
      }
      const t = await createThread.mutateAsync({
        kind: newKind,
        personaIds: ids,
        title: newTitle.trim() || (newKind === "1on1"
          ? `Chat with ${personas.find((p) => p.id === newPicked[0])?.display_name ?? "agent"}`
          : `Council — ${ids.map((id) => personas.find((p) => p.id === id)?.display_name ?? "?").join(", ")}`),
      });
      setActiveId(t.id);
      setOpenNew(false);
      setNewPicked([]);
      setNewTitle("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to start thread");
    }
  };

  // Materialise an intake into a draft Review and route to /quick-audit
  const materialiseIntake = async (
    threadId: string,
    scope: NonNullable<Awaited<ReturnType<typeof sendMessage.mutateAsync>>["scope"]>,
  ) => {
    if (!user) return;
    try {
      const scenario = (["enterprise_oss", "healthcare_codegen", "generative_ip", "hr_behavior", "general"]
        .includes(scope.scenario ?? "") ? scope.scenario : "general") as Scenario;
      const { data: review, error } = await supabase
        .from("reviews")
        .insert({
          submitter_id: user.id,
          title: `Intake — ${scope.organization ?? "(unnamed)"} · ${scenario}`,
          description: scope.scope_statement ?? "Drafted from intake conversation.",
          source_type: "paste",
          scenarios: [scenario],
          status: "draft",
          from_thread_id: threadId,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("Intake qualified — Review drafted. Continuing to Quick Audit.");
      nav(`/quick-audit?review=${review.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not draft Review");
    }
  };

  const send = async () => {
    if (!activeId || !draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    try {
      const res = await sendMessage.mutateAsync({ threadId: activeId, userMessage: text });
      if (res.qualified && res.scope && activeThread?.kind === "intake") {
        await materialiseIntake(activeId, res.scope);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    }
  };

  if (rolesLoading) {
    return (
      <AppShell>
        <div className="p-8 max-w-3xl mx-auto text-sm text-muted-foreground font-mono">loading…</div>
      </AppShell>
    );
  }

  const activeSpeaker = activeSpeakerSlug
    ? personas.find((p) => p.slug === activeSpeakerSlug)
    : null;

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-0px)]">
        {/* Thread list */}
        <aside className="w-72 border-r border-border bg-sidebar flex flex-col">
          <header className="p-3 border-b border-border space-y-2">
            <Button size="sm" className="w-full" onClick={startIntakeWithChiefs} disabled={createThread.isPending}>
              <Sparkles className="h-4 w-4 mr-1.5" /> Start free intake
            </Button>
            <Button size="sm" variant="outline" className="w-full" onClick={() => setOpenNew(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              {canChat ? "New chat (council)" : "New intake"}
            </Button>
          </header>
          <ScrollArea className="flex-1">
            {threads.length === 0 && (
              <div className="p-4 text-xs font-mono text-muted-foreground">
                No threads yet — click <strong>Start free intake</strong> to talk to Ken & Bob.
              </div>
            )}
            {threads.map((t) => {
              const active = t.id === activeId;
              const ids = t.persona_ids ?? [];
              const head = personaIndex[ids[0]];
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={`w-full text-left p-3 border-b border-border transition-colors ${
                    active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {head && portraitFor(head.slug) && (
                      <img src={portraitFor(head.slug)} alt="" loading="lazy" className="h-7 w-7 rounded object-cover object-top" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate flex items-center gap-1.5">
                        {t.title}
                        {t.intake_qualified_at && <ShieldCheck className="h-3 w-3 text-primary shrink-0" />}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                        {t.kind === "council" ? <><Users className="h-3 w-3" /> council</>
                          : t.kind === "intake" ? <><Sparkles className="h-3 w-3" /> intake</>
                          : <>1:1</>}
                        <span>· {formatDistanceToNow(new Date(t.updated_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </ScrollArea>
        </aside>

        {/* Conversation */}
        <main className="flex-1 flex flex-col bg-background relative">
          {/* Aurora wash behind the conversation column */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-60"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 20% 0%, hsl(248 70% 22% / 0.55), transparent 60%), radial-gradient(ellipse 60% 50% at 100% 100%, hsl(160 70% 28% / 0.30), transparent 65%)",
            }}
          />
          {/* Journey rail — step 3 of 5: Watch the council */}
          <div className="px-4 pt-4">
            <JourneyStepper
              current="watch"
              guide="Two chiefs run intake. They qualify scope, then specialists tear the bundle apart. Every handoff is logged. You'll see who said what, in real time."
            />
          </div>
          {!activeThread ? (
            <div className="flex-1 grid place-items-center px-6 py-10">
              <div className="w-full max-w-2xl mx-auto text-center space-y-7">
                {/* Core promise */}
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-glass text-[10px] font-mono uppercase tracking-[0.18em] text-accent">
                    <Crown className="h-3 w-3" /> Free for all signed-in users
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05]">
                    Talk to a <span className="text-aurora font-display italic">Chief Auditor.</span>
                  </h1>
                  <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                    Ken Newton or Bob &quot;Fair Witness&quot; Smith will run a brief intake, qualify your
                    scope, and draft a Review you can take into Quick Audit.
                  </p>
                </div>

                {/* Hero CTA — dominant, directly under the promise */}
                <div className="space-y-3">
                  <Button
                    size="lg"
                    onClick={startIntakeWithChiefs}
                    disabled={createThread.isPending}
                    className="h-14 px-7 text-base bg-emerald-grad text-primary-foreground hover:opacity-95 shadow-glow group"
                  >
                    {createThread.isPending ? (
                      <Loader2 className="h-5 w-5 mr-2.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-5 w-5 mr-2.5" />
                    )}
                    Start a free intake with Ken &amp; Bob
                    <ArrowRight className="h-4 w-4 ml-2.5 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] font-mono text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                      </span>
                      chiefs on duty
                    </span>
                    <span>· ~2 min to qualified scope</span>
                  </div>
                </div>

                {!canChat && (
                  <div className="text-xs font-mono text-muted-foreground pt-2">
                    Full council chat (1:1 with any agent or Council mode) requires the curator role.{" "}
                    <Link to="/agents" className="text-primary hover:underline">View the council →</Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <header className="border-b border-border">
                {/* On-duty banner */}
                <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border/60 bg-card/40 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/90">
                      The council, on duty
                    </span>
                  </div>
                  {activeThread.kind === "intake" ? (
                    <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                      <span className="text-foreground/85 font-semibold">Ken Newton</span>
                      <ArrowRight className="h-3 w-3 text-warning" />
                      <span className="text-foreground/85 font-semibold">Bob Smith</span>
                      <span className="hidden sm:inline">· chief auditors co-own this intake</span>
                    </div>
                  ) : (
                    <div className="text-[11px] font-mono text-muted-foreground hidden sm:block">
                      Live handoffs between specialists
                    </div>
                  )}
                </div>

                {/* 3D portrait stage */}
                <PortraitStage
                  speakerSlug={activeSpeakerSlug}
                  speakerName={activeSpeaker?.display_name}
                  isChief={!!activeSpeaker?.is_chief}
                  className="h-56 w-full"
                />
                <div className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-primary/80">
                      {activeThread.kind === "council" ? "Council session"
                        : activeThread.kind === "intake" ? "Intake conversation"
                        : "1-on-1"}
                    </div>
                    <h2 className="font-semibold truncate">{activeThread.title}</h2>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(activeThread.persona_ids ?? []).map((pid) => {
                      const p = personaIndex[pid];
                      if (!p) return null;
                      return (
                        <img
                          key={pid} src={portraitFor(p.slug)} alt={p.display_name}
                          title={p.display_name}
                          className={`h-8 w-8 rounded object-cover object-top border ${p.is_chief ? "border-warning shadow-[0_0_0_1px_hsl(var(--warning)/0.35)]" : "border-border"}`}
                        />
                      );
                    })}
                    <Button
                      variant="ghost" size="icon"
                      onClick={async () => {
                        if (!activeId) return;
                        await deleteThread.mutateAsync(activeId);
                        setActiveId(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
                {messagesQ.isLoading && (
                  <div className="text-sm text-muted-foreground font-mono">loading…</div>
                )}
                {messagesQ.data?.length === 0 && (
                  <div className="text-sm text-muted-foreground font-mono">
                    Say hi — they're listening.
                  </div>
                )}
                {messagesQ.data?.map((m) => {
                  if (m.role === "user") {
                    return (
                      <div key={m.id} className="flex justify-end animate-fade-in">
                        <div className="max-w-[75%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap">
                          {m.content}
                        </div>
                      </div>
                    );
                  }
                  if (m.role === "system" && m.handoff_to) {
                    const from = m.persona_id ? personaIndex[m.persona_id] : null;
                    const to = personaIndex[m.handoff_to];
                    return (
                      <div key={m.id} className="flex items-center justify-center gap-2 my-1 animate-fade-in">
                        <div className="flex items-center gap-2 rounded-full bg-warning/10 border border-warning/30 px-3 py-1.5 text-[11px] font-mono">
                          {from && portraitFor(from.slug) && (
                            <img src={portraitFor(from.slug)} alt={from.display_name} className="h-5 w-5 rounded-full object-cover object-top" />
                          )}
                          <span className="text-warning">{from?.display_name ?? "system"}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-warning" />
                          {to && portraitFor(to.slug) && (
                            <img src={portraitFor(to.slug)} alt={to.display_name} className="h-5 w-5 rounded-full object-cover object-top" />
                          )}
                          <span className="text-warning">{to?.display_name ?? "agent"}</span>
                          <span className="text-muted-foreground">— {m.content}</span>
                        </div>
                      </div>
                    );
                  }
                  const persona = m.persona_id ? personaIndex[m.persona_id] : null;
                  return (
                    <div key={m.id} className="flex items-start gap-3 animate-scale-in">
                      {persona && portraitFor(persona.slug) && (
                        <img
                          src={portraitFor(persona.slug)} alt={persona.display_name}
                          className={`h-9 w-9 rounded-md object-cover object-top border ${persona.is_chief ? "border-warning" : "border-border"}`}
                        />
                      )}
                      <div className="max-w-[75%]">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono">
                          {persona?.is_chief && <Crown className="h-3 w-3 text-warning" />}
                          <span className="text-foreground/90 font-medium">{persona?.display_name ?? "Agent"}</span>
                          <span className="text-muted-foreground">· {persona?.role_title}</span>
                        </div>
                        <div className="mt-1 bg-card-grad border border-border rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm whitespace-pre-wrap">
                          {m.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {sendMessage.isPending && (
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {activeThread.kind === "intake" ? "chief auditor is replying…" : "council is thinking…"}
                  </div>
                )}
                {activeThread.intake_qualified_at && (
                  <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-xs font-mono">
                    <ShieldCheck className="h-4 w-4 text-primary inline mr-1.5" />
                    Intake qualified · Review drafted. Head to{" "}
                    <Link to="/quick-audit" className="text-primary hover:underline">Quick Audit</Link> to run it.
                  </div>
                )}
              </div>

              <footer className="p-3 border-t border-border">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={
                      activeThread.kind === "intake"
                        ? "Tell the chief auditor about your system, scope, and evidence…"
                        : "Ask the council anything — policy, controls, risk, evidence…"
                    }
                    rows={2}
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <Button onClick={send} disabled={sendMessage.isPending || !draft.trim()}>
                    {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </footer>
            </>
          )}
        </main>
      </div>

      {/* New thread dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Start a new chat</DialogTitle>
            <DialogDescription>
              <strong>Intake</strong> is free for everyone — Ken & Bob qualify your audit.
              {canChat && <> <strong>1-on-1</strong> and <strong>Council</strong> are open to curators, reviewers, and admins.</>}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={newKind} onValueChange={(v) => { setNewKind(v as typeof newKind); setNewPicked([]); }}>
            <TabsList className={`grid ${canChat ? "grid-cols-3" : "grid-cols-1"}`}>
              <TabsTrigger value="intake"><Sparkles className="h-4 w-4 mr-1.5" /> Intake (Ken & Bob)</TabsTrigger>
              {canChat && <TabsTrigger value="1on1"><MessagesSquare className="h-4 w-4 mr-1.5" /> 1-on-1</TabsTrigger>}
              {canChat && <TabsTrigger value="council"><Users className="h-4 w-4 mr-1.5" /> Council</TabsTrigger>}
            </TabsList>
          </Tabs>

          <div>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Thread title (optional)"
              className="mb-3"
            />
            {newKind === "intake" ? (
              <div className="rounded-md border border-border bg-card-grad p-3 text-xs font-mono text-muted-foreground">
                Intake threads include both chief auditors automatically. Ken (orchestration) and Bob (fair witness) will run a structured qualification together.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[260px] overflow-auto">
                {personas.map((p) => {
                  const picked = newPicked.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (newKind === "1on1") setNewPicked([p.id]);
                        else togglePicked(p.id);
                      }}
                      className={`flex items-center gap-2 rounded-md p-2 border transition-colors ${
                        picked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      {portraitFor(p.slug) && (
                        <img src={portraitFor(p.slug)} alt="" className="h-8 w-8 rounded object-cover object-top" />
                      )}
                      <div className="text-left min-w-0">
                        <div className="text-xs font-medium truncate">{p.display_name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground truncate">{p.role_title}</div>
                      </div>
                      {p.is_chief && <Badge className="bg-warning/15 text-warning border-warning/30 ml-auto font-mono text-[9px]">Chief</Badge>}
                    </button>
                  );
                })}
              </div>
            )}
            {newKind === "council" && (
              <div className="text-[11px] font-mono text-muted-foreground mt-2">
                Ken "The Chief" is added automatically to moderate.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancel</Button>
            <Button
              onClick={startThread}
              disabled={createThread.isPending || (newKind !== "intake" && newPicked.length === 0)}
            >
              {createThread.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting…</> : "Start chat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default AgentChat;
