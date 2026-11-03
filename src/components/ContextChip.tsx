"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AccountMark, type SwitcherAccount } from "@/components/AccountSwitcher";
import { Icon } from "@/components/Icon";
import { Dialog } from "@/components/ui/Dialog";
import { ViewSwitch } from "@/features/view/ViewSwitch";

/**
 * Phones and tablets (canvas v3 `chip()` and "Hol dolgozol most?"): one button names the account and its View; it opens
 * a sheet with your accounts – the current one with its View switch – and "Cég hozzáadása".
 */
export function ContextChip({ accounts, current, addHref }: { accounts: SwitcherAccount[]; current: SwitcherAccount; addHref: string }) {
  const t = useTranslations("nav");
  const a = useTranslations("accounts");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`flex h-11 max-w-full min-w-0 items-center gap-2.5 rounded-[10px] border pr-2.5 pl-1.5 text-left ${open ? "border-ink bg-paper" : "border-line bg-surface hover:border-field"}`}
      >
        <AccountMark account={current} size={30} />
        <span className="flex min-w-0 flex-col leading-4">
          <span className="truncate text-[13.5px] font-semibold">{current.name}</span>
          <span className="truncate text-xs font-semibold text-brand">{t(`views.${current.view}`)}</span>
        </span>
        <Icon name="chevronDown" size={15} className="flex-none text-muted" />
      </button>
      <Dialog open={open} onClose={close} title={t("context.title")} closeLabel={a("close")}>
        <div className="-mx-2 -mt-2 flex flex-col gap-1">
          <ul className="flex flex-col gap-1">
            {accounts.map((acc) => {
              const on = acc.id === current.id;
              return (
                <li key={acc.id} className={`rounded-xl ${on ? "bg-paper pb-2.5" : ""}`}>
                  <Link
                    href={acc.href}
                    onClick={close}
                    aria-current={on || undefined}
                    data-autofocus={on || undefined}
                    className="flex min-h-14 items-center gap-3 rounded-xl px-2.5 py-1.5 hover:bg-paper"
                  >
                    <AccountMark account={acc} size={36} />
                    <span className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="truncate text-[15px] leading-5 font-semibold">{acc.name}</span>
                      <span className="truncate text-[12.5px] leading-[17px] text-muted">
                        {acc.sub}
                        {!on && (
                          <>
                            {" · "}
                            <span className="font-semibold text-brand">{t(`views.${acc.view}`)}</span>
                          </>
                        )}
                      </span>
                    </span>
                    {on && <Icon name="check" size={18} strokeWidth={2.25} className="flex-none" />}
                  </Link>
                  {on && (
                    <div className="flex flex-col gap-1.5 pr-2.5 pl-[58px]">
                      <p className="text-xs font-semibold text-muted">{t("context.view")}</p>
                      <ViewSwitch current={acc.view} accountId={acc.company ? acc.id : undefined} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mx-2 my-1 h-px bg-line" />
          <Link href={addHref} onClick={close} className="flex min-h-12 items-center gap-3 rounded-xl px-2.5 text-[15px] font-semibold text-brand hover:bg-paper">
            <span aria-hidden="true" className="flex w-9 justify-center">
              <Icon name="plus" size={18} strokeWidth={2} />
            </span>
            {a("add")}
          </Link>
        </div>
      </Dialog>
    </>
  );
}
