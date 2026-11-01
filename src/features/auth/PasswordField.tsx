"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { FieldError, INPUT_CLASS, Label } from "@/components/ui/form";
import { checkPassword, PASSWORD_RULES } from "./password";

/** Password input with a show/hide toggle; with `rules`, a live checklist of the password requirements. */
export function PasswordField({
  id,
  label,
  autoComplete,
  rules = false,
  error,
  aside,
  name = "password",
}: {
  id: string;
  label: string;
  /** Form field name; "password" unless a form has two password fields. */
  name?: string;
  autoComplete: "current-password" | "new-password";
  rules?: boolean;
  error?: string;
  /** Shown at the end of the label row, e.g. the "Forgot password?" link. */
  aside?: React.ReactNode;
}) {
  const t = useTranslations("auth");
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const met = checkPassword(value);
  const describedBy = [rules && `${id}-rules`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {aside ? (
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={id}>{label}</Label>
          {aside}
        </div>
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${INPUT_CLASS} pr-16`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={t("showPassword")}
          aria-pressed={visible}
          className="absolute inset-y-0 right-1 my-auto h-9 rounded-md px-2.5 text-[13px] font-medium text-muted hover:text-ink sm:h-8"
        >
          {visible ? t("hide") : t("show")}
        </button>
      </div>
      {rules && (
        <ul id={`${id}-rules`} aria-label={t("rules.label")} className="mt-0.5 flex flex-col gap-1.5">
          {PASSWORD_RULES.map((rule) => (
            <li key={rule} className={`flex items-center gap-2 text-[12.5px] ${met[rule] ? "text-ok-ink" : "text-muted"}`}>
              <span
                aria-hidden="true"
                className={`inline-flex size-4 items-center justify-center rounded-full border ${met[rule] ? "border-ok-soft bg-ok-soft" : "border-line bg-paper"}`}
              >
                {met[rule] && <Icon name="check" size={10} strokeWidth={3} />}
              </span>
              {t(`rules.${rule}`)}
              <span className="sr-only">{met[rule] ? t("rules.met") : t("rules.unmet")}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  );
}
