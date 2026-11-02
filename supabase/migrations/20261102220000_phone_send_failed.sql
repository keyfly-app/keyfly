-- An SMS that Twilio did not send (wrong number, blocked country, Twilio unreachable) no longer counts towards the
-- 3-an-hour / 10-a-day limit: the server takes back the send it just logged, and the pending number with it.
create or replace function public.undo_phone_check()
returns void language sql security definer set search_path = '' as $$
  delete from public.sms_sends
   where ctid = (select ctid from public.sms_sends where user_id = (select auth.uid()) and at > now() - interval '2 minutes' order by at desc limit 1);
  delete from public.phone_verifications where user_id = (select auth.uid());
$$;
revoke execute on function public.undo_phone_check() from public, anon;
grant execute on function public.undo_phone_check() to authenticated;
