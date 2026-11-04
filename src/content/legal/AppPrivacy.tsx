import { BRAND, COMPANY, CONTACT, formatCompanyAddress } from "@/config/company";
import { CONSENT_VERSIONS } from "@/config/consent";
import { publicHref, type Locale } from "@/i18n/config";
import { date } from "@/lib/format";
import { PRODUCTION_HOSTS } from "@/lib/sites";
import { TRUSTED_COOKIE } from "@/lib/trusted-device";
import { DPA, LEGAL_EFFECTIVE } from "./hosting";
import { LegalTable } from "./LegalTable";

/**
 * Privacy notice of the Keyfly customer app (GDPR Art. 13–14). The waitlist and newsletter keep their own notice (Privacy.tsx).
 * Source: https://claude.ai/artifact/7PEYvwk7uwZ6NXsmDrcMta (draft 0.2, lawyer review pending).
 * Hungarian is binding; English is an informative translation. The doc's bracketed drafting notes and the open
 * questions for the lawyer are not published.
 * Any change → bump CONSENT_VERSIONS.accountPrivacy and LEGAL_EFFECTIVE.appPrivacy.
 */
export function AppPrivacyContent({ locale }: { locale: Locale }) {
  const support = <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a>;
  const address = formatCompanyAddress();
  const site = <a href={BRAND.url}>{BRAND.url}</a>;
  const appUrl = `https://${PRODUCTION_HOSTS.portal}`;
  const app = <a href={appUrl}>{appUrl}</a>;
  const termsHref = publicHref("terms", locale);
  const waitlistHref = publicHref("privacy", locale);

  if (locale === "hu") {
    return (
      <>
        <h2>1. Ki kezeli az adataidat, és mire terjed ki ez a tájékoztató?</h2>
        <p>1.1. <strong>Adatkezelő:</strong></p>
        <ul>
          <li>{COMPANY.legalName} ({COMPANY.shortName})</li>
          <li>Székhely: {address}</li>
          <li>Cégjegyzékszám: Cg. {COMPANY.registrationNumber}; adószám: {COMPANY.taxNumber}</li>
          <li>E-mail: {support}</li>
          <li>Márkanév: Keyfly ({site}, alkalmazás: {app})</li>
        </ul>
        <p>
          1.2. <strong>Hatály.</strong> Ez a tájékoztató a Keyfly alkalmazásban ({PRODUCTION_HOSTS.portal}) végzett adatkezelésekre vonatkozik: fiókok
          és fiókbiztonság (kétlépcsős azonosítás, aktív belépések), céges fiókok és csapatok, e-mail-értesítések, telefonszám-megerősítés,
          bankszámlák, ingatlanok, bérleti jogviszonyok, meghívók, ajánlatkérés, ellenőrzések (személyazonosság, jövedelem, KHR), díjfizetés,
          kárigények és ügyfélszolgálat. A {BRAND.domain} weboldal várólistájához kapcsolódó adatkezelésről <a href={waitlistHref}>külön
          tájékoztató</a> szól.
        </p>
        <p>
          1.3. <strong>Jogszabályi háttér.</strong> Az adatkezelésre az (EU) 2016/679 általános adatvédelmi rendelet (<strong>GDPR</strong>), az
          információs önrendelkezési jogról és az információszabadságról szóló 2011. évi CXII. törvény (<strong>Infotv.</strong>), valamint a
          biztosítási tevékenységről szóló 2014. évi LXXXVIII. törvény (<strong>Bit.</strong>) biztosítási titokra vonatkozó szabályai az irányadók.
        </p>
        <p>
          1.4. <strong>A Partnerbiztosító szerepe.</strong> A kaucióhelyettesítő garanciát a Partnerbiztosító nyújtja, amely a kockázatvállaláshoz, a
          kárrendezéshez és a megtérítéshez kapcsolódó adatkezelését önálló adatkezelőként, saját tájékoztatója szerint végzi.
        </p>

        <h2>2. Milyen célból, milyen jogalapon és milyen adataidat kezeljük?</h2>
        <p>
          Az alábbi táblázat célonként mutatja az érintetteket, az adatköröket és a GDPR 6. cikk (1) bekezdése szerinti jogalapot. A megőrzési időket
          a 3. pont tartalmazza (az „M” jelölés oda mutat).
        </p>
        <LegalTable
          label="2. Milyen célból, milyen jogalapon és milyen adataidat kezeljük?"
          head={["#", "Cél", "Érintettek", "Adatkör", "Jogalap", "M"]}
        >
          <tr>
            <td>A</td>
            <td>Fiók létrehozása, bejelentkezés, fiókkezelés</td>
            <td>Felhasználók</td>
            <td>
              név, e-mail-cím, telefonszám, profilkép, lakcím és levelezési cím (ország, irányítószám, település, közterület és házszám, emelet/ajtó;
              nem kötelező), jelszó (kizárólag hashelt formában), nyelvi beállítás, ÁSZF-elfogadás verziója és ideje, e-mailes hivatkozások
              (megerősítés, jelszó-visszaállítás), utolsó bejelentkezés ideje; Google-bejelentkezésnél a Google-tól kapott név, e-mail-cím és
              Google-fiókazonosító (2.9. pont)
            </td>
            <td>b) szerződés teljesítése</td>
            <td>M1</td>
          </tr>
          <tr>
            <td>B</td>
            <td>Céges fiók és Csapat kezelése (cég hozzáadása adószám alapján, meghívók, hozzáférési kérések, Szerepkörök, fiókgazda-átadás)</td>
            <td>Csapattagok, hozzáférést kérők, a cég képviselője</td>
            <td>
              a NAV adózói nyilvántartásából lekért cégnév, adószám, székhely és a lekérdezés ideje (2.6. pont); a Fiókgazda és az Adminok által
              megadott vagy módosított cégadatok: megjelenő név, cégnév, az adószám utolsó három számjegye, közösségi adószám, cégjegyzékszám,
              székhely, levelezési cím, kapcsolattartási e-mail-cím és telefonszám; Csomag; a csapattag neve, e-mail-címe, Szerepköre
              (Fiókgazda/Admin/Kezelő/Megtekintő), csatlakozásának ideje és meghívója; hozzáférési kérés: a kérő neve, e-mail-címe, üzenete, a kérés
              és a döntés ideje, a döntést hozó személy
            </td>
            <td>b) szerződés teljesítése; a cég képviselőjének adataira f) jogos érdek</td>
            <td>M1, M3</td>
          </tr>
          <tr>
            <td>C</td>
            <td>Ingatlanok és bérleti jogviszonyok nyilvántartása</td>
            <td>Bérbeadó, Bérlő, Bérlőtárs; a Bérbeadó által rögzített kapcsolatok (pl. tulajdonos, közös képviselő, gondnok, szolgáltató)</td>
            <td>
              ingatlan strukturált címe és típusa (lakás, ház, szoba, iroda, üzlethelyiség, vendéglátóhely, raktár/ipari ingatlan, garázs/parkolóhely
              vagy egyéb), helyrajzi szám (opcionális), jellemzők, fotók és videók (illetve videólinkek), bérbeadási feltételek és hirdetési szöveg, közmű- és szolgáltatásadatok
              (szolgáltató, felhasználási hely- és ügyfélazonosítók, mérőórák gyári száma, elszámolás módja), a kapcsolatok neve, szerepe, e-mail-címe,
              telefonszáma, címe és a róluk írt megjegyzés, belső jegyzet; Excel/CSV-importnál a fájl neve (a fájl tartalmát a böngésződ dolgozza fel,
              magát a fájlt nem tároljuk), illetve az import által felülírt korábbi értékek a visszavonhatóság idejére; bérleti időszak, bérleti díj,
              kaució összege, felek neve és elérhetősége, a bérleti szerződés állapota
            </td>
            <td>b) szerződés teljesítése; a Bérbeadó által rögzített kapcsolatok adataira f) jogos érdek (az ingatlan kezelése és a bérlés lebonyolítása)</td>
            <td>M2</td>
          </tr>
          <tr>
            <td>D</td>
            <td>Meghívók küldése (bérleti szerződéshez, csapatba)</td>
            <td>Meghívott személy (lehet, hogy még nem Felhasználó)</td>
            <td>név, e-mail-cím, a meghívó küldője, a meghívás tárgya, kiküldés, lejárat és elfogadás ideje</td>
            <td>f) jogos érdek (a meghívó fél és a Keyfly érdeke a kapcsolatfelvételben)</td>
            <td>M3</td>
          </tr>
          <tr>
            <td>E</td>
            <td>Bérlőtársak és Együttlakók rögzítése</td>
            <td>Bérlőtársak, Együttlakók</td>
            <td>név</td>
            <td>f) jogos érdek</td>
            <td>M2</td>
          </tr>
          <tr>
            <td>F</td>
            <td>Ajánlatkészítés és jogosultság-értékelés</td>
            <td>Bérlő, Bérlőtárs</td>
            <td>bérleti adatok, az ellenőrzések eredménye (G–I), számított mutatók, ajánlat, döntés és indokai</td>
            <td>b) szerződéskötést megelőző lépések; automatizált döntés esetén GDPR 22. cikk (2) a) (5. pont)</td>
            <td>M4</td>
          </tr>
          <tr>
            <td>G</td>
            <td>Személyazonosság ellenőrzése (tervezett)</td>
            <td>Bérlő</td>
            <td>név, születési hely és idő, DÁP-azonosítás eredménye, vagy igazolvány típusa, száma, érvényessége</td>
            <td>–</td>
            <td>M5</td>
          </tr>
          <tr>
            <td>H</td>
            <td>Jövedelem ellenőrzése (tervezett)</td>
            <td>Bérlő, Bérlőtárs</td>
            <td>
              open banking: számlatulajdonos neve, számlaszám, a hozzájárulásban megjelölt hónap jóváírásai; vagy NAV jövedelemigazolás; vagy
              munkáltatói igazolás; az ellenőrzés eredménye (igazolt jövedelemsáv)
            </td>
            <td>
              b) szerződéskötést megelőző lépések; az open banking-hozzáféréshez a számlainformációs szolgáltatónál adott kifejezett hozzájárulásod is
              szükséges
            </td>
            <td>M5</td>
          </tr>
          <tr>
            <td>I</td>
            <td>Saját KHR-jelentés feltöltése (nagy összegű kauciónál)</td>
            <td>Bérlő</td>
            <td>a KHR-jelentés tartalma (hiteladatok, késedelmek), az értékelés eredménye</td>
            <td>–</td>
            <td>M5</td>
          </tr>
          <tr>
            <td>J</td>
            <td>Adatvalósági nyilatkozat és hozzájárulások igazolása</td>
            <td>Felhasználók</td>
            <td>a nyilatkozat/hozzájárulás szövege és dokumentumverziója, időpont, Felhasználó-azonosító</td>
            <td>c) jogi kötelezettség (GDPR 7. cikk (1)); f) jogos érdek (bizonyítás)</td>
            <td>M6</td>
          </tr>
          <tr>
            <td>K</td>
            <td>Biztosításközvetítés: adatok átadása a Partnerbiztosítónak</td>
            <td>Bérlő, Bérbeadó, Bérlőtárs</td>
            <td>az ajánlathoz és a szerződéshez szükséges adatok (C, F–I eredményei)</td>
            <td>b) szerződés; c) jogi kötelezettség (Bit.)</td>
            <td>M2</td>
          </tr>
          <tr>
            <td>L</td>
            <td>Kárigények koordinálása</td>
            <td>Bérbeadó, Bérlő</td>
            <td>kárbejelentés, követelés összege, dokumentumok, fotók, észrevételek, üzenetek</td>
            <td>b) szerződés; f) jogos érdek (jogi igények)</td>
            <td>M2</td>
          </tr>
          <tr>
            <td>M</td>
            <td>Díjfizetés és számlázás</td>
            <td>Fizető Felhasználók</td>
            <td>név/cégnév, számlázási cím, adószám, összeg, tranzakció-azonosító; bankkártyaadatot a Keyfly nem kezel</td>
            <td>b) szerződés; számlák: c) jogi kötelezettség (számviteli és áfa-szabályok)</td>
            <td>M7</td>
          </tr>
          <tr>
            <td>N</td>
            <td>Ügyfélszolgálat és panaszkezelés</td>
            <td>Megkeresők</td>
            <td>név, e-mail-cím, megkeresés tartalma, válasz</td>
            <td>ügyfélszolgálat: f) jogos érdek; fogyasztói panasz: c) jogi kötelezettség (Fgytv. 17/A. §)</td>
            <td>M8</td>
          </tr>
          <tr>
            <td>O</td>
            <td>Változásnapló (audit log) és munkatársi hozzáférések</td>
            <td>Felhasználók, munkatársak</td>
            <td>ki, mikor, milyen adatot módosított (régi és új érték), munkatársi hozzáférések</td>
            <td>f) jogos érdek (bizonyítás, adatbiztonság, GDPR 32. cikk)</td>
            <td>M9</td>
          </tr>
          <tr>
            <td>P</td>
            <td>Biztonsági és technikai naplók</td>
            <td>Felhasználók, látogatók</td>
            <td>IP-cím, böngésző és eszköz adatai, bejelentkezési kísérletek, hibanaplók</td>
            <td>f) jogos érdek (visszaélések megelőzése, üzembiztonság)</td>
            <td>M10</td>
          </tr>
          <tr>
            <td>Q</td>
            <td>
              Rendszerértesítők e-mailben (meghívó, megerősítő és jelszó-visszaállító hivatkozás, kétlépcsős belépési kód, bérleti és csapatesemények,
              számlák, biztonsági értesítések)
            </td>
            <td>Felhasználók</td>
            <td>e-mail-cím, nyelv, értesítés tartalma és kategóriája, kézbesítési státusz; értesítési beállítások témánként (2.5. pont)</td>
            <td>b) szerződés teljesítése; biztonsági értesítések: f) jogos érdek is (fiókbiztonság, GDPR 32. cikk)</td>
            <td>M10</td>
          </tr>
          <tr>
            <td>R</td>
            <td>Kétlépcsős azonosítás (nem kötelező)</td>
            <td>Felhasználók</td>
            <td>
              a hitelesítő alkalmazás titkos kulcsa (a Supabase hitelesítési szolgáltatásában tárolva) és a bekapcsolás ideje; 10 tartalék kód
              kizárólag SHA-256 hash formában és felhasználásuk ideje; sikertelen tartalékkód-kísérletek (Felhasználó-azonosító, időpont); e-mailes
              belépési kód: a kód kizárólag hash formában, lejárata, a hibás próbálkozások száma és a küldések naplója (Felhasználó-azonosító,
              időpont), valamint az, hogy az e-mailes kódot kikapcsoltad-e
            </td>
            <td>
              b) szerződés teljesítése (az általad bekapcsolt biztonsági funkció); a sikertelen kísérletek naplózása: f) jogos érdek (a kódok
              kitalálásának megakadályozása, GDPR 32. cikk)
            </td>
            <td>M11</td>
          </tr>
          <tr>
            <td>S</td>
            <td>Aktív belépések (munkamenetek) listája és kijelentkeztetés</td>
            <td>Felhasználók</td>
            <td>
              munkamenet-azonosító, a böngésző azonosító szövege (user agent), IP-cím, a belépés és az utolsó aktivitás ideje; a listán csak a
              böngésző, az operációs rendszer és az utolsó aktivitás látszik
            </td>
            <td>b) szerződés teljesítése; f) jogos érdek (fiókbiztonság)</td>
            <td>M12</td>
          </tr>
          <tr>
            <td>T</td>
            <td>Keyfly-újdonságok e-mailben (nem kötelező, alapból kikapcsolva)</td>
            <td>Felhasználók, akik ezt bekapcsolták</td>
            <td>név, e-mail-cím, nyelv, a beállítás állapota</td>
            <td>a) hozzájárulás</td>
            <td>M13</td>
          </tr>
          <tr>
            <td>U</td>
            <td>Biztonságos eszközök (a kétlépcsős kód 30 napos kihagyása egy böngészőben; nem kötelező)</td>
            <td>Felhasználók, akik ezt kérik</td>
            <td>
              rekordazonosító, Felhasználó-azonosító, egy véletlen token SHA-256 hash-e, az eszköz megnevezése (böngésző · operációs rendszer, a user
              agent alapján), a megjelölés, a lejárat és az utolsó használat ideje; a böngészőben a <code>{TRUSTED_COOKIE}</code> süti (6. pont)
            </td>
            <td>b) szerződés teljesítése (az általad kért biztonsági funkció)</td>
            <td>M14</td>
          </tr>
          <tr>
            <td>V</td>
            <td>Telefonszám megerősítése SMS-kóddal (2.7. pont)</td>
            <td>Felhasználók, akik telefonszámot adnak meg</td>
            <td>
              telefonszám; a megerősítés alatt álló szám és a 10 perces érvényesség lejárata; az elküldött SMS-ek naplója (Felhasználó-azonosító,
              időpont); a megerősítés ideje. A Twilio-nak átadott adat: a telefonszám és az üzenet nyelve; a kódot a Twilio állítja elő, küldi el és
              ellenőrzi, a Keyfly nem látja és nem tárolja.
            </td>
            <td>b) szerződés teljesítése</td>
            <td>M1, M15</td>
          </tr>
          <tr>
            <td>W</td>
            <td>Bankszámlák a kárkifizetésekhez és visszatérítésekhez (nem kötelező; 2.8. pont)</td>
            <td>Felhasználók; Céges fiókok Csapattagjai</td>
            <td>
              pénznem, IBAN, számlatulajdonos neve, megnevezés, elsődleges jelölés, ki és mikor vette fel, a módosítás ideje; a módosításokat a
              változásnapló a számlaszámnak csak az utolsó négy karakterével, a számlatulajdonos neve nélkül rögzíti (O sor)
            </td>
            <td>b) szerződés teljesítése</td>
            <td>M16</td>
          </tr>
          <tr>
            <td>X</td>
            <td>
              Automatizált visszaélések elleni védelem (robotszűrés, Cloudflare Turnstile) a belépési, regisztrációs és elfelejtett jelszó űrlapokon
              ({PRODUCTION_HOSTS.portal}, {PRODUCTION_HOSTS.admin})
            </td>
            <td>Az űrlapokat használó látogatók</td>
            <td>
              IP-cím, a Cloudflare által értékelt böngésző- és eszközjellemzők, egyszer használható token; a szerverünk a tokent és a látogató
              IP-címét ellenőrzésre elküldi a Cloudflare-nek. A Keyfly ebből semmit nem tárol.
            </td>
            <td>f) jogos érdek (visszaélések elleni védelem, adatbiztonság, GDPR 32. cikk)</td>
            <td>nem tároljuk</td>
          </tr>
        </LegalTable>
        <p>
          2.1. <strong>Más személyektől kapott adatok.</strong> Ha adataidat más Felhasználó adja meg (pl. meghívott, Bérlőtársként vagy
          Együttlakóként rögzített), az első kapcsolatfelvételkor (meghívó e-mail), de legkésőbb egy hónapon belül tájékoztatunk erről a
          tájékoztatóról (GDPR 14. cikk). A Bérbeadó által rögzített kapcsolatokat (pl. tulajdonos, közös képviselő, gondnok, szolgáltató) a Keyfly
          nem keresi meg; adataikat csak a Bérbeadó fiókjának tagjai, illetve – ha a Bérbeadó így jelöli – az ingatlan Bérlője látja. Jogaikat (8.
          pont) nálunk is gyakorolhatják.
        </p>
        <p>
          2.2. <strong>Jogos érdek.</strong> A jogos érdeken alapuló adatkezelésekhez érdekmérlegelési tesztet készítünk, amelyet kérésedre
          megismerhetsz. Ezek ellen tiltakozhatsz (8. pont).
        </p>
        <p>
          2.3. <strong>Különleges adatok.</strong> Különleges kategóriába tartozó adatot (pl. egészségügyi, vallási adat) nem kérünk. Open
          banking-ellenőrzésnél kizárólag a jóváírásokat (bevételeket) vizsgáljuk, a terhelések részleteit nem tároljuk.
        </p>
        <p>
          2.4. <strong>Adatszolgáltatás elmaradásának következménye.</strong> Az A, C, F–I célhoz szükséges adatok megadása a szolgáltatás, illetve az
          ajánlat feltétele; ezek hiányában nem tudunk Fiókot létrehozni, illetve ajánlatot adni.
        </p>
        <p>
          2.5. <strong>E-mail-értesítések.</strong> A szolgáltatással kapcsolatos értesítéseket (Q sor) a beállításaidban témánként kikapcsolhatod: a
          bérleti jogviszony változásai, emlékeztető a bérleti idő lejárta előtt, Csapat (hozzáférési kérések, fiókgazda-váltás), számlák. A
          meghívókat és a biztonsági értesítéseket (pl. a kétlépcsős azonosítás be- és kikapcsolása, belépés tartalék kóddal) mindig elküldjük. A
          Keyfly újdonságairól szóló levelek (T sor, havonta legfeljebb egy) alapból ki vannak kapcsolva: csak akkor küldjük őket, ha a kapcsolót
          bekapcsolod, és a hozzájárulásodat a kapcsoló kikapcsolásával bármikor visszavonhatod.
        </p>
        <p>
          2.6. <strong>A Céges fiók adatainak forrása.</strong> Céges fiók létrehozásakor a megadott adószám első nyolc számjegyét továbbítjuk a
          számlázz.hu adózó-lekérdező szolgáltatásának, amely a NAV adózói nyilvántartásából visszaadja a szervezet nevét, adószámát és székhelyét (B
          sor, 4.4. pont). Ezeket az adatokat a Céges fiók létrehozásakor újra lekérjük. Később a Fiókgazda és az Adminok a cégadatokat kézzel
          módosíthatják (az adószám első nyolc számjegye kivételével), és a „Frissítés a NAV-ból” funkcióval újra lekérhetik őket; ilyenkor is csak az
          adószám első nyolc számjegye megy ki, és a lekért adatok csak mentéskor kerülnek a Céges fiókba. A Céges fiók kapcsolattartási e-mail-címe
          és telefonszáma egy munkavállaló személyes adata is lehet (pl. nevét tartalmazó e-mail-cím).
        </p>
        <p>
          2.7. <strong>Telefonszám.</strong> A telefonszámod megadása nem kötelező. Arra használjuk, hogy a bérleti jogviszonnyal és a biztosítással
          kapcsolatban felvegyük veled a kapcsolatot, valamint (tervezett) hogy biztosítási ajánlatkéréskor megerősítsük a személyazonosságodat. A
          számot megadáskor és módosításkor egy SMS-ben küldött 6 jegyű kóddal kell megerősítened; ehhez megerősített e-mail-cím szükséges. A kódot a
          Twilio adatfeldolgozó Twilio Verify szolgáltatása (4.3. pont) állítja elő, küldi el az általa országonként választott feladótól („A Keyfly
          ellenőrző kódod: …” szöveggel és azzal a figyelmeztetéssel, hogy ne add meg senkinek), és ellenőrzi; a kódot a Keyfly nem látja és nem
          tárolja. A Twilio a telefonszámodat kapja meg, és a szolgáltatás részeként visszaélés-megelőzésre (Fraud Guard) is kezeli. A kód 10 percig
          érvényes; túl sok hibás próbálkozás után a Twilio letiltja. Óránként legfeljebb 3, naponta legfeljebb 10 kódot kérünk. SMS-t csak az Európai
          Unió és az EGT tagállamaiban, Svájcban, az Egyesült Királyságban, Ukrajnában, Szerbiában, az Amerikai Egyesült Államokban és Kanadában
          használt mobilszámra küldünk. A telefonszámot és a megerősítés idejét addig őrizzük, amíg el nem távolítod, vagy törlöd a Fiókot.
        </p>
        <p>
          2.8. <strong>Bankszámlák.</strong> A személyes fiókodhoz, illetve a Céges fiókhoz megadott bankszámlákat a kárkifizetések és a
          visszatérítések teljesítésére használjuk; a kifizetés a kifizetés pénznemében megadott elsődleges számlára történik. A magyar számlaszámot
          IBAN-ná alakítjuk, és az ellenőrző számjegyeket helyben ellenőrizzük; ehhez külső banki szolgáltatást nem használunk.
        </p>
        <p>
          2.9. <strong>Bejelentkezés Google-fiókkal.</strong> Ha a Google-fiókoddal regisztrálsz vagy lépsz be, a Google (Google Ireland Limited,
          illetve Google LLC) mint önálló adatkezelő a saját bejelentkezési szolgáltatásában azonosít téged
          (<a href="https://policies.google.com/privacy">a Google adatvédelmi irányelvei</a>), és átadja nekünk a nevedet, az e-mail-címedet és a
          Google-fiókod azonosítóját. Ezeket a bejelentkezéshez és a Fiókod létrehozásához használjuk; a Google-profilképedet nem használjuk és nem
          tároljuk. Jogalap: b) szerződés teljesítése (az általad választott belépési mód). A Google-fiókot a Beállítások → Bejelentkezés és biztonság
          oldalon leválaszthatod; ekkor töröljük a Google-fiókazonosító kapcsolatát, és később másik Google-fiókot is kapcsolhatsz. A Fiókod belépési
          e-mail-címe a Google-fiók kapcsolásától nem változik. A Keyfly munkatársai felületén (admin) Google-bejelentkezés nincs.
        </p>

        <h2>3. Meddig őrizzük meg az adataidat?</h2>
        <p>
          Az adatokat csak addig őrizzük, ameddig a cél eléréséhez vagy jogszabályi kötelezettség teljesítéséhez szükséges. Ha jogvita, hatósági
          eljárás vagy folyamatban lévő kárigény/megtérítés van, az érintett adatokat annak jogerős lezárásáig megőrizzük. A megőrzési idő lejárta
          után az adatokat töröljük vagy visszafordíthatatlanul anonimizáljuk.
        </p>
        <LegalTable label="3. Meddig őrizzük meg az adataidat?" head={["M", "Adatkör", "Megőrzési idő", "Indoklás"]}>
          <tr>
            <td>M1</td>
            <td>Fiók- és csapatadatok</td>
            <td>
              A Fiók fennállásáig. A Fiók törlésekor (8.4. pont) a profil (név, e-mail-cím, telefonszám, lakcím és levelezési cím, nyelv, értesítési
              beállítások), a profilkép, a személyes fiók, a csapattagságok és a csak általad használt Céges fiókok azonnal törlődnek; a profilkép
              cseréjekor vagy eltávolításakor a korábbi kép azonnal törlődik. Céges fiók adatai: a Céges fiók fennállásáig. E-mailes hivatkozások
              (megerősítés, jelszó-visszaállítás): 1 óráig érvényesek, felhasználáskor érvényüket vesztik, rekordjuk 30 nap után törlődik.
              Google-bejelentkezési adatok (Google-fiókazonosító kapcsolata): a Google-fiók leválasztásáig vagy a Fiók törléséig.
            </td>
            <td>A Ptk. 6:22. § szerinti 5 éves általános elévülési idő alatt a szerződésből eredő igények érvényesíthetők.</td>
          </tr>
          <tr>
            <td>M2</td>
            <td>Bérleti jogviszonyok, ingatlanadatok, Bérlőtársak/Együttlakók, a Partnerbiztosítónak átadott adatok, kárigények</td>
            <td>
              A Bérleti jogviszony lezárásától (a bérleti szerződés vége + 60 nap, vagy a kárigény lezárása) számított 5 év; folyamatban lévő
              megtérítés vagy jogvita esetén annak lezárásáig. A lezárt bérleti szerződés adataihoz a Bérlő ez alatt csak olvasási hozzáférést kap.
              Bérleti jogviszony nélküli ingatlanadatok, fotók, videók és kapcsolatok: amíg a Bérbeadó törli őket, illetve a Fiók (Céges fiók) törléséig. Az
              import által felülírt korábbi értékek: az import után 2 nap (napi automatikus törlés).
            </td>
            <td>A bérleti szerződésből és a garanciából eredő igények 5 éves elévülése (Ptk. 6:22. §).</td>
          </tr>
          <tr>
            <td>M3</td>
            <td>Meghívók adatai; Céges fiókhoz benyújtott hozzáférési kérések</td>
            <td>
              Az érvényesség (7 nap; munkatársi meghívó: 48 óra) + 1 év. Elfogadott meghívó esetén a bérleti/csapat-rekord részévé válik (M1/M2).
              Hozzáférési kérés: az elbírálásig vagy visszavonásig, majd az után 1 évig (napi automatikus törlés); a kérő Fiókjának vagy a Céges
              fióknak a törlésekor azonnal törlődik.
            </td>
            <td>Annak igazolása, ki kit hívott meg, és visszaélések kivizsgálása; 1 év után erre jellemzően nincs szükség.</td>
          </tr>
          <tr>
            <td>M4</td>
            <td>Ajánlatok és jogosultsági döntések</td>
            <td>Szerződéskötés esetén M2 szerint; ha nem jön létre szerződés, az ajánlattól számított 1 év.</td>
            <td>A döntés elleni kifogás (GDPR 22. cikk (3)), panasz kezelése és az ismételt ajánlatkérések kezelése.</td>
          </tr>
          <tr>
            <td>M5</td>
            <td>Ellenőrzések nyers adatai: igazolványadatok/-kép, számlatranzakciók, NAV jövedelemigazolás, munkáltatói igazolás, KHR-jelentés</td>
            <td>
              A döntést követő legfeljebb 30 nap, majd törlés. Csak az eredményt őrizzük meg (ellenőrzés típusa, dátuma, sikeressége, igazolt
              jövedelemsáv) az M4/M2 szerint.
            </td>
            <td>
              Adattakarékosság és korlátozott tárolhatóság (GDPR 5. cikk (1) c) és e)): a nyers adat a döntés után nem szükséges; a 30 nap a hibák és
              kifogások kezelését szolgálja.
            </td>
          </tr>
          <tr>
            <td>M6</td>
            <td>Adatvalósági nyilatkozatok, hozzájárulások, elfogadott dokumentumverziók</td>
            <td>Az érintett szerződés megszűnésétől, illetve a hozzájárulás visszavonásától számított 5 év.</td>
            <td>A hozzájárulás és a nyilatkozat igazolása (GDPR 7. cikk (1)) az elévülési idő alatt.</td>
          </tr>
          <tr>
            <td>M7</td>
            <td>Számlák és számviteli bizonylatok</td>
            <td>8 év</td>
            <td>A számvitelről szóló 2000. évi C. törvény 169. §-a.</td>
          </tr>
          <tr>
            <td>M8</td>
            <td>Ügyfélszolgálati levelezés; panaszok</td>
            <td>Általános megkeresés: a lezárástól számított 2 év. Fogyasztói panasz és válasz: 5 év.</td>
            <td>Panasz: Fgytv. 17/A. § (7). Egyéb: az ismétlődő megkeresések kezelése.</td>
          </tr>
          <tr>
            <td>M9</td>
            <td>Változásnapló (audit log) és munkatársi hozzáférések</td>
            <td>
              Az érintett rekord (bérleti szerződés, fiók) megőrzési ideje (M1/M2); azzal együtt törlődik. A naplóbejegyzések közben nem módosíthatók.
            </td>
            <td>A napló a rekordhoz kapcsolódó bizonyíték; a rekordnál tovább nincs célja.</td>
          </tr>
          <tr>
            <td>M10</td>
            <td>Biztonsági és technikai naplók; e-mail-kézbesítési naplók</td>
            <td>90 nap; biztonsági incidens esetén a kivizsgálás lezárásáig.</td>
            <td>Visszaélések és hibák felderítése; az incidensek jellemzően ennyi időn belül kiderülnek.</td>
          </tr>
          <tr>
            <td>M11</td>
            <td>
              Kétlépcsős azonosítás adatai (hitelesítő alkalmazás, tartalék kódok, sikertelen tartalékkód-kísérletek, e-mailes belépési kódok és
              küldési naplójuk)
            </td>
            <td>
              A kétlépcsős azonosítás kikapcsolásáig, a tartalék kóddal történő belépésig vagy a Fiók törléséig; új tartalék kódok készítésekor a
              korábbiak törlődnek. Sikertelen kísérletek: sikeres tartalékkódos belépéskor azonnal, egyébként 1 nap után, a napi automatikus
              törléskor. E-mailes belépési kód: 5 percig érvényes, legkésőbb 1 napon belül törlődik; a küldési napló: 2 nap.
            </td>
            <td>A funkció működéséhez szükséges; a kísérletek naplója csak az óránként 10 kísérletes korlát betartását szolgálja.</td>
          </tr>
          <tr>
            <td>M12</td>
            <td>Munkamenetek (aktív belépések)</td>
            <td>
              A munkamenet végéig: kijelentkezés, kijelentkeztetés az aktív belépések listáján, jelszóváltás utáni automatikus kijelentkeztetés vagy a
              Fiók törlése; a munkamenet 30 nap használat nélkül automatikusan megszűnik.
            </td>
            <td>A bejelentkezés fenntartásához és a fiókbiztonsághoz szükséges.</td>
          </tr>
          <tr>
            <td>M13</td>
            <td>Keyfly-újdonságok beállítása</td>
            <td>A hozzájárulás visszavonásáig (a kapcsoló kikapcsolásáig) vagy a Fiók törléséig.</td>
            <td>Hozzájáruláson alapuló adatkezelés (GDPR 7. cikk (3)).</td>
          </tr>
          <tr>
            <td>M14</td>
            <td>Biztonságos eszközök</td>
            <td>
              A megjelöléstől számított 30 napig (lejárat), majd a napi automatikus törléskor törlődik; korábban, ha eltávolítod, ha módosítod a
              jelszavad, kikapcsolod a kétlépcsős azonosítást, tartalék kóddal lépsz be, vagy törlöd a Fiókot. Felhasználónként legfeljebb 10 eszköz;
              újabb megjelöléskor a legrégebbi törlődik. A <code>{TRUSTED_COOKIE}</code> süti 30 napig él.
            </td>
            <td>A funkció működéséhez szükséges; a 30 napos korlát és az automatikus eltávolítás a fiókbiztonságot szolgálja.</td>
          </tr>
          <tr>
            <td>M15</td>
            <td>Telefonszám-megerősítés: a megerősítés alatt álló szám és az elküldött SMS-ek naplója</td>
            <td>
              A megerősítés alatt álló szám: sikeres megerősítéskor azonnal, egyébként a 10 perces érvényesség lejárta után legkésőbb 1 nappal, a napi
              automatikus törléskor törlődik. Az SMS-napló: 2 nap. A telefonszám és a megerősítés ideje: M1 (az eltávolításig vagy a Fiók törléséig).
            </td>
            <td>A szám csak a megerősítéshez kell; a napló csak az óránkénti és napi korlátok betartását szolgálja.</td>
          </tr>
          <tr>
            <td>M16</td>
            <td>Bankszámlák</td>
            <td>
              Amíg törlöd, vagy amíg a személyes fiókot, illetve a Céges fiókot törlik. A kifizetési bizonylatok a számviteli megőrzés szerint (M7). A
              nem törölhető változásnapló (M9) a bankszámla-módosításokból csak a számlaszám utolsó négy karakterét őrzi meg, a számlatulajdonos nevét
              nem.
            </td>
            <td>A kifizetésekhez szükséges; a számviteli bizonylatokra a számvitelről szóló 2000. évi C. törvény 169. §-a vonatkozik.</td>
          </tr>
        </LegalTable>

        <h2>4. Kik ismerhetik meg az adataidat?</h2>
        <p>
          4.1. <strong>A Keyfly munkatársai</strong> kizárólag a feladatukhoz szükséges mértékben, kétlépcsős azonosítással férnek hozzá az adatokhoz;
          hozzáférésüket a változásnapló rögzíti. A munkatársakat titoktartási kötelezettség terheli.
        </p>
        <p>
          4.2. <strong>Más Felhasználók.</strong> A Bérleti jogviszony adatait a Bérbeadó és a Bérlő (és Bérlőtárs) látja; a Céges fiók adatait a
          Csapattagok Szerepkörük szerint látják. A Csapattagok látják egymás nevét, e-mail-címét és Szerepkörét; hozzáférési kérésnél a kérő nevét,
          e-mail-címét és üzenetét a Fiókgazda és az Adminok látják. A profilképedet, a lakcímedet és levelezési címedet, az aktív belépéseid és a
          biztonságos eszközeid listáját más Felhasználó (Csapattag, a Bérleti jogviszony másik féle) nem látja; a címeid a Bérleti jogviszony adatai
          közé sem kerülnek át. A Céges fiók cégadatait – a kapcsolattartási e-mail-címet és telefonszámot is – a Céges fiók minden Csapattagja látja.
          A Céges fiók bankszámláit is minden Csapattag látja, de csak a Fiókgazda és az Adminok vehetnek fel, módosíthatnak vagy törölhetnek; a
          személyes fiókod bankszámláit más Felhasználó nem látja. A bankszámlákat a Keyfly munkatársai a kifizetésekhez láthatják (4.1. pont). Az
          ellenőrzések nyers adatait (M5) a másik fél nem látja; a Bérbeadó.
        </p>
        <p>4.3. <strong>Adatfeldolgozók</strong> (a Keyfly megbízásából, adatfeldolgozási szerződés alapján):</p>
        <LegalTable label="4.3. Adatfeldolgozók" head={["Adatfeldolgozó", "Feladat", "Adattárolás helye"]}>
          <tr>
            <td>Supabase Inc.</td>
            <td>Adatbázis, hitelesítés (bejelentkezés, munkamenetek, a kétlépcsős azonosítás titkos kulcsa), fájltárolás (pl. profilkép)</td>
            <td>EU régió</td>
          </tr>
          <tr>
            <td>Vercel Inc.</td>
            <td>Az alkalmazás tárhelye, szerveroldali funkciók</td>
            <td>EU (Frankfurt, fra1) a szerveroldali funkcióknál; a tartalomkiszolgáló hálózat globális</td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>Rendszerértesítő e-mailek küldése</td>
            <td>EU (Írország, eu-west-1)</td>
          </tr>
          <tr>
            <td>Twilio Ireland Limited (Dublin, Írország; a Twilio Inc., USA része)</td>
            <td>
              Telefonszám-megerősítés (Twilio Verify): a 6 jegyű kód előállítása, SMS-ben küldése és ellenőrzése; visszaélés-megelőzés (Fraud Guard)
            </td>
            <td>USA-ba továbbítás lehetséges (4.5. pont)</td>
          </tr>
          <tr>
            <td>
              Cloudflare, Inc. (USA) – adatvédelmi irányelvek: <a href="https://www.cloudflare.com/privacypolicy/">cloudflare.com/privacypolicy</a>
            </td>
            <td>Robotszűrés (Turnstile) a belépési, regisztrációs és elfelejtett jelszó űrlapokon (X sor)</td>
            <td>Globális hálózat; USA-ba továbbítás lehetséges (4.5. pont)</td>
          </tr>
          <tr>
            <td>Google – Google Workspace</td>
            <td>Ügyfélszolgálati postafiók ({support})</td>
            <td>–</td>
          </tr>
        </LegalTable>
        <p>4.4. <strong>Önálló adatkezelők</strong>, akiknek adatot továbbítunk, vagy akik a szolgáltatásukhoz közvetlenül kezelik az adataidat:</p>
        <ul>
          <li><strong>Partnerbiztosító</strong> – kockázatvállalás, szerződéskötés, kárrendezés, megtérítés;</li>
          <li><strong>Fizetési szolgáltató</strong> – a bankkártya- és fizetési adatok kezelése;</li>
          <li><strong>Engedélyezett számlainformációs szolgáltató</strong> – a bankszámla-adatok lekérése a hozzájárulásod alapján;</li>
          <li><strong>Azonosítási szolgáltató</strong> – személyazonosság ellenőrzése;</li>
          <li>
            <strong>Google Maps Places</strong> – amikor a bérelt ingatlan, a lakcímed, a levelezési címed vagy a Céges fiók címét megadod, a beírt
            címrészletet a Keyfly szervere továbbítja a Google-nak, és címjavaslatokat kap vissza. A Google csak a beírt szöveget kapja meg: a neved,
            az e-mail-címed és az IP-címed nem, a böngésződ nem kapcsolódik közvetlenül a Google-hoz, és Google-süti sem kerül az eszközödre. A
            javaslatlistán „Powered by Google” jelölés látható;
          </li>
          <li>
            Google Ireland Limited / Google LLC – bejelentkezés Google-fiókkal, ha ezt választod: a Google a saját bejelentkezési szolgáltatásában
            önálló adatkezelőként azonosít, és továbbítja nekünk a nevedet, az e-mail-címedet és a Google-fiókazonosítódat (2.9. pont; <a href="https://policies.google.com/privacy">a
            Google adatvédelmi irányelvei</a>);
          </li>
          <li>
            számlázz.hu – Céges fiók létrehozásakor és a „Frissítés a NAV-ból” funkció használatakor az adószám első nyolc számjegyét továbbítjuk, és
            a NAV adózói nyilvántartásából visszakapjuk a szervezet nevét, adószámát és székhelyét (2.6. pont); a Felhasználóról személyes adatot nem
            továbbítunk;
          </li>
          <li><strong>Hatóságok, bíróságok</strong> (pl. NAIH, MNB, nyomozóhatóság) – kizárólag jogszabályon alapuló megkeresés esetén.</li>
        </ul>
        <p>
          4.5. <strong>Harmadik országba továbbítás.</strong> Adataidat elsősorban az EU-ban tároljuk. A Supabase, a Vercel, a Resend, a Google, a
          Twilio és a Cloudflare anyavállalata, illetve székhelye az Amerikai Egyesült Államokban van, ezért támogatási, karbantartási vagy hálózati
          célból előfordulhat EU-n kívüli hozzáférés. Ilyenkor a továbbítás az EU–USA adatvédelmi keretrendszer szerinti tanúsítás (GDPR 45. cikk)
          vagy az Európai Bizottság által elfogadott általános szerződési feltételek (GDPR 46. cikk) alapján történik. A garanciákról a {support} címen
          kérhetsz másolatot.
        </p>

        <h2>5. Automatizált döntéshozatal és profilalkotás</h2>
        <p>
          5.1. <strong>Mikor döntünk automatizáltan?</strong> Ajánlatkéréskor a Platform értékeli, hogy jogosult vagy-e a kaucióhelyettesítő
          garanciára, és milyen Díjjal. Ha teljesen automatizált, és rád nézve joghatással jár vagy hasonlóan jelentősen érint (pl. elutasítás vagy
          magasabb Díj), a GDPR 22. cikke alkalmazandó.
        </p>
        <p>
          5.2. <strong>Jogalap.</strong> Az automatizált döntés a szerződés megkötéséhez szükséges (GDPR 22. cikk (2) a)), mert az ajánlat azonnali,
          online előállítását szolgálja.
        </p>
        <p>5.3. <strong>A döntés logikája.</strong> A döntés a következő szempontokon alapul:</p>
        <ul>
          <li>a személyazonosság ellenőrzésének eredménye;</li>
          <li>az igazolt jövedelem és a bérleti díj aránya;</li>
          <li>a kaució összege;</li>
          <li>nagy összegű kauciónál a feltöltött KHR-jelentés adatai.</li>
        </ul>
        <p>
          A döntéshez nem használunk különleges kategóriába tartozó adatot, és olyan jellemzőt sem, amely nemre, életkorra, származásra vagy más
          védett tulajdonságra utal.
        </p>
        <p>5.4. <strong>Garanciák.</strong> Ha automatizált döntés érint, jogosult vagy arra, hogy:</p>
        <ol>
          <li>emberi beavatkozást kérj (a döntést a Keyfly erre jogosult munkatársa felülvizsgálja);</li>
          <li>kifejtsd az álláspontodat, és további dokumentumokat nyújts be;</li>
          <li>kifogást emelj a döntés ellen.</li>
        </ol>
        <p>
          Kérelmedet a döntés képernyőjén vagy a {support} címen nyújthatod be. A felülvizsgálatot 15 napon belül elvégezzük, és az eredményről
          indokolt tájékoztatást küldünk. A döntési modellt rendszeresen ellenőrizzük hibák és indokolatlan megkülönböztetés szempontjából.
        </p>
        <p>
          5.5. <strong>A Partnerbiztosító döntése.</strong> A végleges kockázatvállalási döntést a Partnerbiztosító hozza; az ahhoz kapcsolódó
          jogaidról a Partnerbiztosító tájékoztatója rendelkezik.
        </p>
        <p>5.6. <strong>Marketing.</strong> Adataidról marketing célú profilt nem készítünk.</p>

        <h2>6. Sütik az alkalmazásban</h2>
        <p>
          6.1. Az alkalmazás kizárólag a működéshez szükséges, illetve az általad kifejezetten kért funkcióhoz szükséges sütiket és hasonló helyi
          tárolási megoldásokat használ. Ezekhez az elektronikus hírközlésről szóló 2003. évi C. törvény 155. § (4) bekezdése alapján nem kell
          hozzájárulás.
        </p>
        <LegalTable label="6. Sütik az alkalmazásban" head={["Süti", "Cél", "Élettartam", "Típus"]}>
          <tr>
            <td>Munkamenet- / hitelesítési süti</td>
            <td>A bejelentkezés fenntartása a munkamenet alatt, a kérések hitelesítése</td>
            <td>A munkamenet végéig</td>
            <td>Feltétlenül szükséges</td>
          </tr>
          <tr>
            <td>„Maradjak bejelentkezve” süti</td>
            <td>Bejelentkezve tart a böngésző bezárása után is, ha ezt választod</td>
            <td>–</td>
            <td>Az általad kért funkcióhoz szükséges</td>
          </tr>
          <tr>
            <td>Nyelvi süti</td>
            <td>A választott nyelv (magyar/angol) megjegyzése</td>
            <td>–</td>
            <td>Az általad kért funkcióhoz szükséges</td>
          </tr>
          <tr>
            <td><code>{TRUSTED_COOKIE}</code></td>
            <td>
              Biztonságos eszköz felismerése: ha kérted, ezen a böngészőn 30 napig nem kérjük a kétlépcsős kódot. httpOnly süti, egy rekordazonosítót
              és egy véletlen tokent tartalmaz; nálunk csak a token hash-e tárolódik.
            </td>
            <td>30 nap</td>
            <td>Feltétlenül szükséges (biztonsági süti)</td>
          </tr>
        </LegalTable>
        <p>
          6.2. Az alkalmazásban analitikai vagy marketing sütit nem használunk. Ha a jövőben bevezetnénk ilyet, előtte a hozzájárulásodat kérjük. A
          sütiket a böngésződ beállításaiban törölheted; a szükséges sütik törlése után újra be kell jelentkezned.
        </p>

        <h2>7. Hogyan védjük az adataidat?</h2>
        <p>A GDPR 32. cikke szerint a kockázattal arányos technikai és szervezési intézkedéseket alkalmazunk, különösen:</p>
        <ul>
          <li>titkosított (HTTPS/TLS) adatátvitel; adattárolás EU-beli adatközpontokban;</li>
          <li>
            jelszavak kizárólag hashelt formában; lejáró e-mailes hivatkozások (megerősítés, jelszó-visszaállítás: 1 óra) és egyszer használható
            meghívó hivatkozások (meghívó: 7 nap, munkatársi meghívó: 48 óra);
          </li>
          <li>szerepkör-alapú hozzáférés (Fiókgazda/Admin/Kezelő/Megtekintő), a bérleti adatokhoz csak az érintett felek férnek hozzá;</li>
          <li>munkatársi hozzáférés csak kétlépcsős azonosítással és a szükséges mértékben;</li>
          <li>
            a Felhasználók számára választható kétlépcsős azonosítás hitelesítő alkalmazással vagy e-mailben küldött kóddal (a kódot csak hash
            formában tároljuk, 5 percig érvényes, 5 hibás próbálkozás után érvényét veszti); a tartalék kódokat kizárólag SHA-256 hash formában
            tároljuk, a tartalékkód-próbálkozásokat óránként 10-re korlátozzuk, és a kétlépcsős azonosítás be- és kikapcsolásáról, valamint a tartalék
            kóddal történt belépésről mindig e-mailt küldünk;
          </li>
          <li>
            biztonságos eszközök: a kétlépcsős kód 30 napos kihagyása csak a Felhasználó kérésére (alapból kikapcsolva); a böngészőben tárolt véletlen
            tokennek csak a hash-ét tároljuk; Felhasználónként legfeljebb 10 eszköz, amelyeket jelszóváltáskor, a kétlépcsős azonosítás
            kikapcsolásakor és tartalék kódos belépéskor mind törölünk; a Keyfly munkatársainál nem érhető el;
          </li>
          <li>
            telefonszám-megerősítés: a telefonszám csak SMS-kóddal megerősítve kerül a profilba; a kódot a Twilio állítja elő és ellenőrzi, a Keyfly
            nem tárolja; a kód 10 percig érvényes, túl sok hibás próbálkozás után a Twilio letiltja; óránként legfeljebb 3, naponta legfeljebb 10 kód
            kérhető;
          </li>
          <li>
            bankszámlák: az IBAN ellenőrző számjegyeit helyben ellenőrizzük; bankszámlát csak a fiók Fiókgazdája és Adminjai (személyes fióknál te)
            vehetnek fel, módosíthatnak vagy törölhetnek, és a módosításokat a változásnapló a számlaszám utolsó négy karakterével, a számlatulajdonos
            neve nélkül rögzíti;
          </li>
          <li>
            az aktív belépések listája, ahonnan bármelyik másik eszköz kijelentkeztethető; jelszóváltáskor a többi eszközön automatikusan
            kijelentkeztetünk;
          </li>
          <li>
            az e-mail-cím és a jelszó módosításához a jelenlegi jelszó, a Fiók törléséhez a jelszó és – ha be van kapcsolva – a kétlépcsős azonosítás
            kódja szükséges;
          </li>
          <li>a profilképet privát tárhelyen tároljuk, csak a Felhasználó fér hozzá, és rövid lejáratú hivatkozással jelenik meg;</li>
          <li>az ingatlanfotókat és -videókat privát tárhelyen tároljuk, csak a fiók tagjai és – ügyfélszolgálati célból – a Keyfly munkatársai férnek hozzájuk, és rövid lejáratú hivatkozással jelennek meg;</li>
          <li>csak hozzáfűzhető, utólag nem módosítható változásnapló;</li>
          <li>az ellenőrzések nyers adatainak gyors törlése (3. pont, M5);</li>
          <li>adatfeldolgozási szerződések a szolgáltatókkal; rendszeres biztonsági mentés.</li>
        </ul>
        <p>
          Adatvédelmi incidens esetén azt nyilvántartjuk, szükség esetén 72 órán belül bejelentjük a NAIH-nak (GDPR 33. cikk), és ha az incidens
          valószínűleg magas kockázattal jár rád nézve, késedelem nélkül tájékoztatunk (GDPR 34. cikk).
        </p>

        <h2>8. Milyen jogaid vannak, és hogyan élhetsz velük?</h2>
        <LegalTable label="8. Milyen jogaid vannak, és hogyan élhetsz velük?" head={["Jog", "Mit jelent", "Mikor élhetsz vele"]}>
          <tr>
            <td>Hozzáférés (GDPR 15. cikk)</td>
            <td>Tájékoztatást és másolatot kérhetsz a kezelt adataidról; adataidat a beállításokban magad is letöltheted (8.3. pont).</td>
            <td>Mindig</td>
          </tr>
          <tr>
            <td>Helyesbítés (16. cikk)</td>
            <td>
              Kérheted a pontatlan adatok javítását; a nevedet, telefonszámodat, profilképedet, nyelvedet és e-mail-címedet a Fiókban magad is
              módosíthatod.
            </td>
            <td>Mindig</td>
          </tr>
          <tr>
            <td>Törlés (17. cikk)</td>
            <td>Kérheted adataid törlését; a Fiókodat a beállításokban magad is törölheted (8.4. pont).</td>
            <td>Ha a megőrzés nem szükséges jogi kötelezettséghez vagy jogi igényhez (3. pont)</td>
          </tr>
          <tr>
            <td>Korlátozás (18. cikk)</td>
            <td>Kérheted, hogy adataidat csak tároljuk, de másra ne használjuk.</td>
            <td>Pl. vitatott pontosság vagy folyamatban lévő tiltakozás idejére</td>
          </tr>
          <tr>
            <td>Adathordozhatóság (20. cikk)</td>
            <td>Géppel olvasható formában megkaphatod az általad megadott adatokat; JSON-fájlként magad is letöltheted (8.3. pont).</td>
            <td>Szerződésen vagy hozzájáruláson alapuló adatkezelésnél</td>
          </tr>
          <tr>
            <td>Tiltakozás (21. cikk)</td>
            <td>Tiltakozhatsz a jogos érdeken alapuló adatkezelés ellen.</td>
            <td>A 2. pontban f) jogalapú adatkezeléseknél</td>
          </tr>
          <tr>
            <td>Hozzájárulás visszavonása (7. cikk (3))</td>
            <td>
              Bármikor visszavonhatod; ez nem érinti a korábbi adatkezelés jogszerűségét. A Keyfly-újdonságokra vonatkozó hozzájárulást az Értesítések
              között a kapcsoló kikapcsolásával vonhatod vissza.
            </td>
            <td>Hozzájáruláson alapuló adatkezelésnél</td>
          </tr>
          <tr>
            <td>Automatizált döntéssel kapcsolatos jogok (22. cikk)</td>
            <td>Emberi beavatkozás, álláspont kifejtése, kifogás.</td>
            <td>5. pont</td>
          </tr>
        </LegalTable>
        <p>
          8.1. Kérelmedet a {support} címre küldheted. Indokolatlan késedelem nélkül, legkésőbb egy hónapon belül válaszolunk; ez szükség esetén
          további két hónappal meghosszabbítható, amiről tájékoztatunk (GDPR 12. cikk (3)). Az eljárás díjmentes. Ha kétség merül fel a
          személyazonosságodat illetően, azonosításhoz szükséges kiegészítő információt kérhetünk.
        </p>
        <p>
          8.2. <strong>Lezárt bérleti szerződések.</strong> A lezárt bérleti szerződés adataihoz Bérlőként a megőrzési idő alatt csak olvasási
          hozzáférésed van; a törlési kérelmet a 3. pont szerinti megőrzési kötelezettségek figyelembevételével bíráljuk el.
        </p>
        <p>
          8.3. <strong>Adataid letöltése.</strong> A beállításokban (Adataid → Adatok letöltése) egy JSON-fájlban letöltheted a profilodat, a
          fiókjaidat és tagságaidat, a hozzáférési kéréseidet, a bérleti szerződés-kérelmeidet, a számodra látható bérleti jogviszonyokat és
          ingatlanokat, az általad küldött meghívókat, a hozzájárulásaidat, az ajánlatkéréseidet, kötvényeidet és kárügyeidet, az aktív belépéseidet
          (eszköz, kezdet, utolsó aktivitás), a kétlépcsős azonosítás adatait (típus, bekapcsolás ideje), a biztonságos eszközeidet (megnevezés,
          megjelölés, lejárat, utolsó használat), a telefonszámod megerősítésének idejét és a fiókjaidhoz tartozó bankszámlákat (GDPR 15. és 20.
          cikk). A fájl titkos adatokat (pl. meghívó- és tartalékkódok) nem tartalmaz.
        </p>
        <p>
          8.4. <strong>A Fiók törlése.</strong> A Fiókodat a beállításokban (Adataid → Fiók törlése) magad is törölheted a jelszavad és – ha
          bekapcsoltad – a kétlépcsős azonosítás kódjának megadásával. A törlés nem lehetséges, amíg olyan Céges fiók Fiókgazdája vagy, amelynek más
          tagja is van (előbb a fiókgazdai szerepet kell átadnod), amíg biztosítási kötvényed vagy kárügyed van (ilyenkor a törlést az ügyfélszolgálat
          intézi, a 3. pont szerinti megőrzési kötelezettségek figyelembevételével), ha a Keyfly munkatársa vagy, illetve ha a személyes fiókodhoz
          vagy egy csak általad használt Céges fiókhoz ingatlan, bérleti jogviszony vagy bérleti szerződés-kérelem tartozik (ilyenkor is az
          ügyfélszolgálat intézi a törlést: {support}). A törléskor azonnal törlődik a belépésed (a munkamenetekkel, a kétlépcsős azonosítással, a
          tartalék kódokkal és a biztonságos eszközökkel együtt), a profilod (a telefonszám megerősítésének adataival) és a profilképed, a személyes
          fiókod (a hozzá megadott bankszámlákkal), a csapattagságaid, a hozzáférési kéréseid, a hozzájárulási nyilatkozataid és az ajánlatkéréseid
          rekordja, valamint azok a Céges fiókok, amelyeknek egyedüli tagja voltál (bankszámláikkal együtt). Azokban a Céges fiókokban, amelyekben
          rajtad kívül más is tag, az általad rögzített adatok (pl. ingatlanok, bérleti jogviszonyok) a Céges fióknál maradnak; a változásnapló
          bejegyzései (M9) megmaradnak.
        </p>

        <h2>9. Jogorvoslat</h2>
        <p>9.1. Panaszoddal először hozzánk fordulhatsz ({support}), de ez nem feltétele a hatósági vagy bírósági eljárásnak.</p>
        <p>9.2. <strong>Panasz a felügyeleti hatóságnál</strong> (GDPR 77. cikk):</p>
        <ul>
          <li>{DPA.name.hu}</li>
          <li>Székhely: {DPA.address}</li>
          <li>Postacím: {DPA.postalAddress}</li>
          <li>Telefon: {DPA.phone}</li>
          <li>E-mail: <a href={`mailto:${DPA.email}`}>{DPA.email}</a></li>
          <li>Weboldal: <a href={DPA.web}>{DPA.web}</a></li>
        </ul>
        <p>Panaszt a szokásos tartózkodási helyed vagy munkahelyed szerinti más EU-tagállami felügyeleti hatóságnál is tehetsz.</p>
        <p>
          9.3. <strong>Bírósági jogorvoslat</strong> (GDPR 79. cikk, Infotv. 23. §): pert indíthatsz; a per elbírálása a törvényszék hatáskörébe
          tartozik, és választásod szerint a lakóhelyed vagy tartózkodási helyed szerinti törvényszék előtt is megindítható.
        </p>

        <h2>10. Adatvédelmi tisztviselő, módosítás, verzió</h2>
        <p>10.1. <strong>Adatvédelmi tisztviselő.</strong> Adatvédelmi kérdésekben a {support} címen érsz el minket.</p>
        <p>
          10.2. <strong>Módosítás.</strong> A tájékoztatót az adatkezelések vagy a jogszabályok változása esetén módosítjuk. Lényeges változás előtt
          e-mailben és az alkalmazásban értesítünk. Ha új adatkezeléshez hozzájárulás szükséges, azt külön kérjük.
        </p>
        <p>
          10.3. <strong>Verzió:</strong>
        </p>
        <ul>
          <li>Verzió: {CONSENT_VERSIONS.accountPrivacy}</li>
          <li>Hatályba lépés: {date(LEGAL_EFFECTIVE.appPrivacy, locale)}</li>
          <li>
            Kapcsolódó dokumentumok: <a href={termsHref}>Keyfly ÁSZF</a>; <a href={waitlistHref}>a várólista adatkezelési tájékoztatója</a>; a
            Partnerbiztosító adatkezelési tájékoztatója
          </li>
        </ul>
      </>
    );
  }

  return (
    <>
      <p><em>This English text is provided for information only. In case of any discrepancy, the Hungarian version in Part I prevails.</em></p>

      <h2>1. Who processes your data, and what does this notice cover?</h2>
      <p>1.1. <strong>Controller:</strong></p>
      <ul>
        <li>{COMPANY.legalName} ({COMPANY.shortName})</li>
        <li>Registered office: {address}, Hungary</li>
        <li>Company reg. no.: Cg. {COMPANY.registrationNumber}; tax no.: {COMPANY.taxNumber}</li>
        <li>Email: {support}</li>
        <li>Brand: Keyfly ({site}, app: {app})</li>
      </ul>
      <p>
        1.2. <strong>Scope.</strong> This notice covers processing in the Keyfly app ({PRODUCTION_HOSTS.portal}): accounts and account security
        (two-step verification, active sign-ins), company accounts and teams, email notifications, phone confirmation, bank accounts, properties,
        leases, invitations, quotes, checks (identity, income, KHR), payments, claims and support. Processing for the {BRAND.domain} website waitlist
        is covered by a <a href={waitlistHref}>separate notice</a>.
      </p>
      <p>
        1.3. <strong>Legal framework.</strong> Processing is governed by the General Data Protection Regulation (EU) 2016/679 (<strong>GDPR</strong>),
        Hungarian Act CXII of 2011 on informational self-determination and freedom of information (<strong>Infotv.</strong>), and the insurance
        secrecy rules of Act LXXXVIII of 2014 on Insurance Activity (<strong>Bit.</strong>).
      </p>
      <p>
        1.4. <strong>Role of the Partner Insurer.</strong> The deposit-replacement guarantee is provided by the Partner Insurer, which processes data
        for underwriting, claims and recovery as an independent controller under its own privacy notice.
      </p>

      <h2>2. Purposes, legal bases and data categories</h2>
      <p>
        The table shows, per purpose, the data subjects, data categories and legal basis under GDPR Article 6(1). Retention periods are in section 3
        (column “R” points there).
      </p>
      <LegalTable
        label="2. Purposes, legal bases and data categories"
        head={["#", "Purpose", "Data subjects", "Data categories", "Legal basis", "R"]}
      >
        <tr>
          <td>A</td>
          <td>Account creation, sign-in, account management</td>
          <td>Users</td>
          <td>
            name, email, phone number, profile photo, home and mailing address (country, postal code, city, street and number, floor/door; optional),
            password (hashed only), language setting, Terms version and acceptance time, email links (confirmation, password reset), last sign-in
            time; for Google sign-in, the name, email address and Google account identifier received from Google (section 2.9)
          </td>
          <td>(b) contract</td>
          <td>M1</td>
        </tr>
        <tr>
          <td>B</td>
          <td>Company accounts and Teams (adding a company by tax number, invitations, access requests, Roles, Account holder hand-over)</td>
          <td>Team members, people requesting access, company representative</td>
          <td>
            company name, tax no., registered office retrieved from the NAV taxpayer register and time of the lookup (section 2.6); company details
            entered or edited by the Account holder and Admins: display name, legal name, last three digits of the tax number, EU VAT number, company
            registration number, registered office, mailing address, contact email and phone number; Plan; member name, email, Role (Account
            holder/Admin/Manager/Viewer), time of joining and invitation; access request: requester&apos;s name, email, message, times of request and
            decision, the person who decided
          </td>
          <td>(b) contract; for the company representative&apos;s data, (f) legitimate interest</td>
          <td>M1, M3</td>
        </tr>
        <tr>
          <td>C</td>
          <td>Properties and leases</td>
          <td>Landlord, Tenant, Co-tenant; contacts recorded by the Landlord (e.g. owner, condominium manager, caretaker, provider)</td>
          <td>
            structured property address and property type (flat, house, room, office, retail unit, hospitality venue, warehouse/industrial property,
            garage/parking space or other), land-registry no. (optional), features, photos and videos (or video links), letting terms and listing text, utility and service data
            (provider, supply-point and customer IDs, meter serial numbers, settlement), contacts&apos; name, role, email, phone, address and the note
            about them, internal note; for Excel/CSV imports the file name (your browser reads the file; the file itself is not stored) and the values
            an import overwrote while it can be undone; lease period, rent, deposit amount, parties&apos; names and contact details, lease status
          </td>
          <td>(b) contract; for contacts recorded by the Landlord, (f) legitimate interest (managing the property and the lease)</td>
          <td>M2</td>
        </tr>
        <tr>
          <td>D</td>
          <td>Sending Invitations (to leases, Teams)</td>
          <td>Invited person (may not yet be a User)</td>
          <td>name, email, sender, subject of invitation, times sent, expiring and accepted</td>
          <td>(f) legitimate interest (the inviting party&apos;s and Keyfly&apos;s interest in making contact)</td>
          <td>M3</td>
        </tr>
        <tr>
          <td>E</td>
          <td>Recording Co-tenants and Occupants</td>
          <td>Co-tenants, Occupants</td>
          <td>name</td>
          <td>(f) legitimate interest</td>
          <td>M2</td>
        </tr>
        <tr>
          <td>F</td>
          <td>Quote and eligibility assessment</td>
          <td>Tenant, Co-tenant</td>
          <td>lease data, results of checks (G–I), derived indicators, quote, decision and reasons</td>
          <td>(b) pre-contractual steps; for automated decisions GDPR Art. 22(2)(a) (section 5)</td>
          <td>M4</td>
        </tr>
        <tr>
          <td>G</td>
          <td>Identity verification (planned)</td>
          <td>Tenant</td>
          <td>name, place and date of birth, DÁP verification result, or ID type, number, expiry</td>
          <td>–</td>
          <td>M5</td>
        </tr>
        <tr>
          <td>H</td>
          <td>Income verification (planned)</td>
          <td>Tenant, Co-tenant</td>
          <td>
            open banking: account holder name, account no., credits for the months consented; or NAV income statement; or employer certificate; result
            (verified income band)
          </td>
          <td>
            (b) pre-contractual steps; open-banking access also requires your explicit consent given to the account information service provider
          </td>
          <td>M5</td>
        </tr>
        <tr>
          <td>I</td>
          <td>Upload of own KHR report (large deposits)</td>
          <td>Tenant</td>
          <td>content of the KHR report (credit data, arrears), assessment result</td>
          <td>–</td>
          <td>M5</td>
        </tr>
        <tr>
          <td>J</td>
          <td>Proof of data accuracy declaration and consents</td>
          <td>Users</td>
          <td>text and document version of declaration/consent, time, User ID</td>
          <td>(c) legal obligation (GDPR Art. 7(1)); (f) legitimate interest (evidence)</td>
          <td>M6</td>
        </tr>
        <tr>
          <td>K</td>
          <td>Insurance distribution: transfer to the Partner Insurer</td>
          <td>Tenant, Landlord, Co-tenant</td>
          <td>data needed for the quote and contract (C, results of F–I)</td>
          <td>(b) contract; (c) legal obligation (Bit.)</td>
          <td>M2</td>
        </tr>
        <tr>
          <td>L</td>
          <td>Claims coordination</td>
          <td>Landlord, Tenant</td>
          <td>claim notice, amount claimed, documents, photos, comments, messages</td>
          <td>(b) contract; (f) legitimate interest (legal claims)</td>
          <td>M2</td>
        </tr>
        <tr>
          <td>M</td>
          <td>Payments and invoicing</td>
          <td>Paying Users</td>
          <td>name/company name, billing address, tax no., amount, transaction ID; Keyfly does not process card data</td>
          <td>(b) contract; invoices: (c) legal obligation (accounting and VAT rules)</td>
          <td>M7</td>
        </tr>
        <tr>
          <td>N</td>
          <td>Support and complaints</td>
          <td>Requesters</td>
          <td>name, email, request content, reply</td>
          <td>support: (f) legitimate interest; consumer complaints: (c) legal obligation (Fgytv. s. 17/A)</td>
          <td>M8</td>
        </tr>
        <tr>
          <td>O</td>
          <td>Audit log and staff access</td>
          <td>Users, staff</td>
          <td>who changed what and when (old and new value), staff access</td>
          <td>(f) legitimate interest (evidence, security, GDPR Art. 32)</td>
          <td>M9</td>
        </tr>
        <tr>
          <td>P</td>
          <td>Security and technical logs</td>
          <td>Users, visitors</td>
          <td>IP address, browser and device data, sign-in attempts, error logs</td>
          <td>(f) legitimate interest (abuse prevention, operational security)</td>
          <td>M10</td>
        </tr>
        <tr>
          <td>Q</td>
          <td>
            System emails (invitations, confirmation and password-reset links, two-step sign-in codes, lease and team events, invoices, security
            notices)
          </td>
          <td>Users</td>
          <td>email, language, content and category of notification, delivery status; notification settings per topic (section 2.5)</td>
          <td>(b) contract; security notices: also (f) legitimate interest (account security, GDPR Art. 32)</td>
          <td>M10</td>
        </tr>
        <tr>
          <td>R</td>
          <td>Two-step verification (optional)</td>
          <td>Users</td>
          <td>
            authenticator app secret (held in Supabase&apos;s authentication service) and time it was turned on; 10 backup codes stored only as
            SHA-256 hashes and time of use; failed backup-code attempts (User ID, time); email sign-in code: the code stored only as a hash, its
            expiry, number of wrong tries and send log (User ID, time), and whether you turned the email code off
          </td>
          <td>
            (b) contract (a security feature you turned on); logging failed attempts: (f) legitimate interest (preventing code guessing, GDPR Art. 32)
          </td>
          <td>M11</td>
        </tr>
        <tr>
          <td>S</td>
          <td>Active sign-ins (sessions) list and signing out</td>
          <td>Users</td>
          <td>
            session ID, browser identification string (user agent), IP address, time of sign-in and last activity; the list only shows browser,
            operating system and last activity
          </td>
          <td>(b) contract; (f) legitimate interest (account security)</td>
          <td>M12</td>
        </tr>
        <tr>
          <td>T</td>
          <td>Keyfly news by email (optional, off by default)</td>
          <td>Users who turned it on</td>
          <td>name, email, language, state of the setting</td>
          <td>(a) consent</td>
          <td>M13</td>
        </tr>
        <tr>
          <td>U</td>
          <td>Trusted devices (skipping the two-step code in a browser for 30 days; optional)</td>
          <td>Users who ask for it</td>
          <td>
            record ID, User ID, SHA-256 hash of a random token, device label (browser · operating system, from the user agent), times marked, expiring
            and last used; in the browser, the <code>{TRUSTED_COOKIE}</code> cookie (section 6)
          </td>
          <td>(b) contract (a security feature you requested)</td>
          <td>M14</td>
        </tr>
        <tr>
          <td>V</td>
          <td>Confirming the phone number with an SMS code (section 2.7)</td>
          <td>Users who add a phone number</td>
          <td>
            phone number; the number being confirmed and the end of its 10-minute window; log of SMS sent (User ID, time); time of confirmation. Data
            passed to Twilio: the phone number and the message language; Twilio generates, sends and checks the code, which Keyfly never sees or
            stores.
          </td>
          <td>(b) contract</td>
          <td>M1, M15</td>
        </tr>
        <tr>
          <td>W</td>
          <td>Bank accounts for claim payouts and refunds (optional; section 2.8)</td>
          <td>Users; Team members of Company accounts</td>
          <td>
            currency, IBAN, account holder name, label, primary flag, who added it and when, time of change; changes are recorded in the audit log
            with only the last four characters of the account number and without the holder&apos;s name (row O)
          </td>
          <td>(b) contract</td>
          <td>M16</td>
        </tr>
        <tr>
          <td>X</td>
          <td>
            Protection against automated abuse (bot check, Cloudflare Turnstile) on the sign-in, sign-up and forgotten-password forms
            ({PRODUCTION_HOSTS.portal}, {PRODUCTION_HOSTS.admin})
          </td>
          <td>Visitors using these forms</td>
          <td>
            IP address, browser and device signals evaluated by Cloudflare, a one-time token; our server sends the token and the visitor&apos;s IP
            address to Cloudflare for verification. Keyfly stores none of this.
          </td>
          <td>(f) legitimate interest (protection against abuse, security, GDPR Art. 32)</td>
          <td>not stored</td>
        </tr>
      </LegalTable>
      <p>
        2.1. <strong>Data received from others.</strong> If another User provides your data (e.g. as invitee, Co-tenant or Occupant), we inform you of
        this notice at first contact (invitation email), and at the latest within one month (GDPR Art. 14). Keyfly does not contact the people a
        Landlord records as contacts (e.g. owner, condominium manager, caretaker, provider); only members of the Landlord&apos;s account and, where
        the Landlord marks it, the property&apos;s Tenant can see their data. They can exercise their rights (section 8) with us as well.
      </p>
      <p>
        2.2. <strong>Legitimate interest.</strong> We carry out a balancing test for processing based on legitimate interest, available on request.
        You may object to such processing (section 8).
      </p>
      <p>
        2.3. <strong>Special categories.</strong> We do not ask for special-category data (e.g. health or religious data). In open-banking checks we
        only examine credits (income) and do not store details of debits.
      </p>
      <p>
        2.4. <strong>Consequence of not providing data.</strong> Data needed for purposes A, C and F–I is a condition of the service or the quote;
        without it we cannot create an Account or give a quote.
      </p>
      <p>
        2.5. <strong>Email notifications.</strong> You can switch off service notifications (row Q) by topic in your settings: lease changes,
        reminders before the lease term ends, Team (access requests, Account holder changes), invoices. Invitations and security notices (e.g.
        two-step verification turned on or off, sign-in with a backup code) are always sent. Emails about Keyfly news (row T, at most one a month) are
        off by default: we only send them if you turn the switch on, and you can withdraw your consent at any time by turning it off.
      </p>
      <p>
        2.6. <strong>Source of Company account data.</strong> When a Company account is created, we send the first eight digits of the tax number
        entered to the számlázz.hu taxpayer lookup service, which returns the organisation&apos;s name, tax number and registered office from the NAV
        taxpayer register (row B, section 4.4). This data is retrieved again when the Company account is created. Later, the Account holder and Admins
        can edit the company details by hand (except the first eight digits of the tax number) and retrieve them again with “Refresh from NAV”; this
        too sends only the first eight digits of the tax number, and the retrieved data is only stored in the Company account when saved. The Company
        account&apos;s contact email and phone number may be an employee&apos;s personal data (e.g. an email address containing their name).
      </p>
      <p>
        2.7. <strong>Phone number.</strong> Giving your phone number is optional. We use it to contact you about the lease and the insurance and
        (planned) to confirm your identity when you request insurance. When you add or change the number, you must confirm it with a 6-digit code sent
        by SMS; this requires a confirmed email address. The code is generated by our processor Twilio&apos;s Verify service (section 4.3), sent from
        a sender Twilio chooses per country (with the text “A Keyfly ellenőrző kódod: …” and a warning not to share it), and checked by Twilio; Keyfly
        never sees or stores the code. Twilio receives your phone number and, as part of the service, also processes it for fraud prevention (Fraud
        Guard). The code is valid for 10 minutes; Twilio blocks it after too many wrong tries. We request at most 3 codes an hour and 10 a day. We
        only send SMS to mobile numbers used in the European Union and EEA member states, Switzerland, the United Kingdom, Ukraine, Serbia, the United
        States and Canada. We keep the phone number and the time of confirmation until you remove it or delete the Account.
      </p>
      <p>
        2.8. <strong>Bank accounts.</strong> We use the bank accounts given for your personal account or a Company account to pay claims and refunds;
        payouts go to the primary account in the payout currency. Hungarian account numbers are converted to IBAN and the check digits are verified
        locally; no external bank service is used for this.
      </p>
      <p>
        2.9. <strong>Sign-in with Google.</strong> If you sign up or sign in with your Google account, Google (Google Ireland Limited or Google LLC),
        as an independent controller, identifies you in its own sign-in service (<a href="https://policies.google.com/privacy">Google Privacy
        Policy</a>) and passes us your name, email address and Google account identifier. We use these to sign you in and to create your Account; we
        do not use or store your Google profile picture. Legal basis: (b) contract (the sign-in method you choose). You can unlink the Google account
        under Settings → Sign-in and security; we then delete the link to the Google account identifier, and you can later link another Google
        account. Your Account&apos;s sign-in email does not change when a Google account is linked. The Keyfly staff portal (admin) does not offer
        Google sign-in.
      </p>

      <h2>3. How long do we keep your data?</h2>
      <p>
        We keep data only as long as needed for the purpose or to meet a legal obligation. Where there is a dispute, regulatory proceeding or open
        claim/recovery, the data concerned is kept until it is finally closed. After the retention period, data is deleted or irreversibly anonymised.
      </p>
      <LegalTable label="3. How long do we keep your data?" head={["R", "Data category", "Retention", "Rationale"]}>
        <tr>
          <td>M1</td>
          <td>Account and team data</td>
          <td>
            While the Account exists. When the Account is deleted (section 8.4), the profile (name, email, phone number, home and mailing address,
            language, notification settings), profile photo, personal account, team memberships and any Company accounts used only by you are deleted
            at once; when a profile photo is replaced or removed, the previous image is deleted at once. Company account data: while the Company
            account exists. Email links (confirmation, password reset): valid for 1 hour, invalid once used; record deleted after 30 days. Google
            sign-in data (link to the Google account identifier): until the Google account is unlinked or the Account is deleted.
          </td>
          <td>Contract claims can be enforced within the 5-year general limitation period (Civil Code s. 6:22).</td>
        </tr>
        <tr>
          <td>M2</td>
          <td>Leases, property data, Co-tenants/Occupants, data passed to the Partner Insurer, claims</td>
          <td>
            5 years from Lease closure (lease end + 60 days, or claim closure); if recovery or a dispute is pending, until it closes. During this time
            the Tenant has read-only access to the closed Lease. Property data, photos, videos and contacts with no Lease: until the Landlord deletes them or the
            Account (Company account) is deleted. Values an import overwrote: 2 days after the import (daily automatic deletion).
          </td>
          <td>5-year limitation of claims under the lease and the guarantee (Civil Code s. 6:22).</td>
        </tr>
        <tr>
          <td>M3</td>
          <td>Invitation data; access requests to Company accounts</td>
          <td>
            Validity period (7 days; staff invitations 48 hours) + 1 year. Accepted invitations become part of the lease/team record (M1/M2). Access
            requests: until decided or withdrawn, then 1 year (daily automatic deletion); deleted at once when the requester&apos;s Account or the
            Company account is deleted.
          </td>
          <td>Proving who invited whom and investigating abuse; typically not needed after 1 year.</td>
        </tr>
        <tr>
          <td>M4</td>
          <td>Quotes and eligibility decisions</td>
          <td>If a contract is concluded, as M2; otherwise 1 year from the quote.</td>
          <td>Handling objections to the decision (GDPR Art. 22(3)), complaints and repeat requests.</td>
        </tr>
        <tr>
          <td>M5</td>
          <td>Raw check data: ID data/images, account transactions, NAV income statement, employer certificate, KHR report</td>
          <td>
            Up to 30 days after the decision, then deleted. Only the result is kept (check type, date, outcome, verified income band) under M4/M2.
          </td>
          <td>
            Data minimisation and storage limitation (GDPR Art. 5(1)(c) and (e)): raw data is not needed after the decision; 30 days allow errors and
            objections to be handled.
          </td>
        </tr>
        <tr>
          <td>M6</td>
          <td>Data accuracy declarations, consents, accepted document versions</td>
          <td>5 years from the end of the related contract or withdrawal of consent.</td>
          <td>Proof of consent and declaration (GDPR Art. 7(1)) within the limitation period.</td>
        </tr>
        <tr>
          <td>M7</td>
          <td>Invoices and accounting records</td>
          <td>8 years</td>
          <td>Section 169 of Act C of 2000 on Accounting.</td>
        </tr>
        <tr>
          <td>M8</td>
          <td>Support correspondence; complaints</td>
          <td>General requests: 2 years from closure. Consumer complaints and replies: 5 years.</td>
          <td>Complaints: Fgytv. s. 17/A (7). Other: handling repeat requests.</td>
        </tr>
        <tr>
          <td>M9</td>
          <td>Audit log and staff access</td>
          <td>Same as the related record (lease, account) (M1/M2); deleted with it. Entries cannot be modified meanwhile.</td>
          <td>The log is evidence for the record and has no purpose beyond it.</td>
        </tr>
        <tr>
          <td>M10</td>
          <td>Security and technical logs; email delivery logs</td>
          <td>90 days; in a security incident, until the investigation closes.</td>
          <td>Detecting abuse and errors; incidents are usually discovered within this time.</td>
        </tr>
        <tr>
          <td>M11</td>
          <td>Two-step verification data (authenticator app, backup codes, failed backup-code attempts, email sign-in codes and their send log)</td>
          <td>
            Until two-step verification is turned off, a backup code is used to sign in, or the Account is deleted; creating new backup codes deletes
            the previous ones. Failed attempts: deleted at once on a successful backup-code sign-in, otherwise after 1 day, at the daily automatic
            deletion. Email sign-in code: valid for 5 minutes, deleted within 1 day; send log: 2 days.
          </td>
          <td>Needed for the feature to work; the attempt log only serves the limit of 10 attempts an hour.</td>
        </tr>
        <tr>
          <td>M12</td>
          <td>Sessions (active sign-ins)</td>
          <td>
            Until the session ends: sign-out, signing out from the active sign-ins list, automatic sign-out after a password change, or Account
            deletion; a session ends automatically after 30 days without use.
          </td>
          <td>Needed to keep you signed in and for account security.</td>
        </tr>
        <tr>
          <td>M13</td>
          <td>Keyfly news setting</td>
          <td>Until consent is withdrawn (the switch is turned off) or the Account is deleted.</td>
          <td>Processing based on consent (GDPR Art. 7(3)).</td>
        </tr>
        <tr>
          <td>M14</td>
          <td>Trusted devices</td>
          <td>
            30 days from marking (expiry), then deleted at the daily automatic deletion; earlier if you remove it, change your password, turn off
            two-step verification, sign in with a backup code, or delete the Account. At most 10 devices per User; marking a new one deletes the
            oldest. The <code>{TRUSTED_COOKIE}</code> cookie lasts 30 days.
          </td>
          <td>Needed for the feature to work; the 30-day limit and automatic removal serve account security.</td>
        </tr>
        <tr>
          <td>M15</td>
          <td>Phone confirmation: number being confirmed and log of SMS sent</td>
          <td>
            Number being confirmed: deleted at once on successful confirmation, otherwise at the latest 1 day after the 10-minute window ends, at the
            daily automatic deletion. SMS log: 2 days. Phone number and time of confirmation: M1 (until removed or the Account is deleted).
          </td>
          <td>The number is only needed for confirmation; the log only serves the hourly and daily limits.</td>
        </tr>
        <tr>
          <td>M16</td>
          <td>Bank accounts</td>
          <td>
            Until you delete them, or until the personal account or the Company account is deleted. Payout records follow the accounting retention
            (M7). The undeletable audit log (M9) keeps only the last four characters of the account number from bank account changes, and not the
            holder&apos;s name.
          </td>
          <td>Needed for payouts; accounting records are subject to section 169 of Act C of 2000 on Accounting.</td>
        </tr>
      </LegalTable>

      <h2>4. Who can see your data?</h2>
      <p>
        4.1. <strong>Keyfly staff</strong> access data only as needed for their tasks, with two-factor authentication; access is recorded in the audit
        log. Staff are bound by confidentiality.
      </p>
      <p>
        4.2. <strong>Other Users.</strong> Lease data is visible to the Landlord and Tenant (and Co-tenants); Company account data is visible to Team
        members according to their Role. Team members see each other&apos;s name, email and Role; for an access request, the Account holder and Admins
        see the requester&apos;s name, email and message. Your profile photo, home and mailing address, and your lists of active sign-ins and trusted
        devices are not visible to other Users (Team members, the other party to a Lease); your addresses are not copied into Lease data either. A
        Company account&apos;s company details – including the contact email and phone number – are visible to all its Team members. A Company
        account&apos;s bank accounts are also visible to all Team members, but only the Account holder and Admins can add, change or delete them; your
        personal account&apos;s bank accounts are not visible to other Users. Keyfly staff may see bank accounts for payouts (section 4.1). The other
        party does not see raw check data (M5); the Landlord.
      </p>
      <p>4.3. <strong>Processors</strong> (acting on Keyfly&apos;s behalf under a data processing agreement):</p>
      <LegalTable label="4.3. Processors" head={["Processor", "Task", "Data location"]}>
        <tr>
          <td>Supabase Inc.</td>
          <td>Database, authentication (sign-in, sessions, two-step verification secret), file storage (e.g. profile photo)</td>
          <td>EU region</td>
        </tr>
        <tr>
          <td>Vercel Inc.</td>
          <td>App hosting, server-side functions</td>
          <td>EU (Frankfurt, fra1) for server functions; content delivery network is global</td>
        </tr>
        <tr>
          <td>Resend</td>
          <td>Sending system emails</td>
          <td>EU (Ireland, eu-west-1)</td>
        </tr>
        <tr>
          <td>Twilio Ireland Limited (Dublin, Ireland; part of Twilio Inc., USA)</td>
          <td>Phone confirmation (Twilio Verify): generating, sending by SMS and checking the 6-digit code; fraud prevention (Fraud Guard)</td>
          <td>Transfer to the USA possible (section 4.5)</td>
        </tr>
        <tr>
          <td>Cloudflare, Inc. (USA) – privacy policy: <a href="https://www.cloudflare.com/privacypolicy/">cloudflare.com/privacypolicy</a></td>
          <td>Bot check (Turnstile) on the sign-in, sign-up and forgotten-password forms (row X)</td>
          <td>Global network; transfer to the USA possible (section 4.5)</td>
        </tr>
        <tr>
          <td>Google – Google Workspace</td>
          <td>Support mailbox ({support})</td>
          <td>–</td>
        </tr>
      </LegalTable>
      <p>4.4. <strong>Independent controllers</strong> to whom we transfer data, or who process your data directly for their own service:</p>
      <ul>
        <li><strong>Partner Insurer</strong> – underwriting, contract, claims, recovery;</li>
        <li><strong>Payment provider</strong> – card and payment data;</li>
        <li><strong>Licensed account information service provider</strong> – retrieving bank account data based on your consent;</li>
        <li><strong>Identity provider</strong> – identity verification;</li>
        <li>
          <strong>Google Maps Places</strong> – when you enter the rented property&apos;s address, your home or mailing address, or a Company
          account&apos;s address, Keyfly&apos;s server forwards the text you type to Google and receives address suggestions. Google receives only the
          typed text: not your name, email address or IP address; your browser does not connect to Google directly and no Google cookie is placed on
          your device. The suggestion list shows a &quot;Powered by Google&quot; label;
        </li>
        <li>
          Google Ireland Limited / Google LLC – sign-in with Google, if you choose it: Google identifies you in its own sign-in service as an
          independent controller and passes us your name, email address and Google account identifier (section 2.9; <a href="https://policies.google.com/privacy">Google
          Privacy Policy</a>);
        </li>
        <li>
          számlázz.hu – when a Company account is created and when “Refresh from NAV” is used, we send the first eight digits of the tax number
          entered and receive the organisation&apos;s name, tax number and registered office from the NAV taxpayer register (section 2.6); no personal
          data about the User is sent;
        </li>
        <li><strong>Authorities and courts</strong> (e.g. NAIH, MNB, police) – only on a request based on law.</li>
      </ul>
      <p>
        4.5. <strong>Transfers outside the EU.</strong> Your data is stored primarily in the EU. Supabase, Vercel, Resend, Google, Twilio and
        Cloudflare have US parent companies or are based in the US, so access from outside the EU may occur for support, maintenance or network
        purposes. Any such transfer relies on certification under the EU–US Data Privacy Framework (GDPR Art. 45) or on the European Commission&apos;s
        standard contractual clauses (GDPR Art. 46). You can request a copy of the safeguards at {support}.
      </p>

      <h2>5. Automated decision-making and profiling</h2>
      <p>
        5.1. <strong>When do we decide automatically?</strong> When you request a quote, the Platform assesses whether you are eligible for the
        deposit-replacement guarantee and at what Fee. If it is fully automated and produces legal effects concerning you or similarly significantly
        affects you (e.g. refusal or a higher Fee), GDPR Article 22 applies.
      </p>
      <p>
        5.2. <strong>Legal basis.</strong> The automated decision is necessary for entering into the contract (GDPR Art. 22(2)(a)), as it enables an
        instant online quote.
      </p>
      <p>5.3. <strong>Logic involved.</strong> The decision is based on the following factors:</p>
      <ul>
        <li>the result of identity verification;</li>
        <li>the ratio of verified income to rent;</li>
        <li>the deposit amount;</li>
        <li>for large deposits, data from the uploaded KHR report.</li>
      </ul>
      <p>We do not use special-category data, nor any characteristic indicating sex, age, origin or another protected attribute.</p>
      <p>5.4. <strong>Safeguards.</strong> If an automated decision affects you, you have the right to:</p>
      <ol>
        <li>obtain human intervention (the decision is reviewed by an authorised employee of Keyfly);</li>
        <li>express your point of view and submit further documents;</li>
        <li>contest the decision.</li>
      </ol>
      <p>
        You can make your request on the decision screen or at {support}. We complete the review within 15 days and send you a reasoned outcome. We
        regularly test the decision model for errors and unjustified discrimination.
      </p>
      <p>
        5.5. <strong>The Partner Insurer&apos;s decision.</strong> The final underwriting decision is made by the Partner Insurer; your related rights
        are set out in the Partner Insurer&apos;s privacy notice.
      </p>
      <p>5.6. <strong>Marketing.</strong> We do not build marketing profiles from your data.</p>

      <h2>6. Cookies in the app</h2>
      <p>
        6.1. The app uses only cookies and similar local storage that are strictly necessary for its operation or for a feature you expressly request.
        Under section 155(4) of Act C of 2003 on Electronic Communications, these do not require consent.
      </p>
      <LegalTable label="6. Cookies in the app" head={["Cookie", "Purpose", "Lifetime", "Type"]}>
        <tr>
          <td>Session / authentication cookie</td>
          <td>Keeping you signed in during the session, authenticating requests</td>
          <td>Until end of session</td>
          <td>Strictly necessary</td>
        </tr>
        <tr>
          <td>“Keep me signed in” cookie</td>
          <td>Keeps you signed in after closing the browser, if you choose it</td>
          <td>–</td>
          <td>Needed for a feature you requested</td>
        </tr>
        <tr>
          <td>Language cookie</td>
          <td>Remembers your chosen language (Hungarian/English)</td>
          <td>–</td>
          <td>Needed for a feature you requested</td>
        </tr>
        <tr>
          <td><code>{TRUSTED_COOKIE}</code></td>
          <td>
            Recognising a trusted device: if you asked for it, we do not request the two-step code in this browser for 30 days. httpOnly cookie
            holding a record ID and a random token; we store only the token&apos;s hash.
          </td>
          <td>30 days</td>
          <td>Strictly necessary (security cookie)</td>
        </tr>
      </LegalTable>
      <p>
        6.2. We do not use analytics or marketing cookies in the app. If we introduce them, we will ask for your consent first. You can delete cookies
        in your browser settings; after deleting necessary cookies you will need to sign in again.
      </p>

      <h2>7. How do we protect your data?</h2>
      <p>Under GDPR Article 32 we apply technical and organisational measures appropriate to the risk, in particular:</p>
      <ul>
        <li>encrypted (HTTPS/TLS) transmission; storage in EU data centres;</li>
        <li>
          passwords stored only in hashed form; expiring email links (confirmation, password reset: 1 hour) and single-use invitation links
          (invitations: 7 days, staff invitations: 48 hours);
        </li>
        <li>role-based access (Account holder/Admin/Manager/Viewer); lease data accessible only to the parties concerned;</li>
        <li>staff access only with two-step verification and only as needed;</li>
        <li>
          optional two-step verification for Users with an authenticator app or a code sent by email (the code is stored only as a hash, valid for 5
          minutes and stops working after 5 wrong tries); backup codes are stored only as SHA-256 hashes, backup-code attempts are limited to 10 an
          hour, and we always send an email when two-step verification is turned on or off and when a backup code is used to sign in;
        </li>
        <li>
          trusted devices: skipping the two-step code for 30 days only at the User&apos;s request (off by default); only the hash of the random token
          kept in the browser is stored; at most 10 devices per User, all deleted on a password change, when two-step verification is turned off and
          on a backup-code sign-in; not available to Keyfly staff;
        </li>
        <li>
          phone confirmation: a phone number is only added to the profile once confirmed with an SMS code; the code is generated and checked by Twilio
          and not stored by Keyfly; it is valid for 10 minutes, and Twilio blocks it after too many wrong tries; at most 3 codes an hour and 10 a day
          can be requested;
        </li>
        <li>
          bank accounts: IBAN check digits are verified locally; only the account&apos;s Account holder and Admins (for a personal account, you) can
          add, change or delete bank accounts, and changes are recorded in the audit log with only the last four characters of the account number and
          without the holder&apos;s name;
        </li>
        <li>
          a list of active sign-ins from which any other device can be signed out; after a password change, other devices are signed out
          automatically;
        </li>
        <li>
          changing the email address or password requires the current password, and deleting the Account requires the password and – if turned on – a
          two-step verification code;
        </li>
        <li>profile photos are kept in private storage, accessible only to the User, and shown through short-lived links;</li>
        <li>property photos and videos are kept in private storage, accessible only to the account&apos;s members and, for support, Keyfly staff, and shown through short-lived links;</li>
        <li>an append-only, immutable audit log;</li>
        <li>prompt deletion of raw check data (section 3, M5);</li>
        <li>data processing agreements with providers; regular backups.</li>
      </ul>
      <p>
        We record any personal data breach, notify the NAIH within 72 hours where required (GDPR Art. 33), and inform you without undue delay if the
        breach is likely to result in a high risk to you (GDPR Art. 34).
      </p>

      <h2>8. Your rights and how to exercise them</h2>
      <LegalTable label="8. Your rights and how to exercise them" head={["Right", "What it means", "When it applies"]}>
        <tr>
          <td>Access (GDPR Art. 15)</td>
          <td>You can request information about and a copy of your data; you can also download your data yourself in the settings (section 8.3).</td>
          <td>Always</td>
        </tr>
        <tr>
          <td>Rectification (Art. 16)</td>
          <td>
            You can ask us to correct inaccurate data; you can change your name, phone number, profile photo, language and email address in your
            Account yourself.
          </td>
          <td>Always</td>
        </tr>
        <tr>
          <td>Erasure (Art. 17)</td>
          <td>You can ask us to delete your data; you can also delete your Account yourself in the settings (section 8.4).</td>
          <td>Where retention is not needed for a legal obligation or legal claim (section 3)</td>
        </tr>
        <tr>
          <td>Restriction (Art. 18)</td>
          <td>You can ask us only to store your data and not use it otherwise.</td>
          <td>E.g. while accuracy is disputed or an objection is pending</td>
        </tr>
        <tr>
          <td>Portability (Art. 20)</td>
          <td>You can receive the data you provided in machine-readable form; you can download it yourself as a JSON file (section 8.3).</td>
          <td>Processing based on contract or consent</td>
        </tr>
        <tr>
          <td>Objection (Art. 21)</td>
          <td>You can object to processing based on legitimate interest.</td>
          <td>Processing under basis (f) in section 2</td>
        </tr>
        <tr>
          <td>Withdrawal of consent (Art. 7(3))</td>
          <td>
            You can withdraw at any time; this does not affect earlier lawful processing. You withdraw consent to Keyfly news by turning the switch
            off under Notifications.
          </td>
          <td>Processing based on consent</td>
        </tr>
        <tr>
          <td>Rights on automated decisions (Art. 22)</td>
          <td>Human intervention, expressing your view, contesting.</td>
          <td>Section 5</td>
        </tr>
      </LegalTable>
      <p>
        8.1. Send your request to {support}. We reply without undue delay and within one month at the latest; this may be extended by two further
        months where necessary, and we will tell you (GDPR Art. 12(3)). The procedure is free. If we have reasonable doubts about your identity, we
        may ask for additional information to confirm it.
      </p>
      <p>
        8.2. <strong>Closed leases.</strong> As a Tenant you have read-only access to a closed Lease during the retention period; erasure requests are
        assessed taking into account the retention obligations in section 3.
      </p>
      <p>
        8.3. <strong>Downloading your data.</strong> In the settings (Your data → Download data) you can download, in one JSON file, your profile,
        your accounts and memberships, your access requests, your lease requests, the leases and properties visible to you, the invitations you sent,
        your consents, your quote requests, policies and claims, your active sign-ins (device, start, last activity), your two-step verification data
        (type, time turned on), your trusted devices (label, times marked, expiring and last used), the time your phone number was confirmed and the
        bank accounts of your accounts (GDPR Arts. 15 and 20). The file contains no secrets (e.g. invitation or backup codes).
      </p>
      <p>
        8.4. <strong>Deleting your Account.</strong> You can delete your Account yourself in the settings (Your data → Delete account) by entering
        your password and – if you turned it on – a two-step verification code. Deletion is not possible while you are the Account holder of a Company
        account that has other members (you must hand over the Account holder role first), while you have an insurance policy or a claim (in that case
        support handles the deletion, taking the retention obligations in section 3 into account), if you are Keyfly staff, or if a property, lease or
        lease request is linked to your personal account or to a Company account used only by you (in that case too, support handles the deletion: {support}).
        On deletion, the following are deleted at once: your sign-in (with your sessions, two-step verification, backup codes and trusted devices),
        your profile (with the phone confirmation data) and profile photo, your personal account (with its bank accounts), your team memberships, your
        access requests, the records of your consents and quote requests, and any Company accounts of which you were the only member (with their bank
        accounts). In Company accounts that have other members, the data you recorded (e.g. properties, leases) stays with the Company account; audit
        log entries (M9) remain.
      </p>

      <h2>9. Remedies</h2>
      <p>9.1. You may first contact us ({support}), but this is not a precondition for authority or court proceedings.</p>
      <p>9.2. <strong>Complaint to the supervisory authority</strong> (GDPR Art. 77):</p>
      <ul>
        <li>{DPA.name.en}</li>
        <li>Office: {DPA.address}, Hungary</li>
        <li>Postal address: {DPA.postalAddress}</li>
        <li>Phone: {DPA.phone}</li>
        <li>Email: <a href={`mailto:${DPA.email}`}>{DPA.email}</a></li>
        <li>Website: <a href={DPA.web}>{DPA.web}</a></li>
      </ul>
      <p>You may also complain to the supervisory authority of the EU Member State of your habitual residence or place of work.</p>
      <p>
        9.3. <strong>Judicial remedy</strong> (GDPR Art. 79, Infotv. s. 23): you may go to court; the case falls within the competence of the regional
        courts (törvényszék) and, at your choice, may be brought before the regional court of your place of residence or stay.
      </p>

      <h2>10. Data protection officer, changes, version</h2>
      <p>10.1. <strong>Data protection officer.</strong> Contact us on data protection matters at {support}.</p>
      <p>
        10.2. <strong>Changes.</strong> We update this notice when our processing or the law changes. We notify you by email and in the app before
        material changes. If new processing requires consent, we will ask for it separately.
      </p>
      <p>
        10.3. <strong>Version:</strong>
      </p>
      <ul>
        <li>Version: {CONSENT_VERSIONS.accountPrivacy}</li>
        <li>Effective date: {date(LEGAL_EFFECTIVE.appPrivacy, locale)}</li>
        <li>
          Related documents: <a href={termsHref}>Keyfly General Terms</a>; <a href={waitlistHref}>waitlist privacy notice</a>; the Partner
          Insurer&apos;s privacy notice
        </li>
      </ul>
    </>
  );
}
