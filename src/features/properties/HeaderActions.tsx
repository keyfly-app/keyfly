"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, buttonClass } from "@/components/ui/form";
import { MenuPopover } from "@/components/ui/MenuPopover";
import { archiveProperty } from "./actions";

/** The Keyfly ID with a copy button next to it. */
export function CopyCode({ code }: { code: string }) {
  const t = useTranslations("properties.detail");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast(t("copied", { code }));
    } catch {
      // Clipboard refused (e.g. an insecure context): the ID is on screen to select by hand.
    }
  };
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="font-mono text-[12.5px] font-semibold tracking-[0.04em] text-ink">{code}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={t("copyId")}
        className="flex size-11 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-ink sm:size-7"
      >
        <Icon name="copy" size={14} strokeWidth={1.9} />
      </button>
    </span>
  );
}

/** The ⋯ menu: archive, behind a confirm dialog; then back to the list. */
export function PropertyMenu({ propertyId, accountId, listHref }: { propertyId: string; accountId: string; listHref: string }) {
  const router = useRouter();
  const t = useTranslations("properties.detail");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<"hasLease" | "error" | null>(null);
  const [pending, start] = useTransition();
  const archive = () =>
    start(async () => {
      const result = await archiveProperty(propertyId, accountId);
      if (result.status === "error") return setError(result.error === "hasLease" ? "hasLease" : "error");
      toast(t("archive.done"));
      router.push(listHref);
    });
  return (
    <>
      <MenuPopover
        title={t("more")}
        closeLabel={t("close")}
        align="end"
        width={240}
        trigger={({ ref, open, toggle, menuId }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            aria-label={t("more")}
            className="flex size-11 flex-none items-center justify-center rounded-lg border border-field bg-surface text-ink hover:border-ink sm:size-10"
          >
            <Icon name="more" size={18} />
          </button>
        )}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setError(null);
            setConfirm(true);
          }}
          className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-paper focus-visible:bg-paper sm:min-h-10"
        >
          <Icon name="storage" size={17} strokeWidth={1.75} className="flex-none text-muted" />
          {t("archive.menu")}
        </button>
      </MenuPopover>
      <Dialog open={confirm} onClose={() => setConfirm(false)} title={t("archive.title")} description={t("archive.text")} closeLabel={t("close")}>
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-[13.5px] text-danger-ink">
            {t(error === "hasLease" ? "archive.hasLease" : "archive.error")}
          </p>
        )}
        <DialogActions>
          <button type="button" onClick={() => setConfirm(false)} className={buttonClass("secondary")} data-autofocus>
            {t("archive.cancel")}
          </button>
          <form action={archive}>
            <Button variant="danger" pending={pending}>
              {t("archive.confirm")}
            </Button>
          </form>
        </DialogActions>
      </Dialog>
    </>
  );
}

/** Says "Felvetted az ingatlant." once after the create page sent here (?created=1), then tidies the address. */
export function CreatedToast() {
  const t = useTranslations("properties.new");
  useEffect(() => {
    toast(t("created"));
    const url = new URL(window.location.href);
    url.searchParams.delete("created");
    window.history.replaceState(window.history.state, "", url);
  }, [t]);
  return null;
}
