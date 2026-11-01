"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/Icon";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, Notice, TextField } from "@/components/ui/form";
import { PasswordField } from "@/features/auth/PasswordField";
import { changeEmail, changePassword, updateName, updatePhone, type SettingsState } from "./actions";

type Editing = "name" | "email" | "password" | "phone" | null;
const IDLE: SettingsState = { status: "idle" };

/**
 * "Személyes adatok" (after számlázz.hu's sign-in settings): one row per item – value and an Edit button;
 * each edit opens its own small dialog, so a half-finished change never mixes with the others.
 */
export function ProfileDetails({
  name,
  email,
  pendingEmail,
  phone,
  passwordChanged,
}: {
  name: string | null;
  email: string;
  pendingEmail: string | null;
  phone: string | null;
  passwordChanged: string | null;
}) {
  const t = useTranslations("settings");
  const [editing, setEditing] = useState<Editing>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Focus goes back to the Edit button that opened the dialog.
  const opener = useRef<HTMLButtonElement | null>(null);
  const close = () => {
    setEditing(null);
    requestAnimationFrame(() => opener.current?.focus());
  };
  const onSaved = (message: string) => {
    setNotice(message);
    close();
  };

  const rows: { key: Exclude<Editing, null>; icon: IconName; label: string; value: React.ReactNode; empty?: boolean }[] = [
    { key: "name", icon: "user", label: t("profile.name"), value: name ?? "–" },
    { key: "email", icon: "mail", label: t("profile.email"), value: email },
    { key: "password", icon: "lock", label: t("profile.password"), value: <span className="tracking-[0.2em]">••••••••••</span> },
    { key: "phone", icon: "phone", label: t("profile.phone"), value: phone ?? t("profile.phoneEmpty"), empty: !phone },
  ];

  return (
    <section aria-labelledby="personal-title" className="rounded-xl border border-line bg-surface">
      <h2 id="personal-title" className="px-5 pt-5 pb-2 text-[15px] font-semibold sm:px-6">
        {t("profile.personal")}
      </h2>
      {notice && (
        <div className="px-5 pb-2 sm:px-6">
          <Notice kind="success">{notice}</Notice>
        </div>
      )}
      <ul>
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-3 border-t border-line px-5 py-3.5 sm:px-6">
            <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-mist text-brand">
              <Icon name={row.icon} size={18} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[12.5px] text-muted">{row.label}</span>
              <span className={`text-sm font-medium [overflow-wrap:anywhere] ${row.empty ? "text-muted" : ""}`}>{row.value}</span>
              {row.key === "email" && pendingEmail && <span className="mt-1 text-[12.5px] font-medium text-info-ink">{t("profile.pending", { email: pendingEmail })}</span>}
              {row.key === "password" && passwordChanged && <span className="text-[12.5px] text-muted">{t("profile.passwordChanged", { date: passwordChanged })}</span>}
            </div>
            <button
              type="button"
              onClick={(e) => {
                opener.current = e.currentTarget;
                setNotice(null);
                setEditing(row.key);
              }}
              aria-label={`${row.label}: ${row.empty ? t("profile.add") : t("profile.edit")}`}
              className="inline-flex h-11 flex-none items-center rounded-lg border border-field bg-surface px-3.5 text-[13px] font-medium hover:border-ink sm:h-9"
            >
              {row.empty ? t("profile.add") : t("profile.edit")}
            </button>
          </li>
        ))}
      </ul>

      {/* Mounted only while open, so every edit starts clean. */}
      {editing === "name" && <NameDialog open onClose={close} onSaved={onSaved} current={name ?? ""} />}
      {editing === "email" && <EmailDialog open onClose={close} onSaved={onSaved} />}
      {editing === "password" && <PasswordDialog open onClose={close} onSaved={onSaved} />}
      {editing === "phone" && <PhoneDialog open onClose={close} onSaved={onSaved} current={phone ?? ""} />}
    </section>
  );
}

type DialogProps = { open: boolean; onClose: () => void; onSaved: (message: string) => void };

/** Runs a settings action and reports success to the row list. */
function useSettingsAction(action: (s: SettingsState, f: FormData) => Promise<SettingsState>, onSaved: (m: string) => void) {
  const t = useTranslations("settings");
  const [state, run, pending] = useActionState(action, IDLE);
  useEffect(() => {
    if (state.status === "saved") onSaved(t(`saved.${state.saved}`, { email: state.email ?? "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report each result once
  }, [state]);
  const error = state.status === "error" ? t(`errors.${state.error}`) : undefined;
  const fieldError = (field: string) => (state.status === "error" && state.field === field ? error : undefined);
  const formError = state.status === "error" && !state.field ? error : undefined;
  return { run, pending, fieldError, formError };
}

function NameDialog({ open, onClose, onSaved, current }: DialogProps & { current: string }) {
  const t = useTranslations("settings.dialogs");
  const id = useId();
  const { run, pending, fieldError, formError } = useSettingsAction(updateName, onSaved);
  return (
    <Dialog open={open} onClose={onClose} title={t("nameTitle")} closeLabel={t("close")}>
      <form action={run} className="flex flex-col gap-4">
        <TextField id={`${id}-name`} name="name" label={t("nameLabel")} defaultValue={current} autoComplete="name" maxLength={200} required error={fieldError("name")} aria-describedby={`${id}-hint`} />
        <p id={`${id}-hint`} className="-mt-2 text-[12.5px] text-muted">{t("nameHint")}</p>
        {formError && <Notice kind="error">{formError}</Notice>}
        <DialogActions>
          <button type="button" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">{t("cancel")}</button>
          <Button pending={pending}>{t("save")}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function PhoneDialog({ open, onClose, onSaved, current }: DialogProps & { current: string }) {
  const t = useTranslations("settings.dialogs");
  const id = useId();
  const { run, pending, fieldError, formError } = useSettingsAction(updatePhone, onSaved);
  return (
    <Dialog open={open} onClose={onClose} title={t("phoneTitle")} description={t("phoneHint")} closeLabel={t("close")}>
      <form action={run} className="flex flex-col gap-4">
        <TextField id={`${id}-phone`} name="phone" type="tel" inputMode="tel" label={t("phoneLabel")} defaultValue={current} placeholder="+36 30 123 4567" autoComplete="tel" maxLength={20} required error={fieldError("phone")} />
        {formError && <Notice kind="error">{formError}</Notice>}
        <DialogActions>
          {current && (
            <button type="submit" name="intent" value="remove" formNoValidate className="mr-auto inline-flex h-11 items-center justify-center rounded-lg px-1 text-sm font-medium text-danger-ink hover:underline sm:h-10">
              {t("phoneRemove")}
            </button>
          )}
          <button type="button" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">{t("cancel")}</button>
          <Button pending={pending}>{t("save")}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function EmailDialog({ open, onClose, onSaved }: DialogProps) {
  const t = useTranslations("settings.dialogs");
  const id = useId();
  const { run, pending, fieldError, formError } = useSettingsAction(changeEmail, onSaved);
  return (
    <Dialog open={open} onClose={onClose} title={t("emailTitle")} description={t("emailLead")} closeLabel={t("close")}>
      <form action={run} className="flex flex-col gap-4">
        <TextField id={`${id}-email`} name="email" type="email" label={t("emailNew")} autoComplete="email" maxLength={254} required error={fieldError("email")} />
        <PasswordField id={`${id}-pw`} label={t("currentPassword")} autoComplete="current-password" error={fieldError("password")} />
        {formError && <Notice kind="error">{formError}</Notice>}
        <DialogActions>
          <button type="button" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">{t("cancel")}</button>
          <Button pending={pending}>{t("emailSend")}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function PasswordDialog({ open, onClose, onSaved }: DialogProps) {
  const t = useTranslations("settings.dialogs");
  const id = useId();
  const { run, pending, fieldError, formError } = useSettingsAction(changePassword, onSaved);
  return (
    <Dialog open={open} onClose={onClose} title={t("passwordTitle")} description={t("passwordLead")} closeLabel={t("close")}>
      <form action={run} className="flex flex-col gap-4">
        <PasswordField id={`${id}-cur`} name="currentPassword" label={t("currentPassword")} autoComplete="current-password" error={fieldError("currentPassword")} />
        <PasswordField id={`${id}-new`} label={t("passwordNew")} autoComplete="new-password" rules error={fieldError("password")} />
        {formError && <Notice kind="error">{formError}</Notice>}
        <DialogActions>
          <button type="button" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">{t("cancel")}</button>
          <Button pending={pending}>{t("passwordSave")}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
