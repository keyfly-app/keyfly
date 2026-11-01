"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { FieldError, INPUT_CLASS, Label } from "@/components/ui/form";
import { pickAddress, suggestAddresses } from "./actions";
import type { FoundAddress, Suggestion } from "./places";

const DEBOUNCE_MS = 250;
/** The standard field with room for the search icon; 16 px text so phones don't zoom in. */
const SEARCH_INPUT = INPUT_CLASS.replace("px-3.5", "pr-3.5 pl-10.5").replace("text-[15px]", "text-base");

/**
 * "Search address" combobox (approved design: canvas "Címkereső (Google)"). Suggestions come from our
 * server (Google Places), so the browser never contacts Google. One session token covers the typing
 * and the pick (Google bills them as one search). If the search is unavailable, `onUnavailable` hands over
 * to manual entry.
 */
export function AddressSearch({
  onPick,
  onManual,
  onUnavailable,
  error,
}: {
  onPick: (address: FoundAddress) => void;
  onManual: () => void;
  onUnavailable: () => void;
  error?: string;
}) {
  const t = useTranslations("leaseRequest.addressSearch");
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [searched, setSearched] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const session = useRef<string>("");
  const latest = useRef(0);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) return;
    const run = ++latest.current;
    const timer = setTimeout(async () => {
      session.current ||= crypto.randomUUID();
      const result = await suggestAddresses(text, session.current);
      if (run !== latest.current) return; // a newer keystroke won
      if (result.status === "unavailable") return onUnavailable();
      setItems(result.suggestions);
      setSearched(text);
      setActive(result.suggestions.length ? 0 : -1);
      setOpen(true);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, onUnavailable]);

  const choose = async (item: Suggestion) => {
    setBusy(true);
    const result = await pickAddress(item.placeId, session.current);
    session.current = ""; // the pick closes Google's billing session
    setBusy(false);
    setOpen(false);
    if (result.status === "unavailable") return onUnavailable();
    onPick(result.address);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && active >= 0 && items[active]) {
      e.preventDefault();
      void choose(items[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length >= 3;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-input`}>{t("label")}</Label>
      <div className="relative">
        <Icon name="search" size={18} strokeWidth={1.75} className="pointer-events-none absolute top-[15px] left-3.5 text-muted" />
        <input
          id={`${id}-input`}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-busy={busy || undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 3) setOpen(false);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t("placeholder")}
          autoComplete="off"
          spellCheck={false}
          maxLength={120}
          className={SEARCH_INPUT}
        />
        {showList && (
          <div className="absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_12px_32px_rgb(12_31_25/0.12)]">
            {items.length ? (
              <ul id={listId} role="listbox" aria-label={t("suggestions")}>
                {items.map((item, i) => (
                  <li
                    key={item.placeId}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void choose(item)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex min-h-13 cursor-pointer items-start gap-2.5 border-b border-line px-3.5 py-2.5 ${i === active ? "bg-mist" : ""}`}
                  >
                    <Icon name="pin" size={18} strokeWidth={1.75} className="mt-0.5 flex-none text-muted" />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[15px] font-semibold">{item.main}</span>
                      <span className="text-[13px] text-muted">{item.secondary}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div id={listId} className="flex flex-col gap-1 border-b border-line px-3.5 pt-4 pb-3.5">
                <p className="text-sm">
                  {t("none")} <b className="font-semibold">„{searched}”</b>
                </p>
                <p className="text-[13px] text-muted">{t("noneHint")}</p>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onManual}
                  className="mt-2 inline-flex h-11 items-center self-start rounded-lg border border-field bg-surface px-4 text-sm font-medium hover:border-ink"
                >
                  {t("manualButton")}
                </button>
              </div>
            )}
            {items.length > 0 && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onManual}
                className="flex min-h-11 w-full items-center border-b border-line pr-3.5 pl-10.5 text-left text-[13px] font-medium text-brand"
              >
                {t("manual")}
              </button>
            )}
            <p className="bg-paper px-3.5 py-2 text-right text-[11px] tracking-[0.02em] text-muted">Powered by Google</p>
          </div>
        )}
      </div>
      <p role="status" className="sr-only">
        {showList ? (items.length ? t("count", { count: items.length }) : t("none")) : ""}
      </p>
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  );
}
