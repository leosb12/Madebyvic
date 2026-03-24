-- Run this in Supabase SQL Editor for the same project used by VITE_SUPABASE_URL.
-- Purpose: allow admins from app.profiles to read all profiles.

begin;

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

-- Keep self-read behavior and add admin-wide read behavior.
drop policy if exists profiles_read_own_or_admin on app.profiles;
create policy profiles_read_own_or_admin
on app.profiles
for select
to authenticated
using (
  id = auth.uid()
  or app.current_user_is_admin()
);

-- Optional: let admins update/delete any profile.
drop policy if exists profiles_update_own_or_admin on app.profiles;
create policy profiles_update_own_or_admin
on app.profiles
for update
to authenticated
using (
  id = auth.uid()
  or app.current_user_is_admin()
)
with check (
  id = auth.uid()
  or app.current_user_is_admin()
);

drop policy if exists profiles_delete_admin_only on app.profiles;
create policy profiles_delete_admin_only
on app.profiles
for delete
to authenticated
using (app.current_user_is_admin());

commit;
