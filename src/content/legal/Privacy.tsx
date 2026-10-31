import { COMPANY, CONTACT, formatCompanyAddress } from "@/config/company";
import { CONSENT_VERSIONS } from "@/config/consent";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { DPA } from "./hosting";

/**
 * Privacy notice for the waitlist and newsletter (GDPR Art. 13).
 * Hungarian is binding; English is an informative translation.
 * Any change to the substance → new CONSENT_VERSIONS.waitlistPrivacy and LEGAL_EFFECTIVE.privacy.
 */
export function PrivacyContent({ locale }: { locale: Locale }) {
  const support = <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a>;
  const controller = `${COMPANY.legalName} (${COMPANY.shortName}), ${formatCompanyAddress()}, ${COMPANY.registrationNumber}, ${COMPANY.taxNumber}`;

  if (locale === "hu") {
    return (
      <>
        <p>
          Ebben a tájékoztatóban leírjuk, milyen személyes adatokat kezelünk, amikor feliratkozol a Keyfly várólistájára
          vagy hírlevelére, illetve amikor meglátogatod a keyfly.app weboldalt.
        </p>

        <h2>1. Ki kezeli az adataidat?</h2>
        <p>
          Adatkezelő: {controller}. Kapcsolat: {support}. A Keyfly a {COMPANY.shortName} szolgáltatása.
        </p>

        <h2>2. Milyen adatokat, milyen célra és milyen jogalapon kezelünk?</h2>
        <ul>
          <li>
            <strong>Várólista.</strong> E-mail-címed, hogy kiként érdeklődsz (bérlő, bérbeadó, ingatlaniroda, cég), a
            választott nyelv, a feliratkozás időpontja és helye az oldalon, a hirdetési linkben esetleg szereplő
            kampánykód, valamint az elfogadott tájékoztató verziója. Cél: értesítés a Keyfly indulásáról. Jogalap: a
            hozzájárulásod (GDPR 6. cikk (1) bekezdés a) pont).
          </li>
          <li>
            <strong>Hírlevél</strong> (csak ha külön kéred). E-mail-címed, a nyelv, a hozzájárulás időpontja és
            szövegének verziója. Cél: termékújdonságok és bérlési tudnivalók küldése. Jogalap: a hozzájárulásod (GDPR
            6. cikk (1) bekezdés a) pont; a gazdasági reklámtevékenységről szóló 2008. évi XLVIII. törvény 6. §).
          </li>
          <li>
            <strong>Kapcsolatfelvétel.</strong> Ha e-mailt írsz nekünk: a neved, e-mail-címed és az üzenet tartalma.
            Cél: a megkeresésed megválaszolása. Jogalap: jogos érdekünk (GDPR 6. cikk (1) bekezdés f) pont).
          </li>
          <li>
            <strong>Technikai adatok.</strong> A weboldal kiszolgálásakor a tárhelyszolgáltató naplózza az IP-címet, a
            böngésző adatait és a kérés időpontját. Cél: a weboldal biztonságos működtetése. Jogalap: jogos érdekünk
            (GDPR 6. cikk (1) bekezdés f) pont).
          </li>
        </ul>
        <p>
          A feliratkozás önkéntes. E-mail-cím és a tájékoztató elfogadása nélkül azonban nem tudunk értesíteni.
          Automatizált döntéshozatalt és profilalkotást nem végzünk.
        </p>

        <h2>3. Meddig őrizzük az adataidat?</h2>
        <ul>
          <li>Várólista: az indulásról szóló értesítésig, legfeljebb a feliratkozástól számított 2 évig, vagy amíg vissza nem vonod a hozzájárulásod.</li>
          <li>Hírlevél: amíg le nem iratkozol.</li>
          <li>Kapcsolatfelvétel: a megkeresés lezárását követő 1 évig.</li>
          <li>Technikai naplók: a tárhelyszolgáltató szabályai szerint, rövid ideig.</li>
        </ul>

        <h2>4. Sütik</h2>
        <p>
          Egyetlen sütit használunk: a <code>{LOCALE_COOKIE}</code> megjegyzi, melyik nyelvet választottad (1 évig). Ez
          a weboldal működéséhez szükséges, ezért nem kér hozzájárulást. Analitikai vagy hirdetési sütit nem használunk.
        </p>

        <h2>5. Ki fér hozzá az adataidhoz?</h2>
        <p>Az adataidat nem adjuk el és nem adjuk át harmadik félnek hirdetési célra. Az alábbi adatfeldolgozók a megbízásunkból, utasításaink szerint dolgoznak:</p>
        <ul>
          <li>Supabase Inc. – adatbázis (az adatok az Európai Unióban, Frankfurtban tárolódnak);</li>
          <li>Vercel Inc. – a weboldal tárhelye és kiszolgálása;</li>
          <li>Resend (Plus Five Five, Inc.) – e-mailek kiküldése (uniós régióból);</li>
          <li>Google Ireland Limited – céges levelezés (Google Workspace), ha írsz nekünk.</li>
        </ul>
        <p>
          Egyes szolgáltatók amerikai cégek, ezért adataid az Egyesült Államokba is továbbítódhatnak. Ilyenkor az
          EU–USA adatvédelmi keretrendszer vagy az Európai Bizottság általános szerződési feltételei biztosítják a
          megfelelő védelmet.
        </p>

        <h2>6. Milyen jogaid vannak?</h2>
        <p>
          Kérhetsz tájékoztatást és másolatot az adataidról, kérheted azok helyesbítését, törlését, kezelésük
          korlátozását, és az adathordozhatóságot. Jogos érdeken alapuló adatkezelés ellen tiltakozhatsz. A
          hozzájárulásodat bármikor visszavonhatod; ez nem érinti a visszavonás előtti adatkezelés jogszerűségét. A
          hírlevélről minden levél alján egy kattintással leiratkozhatsz. Kérésedet a {support} címre küldd; legfeljebb
          egy hónapon belül válaszolunk.
        </p>

        <h2>7. Jogorvoslat</h2>
        <p>
          Ha úgy érzed, hogy megsértettük a jogaidat, panaszt tehetsz a {DPA.name.hu} hatóságnál ({DPA.address};{" "}
          <a href={`mailto:${DPA.email}`}>{DPA.email}</a>; <a href={DPA.web}>naih.hu</a>), vagy bírósághoz fordulhatsz. Kérjük,
          előtte keress minket, hogy közvetlenül orvosolhassuk a problémát.
        </p>

        <h2>8. Változások</h2>
        <p>
          Ha a tájékoztató lényegesen változik, új verziót teszünk közzé ezen az oldalon. Jelenlegi verzió:{" "}
          {CONSENT_VERSIONS.waitlistPrivacy}.
        </p>
      </>
    );
  }

  return (
    <>
      <p>
        This notice explains what personal data we process when you join the Keyfly waitlist or newsletter, and when you
        visit the keyfly.app website.
      </p>

      <h2>1. Who is the controller?</h2>
      <p>
        Controller: {controller}. Contact: {support}. Keyfly is a service of {COMPANY.shortName}.
      </p>

      <h2>2. What data we process, why, and on what legal basis</h2>
      <ul>
        <li>
          <strong>Waitlist.</strong> Your email address, how you are interested (tenant, landlord, agency, company), your
          chosen language, when and where on the page you signed up, any campaign code in the link you followed, and the
          version of this notice you accepted. Purpose: to tell you when Keyfly launches. Legal basis: your consent (GDPR
          Art. 6(1)(a)).
        </li>
        <li>
          <strong>Newsletter</strong> (only if you opt in). Your email address, language, and the time and wording
          version of your consent. Purpose: sending product news and renting insights. Legal basis: your consent (GDPR
          Art. 6(1)(a); Section 6 of Hungarian Act XLVIII of 2008 on commercial advertising).
        </li>
        <li>
          <strong>Contacting us.</strong> If you email us: your name, email address and message. Purpose: replying to
          you. Legal basis: our legitimate interest (GDPR Art. 6(1)(f)).
        </li>
        <li>
          <strong>Technical data.</strong> When serving the website, our hosting provider logs your IP address, browser
          details and the time of the request. Purpose: operating the website securely. Legal basis: our legitimate
          interest (GDPR Art. 6(1)(f)).
        </li>
      </ul>
      <p>
        Signing up is voluntary, but we cannot notify you without an email address and your acceptance of this notice.
        We do not carry out automated decision-making or profiling.
      </p>

      <h2>3. How long we keep your data</h2>
      <ul>
        <li>Waitlist: until we notify you of the launch, at most 2 years after you sign up, or until you withdraw consent.</li>
        <li>Newsletter: until you unsubscribe.</li>
        <li>Contacting us: 1 year after your enquiry is closed.</li>
        <li>Technical logs: for a short period, under the hosting provider&apos;s rules.</li>
      </ul>

      <h2>4. Cookies</h2>
      <p>
        We use a single cookie: <code>{LOCALE_COOKIE}</code> remembers the language you chose (for 1 year). It is needed
        for the website to work, so it does not require consent. We use no analytics or advertising cookies.
      </p>

      <h2>5. Who has access to your data</h2>
      <p>We do not sell your data or share it with third parties for advertising. The following processors act on our behalf and under our instructions:</p>
      <ul>
        <li>Supabase Inc. – database (data stored in the European Union, Frankfurt);</li>
        <li>Vercel Inc. – website hosting and delivery;</li>
        <li>Resend (Plus Five Five, Inc.) – sending emails (from an EU region);</li>
        <li>Google Ireland Limited – company email (Google Workspace), if you write to us.</li>
      </ul>
      <p>
        Some providers are US companies, so your data may be transferred to the United States. In that case the EU–US
        Data Privacy Framework or the European Commission&apos;s standard contractual clauses provide adequate
        protection.
      </p>

      <h2>6. Your rights</h2>
      <p>
        You can ask for information about and a copy of your data, and ask us to correct or erase it, restrict its
        processing, or provide it in a portable format. You can object to processing based on legitimate interest. You
        can withdraw your consent at any time; this does not affect processing before the withdrawal. You can unsubscribe
        from the newsletter with one click at the bottom of every email. Send your request to {support}; we reply within
        one month at the latest.
      </p>

      <h2>7. Complaints</h2>
      <p>
        If you believe we have infringed your rights, you can complain to the {DPA.name.en} ({DPA.address};{" "}
        <a href={`mailto:${DPA.email}`}>{DPA.email}</a>; <a href={DPA.web}>naih.hu</a>) or go to court. Please contact us
        first so we can put things right directly.
      </p>

      <h2>8. Changes</h2>
      <p>
        If this notice changes materially, we publish a new version on this page. Current version:{" "}
        {CONSENT_VERSIONS.waitlistPrivacy}.
      </p>
    </>
  );
}
