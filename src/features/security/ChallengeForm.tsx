"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { CodeInput } from "@/components/ui/CodeInput";
import { Button, Notice, TextField } from "@/components/ui/form";
import { sendSignInEmailCode, useBackupCode, verifySignInCode, verifySignInEmailCode, type ChallengeState, type EmailCodeState } from "./actions";

const IDLE: ChallengeState = { status: "idle" };
const RESEND_AFTER = 60;

/** Seconds until a new emailed code may be asked for. */
function useResendIn(sentAt: number | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!sentAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentAt]);
  return sentAt ? Math.min(RESEND_AFTER, Math.max(0, RESEND_AFTER - Math.floor((now - sentAt) / 1000))) : 0;
}

const LINK = "inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline-offset-3 hover:underline sm:min-h-8";

/**
 * Sign-in, step 2 (canvas "Belépés – kétlépcsős kód", v2.4 "Kétlépcsős azonosítás – app vagy e-mail"): the code from
 * the authenticator app, centred; without the phone a code by email (5 minutes) or a backup code. A full code signs
 * in by itself. "Ezen az eszközön 30 napig ne kérjen kódot" (unticked) is offered with the app's code only. During a
 * password reset (`reset`) the lead says so and no code goes by email.
 */
export function ChallengeForm({ next, emailTo, reset = false }: { next: string; emailTo: string | null; reset?: boolean }) {
  const t = useTranslations("security.challenge");
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const mailForm = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"app" | "email" | "backup">("app");
  const [codeState, codeAction, codePending] = useActionState(verifySignInCode, IDLE);
  const [backupState, backupAction, backupPending] = useActionState(useBackupCode, IDLE);
  const [mailState, setMailState] = useState<EmailCodeState>({ status: "idle" });
  const [, mailAction, mailPending] = useActionState<EmailCodeState, FormData>(async (prev, data) => {
    const result = await verifySignInEmailCode(prev, data);
    // Keep the time of the last send, so the resend countdown goes on.
    setMailState((before) => (result.status === "error" && before.status !== "idle" ? { ...result, at: before.at } : result));
    return result;
  }, { status: "idle" });
  const [sending, startSend] = useTransition();
  const sentAt = mailState.status === "sent" ? mailState.at : mailState.status === "error" ? mailState.at : undefined;
  const resendIn = useResendIn(sentAt);
  const err = (s: ChallengeState) => (s.status === "error" ? t(`errors.${s.error}`) : undefined);

  const send = () =>
    startSend(async () => {
      const result = await sendSignInEmailCode();
      setMailState(result.status === "error" ? { ...result, at: result.error === "tooSoon" ? Date.now() : sentAt } : result);
      setMode("email");
    });

  const mailError = mailState.status === "error" ? mailState.error : null;
  const codeError = mailError === "format" || mailError === "code" || mailError === "expired" ? t(`emailErrors.${mailError}`) : undefined;
  const otherError = mailError && !codeError ? t(`emailErrors.${mailError}`) : null;

  const lead = mode === "app" ? t(reset ? "resetLead" : "lead") : mode === "backup" ? t("backupLead") : t("emailLead", { email: emailTo ?? "" });
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span aria-hidden="true" className="flex size-[52px] items-center justify-center rounded-2xl bg-mist text-brand">
        <Icon name={mode === "email" ? "mail" : "shield"} size={24} />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[22px] leading-7 font-semibold">{mode === "email" ? t("emailTitle") : t("title")}</h1>
        <p className="text-sm text-muted">{lead}</p>
      </div>

      {mode === "app" && (
        <form ref={form} action={codeAction} className="flex w-full flex-col gap-5">
          <input type="hidden" name="next" value={next} />
          <CodeInput
            id={`${id}-code`}
            name="code"
            label={t("codeLabel")}
            hideLabel
            align="center"
            autoFocus
            error={err(codeState)}
            onComplete={() => form.current?.requestSubmit()}
          />
          <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2.5 text-sm sm:min-h-6">
            <input type="checkbox" name="remember" className="size-[18px] flex-none accent-ink" />
            {t("remember")}
          </label>
          <Button pending={codePending}>{t("submit")}</Button>
        </form>
      )}

      {mode === "email" && (
        <form ref={mailForm} action={mailAction} className="flex w-full flex-col gap-5">
          <input type="hidden" name="next" value={next} />
          <CodeInput
            key={mailState.status === "sent" ? mailState.at : "mail"}
            id={`${id}-mail`}
            name="code"
            label={t("codeLabel")}
            hideLabel
            align="center"
            autoFocus
            error={codeError}
            onComplete={() => mailForm.current?.requestSubmit()}
          />
          {otherError && <Notice kind="error">{otherError}</Notice>}
          <Button pending={mailPending}>{t("submit")}</Button>
          <div className="flex flex-col items-center gap-1">
            {resendIn > 0 ? (
              <p className="text-[13px] font-medium text-muted tabular-nums" aria-live="polite">
                {t("resendIn", { time: `0:${String(resendIn).padStart(2, "0")}` })}
              </p>
            ) : (
              <button type="button" onClick={send} disabled={sending} className={`${LINK} text-brand`}>
                {t("resend")}
              </button>
            )}
            <button type="button" onClick={() => setMode("app")} className={`${LINK} text-ink-soft`}>
              {t("useAppInstead")}
            </button>
          </div>
        </form>
      )}

      {mode === "backup" && (
        <form action={backupAction} className="flex w-full flex-col gap-4 text-left">
          <TextField
            id={`${id}-backup`}
            name="backup"
            label={t("backupLabel")}
            autoComplete="one-time-code"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={12}
            placeholder="xxxx-xxxx"
            error={backupState.status === "error" && backupState.error === "backup" ? err(backupState) : undefined}
          />
          {backupState.status === "error" && backupState.error !== "backup" && <Notice kind="error">{err(backupState)}</Notice>}
          <Notice kind="info" icon="info">
            {t("backupNote")}
          </Notice>
          <Button pending={backupPending}>{t("submit")}</Button>
        </form>
      )}

      {mode === "app" && (
        <div className="flex w-full flex-col items-center gap-0.5 border-t border-line pt-4">
          <p className="text-[13px] font-medium text-muted">{t("noPhone")}</p>
          {emailTo && (
            <button type="button" onClick={send} disabled={sending} aria-busy={sending || undefined} className={`${LINK} text-brand`}>
              <Icon name="mail" size={16} strokeWidth={2} />
              {t("byEmail")}
            </button>
          )}
          <button type="button" onClick={() => setMode("backup")} className={`${LINK} text-ink-soft`}>
            {t("useBackup")}
          </button>
        </div>
      )}
      {mode === "backup" && (
        <button type="button" onClick={() => setMode("app")} className={`${LINK} text-brand`}>
          {t("useApp")}
        </button>
      )}
    </div>
  );
}
