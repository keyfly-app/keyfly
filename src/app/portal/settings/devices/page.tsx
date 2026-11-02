import { redirect } from "next/navigation";
import { siteHref } from "@/lib/site-href";

/** Eszközök moved into Bejelentkezés és biztonság (Aktív belépések); old links keep working. */
export default async function Devices() {
  redirect(await siteHref("portal", "/settings/security"));
}
