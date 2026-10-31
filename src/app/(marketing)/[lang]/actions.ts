"use server";

import { CONSENT_VERSIONS } from "@/config/consent";
import { isLocale } from "@/i18n/config";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type WaitlistState =
  | { status: "idle" }
  | { status: "ok"; already: boolean }
  | { status: "error"; error: "email" | "segment" | "privacy" | "generic" };

const SEGMENTS: Enums<"waitlist_segment">[] = ["tenant", "landlord", "agent", "company"];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  // Honeypot: humans never see or fill this field.
  if (String(form.get("website") ?? "") !== "") return { status: "ok", already: false };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const segment = String(form.get("segment") ?? "tenant") as Enums<"waitlist_segment">;
  const locale = isLocale(form.get("locale")) ? (form.get("locale") as Enums<"locale">) : "hu";
  const marketing = form.get("marketing") === "on";

  if (!EMAIL_RE.test(email) || email.length > 254) return { status: "error", error: "email" };
  if (!SEGMENTS.includes(segment)) return { status: "error", error: "segment" };
  if (form.get("privacy") !== "on") return { status: "error", error: "privacy" };

  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const value = String(form.get(key) ?? "").slice(0, 100);
    if (value) utm[key] = value;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({
    email,
    segment,
    locale,
    privacy_notice_version: CONSENT_VERSIONS.waitlistPrivacy,
    marketing_consent: marketing,
    marketing_consent_version: marketing ? CONSENT_VERSIONS.newsletter : null,
    source: "coming-soon",
    utm: Object.keys(utm).length ? utm : null,
  });

  if (error) {
    if (error.code === "23505") return { status: "ok", already: true };
    console.error("waitlist insert failed", error.code, error.message);
    return { status: "error", error: "generic" };
  }
  return { status: "ok", already: false };
}
