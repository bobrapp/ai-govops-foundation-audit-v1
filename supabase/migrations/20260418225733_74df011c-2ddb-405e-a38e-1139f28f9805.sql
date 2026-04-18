-- =============================================================
-- SCENARIO PACKS
-- =============================================================
CREATE TABLE public.scenario_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario public.scenario_tag NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  version text NOT NULL DEFAULT 'v0.1-draft',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scenario_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scenario_packs readable by all" ON public.scenario_packs
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "scenario_packs admin manage" ON public.scenario_packs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.scenario_pack_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES public.scenario_packs(id) ON DELETE CASCADE,
  control_ref text NOT NULL,
  framework text NOT NULL,
  objective text NOT NULL,
  severity_if_missing public.severity NOT NULL DEFAULT 'high',
  aos_control_hint text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scenario_pack_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scenario_pack_controls readable by all" ON public.scenario_pack_controls
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "scenario_pack_controls admin manage" ON public.scenario_pack_controls
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =============================================================
-- COMPENSATING CONTROLS
-- =============================================================
CREATE TABLE public.compensating_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  finding_id uuid REFERENCES public.agent_findings(id) ON DELETE SET NULL,
  aos_control_id text,
  rationale text NOT NULL,
  evidence_url text,
  recorded_by uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'accepted'
);
ALTER TABLE public.compensating_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comp controls visibility" ON public.compensating_controls
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = compensating_controls.review_id AND r.submitter_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.assessor_engagements e
               JOIN public.qaga_assessors a ON a.id = e.assessor_id
               WHERE e.review_id = compensating_controls.review_id AND a.user_id = auth.uid())
  );
CREATE POLICY "comp controls admin manage" ON public.compensating_controls
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- QAGA assigned to engagement may insert compensations via function
CREATE OR REPLACE FUNCTION public.record_compensating_control(
  _review_id uuid,
  _finding_id uuid,
  _aos_control_id text,
  _rationale text,
  _evidence_url text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _ok boolean;
  _id uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.assessor_engagements e
    JOIN public.qaga_assessors a ON a.id = e.assessor_id
    WHERE e.review_id = _review_id
      AND a.user_id = _user
      AND e.status = 'active'
  ) INTO _ok;
  IF NOT _ok AND NOT public.has_role(_user,'admin') THEN
    RAISE EXCEPTION 'must be active QAGA on this engagement';
  END IF;
  INSERT INTO public.compensating_controls (review_id, finding_id, aos_control_id, rationale, evidence_url, recorded_by)
  VALUES (_review_id, _finding_id, _aos_control_id, _rationale, _evidence_url, _user)
  RETURNING id INTO _id;
  RETURN _id;
END $$;

-- =============================================================
-- ATTESTATIONS (AOC)
-- =============================================================
CREATE TABLE public.attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL UNIQUE REFERENCES public.reviews(id) ON DELETE CASCADE,
  organization text NOT NULL,
  scope_statement text NOT NULL,
  aos_version text NOT NULL,
  determination text NOT NULL CHECK (determination IN ('pass','pass_with_compensations','fail')),
  scenarios public.scenario_tag[] NOT NULL DEFAULT '{}',
  qaga_assessor_id uuid REFERENCES public.qaga_assessors(id),
  qaga_firm_id uuid REFERENCES public.qagac_firms(id),
  pdf_path text,
  pdf_sha256 text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid NOT NULL,
  signature text,
  prev_audit_hash text
);
ALTER TABLE public.attestations ENABLE ROW LEVEL SECURITY;

-- Public registry view (no auth) — for verifier endpoint and QR codes
CREATE POLICY "attestations public read" ON public.attestations
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "attestations admin manage" ON public.attestations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =============================================================
-- CONFORMANCE COMPUTATION
-- =============================================================
CREATE OR REPLACE FUNCTION public.compute_conformance(_review_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _crit int; _high int; _med int; _comp int; _total_findings int;
  _verdict text;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE severity='critical'),
    COUNT(*) FILTER (WHERE severity='high'),
    COUNT(*) FILTER (WHERE severity='medium'),
    COUNT(*)
  INTO _crit, _high, _med, _total_findings
  FROM public.agent_findings WHERE review_id = _review_id;

  SELECT COUNT(*) INTO _comp FROM public.compensating_controls
    WHERE review_id = _review_id AND status='accepted';

  -- Subtract compensated highs/criticals (1:1 cap to severity counts)
  IF _comp >= _crit + _high THEN
    _verdict := CASE WHEN _comp > 0 AND (_crit + _high) > 0 THEN 'pass_with_compensations'
                     WHEN _crit + _high = 0 THEN 'pass'
                     ELSE 'pass_with_compensations' END;
  ELSE
    _verdict := 'fail';
  END IF;

  RETURN jsonb_build_object(
    'verdict', _verdict,
    'critical', _crit,
    'high', _high,
    'medium', _med,
    'compensations', _comp,
    'total_findings', _total_findings
  );
END $$;

-- =============================================================
-- ATTESTATION ISSUANCE (for QAGA via SECURITY DEFINER)
-- =============================================================
CREATE OR REPLACE FUNCTION public.issue_attestation(
  _review_id uuid,
  _organization text,
  _scope_statement text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _eng record;
  _conf jsonb;
  _aos_ver text;
  _att_id uuid;
  _scenarios scenario_tag[];
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT e.assessor_id, e.firm_id, a.user_id INTO _eng
  FROM public.assessor_engagements e
  JOIN public.qaga_assessors a ON a.id = e.assessor_id
  WHERE e.review_id = _review_id AND e.status='active'
  LIMIT 1;

  IF _eng.assessor_id IS NULL THEN RAISE EXCEPTION 'no active engagement for review'; END IF;
  IF _eng.user_id <> _user AND NOT public.has_role(_user,'admin') THEN
    RAISE EXCEPTION 'only the assigned QAGA may issue';
  END IF;

  _conf := public.compute_conformance(_review_id);
  SELECT version INTO _aos_ver FROM public.aos_versions WHERE status='active' ORDER BY created_at DESC LIMIT 1;
  SELECT scenarios INTO _scenarios FROM public.reviews WHERE id = _review_id;

  INSERT INTO public.attestations (
    review_id, organization, scope_statement, aos_version, determination,
    scenarios, qaga_assessor_id, qaga_firm_id, issued_by
  ) VALUES (
    _review_id, _organization, _scope_statement,
    COALESCE(_aos_ver,'unspecified'),
    _conf->>'verdict',
    COALESCE(_scenarios,'{}'::scenario_tag[]),
    _eng.assessor_id, _eng.firm_id, _user
  )
  ON CONFLICT (review_id) DO UPDATE SET
    organization = EXCLUDED.organization,
    scope_statement = EXCLUDED.scope_statement,
    determination = EXCLUDED.determination,
    issued_at = now(),
    issued_by = _user
  RETURNING id INTO _att_id;

  UPDATE public.reviews SET
    status = CASE WHEN _conf->>'verdict' = 'fail' THEN 'rejected'::review_status ELSE 'approved'::review_status END,
    decided_at = now(),
    decided_by = _user,
    decision_notes = 'AOC issued: ' || (_conf->>'verdict')
  WHERE id = _review_id;

  RETURN _att_id;
END $$;

-- =============================================================
-- STORAGE BUCKET FOR ATTESTATIONS
-- =============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('attestations','attestations', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "attestations public read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'attestations');

CREATE POLICY "attestations service write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attestations' AND public.has_role(auth.uid(),'admin'));

-- =============================================================
-- SEED SCENARIO PACKS (v0.1-draft, unofficial)
-- =============================================================
WITH p AS (
  INSERT INTO public.scenario_packs (scenario, name, description) VALUES
  ('healthcare_codegen','Healthcare AI Codegen','HIPAA Security/Privacy + FDA SaMD classification + audit trail requirements.'),
  ('generative_ip','Generative IP & Provenance','DMCA safe harbor, C2PA content credentials, training-data provenance, human-authorship test.'),
  ('hr_behavior','HR & Employment AI','EEOC Uniform Guidelines, ADA accommodation, GDPR Art. 22 automated decision restrictions.'),
  ('enterprise_oss','Enterprise OSS Adoption','SBOM (CycloneDX/SPDX), SLSA build provenance, OSS license compliance, telemetry disclosure.')
  RETURNING id, scenario
)
INSERT INTO public.scenario_pack_controls (pack_id, control_ref, framework, objective, severity_if_missing, aos_control_hint)
SELECT p.id, c.control_ref, c.framework, c.objective, c.sev::severity, c.hint FROM p,
LATERAL (VALUES
  ('healthcare_codegen','HIPAA-164.312(a)','HIPAA Security','Access control with unique user identification and emergency access procedures.','high','AOS-L1-08'),
  ('healthcare_codegen','HIPAA-164.312(b)','HIPAA Security','Audit controls recording AI model access to PHI.','critical','AOS-L1-04'),
  ('healthcare_codegen','FDA-SaMD-Class','FDA SaMD','Software as Medical Device classification and intended-use statement.','high','AOS-L1-12'),
  ('healthcare_codegen','HIPAA-164.502(b)','HIPAA Privacy','Minimum necessary standard for PHI exposed to AI inference.','high','AOS-L1-09'),

  ('generative_ip','C2PA-Manifest','C2PA','Content credentials manifest attached to AI-generated outputs.','high','AOS-L1-07'),
  ('generative_ip','DMCA-512(c)','DMCA','Designated agent + takedown procedure for generated content.','medium','AOS-L1-15'),
  ('generative_ip','TrainData-Provenance','Copyright','Training data lineage and licensed-source attestation.','high','AOS-L1-06'),
  ('generative_ip','HumanAuthor-Test','USCO','Documentation of human creative contribution for copyright registration.','medium','AOS-L1-13'),

  ('hr_behavior','EEOC-Uniform-Guidelines','EEOC','Adverse impact analysis (4/5ths rule) on protected classes.','critical','AOS-L1-05'),
  ('hr_behavior','GDPR-Art-22','GDPR','Right to human review of automated decisions producing legal/significant effects.','critical','AOS-L1-10'),
  ('hr_behavior','ADA-Accommodation','ADA','Reasonable accommodation pathway for AI-administered assessments.','high','AOS-L1-08'),
  ('hr_behavior','NYC-AEDT-Bias-Audit','NYC Local Law 144','Annual independent bias audit and public results notice.','high','AOS-L1-05'),

  ('enterprise_oss','SBOM-CycloneDX','CycloneDX','Software Bill of Materials in CycloneDX or SPDX for AI dependencies.','high','AOS-L1-02'),
  ('enterprise_oss','SLSA-L3-Build','SLSA','Hermetic, isolated, signed build provenance (level 3+).','high','AOS-L1-03'),
  ('enterprise_oss','OSS-License-Compat','SPDX','License compatibility analysis for combined OSS components.','medium','AOS-L1-14'),
  ('enterprise_oss','Telemetry-Disclosure','Privacy','Disclosure of telemetry, callbacks, or data egress to external endpoints.','high','AOS-L1-11')
) AS c(scenario, control_ref, framework, objective, sev, hint)
WHERE p.scenario::text = c.scenario;