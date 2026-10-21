<script>
  // Harmonijsko titranje: točka s referentnom kružnicom, uteg na opruzi ili njihalo / ljuljačka, živi grafovi s
  // kursorom vremena, graf E_p(x), stupci energije, štoperica i brojač titraja. Sve koordinate, brojke, što je
  // skriveno i provjera dolaze iz katalog/fizika/titranje.js; ova komponenta samo crta, vrti vrijeme i prosljeđuje
  // unos (isti katalog izvršava i iOS aplikacija).
  import { untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Strelica from "./_SileStrelica.svelte";
  import Klizaci from "./_SileKlizaci.svelte";
  import { formatNumber } from "$lib/lesson/core/number.js";
  import {
    pocetneVrijednosti,
    klizaciOd,
    rastaviOznaku,
  } from "$lib/lesson/katalog/fizika/_sile.js";
  import {
    titranje,
    modelTitranja,
    stanjeTitranja,
    stanjeUPolozaju,
    scenaTitranja,
    grafTitranja,
    tockaGrafa,
    grafEnergije,
    stupciEnergije,
    ocitanjaTitranja,
    skrivenoTitranja,
    stoperica,
    opisScene,
    pocetnoStanje,
    otkrivenoStanje,
    trenuciCilja,
    mjerilaTitranja,
    trajanjeTitranja,
    ubrzanjeTitranja,
    opisBrzine,
    korakVremena,
    grafoviTitranja,
    prikaziTitranja,
    strelicePrikaza,
    polozajIzTocke,
    mrezaX,
    korakX,
    analizaX,
    analizaPostavi,
    tocniPolozaji,
    gdjeTrazeno,
    jedinicaStavke,
    oznakaStavke,
    kadStavke,
    tocnoStavke,
    velicineTitranja,
  } from "$lib/lesson/katalog/fizika/titranje.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const S = untrack(() => spec);
  const nacin = S.nacin;
  const istrazi = nacin === "istrazi";
  const xNacin = nacin === "postavi" && S.mijenja === "x";
  const klizacNacin = nacin === "postavi" && !xNacin;
  const ref = mjerilaTitranja(S);
  const tKraj = trajanjeTitranja(S);
  const u0 = ubrzanjeTitranja(S);
  const korakT = korakVremena(S);
  const vrsteGrafova = grafoviTitranja(S);
  const prikazi = prikaziTitranja(S);
  const vrsteStrelica = strelicePrikaza(S);
  const meta = velicineTitranja(S);
  const pocetno = pocetnoStanje(S);
  const BOJA = {
    y: "var(--primary)",
    v: "var(--success)",
    a: "var(--lx-water)",
    F: "var(--lx-water)",
    Ep: "var(--warn)",
    Ek: "var(--success)",
    E: "var(--text-dim)",
  };
  const r1 = (n) => Math.round(n * 10) / 10;
  const uid = Math.random().toString(36).slice(2, 8);

  // ── stanje ──
  let p = $state(pocetneVrijednosti(S));
  let M = $derived(modelTitranja(S, p));
  let t = $state(pocetno.t);
  // položaj u jedinici amplitude kad tijelo stoji na zadanom mjestu (postavi „x“, izracunaj s x); inače null
  let x = $state(pocetno.x);
  let igra = $state(false);
  let sporo = $state(false);
  let tStop = $state(null);

  let otkriveno = $derived(!!(istrazi || pokazi || ishod?.tocno));
  let sk = $derived(skrivenoTitranja(S, otkriveno));
  let zakljucano = $derived(locked || !!ishod?.tocno || pokazi);
  let st = $derived(
    x != null ? stanjeUPolozaju(M, x * M.fA) : stanjeTitranja(M, t),
  );
  let sc = $derived(
    scenaTitranja(S, M, st, {
      ref,
      vrste: sk.strelice ? [] : vrsteStrelica,
      // „pokaži“: mete ostaju, s označenim točnim položajima
      mete: nacin === "odaberi_polozaj" && (!otkriveno || pokazi),
    }),
  );
  // u „odaberi“ prije odgovora očitanja nemaju smisla (sve bi bilo „?“)
  let stavke = $derived(
    (nacin === "odaberi_polozaj" || nacin === "izracunaj") && !otkriveno
      ? []
      : ocitanjaTitranja(S, M, st, sk.brojaci),
  );
  // desni stupac: grafovi, štoperica ili napomena da su grafovi skriveni (samo „postavi“)
  let desno = $derived(
    grafovi.length > 0 ||
      (imaStopericu && x == null) ||
      (sk.grafovi && klizacNacin && vrsteGrafova.length > 0),
  );
  let opis = $derived(opisScene(S, M, st, sk.brojaci));
  // vrijeme se vrti tamo gdje to nije odgovor: istraživanje, zaustavi, postavi klizačem i sve nakon otkrivanja
  let vrijeme = $derived(
    istrazi || nacin === "zaustavi" || klizacNacin || otkriveno,
  );
  let ubrzanje = $derived(u0 * (sporo ? 0.25 : 1));

  // ── animacija ──
  $effect(() => {
    if (!igra) return;
    let zadnje = performance.now();
    let id;
    const korak = (sad) => {
      const dt = Math.min(0.1, (sad - zadnje) / 1000);
      zadnje = sad;
      let nt = untrack(() => t) + dt * untrack(() => ubrzanje);
      const stop = untrack(() => tStop);
      if (stop != null && nt >= stop) {
        t = stop;
        tStop = null;
        igra = false;
        return;
      }
      if (nt >= tKraj) {
        // istraživanje se vrti u krug; zaustavi i štoperica stanu na kraju osi
        if (istrazi || (otkriveno && nacin !== "zaustavi" && !klizacNacin))
          nt = 0;
        else {
          t = tKraj;
          igra = false;
          return;
        }
      }
      t = nt;
      id = requestAnimationFrame(korak);
    };
    id = requestAnimationFrame(korak);
    return () => cancelAnimationFrame(id);
  });
  // istraživanje krene samo (osim uz smanjeno kretanje)
  $effect(() => {
    if (istrazi && !prefersReducedMotion.current) untrack(() => (igra = true));
  });
  function pokreni() {
    x = null;
    if (t >= tKraj - 1e-9) t = 0;
    igra = true;
  }
  const pauziraj = () => (igra = false);
  function ispocetka() {
    igra = false;
    tStop = null;
    t = 0;
  }
  function pomakniT(d) {
    igra = false;
    t = Math.min(tKraj, Math.max(0, Math.round((t + d) / korakT) * korakT));
  }
  function pustiDo(cilj) {
    x = null;
    t = 0;
    if (prefersReducedMotion.current) {
      t = cilj;
      return;
    }
    tStop = cilj;
    igra = true;
  }
  // novi klizač: vrijeme od početka (štoperica mjeri ispočetka)
  let prviKlizac = true;
  $effect(() => {
    void p;
    untrack(() => {
      if (prviKlizac) return (prviKlizac = false);
      t = 0;
      if (klizacNacin) igra = false;
    });
  });
  const fmtT = (n) =>
    formatNumber(Math.round(n * 1000) / 1000, korakT < 0.1 ? 2 : 1);

  // ── grafovi ──
  const hGrafa = vrsteGrafova.length > 1 ? 92 : 112;
  let grafovi = $derived(
    sk.grafovi
      ? []
      : vrsteGrafova.map((v) =>
          grafTitranja(S, M, v, tKraj, { ref, visina: hGrafa }),
        ),
  );
  const tocke = (niz) => niz.map(([a, b]) => `${a},${b}`).join(" ");
  function doKursora(g, krivulja) {
    const i = Math.min(g.N, Math.floor((t / tKraj) * g.N + 1e-9));
    const pts = krivulja.tocke.slice(0, i + 1);
    pts.push(tockaGrafa(S, M, g, krivulja.kljuc, t, ref));
    return tocke(pts);
  }
  const markerT = untrack(() => otkrivenoStanje(S).t);
  let vuceGraf = null;
  function tIzDogadaja(e, svg) {
    const m = svg?.getScreenCTM();
    if (!m) return;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const g = grafovi[0];
    const tt = ((q.x - g.okvir.x0) / (g.okvir.x1 - g.okvir.x0)) * tKraj;
    t = Math.min(tKraj, Math.max(0, Math.round(tt / korakT) * korakT));
  }
  function grafDolje(e) {
    if (!vrijeme || zakljucanoVrijeme || e.button > 0) return;
    igra = false;
    tStop = null;
    x = null;
    vuceGraf = e.currentTarget;
    vuceGraf.setPointerCapture?.(e.pointerId);
    tIzDogadaja(e, vuceGraf);
  }
  const grafPomak = (e) => vuceGraf && tIzDogadaja(e, vuceGraf);
  const grafGore = () => (vuceGraf = null);
  // nakon odgovora u „zaustavi“ vrijeme stoji na odgovoru
  let zakljucanoVrijeme = $derived(
    nacin === "zaustavi" && zakljucano && !pokazi,
  );

  // ── energija ──
  const imaEpx = prikazi.includes("Ep-x");
  const imaStupce = prikazi.includes("stupci");
  let energija = $derived(
    imaEpx && !sk.energija
      ? grafEnergije(S, M, st.y, { ref, skrijStanje: sk.energijaStanje })
      : null,
  );
  let stupci = $derived(
    imaStupce && !sk.energija
      ? stupciEnergije(M, st, { ref, skrijStanje: sk.energijaStanje })
      : null,
  );
  const imaStopericu =
    prikazi.includes("stoperica") || prikazi.includes("brojac_titraja");
  let sat = $derived(stoperica(S, M, t));

  // ── odaberi položaj ──
  const pitanja = S.pitanja ?? [];
  let odabir = $state(pitanja.map(() => []));
  let aktivno = $state(0);
  function dodirni(u) {
    if (zakljucano) return;
    const a = odabir[aktivno];
    odabir[aktivno] = a.some((q) => Math.abs(q - u) < 1e-9)
      ? a.filter((q) => Math.abs(q - u) > 1e-9)
      : [...a, u].sort((m, n) => m - n);
  }
  const odabranoU = (u) =>
    pitanja
      .map((_, i) => i)
      .filter((i) => odabir[i].some((q) => Math.abs(q - u) < 1e-9));

  // ── postavi: vučenje tijela ──
  const mreza = xNacin ? mrezaX(S) : [];
  const kx = xNacin ? korakX(S) : 0;
  let svgEl = $state();
  let vuce = false;
  let pomaknuto = $state(false);
  function snap(v) {
    const n = Math.round(v / kx);
    const q = Number((n * kx).toPrecision(12));
    return Math.max(mreza[0], Math.min(mreza.at(-1), q));
  }
  function tijeloDolje(e) {
    if (!xNacin || zakljucano) return;
    e.preventDefault();
    vuce = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function tijeloPomak(e) {
    if (!vuce) return;
    const m = svgEl?.getScreenCTM();
    if (!m) return;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    x = snap(polozajIzTocke(S, ref, q.x, q.y) / M.fA);
    pomaknuto = true;
  }
  const tijeloGore = () => (vuce = false);
  function tijeloTipka(e) {
    if (!xNacin || zakljucano) return;
    const d = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
    }[e.key];
    if (!d) return;
    e.preventDefault();
    x = snap((x ?? 0) + d * kx);
    pomaknuto = true;
  }
  const ozX = meta.y.oznaka;

  // ── izracunaj ──
  const pitaj = S.pitaj ?? [];
  let unosi = $state(pitaj.map(() => ""));
  // „u t = 0,2 s“ jednom iznad polja kad vrijedi za sva polja
  const kadovi = pitaj.map((it) => kadStavke(S, it));
  const kadZajedno =
    kadovi.length > 1 && kadovi.every((k) => k && k === kadovi[0])
      ? kadovi[0]
      : "";
  const predznak = (it) => ["y", "v", "a", "F"].includes(it.velicina);
  function promijeniPredznak(i) {
    const v = unosi[i].trim();
    unosi[i] = /^[-−]/.test(v) ? v.replace(/^[-−]\s*/, "") : `−${v}`;
  }
  // polja se označe tek kad je cijeli odgovor točan ili otkriven: zaključana kopija pitanja nakon krivog
  // odgovora ne smije pokazati koje je polje bilo dobro (suzilo bi ponovni pokušaj)
  const poljaOk = $derived(pokazi || !!ishod?.tocno);

  // ── provjera ──
  function trenutniOdgovor() {
    if (nacin === "zaustavi") return Math.round(t * 1e4) / 1e4;
    if (nacin === "odaberi_polozaj") return odabir.map((a) => [...a]);
    if (xNacin) return { x };
    if (klizacNacin) return { ...p };
    return [...unosi];
  }
  function provjeri() {
    if (zakljucano) return;
    igra = false;
    onodgovor(trenutniOdgovor());
  }

  // ── pokaži točan odgovor u samom widgetu ──
  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      igra = false;
      if (nacin === "zaustavi") t = trenuciCilja(S)[0] ?? 0;
      else if (nacin === "odaberi_polozaj")
        odabir = pitanja.map((q) => tocniPolozaji(S, q.trazi));
      else if (xNacin) {
        const a = analizaX(S);
        x = a.tocni.find((q) => q > 0) ?? a.tocni[0];
      } else if (klizacNacin) {
        const a = analizaPostavi(S);
        p = { ...p, [a.k.id]: a.best };
      } else if (nacin === "izracunaj")
        unosi = pitaj.map((it) =>
          formatNumber(Number(tocnoStavke(S, it).toPrecision(3))),
        );
    });
  });
  // kad se odgovor otkrije, titranje oživi
  let biloOtkriveno = untrack(() => otkriveno);
  $effect(() => {
    if (!otkriveno || biloOtkriveno) return;
    biloOtkriveno = true;
    untrack(() => {
      if (nacin === "izracunaj") {
        const o = otkrivenoStanje(S);
        if (o.t != null && o.t > 0) pustiDo(o.t);
        else if (x == null && !prefersReducedMotion.current) pokreni();
      } else if (
        nacin === "odaberi_polozaj" &&
        !pokazi &&
        !prefersReducedMotion.current
      )
        pokreni();
    });
  });

  // ── tekstovi ──
  const uputa = {
    zaustavi:
      "Pusti titranje, zaustavi ga u pravom trenutku (fino: gumbi ±) i pritisni Provjeri.",
    odaberi_polozaj:
      pitanja.length > 1
        ? "Odaberi pitanje, pa dodirni sve položaje koji vrijede. Zatim Provjeri."
        : "Dodirni sve položaje koji vrijede, pa Provjeri.",
    postavi: xNacin
      ? `Povuci ${S.scena === "opruga" ? "uteg" : "tijelo"} na pravo mjesto, pa Provjeri.`
      : "Namjesti klizač, pusti titranje i provjeri mjerenjem. Zatim Provjeri.",
    izracunaj:
      "Upiši rezultate (decimalni zarez je u redu) i pritisni Provjeri.",
  }[nacin];
  const BOJE_PITANJA = ["var(--primary)", "var(--warn)", "var(--success)"];
  const tocan = $derived(pokazi ? titranje.tocanOdgovor(S) : "");
  const ozn = (o) => rastaviOznaku(o);
  const veliko = (t) => t.charAt(0).toUpperCase() + t.slice(1);
</script>

<div class="tt">
  {#if istrazi}
    <div class="tt-tekst"><Md text={S.tekst} /></div>
  {:else}
    <div class="lx-question"><Md text={S.tekst} /></div>
  {/if}

  {#if nacin === "odaberi_polozaj" && pitanja.length > 1 && (!otkriveno || pokazi)}
    <div class="tt-pitanja" role="radiogroup" aria-label="Pitanje">
      {#each pitanja as q, i (q.trazi)}
        <button
          type="button"
          class="tt-pit"
          class:on={aktivno === i}
          style:--c={BOJE_PITANJA[i]}
          role="radio"
          aria-checked={aktivno === i}
          onclick={() => (aktivno = i)}
          disabled={zakljucano && !pokazi}
        >
          <span class="tt-pit-br">{i + 1}</span>
          <span>{gdjeTrazeno(S, q.trazi)}</span>
          <span class="tt-pit-n">{odabir[i].length || ""}</span>
        </button>
      {/each}
    </div>
  {:else if nacin === "odaberi_polozaj" && (!otkriveno || pokazi)}
    <p class="tt-uputa">{veliko(gdjeTrazeno(S, pitanja[0].trazi))}?</p>
  {/if}

  <div class="tt-glavno" class:dvostupac={desno}>
    <div class="tt-scena-stup">
      <figure class="lx-figure tt-scena">
        <svg
          bind:this={svgEl}
          viewBox="0 0 {sc.sirina} {sc.visina}"
          role="img"
          aria-label={opis}
        >
          <!-- podloga: strop, zid, okvir ljuljačke -->
          {#if sc.podloga}
            {#if sc.podloga.okvir}
              {#each sc.podloga.okvir as l, i (i)}
                <line
                  class="tt-okvir"
                  x1={l[0]}
                  y1={l[1]}
                  x2={l[2]}
                  y2={l[3]}
                />
              {/each}
            {/if}
            <rect
              class="tt-podloga"
              x={sc.podloga.x}
              y={sc.podloga.y}
              width={sc.podloga.w}
              height={sc.podloga.h}
            />
            {#each sc.podloga.crte as l, i (i)}
              <line class="tt-sraf" x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} />
            {/each}
            {#if sc.podloga.pod}
              <line
                class="tt-pod"
                x1={sc.podloga.pod.x1}
                y1={sc.podloga.pod.y}
                x2={sc.podloga.pod.x2}
                y2={sc.podloga.pod.y}
              />
            {/if}
          {/if}

          <!-- crte +A, 0, −A -->
          {#each sc.crte as c, i (i)}
            <line
              class="tt-crta"
              class:ravn={c.ravnoteza}
              class:kv={c.kvacica}
              x1={c.x1}
              y1={c.y1 ?? c.y}
              x2={c.x2}
              y2={c.y2 ?? c.y}
            />
            {#if c.oznaka}
              <text
                class="tt-crta-t"
                x={c.lx}
                y={c.ly ?? c.y + 4}
                text-anchor={c.anchor}>{c.oznaka}</text
              >
            {/if}
          {/each}
          {#if sc.luk}
            <path class="tt-luk" d={sc.luk} />
          {/if}

          <!-- os i referentna kružnica -->
          {#if sc.os}
            <line
              class="tt-os"
              x1={sc.os.x1}
              y1={sc.os.y1}
              x2={sc.os.x2}
              y2={sc.os.y2}
              marker-end="url(#tt-vrh-{uid})"
            />
            <text
              class="tt-os-t"
              x={sc.os.x2 - 10}
              y={sc.os.y2 + 8}
              text-anchor="end">{sc.os.oznaka}</text
            >
          {/if}
          {#if sc.kruznica}
            {@const k = sc.kruznica}
            <circle class="tt-kr" cx={k.cx} cy={k.cy} r={k.r} />
            <line
              class="tt-kr-os"
              x1={k.cx - k.r - 6}
              y1={k.cy}
              x2={k.cx + k.r + 6}
              y2={k.cy}
            />
            {#if k.luk}<path class="tt-kr-kut" d={k.luk} />{/if}
            <line class="tt-kr-r" x1={k.cx} y1={k.cy} x2={k.kx} y2={k.ky} />
            <line
              class="tt-proj"
              x1={k.kx}
              y1={k.ky}
              x2={sc.tijelo.x}
              y2={sc.tijelo.y}
            />
            <circle class="tt-kr-t" cx={k.kx} cy={k.ky} r="5" />
            <circle class="tt-kr-c" cx={k.cx} cy={k.cy} r="2.5" />
            <text class="tt-kr-tekst" x="6" y="14">{k.tekst}</text>
          {/if}

          <!-- opruga ili nit -->
          {#if sc.opruga}
            <polyline class="tt-opruga" points={sc.opruga} />
          {/if}
          {#if sc.nit && sc.tijelo.oblik !== "ljuljacka"}
            <line
              class="tt-nit"
              x1={sc.nit.x1}
              y1={sc.nit.y1}
              x2={sc.nit.x2}
              y2={sc.nit.y2}
            />
            <circle class="tt-objesiste" cx={sc.nit.x1} cy={sc.nit.y1} r="3" />
          {/if}

          <!-- tijelo -->
          <g
            class="tt-tijelo"
            class:blijedo={nacin === "odaberi_polozaj" &&
              (!otkriveno || pokazi)}
          >
            {#if sc.tijelo.oblik === "tocka"}
              <circle
                class="tt-tocka"
                cx={sc.tijelo.x}
                cy={sc.tijelo.y}
                r="9"
              />
            {:else if sc.tijelo.oblik === "uteg"}
              <rect
                class="tt-uteg"
                x={sc.tijelo.x - 20}
                y={sc.tijelo.y - 17}
                width="40"
                height="34"
                rx="5"
              />
              <text
                class="tt-uteg-t"
                x={sc.tijelo.x}
                y={sc.tijelo.y + 5}
                text-anchor="middle">m</text
              >
            {:else if sc.tijelo.oblik === "kuglica"}
              <circle
                class="tt-kuglica"
                cx={sc.tijelo.x}
                cy={sc.tijelo.y}
                r="13"
              />
              <circle
                class="tt-sjaj"
                cx={sc.tijelo.x - 4}
                cy={sc.tijelo.y - 4}
                r="3.5"
              />
            {:else}
              <g
                transform="translate({sc.nit.x1} {sc.nit.y1}) rotate({r1(
                  -sc.tijelo.kut,
                )})"
              >
                <line
                  class="tt-nit"
                  x1="-3"
                  y1="0"
                  x2="-11"
                  y2={sc.nit.duljina}
                />
                <line
                  class="tt-nit"
                  x1="3"
                  y1="0"
                  x2="11"
                  y2={sc.nit.duljina}
                />
                <rect
                  class="tt-sjedalo"
                  x="-17"
                  y={sc.nit.duljina - 1}
                  width="34"
                  height="6"
                  rx="2"
                />
                <g class="tt-dijete">
                  <path d="M0,{sc.nit.duljina - 2} L-1,{sc.nit.duljina - 24}" />
                  <path
                    d="M-1,{sc.nit.duljina - 18} L-10,{sc.nit.duljina - 22}"
                  />
                  <path
                    d="M0,{sc.nit.duljina - 2} L13,{sc.nit.duljina} L15,{sc.nit
                      .duljina + 16}"
                  />
                  <circle
                    class="tt-glava"
                    cx="-1"
                    cy={sc.nit.duljina - 32}
                    r="7"
                  />
                </g>
              </g>
              <circle
                class="tt-objesiste"
                cx={sc.nit.x1}
                cy={sc.nit.y1}
                r="3"
              />
            {/if}
          </g>

          <!-- strelice v i a/F -->
          {#each sc.strelice as s (s.vrsta)}
            <Strelica
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              boja={BOJA[s.vrsta]}
              oznaka={s.oznaka}
              sirina={2.4}
              glava={8}
              oznakaOdmak={11}
            />
          {/each}

          <!-- postavi: tijelo se vuče -->
          {#if xNacin && !zakljucano}
            <g
              class="lx-handle tt-ruc"
              role="slider"
              tabindex="0"
              aria-label="Položaj tijela: povuci ili koristi strelice"
              aria-valuemin={mreza[0]}
              aria-valuemax={mreza.at(-1)}
              aria-valuenow={x ?? 0}
              aria-valuetext="{ozX} = {formatNumber(x ?? 0)} {M.jedA}"
              onpointerdown={tijeloDolje}
              onpointermove={tijeloPomak}
              onpointerup={tijeloGore}
              onpointercancel={tijeloGore}
              onkeydown={tijeloTipka}
            >
              <circle class="tt-hit" cx={sc.tijelo.x} cy={sc.tijelo.y} r="30" />
              <circle
                class="tt-prsten"
                class:ceka={!pomaknuto}
                cx={sc.tijelo.x}
                cy={sc.tijelo.y}
                r="24"
              />
            </g>
          {/if}

          <!-- odaberi: mete -->
          {#each sc.mete as m (m.udio)}
            {@const odabrano = odabranoU(m.udio)}
            {@const moje = odabrano.includes(aktivno)}
            <g
              class="tt-meta"
              class:on={moje}
              style:--c={BOJE_PITANJA[aktivno]}
              role="button"
              tabindex={zakljucano ? -1 : 0}
              aria-pressed={moje}
              aria-label="Položaj {m.oznaka}"
              onclick={() => dodirni(m.udio)}
              onkeydown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  dodirni(m.udio);
                }
              }}
            >
              <circle class="tt-hit" cx={m.x} cy={m.y} r={m.r + 6} />
              <circle class="tt-meta-k" cx={m.x} cy={m.y} r={m.r} />
              {#if moje}
                <path class="tt-meta-v" d="M{m.x - 5},{m.y} l3.5,3.5 l6.5,-7" />
              {/if}
              {#each odabrano.filter((i) => i !== aktivno) as i, j (i)}
                <circle
                  class="tt-meta-b"
                  style:--b={BOJE_PITANJA[i]}
                  cx={m.x + 10 + j * 9}
                  cy={m.y - 10}
                  r="4.5"
                />
              {/each}
              <text class="tt-meta-t" x={m.lx} y={m.ly} text-anchor={m.anchor}
                >{m.oznaka}</text
              >
            </g>
          {/each}

          <defs>
            <marker
              id="tt-vrh-{uid}"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" class="tt-vrh" />
            </marker>
          </defs>
        </svg>
        {#if S.scena === "njihalo" && !prefersReducedMotion.current}
          <figcaption class="tt-napomena">
            kut otklona na crtežu je povećan
          </figcaption>
        {/if}
      </figure>

      {#if energija || stupci}
        <div class="tt-energija">
          {#if energija}
            {@const e = energija}
            <figure class="lx-figure tt-epx">
              <svg
                viewBox="0 0 {e.sirina} {e.visina}"
                role="img"
                aria-label="Graf potencijalne energije o elongaciji: parabola, a vodoravna crta je ukupna energija."
              >
                {#each e.yTicks as q, i (i)}
                  <line
                    class="tt-mreza"
                    x1={e.os.xOs}
                    y1={q.y}
                    x2={e.os.x1}
                    y2={q.y}
                  />
                  <text
                    class="tt-tick"
                    x={e.os.xOs - 5}
                    y={q.y + 4}
                    text-anchor="end">{q.tekst}</text
                  >
                {/each}
                {#each e.xTicks as q, i (i)}
                  <line
                    class="tt-mreza"
                    x1={q.x}
                    y1={e.os.yTop}
                    x2={q.x}
                    y2={e.os.y}
                  />
                  <text
                    class="tt-tick"
                    x={q.x}
                    y={e.os.y + 14}
                    text-anchor="middle">{q.tekst}</text
                  >
                {/each}
                <line
                  class="tt-osg"
                  x1={e.os.xOs}
                  y1={e.os.y}
                  x2={e.os.x1}
                  y2={e.os.y}
                />
                <line
                  class="tt-osg"
                  x1={e.os.xOs}
                  y1={e.os.y}
                  x2={e.os.xOs}
                  y2={e.os.yTop}
                />
                <text
                  class="tt-tick tt-osi"
                  x={e.os.xOs - 5}
                  y={e.os.yTop - 2}
                  text-anchor="end">E (J)</text
                >
                <text
                  class="tt-tick tt-osi"
                  x={e.os.x1}
                  y={e.os.y + 14}
                  text-anchor="end">{e.oznakaX}</text
                >
                <line
                  class="tt-Euk"
                  x1={e.E.x1}
                  y1={e.E.y}
                  x2={e.E.x2}
                  y2={e.E.y}
                />
                <polyline class="tt-parabola" points={e.parabola} />
                {#if e.tocka}
                  <line
                    class="tt-Ek"
                    x1={e.tocka.x}
                    y1={e.tocka.y}
                    x2={e.tocka.x}
                    y2={e.E.y}
                  />
                  <circle class="tt-ep-t" cx={e.tocka.x} cy={e.tocka.y} r="5" />
                {/if}
                <text
                  class="tt-leg"
                  x={e.E.x2 + 4}
                  y={e.E.y - 4}
                  text-anchor="end">E</text
                >
              </svg>
            </figure>
          {/if}
          {#if stupci}
            <figure class="lx-figure tt-stupci">
              <svg
                viewBox="0 0 128 132"
                role="img"
                aria-label="Stupci energije: potencijalna, kinetička i ukupna."
              >
                <line
                  class="tt-osg"
                  x1="6"
                  y1={stupci[0].dno}
                  x2="124"
                  y2={stupci[0].dno}
                />
                {#each stupci as b (b.kljuc)}
                  <rect
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={b.h}
                    rx="3"
                    fill={BOJA[b.kljuc]}
                    class="tt-stupac"
                  />
                  {#if b.skriven}
                    <text
                      class="tt-st-v"
                      x={b.x + b.w / 2}
                      y={b.dno - 6}
                      text-anchor="middle">?</text
                    >
                  {:else if !sk.energijaBrojevi}
                    <text
                      class="tt-st-v"
                      x={b.x + b.w / 2}
                      y={b.y - 4}
                      text-anchor="middle">{b.tekst.replace(" J", "")}</text
                    >
                  {/if}
                  {@const o = ozn(b.oznaka)}
                  <text
                    class="tt-st-o"
                    x={b.x + b.w / 2}
                    y={b.dno + 16}
                    text-anchor="middle"
                    >{o.osnova}{#if o.indeks}<tspan dy="3" font-size="9"
                        >{o.indeks}</tspan
                      >{/if}</text
                  >
                {/each}
              </svg>
            </figure>
          {/if}
        </div>
      {/if}
    </div>

    {#if desno}
      <div class="tt-desno">
        {#if imaStopericu && x == null}
          <div class="tt-sat" aria-label="Štoperica">
            {#if prikazi.includes("stoperica")}
              <span class="tt-sat-i">
                <svg viewBox="0 0 16 16" aria-hidden="true"
                  ><circle cx="8" cy="9" r="5.5" /><path
                    d="M8 9V6M6.5 2h3M12.5 4.5l1-1"
                  /></svg
                >
                <b class="mono">{sat.vrijeme}</b>
              </span>
            {/if}
            {#if prikazi.includes("brojac_titraja")}
              <span class="tt-sat-i">
                <span class="tt-sat-n">titraja</span>
                {#key sat.titraja}<b class="mono tt-blic">{sat.titraja}</b
                  >{/key}
              </span>
            {/if}
          </div>
        {/if}
        {#if sk.grafovi && klizacNacin && vrsteGrafova.length}
          <p class="tt-skriveno">Grafovi se otkriju nakon provjere.</p>
        {/if}
        {#each grafovi as g (g.vrsta)}
          <div class="lx-figure tt-graf">
            <svg
              viewBox="0 0 {g.sirina} {g.visina}"
              role="img"
              aria-label="Graf {g.oznaka} o vremenu{vrijeme
                ? '. Povuci po grafu za premotavanje.'
                : ''}"
              class:scrub={vrijeme && !zakljucanoVrijeme}
              onpointerdown={grafDolje}
              onpointermove={grafPomak}
              onpointerup={grafGore}
              onpointercancel={grafGore}
            >
              {#each g.tTicks as q (q.x)}
                <line
                  class="tt-mreza"
                  x1={q.x}
                  y1={g.okvir.y0}
                  x2={q.x}
                  y2={g.okvir.y1}
                />
                <text
                  class="tt-tick"
                  x={q.x}
                  y={g.okvir.y1 + 14}
                  text-anchor="middle">{q.tekst}</text
                >
              {/each}
              {#each g.yTicks as q (q.y)}
                <line
                  class="tt-mreza"
                  x1={g.okvir.x0}
                  y1={q.y}
                  x2={g.okvir.x1}
                  y2={q.y}
                />
                <text
                  class="tt-tick"
                  x={g.okvir.x0 - 5}
                  y={q.y + 4}
                  text-anchor="end"
                  >{sk.grafoviPrazni && q.tekst !== "0" ? "" : q.tekst}</text
                >
              {/each}
              <line
                class="tt-osg"
                x1={g.okvir.x0}
                y1={g.okvir.nula}
                x2={g.okvir.x1}
                y2={g.okvir.nula}
              />
              <line
                class="tt-osg"
                x1={g.okvir.x0}
                y1={g.okvir.y0}
                x2={g.okvir.x0}
                y2={g.okvir.y1}
              />
              <text class="tt-tick tt-osi" x={g.okvir.x0 + 4} y={g.okvir.y0 - 4}
                >{g.oznaka}</text
              >
              <text
                class="tt-tick tt-osi"
                x={g.okvir.x1}
                y={g.okvir.y1 + 14}
                text-anchor="end">t (s)</text
              >
              {#if sk.grafoviPrazni}
                {#if markerT > 0}
                  {@const mx = r1(
                    g.okvir.x0 + ((g.okvir.x1 - g.okvir.x0) * markerT) / tKraj,
                  )}
                  <line
                    class="tt-marker"
                    x1={mx}
                    y1={g.okvir.y0}
                    x2={mx}
                    y2={g.okvir.y1}
                  />
                  <text
                    class="tt-tick tt-marker-t"
                    x={mx + 3}
                    y={g.okvir.y0 + 8}>t = {formatNumber(markerT)} s</text
                  >
                {/if}
              {:else}
                {#each g.krivulje as k (k.kljuc)}
                  {#if sk.sjena}
                    <polyline
                      class="tt-krivulja sjena"
                      style:--c={BOJA[k.kljuc]}
                      points={tocke(k.tocke)}
                    />
                  {/if}
                  {#if x == null}
                    <polyline
                      class="tt-krivulja"
                      style:--c={BOJA[k.kljuc]}
                      points={doKursora(g, k)}
                    />
                  {/if}
                {/each}
                {#if x == null}
                  {@const kx0 = r1(
                    g.okvir.x0 + ((g.okvir.x1 - g.okvir.x0) * t) / tKraj,
                  )}
                  <line
                    class="tt-kursor"
                    x1={kx0}
                    y1={g.okvir.y0}
                    x2={kx0}
                    y2={g.okvir.y1}
                  />
                  {#each g.krivulje as k (k.kljuc)}
                    {@const q = tockaGrafa(S, M, g, k.kljuc, t, ref)}
                    <circle
                      class="tt-kursor-t"
                      style:--c={BOJA[k.kljuc]}
                      cx={q[0]}
                      cy={q[1]}
                      r="3.6"
                    />
                  {/each}
                {/if}
                {#if g.vrsta === "E-t"}
                  <text
                    class="tt-leg"
                    x={g.okvir.x1}
                    y={g.okvir.y0 - 4}
                    text-anchor="end"
                    ><tspan fill="var(--warn)"
                      >E<tspan font-size="8" dy="2">p</tspan></tspan
                    ><tspan dy="-2"> </tspan><tspan fill="var(--success)"
                      >E<tspan font-size="8" dy="2">k</tspan></tspan
                    ><tspan dy="-2"> E</tspan></text
                  >
                {/if}
              {/if}
            </svg>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- očitanja -->
  {#if stavke.length}
    <div class="tt-brojaci">
      {#each stavke as b (b.kljuc)}
        {@const o = ozn(b.oznaka)}
        <span class="tt-br" title={b.naziv}>
          <span class="tt-br-ime" style:color={b.skriveno ? null : BOJA[b.boja]}
            ><i>{o.osnova}</i>{#if o.indeks}<sub>{o.indeks}</sub>{/if}</span
          >
          <b class="mono" class:skr={b.skriveno}>{b.tekst}</b>
        </span>
      {/each}
    </div>
  {/if}
  <p class="sr-only" aria-live="polite">{igra ? "" : opis}</p>

  <!-- vrijeme -->
  {#if vrijeme}
    <div class="tt-kontrole">
      {#if igra}
        <button type="button" class="btn btn-ghost tt-gumb" onclick={pauziraj}>
          <svg viewBox="0 0 16 16" aria-hidden="true"
            ><path d="M5 3v10M11 3v10" /></svg
          >{nacin === "zaustavi" ? "Zaustavi" : "Pauza"}
        </button>
      {:else}
        <button
          type="button"
          class="btn btn-ghost tt-gumb"
          onclick={pokreni}
          disabled={zakljucanoVrijeme}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"
            ><path class="puno" d="M5 3l8 5-8 5z" /></svg
          >{t > 0 && t < tKraj - 1e-9 && x == null ? "Nastavi" : "Pusti"}
        </button>
      {/if}
      <button
        type="button"
        class="btn btn-quiet tt-gumb tt-ikona"
        onclick={ispocetka}
        disabled={zakljucanoVrijeme}
        aria-label="Ispočetka"
        title="Ispočetka"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"
          ><path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.5 2.5v3h3" /></svg
        >
      </button>
      <div class="tt-vrijeme">
        <input
          type="range"
          min="0"
          max={tKraj}
          step={korakT}
          value={t}
          disabled={zakljucanoVrijeme}
          oninput={(e) => {
            igra = false;
            tStop = null;
            x = null;
            t = Number(e.currentTarget.value);
          }}
          aria-label="Vrijeme"
          aria-valuetext="{fmtT(t)} sekundi"
        />
        <div class="tt-vrijeme-red">
          <output class="mono tt-t">t = {fmtT(t)} s</output>
          <span class="tt-brzina">{opisBrzine(ubrzanje)}</span>
          {#if istrazi || otkriveno}
            <label class="tt-sporo"
              ><input type="checkbox" bind:checked={sporo} /> sporije ×¼</label
            >
          {/if}
        </div>
      </div>
    </div>
    {#if nacin === "zaustavi" && !zakljucanoVrijeme}
      <div class="tt-fino">
        <button
          type="button"
          class="btn btn-quiet"
          onclick={() => pomakniT(-korakT)}
          aria-label="Malo unatrag">−{formatNumber(korakT)} s</button
        >
        <button
          type="button"
          class="btn btn-quiet"
          onclick={() => pomakniT(korakT)}
          aria-label="Malo naprijed">+{formatNumber(korakT)} s</button
        >
      </div>
    {/if}
  {/if}

  <!-- klizači -->
  {#if klizaciOd(S).length}
    <Klizaci
      klizaci={S.klizaci}
      bind:vrijednosti={p}
      disabled={klizacNacin && zakljucano}
    />
  {/if}

  <!-- postavi x: fino pomicanje -->
  {#if xNacin && !zakljucano}
    <div class="tt-fino">
      <button
        type="button"
        class="btn btn-quiet"
        onclick={() => ((x = snap((x ?? 0) - kx)), (pomaknuto = true))}
        aria-label="Pomakni lijevo">−{formatNumber(kx)} {M.jedA}</button
      >
      <button
        type="button"
        class="btn btn-quiet"
        onclick={() => ((x = snap((x ?? 0) + kx)), (pomaknuto = true))}
        aria-label="Pomakni desno">+{formatNumber(kx)} {M.jedA}</button
      >
    </div>
  {/if}

  <!-- izracunaj -->
  {#if nacin === "izracunaj"}
    <div class="tt-polja">
      {#if kadZajedno}<p class="tt-kad tt-kad-z">
          Stanje {kadZajedno}:
        </p>{/if}
      {#each pitaj as it, i (i)}
        <div class="tt-polje">
          <label class="tt-polje-ozn" for="tt-{uid}-{i}">
            <Md text={oznakaStavke(S, it)} inline /> =
          </label>
          <input
            id="tt-{uid}-{i}"
            class="inp tt-inp"
            class:ok={poljaOk}
            inputmode="decimal"
            autocomplete="off"
            placeholder="?"
            disabled={zakljucano}
            bind:value={unosi[i]}
            onkeydown={(e) => e.key === "Enter" && provjeri()}
          />
          <span class="lx-unit">{jedinicaStavke(S, it)}</span>
          {#if predznak(it) && !zakljucano}
            <button
              type="button"
              class="btn btn-quiet tt-pm"
              onclick={() => promijeniPredznak(i)}
              aria-label="Promijeni predznak">±</button
            >
          {/if}
          {#if kadovi[i] && !kadZajedno}<span class="tt-kad">{kadovi[i]}</span
            >{/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if !istrazi}
    {#if !zakljucano}<p class="tt-uputa">{uputa}</p>{/if}
    <div class="lx-actions tt-akcije">
      <button
        type="button"
        class="btn btn-primary"
        onclick={provjeri}
        disabled={zakljucano ||
          (nacin === "izracunaj" && unosi.every((u) => !u.trim()))}
        >Provjeri</button
      >
    </div>
    {#if tocan}
      <p class="lx-solution">Točno: {tocan}</p>
    {/if}
  {/if}
</div>

<style>
  .tt {
    container-type: inline-size;
  }
  .tt-tekst {
    margin-bottom: 10px;
  }
  .tt-glavno {
    display: grid;
    gap: 4px 14px;
    justify-items: center;
  }
  .tt-glavno > * {
    width: 100%;
    min-width: 0;
  }
  @container (min-width: 600px) {
    .tt-glavno.dvostupac {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
    }
  }
  .tt-scena {
    max-width: 340px;
    margin-bottom: 2px;
  }
  .tt-scena svg {
    touch-action: manipulation;
  }
  .tt-napomena {
    text-align: right;
    font-size: 11px;
    color: var(--text-faint);
    margin-top: -2px;
  }
  .tt-energija {
    display: flex;
    gap: 6px;
    justify-content: center;
    align-items: flex-end;
    max-width: 440px;
    margin: 0 auto;
  }
  .tt-epx {
    flex: 1 1 0;
    max-width: 330px;
    margin: 0;
  }
  .tt-stupci {
    flex: 0 0 auto;
    width: 112px;
    margin: 0;
  }
  .tt-desno {
    display: grid;
    gap: 2px;
    align-content: start;
  }
  .tt-graf {
    max-width: 440px;
    margin: 2px auto;
  }
  .tt-graf svg.scrub {
    cursor: ew-resize;
    touch-action: pan-y;
  }
  .tt-skriveno {
    font-size: 12.5px;
    color: var(--text-faint);
    text-align: center;
    margin: 6px 0;
  }

  /* scena */
  .tt-podloga {
    fill: color-mix(in srgb, var(--text-dim) 18%, transparent);
  }
  .tt-sraf,
  .tt-pod {
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .tt-pod {
    stroke-width: 2;
  }
  .tt-okvir {
    stroke: var(--border-strong);
    stroke-width: 5;
    stroke-linecap: round;
  }
  .tt-crta {
    stroke: var(--border-strong);
    stroke-width: 1.2;
    stroke-dasharray: 5 4;
  }
  .tt-crta.ravn {
    stroke: var(--text-faint);
  }
  .tt-crta.kv {
    stroke-dasharray: none;
    stroke: var(--text-faint);
    stroke-width: 2;
  }
  .tt-crta-t,
  .tt-meta-t {
    fill: var(--text-dim);
    font: 600 11.5px var(--font-sans);
  }
  .tt-luk {
    fill: none;
    stroke: var(--border-strong);
    stroke-width: 1.5;
    stroke-dasharray: 3 4;
  }
  .tt-os {
    stroke: var(--text-dim);
    stroke-width: 1.4;
  }
  .tt-os-t {
    fill: var(--text-dim);
    font: italic 600 13px var(--font-sans);
  }
  .tt-vrh {
    fill: var(--text-dim);
  }
  .tt-kr {
    fill: color-mix(in srgb, var(--primary) 5%, transparent);
    stroke: var(--border-strong);
    stroke-width: 1.5;
  }
  .tt-kr-os {
    stroke: var(--border-strong);
  }
  .tt-kr-kut {
    fill: none;
    stroke: var(--warn);
    stroke-width: 2;
  }
  .tt-kr-r {
    stroke: var(--primary);
    stroke-width: 2;
  }
  .tt-kr-t {
    fill: var(--primary);
  }
  .tt-kr-c {
    fill: var(--text-dim);
  }
  .tt-proj {
    stroke: var(--primary);
    stroke-width: 1.2;
    stroke-dasharray: 3 3;
    opacity: 0.7;
  }
  .tt-kr-tekst {
    fill: var(--warn);
    font: 600 12.5px var(--font-sans);
  }
  .tt-opruga {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .tt-nit {
    stroke: var(--text-dim);
    stroke-width: 1.6;
  }
  .tt-objesiste {
    fill: var(--text);
  }
  .tt-tocka {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .tt-uteg {
    fill: color-mix(in srgb, var(--primary) 30%, var(--bg-elev));
    stroke: var(--primary);
    stroke-width: 1.8;
  }
  .tt-uteg-t {
    fill: var(--text);
    font: italic 700 14px var(--font-sans);
    pointer-events: none;
  }
  .tt-kuglica {
    fill: var(--primary);
    stroke: color-mix(in srgb, var(--primary) 60%, var(--text));
    stroke-width: 1.5;
  }
  .tt-sjaj {
    fill: var(--bg-elev);
    opacity: 0.45;
  }
  .tt-sjedalo {
    fill: var(--warn);
  }
  .tt-dijete path {
    fill: none;
    stroke: var(--primary);
    stroke-width: 5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .tt-glava {
    fill: var(--primary);
  }
  .tt-tijelo.blijedo {
    opacity: 0.25;
  }
  .tt-hit {
    fill: transparent;
  }
  .tt-ruc {
    outline: none;
  }
  .tt-prsten {
    fill: none;
    stroke: var(--primary);
    stroke-width: 1.8;
    stroke-dasharray: 4 3;
  }
  .tt-ruc:focus-visible .tt-prsten {
    stroke-width: 3.2;
  }
  .tt-prsten.ceka {
    animation: tt-puls 1.4s ease-in-out infinite;
  }
  @keyframes tt-puls {
    50% {
      r: 28px;
      opacity: 0.5;
    }
  }
  .tt-meta {
    cursor: pointer;
    outline: none;
  }
  .tt-meta-k {
    fill: var(--bg-elev);
    stroke: var(--c);
    stroke-width: 2;
    stroke-dasharray: 3 2.5;
  }
  .tt-meta.on .tt-meta-k {
    fill: var(--c);
    stroke-dasharray: none;
  }
  .tt-meta:focus-visible .tt-meta-k {
    stroke-width: 3.5;
  }
  .tt-meta-v {
    fill: none;
    stroke: var(--bg-elev);
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .tt-meta-b {
    fill: var(--b);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }

  /* grafovi */
  .tt-mreza {
    stroke: var(--border);
    stroke-width: 1;
  }
  .tt-osg {
    stroke: var(--text-faint);
    stroke-width: 1.2;
  }
  .tt-tick {
    fill: var(--text-faint);
    font: 10.5px var(--font-sans);
  }
  .tt-osi {
    fill: var(--text-dim);
    font-weight: 600;
  }
  .tt-krivulja {
    fill: none;
    stroke: var(--c);
    stroke-width: 2.4;
    stroke-linejoin: round;
  }
  .tt-krivulja.sjena {
    stroke-width: 1.5;
    opacity: 0.28;
  }
  .tt-kursor {
    stroke: var(--text-faint);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  .tt-kursor-t {
    fill: var(--c);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .tt-marker {
    stroke: var(--primary);
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
  }
  .tt-marker-t {
    fill: var(--primary);
    font-weight: 600;
  }
  .tt-leg {
    fill: var(--text-dim);
    font: 600 11px var(--font-sans);
  }
  .tt-parabola {
    fill: none;
    stroke: var(--warn);
    stroke-width: 2.4;
  }
  .tt-Euk {
    stroke: var(--text-dim);
    stroke-width: 1.5;
    stroke-dasharray: 6 4;
  }
  .tt-Ek {
    stroke: var(--success);
    stroke-width: 4;
    opacity: 0.8;
  }
  .tt-ep-t {
    fill: var(--warn);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .tt-stupac {
    opacity: 0.9;
  }
  .tt-st-v {
    fill: var(--text);
    font: 600 10.5px var(--font-mono);
  }
  .tt-st-o {
    fill: var(--text-dim);
    font: italic 600 12px var(--font-sans);
  }

  /* štoperica */
  .tt-sat {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin: 2px auto 4px;
  }
  .tt-sat-i {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .tt-sat-i svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.5;
    stroke-linecap: round;
  }
  .tt-sat-i b {
    font-size: 16px;
  }
  .tt-sat-n {
    font-size: 12px;
    color: var(--text-dim);
  }
  .tt-blic {
    animation: tt-blic 0.5s ease-out;
  }
  @keyframes tt-blic {
    from {
      color: var(--success);
    }
  }

  /* očitanja */
  .tt-brojaci {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin: 6px auto 8px;
  }
  .tt-br {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .tt-br-ime {
    color: var(--text-dim);
    font-size: 14px;
  }
  .tt-br-ime i {
    font-weight: 600;
  }
  .tt-br-ime sub {
    font-size: 10px;
  }
  .tt-br b {
    font-size: 14px;
    font-weight: 600;
    min-width: 5.2em;
    text-align: right;
    white-space: nowrap;
  }
  .tt-br b.skr {
    min-width: 1.5em;
    color: var(--text-faint);
    text-align: center;
  }

  /* kontrole */
  .tt-kontrole {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 480px;
    margin: 4px auto 0;
  }
  .tt-gumb {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 38px;
  }
  .tt-gumb svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
  }
  .tt-gumb svg .puno {
    fill: currentColor;
  }
  .tt-ikona {
    padding-inline: 10px;
  }
  .tt-vrijeme {
    flex: 1;
    min-width: 0;
  }
  .tt-vrijeme input[type="range"] {
    width: 100%;
    margin: 0;
    height: 26px;
    accent-color: var(--primary);
  }
  .tt-vrijeme-red {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    font-size: 12px;
    color: var(--text-faint);
  }
  .tt-t {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text);
  }
  .tt-sporo {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    color: var(--text-dim);
  }
  .tt-fino {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin: 6px 0 4px;
  }
  .tt-pitanja {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .tt-pit {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    min-height: 38px;
    border: 1.5px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    color: var(--text-dim);
    font-size: 13.5px;
    cursor: pointer;
  }
  .tt-pit.on {
    border-color: var(--c);
    color: var(--text);
    background: color-mix(in srgb, var(--c) 10%, var(--bg-elev));
  }
  .tt-pit-br {
    display: inline-grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--c);
    color: var(--bg-elev);
    font-size: 11px;
    font-weight: 700;
  }
  .tt-pit-n {
    font-size: 11px;
    color: var(--text-faint);
    min-width: 0.6em;
  }
  .tt-uputa {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 8px 0 0;
  }
  .tt-akcije {
    justify-content: center;
    margin-top: 8px;
  }
  .tt-polja {
    display: grid;
    gap: 8px;
    max-width: 440px;
    margin: 10px auto 0;
  }
  .tt-polje {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .tt-polje-ozn {
    min-width: 2.6em;
    text-align: right;
    font-size: 15px;
  }
  .tt-inp {
    width: 8.5em;
    height: var(--lx-control);
    font-family: var(--font-mono);
  }
  .tt-inp.ok {
    border-color: var(--success);
  }
  .tt-pm {
    min-width: 36px;
  }
  .tt-kad {
    font-size: 12.5px;
    color: var(--text-faint);
  }
  .tt-kad-z {
    margin: 0;
    text-align: center;
    font-size: 13px;
    color: var(--text-dim);
  }
  .mono {
    font-family: var(--font-mono);
  }
  @media (prefers-reduced-motion: reduce) {
    .tt-prsten.ceka,
    .tt-blic {
      animation: none;
    }
  }
</style>
