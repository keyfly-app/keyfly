-- The newsletter provider (Resend) is the source of truth for subscription state;
-- the website only records consent. The contact id was never written, so drop it.
alter table public.waitlist drop column email_provider_contact_id;
