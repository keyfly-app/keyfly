"use server";

import { getLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { autocomplete, placeAddress, type FoundAddress, type Suggestion } from "./places";

const TOKEN_RE = /^[0-9a-f-]{36}$/;
const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,300}$/;

export type SuggestResult = { status: "ok"; suggestions: Suggestion[] } | { status: "unavailable" };
export type AddressResult = { status: "ok"; address: FoundAddress } | { status: "unavailable" };

/** Signed-in users only: the search is part of the app, not a public proxy to Google. */
async function signedIn(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return Boolean(data?.claims);
}

export async function suggestAddresses(input: string, sessionToken: string, region = "HU"): Promise<SuggestResult> {
  const text = input.trim().slice(0, 120);
  if (text.length < 3 || !TOKEN_RE.test(sessionToken) || !/^[A-Z]{2}$/.test(region)) return { status: "ok", suggestions: [] };
  if (!(await signedIn())) return { status: "unavailable" };
  const raw = await getLocale();
  const suggestions = await autocomplete(text, sessionToken, isLocale(raw) ? raw : "hu", region);
  return suggestions ? { status: "ok", suggestions } : { status: "unavailable" };
}

export async function pickAddress(placeId: string, sessionToken: string): Promise<AddressResult> {
  if (!PLACE_ID_RE.test(placeId) || !TOKEN_RE.test(sessionToken) || !(await signedIn())) return { status: "unavailable" };
  const address = await placeAddress(placeId, sessionToken);
  return address ? { status: "ok", address } : { status: "unavailable" };
}
