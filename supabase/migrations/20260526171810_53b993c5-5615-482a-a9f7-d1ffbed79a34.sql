
INSERT INTO storage.buckets (id, name, public) VALUES ('svc-chat', 'svc-chat', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "svc chat public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'svc-chat');

CREATE POLICY "svc chat auth upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'svc-chat' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "svc chat auth delete own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'svc-chat' AND auth.uid()::text = (storage.foldername(name))[1]);
