-- 1. Drop the broken policy with the self-referential subquery
DROP POLICY IF EXISTS "assessors self update safe fields only" ON public.qaga_assessors;

-- 2. Recreate with a clean USING/WITH CHECK that only verifies ownership.
--    The qaga_assessors_self_update_guard trigger enforces which fields may change.
CREATE POLICY "assessors self update safe fields only"
ON public.qaga_assessors
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Attach the existing guard trigger that blocks changes to privileged columns
--    (status, badges, training_level, firm_id, jurisdiction, credentials, display_name, etc.)
--    The function already short-circuits for admins, so the admin-manage policy still works.
DROP TRIGGER IF EXISTS qaga_assessors_self_update_guard_trg ON public.qaga_assessors;
CREATE TRIGGER qaga_assessors_self_update_guard_trg
BEFORE UPDATE ON public.qaga_assessors
FOR EACH ROW
EXECUTE FUNCTION public.qaga_assessors_self_update_guard();

-- 4. Also guard public_listed (not in the existing function) so assessors can't
--    flip their own listing visibility — admins still can.
CREATE OR REPLACE FUNCTION public.qaga_assessors_self_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(),'admin') THEN
    RETURN NEW;
  END IF;

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
  IF NEW.public_listed  IS DISTINCT FROM OLD.public_listed  THEN RAISE EXCEPTION 'public_listed is admin-managed'; END IF;

  RETURN NEW;
END
$function$;