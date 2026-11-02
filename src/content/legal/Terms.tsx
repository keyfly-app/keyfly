import { BRAND, COMPANY, CONTACT, formatCompanyAddress } from "@/config/company";
import { CONSENT_VERSIONS } from "@/config/consent";
import { publicHref, type Locale } from "@/i18n/config";
import { date } from "@/lib/format";
import { PRODUCTION_HOSTS } from "@/lib/sites";
import { HOSTING_PROVIDER, LEGAL_EFFECTIVE } from "./hosting";
import { LegalTable } from "./LegalTable";

/**
 * General terms (ÁSZF) of the Keyfly platform: website and customer app.
 * Source: https://claude.ai/artifact/GpARarMZgABW6bQzVEsJjw (draft 0.2, lawyer review pending).
 * Hungarian is binding; English is an informative translation. The doc's bracketed drafting notes and the open
 * questions for the lawyer are not published.
 * Any change → bump CONSENT_VERSIONS.accountTerms and LEGAL_EFFECTIVE.terms.
 */
export function TermsContent({ locale }: { locale: Locale }) {
  const support = <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a>;
  const address = formatCompanyAddress();
  const site = <a href={BRAND.url}>{BRAND.url}</a>;
  const appUrl = `https://${PRODUCTION_HOSTS.portal}`;
  const app = <a href={appUrl}>{appUrl}</a>;
  const mnb = COMPANY.mnbRegistrationNumber;

  if (locale === "hu") {
    return (
      <>
        <h2>1. A szolgáltató és az ÁSZF hatálya</h2>
        <p>1.1. A Keyfly szolgáltatást (a továbbiakban: <strong>Keyfly</strong> vagy <strong>mi</strong>) a következő társaság nyújtja:</p>
        <ul>
          <li>Cégnév: {COMPANY.legalName} (rövidített név: {COMPANY.shortName})</li>
          <li>Székhely: {address}</li>
          <li>Cégjegyzékszám: Cg. {COMPANY.registrationNumber} (nyilvántartja: {COMPANY.registryCourt})</li>
          <li>Adószám: {COMPANY.taxNumber}</li>
          <li>E-mail: {support}</li>
          <li>Weboldal: {site}; alkalmazás: {app}</li>
          <li>Tárhelyszolgáltató: {HOSTING_PROVIDER.name} ({HOSTING_PROVIDER.address}); adatbázis-szolgáltató: Supabase Inc.</li>
          {mnb && <li>Biztosításközvetítői nyilvántartási szám (MNB): {mnb}</li>}
        </ul>
        <p>
          1.2. Ez az Általános Szerződési Feltételek (<strong>ÁSZF</strong>) szabályozza a Keyfly weboldal és alkalmazás (együtt: <strong>Platform</strong>)
          használatát, valamint a Keyfly és a Platformot használó személy (<strong>te</strong>, <strong>Felhasználó</strong>) közötti jogviszonyt.
        </p>
        <p>
          1.3. Az ÁSZF a Platformon történő regisztrációval, illetve a Platform bármely funkciójának használatával jön létre közöttünk. A szerződés
          elektronikus úton, írásban jön létre; azt nem iktatjuk külön dokumentumként, de az általad elfogadott ÁSZF-verziót és annak elfogadási
          idejét rögzítjük, és kérésedre hozzáférhetővé tesszük. A szerződés nyelve magyar.
        </p>
        <p>
          1.4. A Keyfly <strong>nem biztosító</strong>. A kaucióhelyettesítő garanciát (kezességet) a Partnerbiztosító vállalja (7. pont). A
          biztosítási jogviszonyra a Partnerbiztosító szerződési feltételei és a 2014. évi LXXXVIII. törvény (<strong>Bit.</strong>) az irányadók; ez
          az ÁSZF azokat nem írja felül.
        </p>
        <p>
          1.5. Ha fogyasztó vagy (önálló foglalkozásán és gazdasági tevékenységén kívül eső célból jársz el), az ÁSZF egyetlen rendelkezése sem
          korlátozhatja a jogszabály által számodra biztosított jogokat.
        </p>

        <h2>2. Fogalmak</h2>
        <ul>
          <li>
            <strong>Fiók</strong>: a Platformon e-mail-címmel és jelszóval létrehozott személyes felhasználói hozzáférés. Minden Felhasználónak egy
            személyes Fiókja van.
          </li>
          <li>
            <strong>Céges fiók</strong>: gazdálkodó szervezet nevében, annak adószáma alapján létrehozott fiók, amelyhez Csapat tartozhat. Egy
            szervezetnek egy Céges fiókja lehet; egy Felhasználó a személyes Fiókja mellett több Céges fióknak is tagja lehet.
          </li>
          <li><strong>Csapat</strong>: a Céges fiókhoz rendelt Felhasználók köre, Szerepkörök szerint.</li>
          <li>
            <strong>Szerepkör</strong>: a Céges fiókban betöltött jogosultsági szint: Fiókgazda, Admin, Kezelő vagy Megtekintő (4.2.1. pont). Minden
            Céges fióknak pontosan egy Fiókgazdája van.
          </li>
          <li>
            <strong>Csomag</strong>: a Keyfly Alap (díjmentes), a Keyfly Pro (díjköteles) és a Keyfly Enterprise (egyedi) előfizetési konstrukció; a
            Felhasználók számát egyik Csomag sem korlátozza.
          </li>
          <li>
            <strong>Ingatlan</strong>: a Platformon rögzített, bérbe adott ingatlan (lakás célú vagy nem lakás célú, pl. iroda, üzlethelyiség),
            strukturált címmel, típusával (5.1. pont) és opcionálisan helyrajzi számmal (HRSZ).
          </li>
          <li><strong>Bérbeadó</strong>: az Ingatlant bérbe adó Felhasználó vagy Céges fiók.</li>
          <li>
            <strong>Bérlő</strong>: az Ingatlant bérbe vevő Felhasználó vagy Céges fiók; <strong>Bérlőtárs</strong>: a bérleti szerződésben bérlőként
            szereplő további személy; <strong>Együttlakó</strong>: az Ingatlanban lakó, bérlőnek nem minősülő személy.
          </li>
          <li>
            <strong>Bérleti jogviszony</strong> (a Platformon: „bérleti szerződés”): a Bérbeadó és a Bérlő fiókja közötti, a Platformon rögzített
            kapcsolat a bérleti szerződés adataival.
          </li>
          <li>
            <strong>Kaució</strong>: a bérleti szerződés szerinti óvadék, amelyet a Bérlő a Keyfly-szolgáltatás igénybevétele esetén nem készpénzben
            helyez letétbe.
          </li>
          <li>
            <strong>Kaucióhelyettesítő garancia</strong>: a Partnerbiztosító által a Bérbeadó javára vállalt kötelezettség, amely alapján érvényes
            kárigény esetén a Partnerbiztosító fizet a Bérbeadónak, majd a kifizetett összeget a Bérlőtől követelheti (megtérítés).
          </li>
          <li><strong>Ajánlat</strong>: a Platformon a Bérlő vagy a Bérbeadó kérésére előállított díj- és feltételajánlat.</li>
          <li><strong>Díj</strong>: a Bérlő által a készpénzes kaució helyett fizetendő díj, illetve a Csomagok előfizetési díja.</li>
          <li><strong>Meghívó</strong>: a Platformról küldött, egyszer használható, határidős hivatkozás (link).</li>
          <li><strong>Napló</strong>: a Platformon végzett módosítások csak hozzáfűzhető (módosíthatatlan) nyilvántartása.</li>
        </ul>

        <h2>3. Fiók és biztonság</h2>
        <p>
          3.1. Fiókot 18. életévét betöltött, cselekvőképes természetes személy hozhat létre. Céges fiókot csak az a személy hozhat létre, aki a
          szervezet képviseletére jogosult, vagy erre felhatalmazással rendelkezik; ezt a Céges fiók létrehozásakor kifejezetten kijelented.
        </p>
        <p>
          3.2. A Fiókba e-mail-címmel és jelszóval, vagy – ha ezt választod – Google-fiókoddal léphetsz be; Google-fiókkal regisztrálni is lehet.
          Google-fiókot a Beállítások → Bejelentkezés és biztonság oldalon kapcsolhatsz a Fiókodhoz vagy választhatsz le róla, és később másik
          Google-fiókot is kapcsolhatsz; a Fiókod belépési e-mail-címe ettől nem változik. A Google bejelentkezési szolgáltatására a Google saját
          feltételei vonatkoznak. Elfelejtett jelszó esetén e-mailben küldünk hivatkozást az új jelszó beállításához; az e-mailben küldött
          hivatkozások (megerősítés, jelszó-visszaállítás) 1 óráig érvényesek. A „Maradjak bejelentkezve” opció választásakor a böngésződ hosszabb
          ideig bejelentkezve tart; közös eszközön ezt ne használd.
        </p>
        <p>
          3.3. Felelős vagy azért, hogy a jelszavad, az e-mail-fiókod, valamint – ha bekapcsoltad – a hitelesítő alkalmazásod és a tartalék kódjaid
          biztonságban legyenek, és senki más ne férjen hozzájuk. Ha illetéktelen hozzáférést észlelsz, haladéktalanul írj a {support} címre.
        </p>
        <p>3.4. A Fiókban végzett műveleteket – ellenkező bizonyításig – a Fiók tulajdonosának tulajdonítjuk.</p>
        <p>
          3.5. A Keyfly munkatársai kizárólag kétlépcsős azonosítással (2FA), a szolgáltatás nyújtásához, ügyfélszolgálathoz, panasz- vagy
          kárügyintézéshez, illetve jogszabályi kötelezettség teljesítéséhez szükséges mértékben férhetnek hozzá a Fiókod adataihoz. Ezeket a
          hozzáféréseket a Napló rögzíti.
        </p>
        <p>
          3.6. A Fiókodhoz bekapcsolhatod a kétlépcsős azonosítást hitelesítő alkalmazással (időalapú, egyszer használható kód). Belépéskor a
          hitelesítő alkalmazás helyett 6 jegyű kódot is kérhetsz e-mailben: a kód 5 percig érvényes, újat 60 másodperc után kérhetsz, és 5 hibás
          próbálkozás után érvényét veszti. Az e-mailes kódot a beállításaidban kikapcsolhatod. Bekapcsoláskor 10 egyszer használható tartalék kódot
          kapsz, amelyeket csak egyszer jelenítünk meg; ezeket biztonságos helyen kell tartanod. Bármikor új tartalék kódokat készíthetsz, ekkor a
          korábbiak érvényüket vesztik. Ha tartalék kóddal lépsz be, a kétlépcsős azonosítást és a megmaradt tartalék kódokat kikapcsoljuk, és újra be
          kell állítanod. A kikapcsoláshoz a hitelesítő alkalmazás aktuális kódja szükséges. A bekapcsolásról, a kikapcsolásról és a tartalék kóddal
          történt belépésről minden esetben e-mailben értesítünk.
        </p>
        <p>
          3.7. A Platformon megtekintheted, mely eszközökön vagy bejelentkezve (böngésző, operációs rendszer, utolsó aktivitás ideje), és bármelyik
          másik eszközt, vagy egyszerre az összes többit kijelentkeztetheted. Jelszavad módosításakor a többi eszközödön automatikusan
          kijelentkeztetünk.
        </p>
        <p>
          3.8. A Fiókodban megadhatod és módosíthatod a nevedet, a telefonszámodat (nem kötelező), a profilképedet (nem kötelező), a lakcímedet és –
          ha eltér – a levelezési címedet (nem kötelező; külföldi cím is megadható), valamint a Platform nyelvét. Az e-mail-címed és a jelszavad
          módosításához a jelenlegi jelszavad megadása szükséges. A telefonszámodat megadáskor és módosításkor az SMS-ben küldött 6 jegyű kóddal kell
          megerősítened (a kód 10 percig érvényes); megerősítés nélkül a szám nem kerül a Fiókodba. SMS-t jelenleg csak az Európai Unió és az EGT
          tagállamaiban, Svájcban, az Egyesült Királyságban, Ukrajnában, Szerbiában, az Amerikai Egyesült Államokban és Kanadában használt mobilszámra
          tudunk küldeni. A Bérleti jogviszony megerősítésekor a felek akkori nevét és elérhetőségét a Bérleti jogviszony részeként rögzítjük; ezt a
          profilod későbbi módosítása nem változtatja meg.
        </p>
        <p>
          3.9. Ha bekapcsoltad a kétlépcsős azonosítást, a belépési kód megadásakor kérheted, hogy az adott böngészőben 30 napig ne kérjünk kódot
          (biztonságos eszköz; alapból nincs bejelölve). Egyszerre legfeljebb 10 biztonságos eszközöd lehet. Ezeket a Platformon egyenként vagy
          egyszerre eltávolíthatod; jelszavad módosításakor, a kétlépcsős azonosítás kikapcsolásakor és tartalék kóddal történő belépéskor mindet
          eltávolítjuk. Közös vagy mások által is használt eszközön ezt ne használd. A Keyfly munkatársai számára ez a lehetőség nem érhető el.
        </p>
        <p>
          3.10. <strong>Bankszámlák.</strong> A személyes Fiókodhoz, illetve – a Fiókgazda és az Adminok – a Céges fiókhoz bankszámlákat adhatsz meg a
          kárkifizetések és a visszatérítések fogadására (nem kötelező): pénznem, IBAN (a 16 vagy 24 jegyű magyar számlaszámot IBAN-ná alakítjuk),
          számlatulajdonos neve és megnevezés. Pénznemenként egy elsődleges számla lehet; a kifizetést a kifizetés pénznemében megadott elsődleges
          számlára teljesítjük. Felelős vagy azért, hogy a megadott bankszámla adatai helyesek legyenek, és a számla a tiéd, Céges fiók esetén a
          szervezeté legyen. Az IBAN ellenőrző számjegyeit ellenőrizzük, de azt nem, hogy a számla létezik-e, és kié.
        </p>

        <h2>4. Szerepkörök és Csomagok</h2>
        <p>
          4.1. <strong>Személyes fiók.</strong> Minden Felhasználó személyes Fiókkal rendelkezik, amellyel saját nevében bérbeadóként és/vagy
          bérlőként járhat el.
        </p>
        <p>
          4.2. <strong>Céges fiók.</strong> Céges fiókot a személyes Fiókodból, a szervezet adószámának megadásával hozhatsz létre. A szervezet nevét,
          adószámát és székhelyét a NAV adózói nyilvántartásából, külső szolgáltatáson keresztül kérjük le (lásd: Adatkezelési tájékoztató); a
          cégadatokat ezt követően a Fiókgazda és az Adminok módosíthatják (megjelenő név, cégnév, az adószám utolsó három számjegye, közösségi
          adószám, cégjegyzékszám, székhely, levelezési cím, kapcsolattartási e-mail-cím és telefonszám); az adószám első nyolc számjegye nem
          módosítható. A NAV-adatokat a „Frissítés a NAV-ból” funkcióval újra lekérhetik; a lekért adatok csak mentéskor kerülnek a Céges fiókba. Egy
          szervezetnek (az adószám első nyolc számjegye alapján) egy Céges fiókja lehet; ha a szervezet már szerepel a Platformon, hozzáférést
          kérhetsz (4.2.2. pont). A Céges fiók létrehozója lesz a Fiókgazda.
        </p>
        <p>
          4.2.1. <strong>Szerepkörök.</strong> Minden Céges fióknak pontosan egy Fiókgazdája van; a többi Csapattag Szerepköre Admin, Kezelő vagy
          Megtekintő. A Szerepkörök jogosultságai:
        </p>
        <LegalTable label="4.2.1. Szerepkörök" head={["Szerepkör", "Jogosultság"]}>
          <tr>
            <td>Fiókgazda</td>
            <td>
              Az Admin minden jogosultsága, ezen felül a Csomag kezelése és a fiókgazdai szerep átadása. A Fiókgazda Szerepkörét más nem módosíthatja,
              és őt a Csapatból nem lehet eltávolítani.
            </td>
          </tr>
          <tr>
            <td>Admin</td>
            <td>
              Csapattagok meghívása, hozzáférési kérések elbírálása, Szerepkörök módosítása (a saját és a Fiókgazda Szerepköre kivételével),
              Csapattagok eltávolítása (a Fiókgazda kivételével), a cégadatok és a bankszámlák módosítása, Ingatlanok és Bérleti jogviszonyok
              kezelése.
            </td>
          </tr>
          <tr>
            <td>Kezelő</td>
            <td>Ingatlanok, Bérleti jogviszonyok, biztosítások és bérlők kezelése, Meghívók küldése Bérleti jogviszonyba.</td>
          </tr>
          <tr>
            <td>Megtekintő</td>
            <td>Csak olvasási hozzáférés.</td>
          </tr>
        </LegalTable>
        <p>
          4.2.2. <strong>Csatlakozás a Csapathoz.</strong> A Fiókgazda és az Adminok a Csapatba e-mailben, korlátlan számú Meghívót küldhetnek; a
          Meghívó egyszer használható, és 7 napig érvényes (5.4. pont). Ha a szervezet már szerepel a Platformon, rövid üzenettel hozzáférést
          kérhetsz. A kérésről a Fiókgazda és az Adminok e-mailt kapnak, és látják a nevedet, az e-mail-címedet és az üzenetedet; a kérést Szerepkör
          megadásával jóváhagyhatják vagy elutasíthatják, a döntésről e-mailben értesítünk. Függő hozzáférési kérésedet a Cégeim oldalon
          visszavonhatod; ott látod a Céges fiókjaidat, a Szerepkörödet és a Csomagot is. A Keyfly Enterprise Csomagot használó Céges fiókhoz csak
          Meghívóval lehet csatlakozni.
        </p>
        <p>
          4.2.3. <strong>Szerepkör módosítása, eltávolítás és kilépés.</strong> A Fiókgazda és az Adminok a 4.2.1. pont szerint módosíthatják a
          Csapattagok Szerepkörét, és eltávolíthatják őket a Csapatból. A Fiókgazda kivételével bármely Csapattag maga is elhagyhatja a Céges fiókot.
          Eltávolítás vagy kilépés után a Csapattag a Céges fiók adataihoz nem fér hozzá, és csak új Meghívóval vagy jóváhagyott hozzáférési kéréssel
          csatlakozhat ismét.
        </p>
        <p>
          4.2.4. <strong>A Fiókgazda átadása.</strong> A Fiókgazda a fiókgazdai szerepet a Csapat bármely tagjának átadhatja, és ezt követően
          Adminként marad a Csapatban. Az átadásról mindkét fél e-mailt kap. A szerepet visszaadni csak az új Fiókgazda tudja. A Fiókgazda a Céges
          fiókot csak a szerep átadása után hagyhatja el.
        </p>
        <p>
          4.3. A Céges fiók a Csapattagjai által a Céges fiók nevében tett műveletekért a Keyfly-jal és a többi Felhasználóval szemben úgy felel,
          mintha azokat maga tette volna. A Csapattagok kiválasztása, jogosultságaik beállítása és visszavonása a Céges fiók Fiókgazdájának és
          Adminjainak felelőssége.
        </p>
        <p>4.4. <strong>Csomagok.</strong></p>
        <LegalTable label="4.4. Csomagok" head={["Csomag", "Felhasználók száma", "Díj"]}>
          <tr>
            <td>Keyfly Alap</td>
            <td>korlátlan</td>
            <td>Díjmentes</td>
          </tr>
          <tr>
            <td>Keyfly Pro</td>
            <td>korlátlan</td>
            <td>Díjköteles</td>
          </tr>
          <tr>
            <td>Keyfly Enterprise</td>
            <td>korlátlan</td>
            <td>Egyedi</td>
          </tr>
        </LegalTable>
        <p>Az egyes Csomagokban elérhető funkciókat a mindenkori, a Platformon közzétett árlista és csomagleírás tartalmazza.</p>
        <p>
          4.5. A Csomagok díja a Platform használatáért fizetendő, és független a Bérlő által a Kaucióhelyettesítő garanciáért fizetett Díjtól (8.
          pont).
        </p>

        <h2>5. Ingatlanok, Bérleti jogviszonyok és Meghívók</h2>
        <p>
          5.1. <strong>Ingatlan rögzítése.</strong> Az Ingatlant strukturált címmel (irányítószám, település, közterület, házszám, emelet, ajtó) és –
          ha megadod – helyrajzi számmal rögzíted. Rögzíted az Ingatlan típusát is: lakás, ház, szoba, iroda, üzlethelyiség, vendéglátóhely,
          raktár/ipari ingatlan, garázs/parkolóhely vagy egyéb. A címkereséshez külső címkereső szolgáltatást használhatunk. Felelős vagy azért, hogy
          az Ingatlan adatai helyesek, és jogosult vagy azokat a Platformon rögzíteni.
        </p>
        <p>
          5.2. <strong>Bérleti jogviszony létrehozása.</strong> Bérleti jogviszonyt a Bérbeadó és a Bérlő is kezdeményezhet: bármelyik fél meghívhatja
          a másikat. A Bérleti jogviszony a Platformon akkor válik aktívvá, amikor a meghívott fél a Meghívót elfogadja. A Platformon rögzített
          Bérleti jogviszony nem helyettesíti a felek közötti bérleti szerződést; a Keyfly a bérleti szerződésnek nem féle.
        </p>
        <p>
          5.3. <strong>Bérlőtársak és Együttlakók.</strong> A Bérleti jogviszonyhoz Bérlőtársak és Együttlakók rendelhetők. Más személy adatait csak
          akkor rögzítheted, ha erre jogosult vagy, és az érintettet tájékoztattad arról, hogy adatait a Keyfly-nak átadod (lásd: Adatkezelési
          tájékoztató).
        </p>
        <p>
          5.4. <strong>Meghívók érvényessége.</strong> A Felhasználók közötti Meghívó (Bérleti jogviszonyba vagy Csapatba) a kiküldéstől számított 7
          napig, a Keyfly munkatársainak szóló Meghívó 48 óráig érvényes. A lejárt Meghívó új Meghívóval pótolható. A Meghívót ne továbbítsd harmadik
          személynek: aki a hivatkozással rendelkezik, az a meghívást elfogadhatja.
        </p>
        <p>
          5.5. <strong>A Bérleti jogviszony lezárása.</strong> A Bérleti jogviszonyt a Platform a bérleti idő lejárta utáni 60. napon automatikusan
          lezárja, kivéve, ha addig kárigényt jelentettek be, amelynek elbírálása folyamatban van; ilyenkor a lezárás a kárigény lezárásáig
          elhalasztva történik. Lezárás után a Bérlő a bérleti időszakára vonatkozó adatokhoz csak olvasási hozzáférést kap, akkor is, ha a Bérbeadó
          korábban állította be a Bérleti jogviszonyt.
        </p>
        <p>
          5.6. <strong>Napló.</strong> A Platform a Bérleti jogviszonyokon, Ingatlanokon, Csapatokon és Szerepkörökön végzett módosításokat (ki,
          mikor, mit módosított) csak hozzáfűzhető Naplóban rögzíti. A Napló bejegyzései utólag nem módosíthatók és nem törölhetők (a megőrzési idő
          lejárta utáni törlés kivételével). A felek a Naplót vitás esetben bizonyítékként használhatják.
        </p>

        <h2>6. A Bérbeadó és a Bérlő kötelezettségei a Platformon</h2>
        <p>6.1. <strong>Mindkét fél</strong> vállalja, hogy:</p>
        <ol>
          <li>csak valós, pontos és naprakész adatokat ad meg, és a változásokat 15 napon belül rögzíti a Platformon;</li>
          <li>csak olyan személy adatait rögzíti, akinek adatai kezelésére jogosult;</li>
          <li>
            a Platformot nem használja jogellenes, megtévesztő vagy mások jogait sértő célra, és nem kísérli meg a Platform biztonsági intézkedéseinek
            megkerülését;
          </li>
          <li>a Platformon keresztül kapott másik félre vonatkozó adatokat csak a bérleti jogviszonnyal összefüggő célra használja.</li>
        </ol>
        <p>6.2. <strong>A Bérbeadó</strong> továbbá kijelenti és vállalja, hogy:</p>
        <ol>
          <li>az Ingatlan bérbeadására jogosult (tulajdonosként vagy a tulajdonos felhatalmazásával);</li>
          <li>a bérleti szerződésben rögzíti, hogy a kauciót Kaucióhelyettesítő garancia váltja ki;</li>
          <li>
            kárigényt csak a bérleti szerződésből eredő, megalapozott és dokumentált követelés esetén, a Partnerbiztosító feltételeiben meghatározott
            határidőben és módon jelent be;
          </li>
          <li>a kárigény bejelentésével egyidejűleg a Bérlőt is értesíti, illetve hozzájárul, hogy a Platform értesítse.</li>
        </ol>
        <p>6.3. <strong>A Bérlő</strong> továbbá tudomásul veszi és vállalja, hogy:</p>
        <ol>
          <li>a Díj a kaucióhelyettesítés ellenértéke, azt sem részben, sem egészben nem kapja vissza, és az nem minősül kauciónak;</li>
          <li>
            a Kaucióhelyettesítő garancia nem szünteti meg a bérleti szerződésből eredő felelősségét: ha a Partnerbiztosító érvényes kárigény alapján
            fizet a Bérbeadónak, a kifizetett összeget a Bérlőtől megtérítésként követelheti;
          </li>
          <li>a kárigényről kapott értesítést követően előterjesztheti észrevételeit és bizonyítékait a Platformon keresztül.</li>
        </ol>
        <p>
          6.4. A Keyfly a felek közötti bérleti vitában nem dönt, és nem képviseli egyik felet sem. A kárigényről a Partnerbiztosító dönt a saját
          feltételei szerint.
        </p>

        <h2>7. Közvetítői szerep és a Partnerbiztosító</h2>
        <p>
          7.1. A Keyfly a Kaucióhelyettesítő garancia vonatkozásában <strong>függő biztosításközvetítőként</strong> (Bit. szerinti ügynök) jár el,
          kizárólag a Partnerbiztosító megbízásából és nevében.
        </p>
        <p>7.2. <strong>Közvetítői adatok:</strong></p>
        <ul>
          <li>A biztosításközvetítő státusza: függő biztosításközvetítő (ügynök)</li>
          {mnb && <li>MNB nyilvántartási szám: {mnb}; a nyilvántartás ellenőrizhető az MNB honlapján</li>}
          <li>A Keyfly a Partnerbiztosító termékeit közvetíti; más biztosító termékeit nem hasonlítja össze, és nem ad személyre szabott tanácsot</li>
          <li>A függő biztosításközvetítő tevékenységével okozott kárért a Partnerbiztosító felel</li>
        </ul>
        <p>
          7.3. <strong>Szerződéskötés.</strong> A Kaucióhelyettesítő garanciára vonatkozó jogviszony a Partnerbiztosítóval, a Partnerbiztosító
          szerződési feltételei szerint jön létre. A szerződéskötés előtt a Platformon elérhetővé tesszük a Partnerbiztosító szerződési feltételeit, a
          termékismertetőt és a jogszabály szerint kötelező tájékoztatásokat.
        </p>
        <p>
          7.4. <strong>Ajánlat.</strong> A Platformon kapott Ajánlat tájékoztató jellegű. A Partnerbiztosító jogosult a kockázatvállalást indoklással
          elutasítani.
        </p>
        <p>
          7.5. <strong>Kárrendezés és megtérítés.</strong> A kárigények elbírálása, a kifizetés és a Bérlővel szembeni megtérítési igény érvényesítése
          a Partnerbiztosító feladata.
        </p>

        <h2>8. Díjak és számlázás</h2>
        <p>
          8.1. <strong>Kaucióhelyettesítési Díj.</strong> A Bérlő által fizetendő Díj összegét, esedékességét és fizetési módját (egyösszegű vagy
          rendszeres) az Ajánlat tartalmazza. A Díjból a Partnerbiztosítót megillető biztosítási díjat és a Keyfly-t megillető részt az Ajánlat
          elkülönítve mutatja.
        </p>
        <p>
          8.2. <strong>Előfizetési díjak.</strong> A Keyfly Pro és Enterprise Csomag díját a 4.4. pont és a mindenkori árlista tartalmazza. Az
          előfizetés havi vagy éves díjfizetéssel vehető igénybe. Éves díjfizetés esetén a havi díj 12-szereséhez képest az árlistában meghatározott
          kedvezmény jár (jelenleg 10%). A kedvezmény mértékét a Keyfly az árlistában módosíthatja; a módosítás a már kifizetett időszakot nem érinti.
        </p>
        <p>
          8.3. <strong>Megújulás.</strong> Az előfizetés az aktuális díjfizetési időszak végén azonos időtartamra automatikusan megújul, kivéve, ha
          azt előtte a Fiókban lemondod. A lemondás a folyamatban lévő időszak végén lép hatályba; ezt követően a Céges fiók a Keyfly Alap Csomagra
          vált. Éves előfizetés megújulása előtt legalább 30 nappal e-mailben értesítünk.
        </p>
        <p>
          8.4. <strong>Árváltozás.</strong> Az előfizetési díjak változásáról legalább 30 nappal a hatályba lépés előtt e-mailben értesítünk. Az új
          díj a következő díjfizetési időszaktól alkalmazandó; ha nem fogadod el, az előfizetést a megújulás előtt díjmentesen lemondhatod.
        </p>
        <p>
          8.5. <strong>Fizetés és számla.</strong> A Keyfly bankkártyaadatokat nem tárol. A számlát elektronikusan állítjuk ki és küldjük meg; ehhez a
          regisztrációval hozzájárulsz.
        </p>
        <p>
          8.6. <strong>Késedelem.</strong> Díjfizetési késedelem esetén a fizetős funkciók hozzáférését fizetési felszólítást követően
          felfüggeszthetjük. A Kaucióhelyettesítő garancia díjfizetési késedelmének következményeit a Partnerbiztosító feltételei határozzák meg.
        </p>
        <p>
          8.7. <strong>Elállási jog.</strong> Ha fogyasztó vagy, a 45/2014. (II. 26.) Korm. rendelet szerint az előfizetési szerződés megkötésétől
          számított 14 napon belül indokolás nélkül elállhatsz. Ha kifejezetten kérted, hogy a szolgáltatás az elállási határidő lejárta előtt
          kezdődjön meg, az elállás napjáig teljesített szolgáltatás arányos díját meg kell fizetned. A Kaucióhelyettesítő garanciára vonatkozó
          elállási és felmondási jogot a Partnerbiztosító feltételei és a pénzügyi szolgáltatások távértékesítésére vonatkozó szabályok határozzák
          meg.
        </p>

        <h2>9. Adatvalósági nyilatkozat és ellenőrzések</h2>
        <p>
          9.1. <strong>Nyilatkozat.</strong> Ajánlatkéréskor kifejezetten nyilatkozol arról, hogy az általad megadott adatok és feltöltött
          dokumentumok valósak, teljesek és változtatás nélküliek („Az adataim valósak” nyilatkozat). A nyilatkozatot, az elfogadott dokumentumok
          verzióját és az időpontot rögzítjük.
        </p>
        <p>
          9.2. <strong>Ellenőrzések.</strong> Az Ajánlat és a Kaucióhelyettesítő garancia feltétele lehet, hogy a következő ellenőrzések sikeresen
          lezárulnak:
        </p>
        <ol>
          <li>személyazonosság ellenőrzése (Digitális Állampolgárság Program (DÁP) vagy hivatalos igazolvány alapján);</li>
          <li>
            jövedelem ellenőrzése: számlainformációs szolgáltatás (open banking) engedélyezett számlainformációs szolgáltatón keresztül, NAV
            jövedelemigazolás feltöltése vagy munkáltatói igazolás;
          </li>
          <li>nagy összegű kaució esetén a saját, általad lehívott KHR-jelentésed feltöltése.</li>
        </ol>
        <p>
          Az ellenőrzések során kezelt adatokról, a megőrzési időkről és az automatizált döntéshozatalról az Adatkezelési tájékoztató rendelkezik.
        </p>
        <p>9.3. <strong>Valótlan adatok következményei.</strong> Ha az általad megadott adat vagy dokumentum valótlan, hiányos vagy hamis:</p>
        <ol>
          <li>
            az Ajánlat érvényét veszti, és a Partnerbiztosító a saját feltételei és a Ptk. közlési kötelezettségre vonatkozó szabályai szerint járhat
            el;
          </li>
          <li>a Fiókodat felfüggeszthetjük vagy megszüntethetjük (10. pont);</li>
          <li>az ebből eredő, a Keyfly-nak vagy harmadik személynek okozott kárért a Ptk. szerint felelsz.</li>
        </ol>
        <p>
          9.4. <strong>Változások bejelentése.</strong> Ha a nyilatkozatod alapjául szolgáló adataidban lényeges változás történik, azt a
          Partnerbiztosító feltételeiben meghatározott határidőben a Platformon jelezned kell.
        </p>

        <h2>10. Felfüggesztés és megszűnés</h2>
        <p>
          10.1. <strong>A Fiók törlése általad.</strong> A Fiókodat bármikor törölheted a Platformon (Beállítások → Adataid → Fiók törlése) a
          jelszavad – és ha bekapcsoltad, a kétlépcsős azonosítás kódjának – megadásával, vagy a {support} címre írt kérelemmel. A törlés addig nem
          lehetséges, amíg (a) olyan Céges fiók Fiókgazdája vagy, amelynek rajtad kívül más tagja is van – ilyenkor előbb add át a fiókgazdai szerepet
          (4.2.4. pont); (b) Kaucióhelyettesítő garanciád vagy kárügyed van – ilyenkor a törlést az ügyfélszolgálat intézi; (c) a Keyfly munkatársa
          vagy; vagy (d) a személyes Fiókodhoz vagy egy csak általad használt Céges fiókhoz Ingatlan, Bérleti jogviszony vagy bérleti
          szerződés-kérelem tartozik – ilyenkor a törlést az ügyfélszolgálat ({support}) intézi. A törléssel megszűnik a belépésed, törlődik a
          profilod és a profilképed, megszűnnek a Csapattagságaid, és törlődnek azok a Céges fiókok is, amelyeknek egyedüli tagja voltál. A törlés nem
          vonható vissza. A lezárt Bérleti jogviszonyok adatait az Adatkezelési tájékoztatóban meghatározott megőrzési idő végéig megőrizzük. A Fiók
          törlése a Partnerbiztosítóval fennálló jogviszonyt nem szünteti meg.
        </p>
        <p>
          10.2. <strong>Céges fiók.</strong> A Céges fiókot a Fiókgazda szüntetheti meg. Ha a Céges fiók egyetlen tagja törli a Fiókját, a Céges fiók
          is megszűnik (10.1. pont). A Csapattagok személyes Fiókja a Céges fiók megszűnése után is megmarad.
        </p>
        <p>
          10.3. <strong>Felfüggesztés és megszüntetés általunk.</strong> A Fiók használatát azonnal, előzetes értesítés nélkül felfüggeszthetjük, ha
          (a) az ÁSZF-et súlyosan megsérted, (b) valótlan adatot vagy hamis dokumentumot adsz meg, (c) a Fiók biztonsága veszélybe kerül, vagy (d) ezt
          jogszabály vagy hatósági döntés előírja. A felfüggesztésről és okáról – ha jogszabály nem tiltja – haladéktalanul értesítünk, és lehetőséget
          adunk álláspontod előadására. Súlyos szerződésszegés esetén a szerződést azonnali hatállyal felmondhatjuk; egyéb esetben 30 napos felmondási
          idővel, e-mailben küldött értesítéssel mondhatjuk fel.
        </p>
        <p>
          10.4. <strong>A megszűnés következményei.</strong> A megszűnés után az adataidat az Adatkezelési tájékoztatóban meghatározott megőrzési idők
          szerint kezeljük, majd töröljük. A már kifizetett előfizetési díjat – a 8.7. pont és a jogszabályi kivételek kivételével – nem térítjük
          vissza; ha a szerződést a 10.3. pont szerint nem a te szerződésszegésed miatt mondjuk fel, a ki nem használt időszak arányos díját
          visszatérítjük.
        </p>

        <h2>11. Felelősség</h2>
        <p>
          11.1. A Platformot a lehető legnagyobb gondossággal üzemeltetjük, de folyamatos és hibamentes elérhetőségét nem garantáljuk. A tervezett
          karbantartásról – ha lehetséges – előre tájékoztatunk.
        </p>
        <p>11.2. Nem felelünk:</p>
        <ol>
          <li>a Bérbeadó és a Bérlő egymással szembeni kötelezettségeinek teljesítéséért, illetve a bérleti szerződés tartalmáért;</li>
          <li>
            a Partnerbiztosító kockázatvállalási, kárrendezési és megtérítési döntéseiért (a függő biztosításközvetítői tevékenységre vonatkozó
            felelősségi szabályokat a 7.2. pont tartalmazza);
          </li>
          <li>a Felhasználók által megadott adatok valóságáért;</li>
          <li>a Fiók hozzáférési adatainak a Felhasználó érdekkörében történt kikerüléséből eredő kárért;</li>
          <li>a Platformon kívüli, harmadik fél által nyújtott szolgáltatásokért (pl. a Felhasználó bankja, e-mail-szolgáltatója).</li>
        </ol>
        <p>
          11.3. <strong>Nem fogyasztó Felhasználóval</strong> szemben a Keyfly szerződésszegésért fennálló felelőssége összesen legfeljebb a
          káreseményt megelőző 12 hónapban a Keyfly-nak ténylegesen megfizetett előfizetési díjak összegéig terjed; az elmaradt haszonért és a
          következményi károkért nem felelünk.
        </p>
        <p>
          11.4. <strong>Fogyasztóval</strong> szemben a felelősség kizárása vagy korlátozása csak a jogszabály által megengedett mértékben
          alkalmazandó.
        </p>
        <p>
          11.5. A felelősséget kizáró vagy korlátozó rendelkezések nem alkalmazandók a szándékosan vagy súlyosan gondatlanul okozott, illetve az
          emberi életet, testi épséget vagy egészséget megsértő szerződésszegésre (Ptk. 6:152. §).
        </p>

        <h2>12. Szellemi tulajdon</h2>
        <p>
          12.1. A Platform, annak forráskódja, adatbázis-szerkezete, grafikai elemei, szövegei és a Keyfly név és logo a {COMPANY.shortName} vagy
          jogosultjai szellemi tulajdona.
        </p>
        <p>
          12.2. A Platform használatára a szerződés időtartamára szóló, nem kizárólagos, nem átruházható felhasználási jogot kapsz, kizárólag a
          Platform rendeltetésszerű használatára. Tilos a Platform másolása, visszafejtése, automatizált adatgyűjtés (scraping) és a Platform
          tartalmának kereskedelmi célú felhasználása.
        </p>
        <p>
          12.3. Az általad feltöltött tartalmak (adatok, dokumentumok) a tiéd maradnak. Ezekre a szolgáltatás nyújtásához szükséges mértékben és ideig
          felhasználási jogot adsz a Keyfly-nak.
        </p>

        <h2>13. Panaszkezelés és jogorvoslat</h2>
        <p>
          13.1. <strong>Panasz a Keyfly-nál.</strong> Panaszodat előterjesztheted e-mailben ({support}) vagy postai úton ({address}). Az írásbeli
          panaszra a fogyasztóvédelemről szóló 1997. évi CLV. törvény (<strong>Fgytv.</strong>) 17/A. §-a szerint a beérkezéstől számított 30 napon
          belül írásban, érdemben és indokolva válaszolunk. A panaszt és a választ a jogszabályban előírt ideig megőrizzük.
        </p>
        <p>
          13.2. <strong>Biztosítással kapcsolatos panasz.</strong> A Kaucióhelyettesítő garanciával, a kárrendezéssel, a megtérítéssel vagy a
          biztosításközvetítői tevékenységünkkel kapcsolatos panaszodat a Partnerbiztosító panaszkezelési szabályzata szerint bírálják el. Ha hozzánk
          nyújtod be, haladéktalanul továbbítjuk a Partnerbiztosítónak, és erről tájékoztatunk.
        </p>
        <p>
          13.3. <strong>Békéltető testületek és hatóságok.</strong> Ha a panaszod elutasításra kerül, vagy a válasz nem kielégítő, fogyasztóként a
          következő fórumokhoz fordulhatsz:
        </p>
        <LegalTable label="13.3. Békéltető testületek és hatóságok" head={["Ügy típusa", "Fórum"]}>
          <tr>
            <td>A Platformmal, előfizetéssel kapcsolatos fogyasztói jogvita</td>
            <td>Budapesti Békéltető Testület</td>
          </tr>
          <tr>
            <td>Biztosítással, biztosításközvetítéssel kapcsolatos fogyasztói jogvita</td>
            <td>Magyar Nemzeti Bank Pénzügyi Békéltető Testülete</td>
          </tr>
          <tr>
            <td>Biztosításközvetítői fogyasztóvédelmi szabályok megsértése</td>
            <td>Magyar Nemzeti Bank (fogyasztóvédelmi eljárás)</td>
          </tr>
          <tr>
            <td>Egyéb fogyasztóvédelmi jogsértés</td>
            <td>Lakóhelyed szerint illetékes vármegyei kormányhivatal</td>
          </tr>
        </LegalTable>
        <p>A Keyfly a békéltető testületi eljárásban az Fgytv. szerint együttműködik. Bírósághoz is fordulhatsz (14. pont).</p>

        <h2>14. Irányadó jog és joghatóság</h2>
        <p>
          14.1. Az ÁSZF-re és a Platform használatára a magyar jog, különösen a Polgári Törvénykönyvről szóló 2013. évi V. törvény
          (<strong>Ptk.</strong>), az elektronikus kereskedelmi szolgáltatásokról szóló 2001. évi CVIII. törvény és – fogyasztó esetén – a
          fogyasztóvédelmi jogszabályok az irányadók.
        </p>
        <p>
          14.2. Fogyasztó a lakóhelye szerinti bíróság előtt is indíthat pert, és ellene csak a lakóhelye szerinti bíróság előtt lehet pert indítani.
          Nem fogyasztó Felhasználóval szemben a felek a jogvitákra – hatáskörtől függően – a Keyfly székhelye szerint illetékes bíróság kizárólagos
          illetékességét kötik ki.
        </p>

        <h2>15. Az ÁSZF módosítása és kapcsolattartás</h2>
        <p>
          15.1. Az ÁSZF-et egyoldalúan módosíthatjuk jogszabályváltozás, hatósági előírás, a Partnerbiztosító feltételeinek változása, új funkciók
          bevezetése, illetve biztonsági okok miatt.
        </p>
        <p>
          15.2. A módosításról a hatályba lépés előtt e-mailben és a Platformon értesítünk, a változások összefoglalásával. Ha a módosítást nem
          fogadod el, a hatályba lépésig a szerződést díjmentesen, azonnali hatállyal felmondhatod. Ha nem mondasz fel, a módosított ÁSZF a hatályba
          lépés utáni első bejelentkezéskor történő elfogadással válik rád nézve kötelezővé.
        </p>
        <p>15.3. A kizárólag a te javára szóló, illetve pusztán szövegszerkesztési módosítások az értesítéssel egyidejűleg hatályba léphetnek.</p>
        <p>
          15.4. A Keyfly és te elektronikus úton, a Fiókhoz rendelt e-mail-címen és a Platformon keresztül tartjátok a kapcsolatot. Az e-mail-címed
          változását a Fiókban kell rögzítened. A Platformmal kapcsolatos e-mail-értesítések egy részét (a Bérleti jogviszony változásai, emlékeztető
          a bérleti idő lejárta előtt, Csapat-események, számlák) témánként kikapcsolhatod; a Meghívókat és a biztonsági értesítéseket mindig
          elküldjük. A Keyfly újdonságairól csak akkor küldünk e-mailt, ha ezt a beállításaidban bekapcsolod.
        </p>
        <p>15.5. Ha az ÁSZF valamely rendelkezése érvénytelen, az a többi rendelkezés érvényességét nem érinti.</p>
        <h2>16. Verzió és hatály</h2>
        <ul>
          <li>Verzió: {CONSENT_VERSIONS.accountTerms}</li>
          <li>Hatályba lépés: {date(LEGAL_EFFECTIVE.terms, locale)}</li>
          <li>
            Kapcsolódó dokumentumok: <a href={publicHref("appPrivacy", locale)}>Keyfly app adatkezelési tájékoztató</a>; a Partnerbiztosító szerződési
            feltételei és termékismertetője
          </li>
        </ul>
      </>
    );
  }

  return (
    <>
      <p><em>This English text is provided for information only. In case of any discrepancy, the Hungarian version in Part I prevails.</em></p>

      <h2>1. Provider and scope</h2>
      <p>1.1. The Keyfly service (<strong>Keyfly</strong>, <strong>we</strong>) is provided by:</p>
      <ul>
        <li>Company name: {COMPANY.legalName} (short name: {COMPANY.shortName})</li>
        <li>Registered office: {address}, Hungary</li>
        <li>Company registration no.: Cg. {COMPANY.registrationNumber} (Company Registry Court of the Budapest-Capital Regional Court)</li>
        <li>Tax no.: {COMPANY.taxNumber}</li>
        <li>Email: {support}</li>
        <li>Website: {site}; app: {app}</li>
        <li>Hosting provider: {HOSTING_PROVIDER.name} ({HOSTING_PROVIDER.address}); database provider: Supabase Inc.</li>
        {mnb && <li>Insurance intermediary registration no. (MNB): {mnb}</li>}
      </ul>
      <p>
        1.2. These General Terms (<strong>Terms</strong>) govern the use of the Keyfly website and app (together: the <strong>Platform</strong>) and
        the relationship between Keyfly and the person using the Platform (<strong>you</strong>, <strong>User</strong>).
      </p>
      <p>
        1.3. The contract is concluded by registering on, or using any feature of, the Platform. It is concluded electronically and in writing; it is
        not filed as a separate document, but we record the version of the Terms you accepted and the time of acceptance and make them available on
        request. The language of the contract is Hungarian.
      </p>
      <p>
        1.4. Keyfly is <strong>not an insurer</strong>. The deposit-replacement guarantee (surety) is provided by the Partner Insurer (section 7). The
        insurance relationship is governed by the Partner Insurer&apos;s terms and Act LXXXVIII of 2014 on Insurance Activity (<strong>Bit.</strong>);
        these Terms do not override them.
      </p>
      <p>
        1.5. If you are a consumer (acting for purposes outside your trade, business or profession), nothing in these Terms limits the rights granted
        to you by law.
      </p>

      <h2>2. Definitions</h2>
      <ul>
        <li><strong>Account</strong>: a personal user account created with an email address and password. Each User has one personal Account.</li>
        <li>
          <strong>Company account</strong>: an account created on behalf of an organisation, based on its tax number, to which a Team may belong. An
          organisation can have one Company account; besides their personal Account, a User may be a member of several Company accounts.
        </li>
        <li><strong>Team</strong>: the Users assigned to a Company account, with Roles.</li>
        <li>
          <strong>Role</strong>: the permission level held in a Company account: Account holder, Admin, Manager or Viewer (section 4.2.1). Every
          Company account has exactly one Account holder.
        </li>
        <li>
          <strong>Plan</strong>: the Keyfly Alap (free), Keyfly Pro (paid) and Keyfly Enterprise (custom) subscription options; no Plan limits the
          number of Users.
        </li>
        <li>
          <strong>Property</strong>: a let property recorded on the Platform (residential or commercial, e.g. office, retail unit), with a structured
          address, its type (section 5.1) and, optionally, a land-registry number (HRSZ).
        </li>
        <li><strong>Landlord</strong>: the User or Company account letting the Property.</li>
        <li>
          <strong>Tenant</strong>: the User or Company account renting the Property; <strong>Co-tenant</strong>: another person named as tenant in the
          lease; <strong>Occupant</strong>: a person living in the Property who is not a tenant.
        </li>
        <li>
          <strong>Lease</strong> (on the Platform): the link recorded on the Platform between the Landlord&apos;s and Tenant&apos;s accounts, with the
          lease data.
        </li>
        <li><strong>Deposit</strong>: the security deposit under the lease, which the Tenant does not pay in cash when using Keyfly.</li>
        <li>
          <strong>Deposit-replacement guarantee</strong>: the Partner Insurer&apos;s undertaking in favour of the Landlord, under which, on a valid
          claim, the Partner Insurer pays the Landlord and may then recover the amount paid from the Tenant.
        </li>
        <li><strong>Quote</strong>: the fee and terms offer generated on the Platform at the Tenant&apos;s or Landlord&apos;s request.</li>
        <li><strong>Fee</strong>: the fee paid by the Tenant instead of a cash deposit, and the subscription fees of the Plans.</li>
        <li><strong>Invitation</strong>: a single-use, time-limited link sent from the Platform.</li>
        <li><strong>Audit log</strong>: the append-only (immutable) record of changes made on the Platform.</li>
      </ul>

      <h2>3. Account and security</h2>
      <p>
        3.1. An Account may be created by a natural person aged 18 or over with full legal capacity. A Company account may only be created by a person
        authorised to represent the organisation, who expressly confirms this when creating the Company account.
      </p>
      <p>
        3.2. You sign in with your email and password or, if you choose, with your Google account; you can also sign up with Google. You can link a
        Google account to your Account or unlink it under Settings → Sign-in and security, and later link another Google account; your Account&apos;s
        sign-in email does not change. Google&apos;s sign-in service is subject to Google&apos;s own terms. If you forget your password, we email you
        a link to set a new one; links sent by email (confirmation, password reset) are valid for 1 hour. If you choose “Keep me signed in”, your
        browser stays signed in for longer; do not use this on shared devices.
      </p>
      <p>
        3.3. You are responsible for keeping your password, your email account and – if you turned it on – your authenticator app and backup codes
        secure, and for making sure no one else can access them. If you notice unauthorised access, write to {support} immediately.
      </p>
      <p>3.4. Actions taken in an Account are attributed to the Account holder unless proven otherwise.</p>
      <p>
        3.5. Keyfly staff access your Account data only with two-factor authentication (2FA) and only as needed to provide the service, for support,
        complaint or claims handling, or to meet legal obligations. Such access is recorded in the Audit log.
      </p>
      <p>
        3.6. You can turn on two-step verification for your Account with an authenticator app (time-based, single-use codes). When signing in, you can
        also ask for a 6-digit code by email instead of using the authenticator app: the code is valid for 5 minutes, you can request a new one after
        60 seconds, and it stops working after 5 wrong tries. You can turn the email code off in your settings. When you turn it on, you receive 10
        single-use backup codes, shown only once; you must keep them in a safe place. You can create new backup codes at any time, which invalidates
        the previous ones. If you sign in with a backup code, two-step verification and the remaining backup codes are switched off and you need to
        set it up again. Turning it off requires a current code from the authenticator app. We always notify you by email when two-step verification
        is turned on or off and when a backup code is used to sign in.
      </p>
      <p>
        3.7. On the Platform you can see the devices where you are signed in (browser, operating system, time of last activity), and sign out any
        other device, or all other devices at once. When you change your password, we sign you out on your other devices automatically.
      </p>
      <p>
        3.8. In your Account you can enter and change your name, phone number (optional), profile photo (optional), home address and – if different –
        mailing address (optional; foreign addresses are allowed), and the Platform language. Changing your email address or password requires your
        current password. When you add or change your phone number, you must confirm it with the 6-digit code we send by SMS (valid for 10 minutes);
        without confirmation the number is not added to your Account. We can currently send SMS only to mobile numbers used in the European Union and
        EEA member states, Switzerland, the United Kingdom, Ukraine, Serbia, the United States and Canada. When a Lease is confirmed, the
        parties&apos; names and contact details at that time are recorded as part of the Lease; later changes to your profile do not alter them.
      </p>
      <p>
        3.9. If you turned on two-step verification, when entering the sign-in code you can ask us not to request a code in that browser for 30 days
        (trusted device; not ticked by default). You can have up to 10 trusted devices at a time. You can remove them on the Platform one by one or
        all at once; we remove all of them when you change your password, turn off two-step verification or sign in with a backup code. Do not use
        this on shared devices or devices used by others. This option is not available to Keyfly staff.
      </p>
      <p>
        3.10. <strong>Bank accounts.</strong> You can add bank accounts to your personal Account, and the Account holder and Admins to a Company
        account, for receiving claim payouts and refunds (optional): currency, IBAN (16- or 24-digit Hungarian account numbers are converted to IBAN),
        account holder name and a label. There can be one primary account per currency; payouts are made to the primary account in the payout
        currency. You are responsible for the bank account details being correct and for the account being yours or, for a Company account, the
        organisation&apos;s. We check the IBAN check digits, but not whether the account exists or who holds it.
      </p>

      <h2>4. Roles and Plans</h2>
      <p>4.1. <strong>Personal account.</strong> Every User has a personal Account and can act as landlord and/or tenant in their own name.</p>
      <p>
        4.2. <strong>Company account.</strong> You create a Company account from your personal Account by entering the organisation&apos;s tax number.
        The organisation&apos;s name, tax number and registered office are retrieved from the NAV (tax authority) taxpayer register through an
        external service (see the Privacy Notice); after that, the Account holder and Admins can edit the company details (display name, legal name,
        the last three digits of the tax number, EU VAT number, company registration number, registered office, mailing address, contact email and
        phone number); the first eight digits of the tax number cannot be changed. They can retrieve the NAV data again with “Refresh from NAV”; the
        retrieved data is only stored in the Company account when saved. An organisation can have one Company account (based on the first eight digits
        of its tax number); if the organisation is already on the Platform, you can request access (section 4.2.2). The person who creates the Company
        account becomes its Account holder.
      </p>
      <p>
        4.2.1. <strong>Roles.</strong> Every Company account has exactly one Account holder; the other Team members have the Admin, Manager or Viewer
        Role. Role permissions:
      </p>
      <LegalTable label="4.2.1. Roles" head={["Role", "Permissions"]}>
        <tr>
          <td>Account holder</td>
          <td>
            All Admin permissions, plus managing the Plan and handing over the Account holder role. No one else can change the Account holder&apos;s
            Role, and the Account holder cannot be removed from the Team.
          </td>
        </tr>
        <tr>
          <td>Admin</td>
          <td>
            Inviting Team members, deciding on access requests, changing Roles (except their own and the Account holder&apos;s), removing Team members
            (except the Account holder), editing the company details and bank accounts, managing Properties and Leases.
          </td>
        </tr>
        <tr>
          <td>Manager</td>
          <td>Managing Properties, Leases, insurance and tenants; sending Invitations to Leases.</td>
        </tr>
        <tr>
          <td>Viewer</td>
          <td>Read-only access.</td>
        </tr>
      </LegalTable>
      <p>
        4.2.2. <strong>Joining a Team.</strong> The Account holder and Admins can send an unlimited number of Invitations to the Team by email; an
        Invitation is single-use and valid for 7 days (section 5.4). If the organisation is already on the Platform, you can request access with a
        short message. The Account holder and Admins are emailed about the request and see your name, email address and message; they can approve it
        with a Role or decline it, and we email you the decision. You can withdraw a pending access request on the My companies page, which also shows
        your Company accounts, your Role and the Plan. A Company account on the Keyfly Enterprise Plan can only be joined by Invitation.
      </p>
      <p>
        4.2.3. <strong>Changing Roles, removal and leaving.</strong> The Account holder and Admins can change Team members&apos; Roles and remove them
        from the Team as set out in section 4.2.1. Any Team member other than the Account holder can leave the Company account themselves. After
        removal or leaving, the Team member no longer has access to the Company account&apos;s data and can only rejoin with a new Invitation or an
        approved access request.
      </p>
      <p>
        4.2.4. <strong>Handing over the Account holder role.</strong> The Account holder can hand the role over to any Team member and then stays in
        the Team as an Admin. Both parties receive an email about the hand-over. Only the new Account holder can hand the role back. The Account
        holder can leave the Company account only after handing the role over.
      </p>
      <p>
        4.3. The Company account is responsible towards Keyfly and other Users for actions taken by its Team members on its behalf as if it had taken
        them itself. Selecting Team members and setting and revoking their permissions is the responsibility of the Company account&apos;s Account
        holder and Admins.
      </p>
      <p>4.4. <strong>Plans.</strong></p>
      <LegalTable label="4.4. Plans" head={["Plan", "Users", "Price"]}>
        <tr>
          <td>Keyfly Alap</td>
          <td>unlimited</td>
          <td>Free</td>
        </tr>
        <tr>
          <td>Keyfly Pro</td>
          <td>unlimited</td>
          <td>Paid</td>
        </tr>
        <tr>
          <td>Keyfly Enterprise</td>
          <td>unlimited</td>
          <td>Custom</td>
        </tr>
      </LegalTable>
      <p>Features per Plan are set out in the current price list and plan description published on the Platform.</p>
      <p>
        4.5. Plan fees are paid for use of the Platform and are separate from the Fee the Tenant pays for the Deposit-replacement guarantee (section
        8).
      </p>

      <h2>5. Properties, Leases and Invitations</h2>
      <p>
        5.1. <strong>Recording a Property.</strong> You record a Property with a structured address (postcode, town, street, house number, floor,
        door) and, if you provide it, its land-registry number. You also record the Property&apos;s type: flat, house, room, office, retail unit,
        hospitality venue, warehouse/industrial property, garage/parking space or other. We may use an external address-search service for this. You
        are responsible for the accuracy of the Property data and for being entitled to record it.
      </p>
      <p>
        5.2. <strong>Creating a Lease.</strong> Either the Landlord or the Tenant can start a Lease by inviting the other party. The Lease becomes
        active on the Platform when the invited party accepts the Invitation. A Lease recorded on the Platform does not replace the lease agreement
        between the parties; Keyfly is not a party to the lease agreement.
      </p>
      <p>
        5.3. <strong>Co-tenants and Occupants.</strong> Co-tenants and Occupants can be added to a Lease. You may only record another person&apos;s
        data if you are entitled to do so and have informed that person that you are sharing their data with Keyfly (see the Privacy Notice).
      </p>
      <p>
        5.4. <strong>Invitation validity.</strong> Invitations between Users (to a Lease or a Team) are valid for 7 days from sending; Invitations to
        Keyfly staff are valid for 48 hours. An expired Invitation can be replaced by a new one. Do not forward an Invitation: anyone holding the link
        can accept it.
      </p>
      <p>
        5.5. <strong>Closing a Lease.</strong> The Platform automatically closes a Lease on the 60th day after the lease term ends, unless a claim has
        been filed and is still being assessed; in that case closing is postponed until the claim is closed. After closing, the Tenant keeps read-only
        access to the data for their lease period, even if the Landlord originally set up the Lease.
      </p>
      <p>
        5.6. <strong>Audit log.</strong> The Platform records changes to Leases, Properties, Teams and Roles (who changed what, and when) in an
        append-only Audit log. Entries cannot be edited or deleted afterwards (except deletion when the retention period expires). The parties may use
        the Audit log as evidence in a dispute.
      </p>

      <h2>6. Landlord and Tenant obligations on the Platform</h2>
      <p>6.1. <strong>Both parties</strong> agree to:</p>
      <ol>
        <li>provide only true, accurate and up-to-date data, and record changes on the Platform within 15 days;</li>
        <li>record only data of persons whose data they are entitled to process;</li>
        <li>not use the Platform for unlawful, misleading or rights-infringing purposes, nor attempt to circumvent its security measures;</li>
        <li>use data about the other party received through the Platform only for purposes related to the lease.</li>
      </ol>
      <p>6.2. <strong>The Landlord</strong> further declares and agrees that:</p>
      <ol>
        <li>they are entitled to let the Property (as owner or with the owner&apos;s authorisation);</li>
        <li>the lease agreement states that the deposit is replaced by the Deposit-replacement guarantee;</li>
        <li>
          they file a claim only for a well-founded and documented claim arising from the lease, within the deadline and in the manner set out in the
          Partner Insurer&apos;s terms;
        </li>
        <li>when filing a claim they also notify the Tenant, or allow the Platform to notify the Tenant.</li>
      </ol>
      <p>6.3. <strong>The Tenant</strong> further acknowledges and agrees that:</p>
      <ol>
        <li>the Fee is the price of the deposit replacement, is not refunded in whole or in part, and is not a deposit;</li>
        <li>
          the Deposit-replacement guarantee does not remove the Tenant&apos;s liability under the lease: if the Partner Insurer pays the Landlord on a
          valid claim, it may recover the amount paid from the Tenant;
        </li>
        <li>after notice of a claim, the Tenant may submit comments and evidence through the Platform.</li>
      </ol>
      <p>
        6.4. Keyfly does not decide lease disputes between the parties and does not represent either party. Claims are decided by the Partner Insurer
        under its own terms.
      </p>

      <h2>7. Intermediary role and the Partner Insurer</h2>
      <p>
        7.1. In respect of the Deposit-replacement guarantee, Keyfly acts as a <strong>tied insurance intermediary</strong> (agent under the Bit.),
        exclusively on behalf of and in the name of the Partner Insurer.
      </p>
      <p>7.2. <strong>Intermediary details:</strong></p>
      <ul>
        <li>Status: tied insurance intermediary (agent)</li>
        {mnb && <li>MNB registration no.: {mnb}; the register can be checked on the MNB website</li>}
        <li>
          Keyfly distributes the Partner Insurer&apos;s products; it does not compare products of other insurers and does not give personalised advice
        </li>
        <li>The Partner Insurer is liable for damage caused by the tied intermediary&apos;s activity</li>
      </ul>
      <p>
        7.3. <strong>Conclusion of the contract.</strong> The Deposit-replacement guarantee is concluded with the Partner Insurer, under the Partner
        Insurer&apos;s terms. Before conclusion we make available on the Platform the Partner Insurer&apos;s terms, the product information document
        and all legally required information.
      </p>
      <p>7.4. <strong>Quote.</strong> A Quote on the Platform is indicative. The Partner Insurer may decline to accept the risk, with reasons.</p>
      <p>
        7.5. <strong>Claims and recovery.</strong> Assessing claims, paying out and recovering from the Tenant are the Partner Insurer&apos;s
        responsibility.
      </p>

      <h2>8. Fees and billing</h2>
      <p>
        8.1. <strong>Deposit-replacement Fee.</strong> The amount, due date and payment method (one-off or recurring) of the Fee payable by the Tenant
        are set out in the Quote. The Quote shows separately the insurance premium due to the Partner Insurer and the part due to Keyfly.
      </p>
      <p>
        8.2. <strong>Subscription fees.</strong> Fees for the Keyfly Pro and Enterprise Plans are set out in section 4.4 and the current price list.
        Subscriptions can be paid monthly or yearly. Yearly payment carries the discount set in the price list compared with 12 times the monthly fee
        (currently 10%). Keyfly may change the discount rate in the price list; the change does not affect periods already paid.
      </p>
      <p>
        8.3. <strong>Renewal.</strong> The subscription renews automatically for the same period at the end of each billing period unless you cancel
        it beforehand in your Account. Cancellation takes effect at the end of the current period, after which the Company account moves to the Keyfly
        Alap Plan. We notify you by email at least 30 days before a yearly subscription renews.
      </p>
      <p>
        8.4. <strong>Price changes.</strong> We notify you by email at least 30 days before a change in subscription fees takes effect. The new fee
        applies from the next billing period; if you do not accept it, you may cancel free of charge before renewal.
      </p>
      <p>
        8.5. <strong>Payment and invoices.</strong> Keyfly does not store card data. Invoices are issued and sent electronically, which you accept by
        registering.
      </p>
      <p>
        8.6. <strong>Late payment.</strong> If payment is late, we may suspend paid features after a payment reminder. The consequences of late
        payment for the Deposit-replacement guarantee are set by the Partner Insurer&apos;s terms.
      </p>
      <p>
        8.7. <strong>Right of withdrawal.</strong> If you are a consumer, under Government Decree 45/2014 (II. 26.) you may withdraw from the
        subscription contract without giving reasons within 14 days of conclusion. If you expressly asked for the service to start before the
        withdrawal period ends, you must pay a proportionate fee for the service provided up to withdrawal. Withdrawal and termination rights for the
        Deposit-replacement guarantee are set by the Partner Insurer&apos;s terms and the rules on distance marketing of financial services.
      </p>

      <h2>9. Data accuracy declaration and checks</h2>
      <p>
        9.1. <strong>Declaration.</strong> When requesting a Quote, you expressly declare that the data you provide and documents you upload are true,
        complete and unaltered (the “My data is true” declaration). We record the declaration, the version of the documents accepted and the time.
      </p>
      <p>
        9.2. <strong>Checks.</strong> The Quote and the Deposit-replacement guarantee may be subject to successful completion of the following checks:
      </p>
      <ol>
        <li>identity verification (via the Digital Citizenship Programme (DÁP) or an official ID document);</li>
        <li>
          income verification: account information service (open banking) through a licensed account information service provider, upload of a NAV
          (tax authority) income statement, or an employer certificate;
        </li>
        <li>for large deposits, upload of your own KHR (Central Credit Information System) report that you obtained yourself.</li>
      </ol>
      <p>The Privacy Notice covers the data processed in these checks, retention periods and automated decision-making.</p>
      <p>9.3. <strong>Consequences of untrue data.</strong> If data or a document you provide is untrue, incomplete or false:</p>
      <ol>
        <li>the Quote becomes invalid, and the Partner Insurer may act under its terms and the Civil Code rules on the duty of disclosure;</li>
        <li>we may suspend or close your Account (section 10);</li>
        <li>you are liable under the Civil Code for resulting damage to Keyfly or third parties.</li>
      </ol>
      <p>
        9.4. <strong>Reporting changes.</strong> If there is a material change in the data underlying your declaration, you must report it on the
        Platform within the deadline set by the Partner Insurer&apos;s terms.
      </p>

      <h2>10. Suspension and termination</h2>
      <p>
        10.1. <strong>Deleting your Account.</strong> You can delete your Account at any time on the Platform (Settings → Your data → Delete account)
        by entering your password – and, if you turned it on, a two-step verification code – or by writing to {support}. Deletion is not possible
        while (a) you are the Account holder of a Company account that has other members – hand over the Account holder role first (section 4.2.4);
        (b) you have a Deposit-replacement guarantee or a claim – in that case support handles the deletion; (c) you are Keyfly staff; or (d) a
        Property, Lease or lease request is linked to your personal Account or to a Company account used only by you – in that case support
        ({support}) handles the deletion. Deletion ends your sign-in, deletes your profile and profile photo, ends your Team memberships, and also
        deletes any Company account of which you were the only member. Deletion cannot be undone. Data of closed Leases is kept until the end of the
        retention period set out in the Privacy Notice. Deleting your Account does not end your relationship with the Partner Insurer.
      </p>
      <p>
        10.2. <strong>Company account.</strong> A Company account can be closed by its Account holder. If the only member of a Company account deletes
        their Account, the Company account is deleted too (section 10.1). Team members&apos; personal Accounts remain after the Company account is
        closed.
      </p>
      <p>
        10.3. <strong>Suspension and termination by us.</strong> We may suspend use of an Account immediately and without prior notice if (a) you
        seriously breach these Terms, (b) you provide untrue data or a false document, (c) the Account&apos;s security is at risk, or (d) law or an
        authority&apos;s decision requires it. Unless prohibited by law, we notify you promptly of the suspension and its reason and give you an
        opportunity to respond. For a serious breach we may terminate with immediate effect; otherwise with 30 days&apos; notice sent by email.
      </p>
      <p>
        10.4. <strong>Effect of termination.</strong> After termination we process your data for the retention periods in the Privacy Notice, then
        delete it. Subscription fees already paid are not refunded, except under section 8.7 and statutory exceptions; if we terminate under section
        10.3 other than for your breach, we refund the unused period pro rata.
      </p>

      <h2>11. Liability</h2>
      <p>
        11.1. We operate the Platform with the greatest possible care but do not guarantee uninterrupted or error-free availability. Where possible,
        we announce planned maintenance in advance.
      </p>
      <p>11.2. We are not liable for:</p>
      <ol>
        <li>performance of the Landlord&apos;s and Tenant&apos;s obligations to each other, or the content of the lease agreement;</li>
        <li>
          the Partner Insurer&apos;s underwriting, claims and recovery decisions (liability rules for the tied intermediary activity are in section
          7.2);
        </li>
        <li>the accuracy of data provided by Users;</li>
        <li>damage resulting from Account access data leaving the User&apos;s control within the User&apos;s sphere;</li>
        <li>services provided by third parties outside the Platform (e.g. the User&apos;s bank or email provider).</li>
      </ol>
      <p>
        11.3. <strong>Towards non-consumer Users</strong>, Keyfly&apos;s total liability for breach of contract is limited to the subscription fees
        actually paid to Keyfly in the 12 months before the event giving rise to the claim; we are not liable for lost profit or consequential loss.
      </p>
      <p>11.4. <strong>Towards consumers</strong>, exclusions or limitations of liability apply only to the extent permitted by law.</p>
      <p>
        11.5. Exclusions and limitations of liability do not apply to breaches caused intentionally or by gross negligence, or harming life, physical
        integrity or health (Civil Code, section 6:152).
      </p>

      <h2>12. Intellectual property</h2>
      <p>
        12.1. The Platform, its source code, database structure, graphics, texts, and the Keyfly name and logo are the intellectual property of {COMPANY.shortName} or
        its licensors.
      </p>
      <p>
        12.2. You receive a non-exclusive, non-transferable licence for the term of the contract, solely for normal use of the Platform. Copying,
        reverse engineering, automated data collection (scraping) and commercial use of Platform content are prohibited.
      </p>
      <p>
        12.3. Content you upload (data, documents) remains yours. You grant Keyfly a licence to use it to the extent and for the time needed to
        provide the service.
      </p>

      <h2>13. Complaints and redress</h2>
      <p>
        13.1. <strong>Complaints to Keyfly.</strong> You can submit a complaint by email ({support}) or by post ({address}). Under section 17/A of Act
        CLV of 1997 on Consumer Protection (<strong>Fgytv.</strong>), we reply to written complaints in writing, on the merits and with reasons,
        within 30 days of receipt. We keep the complaint and reply for the statutory period.
      </p>
      <p>
        13.2. <strong>Insurance-related complaints.</strong> Complaints about the Deposit-replacement guarantee, claims, recovery or our insurance
        intermediary activity are handled under the Partner Insurer&apos;s complaints policy. If you send it to us, we forward it to the Partner
        Insurer without delay and tell you so.
      </p>
      <p>
        13.3. <strong>Conciliation bodies and authorities.</strong> If your complaint is rejected or the reply is unsatisfactory, as a consumer you
        may turn to:
      </p>
      <LegalTable label="13.3. Conciliation bodies and authorities" head={["Type of matter", "Body"]}>
        <tr>
          <td>Consumer dispute about the Platform or subscription</td>
          <td>Budapest Conciliation Board (Budapesti Békéltető Testület)</td>
        </tr>
        <tr>
          <td>Consumer dispute about insurance or insurance distribution</td>
          <td>Financial Arbitration Board of the Magyar Nemzeti Bank (Pénzügyi Békéltető Testület)</td>
        </tr>
        <tr>
          <td>Breach of consumer protection rules in insurance distribution</td>
          <td>Magyar Nemzeti Bank (consumer protection proceedings)</td>
        </tr>
        <tr>
          <td>Other consumer protection breach</td>
          <td>Government office of the county of your residence</td>
        </tr>
      </LegalTable>
      <p>Keyfly cooperates in conciliation board proceedings as required by the Fgytv. You may also go to court (section 14).</p>

      <h2>14. Governing law and jurisdiction</h2>
      <p>
        14.1. These Terms and use of the Platform are governed by Hungarian law, in particular Act V of 2013 on the Civil Code (<strong>Civil
        Code</strong>), Act CVIII of 2001 on electronic commerce services and, for consumers, consumer protection legislation.
      </p>
      <p>
        14.2. A consumer may sue before the court of their place of residence and may only be sued there. With non-consumer Users, the parties agree
        on the exclusive jurisdiction of the court competent for Keyfly&apos;s registered office, subject to subject-matter jurisdiction.
      </p>

      <h2>15. Changes to the Terms and communication</h2>
      <p>
        15.1. We may amend these Terms unilaterally because of changes in law, regulatory requirements, changes in the Partner Insurer&apos;s terms,
        new features, or security reasons.
      </p>
      <p>
        15.2. We notify you of changes by email and on the Platform before they take effect, with a summary. If you do not accept the change, you may
        terminate free of charge with immediate effect before it takes effect. If you do not terminate, the amended Terms bind you once you accept
        them at your first sign-in after the effective date.
      </p>
      <p>15.3. Changes solely in your favour, or purely editorial changes, may take effect when notified.</p>
      <p>
        15.4. Keyfly and you communicate electronically, via the email address linked to the Account and through the Platform. You must update a
        changed email address in your Account. You can switch off some Platform emails by topic (Lease changes, reminders before the lease term ends,
        Team events, invoices); Invitations and security notices are always sent. We only send emails about Keyfly news if you turn this on in your
        settings.
      </p>
      <p>15.5. If any provision of these Terms is invalid, the other provisions remain valid.</p>
      <h2>16. Version and effective date</h2>
      <ul>
        <li>Version: {CONSENT_VERSIONS.accountTerms}</li>
        <li>Effective date: {date(LEGAL_EFFECTIVE.terms, locale)}</li>
        <li>
          Related documents: <a href={publicHref("appPrivacy", locale)}>Keyfly app Privacy Notice</a>; the Partner Insurer&apos;s terms and product
          information document
        </li>
      </ul>
    </>
  );
}
