-- =========================================================================
-- AIgovops Agent Personas, Decisions, and Human-in-the-Loop (HITL) Reviews
-- =========================================================================

-- 1) Personas: roster of named AI agents with skills, guardrails, portrait
CREATE TABLE IF NOT EXISTS public.agent_personas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,                   -- e.g. 'turing'
  display_name    text NOT NULL,                          -- 'Alan Turing'
  historical_era  text,                                   -- '1912–1954'
  role_title      text NOT NULL,                          -- 'Cryptography & Integrity Agent'
  role_kind       text NOT NULL,                          -- chief|cryptography|security|risk|code|systems|compliance|ethics|sre
  short_bio       text NOT NULL,
  skills          text[] NOT NULL DEFAULT '{}',
  guardrails      text[] NOT NULL DEFAULT '{}',
  portrait_path   text,                                   -- /src/assets/agents/turing.jpg
  rank            int  NOT NULL DEFAULT 100,              -- sort order, chief = 0
  is_chief        boolean NOT NULL DEFAULT false,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personas readable by all"
  ON public.agent_personas FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE POLICY "personas admin manage"
  ON public.agent_personas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER agent_personas_touch BEFORE UPDATE ON public.agent_personas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- 2) Decisions: every agent action recorded for the dashboard activity feed
CREATE TABLE IF NOT EXISTS public.agent_decisions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id    uuid NOT NULL REFERENCES public.agent_personas(id) ON DELETE RESTRICT,
  review_id     uuid REFERENCES public.reviews(id) ON DELETE CASCADE,
  action        text NOT NULL,                            -- analyze|flag|approve|reject|escalate|sign|note
  decision      text NOT NULL,                            -- pass|fail|warn|info|escalated
  rationale     text NOT NULL,
  evidence      jsonb NOT NULL DEFAULT '{}'::jsonb,       -- artifacts/links/finding refs
  severity      severity NOT NULL DEFAULT 'info',
  needs_human   boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_decisions_review_idx ON public.agent_decisions(review_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_decisions_persona_idx ON public.agent_decisions(persona_id, created_at DESC);

ALTER TABLE public.agent_decisions ENABLE ROW LEVEL SECURITY;

-- visible to admins, reviewers, and the submitter of the linked review
CREATE POLICY "decisions visibility"
  ON public.agent_decisions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'reviewer')
    OR (review_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.reviews r WHERE r.id = agent_decisions.review_id AND r.submitter_id = auth.uid()
    ))
  );

-- writes only by admin (or trusted edge functions running as service role)
CREATE POLICY "decisions admin manage"
  ON public.agent_decisions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));


-- 3) HITL queue: items requiring a human reviewer / admin to approve or reject
CREATE TABLE IF NOT EXISTS public.hitl_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id     uuid REFERENCES public.agent_decisions(id) ON DELETE CASCADE,
  persona_id      uuid NOT NULL REFERENCES public.agent_personas(id) ON DELETE RESTRICT,
  review_id       uuid REFERENCES public.reviews(id) ON DELETE CASCADE,
  title           text NOT NULL,
  summary         text NOT NULL,
  severity        severity NOT NULL DEFAULT 'medium',
  status          text NOT NULL DEFAULT 'pending',        -- pending|approved|rejected|withdrawn
  resolved_by     uuid,
  resolved_at     timestamptz,
  resolution_note text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hitl_reviews_status_idx ON public.hitl_reviews(status, created_at DESC);

ALTER TABLE public.hitl_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hitl visibility"
  ON public.hitl_reviews FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'reviewer')
    OR (review_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.reviews r WHERE r.id = hitl_reviews.review_id AND r.submitter_id = auth.uid()
    ))
  );

CREATE POLICY "hitl admin/reviewer manage"
  ON public.hitl_reviews FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'reviewer'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'reviewer'));

CREATE TRIGGER hitl_reviews_touch BEFORE UPDATE ON public.hitl_reviews
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- 4) RPC: resolve a HITL item (admin/reviewer)
CREATE OR REPLACE FUNCTION public.resolve_hitl(
  _hitl_id uuid,
  _status  text,    -- 'approved' | 'rejected' | 'withdrawn'
  _note    text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'reviewer')) THEN
    RAISE EXCEPTION 'admin or reviewer only';
  END IF;
  IF _status NOT IN ('approved','rejected','withdrawn') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE public.hitl_reviews
     SET status = _status,
         resolved_by = auth.uid(),
         resolved_at = now(),
         resolution_note = _note
   WHERE id = _hitl_id;
END $$;


-- 5) Seed the 9 personas (idempotent)
INSERT INTO public.agent_personas
  (slug, display_name, historical_era, role_title, role_kind, short_bio, skills, guardrails, portrait_path, rank, is_chief)
VALUES
  ('ken-newton', 'Ken "The Chief" Newton', '1643–1727',
   'Chief AIgovops Auditor', 'chief',
   'Modeled on Sir Isaac Newton, who reformed England''s coinage as Master of the Royal Mint. Ken orchestrates the agent panel, weighs evidence from every specialist, and signs the final determination.',
   ARRAY['orchestration','final_determination','independence_check','attestation_signing','escalation_routing'],
   ARRAY['no_self_dealing','two_agent_concurrence_required','cannot_override_critical_without_human','signs_only_after_independence_declaration'],
   '/src/assets/agents/ken-newton.jpg', 0, true),

  ('turing', 'Alan Turing', '1912–1954',
   'Cryptography & Integrity Agent', 'cryptography',
   'Father of theoretical computer science and Bletchley Park codebreaker. Verifies audit-log hash chains, attestation signatures, and PDF SHA-256 integrity.',
   ARRAY['hash_chain_verification','signature_validation','tamper_detection','randomness_audit'],
   ARRAY['never_disclose_signing_keys','flags_chain_break_immediately','no_silent_re-signing'],
   '/src/assets/agents/turing.jpg', 10, false),

  ('kerckhoffs', 'Auguste Kerckhoffs', '1835–1903',
   'Security & Threat Modeling Agent', 'security',
   'Author of Kerckhoffs''s principle: a system''s security must rest on the key, not the obscurity of the design. Performs threat modeling and secret-handling reviews.',
   ARRAY['threat_modeling','secret_scanning','rls_review','privilege_escalation_checks'],
   ARRAY['assumes_attacker_knows_design','flags_security_through_obscurity','no_secrets_in_code'],
   '/src/assets/agents/kerckhoffs.jpg', 20, false),

  ('nightingale', 'Florence Nightingale', '1820–1910',
   'Statistical Risk & Evidence Agent', 'risk',
   'Pioneer of statistical graphics and evidence-based reform. Computes conformance scores, severity distributions, and evidence sufficiency.',
   ARRAY['statistical_risk','severity_aggregation','evidence_sufficiency','trend_analysis'],
   ARRAY['cite_data_sources','flag_low_n_conclusions','no_unsupported_claims'],
   '/src/assets/agents/nightingale.jpg', 30, false),

  ('lovelace', 'Ada Lovelace', '1815–1852',
   'Code Analysis & SBOM Agent', 'code',
   'First to publish an algorithm intended for a machine. Reviews source artifacts, dependency manifests, and software bill of materials.',
   ARRAY['static_analysis','sbom_extraction','dependency_risk','license_review'],
   ARRAY['no_secrets_in_logs','redact_pii_in_evidence','flag_vulnerable_deps'],
   '/src/assets/agents/lovelace.jpg', 40, false),

  ('hopper', 'Grace Hopper', '1906–1992',
   'Systems Engineering & Reliability Agent', 'systems',
   'Compiler pioneer and originator of the term "bug." Validates pipelines, edge functions, and end-to-end reliability of the audit machinery.',
   ARRAY['pipeline_validation','edge_function_health','retry_logic','observability_audit'],
   ARRAY['fail_loud_not_silent','idempotency_required','no_blind_retries'],
   '/src/assets/agents/hopper.jpg', 50, false),

  ('pacioli', 'Luca Pacioli', '1447–1517',
   'Compliance & Audit Agent', 'compliance',
   'Father of double-entry accounting. Cross-checks every finding against AOS controls, framework references, and the auditable evidence trail.',
   ARRAY['control_mapping','evidence_chain','double_entry_audit','attestation_review'],
   ARRAY['every_debit_needs_credit','every_finding_needs_evidence','no_unbalanced_attestation'],
   '/src/assets/agents/pacioli.jpg', 60, false),

  ('arendt', 'Hannah Arendt', '1906–1975',
   'Ethics & Accountability Agent', 'ethics',
   'Political theorist of accountability and the "banality of evil." Surfaces ethical risks the other agents may treat as routine.',
   ARRAY['ethics_review','accountability_mapping','dual_use_assessment','disparate_impact_check'],
   ARRAY['name_responsible_party','escalate_dual_use','no_diffusion_of_responsibility'],
   '/src/assets/agents/arendt.jpg', 70, false),

  ('hamilton', 'Margaret Hamilton', '1936–',
   'SRE & Operations Agent', 'sre',
   'Coined "software engineering" and led the Apollo on-board flight software. Owns canary verification, runbooks, and incident response posture.',
   ARRAY['canary_verification','runbook_drills','blast_radius_analysis','rollback_planning'],
   ARRAY['priority_displays_first','assume_partial_failure','manual_override_must_exist'],
   '/src/assets/agents/hamilton.jpg', 80, false)
ON CONFLICT (slug) DO UPDATE SET
  display_name    = EXCLUDED.display_name,
  historical_era  = EXCLUDED.historical_era,
  role_title      = EXCLUDED.role_title,
  role_kind       = EXCLUDED.role_kind,
  short_bio       = EXCLUDED.short_bio,
  skills          = EXCLUDED.skills,
  guardrails      = EXCLUDED.guardrails,
  portrait_path   = EXCLUDED.portrait_path,
  rank            = EXCLUDED.rank,
  is_chief        = EXCLUDED.is_chief,
  updated_at      = now();