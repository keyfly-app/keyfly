"use client";

import { useActionState, useEffect, useOptimistic, useState } from "react";
import { useTranslations } from "next-intl";
import { HeaderMenu } from "@/components/HeaderMenu";
import { Icon, type IconName } from "@/components/Icon";
import { switchView, type ViewState } from "@/features/auth/actions";

type View = "tenant" | "landlord";
const VIEWS: { view: View; icon: IconName }[] = [
  { view: "tenant", icon: "key" },
  { view: "landlord", icon: "home" },
];
const TOAST_MS = 4000;

/**
 * Header "Nézet" (canvas v2.5 "Nézet a cégben"): as tenant or as landlord, in every account – a person or a company can
 * be both. Remembered per account; the pill names the current View from 640 px, phones show the icon.
 */
export function ViewMenu({ current, accountId, context }: { current: View; accountId?: string; context: React.ReactNode }) {
  const t = useTranslations("header");
  const [state, action] = useActionState<ViewState, FormData>(switchView, { status: "idle" });
  const [toast, setToast] = useState<string | null>(null);
  // The pill names the new View at once; the server confirms (toast) or it falls back.
  const [shown, show] = useOptimistic<string>(state.status === "saved" ? state.view : current);
  const choose = (form: FormData) => {
    show(String(form.get("view") ?? ""));
    action(form);
  };

  useEffect(() => {
    if (state.status === "idle") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the toast follows the action's result
    setToast(state.status === "saved" ? t("viewSaved", { view: state.view }) : t("viewError"));
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [state, t]);

  return (
    <>
      <HeaderMenu
        icon="layout"
        label={t("view")}
        title={t("view")}
        context={context}
        pill
        hidden={accountId ? { account: accountId } : undefined}
        current={shown}
        name="view"
        choices={VIEWS.map(({ view, icon }) => ({ value: view, icon, label: t(`views.${view}.title`), text: t(`views.${view}.text`) }))}
        action={choose}
        closeLabel={t("close")}
      />
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6">
        {toast && (
          <p className="flex items-center gap-2.5 rounded-[10px] bg-ink px-3.5 py-3 text-sm font-medium text-white shadow-[0_12px_32px_rgb(12_31_25/0.3)]">
            <Icon name={state.status === "saved" ? "check" : "alert"} size={16} strokeWidth={2.25} className="text-lime" />
            {toast}
          </p>
        )}
      </div>
    </>
  );
}
