"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { Button, Notice } from "@/components/ui/form";
import { endSession, type SettingsState } from "./actions";

export type SessionRow = { id: string; device: string; mobile: boolean; detail: string; current: boolean };

/** Devices page: every place you are signed in; any other one can be signed out, or all of them at once. */
export function SessionList({ sessions }: { sessions: SessionRow[] }) {
  const t = useTranslations("settings");
  const [state, action, pending] = useActionState<SettingsState, FormData>(endSession, { status: "idle" });
  const others = sessions.filter((s) => !s.current).length;
  return (
    <section aria-labelledby="devices-title" className="rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
        <h2 id="devices-title" className="text-[15px] font-semibold">
          {t("devices.title")}
        </h2>
        {others > 0 && (
          <form action={action} className="w-full sm:w-auto">
            <input type="hidden" name="intent" value="others" />
            <Button variant="secondary" pending={pending}>
              {t("devices.signOutOthers")}
            </Button>
          </form>
        )}
      </div>
      {state.status !== "idle" && (
        <div className="px-5 pb-3 sm:px-6">
          <Notice kind={state.status === "error" ? "error" : "success"}>{state.status === "error" ? t(`errors.${state.error}`) : t(`saved.${state.saved}`)}</Notice>
        </div>
      )}
      <ul>
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-3 border-t border-line px-5 py-3.5 sm:px-6">
            <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-mist text-brand">
              <Icon name={s.mobile ? "phone" : "laptop"} size={18} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {s.device}
                {s.current && <span className="inline-flex h-[22px] items-center rounded-md bg-ok-soft px-2 text-xs font-semibold text-ok-ink">{t("devices.current")}</span>}
              </span>
              <span className="text-[12.5px] text-muted">{s.detail}</span>
            </div>
            {!s.current && (
              <form action={action} className="flex-none">
                <input type="hidden" name="session" value={s.id} />
                <button type="submit" disabled={pending} className="inline-flex h-11 items-center rounded-lg px-3 text-[13px] font-medium text-ink hover:bg-paper disabled:opacity-60 sm:h-9">
                  {t("devices.signOut")}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      {others === 0 && <p className="border-t border-line px-5 py-3.5 text-[13px] text-muted sm:px-6">{t("devices.only")}</p>}
    </section>
  );
}
