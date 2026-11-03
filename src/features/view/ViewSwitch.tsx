"use client";

import { useActionState, useEffect, useOptimistic, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/components/Toaster";
import { switchView, type ViewState } from "@/features/auth/actions";
import type { AccountView } from "@/features/companies/accounts";

const VIEWS: AccountView[] = ["tenant", "landlord"];

/**
 * "Bérlőként | Bérbeadóként" (canvas v3): the View of this account – a person or a company can be both. Remembered per
 * account; the switch shows the new View at once, the server confirms with a toast (or it falls back).
 */
export function ViewSwitch({ current, accountId }: { current: AccountView; accountId?: string }) {
  const t = useTranslations("nav");
  const [state, action] = useActionState<ViewState, FormData>(switchView, { status: "idle" });
  const [shown, show] = useOptimistic<string>(state.status === "saved" ? state.view : current);
  const choose = (form: FormData) => {
    const view = String(form.get("view") ?? "");
    if (view === shown) return;
    show(view);
    action(form);
  };

  // Each result toasts once, however often the switch renders again.
  const told = useRef(state);
  useEffect(() => {
    if (told.current === state) return;
    told.current = state;
    if (state.status === "saved") toast(t("viewSaved", { view: state.view }));
    if (state.status === "error") toast(t("viewError"), "error");
  }, [state, t]);

  return (
    <form action={choose}>
      {accountId && <input type="hidden" name="account" value={accountId} />}
      <fieldset className="flex rounded-lg bg-line/60 p-0.5">
        <legend className="sr-only">{t("views.label")}</legend>
        {VIEWS.map((view) => (
          <button
            key={view}
            type="submit"
            name="view"
            value={view}
            aria-pressed={view === shown}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-md px-2 text-[13px] font-medium whitespace-nowrap lg:min-h-8 ${view === shown ? "bg-surface text-ink shadow-[0_1px_2px_rgb(12_31_25/0.12)]" : "text-muted hover:text-ink"}`}
          >
            {t(`views.${view}`)}
          </button>
        ))}
      </fieldset>
    </form>
  );
}
