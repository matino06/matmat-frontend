<script>
  // Geometrijska optika: laser, normala, kutovi uživo; zrcalo, slika u ravnom zrcalu, lom i planparalelna ploča.
  // Sva geometrija (koordinate zraka, lukova, oznaka), očitanja i što je skriveno dolaze iz katalog/fizika/zrake.js;
  // ovdje se samo crta, animira (točkice svjetlosti putuju brzinom c/n) i prosljeđuje unos.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import { formatNumber, formatSci } from "$lib/lesson/core/number.js";
  import {
    geometrija,
    ocitanja,
    opisCrteza,
    pocetnoStanje,
    klizaciOd,
    rjesenjePostavi,
    granicaKlona,
    granicaOka,
    kutIzTocke,
    klonIzTocke,
    korakRavnala,
    velicineScene,
    jedinicaPitanja,
    odgovorPitanja,
    tocnaPonuda,
    SIRINA,
  } from "$lib/lesson/katalog/fizika/zrake.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const scena = untrack(() => spec.scena);
  const istrazi = nacin === "istrazi";
  const gledanje = istrazi || nacin === "prikaz";
  const postavi = nacin === "postavi";
  const izracunaj = nacin === "izracunaj";
  const odaberi = nacin === "odaberi";
  const slika = scena === "zrcalo_slika";
  const uid = Math.random().toString(36).slice(2, 8);
  const klizaci = untrack(() => (istrazi ? klizaciOd(spec) : []));

  let st = $state(untrack(() => pocetnoStanje(spec)));

  // ── odgovor i otkrivanje ──
  let poslano = $state(null);
  const trenutni = () => (slika ? st.klon : st.kut);
  let provjereno = $derived(
    postavi &&
      poslano != null &&
      poslano === trenutni() &&
      !!ishod &&
      !ishod.prazno,
  );
  let odabrano = $state(null);
  let poslanoOdabir = $state(null);
  let otkriveno = $derived(
    pokazi ||
      (!!ishod?.tocno &&
        (postavi ? provjereno : odaberi ? poslanoOdabir === odabrano : true)),
  );
  let aktivno = $derived(!gledanje && !locked && !pokazi);
  let opt = $derived({ otkriveno, provjereno });
  let geo = $derived(geometrija(spec, st, opt));
  let cipovi = $derived(ocitanja(spec, st, opt));
  let opis = $derived(opisCrteza(spec, st, opt));

  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (postavi) {
        const r = rjesenjePostavi(spec);
        if (slika) st.klon = r;
        else st.kut = r;
        poslano = trenutni();
      }
      if (odaberi) odabrano = poslanoOdabir = tocnaPonuda(spec);
      if (izracunaj)
        unosi = spec.pitaj.map((p) => {
          const o = odgovorPitanja(spec, p);
          const j = jedinicaPitanja(spec, p);
          return j === "m/s"
            ? formatSci(o.tocno)
            : formatNumber(Math.round(o.tocno * 100) / 100);
        });
    });
  });

  // ── animacija: točkice svjetlosti i „paljenje“ izlaznih zraka ──
  const RAZMAK = 24; // optički razmak točkica (px · n)
  const BRZINA = 46; // px/s u vakuumu
  let vrijeme = $state(0);
  let objava = $state(1);
  let izlazVidljiv = $derived(!geo.skriveno.izlaz);
  let bilo = untrack(() => izlazVidljiv);
  $effect(() => {
    const sad = izlazVidljiv;
    untrack(() => {
      if (sad && !bilo && !prefersReducedMotion.current) objava = 0;
      bilo = sad;
    });
  });
  onMount(() => {
    let id;
    let zadnji = 0;
    const petlja = (now) => {
      const dt = Math.min(0.05, (now - (zadnji || now)) / 1000);
      zadnji = now;
      if (!prefersReducedMotion.current) {
        vrijeme += dt;
        if (objava < 1) objava = Math.min(1, objava + dt / 0.75);
      } else objava = 1;
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });

  const IZLAZNE = new Set(["odbijena", "lomljena"]);
  const BEZ_TOCKICA = new Set(["granicna", "produzetak", "nastavak"]);
  function tockice(z, t) {
    if (z.crtkano || BEZ_TOCKICA.has(z.vrsta) || z.jakost < 0.03) return [];
    if (IZLAZNE.has(z.vrsta) && objava < 1) return [];
    const out = [];
    const faza = (t * BRZINA) % RAZMAK;
    let opt0 = z.t0;
    for (let i = 0; i < z.tocke.length - 1; i++) {
      const [a, b] = [z.tocke[i], z.tocke[i + 1]];
      const n = z.n[i] ?? 1;
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) * n;
      if (L > 0) {
        let q = faza + Math.ceil((opt0 - faza) / RAZMAK) * RAZMAK;
        for (; q < opt0 + L; q += RAZMAK) {
          const u = (q - opt0) / L;
          out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
        }
      }
      opt0 += L;
    }
    return out;
  }
  const tockeTekst = (t) => t.map((p) => p.join(",")).join(" ");
  const sirinaZrake = (z) =>
    z.tanka ? 1.6 : 1.3 + 2.2 * Math.sqrt(Math.max(0, z.jakost));
  const prozirnost = (z) => 0.22 + 0.78 * Math.sqrt(Math.max(0, z.jakost));
  // „α_g = 41,8°“ → α, indeks g, ostatak
  const dijelovi = (tekst) =>
    String(tekst)
      .split(/(_[A-Za-z0-9]+)/)
      .filter(Boolean)
      .map((d) =>
        d.startsWith("_") ? { t: d.slice(1), sub: true } : { t: d, sub: false },
      );

  // ── povlačenje ──
  let svgEl = $state();
  let vuce = $state(null); // "laser" | "oko" | "klon"
  const tocka = (e) => {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  };
  const mozeLaser = $derived(
    !slika && (istrazi || (postavi && aktivno)) && !!geo.laser,
  );
  function postaviKut(a) {
    st.kut = Math.round(Math.max(0, Math.min(89, a)) * 10) / 10;
  }
  function down(e, sto) {
    if (sto === "laser" && !mozeLaser) return;
    if (sto === "klon" && !(postavi && aktivno)) return;
    if (sto === "oko" && !istrazi) return;
    e.preventDefault();
    vuce = sto;
    e.currentTarget.setPointerCapture(e.pointerId);
    move(e);
  }
  function move(e) {
    if (!vuce) return;
    const p = tocka(e);
    if (!p) return;
    if (vuce === "laser") {
      const a = kutIzTocke(geo.laser.o, p.x, p.y);
      if (a != null) st.kut = a;
    } else if (vuce === "oko") {
      const [[x0, x1], [y0, y1]] = granicaOka();
      st.oko = [
        Math.round(Math.max(x0, Math.min(x1, p.x))),
        Math.round(Math.max(y0, Math.min(y1, p.y))),
      ];
    } else if (vuce === "klon") st.klon = klonIzTocke(spec, p.x);
  }
  const up = () => (vuce = null);
  function pomakni(d) {
    if (slika) {
      const k = korakRavnala(spec) / 2;
      const [lo, hi] = granicaKlona(spec);
      st.klon =
        Math.round(Math.max(lo, Math.min(hi, (st.klon ?? 0) + d * k)) / k) * k;
    } else postaviKut(st.kut + d * 0.5);
  }
  function key(e) {
    const d = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
    }[e.key];
    if (!d) return;
    e.preventDefault();
    if (slika) pomakni(d * (e.shiftKey ? 4 : 1));
    else pomakni(d * (e.shiftKey ? 10 : 1));
  }

  // ── provjera ──
  function provjeriPostavi() {
    if (locked) return;
    poslano = trenutni();
    onodgovor(poslano);
  }
  let unosi = $state(
    untrack(() => (izracunaj ? spec.pitaj.map(() => "") : [])),
  );
  function provjeriIzracunaj(e) {
    e.preventDefault();
    if (locked) return;
    onodgovor([...unosi]);
  }
  function potencija(i) {
    const v = unosi[i].trim();
    if (!/10\^/.test(v)) unosi[i] = `${v || "1"}·10^`;
  }
  function provjeriOdabir() {
    if (locked || !odabrano) return;
    poslanoOdabir = odabrano;
    onodgovor(odabrano);
  }
  function odaberiZraku(id) {
    if (!aktivno) return;
    odabrano = id;
  }

  // ── pomoćno za crtanje ──
  const OZNAKE_VRSTE = {
    alpha: "zr-l-alpha",
    alpha_odbojni: "zr-l-odb",
    beta: "zr-l-beta",
    gamma: "zr-l-beta",
    phi: "zr-l-phi",
    izmedu: "zr-l-izmedu",
  };
  const srafura = (z) => {
    const out = [];
    if (z.strana === "dolje")
      for (let x = z.od[0] + 6; x <= z.do[0]; x += 11)
        out.push([x, z.od[1] + 3, x - 8, z.od[1] + 11]);
    else
      for (let y = z.od[1] + 4; y <= z.do[1]; y += 11)
        out.push([z.od[0] + 3, y, z.od[0] + 11, y - 8]);
    return out;
  };
  let zrakeSlike = $derived(
    geo.zrake.filter((z) => z.vrsta !== "granicna" && z.vrsta !== "nastavak"),
  );
  let pomocne = $derived(
    geo.zrake.filter((z) => z.vrsta === "granicna" || z.vrsta === "nastavak"),
  );
  const fillSredstva = (ton) =>
    ton <= 0
      ? "transparent"
      : `color-mix(in srgb, var(--lx-water) ${Math.round(10 + ton * 30)}%, transparent)`;
  let statusOdabira = (id) =>
    otkriveno
      ? id === tocnaPonuda(spec)
        ? "ok"
        : "blijedo"
      : ishod &&
          !ishod.tocno &&
          !ishod.prazno &&
          poslanoOdabir === id &&
          odabrano === id
        ? "krivo"
        : odabrano === id
          ? "odabrano"
          : null;
  let kandidatiPoSlovu = $derived(
    [...geo.kandidati].sort((a, b) => a.slovo.localeCompare(b.slovo)),
  );
  const uputa = untrack(() => {
    if (postavi && slika)
      return "Povuci klona lijevo-desno po podu (ili tipke ‹ ›), pa klikni Provjeri.";
    if (postavi)
      return "Povuci laser za ručku (ili tipke ±0,5°), pa klikni Provjeri. Izlazne zrake vidjet ćeš tek nakon provjere.";
    if (odaberi)
      return "Dodirni zraku ili slovo ispod crteža, pa klikni Provjeri.";
    if (istrazi && slika) return "Povuci oko i gledaj kamo vode zrake.";
    if (istrazi)
      return "Povuci laser za ručku i gledaj kako se mijenjaju zrake i kutovi.";
    return "";
  });
  let laserRucka = $derived(geo.laser?.rucka ?? null);
  let klonCrtez = $derived(geo.klon);
  const fmtKlizac = (k) =>
    `${formatNumber(k.id === "n" ? st.n2 : st[k.id])}${k.jedinica ? (k.jedinica === "°" ? "°" : `\u00a0${k.jedinica}`) : ""}`;
  function postaviKlizac(k, v) {
    const x = Math.round(Number(v) * 1e9) / 1e9;
    if (k.id === "n") st.n2 = x;
    else st[k.id] = x;
  }
  const pitanjeJedinica = (p) => jedinicaPitanja(spec, p);
  const pitanjeOznaka = (p) =>
    p.oznaka ?? velicineScene(spec)[p.velicina]?.oznaka ?? p.velicina;
</script>

{#snippet lik(l, klasa)}
  {@const x = l.x}
  {@const d = l.dno}
  {@const h = l.visina}
  {@const sm = klasa === "zr-predmet" ? 1 : -1}
  <g class="zr-lik {klasa}">
    {#if l.vrsta === "osoba"}
      <circle cx={x} cy={d - h + 9} r="9" />
      <circle class="zr-oko-lika" cx={x + 3.5 * sm} cy={d - h + 8} r="1.4" />
      <line x1={x} y1={d - h + 18} x2={x} y2={d - 40} />
      <polyline
        points="{x - 14},{d - h + 44} {x},{d - h + 30} {x + 14},{d - h + 44}"
      />
      <polyline points="{x - 11},{d} {x},{d - 40} {x + 11},{d}" />
    {:else if l.vrsta === "strelica"}
      <line x1={x} y1={d} x2={x} y2={d - h + 6} />
      <path
        class="zr-vrh"
        d="M{x - 7},{d - h + 12} L{x},{d - h} L{x + 7},{d - h + 12} z"
      />
    {:else}
      <rect x={x - 7} y={d - 44} width="14" height="44" rx="2" />
      <line x1={x} y1={d - 44} x2={x} y2={d - 49} />
      <ellipse class="zr-plamen" cx={x} cy={d - h + 10} rx="5" ry="10" />
    {/if}
  </g>
{/snippet}

{#if gledanje}
  <div class="zr-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure zr">
  <svg
    bind:this={svgEl}
    viewBox="0 0 {geo.w} {geo.h}"
    role="img"
    aria-label={opis}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
  >
    <defs>
      <marker
        id="zr-kraj-{uid}"
        viewBox="0 0 10 10"
        refX="5"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M0,1 L10,5 L0,9 z" class="zr-kota-vrh" />
      </marker>
      <marker
        id="zr-smjer-{uid}"
        viewBox="0 0 10 10"
        refX="5"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto"
      >
        <path d="M0,0 L10,5 L0,10 z" class="zr-smjer-vrh" />
      </marker>
    </defs>

    <!-- sredstva i granice -->
    {#each geo.sredstva as m, i (i)}
      <polygon
        class="zr-sredstvo"
        points={tockeTekst(m.tocke)}
        style:fill={fillSredstva(m.ton)}
      />
    {/each}
    {#each geo.granice as b, i (i)}
      <line
        class="zr-granica"
        x1={b.od[0]}
        y1={b.od[1]}
        x2={b.do[0]}
        y2={b.do[1]}
      />
    {/each}
    {#each geo.sredstva as m, i (i)}
      <text
        class="zr-sredstvo-t"
        x={m.oznaka.x}
        y={m.oznaka.y}
        text-anchor={m.oznaka.desno ? "end" : "start"}
        >{#each dijelovi(m.oznaka.tekst) as d, j (j)}{#if d.sub}<tspan
              baseline-shift="sub"
              font-size="9">{d.t}</tspan
            >{:else}{d.t}{/if}{/each}</text
      >
    {/each}

    <!-- zrcalo -->
    {#if geo.zrcalo}
      {#each srafura(geo.zrcalo) as h, i (i)}
        <line class="zr-srafura" x1={h[0]} y1={h[1]} x2={h[2]} y2={h[3]} />
      {/each}
      <line
        class="zr-zrcalo"
        x1={geo.zrcalo.od[0]}
        y1={geo.zrcalo.od[1]}
        x2={geo.zrcalo.do[0]}
        y2={geo.zrcalo.do[1]}
      />
    {/if}
    {#if geo.pod}
      <line
        class="zr-pod"
        x1="8"
        y1={geo.pod.y}
        x2={SIRINA - 8}
        y2={geo.pod.y}
      />
    {/if}
    {#if geo.ravnalo}
      {#each geo.ravnalo.crtice as c, i (i)}
        <line
          class="zr-crtica"
          x1={c.x}
          y1={geo.ravnalo.y}
          x2={c.x}
          y2={geo.ravnalo.y + (c.duga ? 9 : 5)}
        />
        {#if c.tekst != null}
          <text
            class="zr-crtica-t"
            x={c.x}
            y={geo.ravnalo.y + 20}
            text-anchor="middle">{c.tekst}</text
          >
        {/if}
      {/each}
      <text
        class="zr-crtica-t"
        x={SIRINA - 8}
        y={geo.ravnalo.y + 32}
        text-anchor="end">{geo.ravnalo.jedinica}</text
      >
    {/if}

    <!-- normale -->
    {#each geo.normale as n, i (i)}
      <line
        class="zr-normala"
        x1={n.od[0]}
        y1={n.od[1]}
        x2={n.do[0]}
        y2={n.do[1]}
      />
    {/each}
    {#if geo.normale.length && !slika}
      <text
        class="zr-normala-t"
        x={geo.normale[0].od[0] + 5}
        y={geo.normale[0].od[1] + 9}>normala</text
      >
    {/if}

    <!-- lukovi kutova -->
    {#each geo.lukovi as l, i (i)}
      <polyline
        class="zr-luk {OZNAKE_VRSTE[l.vrsta] ?? ''}"
        points={tockeTekst(l.tocke)}
      />
    {/each}

    <!-- pomoćne zrake (granični kut, nastavak upadne) -->
    {#each pomocne as z, i (i)}
      <polyline class="zr-pomocna" points={tockeTekst(z.tocke)} />
    {/each}

    <!-- meta -->
    {#if geo.meta}
      <g class="zr-meta" class:zr-pogodak={geo.meta.pogodak}>
        <circle cx={geo.meta.x} cy={geo.meta.y} r={geo.meta.r + 6} />
        <circle cx={geo.meta.x} cy={geo.meta.y} r={geo.meta.r} />
        <circle class="zr-meta-s" cx={geo.meta.x} cy={geo.meta.y} r="3" />
      </g>
    {/if}

    <!-- predmet, slika, klon, oko -->
    {#if geo.predmet}
      {#if geo.slika}
        {@render lik(geo.slika, "zr-slika")}
      {/if}
      {@render lik(geo.predmet, "zr-predmet")}
      {#if klonCrtez}
        <g
          class="zr-klon-g"
          class:lx-handle={aktivno}
          class:zr-ok={klonCrtez.status === "ok"}
          class:zr-krivo={klonCrtez.status === "krivo"}
          role="slider"
          tabindex={aktivno ? 0 : -1}
          aria-label="Klon: povuci lijevo-desno na mjesto slike"
          aria-valuenow={st.klon}
          aria-valuetext="{formatNumber(st.klon)} {spec.jedinica ??
            'cm'} iza zrcala"
          onpointerdown={(e) => down(e, "klon")}
          onkeydown={(e) => aktivno && key(e)}
        >
          <rect
            class="zr-hit"
            x={klonCrtez.x - 24}
            y={klonCrtez.dno - klonCrtez.visina - 6}
            width="48"
            height={klonCrtez.visina + 12}
          />
          {@render lik(klonCrtez, "zr-klon")}
          {#if aktivno}
            <text
              class="zr-klon-t"
              x={klonCrtez.x}
              y={klonCrtez.dno - klonCrtez.visina - 12}
              text-anchor="middle">‹ klon ›</text
            >
          {/if}
        </g>
      {/if}
    {/if}

    <!-- zrake -->
    {#each zrakeSlike as z, i (i)}
      {@const crtaj = IZLAZNE.has(z.vrsta) && objava < 1}
      {#if !z.crtkano}
        <polyline
          class="zr-sjaj"
          points={tockeTekst(z.tocke)}
          stroke-width={sirinaZrake(z) + (z.tanka ? 3 : 5)}
          opacity={prozirnost(z) * 0.25}
          pathLength={crtaj ? 1 : undefined}
          stroke-dasharray={crtaj ? `${objava} 1` : undefined}
        />
      {/if}
      <polyline
        class="zr-zraka"
        class:zr-crtkano={z.crtkano}
        class:zr-produzetak={z.vrsta === "produzetak"}
        points={tockeTekst(z.tocke)}
        stroke-width={sirinaZrake(z)}
        opacity={prozirnost(z)}
        pathLength={crtaj ? 1 : undefined}
        stroke-dasharray={crtaj ? `${objava} 1` : undefined}
      />
      {#each tockice(z, vrijeme) as p, j (j)}
        <circle
          class="zr-foton"
          cx={p[0]}
          cy={p[1]}
          r="1.7"
          opacity={prozirnost(z)}
        />
      {/each}
    {/each}

    <!-- ponuđene zrake -->
    {#each geo.kandidati as k (k.id)}
      {@const s = statusOdabira(k.id)}
      <g
        class="zr-kand zr-kand-{s ?? 'nista'}"
        class:zr-kand-aktivno={aktivno}
        onclick={() => odaberiZraku(k.id)}
        role="presentation"
      >
        <polyline class="zr-kand-hit" points={tockeTekst(k.tocke)} />
        <polyline
          class="zr-kand-l"
          points={tockeTekst(k.tocke)}
          marker-end="url(#zr-smjer-{uid})"
        />
        <circle class="zr-kand-c" cx={k.oznaka[0]} cy={k.oznaka[1]} r="12" />
        <text
          class="zr-kand-t"
          x={k.oznaka[0]}
          y={k.oznaka[1] + 4.5}
          text-anchor="middle">{k.slovo}</text
        >
      </g>
    {/each}

    <!-- oznake lukova, natpisi, kote -->
    {#each geo.lukovi as l, i (i)}
      <text
        class="zr-luk-t {OZNAKE_VRSTE[l.vrsta] ?? ''}"
        x={l.oznaka.x}
        y={l.oznaka.y}
        text-anchor={l.oznaka.sidro ?? "middle"}
        >{#each dijelovi(l.oznaka.tekst) as d, j (j)}{#if d.sub}<tspan
              baseline-shift="sub"
              font-size="9">{d.t}</tspan
            >{:else}{d.t}{/if}{/each}</text
      >
    {/each}
    {#each geo.natpisi as n, i (i)}
      <text
        class="zr-natpis zr-n-{n.vrsta}"
        x={n.x}
        y={n.y}
        text-anchor={n.desno
          ? "end"
          : n.vrsta === "granicni"
            ? "middle"
            : "middle"}
        >{#each dijelovi(n.tekst) as d, j (j)}{#if d.sub}<tspan
              baseline-shift="sub"
              font-size="9">{d.t}</tspan
            >{:else}{d.t}{/if}{/each}</text
      >
    {/each}
    {#each geo.kote as k, i (i)}
      {@const mx = (k.od[0] + k.do[0]) / 2}
      {@const my = (k.od[1] + k.do[1]) / 2}
      <line
        class="zr-kota"
        x1={k.od[0]}
        y1={k.od[1]}
        x2={k.do[0]}
        y2={k.do[1]}
        marker-start="url(#zr-kraj-{uid})"
        marker-end="url(#zr-kraj-{uid})"
      />
      {#if k.oznaka}
        <text class="zr-kota-t" x={k.oznaka[0]} y={k.oznaka[1] + 4}
          >{k.tekst}</text
        >
      {:else if k.okomita}
        <text class="zr-kota-t" x={mx - 6} y={my + 4} text-anchor="end"
          >{k.tekst}</text
        >
      {:else if geo.predmet}
        <text class="zr-kota-t" x={mx} y={my - 5} text-anchor="middle"
          >{k.tekst}</text
        >
      {:else}
        <text class="zr-kota-t" x={Math.max(k.od[0], k.do[0]) + 6} y={my + 4}
          >{k.tekst}</text
        >
      {/if}
    {/each}

    <!-- oko promatrača -->
    {#if geo.oko}
      <g
        class="zr-oko"
        class:lx-handle={geo.oko.pomicno}
        role={geo.oko.pomicno ? "slider" : undefined}
        tabindex={geo.oko.pomicno ? 0 : undefined}
        aria-label={geo.oko.pomicno ? "Oko promatrača: povuci ga" : undefined}
        aria-valuenow={geo.oko.pomicno ? geo.oko.y : undefined}
        onpointerdown={(e) => down(e, "oko")}
      >
        {#if geo.oko.pomicno}<circle
            class="zr-hit"
            cx={geo.oko.x}
            cy={geo.oko.y}
            r="22"
          />{/if}
        <path
          class="zr-oko-b"
          d="M{geo.oko.x - 12},{geo.oko.y} Q{geo.oko.x},{geo.oko.y - 10} {geo
            .oko.x + 12},{geo.oko.y} Q{geo.oko.x},{geo.oko.y + 10} {geo.oko.x -
            12},{geo.oko.y} z"
        />
        <circle class="zr-oko-z" cx={geo.oko.x + 4} cy={geo.oko.y} r="3.6" />
      </g>
    {/if}

    <!-- laser -->
    {#if geo.laser}
      <g
        class="zr-laser"
        transform="translate({geo.laser.x} {geo.laser.y}) rotate({geo.laser
          .kut})"
      >
        <rect
          class="zr-laser-tijelo"
          x="-38"
          y="-7"
          width="38"
          height="14"
          rx="4"
        />
        <rect
          class="zr-laser-glava"
          x="-4"
          y="-4.5"
          width="6"
          height="9"
          rx="1.5"
        />
        <line class="zr-laser-crta" x1="-30" y1="-3" x2="-12" y2="-3" />
      </g>
      {#if mozeLaser && laserRucka}
        <g
          class="lx-handle zr-rucka-g"
          role="slider"
          tabindex="0"
          aria-label="Laser: povuci ručku ili koristi strelice za okretanje"
          aria-valuemin="0"
          aria-valuemax="89"
          aria-valuenow={geo.skriveno.kut ? undefined : st.kut}
          aria-valuetext={geo.skriveno.kut
            ? "kut je skriven"
            : `upadni kut ${formatNumber(st.kut)}°`}
          onpointerdown={(e) => down(e, "laser")}
          onkeydown={key}
        >
          <circle class="zr-hit" cx={laserRucka[0]} cy={laserRucka[1]} r="24" />
          <circle
            class="zr-rucka"
            class:zr-ceka={!vuce && postavi && poslano == null}
            cx={laserRucka[0]}
            cy={laserRucka[1]}
            r="10"
          />
          <path
            class="zr-rucka-strelice"
            d="M{laserRucka[0] - 4},{laserRucka[1] -
              3} l4,-4 l4,4 M{laserRucka[0] - 4},{laserRucka[1] + 3} l4,4 l4,-4"
            transform="rotate({geo.laser.kut +
              90} {laserRucka[0]} {laserRucka[1]})"
          />
        </g>
      {/if}
      <circle class="zr-upad" cx={geo.laser.o[0]} cy={geo.laser.o[1]} r="2.6" />
    {/if}
  </svg>
</figure>

{#if cipovi.length}
  <div class="zr-cipovi" aria-live="polite">
    {#each cipovi as c (c.kljuc)}
      <div class="zr-cip">
        <span class="zr-cip-o"
          >{#each dijelovi(c.oznaka) as d, j (j)}{#if d.sub}<sub>{d.t}</sub
              >{:else}{d.t}{/if}{/each}</span
        >
        <span class="zr-cip-v">{c.tekst}</span>
        {#if c.naziv}<span class="zr-cip-n">{c.naziv}</span>{/if}
      </div>
    {/each}
  </div>
{/if}

{#if klizaci.length}
  <div class="zr-klizaci">
    {#each klizaci as k (k.id)}
      <div class="zr-klizac">
        <div class="zr-klizac-h">
          <label for="zr-{uid}-{k.id}">{k.oznaka}</label>
          <output for="zr-{uid}-{k.id}">{fmtKlizac(k)}</output>
        </div>
        <input
          id="zr-{uid}-{k.id}"
          type="range"
          min={k.min}
          max={k.max}
          step={k.korak}
          value={k.id === "n" ? st.n2 : st[k.id]}
          aria-valuetext={fmtKlizac(k)}
          oninput={(e) => postaviKlizac(k, e.currentTarget.value)}
        />
      </div>
    {/each}
  </div>
{/if}

{#if uputa && (gledanje || aktivno)}
  <p class="zr-uputa">{uputa}</p>
{/if}

{#if (istrazi && !slika) || postavi}
  <div class="lx-actions zr-akcije">
    {#if mozeLaser || (postavi && slika && aktivno)}
      <button
        type="button"
        class="btn btn-ghost zr-fino"
        onclick={() => pomakni(-1)}
        aria-label={slika
          ? "Pomakni klona prema zrcalu"
          : "Smanji upadni kut za 0,5°"}>{slika ? "‹" : "−0,5°"}</button
      >
      <button
        type="button"
        class="btn btn-ghost zr-fino"
        onclick={() => pomakni(1)}
        aria-label={slika
          ? "Pomakni klona od zrcala"
          : "Povećaj upadni kut za 0,5°"}>{slika ? "›" : "+0,5°"}</button
      >
    {/if}
    {#if postavi}
      <button
        type="button"
        class="btn btn-primary"
        onclick={provjeriPostavi}
        disabled={locked}>Provjeri</button
      >
    {/if}
  </div>
{/if}

{#if izracunaj}
  <form class="zr-polja" onsubmit={provjeriIzracunaj}>
    {#each spec.pitaj as p, i (i)}
      {@const j = pitanjeJedinica(p)}
      <div class="zr-polje">
        <label class="zr-polje-o" for="zr-{uid}-p{i}"
          ><Md text={pitanjeOznaka(p)} inline /></label
        >
        <span class="zr-polje-u">
          <input
            id="zr-{uid}-p{i}"
            class="inp lx-broj-inp"
            class:ok={ishod?.tocno || pokazi}
            class:bad={ishod &&
              !ishod.tocno &&
              !ishod.prazno &&
              ishod.polje === i}
            inputmode="decimal"
            autocomplete="off"
            placeholder="?"
            disabled={locked}
            bind:value={unosi[i]}
          />
          <span class="lx-unit">{j}</span>
          {#if j === "m/s" && !locked}
            <button
              type="button"
              class="btn btn-quiet zr-pot"
              onclick={() => potencija(i)}
              aria-label="Dodaj potenciju broja 10">·10ⁿ</button
            >
          {/if}
        </span>
      </div>
    {/each}
    <div class="lx-actions">
      <button
        class="btn btn-primary"
        type="submit"
        disabled={locked || unosi.every((u) => !String(u).trim())}
        >Provjeri</button
      >
    </div>
  </form>
{/if}

{#if odaberi}
  <div class="zr-odabir" role="radiogroup" aria-label="Ponuđene zrake">
    {#each kandidatiPoSlovu as k (k.id)}
      {@const s = statusOdabira(k.id)}
      <button
        type="button"
        role="radio"
        aria-checked={odabrano === k.id}
        class="zr-slovo"
        class:sel={s === "odabrano"}
        class:ok={s === "ok"}
        class:bad={s === "krivo"}
        disabled={!aktivno}
        onclick={() => odaberiZraku(k.id)}>{k.slovo}</button
      >
    {/each}
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriOdabir}
      disabled={locked || !odabrano}>Provjeri</button
    >
  </div>
{/if}

<style>
  .zr-tekst {
    margin-bottom: 10px;
  }
  .zr {
    --zr-snop: var(--danger);
    margin-bottom: 8px;
  }
  .zr svg {
    touch-action: manipulation;
    overflow: visible;
  }
  .zr-sredstvo {
    stroke: none;
  }
  .zr-granica {
    stroke: var(--border-strong);
    stroke-width: 1.5;
  }
  .zr-sredstvo-t {
    fill: var(--text-dim);
    font: 600 11.5px var(--font-sans);
  }
  .zr-zrcalo {
    stroke: color-mix(in srgb, var(--text-dim) 70%, var(--lx-water));
    stroke-width: 4;
    stroke-linecap: round;
  }
  .zr-srafura {
    stroke: var(--text-faint);
    stroke-width: 1.2;
  }
  .zr-pod {
    stroke: var(--border-strong);
    stroke-width: 1.5;
  }
  .zr-crtica {
    stroke: var(--text-faint);
    stroke-width: 1;
  }
  .zr-crtica-t {
    fill: var(--text-faint);
    font: 500 10px var(--font-mono);
  }
  .zr-normala {
    stroke: var(--text-faint);
    stroke-width: 1.2;
    stroke-dasharray: 5 4;
  }
  .zr-normala-t {
    fill: var(--text-faint);
    font: italic 500 10px var(--font-sans);
  }
  .zr-luk {
    fill: none;
    stroke-width: 1.8;
    stroke: var(--text-dim);
  }
  .zr-luk.zr-l-alpha {
    stroke: var(--primary);
  }
  .zr-luk.zr-l-odb,
  .zr-luk.zr-l-beta {
    stroke: var(--success);
  }
  .zr-luk.zr-l-phi {
    stroke: var(--warn);
  }
  .zr-luk.zr-l-izmedu {
    stroke: var(--text-faint);
    stroke-dasharray: 3 3;
  }
  .zr-luk-t {
    font: 700 12.5px var(--font-sans);
    fill: var(--text-dim);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3.5px;
    stroke-linejoin: round;
  }
  .zr-luk-t.zr-l-alpha {
    fill: var(--primary);
  }
  .zr-luk-t.zr-l-odb,
  .zr-luk-t.zr-l-beta {
    fill: var(--success);
  }
  .zr-luk-t.zr-l-phi {
    fill: var(--warn);
  }
  .zr-pomocna {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1.4;
    stroke-dasharray: 2 4;
  }
  .zr-sjaj {
    fill: none;
    stroke: var(--zr-snop);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .zr-zraka {
    fill: none;
    stroke: var(--zr-snop);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .zr-zraka.zr-produzetak {
    stroke: var(--text-dim);
  }
  .zr-zraka.zr-crtkano {
    stroke-dasharray: 5 4;
    stroke-width: 1.4;
  }
  .zr-foton {
    fill: color-mix(in srgb, var(--zr-snop) 30%, #fff);
    pointer-events: none;
  }
  .zr-upad {
    fill: var(--text);
  }
  .zr-natpis {
    font: 600 12px var(--font-sans);
    fill: var(--text-dim);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
    stroke-linejoin: round;
  }
  .zr-n-pitanje {
    fill: var(--primary);
    font-weight: 700;
    font-size: 13px;
  }
  .zr-n-totalna {
    fill: var(--warn);
    font-weight: 700;
  }
  .zr-n-granicni {
    fill: var(--text-faint);
    font-size: 11px;
  }
  .zr-n-brzina {
    font: 600 11px var(--font-mono);
  }
  .zr-kota {
    stroke: var(--text-dim);
    stroke-width: 1.1;
  }
  .zr-kota-vrh {
    fill: var(--text-dim);
  }
  .zr-kota-t {
    fill: var(--text);
    font: 600 11.5px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .zr-smjer-vrh {
    fill: var(--zr-snop);
  }
  .zr-meta circle {
    fill: none;
    stroke: var(--primary);
    stroke-width: 1.6;
  }
  .zr-meta .zr-meta-s {
    fill: var(--primary);
  }
  .zr-meta.zr-pogodak circle {
    stroke: var(--success);
    fill: color-mix(in srgb, var(--success) 18%, transparent);
  }
  .zr-laser-tijelo {
    fill: color-mix(in srgb, var(--text) 82%, var(--bg-elev));
    stroke: var(--text);
    stroke-width: 1;
  }
  .zr-laser-glava {
    fill: var(--zr-snop);
  }
  .zr-laser-crta {
    stroke: var(--bg-elev);
    stroke-width: 1.4;
    opacity: 0.6;
  }
  .zr-rucka-g {
    outline: none;
  }
  .zr-hit {
    fill: transparent;
  }
  .zr-rucka {
    fill: color-mix(in srgb, var(--primary) 22%, var(--bg-elev));
    stroke: var(--primary);
    stroke-width: 2;
  }
  .zr-rucka-g:focus-visible .zr-rucka {
    stroke-width: 3.5;
  }
  .zr-rucka-strelice {
    fill: none;
    stroke: var(--primary);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
  }
  .zr-rucka.zr-ceka {
    animation: zr-puls 1.4s ease-in-out infinite;
  }
  @keyframes zr-puls {
    50% {
      r: 13px;
    }
  }
  .zr-lik {
    fill: none;
    stroke: var(--text);
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .zr-lik circle:first-child,
  .zr-lik rect {
    fill: var(--bg-elev);
  }
  .zr-lik .zr-oko-lika {
    fill: var(--text);
    stroke: none;
  }
  .zr-lik .zr-vrh {
    fill: var(--text);
  }
  .zr-lik .zr-plamen {
    fill: var(--warn);
    stroke: color-mix(in srgb, var(--warn) 60%, var(--danger));
    stroke-width: 1;
  }
  .zr-slika {
    opacity: 0.5;
    stroke-dasharray: 4 3;
  }
  .zr-klon {
    stroke: var(--primary);
  }
  .zr-klon-g.zr-ok .zr-klon {
    stroke: var(--success);
  }
  .zr-klon-g.zr-krivo .zr-klon {
    stroke: var(--danger);
  }
  .zr-klon-g {
    outline: none;
  }
  .zr-klon-g:focus-visible .zr-klon {
    stroke-width: 3.4;
  }
  .zr-klon-t {
    fill: var(--primary);
    font: 700 11px var(--font-sans);
  }
  .zr-oko-b {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 1.6;
  }
  .zr-oko-z {
    fill: var(--primary);
  }
  .zr-oko {
    outline: none;
  }
  .zr-oko:focus-visible .zr-oko-b {
    stroke-width: 3;
  }
  .zr-kand {
    cursor: default;
  }
  .zr-kand-aktivno {
    cursor: pointer;
  }
  .zr-kand-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 26;
  }
  .zr-kand-l {
    fill: none;
    stroke: var(--zr-snop);
    stroke-width: 2.2;
    opacity: 0.6;
    stroke-dasharray: 7 4;
  }
  .zr-kand-c {
    fill: var(--bg-elev);
    stroke: var(--border-strong);
    stroke-width: 1.5;
  }
  .zr-kand-t {
    font: 700 13px var(--font-sans);
    fill: var(--text);
    pointer-events: none;
  }
  .zr-kand-odabrano .zr-kand-l {
    opacity: 1;
    stroke-width: 3;
    stroke-dasharray: none;
  }
  .zr-kand-odabrano .zr-kand-c {
    stroke: var(--primary);
    stroke-width: 2.5;
    fill: var(--primary-dim, var(--bg-elev));
  }
  .zr-kand-krivo .zr-kand-c {
    stroke: var(--danger);
    stroke-width: 2.5;
  }
  .zr-kand-ok .zr-kand-l {
    opacity: 1;
    stroke-dasharray: none;
    stroke-width: 3;
  }
  .zr-kand-ok .zr-kand-c {
    stroke: var(--success);
    stroke-width: 2.5;
  }
  .zr-kand-blijedo {
    opacity: 0.3;
  }
  .zr-cipovi {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 0 auto 12px;
    max-width: 520px;
  }
  .zr-cip {
    display: grid;
    grid-template-columns: auto auto;
    align-items: baseline;
    column-gap: 8px;
    padding: 6px 11px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .zr-cip-o {
    font-style: italic;
    font-weight: 600;
    color: var(--text-dim);
    font-size: 14px;
  }
  .zr-cip-v {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 14.5px;
    color: var(--text);
    white-space: nowrap;
  }
  .zr-cip-n {
    grid-column: 1 / -1;
    font-size: 11px;
    color: var(--text-faint);
  }
  .zr-klizaci {
    display: grid;
    gap: 10px;
    max-width: 440px;
    margin: 0 auto 10px;
  }
  .zr-klizac-h {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    font-size: 14px;
  }
  .zr-klizac-h label {
    color: var(--text-dim);
  }
  .zr-klizac-h output {
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .zr-klizac input {
    width: 100%;
    margin: 0;
    height: 30px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .zr-uputa {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 0 0 4px;
  }
  .zr-akcije {
    justify-content: center;
    margin-top: 8px;
  }
  .zr-fino {
    min-width: 56px;
    min-height: 40px;
    font-family: var(--font-mono);
  }
  .zr-polja {
    display: grid;
    gap: 10px;
  }
  .zr-polje {
    display: grid;
    grid-template-columns: minmax(64px, max-content) 1fr;
    align-items: center;
    gap: 6px 12px;
  }
  .zr-polje-o {
    color: var(--text-dim);
  }
  .zr-polje-u {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .zr-polje-u :global(.lx-broj-inp) {
    width: 116px;
  }
  .zr-pot {
    min-width: 44px;
    min-height: 36px;
    font-family: var(--font-mono);
  }
  .zr-odabir {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }
  .zr-slovo {
    width: 46px;
    height: 44px;
    border-radius: var(--r-lg);
    border: 1.5px solid var(--border);
    background: var(--bg-elev);
    color: var(--text);
    font: 700 16px var(--font-sans);
    cursor: pointer;
  }
  .zr-slovo.sel {
    border-color: var(--primary);
    background: var(--primary-dim);
  }
  .zr-slovo.ok {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 12%, transparent);
  }
  .zr-slovo.bad {
    border-color: var(--danger);
  }
  .zr-slovo:disabled {
    cursor: default;
  }
</style>
