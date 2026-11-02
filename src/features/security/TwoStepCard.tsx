"use client";

import { useActionState, useId, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { CodeInput } from "@/components/ui/CodeInput";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, Notice } from "@/components/ui/form";
import { MenuPopover } from "@/components/ui/MenuPopover";
import { Tag } from "@/components/ui/Tag";
import { renewBackupCodes, turnOffTwoStep, type OffState } from "./actions";

const SECONDARY = "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-field bg-surface px-3.5 text-[13px] font-medium hover:border-ink sm:h-9";

function Row({ icon, label, value, sub, action }: { icon: "phone" | "key"; label: string; value: string; sub?: string; action: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 border-t border-line px-5 py-3.5 sm:px-6">
      <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-mist text-brand">
        <Icon name={icon} size={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[12.5px] text-muted">{label}</span>
        <span className="text-sm font-medium">{value}</span>
        {sub && <span className="text-[12.5px] text-muted">{sub}</span>}
      </div>
      {action}
    </li>
  );
}

/**
 * Kétlépcsős azonosítás card (canvas "Bejelentkezés és biztonság"): off → one line and "Bekapcsolás";
 * on → the authenticator (⋯: turn off, behind its current code) and the backup codes (make new ones).
 */
export function TwoStepCard({ enabled, since, codesLeft, setupHref }: { enabled: boolean; since: string | null; codesLeft: number; setupHref: string }) {
  const t = useTranslations("security.card");
  const c = useTranslations("companies");
  const id = useId();
  const [dialog, setDialog] = useState<"off" | "codes" | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [renewing, startRenew] = useTransition();
  const [offState, offAction, offPending] = useActionState<OffState, FormData>(async (prev, form) => {
    const next = await turnOffTwoStep(prev, form);
    if (next.status === "idle") {
      setDialog(null);
      toast(t("turnedOff"));
    }
    return next;
  }, { status: "idle" });

  const renew = () =>
    startRenew(async () => {
      const result = await renewBackupCodes();
      if (result.status === "codes") setCodes(result.codes);
      else toast(t("error"), "error");
    });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText((codes ?? []).join("\n"));
      toast(t("copied"));
    } catch {
      toast(t("error"), "error");
    }
  };

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 px-5 pt-5 pb-3 sm:px-6">
        <h2 id={`${id}-title`} className="text-[15px] font-semibold">
          {t("title")}
        </h2>
        <Tag tone={enabled ? "ok" : "neutral"}>{enabled ? t("on") : t("off")}</Tag>
      </div>

      {!enabled ? (
        <div className="flex flex-col gap-4 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <span aria-hidden="true" className="hidden size-9 flex-none items-center justify-center rounded-[10px] bg-mist text-brand sm:flex">
            <Icon name="shield" size={18} />
          </span>
          <p className="flex-1 text-sm text-ink-soft">{t("lead")}</p>
          <Link href={setupHref} className="inline-flex h-11 items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-soft sm:h-10">
            {t("turnOn")}
          </Link>
        </div>
      ) : (
        <ul>
          <Row
            icon="phone"
            label={t("app")}
            value={t("appValue")}
            sub={since ? t("since", { date: since }) : undefined}
            action={
              <MenuPopover
                title={t("app")}
                closeLabel={c("close")}
                align="end"
                width={220}
                trigger={({ ref, open, toggle, menuId }) => (
                  <button
                    ref={ref}
                    type="button"
                    onClick={toggle}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-controls={menuId}
                    aria-label={t("more")}
                    className={`flex size-11 items-center justify-center rounded-lg border text-ink-soft sm:size-9 ${open ? "border-line bg-paper" : "border-transparent hover:bg-paper"}`}
                  >
                    <Icon name="more" size={18} strokeWidth={2} />
                  </button>
                )}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setDialog("off")}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium text-danger-ink hover:bg-paper focus-visible:bg-paper sm:min-h-9 sm:px-2.5"
                >
                  <Icon name="x" size={16} />
                  {t("turnOff")}
                </button>
              </MenuPopover>
            }
          />
          <Row
            icon="key"
            label={t("codes")}
            value={t("codesLeft", { count: codesLeft })}
            action={
              <button
                type="button"
                onClick={() => {
                  setCodes(null);
                  setDialog("codes");
                }}
                className={SECONDARY}
              >
                {t("newCodes")}
              </button>
            }
          />
        </ul>
      )}

      {dialog === "off" && (
        <Dialog open onClose={() => setDialog(null)} title={t("offTitle")} description={t("offText")} closeLabel={c("close")}>
          <form action={offAction} className="flex flex-col gap-5">
            <CodeInput id={`${id}-off`} name="code" label={t("codeLabel")} fill autoFocus error={offState.status === "error" ? t(`errors.${offState.error}`) : undefined} />
            <DialogActions>
              <button type="button" onClick={() => setDialog(null)} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">
                {c("cancel")}
              </button>
              <Button variant="danger" pending={offPending} fit>
                {t("turnOff")}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {dialog === "codes" && (
        <Dialog open onClose={() => setDialog(null)} title={codes ? t("codesTitle") : t("renewTitle")} description={codes ? t("codesText") : t("renewText")} closeLabel={c("close")}>
          <div className="flex flex-col gap-5">
            {codes && (
              <>
                <ul className="grid grid-cols-2 gap-x-8 gap-y-1 rounded-xl border border-line bg-paper/60 px-5 py-4 font-mono text-[15px] tracking-[0.04em]">
                  {codes.map((code) => (
                    <li key={code} className="py-1">
                      {code}
                    </li>
                  ))}
                </ul>
                <Notice kind="info" icon="info">
                  {t("codesOnce")}
                </Notice>
              </>
            )}
            <DialogActions>
              {codes ? (
                <>
                  <button type="button" onClick={copy} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">
                    <Icon name="copy" size={16} />
                    {t("copy")}
                  </button>
                  <button type="button" onClick={() => setDialog(null)} className="inline-flex h-11 items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-soft sm:h-10">
                    {t("done")}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setDialog(null)} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">
                    {c("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={renew}
                    aria-disabled={renewing || undefined}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-soft aria-disabled:opacity-80 sm:h-10"
                  >
                    {t("renew")}
                  </button>
                </>
              )}
            </DialogActions>
          </div>
        </Dialog>
      )}
    </section>
  );
}
