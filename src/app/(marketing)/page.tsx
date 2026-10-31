import { Suspense } from "react";
import { LogoFull, LogoMark } from "@/components/Logo";
import { WaitlistForm } from "./WaitlistForm";

const POINTS = [
  {
    title: "Nem kell milliókat félretenned",
    text: "Kaució helyett kis havi díjat fizetsz. A pénzed nálad marad: költözésre, bútorra, tartaléknak.",
  },
  {
    title: "A bérbeadód ugyanúgy védve van",
    text: "Biztosítói fedezeti igazolást kap. Ha baj van, gyorsan és papírmunka nélkül kártalanítjuk.",
  },
  {
    title: "Pár perc, telefonról",
    text: "Kitöltöd, igazolod a jövedelmed, és azonnal látod az ajánlatot. Nincs bankfiók, nincs sorban állás.",
  },
];

export default function ComingSoon() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <LogoFull height={32} />
        <span className="rounded-full bg-lime px-3.5 py-1.5 text-xs font-bold tracking-[0.12em] text-ink">
          HAMAROSAN
        </span>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pt-6 pb-16 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-10">
        <section>
          <p className="text-sm font-bold tracking-[0.14em] text-green">KAUCIÓ HELYETT KEYFLY</p>
          <h1 className="font-display mt-3 text-[44px] leading-[1.02] font-bold sm:text-6xl lg:text-[68px]">
            Költözz be kaució nélkül.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted sm:text-xl">
            Egy 350 000 forintos albérletnél a háromhavi kaució 1 050 000 Ft. A Keyflyjal ez a pénz nálad marad,
            a bérbeadód mégis teljes biztonságban van.
          </p>

          <div className="mt-8">
            <Suspense>
              <WaitlistForm />
            </Suspense>
          </div>
        </section>

        <aside aria-label="Miért Keyfly" className="flex flex-col gap-4">
          <div className="rounded-3xl bg-ink p-7 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-[0.14em] text-lime">PÉLDA</span>
              <LogoMark size={30} light />
            </div>
            <dl className="mt-5 space-y-3 text-[15px]">
              <div className="flex justify-between border-b border-white/10 pb-3">
                <dt className="text-white/70">Bérleti díj</dt>
                <dd className="font-semibold">350 000 Ft / hó</dd>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-3">
                <dt className="text-white/70">Kaució (3 hónap)</dt>
                <dd className="font-semibold line-through decoration-lime decoration-2">1 050 000 Ft</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-white/70">Keyfly díj</dt>
                <dd className="font-display text-3xl font-bold">
                  ~5 250 Ft<span className="text-base font-semibold text-white/60"> / hó</span>
                </dd>
              </div>
            </dl>
            <p className="mt-5 rounded-2xl bg-lime px-4 py-3 font-semibold text-ink">Nálad marad: 1 050 000 Ft</p>
            <p className="mt-3 text-xs text-white/55">Illusztratív példa. A pontos díj az ellenőrzés után derül ki.</p>
          </div>

          <ul className="grid gap-3">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4 rounded-3xl bg-white p-5">
                <span className="mt-0.5 flex size-8 flex-none items-center justify-center rounded-full bg-lime">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0C1F19" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                </span>
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="mt-0.5 text-[15px] text-muted">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Keyfly</p>
          <nav className="flex gap-5">
            <a href="/adatvedelem" className="hover:text-ink">Adatkezelés</a>
            <a href="mailto:hello@keyfly.app" className="hover:text-ink">hello@keyfly.app</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
