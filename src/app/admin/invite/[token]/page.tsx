import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { Notice, PageTitle } from "@/components/ui/form";
import { signOut } from "@/features/auth/actions";
import { StaffAnswerForm } from "@/features/invitations/AnswerForm";
import { StaffSignUpForm } from "@/features/staff-auth/forms";
import { isLocale, publicHref } from "@/i18n/config";
import { requestOrigin } from "@/lib/request-origin";
import { siteHref } from "@/lib/site-href";
import { marketingOrigin } from "@/lib/sites";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminAuth.invite");
  // The token is in the URL: never pass it on to another site.
  return { title: t("title"), referrer: "no-referrer", robots: { index: false } };
}

/**
 * Staff invitation. Signed out: create the account right here (the address comes from the invitation).
 * Signed in with the invited address: join. Two-factor setup follows at the first admin sign-in.
 */
export default async function StaffInvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const path = `/invite/${encodeURIComponent(token)}`;
  const t = await getTranslations("adminAuth.invite");
  const invite = await getTranslations("invite");
  const supabase = await createClient();
  const [{ data: auth }, { data: inv }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc("staff_invitation_preview", { p_token: token }).maybeSingle(),
  ]);

  if (!inv?.is_open) {
    return (
      <AuthLayout badge="ADMIN">
        <PageTitle eyebrow={t("label")} sub={invite("closed.text")}>{invite("closed.title")}</PageTitle>
      </AuthLayout>
    );
  }

  const intro = <p className="text-sm text-muted">{t("intro", { name: inv.inviter_name, role: inv.role })}</p>;
  const email = typeof auth?.claims?.email === "string" ? auth.claims.email.toLowerCase() : null;

  if (!email) {
    const raw = await getLocale();
    const { origin, host } = await requestOrigin();
    const locale = isLocale(raw) ? raw : "hu";
    const marketing = marketingOrigin(host, origin.split(":")[0]);
    return (
      <AuthLayout badge="ADMIN">
        <PageTitle eyebrow={t("label")}>{t("title")}</PageTitle>
        {intro}
        <StaffSignUpForm
          token={token}
          email={inv.email}
          termsHref={marketing + publicHref("terms", locale)}
          privacyHref={marketing + publicHref("appPrivacy", locale)}
          signInHref={await siteHref("admin", `/login?next=${encodeURIComponent(path)}`)}
        />
      </AuthLayout>
    );
  }

  if (email !== inv.email) {
    return (
      <AuthLayout badge="ADMIN">
        <Notice kind="warning">{invite("wrongEmail.banner", { email: inv.email })}</Notice>
        <PageTitle>{invite("wrongEmail.title")}</PageTitle>
        <p className="text-sm text-muted">{invite.rich("wrongEmail.current", { email, b: (c) => <b className="font-semibold text-ink">{c}</b> })}</p>
        <form action={signOut} className="pt-2">
          <input type="hidden" name="site" value="admin" />
          <input type="hidden" name="next" value={path} />
          <button type="submit" className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand px-5.5 text-[15px] font-semibold text-white hover:bg-brand-dark">
            {invite("wrongEmail.signOutIn")}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout badge="ADMIN">
      <PageTitle eyebrow={t("label")}>{t("title")}</PageTitle>
      {intro}
      <p className="text-sm text-muted">{(await getTranslations("adminAuth")).rich("signedInAs", { email, b: (c) => <b className="font-semibold text-ink">{c}</b> })}</p>
      <Notice kind="warning">{t("needs2fa")}</Notice>
      <StaffAnswerForm token={token} />
    </AuthLayout>
  );
}
