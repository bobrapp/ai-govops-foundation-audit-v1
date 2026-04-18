
-- Roles enum + table (separate from profiles for security)
CREATE TYPE public.app_role AS ENUM ('admin', 'reviewer', 'submitter');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  organization TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- has_role security definer to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Reviews
CREATE TYPE public.review_status AS ENUM ('draft', 'ingesting', 'analyzing', 'pending_human', 'approved', 'rejected', 'failed');
CREATE TYPE public.source_type AS ENUM ('paste', 'upload', 'github');
CREATE TYPE public.scenario_tag AS ENUM ('enterprise_oss', 'healthcare_codegen', 'generative_ip', 'hr_behavior', 'general');

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  source_type public.source_type NOT NULL,
  source_url TEXT,
  scenarios public.scenario_tag[] NOT NULL DEFAULT '{general}',
  status public.review_status NOT NULL DEFAULT 'draft',
  overall_score INT,
  decision_notes TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.review_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  language TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE public.severity AS ENUM ('info', 'low', 'medium', 'high', 'critical');

CREATE TABLE public.agent_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  severity public.severity NOT NULL DEFAULT 'info',
  category TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  evidence TEXT,
  frameworks TEXT[] DEFAULT '{}',
  scenario public.scenario_tag,
  recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  actor_kind TEXT NOT NULL,        -- 'user' | 'agent' | 'system'
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile + default submitter role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, organization)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
          NEW.raw_user_meta_data->>'organization');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'submitter');
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles readable by signed in" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- reviews
CREATE POLICY "submitters create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitter_id);
CREATE POLICY "view own or reviewer/admin" ON public.reviews FOR SELECT TO authenticated USING (
  auth.uid() = submitter_id OR public.has_role(auth.uid(), 'reviewer') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "submitter updates own draft, reviewers update any" ON public.reviews FOR UPDATE TO authenticated USING (
  (auth.uid() = submitter_id AND status = 'draft') OR public.has_role(auth.uid(), 'reviewer') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "submitter deletes own draft" ON public.reviews FOR DELETE TO authenticated USING (
  (auth.uid() = submitter_id AND status = 'draft') OR public.has_role(auth.uid(), 'admin')
);

-- artifacts (inherit visibility via review)
CREATE POLICY "artifacts readable with review" ON public.review_artifacts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND (
    r.submitter_id = auth.uid() OR public.has_role(auth.uid(), 'reviewer') OR public.has_role(auth.uid(), 'admin')
  ))
);
CREATE POLICY "artifacts insert by submitter" ON public.review_artifacts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.submitter_id = auth.uid())
);

-- findings (read same as review; writes only via service role / edge fn)
CREATE POLICY "findings readable with review" ON public.agent_findings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND (
    r.submitter_id = auth.uid() OR public.has_role(auth.uid(), 'reviewer') OR public.has_role(auth.uid(), 'admin')
  ))
);

-- audit log: append-only, readable on owned reviews or by admin
CREATE POLICY "audit readable" ON public.audit_log FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.submitter_id = auth.uid()
  )
);
CREATE POLICY "audit insert by authenticated" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id OR actor_id IS NULL);

CREATE INDEX idx_reviews_submitter ON public.reviews(submitter_id);
CREATE INDEX idx_reviews_status ON public.reviews(status);
CREATE INDEX idx_findings_review ON public.agent_findings(review_id);
CREATE INDEX idx_audit_review ON public.audit_log(review_id);
