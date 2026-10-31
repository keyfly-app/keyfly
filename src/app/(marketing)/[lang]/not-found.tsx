"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LogoFull } from "@/components/Logo";
import { isLocale, publicHref } from "@/i18n/config";

export default function NotFound() {
  const raw = useLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const t = useTranslations("notFound");
  const c = useTranslations("common");
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-4">
      <LogoFull height={28} />
      <h1 className="font-display text-4xl font-bold">{t("title")}</h1>
      <Link href={publicHref("home", locale)} className="rounded-full bg-green px-6 py-3 font-bold text-white">
        {c("backHome")}
      </Link>
    </div>
  );
}
