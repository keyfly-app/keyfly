import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { Notice, PageTitle } from "@/components/ui/form";
import { signOut } from "@/features/auth/actions";
import { SetupKey, TotpForm } from "@/features/staff-auth/forms";
import { safeNext } from "@/lib/safe-next";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminAuth.challenge");
  return { title: t("title"), robots: { index: false } };
}

/**
 * Admin sign-in, step 2. With a verified authenticator: ask for its code.
 * Without one (first sign-in, or after a super admin reset): set one up – staff only.
 */
export default async function Mfa({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect(await siteHref("admin", "/login"));
  if (auth.claims.aal === "aal2") redirect(await siteHref("admin", next));

  const t = await getTranslations("adminAuth");
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = factors?.totp[0];
  if (verified) {
    return (
      <AuthLayout badge="ADMIN">
        <PageTitle>{t("challenge.title")}</PageTitle>
        <p className="text-[15px] text-muted">{t("challenge.text")}</p>
        <TotpForm factorId={verified.id} next={next} mode="challenge" />
      </AuthLayout>
    );
  }

  // Own staff row is readable without the second factor; only active staff may set one up here.
  const { data: me } = await supabase.from("staff").select("disabled_at").eq("user_id", auth.claims.sub).maybeSingle();
  if (!me || me.disabled_at) return <NoAccess />;

  // A setup that was started but never confirmed is replaced, so a reload always shows a working QR code.
  for (const factor of factors?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data: enrolled, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Keyfly admin", issuer: "Keyfly" });
  if (error || !enrolled) {
    console.error("mfa enroll failed", error?.code);
    return (
      <AuthLayout badge="ADMIN">
        <PageTitle>{t("setup.title")}</PageTitle>
        <Notice kind="error">{t("errors.generic")}</Notice>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout badge="ADMIN">
      <PageTitle eyebrow={t("setup.eyebrow")}>{t("setup.title")}</PageTitle>
      <p className="text-[15px] text-muted">{t("setup.text")}</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- Supabase returns the QR code as an SVG data URL */}
      <img src={enrolled.totp.qr_code} alt={t("setup.qrAlt")} width={184} height={184} className="self-center rounded-xl border border-line bg-white p-2" />
      <SetupKey secret={enrolled.totp.secret} />
      <TotpForm factorId={enrolled.id} next={next} mode="setup" />
      <Notice kind="warning">{t("setup.lostPhone")}</Notice>
    </AuthLayout>
  );
}

async function NoAccess() {
  const t = await getTranslations("admin");
  const common = await getTranslations("common");
  return (
    <AuthLayout badge="ADMIN">
      <PageTitle>{t("noAccessTitle")}</PageTitle>
      <p className="text-[15px] text-muted">{t("noAccessText")}</p>
      <form action={signOut} className="mt-2">
        <input type="hidden" name="site" value="admin" />
        <button type="submit" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-3 hover:underline">
          {common("signOut")}
        </button>
      </form>
    </AuthLayout>
  );
}
