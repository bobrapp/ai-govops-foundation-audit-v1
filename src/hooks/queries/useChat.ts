import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ThreadRow {
  id: string;
  owner_id: string;
  kind: "1on1" | "council";
  title: string;
  persona_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: string;
  thread_id: string;
  role: "user" | "agent" | "system";
  persona_id: string | null;
  handoff_to: string | null;
  content: string;
  created_at: string;
}

export const useThreads = () =>
  useQuery({
    queryKey: ["agent_threads"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("agent_threads")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ThreadRow[];
    },
  });

export const useMessages = (threadId: string | null) =>
  useQuery({
    queryKey: ["agent_messages", threadId],
    enabled: !!threadId,
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("agent_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChatMessageRow[];
    },
  });

export const useCreateThread = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      kind: "1on1" | "council";
      personaIds: string[];
      title: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not signed in");
      const { data, error } = await supabase
        .from("agent_threads")
        .insert({
          owner_id: user.id,
          kind: args.kind,
          persona_ids: args.personaIds,
          title: args.title,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ThreadRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent_threads"] });
    },
  });
};

export const useSendMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { threadId: string; userMessage: string }) => {
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: { threadId: args.threadId, userMessage: args.userMessage },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["agent_messages", vars.threadId] });
      qc.invalidateQueries({ queryKey: ["agent_threads"] });
    },
  });
};

export const useDeleteThread = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase.from("agent_threads").delete().eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent_threads"] }),
  });
};
