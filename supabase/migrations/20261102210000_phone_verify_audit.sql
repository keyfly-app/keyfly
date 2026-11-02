-- Phone check through Twilio Verify, and less bank data in the audit log (approved 2026-11-02).
--  1. Twilio Verify makes, sends and checks the 6-digit code; Keyfly no longer stores the code. We keep only the number
--     being confirmed (10 minutes) and the send log for our own limits (3 an hour, 10 a day). The confirmed number is
--     written by the server (service role) after Twilio approved the code – a person cannot set it directly.
--  2. Audit log: bank account changes keep only the last four characters of the account number and no holder name,
--     because the log cannot be erased (data minimisation).

-- ---------- 1. Phone check -------------------------------------------------------------

drop function public.confirm_phone_code(text);
drop function public.start_phone_check(text, text);
delete from public.phone_verifications;
alter table public.phone_verifications drop column code_hash, drop column attempts;
comment on table public.phone_verifications is
  'The number being confirmed with a Twilio Verify code, 10 minutes; removed when confirmed or by the daily clean-up.';

-- Before the server asks Twilio to text a code: checks the limits and remembers the number. Returns codes left today.
create or replace function public.start_phone_check(p_phone text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  sent_hour int;
  sent_day int;
begin
  if me is null or not exists (select 1 from auth.users where id = me and email_confirmed_at is not null) then
    raise exception 'email_not_confirmed' using errcode = '42501';
  end if;
  if p_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'invalid' using errcode = '22023';
  end if;
  select count(*) filter (where at > now() - interval '1 hour'), count(*) filter (where at > now() - interval '1 day')
    into sent_hour, sent_day from public.sms_sends where user_id = me;
  if sent_hour >= 3 or sent_day >= 10 then
    raise exception 'too_many_codes' using errcode = '54000';
  end if;
  insert into public.phone_verifications (user_id, phone, expires_at)
  values (me, p_phone, now() + interval '10 minutes')
  on conflict (user_id) do update set phone = excluded.phone, expires_at = excluded.expires_at;
  insert into public.sms_sends (user_id) values (me);
  return 9 - sent_day;
end;
$$;

-- The number a code was last sent to, while it is valid (the server checks the code against it).
create or replace function public.pending_phone()
returns text language sql stable security definer set search_path = '' as $$
  select phone from public.phone_verifications where user_id = (select auth.uid()) and expires_at > now();
$$;

-- Server only, after Twilio approved the code: the number becomes the profile's confirmed phone.
create or replace function public.set_confirmed_phone(p_user uuid, p_phone text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  delete from public.phone_verifications where user_id = p_user and phone = p_phone and expires_at > now();
  if not found then
    return false;
  end if;
  update public.profiles set phone = p_phone, phone_verified_at = now() where id = p_user;
  return true;
end;
$$;

revoke execute on function public.start_phone_check(text), public.pending_phone(), public.set_confirmed_phone(uuid, text) from public, anon;
grant execute on function public.start_phone_check(text), public.pending_phone() to authenticated;
revoke execute on function public.set_confirmed_phone(uuid, text) from authenticated;
grant execute on function public.set_confirmed_phone(uuid, text) to service_role;

-- ---------- 2. Audit log: bank accounts --------------------------------------------------

create or replace function audit.record()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  r jsonb;
  key text := '';
  col text;
  diff jsonb;
  -- Secrets and income data are never copied into the append-only log (it cannot be erased).
  hidden text[] := array['token_hash', 'updated_at', 'declared_net_income', 'verified_income', 'summary', 'birth_date', 'provider_ref', 'holder_name'];
begin
  -- Bank accounts: only the last four characters of the account number.
  if tg_table_name = 'bank_accounts' then
    o := case when o is not null then o || jsonb_build_object('iban', '…' || right(o ->> 'iban', 4)) end;
    n := case when n is not null then n || jsonb_build_object('iban', '…' || right(n ->> 'iban', 4)) end;
  end if;
  r := coalesce(n, o);
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

-- Entries written before this change (staging only): the same masking, once.
alter table audit.events disable trigger events_append_only;
update audit.events
   set changes = (
     select jsonb_object_agg(k, case
       when k = 'iban' and jsonb_typeof(v) = 'string' then to_jsonb('…' || right(v #>> '{}', 4))
       when k = 'iban' and jsonb_typeof(v) = 'array' then jsonb_build_array('…' || right(v ->> 0, 4), '…' || right(v ->> 1, 4))
       else v end)
     from jsonb_each(changes - 'holder_name') as e(k, v))
 where table_name = 'bank_accounts' and changes is not null;
alter table audit.events enable trigger events_append_only;
