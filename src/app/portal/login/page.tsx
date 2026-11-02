import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { Notice, PageTitle } from "@/components/ui/form";
import { SIGN_UP_OPEN } from "@/config/auth";
import { SignInForm } from "@/features/auth/SignInForm";
import { safeNext } from "@/lib/safe-next";
import { siteHref } from "@/lib/site-href";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn");
  return { title: t("title") };
}

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next: rawNext } = await searchParams;
  const next = safeNext(rawNext);
  const t = await getTranslations("auth");
  const withNext = (path: string) => (next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`);
  const [registerHref, forgotHref] = await Promise.all([siteHref("portal", withNext("/register")), siteHref("portal", "/forgot-password")]);

  return (
    <AuthLayout>
      <PageTitle sub={t("signIn.sub")}>{t("signIn.title")}</PageTitle>
      {error === "link" && <Notice kind="warning">{t("linkExpired")}</Notice>}
      {error === "google" && <Notice kind="error">{t("google.failed")}</Notice>}
      {error === "googleNoAccount" && <Notice kind="warning">{t("google.noAccount")}</Notice>}
      <SignInForm next={next} forgotHref={forgotHref} />
      {SIGN_UP_OPEN && (
        <p className="border-t border-line pt-5 text-center text-[13px] text-muted">
        {t.rich("signIn.noAccount", {
          link: (chunks) => (
            <Link href={registerHref} className="font-medium text-brand underline-offset-3 hover:underline">
              {chunks}
            </Link>
          ),
        })}
        </p>
      )}
    </AuthLayout>
  );
}
