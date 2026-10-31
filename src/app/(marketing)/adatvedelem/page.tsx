import type { Metadata } from "next";
import Link from "next/link";
import { LogoFull } from "@/components/Logo";

export const metadata: Metadata = { title: "Adatkezelési tájékoztató – várólista" };

// TERVEZET – élesítés előtt jogásszal át kell nézetni, és ki kell tölteni a [ ] részeket.
export default function Privacy() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <Link href="/" aria-label="Vissza a főoldalra">
        <LogoFull height={28} />
      </Link>
      <article className="mt-10 space-y-5 text-[16px] leading-relaxed [&_h2]:font-display [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold">
        <h1 className="font-display text-4xl font-bold">Adatkezelési tájékoztató – várólista</h1>
        <p className="text-muted">Hatályos: [dátum]</p>

        <h2>Ki kezeli az adataidat?</h2>
        <p>
          Adatkezelő: [cégnév], székhely: [cím], cégjegyzékszám: [szám], e-mail:{" "}
          <a className="text-green underline" href="mailto:hello@keyfly.app">hello@keyfly.app</a>.
        </p>

        <h2>Milyen adatot kérünk és miért?</h2>
        <p>
          Az e-mail címedet és azt, hogy bérlő, bérbeadó, ingatlaniroda vagy cég vagy. Ezt arra használjuk, hogy
          értesítsünk, amikor a Keyfly elindul. Ha külön kéred, ritkán hírlevelet is küldünk.
        </p>

        <h2>Jogalap és megőrzés</h2>
        <p>
          A hozzájárulásod (GDPR 6. cikk (1) a)). Az adatot az indulásig, de legfeljebb [12 hónapig] őrizzük, vagy
          amíg vissza nem vonod a hozzájárulásod.
        </p>

        <h2>Kik férnek hozzá?</h2>
        <p>
          Csak a Keyfly munkatársai. Az adatokat az Európai Unióban (Frankfurt) tároljuk, tárhelyszolgáltatónk a
          Supabase Inc. és a Vercel Inc. (adatfeldolgozók).
        </p>

        <h2>Jogaid</h2>
        <p>
          Bármikor kérheted az adataid másolatát, javítását vagy törlését a hello@keyfly.app címen. Panasszal a
          Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH) fordulhatsz.
        </p>
      </article>
    </div>
  );
}
