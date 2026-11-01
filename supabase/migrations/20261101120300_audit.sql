-- =====================================================================
-- Audit log: append-only, field-level. Who, when, which row, old → new.
-- Lives in its own schema (not exposed by the Data API); read through
-- public.activity_log(). Replaces public.audit_log.
-- =====================================================================

create schema if not exists audit;
revoke all on schema audit from public, anon, authenticated;

create table audit.events (
  id             bigint generated always as identity primary key,
  occurred_at    timestamptz not null default now(),
  actor_id       uuid,
  actor_is_staff boolean not null default false,
  action         text not null check (action in ('insert', 'update', 'delete')),
  table_name     text not null,
  row_key        text not null,
  account_id     uuid,
  changes        jsonb
);
comment on table audit.events is 'Append-only. changes: {column: [old, new]} on update, the row on insert/delete. Secrets are never recorded.';
create index events_row_idx on audit.events (table_name, row_key);
create index events_account_idx on audit.events (account_id, occurred_at desc);

-- Nobody edits history, not even the owner role used by migrations at runtime.
create or replace function audit.forbid_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'audit_log_is_append_only' using errcode = '42501';
end;
$$;
create trigger events_append_only before update or delete on audit.events
  for each row execute function audit.forbid_change();
create trigger events_no_truncate before truncate on audit.events
  for each statement execute function audit.forbid_change();

-- TG_ARGV: the primary-key columns of the audited table.
create or replace function audit.record()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  r jsonb := coalesce(n, o);
  key text := '';
  col text;
  diff jsonb;
  -- Secrets and income data are never copied into the append-only log (it cannot be erased).
  hidden text[] := array['token_hash', 'updated_at', 'declared_net_income', 'verified_income', 'summary', 'birth_date', 'provider_ref'];
begin
  foreach col in array tg_argv loop
    key := key || case when key = '' then '' else '/' end || coalesce(r ->> col, '');
  end loop;

  if tg_op = 'UPDATE' then
    select jsonb_object_agg(k, jsonb_build_array(o -> k, n -> k)) into diff
    from jsonb_object_keys(n) k
    where (o -> k) is distinct from (n -> k) and k <> all (hidden);
    if diff is null then
      return new;
    end if;
  else
    diff := r - hidden;
  end if;

  insert into audit.events (actor_id, actor_is_staff, action, table_name, row_key, account_id, changes)
  values (auth.uid(), private.is_staff(), lower(tg_op), tg_table_name, key,
          case when tg_table_name = 'accounts' then (r ->> 'id')::uuid else (r ->> 'account_id')::uuid end,
          diff);
  return coalesce(new, old);
end;
$$;

-- Replace the old status-only log.
drop trigger applications_audit on public.applications;
drop trigger policies_audit on public.policies;
drop trigger claims_audit on public.claims;
drop table public.audit_log;
drop function public.log_change();

do $$
declare
  t record;
begin
  for t in select * from (values
    ('accounts', 'id'), ('account_members', 'account_id,user_id'), ('account_member_properties', 'account_id,user_id,property_id'),
    ('properties', 'id'), ('leases', 'id'), ('lease_occupants', 'lease_id,user_id'), ('invitations', 'id'),
    ('staff', 'user_id'), ('staff_invitations', 'id'), ('applications', 'id'), ('verifications', 'id'),
    ('policies', 'id'), ('claims', 'id'), ('consents', 'id')
  ) v (tbl, pk) loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function audit.record(%s)',
      t.tbl || '_audit', t.tbl, (select string_agg(quote_literal(c), ', ') from unnest(string_to_array(t.pk, ',')) c)
    );
  end loop;
end $$;

-- Staff (admin, superadmin) read everything; Business owners and admins read their account.
create or replace function public.activity_log(p_account_id uuid default null, p_limit int default 100)
returns table (
  id bigint, occurred_at timestamptz, actor_id uuid, actor_is_staff boolean, action text,
  table_name text, row_key text, account_id uuid, changes jsonb
) language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if p_account_id is null then
    if not private.has_staff_role(array['superadmin', 'admin']::public.staff_role[]) then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
    return query select e.* from audit.events e order by e.id desc limit least(p_limit, 500);
    return;
  end if;
  if not (private.has_staff_role(array['superadmin', 'admin']::public.staff_role[])
          or (private.has_account_role(p_account_id, array['owner', 'admin']::public.account_role[])
              and (select a.plan from public.accounts a where a.id = p_account_id) = 'business')) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query select e.* from audit.events e where e.account_id = p_account_id order by e.id desc limit least(p_limit, 500);
end;
$$;

revoke execute on function public.activity_log(uuid, int) from public, anon;
grant execute on function public.activity_log(uuid, int) to authenticated;
revoke execute on function audit.record(), audit.forbid_change() from public, anon, authenticated;
