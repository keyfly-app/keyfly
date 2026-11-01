import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { Icon } from "@/components/Icon";
import { Notice, PageTitle, StepProgress } from "@/components/ui/form";
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
      <StepProgress step={1} total={2} label={t("step1")} />
      <PageTitle sub={t("text")}>{t("title")}</PageTitle>
      {error === "link" && <Notice kind="warning">{auth("linkExpired")}</Notice>}
      <AdminSignInForm next={safeNext(next)} forgotHref={await siteHref("admin", "/forgot-password")} />
      <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
        <Icon name="shield" size={14} />
        {t("audit")}
      </p>
    </AuthLayout>
  );
}
