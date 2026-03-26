-- Run this in Supabase SQL Editor for the same project used by VITE_SUPABASE_URL.
-- This script creates a Masonry-ready gallery with automatic ordering and secure upload rules.

begin;

create schema if not exists app;

create or replace function app.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = app, public
as $$
  select exists (
    select 1
    from app.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  );
$$;

revoke all on function app.current_user_is_admin() from public;
grant execute on function app.current_user_is_admin() to authenticated;

create table if not exists app.gallery_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  storage_path text not null unique,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  file_size_bytes integer not null check (file_size_bytes > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists gallery_images_active_sort_idx
  on app.gallery_images (is_active, sort_order desc, created_at desc);

create or replace function app.set_gallery_sort_order()
returns trigger
language plpgsql
as $$
begin
  if new.sort_order is null or new.sort_order <= 0 then
    select coalesce(max(g.sort_order), 0) + 1
      into new.sort_order
    from app.gallery_images g;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gallery_sort_order on app.gallery_images;
create trigger trg_gallery_sort_order
before insert on app.gallery_images
for each row
execute function app.set_gallery_sort_order();

alter table app.gallery_images enable row level security;

-- Everyone can read active images. You can change this to authenticated if needed.
drop policy if exists gallery_images_select_active on app.gallery_images;
create policy gallery_images_select_active
on app.gallery_images
for select
to public
using (is_active = true);

-- Signed-in users can upload their own images.
drop policy if exists gallery_images_insert_authenticated on app.gallery_images;
create policy gallery_images_insert_authenticated
on app.gallery_images
for insert
to authenticated
with check (created_by = auth.uid());

-- Users can update or delete only their own rows. Admins can manage any row.
drop policy if exists gallery_images_update_owner_or_admin on app.gallery_images;
create policy gallery_images_update_owner_or_admin
on app.gallery_images
for update
to authenticated
using (created_by = auth.uid() or app.current_user_is_admin())
with check (created_by = auth.uid() or app.current_user_is_admin());

drop policy if exists gallery_images_delete_owner_or_admin on app.gallery_images;
create policy gallery_images_delete_owner_or_admin
on app.gallery_images
for delete
to authenticated
using (created_by = auth.uid() or app.current_user_is_admin());

-- Create storage bucket once. Public read is enabled so image URLs can be used directly.
insert into storage.buckets (id, name, public)
values ('gallery-images', 'gallery-images', true)
on conflict (id) do nothing;

-- Public read from the gallery bucket.
drop policy if exists gallery_bucket_public_read on storage.objects;
create policy gallery_bucket_public_read
on storage.objects
for select
to public
using (bucket_id = 'gallery-images');

-- Signed-in users can upload only into their own folder: <user_id>/file-name.ext
drop policy if exists gallery_bucket_insert_authenticated on storage.objects;
create policy gallery_bucket_insert_authenticated
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'gallery-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update/delete only their own uploads. Admins can manage all gallery objects.
drop policy if exists gallery_bucket_update_owner_or_admin on storage.objects;
create policy gallery_bucket_update_owner_or_admin
on storage.objects
for update
to authenticated
using (
  bucket_id = 'gallery-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or app.current_user_is_admin()
  )
)
with check (
  bucket_id = 'gallery-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or app.current_user_is_admin()
  )
);

drop policy if exists gallery_bucket_delete_owner_or_admin on storage.objects;
create policy gallery_bucket_delete_owner_or_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'gallery-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or app.current_user_is_admin()
  )
);

commit;
