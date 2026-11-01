-- =====================================================================
-- Keyfly – profile settings (canvas "App v2.3": Profil, Belépés és biztonság)
--  1. profile photo (private 'avatars' bucket, own folder only) and the last password change
--  2. the profile follows the sign-in: email and password changes made in Supabase Auth
--  3. active sessions: the signed-in user lists theirs and ends any other one
-- =====================================================================

-- ---------- 1. profile photo, password date --------------------------------

alter table public.profiles
  add column avatar_path text,
  add column password_changed_at timestamptz,
  add constraint profiles_avatar_in_own_folder
    check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[A-Za-z0-9_-]{8,64}\.(webp|jpg)$')),
  add constraint profiles_phone_format
    check (phone is null or phone ~ '^\+?[0-9][0-9 ]{6,19}$');
comment on column public.profiles.avatar_path is 'avatars bucket: <user uuid>/<random>.webp|.jpg – 512 × 512, cropped in the browser (Safari cannot encode WebP).';
comment on column public.profiles.password_changed_at is 'Set by the auth.users trigger whenever the password changes.';

grant update (avatar_path) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Only the owner reads and writes their folder; the app shows the photo through short-lived signed links.
create policy "avatars_select_own_folder" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_insert_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_delete_own_folder" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- 2. the profile follows the sign-in -------------------------------

create or replace function private.sync_profile_from_auth()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  if new.encrypted_password is distinct from old.encrypted_password and old.encrypted_password is not null then
    update public.profiles set password_changed_at = now() where id = new.id;
  end if;
  return new;
end;
$$;
revoke execute on function private.sync_profile_from_auth() from public, anon, authenticated;

create trigger on_auth_user_updated
  after update of email, encrypted_password on auth.users
  for each row execute function private.sync_profile_from_auth();

-- ---------- 3. active sessions -----------------------------------------------

-- The caller's own sessions, newest activity first; is_current marks the one this request uses.
create or replace function public.my_sessions()
returns table (id uuid, user_agent text, ip text, created_at timestamptz, last_active_at timestamptz, is_current boolean)
language sql stable security definer set search_path = '' as $$
  select s.id,
         left(s.user_agent, 300),
         host(s.ip),
         s.created_at,
         coalesce(s.refreshed_at at time zone 'utc', s.updated_at, s.created_at),
         s.id::text = (select auth.jwt() ->> 'session_id')
  from auth.sessions s
  where s.user_id = (select auth.uid())
  order by coalesce(s.refreshed_at at time zone 'utc', s.updated_at, s.created_at) desc nulls last
  limit 20;
$$;

-- Ends one of the caller's other sessions (its refresh tokens go with it). The current one ends with sign-out.
create or replace function public.end_my_session(p_session_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if (select auth.uid()) is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if p_session_id::text = (select auth.jwt() ->> 'session_id') then
    raise exception 'current_session' using errcode = '22023';
  end if;
  delete from auth.sessions where id = p_session_id and user_id = (select auth.uid());
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

revoke execute on function public.my_sessions() from public, anon;
revoke execute on function public.end_my_session(uuid) from public, anon;
grant execute on function public.my_sessions() to authenticated;
grant execute on function public.end_my_session(uuid) to authenticated;
