import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { SIGN_UP_OPEN } from "@/config/auth";
import { PageTitle } from "@/components/ui/form";
import { SignUpForm } from "@/features/auth/SignUpForm";
import { isLocale, publicHref } from "@/i18n/config";
import { safeNext } from "@/lib/safe-next";
import { requestOrigin } from "@/lib/request-origin";
import { siteHref } from "@/lib/site-href";
import { marketingOrigin } from "@/lib/sites";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("title") };
}

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const t = await getTranslations("auth");
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const { origin, host } = await requestOrigin();
  const privacyHref = marketingOrigin(host, origin.split(":")[0]) + publicHref("privacy", locale);
  const loginHref = await siteHref("portal", next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
  if (!SIGN_UP_OPEN) redirect(loginHref);

  return (
    <AuthLayout back={{ href: loginHref, label: t("register.back") }}>
      <PageTitle>{t("register.title")}</PageTitle>
      <SignUpForm next={next} privacyHref={privacyHref} />
    </AuthLayout>
  );
}
