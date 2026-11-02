import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { PageTitle } from "@/components/ui/form";
import { hasAcceptedTerms } from "@/features/auth/google";
import { GoogleSignUpForm } from "@/features/auth/GoogleSignUpForm";
import { isLocale, publicHref } from "@/i18n/config";
import { requestOrigin } from "@/lib/request-origin";
import { safeNext } from "@/lib/safe-next";
import { siteHref } from "@/lib/site-href";
import { marketingOrigin } from "@/lib/sites";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.google");
  return { title: t("title"), robots: { index: false } };
}

/** After the first sign-in with Google (canvas v2.4 "Regisztráció Google-lel – még egy lépés"): the name and the terms. */
export default async function GoogleSignUp({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await siteHref("portal", "/login"));
  if ((user.identities ?? []).some((i) => i.provider === "email") || (await hasAcceptedTerms(supabase, user.id))) redirect(await siteHref("portal", next));

  const [t, raw, { data: profile }, { origin, host }] = await Promise.all([
    getTranslations("auth.google"),
    getLocale(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    requestOrigin(),
  ]);
  const locale = isLocale(raw) ? raw : "hu";
  const google = user.identities?.find((i) => i.provider === "google")?.identity_data ?? {};
  const googleName = typeof google.full_name === "string" ? google.full_name : typeof google.name === "string" ? google.name : null;
  return (
    <AuthLayout>
      <PageTitle sub={t("lead")}>{t("title")}</PageTitle>
      <GoogleSignUpForm
        next={next}
        googleName={googleName}
        googleEmail={user.email ?? ""}
        defaultName={profile?.full_name ?? googleName ?? ""}
        privacyHref={marketingOrigin(host, origin.split(":")[0]) + publicHref("privacy", locale)}
      />
    </AuthLayout>
  );
}
