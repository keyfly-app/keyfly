import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { StartViewForm } from "@/features/auth/StartViewForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.welcome");
  return { title: t("title") };
}

export default async function Welcome() {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("start_view").maybeSingle();
  return (
    <AuthLayout>
      <StartViewForm current={profile?.start_view ?? null} />
    </AuthLayout>
  );
}
