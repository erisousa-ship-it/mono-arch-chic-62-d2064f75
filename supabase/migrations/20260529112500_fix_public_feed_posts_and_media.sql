UPDATE storage.buckets
SET public = true
WHERE id = 'svc-photos';

DROP POLICY IF EXISTS "svc photos auth read own" ON storage.objects;
DROP POLICY IF EXISTS "svc photos public read" ON storage.objects;
CREATE POLICY "svc photos public read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'svc-photos');

DROP POLICY IF EXISTS "Offers public read" ON public.svc_posts;
DROP POLICY IF EXISTS "Open public posts readable by anyone" ON public.svc_posts;
CREATE POLICY "Open public posts readable by anyone"
ON public.svc_posts
FOR SELECT
TO anon
USING (status = 'open');
