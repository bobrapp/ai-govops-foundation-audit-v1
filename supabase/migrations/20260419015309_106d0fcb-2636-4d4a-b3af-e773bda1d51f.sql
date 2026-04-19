-- 1. Track when an intake thread has been qualified (Ken/Bob signaled "ready")
ALTER TABLE public.agent_threads
  ADD COLUMN IF NOT EXISTS intake_qualified_at timestamptz;

-- 2. Link reviews back to the intake thread that produced them
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS from_thread_id uuid REFERENCES public.agent_threads(id) ON DELETE SET NULL;

-- 3. Helper: count open intake threads owned by a user
CREATE OR REPLACE FUNCTION public.count_open_intake_threads(_user uuid)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.agent_threads
  WHERE owner_id = _user AND kind = 'intake' AND intake_qualified_at IS NULL;
$$;

-- 4. Replace the insert policy so intake threads are open to any signed-in user (capped at 3 open),
--    while 1on1/council remain restricted to admin/curator/reviewer.
DROP POLICY IF EXISTS "threads owner write (admin/curator/reviewer)" ON public.agent_threads;

CREATE POLICY "threads owner write"
  ON public.agent_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      -- intake threads: open to any signed-in user, max 3 open
      (kind = 'intake' AND public.count_open_intake_threads(auth.uid()) < 3)
      -- full chat (1on1/council) still gated to admin/curator/reviewer
      OR (
        kind IN ('1on1','council')
        AND (
          public.has_role(auth.uid(),'admin')
          OR public.has_role(auth.uid(),'curator')
          OR public.has_role(auth.uid(),'reviewer')
        )
      )
    )
  );

-- 5. Allow agent-chat function (service role) to set intake_qualified_at via update
--    (existing owner-update policy already covers it for owners; service role bypasses RLS)
