-- Chief-auditor compliance certifications (separate from QAGA attestations).
-- Issued automatically by the Quick Audit pipeline (on non-fail verdicts) and
-- re-issuable manually from the Review page.

CREATE TABLE public.certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  organization TEXT NOT NULL,
  scope_statement TEXT NOT NULL,
  aos_version TEXT NOT NULL,
  determination TEXT NOT NULL,
  scenarios scenario_tag[] NOT NULL DEFAULT '{}'::scenario_tag[],
  pdf_path TEXT,
  pdf_sha256 TEXT,
  -- Co-signatures: HMAC-SHA256(AUDIT_SIGNING_KEY + persona_slug, pdf_sha256)
  ken_signature TEXT,
  bob_signature TEXT,
  signature_kind TEXT NOT NULL DEFAULT 'hmac-sha256-demo',
  -- Anchor into existing chained audit_log
  audit_entry_hash TEXT,
  audit_prev_hash TEXT,
  -- Embedded chain-of-custody manifest (every audit row for this review at issue-time)
  chain_manifest JSONB NOT NULL DEFAULT '[]'::jsonb,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by UUID,
  trigger_kind TEXT NOT NULL DEFAULT 'auto',
  CONSTRAINT certifications_trigger_kind_chk CHECK (trigger_kind IN ('auto','manual')),
  CONSTRAINT certifications_signature_kind_chk CHECK (signature_kind IN ('hmac-sha256-demo','ed25519'))
);

CREATE INDEX idx_certifications_review_id ON public.certifications(review_id);
CREATE INDEX idx_certifications_issued_at  ON public.certifications(issued_at DESC);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- Public can read (verifier flow) — same posture as attestations.
CREATE POLICY "certifications public read"
ON public.certifications
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins manage directly (function uses service role anyway).
CREATE POLICY "certifications admin manage"
ON public.certifications
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));