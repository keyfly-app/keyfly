import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { Notice, PageTitle } from "@/components/ui/form";
import { AdminSignInForm } from "@/features/staff-auth/forms";
import { safeNext } from "@/lib/safe-next";
import { siteHref } from "@/lib/site-href";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminAuth");
  return { title: t("title"), robots: { index: false } };
}

/** Staff sign-in: email + password, then the authenticator code (/mfa). Staff accounts come from invitations only. */
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const t = await getTranslations("adminAuth");
  const auth = await getTranslations("auth");
  return (
    <AuthLayout badge="ADMIN">
      <PageTitle>{t("title")}</PageTitle>
      <p className="text-[15px] text-muted">{t("text")}</p>
      {error === "link" && <Notice kind="warning">{auth("linkExpired")}</Notice>}
      <AdminSignInForm next={safeNext(next)} forgotHref={await siteHref("admin", "/forgot-password")} />
    </AuthLayout>
  );
}
