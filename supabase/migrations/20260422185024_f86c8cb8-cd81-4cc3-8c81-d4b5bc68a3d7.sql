
-- Create public bucket for Debug Tool uploads
insert into storage.buckets (id, name, public)
values ('debug-uploads', 'debug-uploads', true)
on conflict (id) do nothing;

-- Allow admins to upload to debug-uploads
create policy "Admins can upload to debug-uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'debug-uploads'
  and public.has_role(auth.uid(), 'admin')
);

-- Public read (bucket is public, but be explicit for objects too)
create policy "Anyone can read debug-uploads"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'debug-uploads');

-- Allow admins to delete their own debug-uploads (housekeeping)
create policy "Admins can delete debug-uploads"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'debug-uploads'
  and public.has_role(auth.uid(), 'admin')
);
