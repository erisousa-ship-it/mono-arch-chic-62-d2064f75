-- Extender enum existente de papéis
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'migrant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'volunteer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'helper';

-- =========================================================
-- svc_categories
-- =========================================================
CREATE TABLE public.svc_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.svc_categories TO anon, authenticated;
GRANT ALL ON public.svc_categories TO service_role;
ALTER TABLE public.svc_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories public read" ON public.svc_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.svc_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- svc_profiles
-- =========================================================
CREATE TABLE public.svc_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL,
  avatar_url text,
  bio text,
  role text NOT NULL DEFAULT 'migrant' CHECK (role IN ('migrant','volunteer','helper','admin')),
  city text,
  lat double precision,
  lng double precision,
  phone text,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  categories text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.svc_profiles TO authenticated;
GRANT ALL ON public.svc_profiles TO service_role;
ALTER TABLE public.svc_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated"
  ON public.svc_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own svc profile"
  ON public.svc_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own svc profile"
  ON public.svc_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER svc_profiles_updated_at
  BEFORE UPDATE ON public.svc_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create svc_profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_svc_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.svc_profiles (user_id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'migrant')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_svc ON auth.users;
CREATE TRIGGER on_auth_user_created_svc
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_svc_profile();

-- =========================================================
-- svc_posts (demandas)
-- =========================================================
CREATE TABLE public.svc_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  photos text[] NOT NULL DEFAULT '{}',
  budget_range text,
  category_slug text REFERENCES public.svc_categories(slug) ON DELETE SET NULL,
  address text,
  lat double precision,
  lng double precision,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','closed','expired')),
  post_type text NOT NULL DEFAULT 'paid' CHECK (post_type IN ('paid','volunteer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.svc_posts TO authenticated;
GRANT ALL ON public.svc_posts TO service_role;
ALTER TABLE public.svc_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts viewable by authenticated"
  ON public.svc_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own posts"
  ON public.svc_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own posts"
  ON public.svc_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own posts"
  ON public.svc_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER svc_posts_updated_at
  BEFORE UPDATE ON public.svc_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_svc_posts_created_at ON public.svc_posts (created_at DESC);
CREATE INDEX idx_svc_posts_category ON public.svc_posts (category_slug);

-- =========================================================
-- svc_conversations
-- =========================================================
CREATE TABLE public.svc_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT svc_conv_users_ordered CHECK (user_a < user_b),
  CONSTRAINT svc_conv_unique_pair UNIQUE (user_a, user_b)
);
GRANT SELECT, INSERT, UPDATE ON public.svc_conversations TO authenticated;
GRANT ALL ON public.svc_conversations TO service_role;
ALTER TABLE public.svc_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view conversations"
  ON public.svc_conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Participants create conversations"
  ON public.svc_conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Participants update conversations"
  ON public.svc_conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Helper to ensure a conversation exists (returns id)
CREATE OR REPLACE FUNCTION public.svc_get_or_create_conversation(_other_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid();
  _a uuid;
  _b uuid;
  _id uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _other_user = _me THEN RAISE EXCEPTION 'cannot chat with self'; END IF;
  _a := LEAST(_me, _other_user);
  _b := GREATEST(_me, _other_user);
  SELECT id INTO _id FROM public.svc_conversations WHERE user_a = _a AND user_b = _b;
  IF _id IS NULL THEN
    INSERT INTO public.svc_conversations (user_a, user_b) VALUES (_a, _b) RETURNING id INTO _id;
  END IF;
  RETURN _id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.svc_get_or_create_conversation(uuid) TO authenticated;

-- =========================================================
-- svc_messages
-- =========================================================
CREATE TABLE public.svc_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.svc_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  media_url text,
  media_type text CHECK (media_type IN ('image','video','audio','file','location')),
  lat double precision,
  lng double precision,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.svc_messages TO authenticated;
GRANT ALL ON public.svc_messages TO service_role;
ALTER TABLE public.svc_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read messages"
  ON public.svc_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.svc_conversations c
    WHERE c.id = svc_messages.conversation_id
      AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)
  ));
CREATE POLICY "Participants send messages"
  ON public.svc_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.svc_conversations c
      WHERE c.id = conversation_id
        AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)
    )
  );
CREATE POLICY "Participants mark read"
  ON public.svc_messages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.svc_conversations c
    WHERE c.id = svc_messages.conversation_id
      AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)
  ));

CREATE INDEX idx_svc_messages_conv ON public.svc_messages (conversation_id, created_at);

-- Update conversation last_message_at after new message
CREATE OR REPLACE FUNCTION public.svc_bump_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.svc_conversations
     SET last_message_at = NEW.created_at
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER svc_messages_bump_conv
  AFTER INSERT ON public.svc_messages
  FOR EACH ROW EXECUTE FUNCTION public.svc_bump_conversation();

-- Enable realtime on messages and conversations
ALTER TABLE public.svc_messages REPLICA IDENTITY FULL;
ALTER TABLE public.svc_conversations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.svc_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.svc_conversations;

-- =========================================================
-- svc_subscriptions
-- =========================================================
CREATE TABLE public.svc_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','pending_verification','active','expired','canceled')),
  trial_ends_at timestamptz,
  expires_at timestamptz,
  amount_brl numeric(10,2) NOT NULL DEFAULT 35.90,
  pix_txid text,
  pix_brcode text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.svc_subscriptions TO authenticated;
GRANT ALL ON public.svc_subscriptions TO service_role;
ALTER TABLE public.svc_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscription"
  ON public.svc_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subscription"
  ON public.svc_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subscription"
  ON public.svc_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all subscriptions"
  ON public.svc_subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all subscriptions"
  ON public.svc_subscriptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER svc_subscriptions_updated_at
  BEFORE UPDATE ON public.svc_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Seed categories
-- =========================================================
INSERT INTO public.svc_categories (slug, name, icon, sort_order) VALUES
  ('limpeza',      'Limpeza',           'Sparkles',   1),
  ('reformas',     'Reformas',          'Hammer',     2),
  ('jardinagem',   'Jardinagem',        'Trees',      3),
  ('mudancas',     'Mudanças',          'Truck',      4),
  ('aulas',        'Aulas particulares','BookOpen',   5),
  ('cuidados',     'Cuidados',          'Heart',      6),
  ('tecnologia',   'Tecnologia',        'Laptop',     7),
  ('beleza',       'Beleza & Estética', 'Scissors',   8),
  ('transporte',   'Transporte',        'Car',        9),
  ('outros',       'Outros',            'MoreHorizontal', 99)
ON CONFLICT (slug) DO NOTHING;