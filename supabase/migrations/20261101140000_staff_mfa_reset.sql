-- =====================================================================
-- Staff sign-in support:
--   * staff_invitation_preview: what the invitation page shows before the
--     invitee has an account (the token is the secret; anon may call it)
--   * staff_overview: the super admin's staff list, with 2FA status
--   * reset_staff_mfa: a super admin removes a colleague's authenticator
--     (lost phone) and signs them out everywhere. Never on oneself: a
--     stolen session must not be able to swap the second factor.
-- Auth tables are written as the migration owner (postgres), which has
-- DML rights on auth.* on Supabase; the deletes cascade to challenges,
-- recovery codes, refresh tokens and AMR claims.
-- =====================================================================

create or replace function public.staff_invitation_preview(p_token text)
returns table (email text, role public.staff_role, inviter_name text, expires_at timestamptz, is_open boolean)
language sql stable security definer set search_path = '' as $$
  select i.email, i.role, coalesce(p.full_name, 'Keyfly'), i.expires_at,
         i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
  from public.staff_invitations i
  left join public.profiles p on p.id = i.invited_by
  where i.token_hash = private.token_hash(p_token);
$$;

create or replace function public.staff_overview()
returns table (
  user_id uuid, full_name text, email text, role public.staff_role, created_at timestamptz,
  disabled_at timestamptz, has_2fa boolean, last_sign_in_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_staff_role(array['superadmin']::public.staff_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select s.user_id, p.full_name, u.email::text, s.role, s.created_at, s.disabled_at,
           exists (select 1 from auth.mfa_factors f where f.user_id = s.user_id and f.status = 'verified'),
           u.last_sign_in_at
    from public.staff s
    join auth.users u on u.id = s.user_id
    left join public.profiles p on p.id = s.user_id
    order by s.disabled_at nulls first, p.full_name;
end;
$$;

create or replace function public.reset_staff_mfa(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  removed int;
begin
  if not private.has_staff_role(array['superadmin']::public.staff_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_reset_own_2fa' using errcode = '42501';
  end if;
  if not exists (select 1 from public.staff where user_id = p_user_id) then
    raise exception 'not_staff' using errcode = 'P0002';
  end if;

  delete from auth.mfa_factors where user_id = p_user_id;
  get diagnostics removed = row_count;
  delete from auth.sessions where user_id = p_user_id;

  insert into audit.events (actor_id, actor_is_staff, action, table_name, row_key, changes)
  values (auth.uid(), true, 'delete', 'mfa_factors', p_user_id::text, jsonb_build_object('reason', 'staff_mfa_reset', 'factors', removed));
end;
$$;

revoke execute on function public.staff_invitation_preview(text), public.staff_overview(), public.reset_staff_mfa(uuid) from public, anon, authenticated;
grant execute on function public.staff_invitation_preview(text) to anon, authenticated;
grant execute on function public.staff_overview(), public.reset_staff_mfa(uuid) to authenticated;
