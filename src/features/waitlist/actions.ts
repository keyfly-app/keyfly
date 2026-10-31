"use server";

import { CONSENT_VERSIONS } from "@/config/consent";
import { isLocale } from "@/i18n/config";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { WAITLIST_SEGMENTS, WAITLIST_SOURCES, type WaitlistSource } from "./config";

type Segment = Enums<"waitlist_segment">;

/** What the visitor sent, echoed back so the form keeps its values after a validation error. */
export type WaitlistValues = { email: string; segment: Segment; marketing: boolean; privacy: boolean };

export type WaitlistState =
  | { status: "idle" }
  | { status: "ok"; already: boolean }
  | { status: "error"; error: "email" | "segment" | "privacy" | "generic"; values: WaitlistValues };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  // Honeypot: humans never see or fill this field.
  if (String(form.get("website") ?? "") !== "") return { status: "ok", already: false };

  const values: WaitlistValues = {
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    segment: String(form.get("segment") ?? "") as Segment,
    marketing: form.get("marketing") === "on",
    privacy: form.get("privacy") === "on",
  };
  const locale = isLocale(form.get("locale")) ? (form.get("locale") as Enums<"locale">) : "hu";
  const rawSource = String(form.get("source") ?? "");
  const source: WaitlistSource = (WAITLIST_SOURCES as readonly string[]).includes(rawSource)
    ? (rawSource as WaitlistSource)
    : "coming-soon-hero";

  if (!EMAIL_RE.test(values.email) || values.email.length > 254) return { status: "error", error: "email", values };
  if (!WAITLIST_SEGMENTS.includes(values.segment)) return { status: "error", error: "segment", values };
  if (!values.privacy) return { status: "error", error: "privacy", values };

  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const value = String(form.get(key) ?? "").slice(0, 100);
    if (value) utm[key] = value;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({
    email: values.email,
    segment: values.segment,
    locale,
    privacy_notice_version: CONSENT_VERSIONS.waitlistPrivacy,
    marketing_consent: values.marketing,
    marketing_consent_version: values.marketing ? CONSENT_VERSIONS.newsletter : null,
    source,
    utm: Object.keys(utm).length ? utm : null,
  });

  if (error) {
    if (error.code === "23505") return { status: "ok", already: true };
    console.error("waitlist insert failed", error.code, error.message);
    return { status: "error", error: "generic", values };
  }
  return { status: "ok", already: false };
}
