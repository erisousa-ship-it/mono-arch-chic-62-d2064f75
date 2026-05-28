UPDATE storage.buckets SET public = true WHERE id = 'debug-uploads';

-- Public read for debug-uploads so attached files can be downloaded via public URL
DROP POLICY IF EXISTS "Public read debug-uploads" ON storage.objects;
CREATE POLICY "Public read debug-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'debug-uploads');