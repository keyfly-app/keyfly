import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { LogoFull } from "@/components/Logo";
import { buttonClass } from "@/components/ui/form";

type Action = { label: string; icon?: IconName } & ({ href: string; onClick?: never } | { onClick: () => void; href?: never });

/** Two pages, the front one an empty dashed outline (a page that isn't there); errors get a calm amber mark instead. */
function Art({ kind }: { kind: "notFound" | "error" }) {
  return (
    <svg viewBox="0 0 168 128" fill="none" aria-hidden="true" className="h-[115px] w-[151px] sm:h-32 sm:w-[168px]">
      <rect x="30" y="16" width="84" height="92" rx="10" transform="rotate(-7 72 62)" className="fill-paper stroke-line" strokeWidth="1.5" />
      {kind === "notFound" ? (
        <>
          <rect x="44" y="28" width="84" height="92" rx="10" strokeDasharray="5 5" className="fill-surface stroke-fog" strokeWidth="1.5" />
          <circle cx="122" cy="88" r="21" className="fill-surface stroke-brand" strokeWidth="3" />
          <path d="m137 103 12 12" className="stroke-brand" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="122" cy="88" r="5" className="fill-lime" />
        </>
      ) : (
        <>
          <rect x="44" y="28" width="84" height="92" rx="10" className="fill-surface stroke-line" strokeWidth="1.5" />
          {[
            [44, 52],
            [58, 64],
            [72, 40],
          ].map(([y, w]) => (
            <rect key={y} x="58" y={y} width={w} height="6" rx="3" className="fill-line/70" />
          ))}
          <circle cx="124" cy="92" r="20" className="fill-warning-soft stroke-surface" strokeWidth="3" />
          <path d="M124 82v11" className="stroke-warning-ink" strokeWidth="3" strokeLinecap="round" />
          <circle cx="124" cy="100" r="2" className="fill-warning-ink" />
        </>
      )}
    </svg>
  );
}

function ActionButton({ action, variant }: { action: Action; variant: "primary" | "secondary" }) {
  const inner = (
    <>
      {action.icon && <Icon name={action.icon} size={16} strokeWidth={2} />}
      {action.label}
    </>
  );
  if (action.onClick)
    return (
      <button type="button" onClick={action.onClick} className={buttonClass(variant, true)}>
        {inner}
      </button>
    );
  return (
    <Link href={action.href!} className={buttonClass(variant, true)}>
      {inner}
    </Link>
  );
}

/**
 * The 404 and "something went wrong" content (canvas v3 "Hibaoldalak"): picture, what happened, the way on.
 * `code`: the error's reference for support, shown quietly under the buttons.
 */
export function ErrorState({
  kind,
  eyebrow,
  title,
  lead,
  primary,
  secondary,
  code,
}: {
  kind: "notFound" | "error";
  eyebrow?: string;
  title: string;
  lead: string;
  primary: Action;
  secondary: Action;
  code?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col items-center gap-5 text-center sm:gap-[22px]">
      <Art kind={kind} />
      <div className="flex flex-col items-center gap-1.5">
        {eyebrow && <p className="text-[13px] leading-[18px] font-semibold text-muted">{eyebrow}</p>}
        <h1 className="font-display text-2xl leading-[30px] font-semibold text-balance sm:text-[28px] sm:leading-[34px]">{title}</h1>
        <p className="text-[14.5px] leading-[21px] text-pretty text-muted sm:text-[15px] sm:leading-[22px]">{lead}</p>
      </div>
      <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:justify-center">
        <ActionButton action={primary} variant="primary" />
        <ActionButton action={secondary} variant="secondary" />
      </div>
      {code && <p className="text-[12.5px] leading-[17px] tracking-[0.2px] text-muted tabular-nums select-all">{code}</p>}
    </div>
  );
}

/** Frame of an error page outside the app frame: logo (home) and language on top, the content centred, `footer` below. */
export function ErrorFrame({
  home,
  homeLabel,
  language,
  footer,
  children,
}: {
  home: string;
  homeLabel: string;
  language?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="flex h-15 items-center justify-between gap-3 pr-2 pl-4 sm:h-14 sm:px-6">
          <Link href={home} aria-label={homeLabel} className="flex rounded-md">
            <LogoFull height={20} />
          </Link>
          {language}
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">{children}</main>
      {footer}
    </div>
  );
}
