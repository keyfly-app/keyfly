import Link from "next/link";
import { Icon } from "@/components/Icon";

/** Shared look of text inputs in the app (48 px tall, 3:1 border, visible focus). */
export const INPUT_CLASS =
  "h-12 w-full min-w-0 rounded-xl border border-field bg-surface px-3.5 text-[15px] font-medium text-ink tabular-nums placeholder:text-muted/70 focus:border-brand aria-invalid:border-danger-ink";

const BUTTON = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "border border-field bg-surface text-ink hover:border-brand",
} as const;
const BUTTON_BASE =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5.5 text-[15px] font-semibold transition-colors aria-disabled:opacity-70";

export function Button({
  children,
  variant = "primary",
  pending = false,
  formAction,
  name,
  value,
}: {
  children: React.ReactNode;
  variant?: keyof typeof BUTTON;
  pending?: boolean;
  formAction?: (form: FormData) => void;
  name?: string;
  value?: string;
}) {
  return (
    <button
      type="submit"
      formAction={formAction}
      name={name}
      value={value}
      aria-disabled={pending || undefined}
      onClick={pending ? (e) => e.preventDefault() : undefined}
      className={`${BUTTON_BASE} ${BUTTON[variant]}`}
    >
      {children}
    </button>
  );
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: keyof typeof BUTTON }) {
  return (
    <Link href={href} className={`${BUTTON_BASE} ${BUTTON[variant]}`}>
      {children}
    </Link>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-3 hover:underline">
      {children}
    </Link>
  );
}

export function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[13px] font-semibold">
      {children}
    </label>
  );
}

export function TextField({
  id,
  label,
  error,
  ...input
}: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={INPUT_CLASS}
        {...input}
      />
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
      <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-normal">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-px size-5 flex-none accent-brand"
        />
        <span>{children}</span>
      </label>
      {error && <FieldError id={`${id}-error`} message={error} className="pl-7.5" />}
    </div>
  );
}

export function FieldError({ id, message, className = "" }: { id: string; message: string; className?: string }) {
  return (
    <p id={id} className={`flex items-start gap-1.5 text-[13px] font-semibold text-danger-ink ${className}`}>
      <Icon name="alert" size={16} strokeWidth={2.2} className="mt-px flex-none" />
      <span>{message}</span>
    </p>
  );
}

const NOTICE = {
  error: "bg-danger-soft text-danger-ink",
  warning: "bg-warning-soft text-warning-ink",
  success: "bg-mist text-brand",
} as const;

/** Banner above or inside a form. Errors are announced to screen readers. */
export function Notice({ kind, children, icon = kind === "success" ? "check" : "alert" }: { kind: keyof typeof NOTICE; children: React.ReactNode; icon?: "check" | "alert" | "mail" }) {
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold ${NOTICE[kind]}`}>
      <Icon name={icon} size={18} strokeWidth={2} className="mt-px flex-none" />
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 text-[13px] text-muted">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function PageTitle({ children, eyebrow }: { children: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {eyebrow && <p className="text-xs font-semibold tracking-[0.05em] text-muted uppercase">{eyebrow}</p>}
      <h1 className="font-display text-[26px] leading-tight font-semibold">{children}</h1>
    </div>
  );
}
