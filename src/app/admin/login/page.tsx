import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/LoginForm";
import { LoginCard, Shell } from "@/components/Shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("adminTitle") };
}

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <Shell site="admin" badge="ADMIN">
      <LoginCard title={t("adminTitle")} text={t("adminText")}>
        {error === "link" && (
          <p className="mb-4 rounded-2xl bg-warning-soft px-4 py-3 text-sm font-semibold text-warning-ink">{t("linkExpired")}</p>
        )}
        <LoginForm site="admin" />
      </LoginCard>
    </Shell>
  );
}
