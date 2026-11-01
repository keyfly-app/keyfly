-- =====================================================================
-- Covering indexes for foreign keys (Supabase advisor 0001).
-- Keeps deletes on the referenced rows (profiles, invitations, properties) cheap.
-- =====================================================================

drop index public.account_member_properties_property_idx;
create index account_member_properties_property_idx on public.account_member_properties (property_id, account_id);
create index invitation_properties_invitation_idx on public.invitation_properties (invitation_id, account_id);
create index invitation_properties_property_idx on public.invitation_properties (property_id, account_id);

create index account_members_invited_by_idx on public.account_members (invited_by);
create index accounts_created_by_idx on public.accounts (created_by);
create index claims_submitted_by_idx on public.claims (submitted_by);
create index invitations_accepted_by_idx on public.invitations (accepted_by);
create index invitations_invited_by_idx on public.invitations (invited_by);
create index lease_occupants_added_by_idx on public.lease_occupants (added_by);
create index leases_created_by_idx on public.leases (created_by);
create index properties_created_by_idx on public.properties (created_by);
create index staff_invited_by_idx on public.staff (invited_by);
create index staff_invitations_invited_by_idx on public.staff_invitations (invited_by);
