"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HeaderMenu } from "@/components/HeaderMenu";
import { Icon, type IconName } from "@/components/Icon";
import { switchView, type ViewState } from "@/features/auth/actions";
import type { Enums } from "@/lib/supabase/database.types";

const VIEWS: { view: Enums<"start_view">; icon: IconName }[] = [
  { view: "tenant", icon: "key" },
  { view: "landlord", icon: "home" },
  { view: "manager", icon: "building" },
];
const TOAST_MS = 4000;

/** Header "Nézet" (canvas "Fejléc ikonok"): what Overview shows. Only the start view changes, never rights or data. */
export function ViewMenu({ current }: { current: Enums<"start_view"> }) {
  const t = useTranslations("header");
  const [state, action] = useActionState<ViewState, FormData>(switchView, { status: "idle" });
  const [toast, setToast] = useState<string | null>(null);

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
        lead={t("viewLead")}
        note={t("viewNote")}
        current={state.status === "saved" ? state.view : current}
        name="view"
        choices={VIEWS.map(({ view, icon }) => ({ value: view, icon, label: t(`views.${view}.title`), text: t(`views.${view}.text`) }))}
        action={action}
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
