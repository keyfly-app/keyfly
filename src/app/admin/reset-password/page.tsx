import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { ButtonLink, Notice, PageTitle } from "@/components/ui/form";
import { NewPasswordForm } from "@/features/auth/SimpleForms";
import { hasResetPass } from "@/lib/reset-pass";
import { siteHref } from "@/lib/site-href";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("title"), robots: { index: false } };
}

/** Reached from the reset email; the proxy asks for the authenticator code before this page opens. */
export default async function ResetPassword() {
  const [t, auth] = await Promise.all([getTranslations("auth.reset"), getTranslations("auth")]);
  // Only right after a verified reset link in this browser (see src/lib/reset-pass.ts).
  if (!(await hasResetPass())) {
    return (
      <AuthLayout badge="ADMIN">
        <PageTitle>{t("title")}</PageTitle>
        <Notice kind="warning">{auth("linkExpired")}</Notice>
        <ButtonLink href={await siteHref("admin", "/forgot-password")}>{t("again")}</ButtonLink>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout badge="ADMIN">
      <PageTitle>{t("title")}</PageTitle>
      <NewPasswordForm site="admin" />
    </AuthLayout>
  );
}
