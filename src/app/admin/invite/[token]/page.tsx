import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { PageTitle } from "@/components/ui/form";
import { EmailLinkForm } from "@/features/auth/SimpleForms";
import { StaffAnswerForm } from "@/features/invitations/AnswerForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("invite.staff");
  return { title: t("title"), referrer: "no-referrer", robots: { index: false } };
}

/** Staff invitation: sign in with the invited @keyfly.app address, then join. */
export default async function StaffInvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("invite.staff");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();

  return (
    <AuthLayout badge="ADMIN">
      <PageTitle eyebrow={t("label")}>{t("title")}</PageTitle>
      <p className="text-[15px] text-muted">{t("text")}</p>
      {auth?.claims ? <StaffAnswerForm token={token} /> : <EmailLinkForm site="admin" next={`/invite/${encodeURIComponent(token)}`} />}
    </AuthLayout>
  );
}
