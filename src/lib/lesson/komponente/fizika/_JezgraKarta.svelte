<script>
  // jezgra / karta: pozornica s jezgrom (α odnese 2 p + 2 n, pri β⁻ neutron pocrveni u proton i izleti e⁻, γ samo
  // bljesne) i karta nuklida (vodoravno N, okomito Z). U „raspad“ učenik dodiruje polja; strelice, animacija i
  // zapis nastalih jezgara vide se tek nakon točnog odgovora ili „pokaži“. Put, prozor karte, geometrija i kadrovi
  // animacije dolaze iz kataloga.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Kuglice from "./_JezgraKuglice.svelte";
  import Zapis from "./_JezgraZapis.svelte";
  import {
    jezgraIz,
    putRaspada,
    primijeniRaspad,
    vrstaRaspada,
    raspadTipova,
    tipoviZa,
    kuglice,
    kadarRaspada,
    prozorKarte,
    prozorOko,
    geometrijaKarte,
    zapisJezgre,
    imeIzotopa,
    simbolZ,
    opisJezgre,
    tekstJezgre,
    mdJezgre,
    RASPADI,
    RASPAD_ZNAK,
    RASPAD_IME,
    Z_MAX,
  } from "$lib/lesson/katalog/fizika/jezgra.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const raspad = nacin === "raspad";
  const koji = nacin === "koji_raspad";
  const istrazi = nacin === "istrazi";
  const odgovor = raspad || koji;
  const pocetna = untrack(() => jezgraIz(spec.pocetak));

  // ── put i niz tipova kuglica za svaku jezgru na putu ──
  const fiksniNiz = untrack(() =>
    koji ? [vrstaRaspada(pocetna, jezgraIz(spec.kraj))] : (spec.niz ?? []),
  );
  const fiksniPut = untrack(() =>
    koji
      ? [pocetna, { ...jezgraIz(spec.kraj), pob: false }]
      : putRaspada(spec.pocetak, spec.niz ?? []),
  );
  let put = $state(istrazi ? [pocetna] : fiksniPut);
  let niz = $state(istrazi ? [] : fiksniNiz);
  const tip0 = untrack(() => tipoviZa(spec, pocetna));
  let tipovi = $state(
    untrack(() => {
      const t = [tip0];
      fiksniNiz.forEach((v, i) => t.push(raspadTipova(t[i], v).tipovi));
      return istrazi ? [tip0] : t;
    }),
  );

  // korak = indeks prikazane jezgre na putu; anim = raspad koji se upravo crta
  let korak = $state(0);
  let anim = $state(null);
  let doKoraka = $state(0);
  let otkriveno = $derived(!odgovor || pokazi || !!ishod?.tocno);
  let cur = $derived(put[korak]);

  function igraj(cilj) {
    doKoraka = Math.min(cilj, put.length - 1);
    if (prefersReducedMotion.current) {
      korak = doKoraka;
      anim = null;
      return;
    }
    if (!anim && korak < doKoraka) anim = { vrsta: niz[korak], t: 0 };
  }
  onMount(() => {
    let id;
    let t0 = 0;
    const petlja = (now) => {
      const dt = t0 ? Math.min(0.05, (now - t0) / 1000) : 0;
      t0 = now;
      if (anim) {
        const t = anim.t + dt / 1.4;
        if (t >= 1) {
          korak++;
          anim = korak < doKoraka ? { vrsta: niz[korak], t: 0 } : null;
        } else anim = { ...anim, t };
      }
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });

  // ── istraživanje ──
  let poruka = $state("");
  function istraziRaspad(v) {
    if (anim) return;
    const j = put[put.length - 1];
    korak = put.length - 1;
    if (v === "gama" && !j.pob) {
      poruka =
        "Ova jezgra nije pobuđena, pa nema što izračiti: γ izlazi iz jezgre koja je ostala pobuđena (*) nakon α- ili β-raspada.";
      return;
    }
    const n = primijeniRaspad(j, v, v !== "gama");
    if (n.Z < 1 || n.N < 0 || n.Z > Z_MAX) {
      poruka = "Takva jezgra ne postoji.";
      return;
    }
    poruka =
      v === "gama"
        ? "γ: jezgra ostaje ista, samo izgubi višak energije."
        : v === "alfa"
          ? "α: odlazi ⁴He (2 p + 2 n), pa Z − 2 i A − 4. Nova jezgra može ostati pobuđena (*)."
          : v === "beta-"
            ? "β⁻: neutron postaje proton i izleti elektron, pa Z + 1, a A ostaje isti."
            : "β⁺: proton postaje neutron i izleti pozitron, pa Z − 1, a A ostaje isti.";
    tipovi = [...tipovi, raspadTipova(tipovi[tipovi.length - 1], v).tipovi];
    niz = [...niz, v];
    put = [...put, n];
    igraj(put.length - 1);
  }
  function vrati() {
    if (anim || put.length < 2) return;
    put = put.slice(0, -1);
    niz = niz.slice(0, -1);
    tipovi = tipovi.slice(0, -1);
    korak = put.length - 1;
    doKoraka = korak;
    poruka = "";
  }

  // ── prozor karte ──
  let prozor = $state(untrack(() => prozorKarte(spec)));
  $effect(() => {
    if (odgovor) return;
    const j = put[korak];
    untrack(() => {
      const p = prozorOko(j, prozor);
      if (p !== prozor) prozor = p;
    });
  });
  let g = $derived(geometrijaKarte(prozor, 360));

  // ── odgovor „raspad“: odabrana polja ──
  let odabir = $state(untrack(() => fiksniNiz.map(() => null)));
  let aktivni = $state(0);
  let kursor = $state(untrack(() => ({ Z: pocetna.Z, N: pocetna.N })));
  let aktivno = $derived(raspad && !locked && !pokazi && !ishod?.tocno);
  function biraj(Z, N) {
    if (!aktivno) return;
    kursor = { Z, N };
    const o = [...odabir];
    if (o[aktivni] && o[aktivni].Z === Z && o[aktivni].N === N)
      o[aktivni] = null;
    else {
      o[aktivni] = { Z, N };
      const sljedeci = o.findIndex((x, i) => i > aktivni && !x);
      if (sljedeci >= 0) aktivni = sljedeci;
    }
    odabir = o;
  }
  let svgEl = $state();
  function dodir(e) {
    if (!aktivno || !svgEl) return;
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svgEl.getScreenCTM().inverse());
    const q = g.polja.find(
      (c) => p.x >= c.x && p.x < c.x + c.w && p.y >= c.y && p.y < c.y + c.h,
    );
    if (q) biraj(q.Z, q.N);
  }
  function tipka(e) {
    if (!aktivno) return;
    const d = {
      ArrowUp: [1, 0],
      ArrowDown: [-1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }[e.key];
    if (d) {
      e.preventDefault();
      const Z = Math.min(prozor.zMax, Math.max(prozor.zMin, kursor.Z + d[0]));
      const N = Math.min(prozor.nMax, Math.max(prozor.nMin, kursor.N + d[1]));
      kursor = { Z, N };
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      biraj(kursor.Z, kursor.N);
    }
  }
  let kojiOdabir = $state(null);
  function provjeri() {
    if (locked) return;
    if (raspad) onodgovor(odabir.map((o) => (o ? { ...o } : null)));
    else onodgovor(kojiOdabir);
  }

  // otkrivanje: točan odgovor u polja, pa animacija cijelog puta
  let pokrenuto = false;
  $effect(() => {
    if (!odgovor || !otkriveno || pokrenuto) return;
    pokrenuto = true;
    untrack(() => {
      if (raspad && pokazi)
        odabir = fiksniPut.slice(1).map((j) => ({ Z: j.Z, N: j.N }));
      if (koji && pokazi) kojiOdabir = fiksniNiz[0];
      korak = 0;
      igraj(put.length - 1);
    });
  });

  // ── pozornica ──
  const PZ = [koji ? 165 : 185, 62];
  const R1 = untrack(() => Math.min(7.5, 40 / Math.cbrt(pocetna.A)));
  let kadar = $derived(
    anim ? kadarRaspada(tipovi[korak], anim.vrsta, anim.t, R1) : null,
  );
  let kStatic = $derived(kuglice(tipovi[korak], R1));
  let zapisSad = $derived.by(() => {
    if (!anim || anim.t < 0.35) return zapisJezgre(cur.Z, cur.A, cur.pob);
    const n = put[korak + 1];
    return zapisJezgre(n.Z, n.A, n.pob);
  });
  let imeSad = $derived.by(() => {
    const j = anim && anim.t >= 0.35 ? put[korak + 1] : cur;
    return imeIzotopa(j.Z, j.A);
  });
  const r1 = (n) => Math.round(n * 10) / 10;
  const fotonPut = (x0, x1, y) => {
    let d = `M${r1(x0)},${y}`;
    for (let x = x0; x < x1; x += 8) d += ` q2,-6 4,0 t4,0`;
    return d;
  };

  // ── karta: označivač i strelice ──
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  let marker = $derived.by(() => {
    const a = g.sredina(cur.Z, cur.N);
    if (!anim) return a;
    const n = put[korak + 1];
    const b = g.sredina(n.Z, n.N);
    const u = ease((anim.t - 0.3) / 0.6);
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  });
  let strelice = $derived.by(() => {
    if (odgovor && !otkriveno) return [];
    const out = [];
    const do_ = anim ? korak : korak;
    for (let i = 0; i < do_; i++) {
      const a = put[i];
      const b = put[i + 1];
      if (!g.unutra(a.Z, a.N) || !g.unutra(b.Z, b.N)) continue;
      out.push({
        a: g.sredina(a.Z, a.N),
        b: g.sredina(b.Z, b.N),
        vrsta: niz[i],
      });
    }
    return out;
  });
  const skrati = (a, b, d) => {
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return {
      x1: r1(a.x + ((b.x - a.x) * d) / L),
      y1: r1(a.y + ((b.y - a.y) * d) / L),
      x2: r1(b.x - ((b.x - a.x) * d) / L),
      y2: r1(b.y - ((b.y - a.y) * d) / L),
    };
  };
  const oznakeU = (Z, N) =>
    odabir
      .map((o, i) => (o && o.Z === Z && o.N === N ? i + 1 : null))
      .filter(Boolean);
  let diagA = $derived(
    !odgovor || otkriveno
      ? [...new Set(put.slice(0, korak + 1).map((j) => j.A))]
      : [],
  );
  const dijagonala = (A) => {
    const tocke = g.polja.filter((c) => c.A === A);
    if (tocke.length < 2) return null;
    const a = tocke[0];
    const b = tocke[tocke.length - 1];
    return {
      x1: r1(a.x + a.w),
      y1: r1(a.y),
      x2: r1(b.x),
      y2: r1(b.y + b.h),
      tx: r1(a.x + a.w - 2),
      ty: r1(a.y + 9),
    };
  };
  let opisKarte = $derived(
    raspad
      ? `Karta nuklida: Z od ${prozor.zMin} do ${prozor.zMax}, N od ${prozor.nMin} do ${prozor.nMax}. Početna jezgra ${tekstJezgre(pocetna.Z, pocetna.A)}. Strelicama pomakni okvir, Enter odabire polje za ${aktivni + 1}. raspad. Okvir je na Z = ${kursor.Z}, N = ${kursor.N}.`
      : `Karta nuklida, jezgra ${tekstJezgre(cur.Z, cur.A)} na Z = ${cur.Z}, N = ${cur.N}.`,
  );
  const kraj = untrack(() => (koji ? jezgraIz(spec.kraj) : null));
</script>

{#if odgovor}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="jz-tekst"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure jzk-fig">
  <!-- pozornica -->
  <svg
    viewBox="0 0 360 124"
    role="img"
    aria-label="Jezgra {tekstJezgre(cur.Z, cur.A, cur.pob)}, {imeSad}"
  >
    <defs>
      <radialGradient id="jzk-blj">
        <stop offset="0" stop-color="#fff7c2" />
        <stop offset="0.55" stop-color="#fbbf24" stop-opacity="0.6" />
        <stop offset="1" stop-color="#f59e0b" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect class="jzk-pozornica" x="1" y="1" width="358" height="122" rx="12" />
    <Zapis zapis={zapisSad} x={56} y={58} vel={24} />
    <text class="jzk-ime" x={56} y={84} text-anchor="middle">{imeSad}</text>
    {#if kadar}
      {#if kadar.bljesak > 0}
        <circle
          cx={PZ[0]}
          cy={PZ[1]}
          r={r1(30 + 20 * kadar.bljesak)}
          fill="url(#jzk-blj)"
          opacity={r1(kadar.bljesak)}
        />
      {/if}
      <Kuglice k={kadar.jezgra} x={PZ[0]} y={PZ[1]} prijelaz={kadar.prijelaz} />
      {#each kadar.cestice as c, i (i)}
        {#if c.vrsta === "p" || c.vrsta === "n"}
          <Kuglice
            k={[{ i: 0, x: 0, y: 0, r: c.r, vrsta: c.vrsta }]}
            x={PZ[0] + c.x}
            y={PZ[1] + c.y}
            opacity={c.opacity}
          />
        {:else}
          <circle
            class="jzk-e"
            class:plus={c.vrsta === "e+"}
            cx={r1(PZ[0] + c.x)}
            cy={r1(PZ[1] + c.y)}
            r={c.r}
            opacity={c.opacity}
          />
          <text
            class="jzk-e-t"
            x={r1(PZ[0] + c.x)}
            y={r1(PZ[1] + c.y - 7)}
            text-anchor="middle"
            opacity={c.opacity}>{c.vrsta === "e-" ? "e⁻" : "e⁺"}</text
          >
        {/if}
      {/each}
      {#if anim.vrsta === "alfa" && kadar.cestice.length && anim.t > 0.35}
        <text
          class="jzk-e-t"
          x={r1(PZ[0] + kadar.cestice[0].x)}
          y={r1(PZ[1] + kadar.cestice[0].y - 12)}
          text-anchor="middle"
          opacity={kadar.cestice[0].opacity}>α</text
        >
      {/if}
      {#if kadar.foton}
        <path
          class="jzk-foton"
          d={fotonPut(PZ[0] + kadar.foton.x0, PZ[0] + kadar.foton.x1, PZ[1])}
          opacity={kadar.foton.opacity}
        />
        <text
          class="jzk-e-t"
          x={r1(PZ[0] + kadar.foton.x1)}
          y={PZ[1] - 10}
          text-anchor="middle"
          opacity={kadar.foton.opacity}>γ</text
        >
      {/if}
    {:else}
      <Kuglice k={kStatic} x={PZ[0]} y={PZ[1]} />
    {/if}
    {#if koji}
      <g class="jzk-kraj">
        <text class="jzk-str" x="250" y="66" text-anchor="middle">→</text>
        <Zapis zapis={zapisJezgre(kraj.Z, kraj.A)} x={308} y={58} vel={24} />
        <text class="jzk-ime" x="308" y="84" text-anchor="middle"
          >{imeIzotopa(kraj.Z, kraj.A)}</text
        >
      </g>
    {:else if anim}
      <text class="jzk-raspad" x="352" y="114" text-anchor="end"
        >{RASPAD_IME[anim.vrsta]}</text
      >
    {/if}
    {#if cur.pob && !anim}
      <text class="jzk-pob" x="352" y="114" text-anchor="end"
        >* pobuđena jezgra: može izračiti γ</text
      >
    {/if}
  </svg>

  <!-- karta nuklida (u „raspad“ je to kontrola: role="application" i tabindex 0) -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <svg
    bind:this={svgEl}
    class="jzk-karta"
    viewBox="0 0 360 {g.H + 14}"
    role={raspad ? "application" : "img"}
    aria-label={opisKarte}
    tabindex={raspad ? 0 : undefined}
    onpointerdown={dodir}
    onkeydown={tipka}
  >
    <text class="jzk-os" x="4" y="10">Z ↑</text>
    {#each g.redovi as r (r.Z)}
      <text class="jzk-red" x="44" y={r.y + 4} text-anchor="end"
        >{r.oznaka}</text
      >
    {/each}
    {#each g.stupci as s (s.N)}
      <text class="jzk-stup" x={s.x} y={g.os.y + 14} text-anchor="middle"
        >{s.N}</text
      >
    {/each}
    <text class="jzk-os" x={g.os.x + g.os.sirina} y={g.H + 12} text-anchor="end"
      >N (broj neutrona) →</text
    >
    {#each g.polja as c (c.Z * 1000 + c.N)}
      {@const oz = raspad ? oznakeU(c.Z, c.N) : []}
      <rect
        class="jzk-polje"
        class:odabrano={oz.length > 0}
        class:aktivno
        x={c.x + 1}
        y={c.y + 1}
        width={c.w - 2}
        height={c.h - 2}
        rx="4"
      />
      {#if oz.length}
        <text
          class="jzk-oznaka"
          x={r1(c.x + c.w / 2)}
          y={r1(c.y + c.h / 2 + 4)}
          text-anchor="middle">{oz.join(" ")}</text
        >
      {/if}
    {/each}
    {#each diagA as A (A)}
      {@const d = dijagonala(A)}
      {#if d}
        <line class="jzk-diag" x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} />
        <text class="jzk-diag-t" x={d.tx} y={d.ty} text-anchor="end"
          >A = {A}</text
        >
      {/if}
    {/each}
    {#if koji}
      {@const a = g.sredina(pocetna.Z, pocetna.N)}
      {@const b = g.sredina(kraj.Z, kraj.N)}
      {#if a.x !== b.x || a.y !== b.y}
        <rect
          class="jzk-kraj-polje"
          x={b.x - g.cw / 2 + 2}
          y={b.y - g.ch / 2 + 2}
          width={g.cw - 4}
          height={g.ch - 4}
          rx="4"
        />
        <text class="jzk-oznaka" x={b.x} y={b.y + 4} text-anchor="middle"
          >{simbolZ(kraj.Z)}</text
        >
      {/if}
    {/if}
    {#each strelice as s, i (i)}
      {#if s.vrsta === "gama"}
        <path
          class="jzk-strelica"
          d="M{s.a.x + 6},{s.a.y - 8} a9,9 0 1,1 -12,0"
          marker-end="url(#jzk-vrh)"
        />
        <text class="jzk-s-t" x={s.a.x} y={s.a.y - 21} text-anchor="middle"
          >γ</text
        >
      {:else}
        {@const l = skrati(s.a, s.b, 9)}
        <line class="jzk-strelica" {...l} marker-end="url(#jzk-vrh)" />
        <text
          class="jzk-s-t"
          x={r1((s.a.x + s.b.x) / 2 + 9)}
          y={r1((s.a.y + s.b.y) / 2 - 3)}
          text-anchor="middle">{RASPAD_ZNAK[s.vrsta]}</text
        >
      {/if}
    {/each}
    <defs>
      <marker
        id="jzk-vrh"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L10,5 L0,10 z" class="jzk-vrh" />
      </marker>
    </defs>
    {#if g.unutra(cur.Z, cur.N) || anim}
      <circle
        class="jzk-marker"
        cx={r1(marker.x)}
        cy={r1(marker.y)}
        r={Math.min(g.cw, g.ch) * 0.3}
      />
    {/if}
    {#if raspad && aktivno}
      {@const k = g.sredina(kursor.Z, kursor.N)}
      <rect
        class="jzk-kursor"
        x={k.x - g.cw / 2 + 1}
        y={k.y - g.ch / 2 + 1}
        width={g.cw - 2}
        height={g.ch - 2}
        rx="5"
      />
    {/if}
  </svg>
</figure>

{#if istrazi && poruka}
  <p class="jzk-poruka" role="status">{poruka}</p>
{/if}

{#if raspad}
  <div class="jzk-koraci" role="group" aria-label="Raspadi">
    {#each fiksniNiz as v, i (i)}
      {@const o = odabir[i]}
      <button
        type="button"
        class="jzk-korak"
        class:sel={aktivni === i && aktivno}
        disabled={!aktivno}
        onclick={() => (aktivni = i)}
      >
        <span class="jzk-k-n">{i + 1}. nakon {RASPAD_ZNAK[v]}</span>
        <span class="jzk-k-o"
          >{#if o && otkriveno}<Md
              inline
              text={mdJezgre(o.Z, o.Z + o.N, fiksniPut[i + 1].pob)}
            />{:else}{o ? opisJezgre(o) : "dodirni polje"}{/if}</span
        >
      </button>
    {/each}
  </div>
{/if}

{#if koji}
  <div class="jzk-izbor" role="radiogroup" aria-label="Vrsta raspada">
    {#each RASPADI as v (v)}
      <button
        type="button"
        role="radio"
        class="jzk-v"
        class:sel={kojiOdabir === v}
        aria-checked={kojiOdabir === v}
        disabled={locked || pokazi}
        onclick={() => (kojiOdabir = v)}>{RASPAD_ZNAK[v]}</button
      >
    {/each}
  </div>
{/if}

<div class="lx-actions jzk-akcije">
  {#if odgovor}
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked}>Provjeri</button
    >
    {#if otkriveno}
      <button
        type="button"
        class="btn btn-ghost"
        disabled={!!anim || prefersReducedMotion.current}
        onclick={() => {
          korak = 0;
          igraj(put.length - 1);
        }}>Ponovi animaciju</button
      >
    {/if}
  {:else if istrazi}
    {#each RASPADI as v (v)}
      <button
        type="button"
        class="btn btn-ghost jzk-r"
        disabled={!!anim}
        aria-label={RASPAD_IME[v]}
        onclick={() => istraziRaspad(v)}>{RASPAD_ZNAK[v]}</button
      >
    {/each}
    <button
      type="button"
      class="btn btn-ghost"
      disabled={!!anim || put.length < 2}
      onclick={vrati}>Vrati</button
    >
  {:else}
    <button
      type="button"
      class="btn btn-primary"
      disabled={!!anim}
      onclick={() => {
        if (korak >= put.length - 1) korak = 0;
        igraj(put.length - 1);
      }}
      >{korak >= put.length - 1 && korak > 0
        ? "Ispočetka"
        : "Pokreni niz"}</button
    >
    <button
      type="button"
      class="btn btn-ghost"
      disabled={!!anim || korak >= put.length - 1}
      onclick={() => igraj(korak + 1)}>Jedan korak</button
    >
  {/if}
</div>
{#if raspad && aktivno}
  <p class="lx-hint jzk-hint">
    Odaberi raspad gore pa dodirni polje na karti. Ponovni dodir briše odabir.
  </p>
{/if}

<style>
  .jz-tekst {
    margin-bottom: 10px;
  }
  .jzk-fig {
    max-width: 440px;
    margin-bottom: 6px;
  }
  .jzk-fig svg + svg {
    margin-top: 8px;
  }
  .jzk-pozornica {
    fill: color-mix(in srgb, var(--text-dim) 6%, transparent);
    stroke: var(--border);
  }
  .jzk-ime {
    fill: var(--text-dim);
    font: 500 11.5px var(--font-sans);
  }
  .jzk-raspad,
  .jzk-pob {
    fill: var(--text-faint);
    font: 500 11px var(--font-sans);
  }
  .jzk-str {
    fill: var(--text-dim);
    font: 600 26px var(--font-sans);
  }
  .jzk-e {
    fill: var(--lx-water);
  }
  .jzk-e.plus {
    fill: var(--warn);
  }
  .jzk-e-t,
  .jzk-s-t {
    fill: var(--text);
    font: 700 12px var(--font-sans);
  }
  .jzk-foton {
    fill: none;
    stroke: var(--warn);
    stroke-width: 2;
  }
  .jzk-karta {
    touch-action: manipulation;
    outline: none;
  }
  .jzk-karta:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: 8px;
  }
  .jzk-os {
    fill: var(--text-faint);
    font: 500 10.5px var(--font-sans);
  }
  .jzk-red {
    fill: var(--text-dim);
    font: 600 11.5px var(--font-sans);
  }
  .jzk-stup {
    fill: var(--text-dim);
    font: 500 10.5px var(--font-mono);
  }
  .jzk-polje {
    fill: var(--bg-elev);
    stroke: var(--border);
  }
  .jzk-polje.aktivno {
    cursor: pointer;
  }
  .jzk-polje.odabrano {
    fill: var(--primary-dim);
    stroke: var(--primary);
    stroke-width: 1.5;
  }
  .jzk-oznaka {
    fill: var(--primary);
    font: 700 12px var(--font-sans);
    pointer-events: none;
  }
  .jzk-kraj-polje {
    fill: none;
    stroke: var(--text-dim);
    stroke-dasharray: 3 3;
  }
  .jzk-diag {
    stroke: var(--text-faint);
    stroke-dasharray: 2 4;
    pointer-events: none;
  }
  .jzk-diag-t {
    fill: var(--text-faint);
    font: 500 9px var(--font-sans);
  }
  .jzk-strelica {
    fill: none;
    stroke: var(--success);
    stroke-width: 2.2;
  }
  .jzk-vrh {
    fill: var(--success);
  }
  .jzk-marker {
    fill: #e5484d;
    stroke: var(--bg-elev);
    stroke-width: 2;
    pointer-events: none;
  }
  .jzk-kursor {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.5;
    stroke-dasharray: 4 2;
    pointer-events: none;
  }
  .jzk-poruka {
    margin: 0 auto 8px;
    max-width: 400px;
    padding: 6px 10px;
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--warn) 14%, transparent);
    font-size: 13.5px;
    text-align: center;
  }
  .jzk-koraci {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 6px;
    max-width: 440px;
    margin: 0 auto;
  }
  .jzk-korak {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 8px 12px;
    border-radius: var(--r-lg);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text);
    text-align: left;
  }
  .jzk-korak.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }
  .jzk-k-n {
    font-weight: 700;
    font-size: 14px;
  }
  .jzk-k-o {
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .jzk-izbor {
    display: flex;
    justify-content: center;
    gap: 8px;
  }
  .jzk-v {
    min-width: 64px;
    height: 48px;
    border-radius: var(--r-lg);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text);
    font: 700 19px var(--font-sans);
  }
  .jzk-v.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }
  .jzk-akcije {
    justify-content: center;
  }
  .jzk-r {
    min-width: 48px;
    font-size: 17px;
    font-weight: 700;
  }
  .jzk-hint {
    text-align: center;
  }
</style>
