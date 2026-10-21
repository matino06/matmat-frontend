<script>
  // Bohrov model atoma vodika: energijski „bunar“ s razinama (scena razine) i Bohrove staze (scena staze). Sva fizika,
  // geometrija, putanje fotona, slijed animacije i ono što je skriveno dolaze iz katalog/fizika/atom.js; ovdje se
  // samo crta i prosljeđuje unos.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import {
    atom,
    scenaOd,
    nMax,
    En,
    skok,
    foton,
    geometrija,
    yRazine,
    razinaIzY,
    spektarX,
    spektarTraka,
    kadarFotona,
    dogadjaj,
    dogadjajTopa,
    opisFotona,
    opisSkoka,
    opisTopa,
    opisRazine,
    staze,
    rStaze,
    uStaze,
    skriveno,
    crtezIzracunaj,
    jedinicaStavke,
    oznakaStavke,
    odgovorStavke,
    tocanPrijelaz,
    ishodiApsorpcije,
    nizApsorpcije,
    pocetnaOd,
    rgbIzLambda,
    PRIKAZI,
    eV,
    eVz,
    broj,
  } from "$lib/lesson/katalog/fizika/atom.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const S = untrack(() => spec);
  const nacin = S.nacin;
  const scena = scenaOd(S);
  const N = nMax(S);
  const gledanje = nacin === "istrazi" || nacin === "prikaz";
  const uid = Math.random().toString(36).slice(2, 8);
  const r1 = (x) => Math.round(x * 10) / 10;
  const rgbCss = (c) => `rgb(${c.join(" ")})`;
  const tocke = (t) => t.map((p) => p.join(",")).join(" ");

  const G = geometrija(S);
  const prikazi = Array.isArray(S.prikazi) ? S.prikazi : PRIKAZI;
  const imaTop =
    scena === "razine" && nacin === "istrazi" && prikazi.includes("top");
  const cr = nacin === "izracunaj" ? crtezIzracunaj(S) : null;
  const imaSpektar =
    scena === "razine" &&
    (nacin === "istrazi"
      ? prikazi.includes("spektar")
      : nacin === "prikaz"
        ? S.do !== "ionizacija"
        : nacin === "izracunaj"
          ? !!cr.skok
          : nacin === "prijelaz" && S.vrsta !== "apsorpcija");
  const visina = imaSpektar ? G.visinaSaSpektrom : G.visina;
  const traka = spektarTraka(S);

  // ── otkrivanje (ne otkrivati odgovor prije točnog ili „pokaži“) ──
  let otkriveno = $derived(!gledanje && (pokazi || !!ishod?.tocno));
  let sk = $derived(skriveno(S, otkriveno));
  let zakljucano = $derived(locked || pokazi);

  // ── stanje elektrona i animacija ──
  const pocetno =
    nacin === "izracunaj"
      ? cr.elektron
      : nacin === "prikaz"
        ? S.od
        : nacin === "prijelaz"
          ? (S.od ?? null)
          : pocetnaOd(S);
  let elektron = $state(pocetno ?? 1); // n | "slobodan"
  let eAnim = $state(null); // {od, do, p}
  let fotonK = $state(null); // kadar fotona {tocke, vrh, kut, rgb}
  let radi = $state(false);
  let poruka = $state("");
  let porukaRgb = $state(null);
  let zadnjiSkok = $state(null); // {od, do} strelica zadnjeg skoka
  let linije = $state([]); // linije emisijskog spektra {nm, rgb}
  let seq = null;
  let raf = 0;
  const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

  function stani() {
    cancelAnimationFrame(raf);
    seq = null;
    radi = false;
    eAnim = null;
    fotonK = null;
  }
  function primijeni(k) {
    if (k.tip === "elektron") elektron = k.do;
    if (k.tip === "reset") elektron = k.n;
  }
  function pokreni(koraci, gotovo) {
    stani();
    if (prefersReducedMotion.current) {
      // bez animacije: krajnje stanje odmah, zadnji foton nacrtan mirno na pola puta
      koraci.forEach(primijeni);
      const f = koraci.filter((k) => k.tip === "foton").at(-1);
      if (f && f.smjer !== "dolazi")
        fotonK = { ...kadarFotona(f.put, 0.55, f.nm), rgb: rgbIzLambda(f.nm) };
      gotovo?.();
      return;
    }
    seq = { koraci, i: 0, t0: performance.now(), gotovo };
    radi = true;
    raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    if (!seq) return;
    const k = seq.koraci[seq.i];
    const p = Math.min(1, (now - seq.t0) / 1000 / (k.trajanje || 0.001));
    if (k.tip === "foton")
      fotonK = { ...kadarFotona(k.put, p, k.nm), rgb: rgbIzLambda(k.nm) };
    else if (k.tip === "elektron") eAnim = { od: k.od, do: k.do, p: ease(p) };
    if (p >= 1) {
      primijeni(k);
      if (k.tip === "elektron") eAnim = null;
      if (k.tip === "foton") fotonK = null;
      seq.i++;
      seq.t0 = now;
      if (seq.i >= seq.koraci.length) {
        const g = seq.gotovo;
        seq = null;
        radi = false;
        g?.();
        return;
      }
    }
    raf = requestAnimationFrame(tick);
  }
  onMount(() => () => cancelAnimationFrame(raf));

  function dodajLiniju(k) {
    if (!k.emisija || !imaSpektar) return;
    if (linije.some((l) => Math.abs(l.nm - k.lambda_nm) < 0.5)) return;
    linije = [...linije, { nm: k.lambda_nm, rgb: k.rgb }];
  }

  // ── staze: kut elektrona na stazi i mjerilo ──
  let mjerilo = $state(S.mjerilo ?? "shematski");
  let gS = $derived(staze(S, mjerilo));
  let kut = $state(0.9);
  onMount(() => {
    if (scena !== "staze") return;
    let id;
    let prije = 0;
    const petlja = (now) => {
      const dt = Math.min(0.05, (now - (prije || now)) / 1000);
      prije = now;
      if (!prefersReducedMotion.current && !radi && elektron !== "slobodan") {
        const n = typeof elektron === "number" ? elektron : 1;
        kut += (1.5 / n ** 1.4) * dt;
      }
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  const koraciScene = (koraci) =>
    scena === "staze" ? uStaze(S, mjerilo, koraci, kut) : koraci;

  // ── jedan skok (istrazi, prikaz i otkrivanje) ──
  function odigraj(od, doN, gotovo) {
    const k = skok(S, od, doN);
    zadnjiSkok = { od, do: doN };
    poruka = opisSkoka(S, od, doN);
    porukaRgb = k.rgb;
    pokreni(koraciScene(dogadjaj(S, od, doN)), () => {
      dodajLiniju(k);
      gotovo?.();
    });
  }
  function skoci(n) {
    if (radi || n === elektron) return;
    if (n === "ionizacija" && elektron === "slobodan") return;
    odigraj(elektron, n);
  }

  // ── top fotona (istrazi) ──
  let Etop = $state(3);
  let fTop = $derived(foton(Etop));
  function posalji() {
    if (radi) return;
    if (elektron === "slobodan") {
      poruka = opisTopa(S, elektron, Etop);
      porukaRgb = null;
      return;
    }
    const n = elektron;
    const E = Etop;
    const d = dogadjajTopa(S, n, E);
    zadnjiSkok = null;
    poruka = `Foton ${opisFotona(foton(E))} leti prema atomu…`;
    porukaRgb = foton(E).rgb;
    pokreni(koraciScene(d.koraci), () => {
      poruka = opisTopa(S, n, E);
      if (d.ishod.vrsta !== "prolaz")
        zadnjiSkok = {
          od: n,
          do: d.ishod.vrsta === "skok" ? Math.min(d.ishod.do, N) : "ionizacija",
        };
    });
  }
  const pomakniE = (d) =>
    (Etop = Math.round(Math.min(16, Math.max(0.3, Etop + d)) * 100) / 100);

  // ── prikaz: skok se sam odigra ──
  function ponovi() {
    stani();
    elektron = S.od;
    linije = [];
    odigraj(S.od, S.do);
  }
  onMount(() => {
    if (nacin !== "prikaz") return;
    const t = setTimeout(ponovi, 400);
    return () => clearTimeout(t);
  });

  // ── prijelaz: učenik bira skok ──
  let izbor = $state({ od: S.od ?? null, do: null });
  function biraj(n) {
    if (zakljucano || n === "ionizacija") return;
    if (Number.isInteger(S.od)) {
      izbor = { od: S.od, do: n === S.od ? null : n };
      return;
    }
    if (izbor.od == null || izbor.do != null) izbor = { od: n, do: null };
    else if (n === izbor.od) izbor = { od: null, do: null };
    else izbor = { ...izbor, do: n };
  }
  // povlačenje, dodir elektrona i strelice mijenjaju samo konačnu razinu (početna ostaje); ispočetka se kreće
  // samo dodirom oznake razine
  function birajDo(n) {
    if (zakljucano || n === "ionizacija" || izbor.od == null) return;
    izbor = { od: izbor.od, do: n === izbor.od ? null : n };
  }
  function provjeriPrijelaz() {
    if (zakljucano) return;
    onodgovor({ od: izbor.od, do: izbor.do });
  }

  // ── izracunaj ──
  const pitaj = S.pitaj ?? [];
  let unosi = $state(pitaj.map(() => ""));
  // ± stoji uz svako polje za energiju (E_n, E_ion, E_f), da njegova prisutnost ne oda predznak odgovora
  const predznak = (it) => ["E_n", "E_ion", "E_f"].includes(it.velicina);
  function promijeniPredznak(i) {
    const v = unosi[i].trim();
    unosi[i] = /^[-−]/.test(v) ? v.replace(/^[-−]\s*/, "") : `−${v}`;
  }
  function provjeriIzracunaj() {
    if (zakljucano) return;
    onodgovor([...unosi]);
  }

  // ── apsorpcija ──
  const fotoni = S.fotoni ?? [];
  let izbori = $state(fotoni.map(() => null));
  let rezultati = $state(fotoni.map(() => ""));
  let aktivni = $state(-1);
  function provjeriApsorpciju() {
    if (zakljucano) return;
    onodgovor([...izbori]);
  }
  function pustiFotone() {
    const niz = nizApsorpcije(S);
    rezultati = fotoni.map(() => "");
    const dalje = (i) => {
      if (i >= niz.length) {
        aktivni = -1;
        return;
      }
      aktivni = i;
      poruka = `Foton ${i + 1}: ${eVz(niz[i].E)} leti prema atomu…`;
      porukaRgb = foton(niz[i].E).rgb;
      pokreni(niz[i].koraci, () => {
        rezultati[i] = niz[i].tekst;
        poruka = niz[i].tekst;
        dalje(i + 1);
      });
    };
    dalje(0);
  }

  // ── pokaži točan odgovor u widgetu ──
  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (nacin === "izracunaj")
        unosi = pitaj.map((it) => odgovorStavke(S, it));
      else if (nacin === "prijelaz") {
        const t = tocanPrijelaz(S);
        if (t) izbor = { ...t };
      } else if (nacin === "apsorpcija")
        izbori = ishodiApsorpcije(S).map((x) => (x.upije ? "upije" : "prodje"));
    });
  });
  // kad se odgovor otkrije, foton izleti (ili fotoni dolete)
  let biloOtkriveno = false;
  let odigrano = $state(false);
  $effect(() => {
    if (!otkriveno || biloOtkriveno) return;
    biloOtkriveno = true;
    untrack(() => {
      if (nacin === "izracunaj") {
        if (cr.skok) {
          elektron = cr.skok.od;
          odigraj(cr.skok.od, cr.skok.do);
        } else if (cr.ionizacija) {
          const n = pitaj.find((q) => q.velicina === "E_ion").n;
          elektron = n;
          odigraj(n, "ionizacija");
        } else poruka = opisRazine(S, elektron);
      } else if (nacin === "prijelaz") {
        const t = tocanPrijelaz(S);
        odigrano = true;
        elektron = t.od;
        odigraj(t.od, t.do);
      } else if (nacin === "apsorpcija") pustiFotone();
    });
  });
  let prijelazIzbor = $derived(nacin === "prijelaz" && !odigrano);

  // ── povlačenje elektrona (istrazi; prijelaz kad je početna razina poznata) ──
  let svgEl = $state();
  let vuce = $state(false);
  let yPtr = $state(null);
  let mozeVuci = $derived(
    scena === "razine" &&
      ((nacin === "istrazi" && !radi) ||
        (prijelazIzbor && !zakljucano && izbor.od != null)),
  );
  const slobodno = nacin === "istrazi";
  function svgY(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()).y;
  }
  const yMin = slobodno ? G.slobodanY : G.y0 + 4;
  const ogranici = (y) => Math.min(G.dno - 6, Math.max(yMin, y));
  function down(e) {
    if (!mozeVuci) return;
    const y = svgY(e);
    if (y == null) return;
    e.preventDefault();
    vuce = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* sintetički događaj bez aktivnog pokazivača */
    }
    yPtr = ogranici(y);
  }
  function move(e) {
    if (!vuce) return;
    const y = svgY(e);
    if (y != null) yPtr = ogranici(y);
  }
  let kandidat = $derived(
    vuce && yPtr != null ? razinaIzY(S, yPtr, { slobodno }) : null,
  );
  function up() {
    if (!vuce) return;
    const n = kandidat;
    vuce = false;
    yPtr = null;
    if (n == null) return;
    if (nacin === "istrazi") skoci(n);
    else if (prijelazIzbor) birajDo(n);
  }
  // prekinuto povlačenje (sustav preuzme dodir): samo se odustane, razina se ne bira
  function odustani() {
    vuce = false;
    yPtr = null;
  }
  // tipkovnica na elektronu: gore/dolje za jednu razinu
  function key(e) {
    if (!mozeVuci) return;
    const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[
      e.key
    ];
    if (!d) return;
    e.preventDefault();
    const sad = nacin === "istrazi" ? elektron : (izbor.do ?? izbor.od ?? 1);
    if (sad === "slobodan") {
      if (d < 0) skoci(N);
      return;
    }
    const n = sad + d;
    if (n < 1) return;
    if (n > N) {
      if (nacin === "istrazi") skoci("ionizacija");
      return;
    }
    if (nacin === "istrazi") skoci(n);
    else birajDo(n);
  }
  function dodirRazine(n) {
    if (nacin === "istrazi") skoci(n);
    else if (prijelazIzbor) biraj(n);
  }
  let birajRazine = $derived(
    (nacin === "istrazi" && !radi) || (prijelazIzbor && !zakljucano),
  );

  // ── položaj elektrona na crtežu ──
  const yR = (n) => yRazine(S, n);
  let eY = $derived.by(() => {
    if (vuce && yPtr != null) return yPtr;
    if (eAnim) return yR(eAnim.od) + (yR(eAnim.do) - yR(eAnim.od)) * eAnim.p;
    if (prijelazIzbor) {
      const n = izbor.do ?? izbor.od;
      return n == null ? null : yR(n);
    }
    return yR(elektron);
  });
  let naRazini = $derived(
    prijelazIzbor ? (izbor.do ?? izbor.od) : eAnim ? null : elektron,
  );
  // strelica skoka: zadani skok (izracunaj), izbor (prijelaz) ili zadnji skok (istrazi/prikaz)
  let strelica = $derived.by(() => {
    if (nacin === "izracunaj" && cr.skok)
      return { ...cr.skok, vrsta: "zadano" };
    if (prijelazIzbor && izbor.od != null && izbor.do != null)
      return { ...izbor, vrsta: "izbor" };
    if (zadnjiSkok && !radi && !(ionStrelica && zadnjiSkok.do === "ionizacija"))
      return {
        ...zadnjiSkok,
        vrsta: nacin === "istrazi" || nacin === "prikaz" ? "zadnji" : "izbor",
      };
    return null;
  });
  // ionizacija: strelica do ruba (izracunaj E_ion, prikaz ionizacije)
  let ionStrelica = $derived.by(() => {
    if (nacin === "izracunaj" && cr.ionizacija) {
      const n = pitaj.find((q) => q.velicina === "E_ion").n;
      return {
        n,
        skriven: sk.energije,
        tekst: `treba dovesti ${eV(-En(n, S.Z ?? 1))}`,
      };
    }
    if (nacin === "prikaz" && S.do === "ionizacija")
      return { n: S.od, tekst: `treba dovesti ${eV(-En(S.od, S.Z ?? 1))}` };
    return null;
  });

  // staze: položaj elektrona
  let eR = $derived.by(() => {
    if (scena !== "staze") return 0;
    if (eAnim)
      return (
        rStaze(S, mjerilo, eAnim.od) +
        (rStaze(S, mjerilo, eAnim.do) - rStaze(S, mjerilo, eAnim.od)) * eAnim.p
      );
    return rStaze(S, mjerilo, elektron);
  });

  // ── tekstovi ──
  const uputa = {
    istrazi:
      scena === "staze"
        ? "Dodirni stazu (ili gumb n) da elektron skoči."
        : "Povuci elektron gore ili dolje, ili dodirni oznaku razine lijevo.",
    prikaz: "",
    izracunaj:
      "Upiši rezultate (decimalni zarez je u redu) i pritisni Provjeri.",
    prijelaz: Number.isInteger(S.od)
      ? "Povuci elektron na razinu na koju skoči (ili dodirni oznaku razine), pa Provjeri."
      : "Dodirni početnu, pa završnu razinu (oznake lijevo). Zatim Provjeri.",
    apsorpcija: "Za svaki foton odaberi „upije“ ili „prođe“, pa Provjeri.",
  }[nacin];
  let tocan = $derived(pokazi ? atom.tocanOdgovor(S) : "");
  let opis = $derived.by(() => {
    const kraj = `Elektron je ${elektron === "slobodan" ? "slobodan, iznad ruba" : `na razini n = ${elektron}`}.`;
    if (scena === "staze")
      return `Bohrove staze atoma vodika, n = 1 do ${N}, ${mjerilo === "pravo" ? "u mjerilu" : "shematski"}. ${kraj}`;
    const en = sk.energije
      ? ""
      : ` Energije: ${G.razine.map((r) => `n = ${r.n}: ${eV(r.E)}`).join(", ")}.`;
    let o = `Energijski dijagram vodika: rub bunara 0 eV, razine n = 1 do ${N}.${en}`;
    if (prijelazIzbor)
      o += ` Odabrani skok: ${izbor.od ?? "?"} → ${izbor.do ?? "?"}.`;
    else o += ` ${kraj}`;
    if (strelica?.vrsta === "zadano")
      o += ` Strelica: skok ${strelica.od} → ${strelica.do}.`;
    return o;
  });
  let ocitanjeTop = $derived(opisFotona(fTop));
</script>

{#if gledanje}
  <div class="at-tekst"><Md text={S.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={S.tekst} /></div>
{/if}

<figure class="lx-figure at">
  {#if scena === "razine"}
    <svg
      bind:this={svgEl}
      viewBox="0 0 {G.sir} {visina}"
      role="img"
      aria-label={opis}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={odustani}
    >
      <defs>
        <linearGradient id="at-bunar-{uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="at-bunar-gore" />
          <stop offset="1" class="at-bunar-dolje" />
        </linearGradient>
        <linearGradient id="at-vid-{uid}" x1="0" y1="0" x2="1" y2="0">
          {#each traka.boje as b, i (i)}
            <stop offset={b.pomak} stop-color={rgbCss(b.rgb)} />
          {/each}
        </linearGradient>
        <marker
          id="at-vrh-{uid}"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" class="at-vrh-m" />
        </marker>
        <marker
          id="at-vrh-ok-{uid}"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" class="at-vrh-ok" />
        </marker>
      </defs>

      <!-- slobodan elektron iznad ruba -->
      <rect class="at-slobodno" x="0" y="0" width={G.sir} height={G.y0} />
      <text class="at-slobodno-t" x={G.sir - 6} y="14" text-anchor="end"
        >slobodan elektron, E > 0</text
      >
      <!-- bunar -->
      <path
        class="at-bunar"
        fill="url(#at-bunar-{uid})"
        d="M{G.zid[0]},{G.y0} V{G.dno - 10} Q{G.zid[0]},{G.dno} {G.zid[0] +
          10},{G.dno} H{G.zid[1] - 10} Q{G.zid[1]},{G.dno} {G.zid[1]},{G.dno -
          10} V{G.y0}"
      />
      <line
        class="at-rub"
        x1={G.zid[0] - 14}
        y1={G.y0}
        x2={G.sir - 4}
        y2={G.y0}
      />
      <text class="at-rub-t" x={G.sir - 6} y={G.y0 + 13} text-anchor="end"
        >0 eV</text
      >

      <!-- razine, oznake (ljestve) i crtice -->
      {#each G.razine as r (r.n)}
        {@const ovdje = naRazini === r.n}
        {@const kand = kandidat === r.n}
        {@const odabrana =
          prijelazIzbor && (izbor.od === r.n || izbor.do === r.n)}
        <line
          class="at-razina"
          class:at-ovdje={ovdje}
          class:at-kand={kand}
          x1={G.zid[0] + 2}
          y1={r.y}
          x2={G.zid[1] - 2}
          y2={r.y}
        />
        <polyline
          class="at-crtica"
          class:at-kand={kand}
          points="{G.cip.x + G.cip.w},{r.yOz} {G.cip.x + G.cip.w + 6},{r.yOz} {G
            .zid[0] + 2},{r.y}"
        />
        <g
          class="at-cip"
          class:at-ovdje={ovdje}
          class:at-kand={kand}
          class:at-odabrana={odabrana}
          class:at-aktivan={birajRazine}
          role="button"
          tabindex={birajRazine ? 0 : -1}
          aria-disabled={!birajRazine}
          aria-label="Razina n = {r.n}{sk.energije ? '' : `, ${eV(r.E)}`}"
          onclick={() => birajRazine && dodirRazine(r.n)}
          onkeydown={(e) =>
            birajRazine &&
            (e.key === "Enter" || e.key === " ") &&
            (e.preventDefault(), dodirRazine(r.n))}
        >
          <rect
            x={G.cip.x - 2}
            y={r.yOz - G.cip.razmak / 2}
            width={G.cip.w + 4}
            height={G.cip.razmak}
            class="at-cip-hit"
          />
          <rect
            x={G.cip.x}
            y={r.yOz - G.cip.h / 2}
            width={G.cip.w}
            height={G.cip.h}
            rx="9"
            class="at-cip-r"
          />
          <text x={G.cip.x + 8} y={r.yOz + 4} class="at-cip-n">n = {r.n}</text>
          {#if !sk.energije}
            <text
              x={G.cip.x + G.cip.w - 7}
              y={r.yOz + 4}
              class="at-cip-t"
              text-anchor="end">{broj(r.E)} eV</text
            >
          {/if}
        </g>
      {/each}
      {#if nacin === "istrazi"}
        <g
          class="at-cip at-aktivan"
          class:at-ovdje={elektron === "slobodan"}
          class:at-kand={kandidat === "ionizacija"}
          role="button"
          tabindex="0"
          aria-label="Ionizacija: elektron postane slobodan"
          onclick={() => !radi && skoci("ionizacija")}
          onkeydown={(e) =>
            (e.key === "Enter" || e.key === " ") &&
            (e.preventDefault(), skoci("ionizacija"))}
        >
          <rect
            x={G.cip.x}
            y={G.slobodanY - G.cip.h / 2}
            width={G.cip.w}
            height={G.cip.h}
            rx="9"
            class="at-cip-r at-cip-slob"
          />
          <text x={G.cip.x + 8} y={G.slobodanY + 4} class="at-cip-t"
            >slobodan</text
          >
        </g>
      {/if}

      <!-- strelica skoka -->
      {#if strelica && strelica.od != null && strelica.do != null}
        {@const x = G.xe - 34}
        {@const ya = yR(strelica.od)}
        {@const yb = yR(strelica.do)}
        <line
          class="at-skok"
          class:at-skok-zadano={strelica.vrsta === "zadano"}
          class:at-skok-zadnji={strelica.vrsta === "zadnji"}
          class:at-skok-ok={otkriveno && strelica.vrsta !== "zadnji"}
          x1={x}
          y1={ya + (yb > ya ? 4 : -4)}
          x2={x}
          y2={yb + (yb > ya ? -4 : 4)}
          marker-end={otkriveno && strelica.vrsta !== "zadnji"
            ? `url(#at-vrh-ok-${uid})`
            : `url(#at-vrh-${uid})`}
        />
        {#if prijelazIzbor}
          <circle class="at-duh" cx={G.xe} cy={ya} r="8" />
        {/if}
      {/if}
      {#if ionStrelica}
        {@const ya = yR(ionStrelica.n)}
        <line
          class="at-ion"
          x1={G.xe + 30}
          y1={ya - 4}
          x2={G.xe + 30}
          y2={G.y0 + 3}
          marker-end="url(#at-vrh-{uid})"
        />
        <text
          class="at-ion-t"
          x={G.xe + 36}
          y={Math.max(G.y0 + 16, (ya + G.y0) / 2 + 4)}
          >{#if ionStrelica.skriven}E<tspan class="at-sub" dy="3">ion</tspan
            ><tspan dy="-3"> = ?</tspan>{:else}{ionStrelica.tekst}{/if}</text
        >
      {/if}

      <!-- foton -->
      {#if fotonK?.vidljiv}
        <polyline class="at-foton-pod" points={tocke(fotonK.tocke)} />
        <polyline
          class="at-foton"
          style="stroke: {rgbCss(fotonK.rgb)}"
          points={tocke(fotonK.tocke)}
        />
        <path
          d="M0,0 L-8,-4.5 L-8,4.5 z"
          style="fill: {rgbCss(fotonK.rgb)}"
          class="at-foton-vrh"
          transform="translate({fotonK.vrh[0]} {fotonK
            .vrh[1]}) rotate({fotonK.kut})"
        />
      {/if}

      <!-- elektron -->
      {#if eY != null}
        {#if mozeVuci}
          <g
            class="lx-handle at-ruc"
            role="slider"
            tabindex="0"
            aria-label="Elektron: povuci gore ili dolje, ili strelicama"
            aria-valuemin="1"
            aria-valuemax={N}
            aria-valuenow={typeof naRazini === "number" ? naRazini : N}
            aria-valuetext={naRazini === "slobodan"
              ? "slobodan"
              : `n = ${naRazini ?? "?"}`}
            onpointerdown={down}
            onkeydown={key}
          >
            <circle class="at-hit" cx={G.xe} cy={eY} r="22" />
            <circle class="at-halo" cx={G.xe} cy={eY} r="13" />
            <circle class="at-elektron" cx={G.xe} cy={eY} r="8" />
          </g>
        {:else}
          <circle class="at-halo" cx={G.xe} cy={eY} r="13" />
          <circle class="at-elektron" cx={G.xe} cy={eY} r="8" />
        {/if}
        <text class="at-e-t" x={G.xe} y={eY + 3.5} text-anchor="middle">e⁻</text
        >
      {/if}

      <!-- spektar -->
      {#if imaSpektar}
        {@const sp = traka}
        <rect
          class="at-sp-nev"
          x={sp.x}
          y={sp.y}
          width={sp.xVid[0] - sp.x}
          height={sp.h}
        />
        <rect
          x={sp.xVid[0]}
          y={sp.y}
          width={sp.xVid[1] - sp.xVid[0]}
          height={sp.h}
          fill="url(#at-vid-{uid})"
          class="at-sp-vid"
        />
        <rect
          class="at-sp-nev"
          x={sp.xVid[1]}
          y={sp.y}
          width={sp.x + sp.w - sp.xVid[1]}
          height={sp.h}
        />
        <rect
          class="at-sp-okvir"
          x={sp.x}
          y={sp.y}
          width={sp.w}
          height={sp.h}
        />
        {#if !sk.spektar}
          {#each linije as l, i (l.nm)}
            {@const x = spektarX(S, l.nm)}
            <rect
              class="at-sp-linija"
              x={x - 1.6}
              y={sp.y - 4}
              width="3.2"
              height={sp.h + 8}
              style="fill: {rgbCss(l.rgb)}"
            />
            {#if i === linije.length - 1}
              <text
                class="at-sp-lt"
                x={Math.min(sp.x + sp.w - 14, Math.max(sp.x + 14, x))}
                y={sp.y - 7}
                text-anchor="middle"
                >{l.nm >= 1e4
                  ? `${broj(l.nm / 1000)} µm`
                  : `${broj(l.nm)} nm`}</text
              >
            {/if}
          {/each}
        {/if}
        {#each sp.oznake as o (o.tekst)}
          <text
            class="at-sp-t"
            x={o.x}
            y={sp.y + sp.h + 13}
            text-anchor="middle">{o.tekst}</text
          >
        {/each}
      {/if}
    </svg>
  {:else}
    <!-- staze -->
    <svg viewBox="0 0 {gS.sir} {gS.visina}" role="img" aria-label={opis}>
      {#each gS.staze as st, i (st.n)}
        {@const ovdje = elektron === st.n && !eAnim}
        <circle
          class="at-staza"
          class:at-ovdje={ovdje}
          cx={gS.cx}
          cy={gS.cy}
          r={st.r}
        />
        {#if nacin === "istrazi"}
          <circle
            class="at-staza-hit"
            role="button"
            tabindex="-1"
            aria-label="Staza n = {st.n}"
            cx={gS.cx}
            cy={gS.cy}
            r={st.r}
            onclick={() => skoci(st.n)}
            onkeydown={() => {}}
          />
        {/if}
        {#if i === 0 || st.r - gS.staze[i - 1].r >= 11}
          <text
            class="at-staza-t"
            x={gS.cx + st.r * 0.71 + 3}
            y={gS.cy + st.r * 0.71 + 10}>{st.n}</text
          >
        {/if}
      {/each}
      <circle class="at-jezgra" cx={gS.cx} cy={gS.cy} r={gS.jezgraR} />
      {#if mjerilo !== "pravo"}
        <text class="at-jezgra-t" x={gS.cx} y={gS.cy + 3} text-anchor="middle"
          >p⁺</text
        >
      {/if}
      {#if fotonK?.vidljiv}
        <polyline class="at-foton-pod" points={tocke(fotonK.tocke)} />
        <polyline
          class="at-foton"
          style="stroke: {rgbCss(fotonK.rgb)}"
          points={tocke(fotonK.tocke)}
        />
        <path
          d="M0,0 L-8,-4.5 L-8,4.5 z"
          style="fill: {rgbCss(fotonK.rgb)}"
          transform="translate({fotonK.vrh[0]} {fotonK
            .vrh[1]}) rotate({fotonK.kut})"
        />
      {/if}
      {#if elektron !== "slobodan" || eAnim}
        {@const ex = gS.cx + eR * Math.cos(kut)}
        {@const ey = gS.cy - eR * Math.sin(kut)}
        <circle class="at-halo" cx={r1(ex)} cy={r1(ey)} r="11" />
        <circle class="at-elektron" cx={r1(ex)} cy={r1(ey)} r="6.5" />
      {/if}
    </svg>
    {#if mjerilo === "pravo"}
      <figcaption class="at-napomena">
        u mjerilu: r ∝ n² (jezgra je zapravo još oko 50 000 puta manja)
      </figcaption>
    {:else}
      <figcaption class="at-napomena">
        shematski: razmaci staza nisu u mjerilu
      </figcaption>
    {/if}
  {/if}
</figure>

<!-- očitanje fotona / događaja -->
{#if poruka && (gledanje || otkriveno) && nacin !== "apsorpcija"}
  <p class="lx-readout at-ocitanje" aria-live="polite">
    {#if porukaRgb}<span class="at-boja" style="background: {rgbCss(porukaRgb)}"
      ></span>{/if}{poruka}
  </p>
{/if}

{#if scena === "staze" && nacin === "istrazi"}
  <div class="at-staze-gumbi" role="group" aria-label="Skok na stazu">
    {#each gS.staze as st (st.n)}
      <button
        type="button"
        class="btn btn-ghost at-n"
        class:at-n-ovdje={elektron === st.n}
        disabled={radi}
        onclick={() => skoci(st.n)}>n = {st.n}</button
      >
    {/each}
    <button
      type="button"
      class="btn btn-ghost at-n"
      disabled={radi || elektron === "slobodan"}
      onclick={() => skoci("ionizacija")}>ionizacija</button
    >
  </div>
{/if}
{#if scena === "staze" && gledanje}
  <div class="lx-actions at-akcije">
    <button
      type="button"
      class="btn btn-quiet"
      onclick={() => (mjerilo = mjerilo === "pravo" ? "shematski" : "pravo")}
      >{mjerilo === "pravo" ? "Prikaži shematski" : "Prikaži u mjerilu"}</button
    >
    {#if nacin === "istrazi" && elektron === "slobodan"}
      <button
        type="button"
        class="btn btn-ghost"
        disabled={radi}
        onclick={() => skoci(pocetnaOd(S))}
        >Vrati elektron na n = {pocetnaOd(S)}</button
      >
    {/if}
    {#if nacin === "prikaz"}
      <button type="button" class="btn btn-ghost" onclick={ponovi}
        >▶ Ponovi</button
      >
    {/if}
  </div>
{/if}

{#if scena === "razine" && nacin === "istrazi"}
  {#if imaTop}
    <div class="at-top">
      <div class="at-top-red">
        <span class="at-top-ozn">Foton iz topa</span>
        <button
          type="button"
          class="btn btn-quiet at-pm"
          onclick={() => pomakniE(-0.01)}
          aria-label="Smanji energiju fotona za 0,01 eV">−</button
        >
        <input
          class="at-klizac"
          type="range"
          min="0.3"
          max="16"
          step="0.05"
          bind:value={Etop}
          aria-label="Energija fotona u eV"
          aria-valuetext={eV(Etop)}
        />
        <button
          type="button"
          class="btn btn-quiet at-pm"
          onclick={() => pomakniE(0.01)}
          aria-label="Povećaj energiju fotona za 0,01 eV">+</button
        >
      </div>
      <p class="at-top-ocit">
        <span class="at-boja" style="background: {rgbCss(fTop.rgb)}"></span>
        <b>{broj(Etop, 4)} eV</b> · {ocitanjeTop
          .split(" · ")
          .slice(1)
          .join(" · ")}
      </p>
    </div>
  {/if}
  <div class="lx-actions at-akcije">
    {#if imaTop}
      <button
        type="button"
        class="btn btn-primary"
        disabled={radi || elektron === "slobodan"}
        onclick={posalji}>Pošalji foton</button
      >
    {/if}
    {#if elektron === "slobodan"}
      <button
        type="button"
        class="btn btn-ghost"
        disabled={radi}
        onclick={() => skoci(pocetnaOd(S))}
        >Vrati elektron na n = {pocetnaOd(S)}</button
      >
    {/if}
    {#if imaSpektar && linije.length}
      <button type="button" class="btn btn-quiet" onclick={() => (linije = [])}
        >Očisti spektar</button
      >
    {/if}
  </div>
{/if}
{#if scena === "razine" && nacin === "prikaz"}
  <div class="lx-actions at-akcije">
    <button type="button" class="btn btn-ghost" onclick={ponovi}
      >▶ Ponovi</button
    >
  </div>
{/if}

<!-- izracunaj -->
{#if nacin === "izracunaj"}
  <div class="at-polja">
    {#each pitaj as it, i (i)}
      <div class="at-polje">
        <label class="at-polje-ozn" for="at-{uid}-{i}">
          <Md text={oznakaStavke(it)} inline /> =
        </label>
        <input
          id="at-{uid}-{i}"
          class="inp at-inp"
          class:ok={otkriveno}
          inputmode="decimal"
          autocomplete="off"
          placeholder="?"
          disabled={zakljucano}
          bind:value={unosi[i]}
          onkeydown={(e) => e.key === "Enter" && provjeriIzracunaj()}
        />
        <span class="lx-unit">{jedinicaStavke(it)}</span>
        {#if predznak(it) && !zakljucano}
          <button
            type="button"
            class="btn btn-quiet at-pm"
            onclick={() => promijeniPredznak(i)}
            aria-label="Promijeni predznak">±</button
          >
        {/if}
        {#if it.velicina !== "E_n"}
          <span class="at-polje-kad"
            >{it.velicina === "E_ion"
              ? `s ${it.n}. staze`
              : `skok ${it.od} → ${it.do}`}</span
          >
        {/if}
      </div>
    {/each}
  </div>
{/if}

<!-- prijelaz -->
{#if nacin === "prijelaz"}
  <p class="at-izbor" aria-live="polite">
    Skok: <b>{izbor.od ?? "?"} → {izbor.do ?? "?"}</b>
    {#if !Number.isInteger(S.od) && !zakljucano && (izbor.od != null || izbor.do != null)}
      <button
        type="button"
        class="btn btn-quiet at-ponisti"
        onclick={() => (izbor = { od: null, do: null })}>Poništi</button
      >
    {/if}
  </p>
{/if}

<!-- apsorpcija -->
{#if nacin === "apsorpcija"}
  <div class="at-fotoni">
    {#each fotoni as E, i (i)}
      <div class="at-karta" class:at-karta-akt={aktivni === i}>
        <span class="at-karta-e">Foton {i + 1}: <b>{eVz(E)}</b></span>
        <div class="at-seg" role="group" aria-label="Foton {i + 1}">
          <button
            type="button"
            class="at-seg-b"
            class:sel={izbori[i] === "upije"}
            aria-pressed={izbori[i] === "upije"}
            disabled={zakljucano}
            onclick={() => (izbori[i] = "upije")}>upije</button
          >
          <button
            type="button"
            class="at-seg-b"
            class:sel={izbori[i] === "prodje"}
            aria-pressed={izbori[i] === "prodje"}
            disabled={zakljucano}
            onclick={() => (izbori[i] = "prodje")}>prođe</button
          >
        </div>
        {#if otkriveno && rezultati[i]}
          <p class="at-karta-rez">{rezultati[i]}</p>
        {/if}
      </div>
    {/each}
  </div>
{/if}

{#if !gledanje}
  {#if !zakljucano}<p class="at-uputa">{uputa}</p>{/if}
  <div class="lx-actions at-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={nacin === "izracunaj"
        ? provjeriIzracunaj
        : nacin === "prijelaz"
          ? provjeriPrijelaz
          : provjeriApsorpciju}
      disabled={zakljucano ||
        (nacin === "izracunaj" && unosi.every((u) => !u.trim())) ||
        (nacin === "prijelaz" && (izbor.od == null || izbor.do == null)) ||
        (nacin === "apsorpcija" && izbori.some((x) => x == null))}
      >Provjeri</button
    >
  </div>
  {#if tocan}
    <p class="lx-solution">Točno: {tocan}</p>
  {/if}
{:else if uputa}
  <p class="at-uputa">{uputa}</p>
{/if}

<style>
  .at-tekst {
    margin-bottom: 10px;
  }
  .at {
    max-width: 420px;
    margin-bottom: 6px;
  }
  .at svg {
    touch-action: manipulation;
  }
  .at-slobodno {
    fill: color-mix(in srgb, var(--success) 9%, transparent);
  }
  .at-slobodno-t {
    fill: var(--success);
    font: 600 10.5px var(--font-sans);
  }
  .at-bunar {
    stroke: var(--text-dim);
    stroke-width: 2;
  }
  .at-bunar-gore {
    stop-color: color-mix(in srgb, var(--primary) 4%, var(--bg-elev));
  }
  .at-bunar-dolje {
    stop-color: color-mix(in srgb, var(--primary) 26%, var(--bg-elev));
  }
  .at-rub {
    stroke: var(--success);
    stroke-width: 2;
    stroke-dasharray: 6 4;
  }
  .at-rub-t {
    fill: var(--success);
    font: 700 11px var(--font-sans);
  }
  .at-razina {
    stroke: var(--text-dim);
    stroke-width: 1.6;
  }
  .at-razina.at-ovdje {
    stroke: var(--warn);
    stroke-width: 2.4;
  }
  .at-razina.at-kand {
    stroke: var(--primary);
    stroke-width: 2.6;
  }
  .at-crtica {
    fill: none;
    stroke: var(--border-strong);
    stroke-width: 1;
  }
  .at-crtica.at-kand {
    stroke: var(--primary);
  }
  .at-cip-hit {
    fill: transparent;
  }
  .at-cip-r {
    fill: var(--bg-elev-2);
    stroke: var(--border-strong);
  }
  .at-cip-slob {
    fill: color-mix(in srgb, var(--success) 14%, var(--bg-elev));
    stroke: var(--success);
  }
  .at-cip-t {
    fill: var(--text-dim);
    font: 500 10px var(--font-mono);
  }
  .at-cip-n {
    fill: var(--text);
    font: 700 10.5px var(--font-sans);
  }
  .at-cip.at-aktivan {
    cursor: pointer;
    outline: none;
  }
  .at-cip.at-aktivan:hover .at-cip-r,
  .at-cip.at-aktivan:focus-visible .at-cip-r {
    stroke: var(--primary);
    stroke-width: 1.6;
  }
  .at-cip.at-ovdje .at-cip-r {
    fill: color-mix(in srgb, var(--warn) 22%, var(--bg-elev));
    stroke: var(--warn);
  }
  .at-cip.at-odabrana .at-cip-r {
    fill: color-mix(in srgb, var(--primary) 18%, var(--bg-elev));
    stroke: var(--primary);
  }
  .at-cip.at-kand .at-cip-r {
    stroke: var(--primary);
    stroke-width: 2.2;
  }
  .at-skok {
    stroke: var(--primary);
    stroke-width: 2.4;
  }
  .at-skok-zadano {
    stroke: var(--text-dim);
    stroke-dasharray: 5 3;
  }
  .at-skok-zadnji {
    stroke: var(--text-faint);
    stroke-width: 1.6;
  }
  .at-skok-ok {
    stroke: var(--success);
    stroke-dasharray: none;
  }
  .at-vrh-m {
    fill: var(--text-dim);
  }
  .at-vrh-ok {
    fill: var(--success);
  }
  .at-duh {
    fill: none;
    stroke: var(--warn);
    stroke-width: 1.5;
    stroke-dasharray: 3 3;
  }
  .at-ion {
    stroke: var(--success);
    stroke-width: 2;
    stroke-dasharray: 5 3;
  }
  .at-ion-t {
    fill: var(--success);
    font: 600 11px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .at-sub {
    font-size: 8.5px;
  }
  .at-foton {
    fill: none;
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .at-foton-pod {
    fill: none;
    stroke: color-mix(in srgb, var(--text) 30%, transparent);
    stroke-width: 4.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .at-hit {
    fill: transparent;
  }
  .at-ruc {
    outline: none;
  }
  .at-ruc:focus-visible .at-halo {
    stroke: var(--primary);
    stroke-width: 2.5;
  }
  .at-halo {
    fill: color-mix(in srgb, var(--warn) 22%, transparent);
    stroke: none;
  }
  .at-elektron {
    fill: var(--warn);
    stroke: color-mix(in srgb, var(--text) 55%, var(--warn));
    stroke-width: 1.2;
  }
  .at-e-t {
    fill: #1c1917;
    font: 700 8.5px var(--font-sans);
    pointer-events: none;
  }
  .at-sp-nev {
    fill: color-mix(in srgb, var(--text-faint) 30%, var(--bg-elev));
  }
  .at-sp-okvir {
    fill: none;
    stroke: var(--border-strong);
  }
  .at-sp-linija {
    stroke: var(--text);
    stroke-width: 0.6;
  }
  .at-sp-t,
  .at-sp-lt {
    fill: var(--text-dim);
    font: 500 10px var(--font-sans);
  }
  .at-staza {
    fill: none;
    stroke: var(--border-strong);
    stroke-width: 1.4;
    stroke-dasharray: 4 4;
  }
  .at-staza.at-ovdje {
    stroke: var(--warn);
    stroke-dasharray: none;
    stroke-width: 2;
  }
  .at-staza-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 12;
    cursor: pointer;
    outline: none;
  }
  .at-staza-t {
    fill: var(--text-faint);
    font: 600 10px var(--font-sans);
  }
  .at-jezgra {
    fill: var(--danger);
  }
  .at-jezgra-t {
    fill: #fff;
    font: 700 8px var(--font-sans);
  }
  .at-napomena {
    text-align: center;
    font-size: 11px;
    color: var(--text-faint);
  }
  .at-ocitanje {
    margin-top: 0;
    line-height: 1.5;
    font-family: var(--font-sans);
    font-size: 13.5px;
  }
  .at-boja {
    display: inline-block;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: -1px;
    border: 1px solid var(--border-strong);
  }
  .at-top {
    border: 1px solid var(--border);
    border-radius: var(--r-md, 10px);
    padding: 8px 10px 6px;
    margin-top: 6px;
  }
  .at-top-red {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .at-top-ozn {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-dim);
    white-space: nowrap;
  }
  .at-klizac {
    flex: 1;
    min-width: 0;
    accent-color: var(--primary);
    height: 32px;
  }
  .at-pm {
    min-width: 36px;
    height: 36px;
    padding: 0;
    font-size: 17px;
  }
  .at-top-ocit {
    margin: 4px 0 0;
    font-size: 13.5px;
    font-family: var(--font-sans);
    color: var(--text-dim);
    text-align: center;
  }
  .at-top-ocit b {
    color: var(--text);
  }
  .at-staze-gumbi {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    margin-top: 4px;
  }
  .at-n {
    min-height: 36px;
    padding: 0 10px;
    font-size: 13.5px;
  }
  .at-n-ovdje {
    border-color: var(--warn);
    color: var(--text);
    background: color-mix(in srgb, var(--warn) 16%, transparent);
  }
  .at-akcije:has(button) {
    justify-content: center;
  }
  .at-polja {
    display: grid;
    gap: 8px;
    margin-top: 4px;
  }
  .at-polje {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .at-polje-ozn {
    min-width: 48px;
    text-align: right;
    font-size: 16px;
  }
  .at-inp {
    width: 130px;
    height: var(--lx-control);
    text-align: right;
    font-family: var(--font-mono);
    font-size: 16px;
  }
  .at-polje-kad {
    font-size: 12.5px;
    color: var(--text-faint);
  }
  .at-izbor {
    text-align: center;
    margin: 2px 0 0;
    font-size: 15px;
  }
  .at-ponisti {
    margin-left: 8px;
    font-size: 13px;
  }
  .at-fotoni {
    display: grid;
    gap: 8px;
    margin-top: 4px;
  }
  .at-karta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 12px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-md, 10px);
    background: var(--bg-elev);
  }
  .at-karta-akt {
    border-color: var(--warn);
  }
  .at-karta-e {
    font-size: 15px;
  }
  .at-seg {
    display: inline-flex;
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    overflow: hidden;
  }
  .at-seg-b {
    min-height: 36px;
    min-width: 72px;
    padding: 0 14px;
    font-size: 14px;
    background: transparent;
    color: var(--text-dim);
    border: 0;
    cursor: pointer;
  }
  .at-seg-b + .at-seg-b {
    border-left: 1px solid var(--border-strong);
  }
  .at-seg-b.sel {
    background: color-mix(in srgb, var(--primary) 20%, transparent);
    color: var(--text);
    font-weight: 600;
  }
  .at-seg-b:disabled {
    cursor: default;
  }
  .at-karta-rez {
    flex-basis: 100%;
    margin: 0;
    font-size: 13px;
    color: var(--text-dim);
  }
  .at-uputa {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 8px 0 0;
  }
</style>
