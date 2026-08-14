-- Atomic owner signup bootstrap. Uses auth.uid() only. Idempotent.

CREATE OR REPLACE FUNCTION public.slugify_organization_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT trim(both '-' FROM regexp_replace(lower(coalesce(p_name, 'org')), '[^a-z0-9]+', '-', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_organization(
  p_organization_name text,
  p_full_name text,
  p_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_org_id uuid;
  v_email text;
  v_slug text;
  v_base_slug text;
  v_suffix text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_organization_name IS NULL OR length(trim(p_organization_name)) < 2 THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;

  IF p_full_name IS NULL OR length(trim(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  SELECT p.organization_id INTO v_org_id
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF v_org_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (v_uid, v_org_id, 'owner')
    ON CONFLICT (user_id, organization_id) DO NOTHING;
    RETURN v_org_id;
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = v_uid;

  v_base_slug := public.slugify_organization_name(p_organization_name);
  IF v_base_slug IS NULL OR v_base_slug = '' THEN
    v_base_slug := 'org';
  END IF;

  v_suffix := substr(replace(v_uid::text, '-', ''), 1, 8);
  v_slug := v_base_slug || '-' || v_suffix;

  INSERT INTO public.organizations (name, slug, is_active, is_demo, onboarding_completed_at)
  VALUES (trim(p_organization_name), v_slug, true, false, NULL)
  RETURNING id INTO v_org_id;

  INSERT INTO public.profiles (id, organization_id, full_name, email, phone, is_active)
  VALUES (
    v_uid,
    v_org_id,
    trim(p_full_name),
    coalesce(v_email, ''),
    NULLIF(trim(coalesce(p_phone, '')), ''),
    true
  );

  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (v_uid, v_org_id, 'owner');

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.slugify_organization_name(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bootstrap_organization(text, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.slugify_organization_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_organization(text, text, text) TO authenticated;
