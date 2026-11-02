"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/Icon";
import { CodeInput } from "@/components/ui/CodeInput";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, Notice, TextField } from "@/components/ui/form";
import { Tag } from "@/components/ui/Tag";
import { PasswordField } from "@/features/auth/PasswordField";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { formatPhone, SMS_COUNTRIES, splitPhone } from "@/lib/phone";
import { changeEmail, changePassword, phoneStep, removePhone, updateName, type PhoneState, type SettingsState } from "./actions";

type Editing = "name" | "email" | "password" | "phone" | null;
const IDLE: SettingsState = { status: "idle" };

/**
 * "Személyes adatok" (after számlázz.hu's sign-in settings): one row per item – value and an Edit button;
 * each edit opens its own small dialog, so a half-finished change never mixes with the others.
 */
export function ProfileDetails({
  title,
  items,
  name,
  email,
  pendingEmail,
  phone,
  phoneVerified = false,
  passwordChanged,
  hasPassword = true,
  extra,
}: {
  /** A last row of the card that is not edited in a dialog (the language on the profile). */
  extra?: React.ReactNode;
  /** Card heading: "Személyes adatok" (profile) or "Belépési adatok" (sign-in and security). */
  title: string;
  /** Which rows this card shows, in order. */
  items: Exclude<Editing, null>[];
  name: string | null;
  email: string;
  pendingEmail: string | null;
  phone: string | null;
  phoneVerified?: boolean;
  passwordChanged: string | null;
  /** False for an account made with Google: the password row offers "Beállítás" (canvas v2.4). */
  hasPassword?: boolean;
}) {
  const t = useTranslations("settings");
  const headingId = useId();
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

  const all: { key: Exclude<Editing, null>; icon: IconName; label: string; value: React.ReactNode; empty?: boolean }[] = [
    { key: "name", icon: "user", label: t("profile.name"), value: name ?? "–" },
    {
      key: "email",
      icon: "mail",
      label: t("profile.email"),
      // A long address may wrap after the @, never in the middle of a word.
      value: (
        <>
          {email.split("@")[0]}@<wbr />
          {email.split("@").slice(1).join("@")}
        </>
      ),
    },
    {
      key: "password",
      icon: "lock",
      label: t("profile.password"),
      value: hasPassword ? <span className="tracking-[0.2em]">••••••••••</span> : t("profile.passwordNone"),
      empty: !hasPassword,
    },
    { key: "phone", icon: "phone", label: t("profile.phone"), value: phone ? formatPhone(phone) : t("profile.phoneEmpty"), empty: !phone },
  ];
  const rows = items.map((key) => all.find((r) => r.key === key)!);
  const actionLabel = (row: (typeof all)[number]) =>
    row.key === "password" && row.empty ? t("profile.set") : row.empty ? t("profile.add") : row.key === "phone" && !phoneVerified ? t("phone.verify") : t("profile.edit");

  return (
    <section aria-labelledby={`${headingId}-title`} className="rounded-xl border border-line bg-surface">
      <h2 id={`${headingId}-title`} className="px-5 pt-5 pb-3 text-[15px] font-semibold sm:px-6">
        {title}
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
              <span className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium [overflow-wrap:break-word] ${row.empty ? "text-muted" : ""}`}>
                {row.value}
                {row.key === "phone" && phone && <Tag tone={phoneVerified ? "ok" : "warning"}>{phoneVerified ? t("phone.verified") : t("phone.unverified")}</Tag>}
              </span>
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
              aria-label={`${row.label}: ${actionLabel(row)}`}
              className="inline-flex h-11 flex-none items-center rounded-lg border border-field bg-surface px-3.5 text-[13px] font-medium hover:border-ink sm:h-9"
            >
              {actionLabel(row)}
            </button>
          </li>
        ))}
        {extra}
      </ul>

      {/* Mounted only while open, so every edit starts clean. */}
      {editing === "name" && <NameDialog open onClose={close} onSaved={onSaved} current={name ?? ""} />}
      {editing === "email" && <EmailDialog open onClose={close} onSaved={onSaved} />}
      {editing === "password" && <PasswordDialog open onClose={close} onSaved={onSaved} first={!hasPassword} />}
      {editing === "phone" && <PhoneDialog open onClose={close} onSaved={onSaved} current={phone} />}
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

const RESEND_AFTER = 60;

/** Seconds left until a new code may be asked for; ticks once a second. */
function useCountdown(from: number | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!from) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [from]);
  return from ? Math.min(RESEND_AFTER, Math.max(0, RESEND_AFTER - Math.floor((now - from) / 1000))) : 0;
}

/** Telefonszám megerősítése (canvas V23TelefonKod): the number, then the 6-digit code from the SMS. */
function PhoneDialog({ open, onClose, onSaved, current }: DialogProps & { current: string | null }) {
  const t = useTranslations("settings.phone");
  const id = useId();
  // "Másik számot adok meg" starts the dialog over with a fresh action state.
  const [round, setRound] = useState(0);
  const [removing, startRemove] = useTransition();
  const [removeFailed, setRemoveFailed] = useState(false);
  const remove = () =>
    startRemove(async () => {
      const { ok } = await removePhone();
      if (ok) onSaved(t("removed"));
      else setRemoveFailed(true);
    });
  return (
    <PhoneSteps
      key={round}
      id={id}
      open={open}
      onClose={onClose}
      onSaved={onSaved}
      current={current}
      onRestart={() => setRound((r) => r + 1)}
      remove={current ? { run: remove, pending: removing, failed: removeFailed } : null}
    />
  );
}

function PhoneSteps({
  id,
  open,
  onClose,
  onSaved,
  current,
  onRestart,
  remove,
}: DialogProps & {
  id: string;
  current: string | null;
  onRestart: () => void;
  remove: { run: () => void; pending: boolean; failed: boolean } | null;
}) {
  const t = useTranslations("settings.phone");
  const d = useTranslations("settings.dialogs");
  const closeLabel = d("close");
  const cancelLabel = d("cancel");
  const [state, run, pending] = useActionState<PhoneState, FormData>(phoneStep, { step: "number" });
  // The number stays as typed after an error; a stored number outside the SMS countries starts from Hungary.
  const [number, setNumber] = useState(() => {
    const split = splitPhone(current);
    return (SMS_COUNTRIES as readonly string[]).includes(split.country) ? split : { country: "HU" as const, national: "" };
  });
  const [, startResend] = useTransition();
  // Every answer from the server clears the boxes, so a wrong code can be typed again straight away.
  const [seen, setSeen] = useState(state);
  const [answers, setAnswers] = useState(0);
  if (seen !== state) {
    setSeen(state);
    setAnswers(answers + 1);
  }
  const form = useRef<HTMLFormElement>(null);
  const resend = () =>
    startResend(() => {
      const data = new FormData();
      data.set("intent", "send");
      data.set("phone", state.phone ?? "");
      run(data);
    });
  const left = useCountdown(state.step === "code" ? state.at : undefined);
  useEffect(() => {
    if (state.step === "done") onSaved(t("saved"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report the result once
  }, [state.step]);
  const error = state.error ? t(`errors.${state.error}`) : undefined;
  const cancel = (
    <button type="button" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">
      {cancelLabel}
    </button>
  );

  if (state.step === "number")
    return (
      <Dialog open={open} onClose={onClose} title={t("title")} description={t("lead")} closeLabel={closeLabel}>
        <form action={run} className="flex flex-col gap-4">
          <input type="hidden" name="intent" value="send" />
          <PhoneInput
            id={`${id}-phone`}
            name="phone"
            label={t("label")}
            countries={SMS_COUNTRIES}
            country={number.country}
            value={number.national}
            onChange={(country, national) => setNumber({ country, national })}
            required
            error={error}
          />
          {remove?.failed && <Notice kind="error">{t("errors.generic")}</Notice>}
          <DialogActions>
            {remove && (
              <button
                type="button"
                onClick={remove.run}
                aria-disabled={remove.pending || undefined}
                className="mr-auto inline-flex h-11 items-center justify-center rounded-lg px-1 text-sm font-medium text-danger-ink hover:underline sm:h-10"
              >
                {t("remove")}
              </button>
            )}
            {cancel}
            <Button pending={pending}>{t("send")}</Button>
          </DialogActions>
        </form>
      </Dialog>
    );

  // Code step (also stays open on a wrong or expired code, or a failed resend).
  const codeError = state.error === "code" || state.error === "expired" ? error : undefined;
  const formError = codeError ? undefined : error;
  return (
    <Dialog open={open} onClose={onClose} title={t("codeTitle")} description={t("codeText", { phone: formatPhone(state.phone ?? "") })} closeLabel={closeLabel}>
      <form ref={form} action={run} className="flex flex-col gap-4">
        <input type="hidden" name="intent" value="confirm" />
        <CodeInput key={answers} id={`${id}-code`} name="code" label={t("codeLabel")} autoFocus fill error={codeError} onComplete={() => form.current?.requestSubmit()} />
        {formError && <Notice kind="error">{formError}</Notice>}
        <div className="flex flex-col items-start gap-1 text-[13px]">
          {left > 0 ? (
            <p className="py-1 text-muted" aria-live="off">
              {t("resendIn", { seconds: left })}
            </p>
          ) : (
            <button type="button" onClick={resend} disabled={pending} className="inline-flex min-h-11 items-center font-medium text-brand hover:underline sm:min-h-8">
              {t("resend")}
            </button>
          )}
          <button type="button" onClick={onRestart} className="inline-flex min-h-11 items-center font-medium text-brand hover:underline sm:min-h-8">
            {t("other")}
          </button>
        </div>
        <DialogActions>
          {cancel}
          <Button pending={pending}>{t("confirm")}</Button>
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

function PasswordDialog({ open, onClose, onSaved, first }: DialogProps & { first: boolean }) {
  const t = useTranslations("settings.dialogs");
  const id = useId();
  const { run, pending, fieldError, formError } = useSettingsAction(changePassword, onSaved);
  return (
    <Dialog open={open} onClose={onClose} title={first ? t("passwordFirstTitle") : t("passwordTitle")} description={first ? t("passwordFirstLead") : t("passwordLead")} closeLabel={t("close")}>
      <form action={run} className="flex flex-col gap-4">
        {first ? (
          <input type="hidden" name="first" value="1" />
        ) : (
          <PasswordField id={`${id}-cur`} name="currentPassword" label={t("currentPassword")} autoComplete="current-password" error={fieldError("currentPassword")} />
        )}
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
