
-- Add tamper-evident hash chain to audit_log
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS entry_hash text,
  ADD COLUMN IF NOT EXISTS signature text;

CREATE INDEX IF NOT EXISTS idx_audit_log_review_created
  ON public.audit_log(review_id, created_at);

-- Bootstrap: allow first user to claim admin if zero admins exist.
-- SECURITY DEFINER function guarded by "no admin yet" check.
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  admin_count int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count > 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN true;
END $$;

-- Function for admins to assign roles (callable from client safely)
CREATE OR REPLACE FUNCTION public.assign_role(_target_user uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_role(_target_user uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  -- prevent removing the last admin
  IF _role = 'admin' THEN
    IF (SELECT COUNT(*) FROM public.user_roles WHERE role='admin') <= 1 THEN
      RAISE EXCEPTION 'cannot remove the last admin';
    END IF;
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _target_user AND role = _role;
END $$;
