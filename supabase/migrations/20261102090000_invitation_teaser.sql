-- =====================================================================
-- Keyfly – invitation teaser for the signed-out landing (canvas "App v2.3": Bérbeadó – meghívó)
-- Someone holding a landlord invitation link sees who invited them and which home it is about before signing in –
-- the same facts the invitation email already carries. Terms, unit details and the full email stay behind sign-in.
-- =====================================================================

create or replace function public.invitation_teaser(p_token text)
returns table (
  kind public.invitation_kind, inviter_name text, street text, house_number text, postal_code text, city text,
  expires_at timestamptz, is_open boolean, masked_email text
) language sql stable security definer set search_path = '' as $$
  with inv as (
    select i.*,
           i.accepted_at is null and i.declined_at is null and i.revoked_at is null and i.expires_at > now() as open_
    from public.invitations i
    where i.token_hash = private.token_hash(p_token)
  )
  select i.kind,
         case when show then coalesce(inviter.full_name, tenant_acc.name) end,
         case when show then concat_ws(' ', r.street_name, r.street_type) end,
         case when show then r.house_number end,
         case when show then r.postal_code end,
         case when show then r.city end,
         i.expires_at,
         i.open_ and (r.id is null or r.status = 'pending_landlord'),
         left(i.email, 1) || '•••@' || split_part(i.email, '@', 2)
  from inv i
  left join public.lease_requests r on r.id = i.lease_request_id
  left join public.accounts tenant_acc on tenant_acc.id = r.tenant_account_id
  left join public.profiles inviter on inviter.id = i.invited_by
  cross join lateral (select i.kind = 'lease_landlord' and i.open_ and r.status = 'pending_landlord' as show) s;
$$;

revoke execute on function public.invitation_teaser(text) from public;
grant execute on function public.invitation_teaser(text) to anon, authenticated;
