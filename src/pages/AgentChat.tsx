import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
import { Loader2, MessagesSquare, Plus, Send, Trash2, Users, ArrowRight, Crown } from "lucide-react";
import { toast } from "sonner";
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

const AgentChat = () => {
  usePageMeta({
    title: "Agent Chat — talk to the AIgovops Council",
    description:
      "Open a 1:1 thread with any AIgovops auditor agent or convene a council. Ken 'The Chief' moderates and routes turns.",
  });
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
  const [newKind, setNewKind] = useState<"1on1" | "council">("1on1");
  const [newTitle, setNewTitle] = useState("");
  const [newPicked, setNewPicked] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Realtime: refresh messages on insert
  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`thread-${activeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_messages", filter: `thread_id=eq.${activeId}` },
        () => qc.invalidateQueries({ queryKey: ["agent_messages", activeId] })
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

  const togglePicked = (id: string) =>
    setNewPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const startThread = async () => {
    if (!newPicked.length) return toast.error("Pick at least one agent.");
    if (newKind === "1on1" && newPicked.length !== 1) return toast.error("1:1 mode = exactly one agent.");
    try {
      // For council, ensure Ken is included to moderate
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

  const send = async () => {
    if (!activeId || !draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    try {
      await sendMessage.mutateAsync({ threadId: activeId, userMessage: text });
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

  if (!canChat) {
    return (
      <AppShell>
        <div className="p-8 max-w-3xl mx-auto">
          <PageHeader
            eyebrow="Restricted"
            title="Agent Chat is for curators, reviewers, and admins"
            description="Ask an admin to grant you the curator role to start chatting with the council."
          />
          <Link to="/agents"><Button variant="secondary"><Users className="h-4 w-4 mr-1.5" /> View the council roster</Button></Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-0px)]">
        {/* Thread list */}
        <aside className="w-72 border-r border-border bg-sidebar flex flex-col">
          <header className="p-3 border-b border-border flex items-center gap-2">
            <Button size="sm" className="flex-1" onClick={() => setOpenNew(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> New chat
            </Button>
          </header>
          <ScrollArea className="flex-1">
            {threads.length === 0 && (
              <div className="p-4 text-xs font-mono text-muted-foreground">
                No threads yet — start one with the council.
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
                      <div className="text-sm font-medium truncate">{t.title}</div>
                      <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                        {t.kind === "council" ? <><Users className="h-3 w-3" /> council</> : <>1:1</>}
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
        <main className="flex-1 flex flex-col bg-background">
          {!activeThread ? (
            <div className="flex-1 grid place-items-center text-sm text-muted-foreground font-mono">
              Pick a thread or start a new one.
            </div>
          ) : (
            <>
              <header className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-primary/80">
                    {activeThread.kind === "council" ? "Council session" : "1-on-1"}
                  </div>
                  <h2 className="font-semibold">{activeThread.title}</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  {(activeThread.persona_ids ?? []).map((pid) => {
                    const p = personaIndex[pid];
                    if (!p) return null;
                    return (
                      <img
                        key={pid} src={portraitFor(p.slug)} alt={p.display_name}
                        title={p.display_name}
                        className={`h-8 w-8 rounded object-cover object-top border ${p.is_chief ? "border-warning" : "border-border"}`}
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
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> council is thinking…
                  </div>
                )}
              </div>

              <footer className="p-3 border-t border-border">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Ask the council anything — policy, controls, risk, evidence…"
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
              Pick a mode and the agents you want at the table. In Council mode, Ken moderates and routes turns.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={newKind} onValueChange={(v) => { setNewKind(v as "1on1" | "council"); setNewPicked([]); }}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="1on1"><MessagesSquare className="h-4 w-4 mr-1.5" /> 1-on-1</TabsTrigger>
              <TabsTrigger value="council"><Users className="h-4 w-4 mr-1.5" /> Council</TabsTrigger>
            </TabsList>
          </Tabs>

          <div>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Thread title (optional)"
              className="mb-3"
            />
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
            {newKind === "council" && (
              <div className="text-[11px] font-mono text-muted-foreground mt-2">
                Ken "The Chief" is added automatically to moderate.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancel</Button>
            <Button onClick={startThread} disabled={createThread.isPending || newPicked.length === 0}>
              {createThread.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting…</> : "Start chat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default AgentChat;
