<script>
  import LegalPage from "$lib/components/marketing/LegalPage.svelte";

  // One privacy policy for the web and the iOS app (App Store 5.1.1(i)); linked from Profil, the App Store page
  // and the footer. Processors and regions as configured on 2026-10-17.
  const DATA = [
    {
      what: "Podaci računa",
      detail: "E-mail adresa i ime koje dobijemo od Googlea ili Applea (Apple ti može sakriti e-mail), oznaka prijave.",
      why: "Račun i prijava.",
    },
    {
      what: "Učenje",
      detail: "Riješeni zadaci i tvoje ocjene, stanje lekcija, dnevni cilj, tempo, odabrani predmet.",
      why: "Slaganje zadataka i ponavljanja, napredak.",
    },
    {
      what: "Probna matura",
      detail: "Tvoji odgovori i fotografije rješenja koje snimiš.",
      why: "Ocjenjivanje i pregled rezultata.",
    },
    {
      what: "AI asistent",
      detail: "Pitanja koja postaviš, odgovori asistenta, tvoje ocjene i prijave odgovora.",
      why: "Razgovor s asistentom, nastavak razgovora, provjera prijavljenih odgovora.",
    },
    {
      what: "Vlastiti predmeti",
      detail: "Materijali koje kreator učita (PDF, slike) i lekcije i zadaci izrađeni iz njih.",
      why: "Izrada i korištenje vlastitog predmeta.",
    },
    {
      what: "E-mail obavijesti",
      detail: "Tvoje postavke obavijesti i zapis o poslanim podsjetnicima.",
      why: "Slanje podsjetnika samo kad ih želiš i ne više puta isti dan.",
    },
    {
      what: "Dozvola za AI",
      detail: "Tvoja odluka, verzija teksta koji si pročitao/la, vrijeme i odakle (web ili aplikacija).",
      why: "Da AI koristimo samo uz tvoju dozvolu i da to možemo dokazati.",
    },
  ];

  const PROCESSORS = [
    { who: "Auth0 (Okta)", role: "prijava i sesije", where: "EU" },
    { who: "Railway", role: "poslužitelji weba i aplikacije", where: "Nizozemska (EU)" },
    { who: "Aiven", role: "baza podataka", where: "Frankfurt, Njemačka (EU)" },
    { who: "Amazon Web Services (S3)", role: "fotografije rješenja i materijali vlastitih predmeta", where: "Stockholm, Švedska (EU)" },
    { who: "Resend", role: "slanje e-maila", where: "SAD" },
    { who: "OpenRouter i pružatelji AI modela (Anthropic, OpenAI, Google, Xiaomi)", role: "AI asistent, AI ocjenjivanje, izrada vlastitih predmeta", where: "izvan EU-a, uglavnom SAD" },
    { who: "Google", role: "prijava Googleom; Google Analytics na webu", where: "SAD i EU" },
    { who: "Apple", role: "prijava s Appleom i prosljeđivanje e-maila na skrivenu adresu", where: "SAD i EU" },
    { who: "Cloudflare", role: "zaštita prijave na webu od botova (Turnstile)", where: "globalno" },
  ];
</script>

<svelte:head>
  <title>MatMat — Pravila privatnosti</title>
  <meta name="description" content="Koje podatke MatMat prikuplja, zašto, s kim ih dijeli, koliko ih čuva i kako ih možeš obrisati." />
</svelte:head>

<LegalPage title="Pravila privatnosti" lead="Vrijede za web matmat.online i iOS aplikaciju MatMat. Zadnja izmjena: 21. listopada 2026.">
  <h2>Ukratko</h2>
  <ul>
    <li>Prikupljamo samo ono što treba za učenje: tvoj račun, napredak i ono što sam pošalješ.</li>
    <li>Ne prodajemo podatke, nema oglasa i ne pratimo te po drugim aplikacijama i stranicama.</li>
    <li>AI dobiva tvoja pitanja i rješenja samo ako mu to dozvoliš, a ime i e-mail nikad.</li>
    <li>Račun možeš obrisati sam, u aplikaciji ili na webu, i tada se sve briše odmah.</li>
  </ul>

  <h2>Tko je odgovoran za tvoje podatke</h2>
  <p>Voditelj obrade je <strong>Matino Milićević</strong>, autor MatMata. Za sva pitanja o privatnosti piši na <a href="mailto:info@matmat.online">info@matmat.online</a>.</p>

  <h2>Što prikupljamo i zašto</h2>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Podaci</th><th>Što točno</th><th>Zašto</th></tr></thead>
      <tbody>
        {#each DATA as d (d.what)}
          <tr><td><strong>{d.what}</strong></td><td>{d.detail}</td><td>{d.why}</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p>Pravna osnova za većinu toga je <strong>izvršenje ugovora</strong> (čl. 6. st. 1. t. (b) GDPR-a): bez tih podataka MatMat ti ne može slagati zadatke ni pamtiti napredak. Zapis o dozvoli za AI čuvamo radi <strong>legitimnog interesa</strong> da možemo dokazati što si odobrio/la.</p>

  <h3>Samo na webu</h3>
  <ul>
    <li><strong>Cloudflare Turnstile</strong> pri prijavi provjerava da nisi bot.</li>
    <li><strong>Google Analytics</strong> broji posjete i stranice, kako bismo znali što se koristi.</li>
    <li>Prijava i tema spremaju se u preglednik (local storage), da ostaneš prijavljen/a.</li>
  </ul>

  <h3>Samo u aplikaciji</h3>
  <ul>
    <li>Kameru i fotografije aplikacija koristi samo kad sam/a snimiš ili odabereš rješenje za probnu maturu ili materijal.</li>
    <li>Dnevni podsjetnik i nedovršena probna matura ostaju samo na tvom uređaju.</li>
    <li>Aplikacija nema oglase ni alate za praćenje.</li>
  </ul>

  <h2>AI asistent i AI ocjenjivanje</h2>
  <p>AI se koristi samo ako mu daš dozvolu. Pitamo te jednom, nakon izbora razine, a odluku mijenjaš u Profilu u aplikaciji ili u Postavkama na webu.</p>
  <ul>
    <li><strong>Što se šalje:</strong> pitanje koje postaviš, zadatak i rješenje uz koje pitaš te tekst i slike koje sam dodaš. Na probnoj maturi odgovori i fotografije rješenja koje AI ocjenjuje, a kreatorima i materijali od kojih AI izrađuje lekcije i zadatke.</li>
    <li><strong>Kome:</strong> preko usluge OpenRouter modelima tvrtki Anthropic, OpenAI, Google i Xiaomi, i to samo pružateljima koji podatke ne čuvaju i ne uče na njima.</li>
    <li><strong>Što se ne šalje:</strong> tvoje ime i e-mail adresa.</li>
    <li><strong>Bez dozvole:</strong> i dalje rješavaš zadatke, mapu, ponavljanje i višestruki izbor na probnoj maturi; isključeni su samo AI asistent i AI ocjenjivanje.</li>
    <li><strong>Povlačenje:</strong> kad isključiš dozvolu, ništa novo se više ne šalje. Ono što je već poslano ne možemo vratiti, ali pružatelji to ne čuvaju.</li>
  </ul>
  <p>AI može pogriješiti. U aplikaciji svaki odgovor asistenta i AI ocjenu možeš prijaviti kao netočne ili neprimjerene, a na webu ih ocijeniti palcem dolje; takve prijave pregledavamo.</p>

  <h2>S kim dijelimo podatke</h2>
  <p>Podatke obrađuju samo usluge koje MatMat koristi za rad, i to samo za tu svrhu:</p>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Tko</th><th>Za što</th><th>Gdje</th></tr></thead>
      <tbody>
        {#each PROCESSORS as p (p.who)}
          <tr><td><strong>{p.who}</strong></td><td>{p.role}</td><td>{p.where}</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p>Kad podaci idu izvan Europske unije, to se radi uz zaštitne mjere koje propisuje GDPR, poput EU–US okvira za privatnost podataka (Data Privacy Framework) ili standardnih ugovornih klauzula.</p>

  <h2>Koliko dugo čuvamo podatke</h2>
  <ul>
    <li>Sve navedeno čuvamo dok imaš račun.</li>
    <li>Kad obrišeš račun, odmah se brišu svi podaci iz baze, sve tvoje datoteke (fotografije rješenja, materijali), tvoja prijava u Auth0 i, ako si se prijavio/la Appleom, MatMatov pristup tvom Apple ID-u.</li>
    <li>Iz automatskih sigurnosnih kopija baze podaci nestaju najkasnije za 30 dana. Zapisi o prijavama u Auth0 brišu se same, najkasnije za 30 dana.</li>
    <li>E-mailovi koje si već primio/la ostaju u tvom sandučiću, a statistika posjeta u Google Analyticsu briše se najkasnije za 14 mjeseci.</li>
  </ul>

  <h2>Kako obrisati račun</h2>
  <ul>
    <li><strong>Aplikacija:</strong> Profil → Obriši račun.</li>
    <li><strong>Web:</strong> Postavke → Račun → Obriši račun.</li>
    <li>Ili nam piši na <a href="mailto:info@matmat.online">info@matmat.online</a> s adrese svog računa.</li>
  </ul>
  <p>Brisanje je trajno i ne može se poništiti. Na e-mail stiže potvrda.</p>

  <h2>Tvoja prava</h2>
  <p>Imaš pravo tražiti uvid u svoje podatke, njihov ispravak, brisanje, ograničenje obrade i prijenos, uložiti prigovor na obradu te u svakom trenutku povući dozvolu za AI. Za sve to piši na <a href="mailto:info@matmat.online">info@matmat.online</a>; odgovaramo najkasnije u roku od mjesec dana.</p>
  <p>Ako misliš da tvoje podatke obrađujemo protivno propisima, možeš se obratiti <a href="https://azop.hr" target="_blank" rel="noopener noreferrer">Agenciji za zaštitu osobnih podataka</a> (AZOP).</p>

  <h2>Učenici</h2>
  <p>MatMat je za učenike osnovne i srednje škole. Ako si mlađi/a od 16 godina, koristi MatMat uz znanje roditelja ili skrbnika, a dozvolu za AI daj samo ako se roditelj ili skrbnik s tim slaže.</p>

  <h2>Sigurnost</h2>
  <p>Sva komunikacija ide preko šifrirane veze (HTTPS). Fotografije i materijali nisu javni: otvaraju se samo kratkotrajnim linkom, i to samo tebi. Pristup podacima ima samo autor MatMata, i to samo kad treba riješiti problem ili pregledati prijavljeni AI odgovor.</p>

  <h2>Promjene ovih pravila</h2>
  <p>Ako se pravila promijene, nova verzija bit će na ovoj stranici s novim datumom. O većim promjenama obavijestit ćemo te e-mailom ili u aplikaciji.</p>
</LegalPage>
