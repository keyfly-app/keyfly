import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogoFull } from "@/components/Logo";
import { COMPANY, CONTACT, formatCompanyAddress } from "@/config/company";
import { isLocale, publicHref, type Locale } from "@/i18n/config";

// DRAFT – the full privacy notice is written in the legal step of the cleanup round
// and reviewed by a lawyer before keyfly.app goes live. Hungarian is the binding version.

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: isLocale(lang) ? lang : "hu", namespace: "common" });
  return { title: t("privacy") };
}

export default async function Privacy({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "hu";
  setRequestLocale(locale);
  const controller = `${COMPANY.shortName}, ${formatCompanyAddress()}, ${COMPANY.registrationNumber}, ${CONTACT.support}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <Link href={publicHref("home", locale)} aria-label="Keyfly">
        <LogoFull height={28} />
      </Link>
      <article className="mt-10 space-y-5 text-[16px] leading-relaxed [&_h2]:font-display [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold">
        {locale === "hu" ? (
          <>
            <h1 className="font-display text-4xl font-bold">Adatkezelési tájékoztató – várólista</h1>
            <h2>Ki kezeli az adataidat?</h2>
            <p>Adatkezelő: {controller}.</p>
            <h2>Milyen adatot kérünk és miért?</h2>
            <p>Az e-mail címedet és azt, hogy bérlő, bérbeadó, ingatlaniroda vagy cég vagy, hogy értesítsünk az indulásról. Ha külön kéred, hírlevelet is küldünk.</p>
            <h2>Jogaid</h2>
            <p>Bármikor kérheted az adataid másolatát, javítását vagy törlését a {CONTACT.support} címen. Panasszal a NAIH-hoz fordulhatsz.</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl font-bold">Privacy notice – waitlist</h1>
            <p className="text-muted">This is an informative translation; the Hungarian version is legally binding.</p>
            <h2>Who handles your data?</h2>
            <p>Controller: {controller}.</p>
            <h2>What we ask for and why</h2>
            <p>Your email address and whether you are a tenant, landlord, agency or company, so we can tell you when we launch. If you opt in, we also send a newsletter.</p>
            <h2>Your rights</h2>
            <p>You can ask for a copy, correction or deletion of your data at any time at {CONTACT.support}. You may lodge a complaint with the Hungarian data protection authority (NAIH).</p>
          </>
        )}
      </article>
    </div>
  );
}
