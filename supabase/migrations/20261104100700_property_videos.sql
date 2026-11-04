-- Videos for a property ("Fotók és videók"): uploaded straight from the browser into the private property-media bucket
-- (MP4, MOV, WEBM, up to 50 MB, at most 3 per property) or added as a link (YouTube, Vimeo, a virtual tour …).
-- Photos stay as they were: resized in the browser, at most 30, one of them the cover.

alter table public.property_media
  add column kind  text not null default 'photo' check (kind in ('photo', 'video')),
  add column bytes bigint check (bytes > 0 and bytes <= 52428800),
  add constraint property_media_cover_is_photo check (not is_cover or kind = 'photo');
comment on table public.property_media is 'Photos and videos of a property in the private property-media bucket (<account>/<property>/<file>).';

alter table public.property_links
  add column kind text not null default 'listing' check (kind in ('listing', 'video'));
comment on table public.property_links is 'Links of a property: listings (ingatlan.com, Jófogás …) and videos (YouTube, Vimeo, a virtual tour).';

update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/quicktime', 'video/webm']
 where id = 'property-media';

-- At most 30 photos and 3 videos per property, whoever inserts them.
create or replace function private.check_media_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.properties p where p.id = new.property_id for update;
  if (select count(*) from public.property_media m where m.property_id = new.property_id and m.kind = new.kind)
     >= (case new.kind when 'video' then 3 else 30 end) then
    raise exception 'media_limit' using errcode = '23514';
  end if;
  return new;
end $$;
revoke execute on function private.check_media_limit() from public, anon, authenticated;
create trigger property_media_limit before insert on public.property_media for each row execute function private.check_media_limit();
