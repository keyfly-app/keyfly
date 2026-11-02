"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Tag } from "@/components/ui/Tag";
import { removeTrustedDevice } from "./actions";

export type TrustedRow = { id: string; label: string; mobile: boolean; marked: string; expires: string; current: boolean };

/**
 * Biztonságos eszközök (canvas "Bejelentkezés és biztonság – biztonságos eszközök"): browsers that skip the two-step
 * code for 30 days. Each can be removed, or all at once; removed ones ask for the code at the next sign-in.
 */
export function TrustedDevices({ devices }: { devices: TrustedRow[] }) {
  const t = useTranslations("security.trusted");
  const [pending, start] = useTransition();
  const remove = (id: string) =>
    start(async () => {
      const { ok } = await removeTrustedDevice(id);
      toast(ok ? t(id === "all" ? "removedAll" : "removed") : t("error"), ok ? "ok" : "error");
    });
  if (!devices.length) return null;
  return (
    <section aria-labelledby="trusted-title" aria-busy={pending || undefined} className="rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
        <h2 id="trusted-title" className="text-[15px] font-semibold">
          {t("title")}
        </h2>
        {devices.length > 1 && (
          <button type="button" onClick={() => remove("all")} className="inline-flex h-11 items-center rounded-lg border border-field bg-surface px-3.5 text-[13px] font-medium hover:border-ink sm:h-9">
            {t("removeAll")}
          </button>
        )}
      </div>
      <ul>
        {devices.map((d) => (
          <li key={d.id} className="flex items-center gap-3 border-t border-line px-5 py-3.5 sm:px-6">
            <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-paper text-ink-soft">
              <Icon name={d.mobile ? "phone" : "laptop"} size={17} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {d.label}
                {d.current && <Tag tone="ok">{t("thisDevice")}</Tag>}
              </span>
              <span className="text-[12.5px] text-muted">{t("marked", { date: d.marked, expires: d.expires })}</span>
            </div>
            <button
              type="button"
              onClick={() => remove(d.id)}
              aria-label={t("removeLabel", { device: d.label })}
              className="inline-flex h-11 flex-none items-center rounded-lg px-3 text-[13px] font-medium hover:bg-paper sm:h-9"
            >
              {t("remove")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
