"use client";

import { useEffect, useId, useRef } from "react";
import { Icon } from "@/components/Icon";

/**
 * Side panel for longer forms (canvas "Új közmű"): on the native <dialog> (focus trapped and restored, Escape closes),
 * 536 px from the right on larger screens, full screen on phones. Scrolling body, fixed footer for the actions.
 */
export function Drawer({
  open,
  onClose,
  title,
  closeLabel,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-none bg-surface p-0 text-ink shadow-[-24px_0_64px_rgb(12_31_25/0.24)] backdrop:bg-ink/45 sm:w-[536px]"
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex h-16 flex-none items-center justify-between gap-4 border-b border-line px-5 sm:px-6">
            <h2 id={`${id}-title`} className="font-display text-lg leading-6 font-semibold [overflow-wrap:anywhere]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="-mr-2 flex size-11 flex-none items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink"
            >
              <Icon name="x" size={18} strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          <div className="flex flex-none flex-col-reverse gap-2 border-t border-line px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6 sm:pb-4 sm:[&>*]:w-auto">
            {footer}
          </div>
        </div>
      )}
    </dialog>
  );
}
