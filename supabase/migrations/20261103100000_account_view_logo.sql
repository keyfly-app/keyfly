-- =====================================================================
-- Keyfly – v2.5 (canvas "App v2.3", boards "v2.5 · Nézet a cégben", "v2.5 · Céglogó")
--  1. the View (as tenant / as landlord) in every account, remembered per person per account
--  2. a company logo instead of the monogram (private 'company-logos' bucket, one folder per company)
-- =====================================================================

-- ---------- 1. view per account ----------------------------------------------

alter table public.account_members
  add column view public.start_view,
  add constraint account_members_view_tenant_or_landlord check (view is null or view in ('tenant', 'landlord'));
comment on column public.account_members.view is
  'Last View this member picked in this account (Bérlőként / Bérbeadóként). Null: landlord for a company. The personal account keeps profiles.start_view.';

-- Members change only their own View; the role and scope stay with owners and admins.
create or replace function public.set_account_view(p_account_id uuid, p_view public.start_view)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_view not in ('tenant', 'landlord') then
    raise exception 'invalid_view' using errcode = '22023';
  end if;
  update public.account_members set view = p_view
   where account_id = p_account_id and user_id = (select auth.uid());
  if not found then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.set_account_view(uuid, public.start_view) from public, anon;
grant execute on function public.set_account_view(uuid, public.start_view) to authenticated;

-- ---------- 2. company logo --------------------------------------------------

alter table public.accounts
  add column logo_path text,
  add constraint accounts_logo_in_own_folder
    check (logo_path is null or (kind = 'company' and logo_path ~ ('^' || id::text || '/[A-Za-z0-9_-]{8,64}\.(webp|png|jpg)$')));
comment on column public.accounts.logo_path is
  'company-logos bucket: <account uuid>/<random>.webp|.png|.jpg – 512 × 512, fitted in the browser; replaces the monogram.';

grant update (logo_path) on public.accounts to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-logos', 'company-logos', false, 1048576, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- The folder name as an account id; null when it is not one (so a malformed name never matches).
create or replace function private.storage_account(name text)
returns uuid language sql immutable set search_path = '' as $$
  select case when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then (storage.foldername(name))[1]::uuid end;
$$;

-- Every member sees the logo (signed links); owners and admins upload and remove it.
create policy "company_logos_select_member" on storage.objects for select to authenticated
  using (bucket_id = 'company-logos' and (private.is_account_member(private.storage_account(name)) or private.is_staff()));
create policy "company_logos_insert_owner_admin" on storage.objects for insert to authenticated
  with check (bucket_id = 'company-logos' and private.has_account_role(private.storage_account(name), array['owner', 'admin']::public.account_role[]));
create policy "company_logos_delete_owner_admin" on storage.objects for delete to authenticated
  using (bucket_id = 'company-logos' and private.has_account_role(private.storage_account(name), array['owner', 'admin']::public.account_role[]));
