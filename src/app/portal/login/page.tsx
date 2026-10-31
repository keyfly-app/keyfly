import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/LoginForm";
import { LoginCard, Shell } from "@/components/Shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("portalTitle") };
}

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <Shell site="portal">
      <LoginCard title={t("portalTitle")} text={t("portalText")}>
        {error === "link" && (
          <p className="mb-4 rounded-2xl bg-warn px-4 py-3 text-sm font-semibold text-[#6B3D00]">{t("linkExpired")}</p>
        )}
        <LoginForm site="portal" />
      </LoginCard>
    </Shell>
  );
}
