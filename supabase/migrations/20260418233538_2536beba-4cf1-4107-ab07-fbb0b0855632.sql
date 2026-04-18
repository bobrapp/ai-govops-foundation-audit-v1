-- ============================================================
-- 1) PUBLIC FIRMS VIEW (hides contact_email from anon)
-- ============================================================

-- Drop the public-anon SELECT policy on the base table; expose via view instead
DROP POLICY IF EXISTS "qagac public registry" ON public.qagac_firms;

-- Public-safe view: omit contact_email and indemnity details from anon
CREATE OR REPLACE VIEW public.qagac_firms_public
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  jurisdiction,
  status,
  website,
  charter_at,
  active_assessor_count,
  public_listed,
  created_at
FROM public.qagac_firms
WHERE status IN ('charter','active') AND public_listed = true;

GRANT SELECT ON public.qagac_firms_public TO anon, authenticated;

-- Re-allow authenticated users (incl. admins via existing admin policy) to read full table
-- Authenticated users can see public-listed active/charter firms with full detail
CREATE POLICY "qagac authenticated registry full"
ON public.qagac_firms
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(),'admin')
  OR (status IN ('charter','active') AND public_listed = true)
);

-- ============================================================
-- 2) TIGHTEN ASSESSOR SELF-UPDATE POLICY
-- ============================================================

DROP POLICY IF EXISTS "assessors self update training progression" ON public.qaga_assessors;

-- Trigger: enforce that self-updates only touch whitelisted columns
CREATE OR REPLACE FUNCTION public.qaga_assessors_self_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may update anything via the admin-manage policy; this guard only
  -- runs for non-admin self updates (the policy ensures user_id = auth.uid()).
  IF public.has_role(auth.uid(),'admin') THEN
    RETURN NEW;
  END IF;

  -- Disallow changes to privileged columns
  IF NEW.user_id        IS DISTINCT FROM OLD.user_id        THEN RAISE EXCEPTION 'cannot change user_id'; END IF;
  IF NEW.firm_id        IS DISTINCT FROM OLD.firm_id        THEN RAISE EXCEPTION 'firm_id is admin-managed'; END IF;
  IF NEW.status         IS DISTINCT FROM OLD.status         THEN RAISE EXCEPTION 'status is admin-managed'; END IF;
  IF NEW.training_level IS DISTINCT FROM OLD.training_level THEN RAISE EXCEPTION 'training_level is admin-managed'; END IF;
  IF NEW.badges         IS DISTINCT FROM OLD.badges         THEN RAISE EXCEPTION 'badges are admin-managed'; END IF;
  IF NEW.jurisdiction   IS DISTINCT FROM OLD.jurisdiction   THEN RAISE EXCEPTION 'jurisdiction is admin-managed'; END IF;
  IF NEW.qaga_credential_id IS DISTINCT FROM OLD.qaga_credential_id AND OLD.qaga_credential_id IS NOT NULL THEN RAISE EXCEPTION 'credential id is admin-managed once issued'; END IF;
  IF NEW.qaga_issued_at IS DISTINCT FROM OLD.qaga_issued_at THEN RAISE EXCEPTION 'qaga_issued_at is admin-managed'; END IF;
  IF NEW.qaga_expires_at IS DISTINCT FROM OLD.qaga_expires_at THEN RAISE EXCEPTION 'qaga_expires_at is admin-managed'; END IF;
  IF NEW.display_name   IS DISTINCT FROM OLD.display_name   THEN RAISE EXCEPTION 'display_name is admin-managed'; END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS qaga_assessors_self_update_guard_trg ON public.qaga_assessors;
CREATE TRIGGER qaga_assessors_self_update_guard_trg
BEFORE UPDATE ON public.qaga_assessors
FOR EACH ROW
EXECUTE FUNCTION public.qaga_assessors_self_update_guard();

-- Recreate self-update policy: only own row, only non-qaga progression
CREATE POLICY "assessors self update training progression"
ON public.qaga_assessors
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3) STORAGE POLICIES on 'attestations' bucket
--    Keep anon SELECT (verify page needs PDFs); admin-only write/delete
-- ============================================================

-- Public read (already exists implicitly via bucket public flag, but be explicit)
DROP POLICY IF EXISTS "attestations public read" ON storage.objects;
CREATE POLICY "attestations public read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'attestations');

DROP POLICY IF EXISTS "attestations admin insert" ON storage.objects;
CREATE POLICY "attestations admin insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attestations' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "attestations admin update" ON storage.objects;
CREATE POLICY "attestations admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'attestations' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'attestations' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "attestations admin delete" ON storage.objects;
CREATE POLICY "attestations admin delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'attestations' AND public.has_role(auth.uid(),'admin'));