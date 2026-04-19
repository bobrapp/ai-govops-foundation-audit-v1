-- Quick audit runs (rate-limit table)
CREATE TABLE IF NOT EXISTS public.quick_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scenario public.scenario_tag NOT NULL DEFAULT 'enterprise_oss',
  review_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quick_audit_runs_user_time ON public.quick_audit_runs (user_id, created_at DESC);
ALTER TABLE public.quick_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quick audit owner read"
  ON public.quick_audit_runs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "quick audit owner insert"
  ON public.quick_audit_runs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Agent chat threads
CREATE TABLE IF NOT EXISTS public.agent_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  kind text NOT NULL DEFAULT '1on1' CHECK (kind IN ('1on1','council')),
  title text NOT NULL DEFAULT 'New thread',
  persona_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_threads_owner ON public.agent_threads (owner_id, updated_at DESC);
ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "threads owner or admin read"
  ON public.agent_threads FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "threads owner write (admin/curator/reviewer)"
  ON public.agent_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'curator')
      OR public.has_role(auth.uid(),'reviewer'))
  );

CREATE POLICY "threads owner update"
  ON public.agent_threads FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "threads owner delete"
  ON public.agent_threads FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER agent_threads_touch
  BEFORE UPDATE ON public.agent_threads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Agent chat messages
CREATE TABLE IF NOT EXISTS public.agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.agent_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','agent','system')),
  persona_id uuid REFERENCES public.agent_personas(id),
  handoff_to uuid REFERENCES public.agent_personas(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_messages_thread_time ON public.agent_messages (thread_id, created_at);
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages owner or admin read"
  ON public.agent_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_threads t
      WHERE t.id = agent_messages.thread_id
        AND (t.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
    )
  );

CREATE POLICY "messages owner insert"
  ON public.agent_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agent_threads t
      WHERE t.id = agent_messages.thread_id
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "messages admin manage"
  ON public.agent_messages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Realtime
ALTER TABLE public.agent_messages REPLICA IDENTITY FULL;
ALTER TABLE public.agent_threads REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_threads;  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;