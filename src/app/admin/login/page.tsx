import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { Notice, PageTitle } from "@/components/ui/form";
import { EmailLinkForm } from "@/features/auth/SimpleForms";
import { safeNext } from "@/lib/safe-next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("adminTitle") };
}

/** Staff sign in with a one-time email link; staff accounts are created by invitation only. */
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthLayout badge="ADMIN">
      <PageTitle>{t("adminTitle")}</PageTitle>
      <p className="text-[15px] text-muted">{t("adminText")}</p>
      {error === "link" && <Notice kind="warning">{t("linkExpired")}</Notice>}
      <EmailLinkForm site="admin" next={safeNext(next)} />
    </AuthLayout>
  );
}
