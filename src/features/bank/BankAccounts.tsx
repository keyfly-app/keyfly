"use client";

import { useActionState, useEffect, useId, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, Checkbox, INPUT_CLASS, Label, Notice, TextField } from "@/components/ui/form";
import { MenuPopover } from "@/components/ui/MenuPopover";
import { Tag } from "@/components/ui/Tag";
import { bankOf, CURRENCIES, domesticFromIban, groupIban, parseAccount } from "@/lib/bank-account";
import { deleteBankAccount, makePrimary, saveBankAccount, type BankState } from "./actions";

export type BankAccountRow = { id: string; currency: string; iban: string; holder_name: string; label: string | null; is_primary: boolean };

const ITEM = "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium hover:bg-paper focus-visible:bg-paper sm:min-h-9 sm:px-2.5";
const SECONDARY = "inline-flex h-11 items-center justify-center rounded-lg border border-field bg-surface px-4 text-sm font-medium hover:border-ink sm:h-10";

/** "HUF" → "magyar forint" in the page's language. */
function useCurrencyName() {
  const locale = useLocale();
  return useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "currency" });
    return (code: string) => names.of(code) ?? code;
  }, [locale]);
}

/** How a stored IBAN is shown: Hungarian accounts as 8-8(-8), the rest as the IBAN in groups of four. */
const shownNumber = (iban: string) => domesticFromIban(iban) ?? groupIban(iban);

/**
 * Bankszámlák (canvas V23BankCeg / V23BankSzemelyesUres): the accounts of one Keyfly account, several per currency,
 * one primary in each. Owners and admins add, change and delete them; other members only see them.
 */
export function BankAccounts({ accountId, accounts, manage, defaultHolder }: { accountId: string; accounts: BankAccountRow[]; manage: boolean; defaultHolder: string }) {
  const t = useTranslations("settings.bank");
  const headingId = useId();
  const router = useRouter();
  const pathname = usePathname();
  // "?add" opens the add dialog, so the page header's button and other screens (insurance, claims) can link to it.
  const adding = useSearchParams().has("add");
  const [changing, setChanging] = useState<BankAccountRow | null>(null);
  const editing: BankAccountRow | "new" | null = manage && adding ? "new" : changing;
  const closeEditor = () => (adding ? router.replace(pathname, { scroll: false }) : setChanging(null));
  const [deleting, setDeleting] = useState<BankAccountRow | null>(null);
  // Forint first, then the usual currencies in their order; the primary one leads each currency.
  const rank = (c: string) => ((CURRENCIES as readonly string[]).indexOf(c) + 1 || 99);
  const sorted = [...accounts].sort((a, b) => rank(a.currency) - rank(b.currency) || a.currency.localeCompare(b.currency) || Number(b.is_primary) - Number(a.is_primary));


  return (
    <>
      {accounts.length === 0 ? (
        <section aria-labelledby={`${headingId}-title`} className="rounded-xl border border-line bg-surface">
          <h2 id={`${headingId}-title`} className="px-5 pt-5 pb-3 text-[15px] font-semibold sm:px-6">
            {t("title")}
          </h2>
          <div className="flex flex-col items-center gap-2.5 border-t border-line px-5 pt-7 pb-8 text-center">
            <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-xl bg-mist text-brand">
              <Icon name="bank" size={20} />
            </span>
            <p className="text-[15px] font-semibold">{t("emptyTitle")}</p>
            <p className="max-w-[380px] text-[13.5px] text-muted">{t("emptyText")}</p>
            {manage && (
              <div className="mt-1.5">
                <AddBankAccount variant="secondary" />
              </div>
            )}
          </div>
        </section>
      ) : (
        <section aria-labelledby={`${headingId}-title`} className="rounded-xl border border-line bg-surface">
          <div className="flex items-baseline justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
            <h2 id={`${headingId}-title`} className="text-[15px] font-semibold">
              {t("card")}
            </h2>
            <span className="text-[13px] text-muted">{t("count", { count: accounts.length })}</span>
          </div>
          <ul>
            {sorted.map((a) => (
              <AccountRow key={a.id} account={a} manage={manage} onEdit={() => setChanging(a)} onDelete={() => setDeleting(a)} />
            ))}
          </ul>
        </section>
      )}
      {editing && (
        <AccountDialog
          accountId={accountId}
          account={editing === "new" ? null : editing}
          defaultHolder={defaultHolder}
          firstInCurrency={(c) => !accounts.some((a) => a.currency === c && a.id !== (editing === "new" ? "" : editing.id))}
          onClose={closeEditor}
        />
      )}
      {deleting && <DeleteDialog account={deleting} onClose={() => setDeleting(null)} />}
    </>
  );
}

/** "Bankszámla hozzáadása": in the page header when there are accounts, in the empty card when there are none. */
export function AddBankAccount({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  const t = useTranslations("settings.bank");
  return (
    <Link
      href="?add"
      scroll={false}
      replace
      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium whitespace-nowrap sm:h-10 sm:w-auto ${variant === "primary" ? "bg-ink text-white hover:bg-ink-soft" : "border border-field bg-surface hover:border-ink"}`}
    >
      <Icon name="plus" size={16} strokeWidth={2} />
      {t("add")}
    </Link>
  );
}

function AccountRow({ account: a, manage, onEdit, onDelete }: { account: BankAccountRow; manage: boolean; onEdit: () => void; onDelete: () => void }) {
  const t = useTranslations("settings.bank");
  const bank = bankOf(a.iban);
  const title = bank?.name ?? a.label ?? t("fallback");
  const [, start] = useTransition();
  const primary = () =>
    start(async () => {
      const { ok } = await makePrimary(a.id);
      toast(ok ? t("primarySet") : t("errors.generic"), ok ? "ok" : "error");
    });
  const hu = Boolean(domesticFromIban(a.iban));
  return (
    <li className="flex items-start gap-3.5 border-t border-line px-4 py-3.5 sm:px-5">
      <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-mist text-brand">
        <Icon name="bank" size={17} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm leading-5 font-semibold">{title}</span>
          <Tag tone="neutral">{a.currency}</Tag>
          {a.is_primary && <Tag tone="ok">{t("primary")}</Tag>}
        </div>
        <div className="flex flex-col gap-px tabular-nums">
          <span className="text-[13.5px] leading-5 font-medium text-ink-soft [overflow-wrap:break-word] sm:text-sm sm:tracking-[0.2px]">{shownNumber(a.iban)}</span>
          {hu && (
            <span className="text-[12.5px] leading-[18px] text-muted [overflow-wrap:break-word]">
              {groupIban(a.iban)}
              {bank?.bic && <span className="max-sm:hidden"> · {bank.bic}</span>}
            </span>
          )}
          {!hu && bank?.bic && <span className="text-[12.5px] leading-[18px] text-muted">{bank.bic}</span>}
          <span className="text-[12.5px] leading-[18px] text-muted">
            {a.holder_name}
            {a.label && bank && ` · ${a.label}`}
          </span>
        </div>
      </div>
      {manage && (
        <MenuPopover
          title={title}
          closeLabel={t("close")}
          align="end"
          width={252}
          trigger={({ ref, open, toggle, menuId }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={t("more", { name: `${title} ${shownNumber(a.iban)}` })}
              className={`-mt-1 flex size-11 flex-none items-center justify-center rounded-lg border text-ink-soft sm:size-9 ${open ? "border-line bg-paper" : "border-transparent hover:bg-paper"}`}
            >
              <Icon name="more" size={18} strokeWidth={2} />
            </button>
          )}
        >
          {!a.is_primary && (
            <button type="button" role="menuitem" onClick={primary} className={ITEM}>
              <Icon name="check" size={16} className="text-muted" />
              {t("makePrimary")}
            </button>
          )}
          <button type="button" role="menuitem" onClick={onEdit} className={ITEM}>
            <Icon name="edit" size={16} className="text-muted" />
            {t("edit")}
          </button>
          <button type="button" role="menuitem" onClick={onDelete} className={`${ITEM} text-danger-ink`}>
            <Icon name="trash" size={16} />
            {t("delete")}
          </button>
        </MenuPopover>
      )}
    </li>
  );
}

/** Bankszámla hozzáadása / módosítása (canvas V23BankUj, V23BankHiba): the number is checked as it is typed. */
function AccountDialog({
  accountId,
  account,
  defaultHolder,
  firstInCurrency,
  onClose,
}: {
  accountId: string;
  account: BankAccountRow | null;
  defaultHolder: string;
  firstInCurrency: (currency: string) => boolean;
  onClose: () => void;
}) {
  const t = useTranslations("settings.bank");
  const id = useId();
  const currencyName = useCurrencyName();
  const [state, run, pending] = useActionState<BankState, FormData>(saveBankAccount, { status: "idle" });
  const [currency, setCurrency] = useState(account?.currency ?? "HUF");
  const [number, setNumber] = useState(account ? shownNumber(account.iban) : "");
  const [touched, setTouched] = useState(false);
  const parsed = parseAccount(number);
  const first = firstInCurrency(currency);
  const currencies: string[] = [...CURRENCIES];
  if (!currencies.includes(currency)) currencies.push(currency);

  useEffect(() => {
    if (state.status !== "saved") return;
    toast(t("saved"), "ok");
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close once per save
  }, [state]);

  const serverField = state.status === "error" ? state.fields : undefined;
  // The client check shows once the field is left (or on save); the server's answer always shows.
  const numberError =
    serverField?.number === "duplicate"
      ? t("errors.duplicate")
      : (touched || serverField?.number) && !parsed.ok
        ? t(`errors.${parsed.error}`)
        : undefined;
  const holderError = serverField?.holder ? t("errors.holder") : undefined;
  const formError = state.status === "error" && state.error ? t(`errors.${state.error}`) : undefined;

  return (
    <Dialog open onClose={onClose} title={account ? t("editTitle") : t("addTitle")} closeLabel={t("close")} wide>
      <form action={run} onSubmit={() => setTouched(true)} className="flex flex-col gap-4">
        {account && <input type="hidden" name="id" value={account.id} />}
        <input type="hidden" name="accountId" value={accountId} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-currency`}>{t("currency")}</Label>
          <select id={`${id}-currency`} name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${INPUT_CLASS} appearance-auto`}>
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c} – {currencyName(c)}
              </option>
            ))}
          </select>
        </div>
        <TextField
          id={`${id}-number`}
          name="number"
          label={t("number")}
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          onBlur={() => number.trim() && setTouched(true)}
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={42}
          required
          placeholder="11773016-11111018"
          error={numberError}
          className={`${INPUT_CLASS} tabular-nums`}
        />
        {parsed.ok && <Recognised iban={parsed.iban} />}
        <TextField id={`${id}-holder`} name="holder" label={t("holder")} defaultValue={account?.holder_name ?? defaultHolder} autoComplete="name" maxLength={200} required error={holderError} />
        <TextField id={`${id}-label`} name="label" label={t("label")} optional={t("optional")} defaultValue={account?.label ?? ""} maxLength={60} />
        {/* The first account in a currency is always its primary one. */}
        {first ? (
          <input type="hidden" name="primary" value="on" />
        ) : (
          <Checkbox key={currency} id={`${id}-primary`} name="primary" defaultChecked={account?.is_primary ?? false}>
            {t("primaryIn", { currency })}
          </Checkbox>
        )}
        {formError && <Notice kind="error">{formError}</Notice>}
        <DialogActions>
          <button type="button" onClick={onClose} className={SECONDARY}>
            {t("cancel")}
          </button>
          <Button pending={pending} fit>
            {account ? t("save") : t("addButton")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** "Érvényes számlaszám": what we read from the number – bank, BIC and IBAN (country for accounts abroad). */
function Recognised({ iban }: { iban: string }) {
  const t = useTranslations("settings.bank");
  const locale = useLocale();
  const bank = bankOf(iban);
  const country = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }).of(iban.slice(0, 2)) ?? iban.slice(0, 2), [locale, iban]);
  const rows: [string, string][] = [
    ...(bank ? ([[t("bank"), bank.name]] as [string, string][]) : []),
    ...(bank?.bic ? ([[t("bic"), bank.bic]] as [string, string][]) : []),
    ...(iban.startsWith("HU") ? [] : ([[t("country"), country]] as [string, string][])),
    [t("iban"), groupIban(iban)],
  ];
  return (
    <div role="status" className="flex flex-col gap-1.5 rounded-[10px] border border-ok-ink/15 bg-ok-soft/60 px-3.5 py-3">
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ok-ink">
        <Icon name="check" size={14} strokeWidth={2.5} />
        {t("valid")}
      </span>
      <dl className="flex flex-col gap-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 text-[13px] leading-[18px]">
            <dt className="flex-none text-muted">{k}</dt>
            <dd className="min-w-0 text-right font-medium tabular-nums [overflow-wrap:anywhere]">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DeleteDialog({ account, onClose }: { account: BankAccountRow; onClose: () => void }) {
  const t = useTranslations("settings.bank");
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const remove = () =>
    start(async () => {
      const { ok } = await deleteBankAccount(account.id);
      if (!ok) return setFailed(true);
      toast(t("deleted"), "ok");
      onClose();
    });
  return (
    <Dialog open onClose={onClose} title={t("deleteTitle")} description={t("deleteText", { number: shownNumber(account.iban) })} closeLabel={t("close")}>
      <div className="flex flex-col gap-4">
        {failed && <Notice kind="error">{t("errors.generic")}</Notice>}
        <DialogActions>
          <button type="button" data-autofocus onClick={onClose} className={SECONDARY}>
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={remove}
            aria-disabled={pending || undefined}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-danger-ink px-4 text-sm font-medium text-white hover:bg-danger-ink/90 aria-disabled:opacity-80 sm:h-10 sm:w-auto"
          >
            {t("delete")}
          </button>
        </DialogActions>
      </div>
    </Dialog>
  );
}
