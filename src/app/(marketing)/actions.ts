"use server";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type WaitlistState =
  | { status: "idle" }
  | { status: "ok"; already: boolean }
  | { status: "error"; message: string };

const SEGMENTS: Enums<"waitlist_segment">[] = ["tenant", "landlord", "agent", "company"];

export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  // Robotcsapda: ezt a mezőt ember nem látja, így nem is tölti ki.
  if (String(form.get("website") ?? "") !== "") return { status: "ok", already: false };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const segment = String(form.get("segment") ?? "tenant") as Enums<"waitlist_segment">;
  const privacy = form.get("privacy") === "on";

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
    return { status: "error", message: "Ez nem tűnik érvényes e-mail címnek." };
  }
  if (!SEGMENTS.includes(segment)) {
    return { status: "error", message: "Válaszd ki, kinek szól a feliratkozás." };
  }
  if (!privacy) {
    return { status: "error", message: "A feliratkozáshoz fogadd el az adatkezelési tájékoztatót." };
  }

  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const v = String(form.get(key) ?? "").slice(0, 100);
    if (v) utm[key] = v;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({
    email,
    segment,
    source: "hamarosan",
    utm: Object.keys(utm).length ? utm : null,
    consent_marketing: form.get("marketing") === "on",
  });

  if (error) {
    if (error.code === "23505") return { status: "ok", already: true };
    console.error("waitlist insert failed", error.code, error.message);
    return { status: "error", message: "Valami hiba történt. Próbáld újra egy perc múlva." };
  }
  return { status: "ok", already: false };
}
