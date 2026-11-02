"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, Notice } from "@/components/ui/form";
import { MenuPopover } from "@/components/ui/MenuPopover";
import { cancelAccessRequest, leaveCompany, type TeamState } from "./actions";

const ITEM = "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium hover:bg-paper focus-visible:bg-paper sm:min-h-9 sm:px-2.5";

/** "⋯" on a row of Cégeim: company details, team, and leaving it (or, as account holder, handing it over on the team page). */
export function CompanyRowMenu({ accountId, name, detailsHref, teamHref, holder }: { accountId: string; name: string; detailsHref: string; teamHref: string; holder: boolean }) {
  const t = useTranslations("settings.companies");
  const team = useTranslations("companies.team");
  const c = useTranslations("companies");
  const [leaving, setLeaving] = useState(false);
  const [state, action, pending] = useActionState<TeamState, FormData>(leaveCompany, { status: "idle" });
  return (
    <>
      <MenuPopover
        title={name}
        closeLabel={c("close")}
        align="end"
        width={240}
        trigger={({ ref, open, toggle, menuId }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={t("more", { name })}
            className={`flex size-11 flex-none items-center justify-center rounded-lg border text-ink-soft sm:size-9 ${open ? "border-line bg-paper" : "border-transparent hover:bg-paper"}`}
          >
            <Icon name="more" size={18} strokeWidth={2} />
          </button>
        )}
      >
        <Link href={detailsHref} role="menuitem" className={ITEM}>
          <Icon name="building" size={16} className="text-muted" />
          {t("details")}
        </Link>
        <Link href={teamHref} role="menuitem" className={ITEM}>
          <Icon name="users" size={16} className="text-muted" />
          {t("team")}
        </Link>
        {holder ? (
          <Link href={teamHref} role="menuitem" className={ITEM}>
            <Icon name="key" size={16} className="text-muted" />
            {team("transfer")}
          </Link>
        ) : (
          <button type="button" role="menuitem" onClick={() => setLeaving(true)} className={`${ITEM} text-danger-ink`}>
            <Icon name="logout" size={16} />
            {team("leaveAccount")}
          </button>
        )}
      </MenuPopover>
      {leaving && (
        <Dialog open onClose={() => setLeaving(false)} title={team("leaveTitle", { company: name })} description={team("leaveText")} closeLabel={c("close")}>
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="accountId" value={accountId} />
            {state.status === "error" && <Notice kind="error">{t("error")}</Notice>}
            <DialogActions>
              <button type="button" data-autofocus onClick={() => setLeaving(false)} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">
                {c("cancel")}
              </button>
              <Button variant="danger" pending={pending} fit>
                {team("leaveAccount")}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </>
  );
}

/** "Kérés visszavonása" on a pending access request. */
export function CancelRequest({ requestId }: { requestId: string }) {
  const t = useTranslations("settings.companies");
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-disabled={pending || undefined}
      onClick={() =>
        start(async () => {
          const { ok } = await cancelAccessRequest(requestId);
          toast(ok ? t("cancelled") : t("error"), ok ? "ok" : "error");
        })
      }
      className="inline-flex h-11 w-full flex-none items-center justify-center rounded-lg border border-field bg-surface px-3.5 text-sm font-medium hover:border-ink aria-disabled:cursor-progress aria-disabled:opacity-80 sm:h-9 sm:w-auto sm:text-[13px]"
    >
      {t("cancelRequest")}
    </button>
  );
}
