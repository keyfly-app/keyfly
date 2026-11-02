-- =====================================================================
-- Keyfly – member roles (canvas "Csapat – szerepkör választása a sorban", approved 2026-11-02)
--  * The role of a member changes only through set_member_role: the account holder (owner) or an admin,
--    never their own role, never the account holder's, never to "owner" (that is a hand-over).
--  * Direct updates of account_members are closed (they allowed role = 'owner').
-- =====================================================================

revoke update on public.account_members from authenticated;
drop policy if exists "account_members_update_owner_admin" on public.account_members;

create or replace function public.set_member_role(p_account_id uuid, p_user_id uuid, p_role public.account_role)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target public.account_role;
begin
  if not private.has_account_role(p_account_id, array['owner', 'admin']::public.account_role[]) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'own_role' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'owner_is_transferred_not_invited' using errcode = '23514';
  end if;
  select role into target from public.account_members where account_id = p_account_id and user_id = p_user_id for update;
  if target is null then
    raise exception 'not_a_member' using errcode = '22023';
  end if;
  if target = 'owner' then
    raise exception 'holder_role_fixed' using errcode = '42501';
  end if;
  -- Admins always see every property.
  update public.account_members
     set role = p_role, property_scope = case when p_role = 'admin' then 'all' else property_scope end
   where account_id = p_account_id and user_id = p_user_id;
  if p_role = 'admin' then
    delete from public.account_member_properties where account_id = p_account_id and user_id = p_user_id;
  end if;
end;
$$;
revoke execute on function public.set_member_role(uuid, uuid, public.account_role) from public, anon;
grant execute on function public.set_member_role(uuid, uuid, public.account_role) to authenticated;
