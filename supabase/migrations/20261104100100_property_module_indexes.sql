-- Covering indexes for the created_by foreign keys of the property module (advisor: unindexed_foreign_keys).
create index account_extras_created_by_idx on public.account_extras (created_by) where created_by is not null;
create index contacts_created_by_idx on public.contacts (created_by) where created_by is not null;
create index import_batches_created_by_idx on public.import_batches (created_by) where created_by is not null;
create index property_media_created_by_idx on public.property_media (created_by) where created_by is not null;
create index property_services_created_by_idx on public.property_services (created_by) where created_by is not null;
