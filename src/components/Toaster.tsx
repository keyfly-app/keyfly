"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Icon } from "@/components/Icon";

/**
 * One short confirmation at a time ("Elküldtük a meghívót."), bottom of the screen, read out politely.
 * A module-level store, so the message outlives the button that triggered it (e.g. a row that disappears).
 */
type Toast = { id: number; message: string; tone: "ok" | "error" } | null;
let current: Toast = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(message: string, tone: "ok" | "error" = "ok") {
  current = { id: Date.now(), message, tone };
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const SHOW_MS = 4000;

export function Toaster() {
  const t = useSyncExternalStore(subscribe, () => current, () => null);
  useEffect(() => {
    if (!t) return;
    const timer = setTimeout(() => {
      if (current?.id === t.id) {
        current = null;
        emit();
      }
    }, SHOW_MS);
    return () => clearTimeout(timer);
  }, [t]);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center sm:inset-x-auto sm:right-6">
      {t && (
        <p className="flex items-center gap-2.5 rounded-[10px] bg-ink px-3.5 py-3 text-sm font-medium text-white shadow-[0_12px_32px_rgb(12_31_25/0.3)]">
          <Icon name={t.tone === "ok" ? "check" : "alert"} size={16} strokeWidth={2.25} className={t.tone === "ok" ? "text-lime" : "text-danger-light"} />
          {t.message}
        </p>
      )}
    </div>
  );
}
