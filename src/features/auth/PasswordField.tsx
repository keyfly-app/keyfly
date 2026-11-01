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
}: {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  rules?: boolean;
  error?: string;
}) {
  const t = useTranslations("auth");
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const met = checkPassword(value);
  const describedBy = [rules && `${id}-rules`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${INPUT_CLASS} pr-20`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={t("showPassword")}
          aria-pressed={visible}
          className="absolute top-0.5 right-1 h-11 rounded-lg px-3 text-[13px] font-semibold text-brand"
        >
          {visible ? t("hide") : t("show")}
        </button>
      </div>
      {rules && (
        <ul id={`${id}-rules`} aria-label={t("rules.label")} className="mt-0.5 flex flex-col gap-1.5">
          {PASSWORD_RULES.map((rule) => (
            <li key={rule} className={`flex items-center gap-2 text-[13px] ${met[rule] ? "text-ink" : "text-muted"}`}>
              <span
                aria-hidden="true"
                className={`inline-flex size-4 items-center justify-center rounded-full border-[1.5px] ${met[rule] ? "border-brand bg-brand text-white" : "border-field bg-surface"}`}
              >
                {met[rule] && <Icon name="check" size={10} strokeWidth={3.2} />}
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
