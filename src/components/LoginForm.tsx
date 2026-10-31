"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { sendMagicLink, type LoginState } from "@/lib/auth";
import type { AppSite } from "@/lib/sites";

export function LoginForm({ site, next = "/" }: { site: AppSite; next?: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-2xl bg-lime-soft p-5">
        <p className="font-semibold">{t("sentTitle")}</p>
        <p className="mt-1 text-sm text-muted">{t("sentText")}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="site" value={site} />
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm font-semibold">
        {t("emailLabel")}
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1.5 h-13 w-full rounded-2xl border-[1.5px] border-line px-4 text-[17px] font-medium focus:border-green"
        />
      </label>
      <button type="submit" disabled={pending} className="h-13 w-full rounded-full bg-green font-bold text-white hover:bg-green-dark disabled:opacity-60">
        {pending ? t("submitting") : t("submit")}
      </button>
      {state.status === "error" && (
        <p role="alert" className="rounded-2xl bg-warn px-4 py-3 text-sm font-semibold text-[#6B3D00]">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <p className="text-center text-sm text-muted">{t("hint")}</p>
    </form>
  );
}
