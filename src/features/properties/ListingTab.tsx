import { loadCatalog } from "@/features/catalog/load";
import { addressFromRow } from "@/lib/address";
import { createClient } from "@/lib/supabase/server";
import { displayName, groupDigits } from "./format";
import { ListingPanel } from "./ListingPanel";
import type { PropertyContext } from "./PropertyFrame";

const MAX_PHOTOS = 30;
const MAX_VIDEOS = 3;
const LINK_SECONDS = 60 * 60;

/** Server side of "Fotók és hirdetés": photos with signed links (1 hour), terms, listing text, links, parking to offer. */
export async function ListingTab({ ctx }: { ctx: PropertyContext }) {
  const { property: p, account, editable } = ctx;
  const supabase = await createClient();
  const [{ data: listing }, { data: links }, { data: media }, { data: parking }, catalog] = await Promise.all([
    supabase.from("property_listing").select("*").eq("property_id", p.id).maybeSingle(),
    supabase.from("property_links").select("id, label, url, sort, kind").eq("property_id", p.id).order("sort"),
    supabase.from("property_media").select("id, path, kind, bytes, is_cover, sort, width, height").eq("property_id", p.id).order("sort").order("created_at"),
    supabase
      .from("properties")
      .select("id, label, kind, postal_code, city, street_name, street_type, house_number, building, staircase, floor_type, floor_number, door")
      .eq("account_id", account.id)
      .in("kind", ["parking", "storage"])
      .is("archived_at", null)
      .neq("id", p.id),
    loadCatalog("pets", "smoking"),
  ]);
  const all = media ?? [];
  const { data: signed } = all.length
    ? await supabase.storage.from("property-media").createSignedUrls(
        all.map((m) => m.path),
        LINK_SECONDS,
      )
    : { data: [] };
  const urlOf = new Map((signed ?? []).filter((s) => s.path && s.signedUrl).map((s) => [s.path!, s.signedUrl]));
  const host = (url: string) => {
    try {
      const u = new URL(url);
      return `${u.hostname.replace(/^www\./, "")}${u.pathname === "/" ? "" : u.pathname}`;
    } catch {
      return url;
    }
  };
  return (
    <ListingPanel
      propertyId={p.id}
      name={displayName(p.label, addressFromRow(p))}
      editable={editable}
      photos={all
        .filter((m) => m.kind === "photo")
        .sort((a, b) => Number(b.is_cover) - Number(a.is_cover))
        .map((m) => ({ id: m.id, url: urlOf.get(m.path) ?? null, cover: m.is_cover, width: m.width, height: m.height }))}
      maxPhotos={MAX_PHOTOS}
      videos={all.filter((m) => m.kind === "video").map((m) => ({ id: m.id, url: urlOf.get(m.path) ?? null, bytes: m.bytes }))}
      maxVideos={MAX_VIDEOS}
      terms={{
        rent: groupDigits(listing?.asking_rent),
        currency: listing?.currency === "EUR" ? "EUR" : "HUF",
        depositMonths: listing?.deposit_months != null ? String(listing.deposit_months) : "",
        availableNow: listing?.available_now ?? true,
        availableFrom: listing?.available_from ?? "",
        minTerm: listing?.min_term_months != null ? String(listing.min_term_months) : "",
        pets: listing?.pets ?? "",
        smoking: listing?.smoking ?? "",
        bills: groupDigits(listing?.est_bills),
        parkingPropertyId: listing?.parking_property_id ?? "",
        parkingRent: groupDigits(listing?.parking_rent),
      }}
      pets={catalog.pets}
      smoking={catalog.smoking}
      parkingOptions={(parking ?? []).map((x) => ({ id: x.id, name: displayName(x.label, addressFromRow(x)) }))}
      ad={{ title: listing?.title ?? "", description: listing?.description ?? "" }}
      links={(links ?? []).filter((l) => l.kind === "listing").map((l) => ({ id: l.id, label: l.label, url: l.url, host: host(l.url) }))}
      videoLinks={(links ?? []).filter((l) => l.kind === "video").map((l) => ({ id: l.id, label: l.label, url: l.url, host: host(l.url) }))}
    />
  );
}
