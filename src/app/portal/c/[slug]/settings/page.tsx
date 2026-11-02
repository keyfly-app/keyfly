import { redirect } from "next/navigation";
import { siteHref } from "@/lib/site-href";

/** A company's settings open on its first tab, Cégadatok. */
export default async function CompanySettingsIndex({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(await siteHref("portal", `/c/${slug}/settings/company`));
}
