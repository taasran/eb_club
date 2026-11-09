-- Run once in the EXISTING project's SQL Editor as its database owner.
-- Review first. This is not executed by the frontend or Edge Function deployment.
-- No content, account or uploaded file is deleted.
begin;

-- All app data goes through the Edge Function's verified-role middleware.
-- Browser anon keys and authenticated JWTs must never query this KV table directly.
alter table public.kv_store_ad6cf477 enable row level security;
revoke all on table public.kv_store_ad6cf477 from public, anon, authenticated;
grant select, insert, update, delete on table public.kv_store_ad6cf477 to service_role;

-- Restrictive, bucket-scoped policies preserve other applications' buckets.
-- Service-role server uploads continue to bypass RLS.
drop policy if exists eb_club_server_insert on storage.objects;
create policy eb_club_server_insert on storage.objects
  as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'make-ad6cf477-club-images');

drop policy if exists eb_club_server_update on storage.objects;
create policy eb_club_server_update on storage.objects
  as restrictive for update to anon, authenticated
  using (bucket_id <> 'make-ad6cf477-club-images')
  with check (bucket_id <> 'make-ad6cf477-club-images');

drop policy if exists eb_club_server_delete on storage.objects;
create policy eb_club_server_delete on storage.objects
  as restrictive for delete to anon, authenticated
  using (bucket_id <> 'make-ad6cf477-club-images');

commit;
