
INSERT INTO storage.buckets (id, name, public) VALUES ('svc-photos', 'svc-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "svc photos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'svc-photos');

CREATE POLICY "svc photos auth upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'svc-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "svc photos auth update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'svc-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "svc photos auth delete own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'svc-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
