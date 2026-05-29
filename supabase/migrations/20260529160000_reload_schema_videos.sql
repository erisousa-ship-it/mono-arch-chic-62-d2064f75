ALTER TABLE public.svc_posts ADD COLUMN IF NOT EXISTS videos text[] NOT NULL DEFAULT '{}';
NOTIFY pgrst, 'reload schema';
