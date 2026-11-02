"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useLocale } from "next-intl";

type TurnstileApi = {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id: string): void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const READY = "keyfly:turnstile-ready";

/**
 * Cloudflare Turnstile inside a form (sign-in, sign-up, password reset): invisible unless Cloudflare wants a check,
 * then a full-width box above the button. It adds the hidden "cf-turnstile-response" field that the server checks.
 * `resetKey` changes after every answer from the server, so a used token is replaced. Nothing without a site key.
 */
export function Turnstile({ resetKey }: { resetKey?: unknown }) {
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    const render = () => {
      if (!box.current || widget.current || !window.turnstile) return;
      widget.current = window.turnstile.render(box.current, { sitekey: SITE_KEY, appearance: "interaction-only", language: locale, size: "flexible" });
    };
    render();
    window.addEventListener(READY, render);
    return () => {
      window.removeEventListener(READY, render);
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [locale]);

  useEffect(() => {
    if (widget.current && resetKey !== undefined) window.turnstile?.reset(widget.current);
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return (
    <>
      <Script
        id="cf-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => {
          window.dispatchEvent(new Event(READY));
        }}
      />
      <div ref={box} className="flex justify-center empty:hidden" />
    </>
  );
}
