import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { PageTitle } from "@/components/ui/form";
import { NewPasswordForm } from "@/features/auth/SimpleForms";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("title") };
}

/** Reached from the password-reset email (which signs the user in); the proxy keeps signed-out visitors away. */
export default async function ResetPassword() {
  const t = await getTranslations("auth.reset");
  return (
    <AuthLayout>
      <PageTitle>{t("title")}</PageTitle>
      <NewPasswordForm />
    </AuthLayout>
  );
}
