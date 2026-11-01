-- =====================================================================
-- Sign-up records the consents given on the registration form.
-- The user has no session until the email is confirmed, so the form passes
-- the accepted document versions in the sign-up metadata:
--   { "consents": { "terms": "<version>", "privacy": "<version>" } }
-- Only known kinds are recorded; anything else in the metadata is ignored.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc uuid;
  display text := left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(new.email, '@', 1), ''), 'Keyfly'), 200);
begin
  insert into public.profiles (id, email, full_name, phone, locale)
  values (
    new.id,
    new.email,
    left(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 200),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en'::public.locale else 'hu'::public.locale end
  )
  on conflict (id) do nothing;

  insert into public.accounts (kind, personal_user_id, name, created_by)
  values ('person', new.id, display, new.id)
  on conflict (personal_user_id) do nothing
  returning id into acc;

  if acc is not null then
    insert into public.account_members (account_id, user_id, role) values (acc, new.id, 'owner');
  end if;

  if jsonb_typeof(new.raw_user_meta_data -> 'consents') = 'object' then
    insert into public.consents (user_id, kind, version)
    select new.id, c.key, left(c.value, 100)
    from jsonb_each_text(new.raw_user_meta_data -> 'consents') c
    where c.key in ('terms', 'privacy') and nullif(btrim(c.value), '') is not null;
  end if;
  return new;
end;
$$;
