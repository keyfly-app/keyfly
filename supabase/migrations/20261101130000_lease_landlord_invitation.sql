-- =====================================================================
-- A tenant can invite the landlord (see the next migration).
-- A new enum value must be committed before it can be used, hence its own migration.
-- =====================================================================

alter type public.invitation_kind add value if not exists 'lease_landlord';
