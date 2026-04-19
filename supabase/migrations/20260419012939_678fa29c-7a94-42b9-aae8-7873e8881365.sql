ALTER TABLE public.agent_decisions REPLICA IDENTITY FULL;
ALTER TABLE public.hitl_reviews REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_decisions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hitl_reviews;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;