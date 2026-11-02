"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { CodeInput } from "@/components/ui/CodeInput";
import { Button, Notice } from "@/components/ui/form";
import { confirmTwoStep, startTwoStep, type ConfirmState, type SetupState } from "./actions";

const IDLE: ConfirmState = { status: "idle" };

function Step({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="flex items-center justify-center gap-2 text-sm font-semibold">
      <span aria-hidden="true" className="flex size-[22px] items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
        {n}
      </span>
      {title}
    </h2>
  );
}

/** "JBSWY3DPEHPK3PXP" → "JBSW Y3DP EHPK 3PXP": easier to type by hand. */
const grouped = (secret: string) => secret.replace(/(.{4})/g, "$1 ").trim();

/**
 * Turning on two-step verification (canvas "Kétlépcsős azonosítás 1–2"): one centred column.
 * 1: connect the authenticator (QR code on computers, "open in app" on phones, or the key by hand) and type its code;
 * 2: the ten backup codes, shown once – download or copy, confirm they are saved.
 */
export function TwoStepSetup({ backHref, homeHref }: { backHref: string; homeHref: string }) {
  const t = useTranslations("security.setup");
  const flow = useTranslations("leaseRequest.flow");
  const router = useRouter();
  const id = useId();
  const top = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [setup, setSetup] = useState<SetupState | { status: "loading" }>({ status: "loading" });
  const [state, action, pending] = useActionState(confirmTwoStep, IDLE);
  const [saved, setSaved] = useState(false);
  const [savedError, setSavedError] = useState(false);
  const step = state.status === "codes" ? 1 : 0;
  const steps = [t("steps.app"), t("steps.codes")];

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startTwoStep().then(setSetup, () => setSetup({ status: "error" }));
  }, []);
  useEffect(() => {
    if (step === 1) top.current?.focus();
  }, [step]);

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(message);
    } catch {
      toast(t("copyFailed"), "error");
    }
  };
  const codesText = state.status === "codes" ? state.codes.join("\n") : "";
  const download = () => {
    const blob = new Blob([`${t("fileTitle")}\n\n${codesText}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "keyfly-backup-codes.txt" });
    a.click();
    URL.revokeObjectURL(url);
  };
  const finish = () => {
    if (!saved) return setSavedError(true);
    toast(t("done"));
    router.push(backHref);
  };

  const error = state.status === "error" ? t(`errors.${state.error}`) : undefined;
  const primary =
    step === 0 ? (
      <Button pending={pending} formId={`${id}-form`}>
        {t("verify")}
      </Button>
    ) : (
      <button type="button" onClick={finish} className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-soft sm:h-10">
        {t("finish")}
      </button>
    );

  return (
    <div className="flex min-h-dvh flex-col bg-surface sm:bg-paper">
      <FlowHeader
        title={t("title")}
        steps={steps}
        current={step}
        homeHref={homeHref}
        onCancel={() => router.push(backHref)}
        labels={{
          progress: flow("progress"),
          stepOf: flow("stepOf", { step: step + 1, total: steps.length }),
          done: flow("done"),
          current: flow("current"),
          back: t("back"),
          cancel: flow("cancel"),
          home: flow("home"),
        }}
      />
      <main className="flex flex-1 justify-center px-5 pt-6 pb-8 sm:px-8 sm:pt-10 sm:pb-14">
        <section className="flex w-full max-w-[520px] flex-col gap-7 sm:rounded-2xl sm:border sm:border-line sm:bg-surface sm:p-10">
          <div ref={top} tabIndex={-1} className="flex flex-col items-center gap-4 text-center outline-none">
            <span aria-hidden="true" className="flex size-[52px] items-center justify-center rounded-2xl bg-mist text-brand">
              <Icon name={step === 0 ? "shield" : "key"} size={24} />
            </span>
            <div className="flex flex-col gap-1.5">
              <h1 className="font-display text-[20px] leading-[26px] font-semibold sm:text-[22px] sm:leading-7">{step === 0 ? t("title1") : t("title2")}</h1>
              <p className="text-sm text-muted">{step === 0 ? t("lead1") : t("lead2")}</p>
            </div>
          </div>

          {step === 0 && setup.status === "error" && <Notice kind="error">{t("errors.generic")}</Notice>}

          {step === 0 && setup.status !== "error" && (
            <form id={`${id}-form`} action={action} className="flex flex-col gap-7">
              <input type="hidden" name="factorId" value={setup.status === "ready" ? setup.factorId : ""} />
              <div className="flex flex-col items-center gap-4 border-t border-line pt-7 text-center">
                <Step n={1} title={t("scan")} />
                <div className="hidden rounded-2xl border border-line bg-white p-3.5 shadow-[0_1px_2px_rgb(12_31_25/0.04)] sm:block">
                  {setup.status === "ready" ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Supabase returns the QR code as an SVG data URL
                    <img src={setup.qrCode} alt={t("qrAlt")} width={176} height={176} className="size-44" />
                  ) : (
                    <span aria-hidden="true" className="block size-44 animate-pulse rounded-lg bg-paper motion-reduce:animate-none" />
                  )}
                </div>
                {setup.status === "ready" && (
                  <a href={setup.uri} className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-field bg-surface px-4 text-sm font-medium sm:hidden">
                    {t("openApp")}
                  </a>
                )}
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[13px] text-muted">{t("keyLabel")}</p>
                  <div className="flex items-center gap-1.5 rounded-full border border-line bg-paper/60 py-1 pr-1 pl-3.5">
                    <code className="font-mono text-sm tracking-[0.08em] whitespace-nowrap">{setup.status === "ready" ? grouped(setup.secret) : "···· ···· ···· ····"}</code>
                    <button
                      type="button"
                      disabled={setup.status !== "ready"}
                      onClick={() => setup.status === "ready" && copy(setup.secret, t("keyCopied"))}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] font-medium hover:border-ink disabled:opacity-60 sm:h-8"
                    >
                      <Icon name="copy" size={14} />
                      {t("copy")}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-4 border-t border-line pt-7">
                <Step n={2} title={t("type")} />
                <div className="w-full">
                  <CodeInput id={`${id}-code`} name="code" label={t("type")} hideLabel align="center" error={error} />
                </div>
              </div>
              <div className="hidden flex-col gap-3 sm:flex">
                {primary}
                <button type="button" onClick={() => router.push(backHref)} className="inline-flex min-h-9 items-center justify-center gap-1.5 self-center text-sm font-medium hover:underline">
                  <Icon name="back" size={16} />
                  {t("back")}
                </button>
              </div>
            </form>
          )}

          {step === 1 && state.status === "codes" && (
            <div className="flex flex-col gap-5">
              <ul aria-label={t("title2")} className="grid grid-cols-2 gap-x-8 gap-y-1 rounded-xl border border-line bg-paper/60 px-5 py-4 font-mono text-[15px] tracking-[0.04em]">
                {state.codes.map((c) => (
                  <li key={c} className="py-1.5">
                    {c}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={download} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-field bg-surface px-4 text-sm font-medium hover:border-ink sm:h-10 sm:flex-none">
                  <Icon name="download" size={16} />
                  {t("download")}
                </button>
                <button type="button" onClick={() => copy(codesText, t("codesCopied"))} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-field bg-surface px-4 text-sm font-medium hover:border-ink sm:h-10 sm:flex-none">
                  <Icon name="copy" size={16} />
                  {t("copy")}
                </button>
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={saved}
                  onChange={(e) => {
                    setSaved(e.target.checked);
                    setSavedError(false);
                  }}
                  aria-invalid={savedError || undefined}
                  aria-describedby={savedError ? `${id}-saved-error` : undefined}
                  className="mt-0.5 size-[18px] flex-none accent-ink"
                />
                {t("saved")}
              </label>
              {savedError && (
                <p id={`${id}-saved-error`} className="-mt-3 text-[13px] font-medium text-danger-ink">
                  {t("savedError")}
                </p>
              )}
              <div className="hidden sm:flex">{primary}</div>
            </div>
          )}
        </section>
      </main>
      <div className="sticky bottom-0 z-10 border-t border-line bg-surface px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] sm:hidden">{primary}</div>
    </div>
  );
}
