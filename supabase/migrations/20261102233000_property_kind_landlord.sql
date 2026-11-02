-- Property type on the landlord's side (canvas: Bérbeadó – meghívó, Bérbeadó 1–2, approved 2026-11-02): the signed-out
-- invitation teaser and the signed-in preview also return what is rented ("Lakás · 1138 Budapest, …").
-- Return types change, so the functions are dropped and created again with the same rights.

drop function public.invitation_teaser(text);
drop function public.lease_request_preview(text);

create or replace function public.invitation_teaser(p_token text)
returns table (
  kind public.invitation_kind, inviter_name text, street text, house_number text, postal_code text, city text,
  expires_at timestamptz, is_open boolean, masked_email text, property_kind public.property_kind
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
         left(i.email, 1) || '•••@' || split_part(i.email, '@', 2),
         case when show then r.property_kind end
  from inv i
  left join public.lease_requests r on r.id = i.lease_request_id
  left join public.accounts tenant_acc on tenant_acc.id = r.tenant_account_id
  left join public.profiles inviter on inviter.id = i.invited_by
  cross join lateral (select i.kind = 'lease_landlord' and i.open_ and r.status = 'pending_landlord' as show) s;
$$;

create or replace function public.lease_request_preview(p_token text)
returns table (
  request_id uuid, tenant_name text, postal_code text, city text, street_name text, street_type text, house_number text,
  building text, staircase text, floor_type public.floor_type, floor_number smallint, door text,
  start_date date, end_date date, monthly_rent integer, deposit_amount integer, expires_at timestamptz,
  property_kind public.property_kind
) language sql stable security definer set search_path = '' as $$
  select r.id, coalesce(tenant.full_name, tenant_acc.name), r.postal_code, r.city, r.street_name, r.street_type, r.house_number,
         r.building, r.staircase, r.floor_type, r.floor_number, r.door,
         r.start_date, r.end_date, r.monthly_rent, r.deposit_amount, i.expires_at, r.property_kind
  from public.invitations i
  join public.lease_requests r on r.id = i.lease_request_id
  join public.accounts tenant_acc on tenant_acc.id = r.tenant_account_id
  left join public.profiles tenant on tenant.id = i.invited_by
  where i.token_hash = private.token_hash(p_token) and i.kind = 'lease_landlord'
    and (select auth.uid()) is not null and i.email = private.my_email()
    and i.accepted_at is null and i.declined_at is null and i.revoked_at is null and i.expires_at > now()
    and r.status = 'pending_landlord';
$$;

revoke execute on function public.invitation_teaser(text) from public;
grant execute on function public.invitation_teaser(text) to anon, authenticated;
revoke execute on function public.lease_request_preview(text) from public, anon;
grant execute on function public.lease_request_preview(text) to authenticated;
