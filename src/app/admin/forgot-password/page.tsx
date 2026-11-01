import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { PageTitle } from "@/components/ui/form";
import { ForgotPasswordForm } from "@/features/auth/SimpleForms";
import { siteHref } from "@/lib/site-href";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot");
  return { title: t("title"), robots: { index: false } };
}

/** The emailed link lands on admin; setting the new password still needs the authenticator code first. */
export default async function ForgotPassword() {
  const t = await getTranslations("auth");
  return (
    <AuthLayout back={{ href: await siteHref("admin", "/login"), label: t("register.back") }}>
      <PageTitle>{t("forgot.title")}</PageTitle>
      <p className="text-[15px] text-muted">{t("forgot.text")}</p>
      <ForgotPasswordForm site="admin" />
    </AuthLayout>
  );
}
