import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

/**
 * App v2.2 controls: 40 px on desktop, 44 px on phones (touch), 8 px corners, 3:1 field border, visible focus.
 * Phones get 16 px text so iOS does not zoom into the field.
 */
export const INPUT_CLASS =
  "h-11 w-full min-w-0 rounded-lg border border-field bg-surface px-3 text-base text-ink tabular-nums transition-[border-color,box-shadow] placeholder:text-muted/70 focus:border-brand focus:shadow-[0_0_0_3px_rgb(14_90_67/0.16)] focus-visible:outline-none aria-invalid:border-danger-ink aria-invalid:shadow-[0_0_0_3px_rgb(138_28_28/0.1)] motion-reduce:transition-none sm:h-10 sm:text-sm";

const BUTTON = {
  primary: "bg-ink text-white shadow-[0_1px_2px_rgb(12_31_25/0.16)] hover:bg-ink-soft",
  secondary: "border border-field bg-surface text-ink hover:border-ink",
  danger: "bg-danger-ink text-white hover:bg-danger-ink/90",
} as const;
const BUTTON_BASE =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors aria-disabled:cursor-progress aria-disabled:opacity-80 motion-reduce:transition-none sm:h-10";

/** Classes of a button-looking control that is not one of the components below (a mailto link, a client-side retry). */
export function buttonClass(variant: keyof typeof BUTTON = "primary", fit = false) {
  return `${BUTTON_BASE} ${BUTTON[variant]} ${fit ? "sm:w-auto" : ""}`;
}

/** The small spinner shown in a button while its action runs. */
function Spinner() {
  return <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80 motion-reduce:animate-none" />;
}

export function Button({
  children,
  variant = "primary",
  pending = false,
  formAction,
  name,
  value,
  fit = false,
  formId,
}: {
  children: React.ReactNode;
  variant?: keyof typeof BUTTON;
  pending?: boolean;
  formAction?: (form: FormData) => void;
  name?: string;
  value?: string;
  /** Full width on phones, as wide as the label from 640 px. */
  fit?: boolean;
  /** Submits this form when the button sits outside it (e.g. in a sticky bar). */
  formId?: string;
}) {
  return (
    <button
      type="submit"
      form={formId}
      formAction={formAction}
      name={name}
      value={value}
      aria-disabled={pending || undefined}
      onClick={pending ? (e) => e.preventDefault() : undefined}
      className={buttonClass(variant, fit)}
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, children, variant = "primary", fit = false }: { href: string; children: React.ReactNode; variant?: keyof typeof BUTTON; fit?: boolean }) {
  return (
    <Link href={href} className={buttonClass(variant, fit)}>
      {children}
    </Link>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center text-[13px] font-medium text-brand underline-offset-3 hover:underline sm:min-h-6">
      {children}
    </Link>
  );
}

export function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[13px] font-medium">
      {children}
    </label>
  );
}

/** "(nem kötelező)" after a label, quieter than the label itself. */
export function Optional({ children }: { children?: React.ReactNode }) {
  return children ? <span className="font-normal text-muted">{children}</span> : null;
}

export function FieldHint({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="text-[12.5px] leading-[18px] text-muted">
      {children}
    </p>
  );
}

export function TextField({
  id,
  label,
  error,
  hint,
  optional,
  ...input
}: { id: string; label: string; error?: string; hint?: string; optional?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const described = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        <Optional>{optional}</Optional>
      </Label>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={described} className={INPUT_CLASS} {...input} />
      {hint && <FieldHint id={`${id}-hint`}>{hint}</FieldHint>}
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  );
}

export function Checkbox({
  name,
  defaultChecked,
  error,
  id,
  children,
}: {
  name: string;
  defaultChecked?: boolean;
  error?: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex min-h-6 cursor-pointer items-start gap-2.5 text-[13px] leading-[18px]">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-px size-4 flex-none accent-ink"
        />
        <span>{children}</span>
      </label>
      {error && <FieldError id={`${id}-error`} message={error} className="pl-6.5" />}
    </div>
  );
}

export function FieldError({ id, message, className = "" }: { id: string; message: string; className?: string }) {
  return (
    <p id={id} className={`flex items-start gap-1.5 text-[12.5px] leading-[18px] font-medium text-danger-ink ${className}`}>
      <Icon name="alert" size={14} strokeWidth={2.2} className="mt-0.5 flex-none" />
      <span>{message}</span>
    </p>
  );
}

const NOTICE = {
  error: "bg-danger-soft text-danger-ink",
  warning: "bg-warning-soft text-warning-ink",
  success: "bg-ok-soft text-ok-ink",
  info: "bg-info-soft text-info-ink",
} as const;

/** Banner above or inside a form. Errors are announced to screen readers. */
export function Notice({ kind, children, icon = kind === "success" ? "check" : "alert" }: { kind: keyof typeof NOTICE; children: React.ReactNode; icon?: IconName }) {
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-[13px] leading-[18px] font-medium ${NOTICE[kind]}`}>
      <Icon name={icon} size={16} strokeWidth={2} className="mt-px flex-none" />
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 text-[12.5px] text-muted">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Screen title (Sora 22) with an optional line under it. `eyebrow`: a small step or context label above. */
export function PageTitle({ children, eyebrow, sub }: { children: React.ReactNode; eyebrow?: string; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {eyebrow && <p className="text-xs font-medium text-muted">{eyebrow}</p>}
      <h1 className="font-display text-[22px] leading-7 font-semibold">{children}</h1>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </div>
  );
}

/** Two-step progress (admin sign-in): "Step 1 of 2" and two bars. */
export function StepProgress({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div aria-hidden="true" className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-[3px] flex-1 rounded-sm ${i < step ? "bg-ink" : "bg-line"}`} />
        ))}
      </div>
    </div>
  );
}

/** The App v2.2 card on the paper ground (sign-in, dialogs, panels). */
export const CARD_CLASS =
  "rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgb(12_31_25/0.04),0_16px_40px_-24px_rgb(12_31_25/0.22)]";
