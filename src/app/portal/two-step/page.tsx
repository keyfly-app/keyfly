import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { signOut } from "@/features/auth/actions";
import { ChallengeForm } from "@/features/security/ChallengeForm";
import { safeNext } from "@/lib/safe-next";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("security.challenge");
  return { title: t("title"), robots: { index: false } };
}

/** Sign-in, step 2 for people who turned on two-step verification (the proxy sends them here until it is done). */
export default async function TwoStep({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect(await siteHref("portal", "/login"));
  const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (level?.nextLevel !== "aal2" || level.currentLevel === "aal2") redirect(await siteHref("portal", next));
  const { data: passed } = await supabase.rpc("two_step_pass_ok");
  if (passed) redirect(await siteHref("portal", next));

  const [t, common, { data: profile }] = await Promise.all([
    getTranslations("security.challenge"),
    getTranslations("common"),
    supabase.from("profiles").select("two_step_email").eq("id", String(auth.claims.sub)).maybeSingle(),
  ]);
  const email = String(auth.claims.email ?? "");
  // "k•••@gmail.com": enough to recognise the mailbox, not the whole address.
  const emailTo = profile?.two_step_email && email.includes("@") ? `${email[0]}•••@${email.split("@")[1]}` : null;
  return (
    <AuthLayout>
      <ChallengeForm next={next} emailTo={emailTo} />
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-line pt-4 text-[12.5px] text-muted">
        <span className="min-w-0 [overflow-wrap:anywhere]">{t("signedInAs", { email })}</span>
        <form action={signOut}>
          <input type="hidden" name="site" value="portal" />
          <button type="submit" className="inline-flex min-h-11 items-center font-medium text-ink underline-offset-3 hover:underline sm:min-h-6">
            {common("signOut")}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
