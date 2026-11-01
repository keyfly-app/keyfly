import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { Icon } from "@/components/Icon";
import { PageTitle, TextLink } from "@/components/ui/form";
import { EMAIL_LINK_VALID_HOURS } from "@/config/auth";
import { pendingEmail } from "@/features/auth/pending-email";
import { ResendConfirmationForm } from "@/features/auth/SimpleForms";
import { siteHref } from "@/lib/site-href";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verify");
  return { title: t("title") };
}

/** After sign-up: "check your inbox". The address comes from a short-lived cookie, never from the URL. */
export default async function VerifyEmail() {
  const email = await pendingEmail();
  const registerHref = await siteHref("portal", "/register");
  if (!email) redirect(registerHref);
  const t = await getTranslations("auth.verify");

  return (
    <AuthLayout>
      <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-[14px] bg-mist text-brand">
        <Icon name="mail" size={24} />
      </span>
      <PageTitle>{t("title")}</PageTitle>
      <p className="text-[15px] text-muted">{t.rich("sentTo", { email, b: (chunks) => <b className="font-semibold break-all text-ink">{chunks}</b> })}</p>
      <p className="text-sm text-muted">{t("validity", { hours: EMAIL_LINK_VALID_HOURS })}</p>
      <ResendConfirmationForm />
      <div className="self-center">
        <TextLink href={registerHref}>{t("otherEmail")}</TextLink>
      </div>
    </AuthLayout>
  );
}
