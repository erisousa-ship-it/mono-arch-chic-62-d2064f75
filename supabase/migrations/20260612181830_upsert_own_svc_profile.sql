-- Robust upsert RPC for svc_profiles (bypasses RLS safely via SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.upsert_own_svc_profile(_values jsonb)
RETURNS public.svc_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile public.svc_profiles;
  _uid uuid := auth.uid();
  _cats text[];
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _values ? 'categories' AND jsonb_typeof(_values->'categories') = 'array' THEN
    SELECT array_agg(value) INTO _cats FROM jsonb_array_elements_text(_values->'categories');
    _cats := COALESCE(_cats, '{}'::text[]);
  END IF;

  INSERT INTO public.svc_profiles AS p (
    user_id, display_name, bio, city, phone, role,
    avatar_url, cover_url, categories, lat, lng, pix_brcode
  )
  VALUES (
    _uid,
    COALESCE(NULLIF(_values->>'display_name',''), 'Usuário'),
    NULLIF(_values->>'bio',''),
    NULLIF(_values->>'city',''),
    NULLIF(_values->>'phone',''),
    COALESCE(NULLIF(_values->>'role',''), 'migrant'),
    NULLIF(_values->>'avatar_url',''),
    NULLIF(_values->>'cover_url',''),
    COALESCE(_cats, '{}'::text[]),
    NULLIF(_values->>'lat','')::double precision,
    NULLIF(_values->>'lng','')::double precision,
    NULLIF(_values->>'pix_brcode','')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(NULLIF(_values->>'display_name',''), p.display_name),
    bio          = CASE WHEN _values ? 'bio'        THEN NULLIF(_values->>'bio','')        ELSE p.bio END,
    city         = CASE WHEN _values ? 'city'       THEN NULLIF(_values->>'city','')       ELSE p.city END,
    phone        = CASE WHEN _values ? 'phone'      THEN NULLIF(_values->>'phone','')      ELSE p.phone END,
    role         = COALESCE(NULLIF(_values->>'role',''), p.role),
    avatar_url   = CASE WHEN _values ? 'avatar_url' THEN NULLIF(_values->>'avatar_url','') ELSE p.avatar_url END,
    cover_url    = CASE WHEN _values ? 'cover_url'  THEN NULLIF(_values->>'cover_url','')  ELSE p.cover_url END,
    categories   = CASE WHEN _values ? 'categories' THEN COALESCE(_cats, '{}'::text[])     ELSE p.categories END,
    lat          = CASE WHEN _values ? 'lat'        THEN NULLIF(_values->>'lat','')::double precision ELSE p.lat END,
    lng          = CASE WHEN _values ? 'lng'        THEN NULLIF(_values->>'lng','')::double precision ELSE p.lng END,
    pix_brcode   = CASE WHEN _values ? 'pix_brcode' THEN NULLIF(_values->>'pix_brcode','') ELSE p.pix_brcode END,
    updated_at   = now()
  RETURNING * INTO _profile;

  RETURN _profile;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_own_svc_profile(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_own_svc_profile(jsonb) TO authenticated, service_role;

-- Re-affirm RLS policies and grants (idempotent).
ALTER TABLE public.svc_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own svc profile" ON public.svc_profiles;
CREATE POLICY "Users insert own svc profile"
  ON public.svc_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own svc profile" ON public.svc_profiles;
CREATE POLICY "Users update own svc profile"
  ON public.svc_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.svc_profiles;
CREATE POLICY "Profiles viewable by authenticated"
  ON public.svc_profiles FOR SELECT TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE ON public.svc_profiles TO authenticated;
GRANT ALL ON public.svc_profiles TO service_role;
