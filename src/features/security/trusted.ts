import "server-only";
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { describeDevice } from "@/features/settings/user-agent";
import type { createClient } from "@/lib/supabase/server";
import { parseTrusted, sha256Hex, TRUSTED_COOKIE, TRUSTED_DAYS } from "@/lib/trusted-device";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Marks this browser after a correct code: a random token in an httpOnly cookie, its hash in the database. */
export async function trustThisDevice(supabase: Client) {
  const token = randomBytes(32).toString("base64url");
  const device = describeDevice((await headers()).get("user-agent"));
  const label = device ? [device.browser, device.os].filter(Boolean).join(" · ") : "–";
  const { data: id, error } = await supabase.rpc("trust_device", { p_token_hash: await sha256Hex(token), p_label: label });
  if (error || !id) return console.error("trust device failed", error?.code);
  (await cookies()).set(TRUSTED_COOKIE, `${id}.${token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TRUSTED_DAYS * 24 * 60 * 60,
  });
}

/** Every trusted device asks for the code again (two-step off, password changed). */
export async function forgetTrustedDevices(supabase: Client) {
  const { data: auth } = await supabase.auth.getClaims();
  if (auth?.claims) await supabase.from("trusted_devices").delete().eq("user_id", String(auth.claims.sub));
  (await cookies()).delete(TRUSTED_COOKIE);
}

/** The trusted device this browser is, if any (its row id from the cookie). */
export async function currentTrustedId(): Promise<string | null> {
  return parseTrusted((await cookies()).get(TRUSTED_COOKIE)?.value)?.id ?? null;
}
