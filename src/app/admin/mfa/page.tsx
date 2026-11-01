import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { Icon } from "@/components/Icon";
import { PageTitle, StepProgress } from "@/components/ui/form";
import { signOut } from "@/features/auth/actions";
import { TotpForm, TotpSetup } from "@/features/staff-auth/forms";
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
        <StepProgress step={2} total={2} label={t("step2")} />
        <PageTitle sub={t("challenge.text")}>{t("challenge.title")}</PageTitle>
        <TotpForm factorId={verified.id} next={next} mode="challenge" />
        <SignedInAs email={String(auth.claims.email ?? "")} />
      </AuthLayout>
    );
  }

  // Own staff row is readable without the second factor; only active staff may set one up here.
  const { data: me } = await supabase.from("staff").select("disabled_at").eq("user_id", auth.claims.sub).maybeSingle();
  if (!me || me.disabled_at) return <NoAccess />;

  return (
    <AuthLayout badge="ADMIN" wide>
      <StepProgress step={2} total={2} label={t("step2")} />
      <PageTitle sub={t("setup.text")}>{t("setup.title")}</PageTitle>
      <TotpSetup next={next} />
      <p className="flex items-start gap-1.5 text-[12.5px] text-muted">
        <Icon name="phone" size={14} className="mt-0.5 flex-none" />
        {t("setup.lostPhone")}
      </p>
      <SignedInAs email={String(auth.claims.email ?? "")} />
    </AuthLayout>
  );
}

/** Step 2 belongs to the account from step 1: say which one, and offer a way back to the sign-in screen. */
async function SignedInAs({ email }: { email: string }) {
  const t = await getTranslations("adminAuth");
  const common = await getTranslations("common");
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-4 text-[12.5px] text-muted">
      <p className="min-w-0 [overflow-wrap:anywhere]">{t.rich("signedInAs", { email, b: (c) => <b className="font-medium text-ink">{c}</b> })}</p>
      <form action={signOut}>
        <input type="hidden" name="site" value="admin" />
        <button type="submit" className="inline-flex min-h-11 items-center font-medium text-ink underline-offset-3 hover:underline sm:min-h-6">
          {common("signOut")}
        </button>
      </form>
    </div>
  );
}

async function NoAccess() {
  const t = await getTranslations("admin");
  const common = await getTranslations("common");
  return (
    <AuthLayout badge="ADMIN">
      <PageTitle sub={t("noAccessText")}>{t("noAccessTitle")}</PageTitle>
      <form action={signOut} className="mt-2">
        <input type="hidden" name="site" value="admin" />
        <button type="submit" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-3 hover:underline">
          {common("signOut")}
        </button>
      </form>
    </AuthLayout>
  );
}
