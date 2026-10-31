-- Landlords and agencies can ask to hear about the Keyfly Pro / Business workspace when they join the waitlist.
-- Consent proof, as for the newsletter: the flag plus the exact text version of the checkbox.

alter table public.waitlist
  add column pro_interest boolean not null default false,
  add column pro_interest_version text,
  add constraint waitlist_pro_interest_version check (pro_interest = false or pro_interest_version is not null),
  add constraint waitlist_pro_interest_segment check (pro_interest = false or segment in ('landlord', 'agent'));

grant insert (pro_interest, pro_interest_version) on public.waitlist to anon, authenticated;
