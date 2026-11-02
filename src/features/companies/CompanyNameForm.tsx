"use client";

import { useActionState, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/components/Toaster";
import { Button, FieldHint, INPUT_CLASS, Label } from "@/components/ui/form";
import { updateCompanyName, type DetailsState } from "./actions";

const IDLE: DetailsState = { status: "idle" };

/** The company's display name: a field with Save for owners and admins, plain text for everyone else. */
export function CompanyNameForm({ accountId, name, editable }: { accountId: string; name: string; editable: boolean }) {
  const t = useTranslations("companies");
  const id = useId();
  const [value, setValue] = useState(name);
  const [state, action, pending] = useActionState<DetailsState, FormData>(async (prev, form) => {
    const next = await updateCompanyName(prev, form);
    if (next.status === "saved") toast(t("details.saved"));
    return next;
  }, IDLE);

  if (!editable) {
    return (
      <div className="flex flex-col gap-0.5">
        <p className="text-[13px] text-muted">{t("displayName")}</p>
        <p className="text-sm font-medium">{name}</p>
      </div>
    );
  }
  const error = state.status === "error" ? t(state.error === "name" ? "errors.name" : "errors.generic") : null;
  return (
    <form action={action} className="flex flex-col gap-1.5">
      <input type="hidden" name="accountId" value={accountId} />
      <Label htmlFor={`${id}-name`}>{t("displayName")}</Label>
      <FieldHint id={`${id}-hint`}>{t("displayNameHint")}</FieldHint>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`${id}-name`}
          name="name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={200}
          autoComplete="organization"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          className={`${INPUT_CLASS} sm:flex-1`}
        />
        <Button pending={pending} variant="secondary" fit>
          {t("details.save")}
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-danger-ink">
          {error}
        </p>
      ) : null}
    </form>
  );
}
