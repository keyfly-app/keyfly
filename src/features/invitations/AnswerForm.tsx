"use client";

import { useActionState, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink, INPUT_CLASS, Label, Notice, PageTitle } from "@/components/ui/form";
import { InfoTip } from "@/components/ui/InfoTip";
import { acceptStaffInvitation, answerInvitation, type InvitationState } from "./actions";

export type CompanyAccount = { id: string; name: string; taxNumber: string | null };

const idle: InvitationState = { status: "idle" };

/**
 * Accept / decline. For a lease invitation the invitee chooses whether they rent as a private person
 * or as one of their companies (only companies where they are owner or admin are offered).
 */
export function AnswerForm({
  token,
  companies,
  validUntil,
  homeHref,
}: {
  token: string;
  companies?: CompanyAccount[];
  validUntil: string;
  homeHref: string;
}) {
  const t = useTranslations("invite");
  const id = useId();
  const [state, action, pending] = useActionState(answerInvitation, idle);
  const [asCompany, setAsCompany] = useState(false);

  if (state.status === "declined") {
    return (
      <>
        <PageTitle>{t("declined.title")}</PageTitle>
        <p className="text-[15px] text-muted">{t("declined.text")}</p>
        <div className="mt-auto pt-4">
          <ButtonLink href={homeHref}>{t("declined.continue")}</ButtonLink>
        </div>
      </>
    );
  }

  return (
    <form action={action} className="flex flex-1 flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {companies && companies.length > 0 && (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
              {t("rentingAs")}
              <InfoTip text={t("rentingAsTip")} />
            </legend>
            <div className="flex rounded-xl bg-mist p-0.75">
              {[false, true].map((company) => (
                <label
                  key={String(company)}
                  className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[9px] text-sm font-semibold text-muted has-checked:bg-surface has-checked:text-ink has-checked:shadow-[0_1px_2px_rgba(12,31,25,.12)] has-focus-visible:outline-3 has-focus-visible:outline-brand"
                >
                  <input type="radio" name="as" checked={asCompany === company} onChange={() => setAsCompany(company)} className="sr-only" />
                  {company ? t("company") : t("individual")}
                </label>
              ))}
            </div>
          </fieldset>
          {asCompany && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-company`}>{t("companySelect")}</Label>
              <select id={`${id}-company`} name="tenantAccount" className={`${INPUT_CLASS} appearance-auto`}>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.taxNumber ? `${c.name} · ${t("taxNumber", { number: c.taxNumber })}` : c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
      {state.status === "error" && <Notice kind="error">{t(`errors.${state.error}`)}</Notice>}
      <div className="mt-auto flex flex-col gap-2.5 pt-4">
        <Button name="intent" value="accept" pending={pending}>
          {t("accept")}
        </Button>
        <Button name="intent" value="decline" variant="secondary" pending={pending}>
          {t("decline")}
        </Button>
        <p className="text-center text-[13px] text-muted">{t("validUntil", { date: validUntil })}</p>
      </div>
    </form>
  );
}

export function StaffAnswerForm({ token }: { token: string }) {
  const t = useTranslations("invite");
  const [state, action, pending] = useActionState(acceptStaffInvitation, idle);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {state.status === "error" && <Notice kind="error">{t(`errors.${state.error}`)}</Notice>}
      <Button pending={pending}>{t("staff.accept")}</Button>
    </form>
  );
}
