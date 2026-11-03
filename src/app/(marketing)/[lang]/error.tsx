"use client";

import { useLocale } from "next-intl";
import { ErrorPage } from "@/components/ErrorPage";
import { isLocale, publicHref } from "@/i18n/config";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const raw = useLocale();
  return <ErrorPage error={error} reset={reset} home={publicHref("home", isLocale(raw) ? raw : "hu")} />;
}
