import "server-only";
import type { Locale } from "@/i18n/config";
import { STREET_TYPES } from "@/lib/address";

/**
 * Google Places API (New), called from our server only: the browser never talks to Google,
 * so Google receives the typed text alone – no IP address, no cookies (privacy notice 4.4).
 */
const BASE = "https://places.googleapis.com/v1";
const TIMEOUT_MS = 4000;

export type Suggestion = { placeId: string; main: string; secondary: string };
export type FoundAddress = { postalCode: string; city: string; streetName: string; streetType: string; houseNumber: string; district: string };

function apiKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY || null;
}

/** Up to five Hungarian address suggestions for the typed text. Null: search unavailable. */
export async function autocomplete(input: string, sessionToken: string, locale: Locale): Promise<Suggestion[] | null> {
  const key = apiKey();
  if (!key) return null;
  try {
    const response = await fetch(`${BASE}/places:autocomplete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat",
      },
      body: JSON.stringify({
        input,
        sessionToken,
        languageCode: locale,
        includedRegionCodes: ["hu"],
        includedPrimaryTypes: ["street_address", "premise", "subpremise", "route"],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("places autocomplete failed", response.status);
      return null;
    }
    const data = (await response.json()) as {
      suggestions?: { placePrediction?: { placeId: string; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }[];
    };
    return (data.suggestions ?? [])
      .flatMap((s) => (s.placePrediction ? [s.placePrediction] : []))
      .slice(0, 5)
      .map((p) => ({
        placeId: p.placeId,
        main: p.structuredFormat?.mainText?.text ?? "",
        // "Budapest, Magyarország" → "Budapest": the country is always Hungary here.
        secondary: (p.structuredFormat?.secondaryText?.text ?? "").replace(/,\s*(Magyarország|Hungary)$/, ""),
      }));
  } catch (error) {
    console.error("places autocomplete failed", error instanceof Error ? error.name : "unknown");
    return null;
  }
}

type Component = { longText: string; shortText?: string; types: string[] };

/** "Dózsa György út" → ["Dózsa György", "út"]; a name without a known type keeps the whole text. */
export function splitRoute(route: string): { streetName: string; streetType: string } {
  const words = route.trim().split(/\s+/);
  const last = words.at(-1)?.toLowerCase() ?? "";
  if (words.length > 1 && (STREET_TYPES as readonly string[]).includes(last)) {
    return { streetName: words.slice(0, -1).join(" "), streetType: last };
  }
  return { streetName: route.trim(), streetType: "" };
}

/** The address parts of the picked suggestion. Ends the billing session. Null: unavailable. */
export async function placeAddress(placeId: string, sessionToken: string): Promise<FoundAddress | null> {
  const key = apiKey();
  if (!key) return null;
  try {
    const url = `${BASE}/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}&languageCode=hu`;
    const response = await fetch(url, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "addressComponents" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("places details failed", response.status);
      return null;
    }
    const data = (await response.json()) as { addressComponents?: Component[] };
    const parts = data.addressComponents ?? [];
    const get = (type: string) => parts.find((c) => c.types.includes(type))?.longText ?? "";
    const { streetName, streetType } = splitRoute(get("route"));
    return {
      postalCode: get("postal_code"),
      city: get("locality") || get("postal_town") || get("administrative_area_level_2"),
      streetName,
      streetType,
      houseNumber: get("street_number"),
      district: get("sublocality_level_1"),
    };
  } catch (error) {
    console.error("places details failed", error instanceof Error ? error.name : "unknown");
    return null;
  }
}
