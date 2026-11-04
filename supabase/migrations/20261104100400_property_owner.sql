-- Owner of a property in one transaction ("Tulajdon és kezelés" → "Más tulajdona").
-- A new owner contact, the management row and the owner's place among the property's contacts are written together,
-- so a refused save never leaves a stray contact behind. When the owner changes, the previous owner contact is taken
-- off the property's contacts (it stays in the account's list).
-- p_new_contact: {"name", "phone", "email"} – already checked and cleaned by the app.
create or replace function public.save_property_owner(
  p_property_id uuid, p_kind text, p_contact_id uuid default null, p_new_contact jsonb default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  acc uuid;
  previous uuid;
  owner uuid := null;
begin
  if not private.can_manage_property(p_property_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_kind is not null and p_kind not in ('self', 'account', 'other') then
    raise exception 'invalid_owner_kind' using errcode = '22023';
  end if;
  select p.account_id into acc from public.properties p where p.id = p_property_id;
  select m.owner_contact_id into previous from public.property_management m where m.property_id = p_property_id;

  if p_kind = 'other' then
    if p_contact_id is not null then
      select c.id into owner from public.contacts c where c.id = p_contact_id and c.account_id = acc and c.archived_at is null;
      if owner is null then
        raise exception 'contact_not_in_account' using errcode = '42501';
      end if;
    elsif nullif(btrim(p_new_contact ->> 'name'), '') is not null then
      insert into public.contacts (account_id, name, phone, email, default_role_key, created_by)
      values (acc, btrim(p_new_contact ->> 'name'), nullif(btrim(p_new_contact ->> 'phone'), ''),
              nullif(lower(btrim(p_new_contact ->> 'email')), ''), 'owner', (select auth.uid()))
      returning id into owner;
    else
      raise exception 'owner_contact_required' using errcode = '22023';
    end if;
  end if;

  insert into public.property_management (property_id, owner_kind, owner_contact_id)
  values (p_property_id, p_kind, owner)
  on conflict (property_id) do update set owner_kind = excluded.owner_kind, owner_contact_id = excluded.owner_contact_id;

  if previous is not null and previous is distinct from owner then
    delete from public.property_contacts pc where pc.property_id = p_property_id and pc.contact_id = previous and pc.role_key = 'owner';
  end if;
  if owner is not null then
    insert into public.property_contacts (property_id, contact_id, role_key) values (p_property_id, owner, 'owner') on conflict do nothing;
  end if;
  return owner;
end $$;

revoke execute on function public.save_property_owner(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.save_property_owner(uuid, text, uuid, jsonb) to authenticated;
