
-- 1. Fix trigger that grants admin to every new user
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE admin_count int;
BEGIN
  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin'::app_role;
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user'::app_role) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Make debug-uploads bucket private and remove public read policy
UPDATE storage.buckets SET public = false WHERE id = 'debug-uploads';
DROP POLICY IF EXISTS "Anyone can read debug-uploads" ON storage.objects;

CREATE POLICY "Admins can read debug-uploads"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'debug-uploads' AND has_role(auth.uid(), 'admin'::app_role));

-- 3. Remove overly permissive event-images policies (rely on ownership-scoped ones)
DROP POLICY IF EXISTS "Authenticated users can delete event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update event images" ON storage.objects;
DROP POLICY IF EXISTS "Event images update (authenticated)" ON storage.objects;
DROP POLICY IF EXISTS "Event images upload (authenticated)" ON storage.objects;

-- 4. Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- 5. Harden user_roles policies: split ALL into specific commands; prevent self-grant
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND user_id <> auth.uid());

CREATE POLICY "Admins update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND user_id <> auth.uid());

CREATE POLICY "Admins delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND user_id <> auth.uid());

CREATE POLICY "Admins view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
