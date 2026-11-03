"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ErrorFrame, ErrorState } from "@/components/ErrorState";
import { CONTACT } from "@/config/company";

/**
 * "Something went wrong" (canvas v3 "Hibaoldalak") for the error.tsx of each surface. It stands on its own – logo
 * and content, no account menu – because the menu's own data may be what failed. The digest is the support reference.
 */
export function ErrorPage({ error, reset, home }: { error: Error & { digest?: string }; reset: () => void; home: string }) {
  const t = useTranslations("errors");
  const c = useTranslations("common");
  const router = useRouter();
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });
  return (
    <ErrorFrame home={home} homeLabel={c("homeLink")}>
      <ErrorState
        kind="error"
        title={t("failed.title")}
        lead={t("failed.lead")}
        primary={{ onClick: retry, label: t("failed.retry"), icon: "refresh" }}
        secondary={{ href: `mailto:${CONTACT.support}`, label: t("write") }}
        code={error.digest ? t("failed.code", { code: error.digest }) : undefined}
      />
    </ErrorFrame>
  );
}
