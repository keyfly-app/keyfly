import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { PageTitle } from "@/components/ui/form";
import { NewPasswordForm } from "@/features/auth/SimpleForms";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("title"), robots: { index: false } };
}

/** Reached from the reset email; the proxy asks for the authenticator code before this page opens. */
export default async function ResetPassword() {
  const t = await getTranslations("auth.reset");
  return (
    <AuthLayout badge="ADMIN">
      <PageTitle>{t("title")}</PageTitle>
      <NewPasswordForm site="admin" />
    </AuthLayout>
  );
}
