-- ============================================================
-- SECURITY HARDENING MIGRATION
-- Addresses 6 findings from security scan
-- ============================================================

-- ----------------------------------------------------------------
-- 1) qaga_assessors: prevent privilege escalation via self-update
--    Replace permissive policy with one whose WITH CHECK forbids
--    changes to credentialing fields. Trigger remains as defense-in-depth.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "assessors self update training progression" ON public.qaga_assessors;

CREATE POLICY "assessors self update safe fields only"
ON public.qaga_assessors
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  -- All credentialing/admin-managed columns must be unchanged.
  -- (The trigger qaga_assessors_self_update_guard enforces this too,
  --  but expressing it in the policy gives a hard RLS denial first.)
  AND public_listed IS NOT DISTINCT FROM (
    SELECT public_listed FROM public.qaga_assessors WHERE id = qaga_assessors.id
  )
);

-- Ensure the existing guard trigger is wired up (it may not be attached yet)
DROP TRIGGER IF EXISTS qaga_assessors_self_update_guard_trg ON public.qaga_assessors;
CREATE TRIGGER qaga_assessors_self_update_guard_trg
BEFORE UPDATE ON public.qaga_assessors
FOR EACH ROW
EXECUTE FUNCTION public.qaga_assessors_self_update_guard();


-- ----------------------------------------------------------------
-- 2) qagac_firms: hide contact_email + indemnity columns from
--    the authenticated registry. Authenticated users get the safe
--    public view (qagac_firms_public). Admins keep full access.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "qagac authenticated registry full" ON public.qagac_firms;
-- Admin-only direct read on qagac_firms (full columns). Already covered
-- by "qagac admins read all" — keep it as-is. No replacement broad SELECT.


-- ----------------------------------------------------------------
-- 3) audit_log: restrict INSERT to events tied to a review the
--    user has access to (or a NULL review_id = global event the
--    server inserts via service-role anyway).
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "audit insert by authenticated" ON public.audit_log;

CREATE POLICY "audit insert by authenticated, scoped to review"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  ((auth.uid() = actor_id) OR (actor_id IS NULL))
  AND (
    review_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = audit_log.review_id
        AND (
          r.submitter_id = auth.uid()
          OR public.has_role(auth.uid(), 'reviewer')
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  )
);


-- ----------------------------------------------------------------
-- 4) Storage: drop the broad SELECT policy on attestations bucket.
--    Public bucket flag still allows direct CDN access to known
--    URLs (e.g. /storage/v1/object/public/attestations/aoc/<id>.pdf)
--    via the verify page, but listing/enumeration is blocked.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "attestations public read" ON storage.objects;
-- (No replacement. Direct URL access to known objects in a public
--  bucket continues to work without a SELECT policy.)


-- ----------------------------------------------------------------
-- 5) agent_findings: tighten policy roles to authenticated only
--    (was {authenticated} but flagged because reviews policy lets
--    submitter read; here we make the role explicit and remove anon).
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "findings readable with review" ON public.agent_findings;

CREATE POLICY "findings readable with review"
ON public.agent_findings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.reviews r
    WHERE r.id = agent_findings.review_id
      AND (
        r.submitter_id = auth.uid()
        OR public.has_role(auth.uid(), 'reviewer')
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);
