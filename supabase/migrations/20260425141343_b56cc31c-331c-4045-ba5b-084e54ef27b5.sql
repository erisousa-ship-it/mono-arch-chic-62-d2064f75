
-- Enum for platforms
CREATE TYPE public.social_platform AS ENUM ('instagram', 'facebook');

-- Enum for post status
CREATE TYPE public.post_status AS ENUM ('draft', 'scheduled', 'publishing', 'published', 'failed');

-- Social accounts (mock connections)
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform public.social_platform NOT NULL,
  account_name TEXT NOT NULL,
  account_handle TEXT NOT NULL,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own social accounts"
  ON public.social_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own social accounts"
  ON public.social_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own social accounts"
  ON public.social_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own social accounts"
  ON public.social_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Scheduled posts
CREATE TABLE public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  caption TEXT NOT NULL,
  hashtags TEXT,
  media_url TEXT,
  platforms public.social_platform[] NOT NULL DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  status public.post_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own posts"
  ON public.scheduled_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own posts"
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own posts"
  ON public.scheduled_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own posts"
  ON public.scheduled_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for cron lookups
CREATE INDEX idx_scheduled_posts_due ON public.scheduled_posts (scheduled_for, status)
  WHERE status = 'scheduled';

-- Storage bucket for post media
INSERT INTO storage.buckets (id, name, public) VALUES ('social-media', 'social-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read social media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'social-media');

CREATE POLICY "Users upload own social media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'social-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own social media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'social-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own social media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'social-media' AND auth.uid()::text = (storage.foldername(name))[1]);
