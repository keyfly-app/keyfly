"use client";

import { useActionState, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { CodeInput } from "@/components/ui/CodeInput";
import { Button, Notice, TextField } from "@/components/ui/form";
import { useBackupCode, verifySignInCode, type ChallengeState } from "./actions";

const IDLE: ChallengeState = { status: "idle" };

/**
 * Sign-in, step 2 (canvas "Belépés – kétlépcsős kód"): the code from the authenticator app, centred; or a backup
 * code when the phone is not at hand. The full code signs in by itself, without pressing the button.
 */
export function ChallengeForm({ next }: { next: string }) {
  const t = useTranslations("security.challenge");
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"app" | "backup">("app");
  const [codeState, codeAction, codePending] = useActionState(verifySignInCode, IDLE);
  const [backupState, backupAction, backupPending] = useActionState(useBackupCode, IDLE);
  const err = (s: ChallengeState) => (s.status === "error" ? t(`errors.${s.error}`) : undefined);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span aria-hidden="true" className="flex size-[52px] items-center justify-center rounded-2xl bg-mist text-brand">
        <Icon name="shield" size={24} />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[22px] leading-7 font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted">{mode === "app" ? t("lead") : t("backupLead")}</p>
      </div>

      {mode === "app" ? (
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
          <Button pending={codePending}>{t("submit")}</Button>
        </form>
      ) : (
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

      <button
        type="button"
        onClick={() => setMode(mode === "app" ? "backup" : "app")}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-3 hover:underline sm:min-h-8"
      >
        {mode === "app" ? t("useBackup") : t("useApp")}
      </button>
    </div>
  );
}
