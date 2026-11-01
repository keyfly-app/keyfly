"use client";

import { useEffect, useId, useRef } from "react";
import { Icon } from "@/components/Icon";

/**
 * Modal dialog on the native <dialog> element: focus is trapped and restored by the browser, Escape closes it.
 * Centred card on larger screens, a bottom sheet on phones.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  closeLabel,
  wide = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  closeLabel: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Start in the first field (or the element marked data-autofocus), not on the close button.
      dialog.querySelector<HTMLElement>("[data-autofocus], input:not([type=hidden]):not([type=range])")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-desc` : undefined}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`m-auto w-full rounded-t-2xl bg-surface p-0 text-ink shadow-[0_24px_64px_rgb(12_31_25/0.3)] backdrop:bg-ink/45 max-sm:mb-0 max-sm:max-w-none sm:rounded-2xl ${wide ? "sm:max-w-[520px]" : "sm:max-w-[440px]"}`}
    >
      {open && (
        <div className="flex flex-col gap-5 p-5 pb-8 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h2 id={`${id}-title`} className="font-display text-lg leading-6 font-semibold">
                {title}
              </h2>
              {description && (
                <p id={`${id}-desc`} className="text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            <button type="button" onClick={onClose} aria-label={closeLabel} className="-mt-1.5 -mr-2 flex size-11 flex-none items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink sm:size-9">
              <Icon name="x" size={18} strokeWidth={2} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Dialog footer: secondary action left of the primary on larger screens, stacked full width on phones. */
export function DialogActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:[&>*]:w-auto">{children}</div>;
}
