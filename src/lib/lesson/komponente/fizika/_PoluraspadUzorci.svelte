<script>
  // poluraspad / uzorci: posude s kockicama-jezgrama, sat i graf N/N₀ (t). Fizika, geometrija, tekstovi i što je
  // skriveno dolaze iz katalog/fizika/poluraspad.js; ovdje se samo crta, animira sat i prosljeđuje unos.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Klizaci from "./_SileKlizaci.svelte";
  import Unos from "./_PoluraspadUnos.svelte";
  import {
    poluraspad,
    geometrijaUzoraka,
    kockica,
    stanjeKockica,
    grafUzoraka,
    prikazUzoraka,
    tMaxUzoraka,
    brzinaSata,
    zaokruziT,
    tIzX,
    analizaCilja,
    klizacT,
    uzorciOd,
    poljaIzracunaj,
    zapisVremena,
    jedinicaT,
    rijecJedinice,
    opisCilja,
  } from "$lib/lesson/katalog/fizika/poluraspad.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const istrazi = nacin === "istrazi";
  const prikaz = nacin === "prikaz";
  const izracunaj = nacin === "izracunaj";
  const postavi = nacin === "postavi";
  const zaustavi = nacin === "zaustavi";
  const slobodno = istrazi || prikaz;
  const uid = Math.random().toString(36).slice(2, 8);

  const geo = untrack(() => geometrijaUzoraka(spec));
  const tMax = untrack(() => tMaxUzoraka(spec));
  const brzina = untrack(() => brzinaSata(spec));
  const cilj = untrack(() => analizaCilja(spec));
  const jed = untrack(() => jedinicaT(spec));
  const tCiljaIzracun = untrack(() => spec.t ?? 0);

  // ── stanje ──
  // klizači: T_X… (istrazi) i t (postavi)
  let kl = $state(
    untrack(() =>
      Object.fromEntries(
        (spec.klizaci ?? []).map((k) => [k.id, k.pocetak ?? k.min]),
      ),
    ),
  );
  const sJedinicom = (k) => ({
    ...k,
    jedinica: k.jedinica ?? rijecJedinice(jedinicaT(spec), 5),
  });
  const klizaciT = untrack(() =>
    (spec.klizaci ?? []).filter((k) => k.id.startsWith("T_")).map(sJedinicom),
  );
  const klizacSata = untrack(() =>
    klizacT(spec) ? sJedinicom(klizacT(spec)) : null,
  );
  let t = $state(0); // sat (istrazi, prikaz, zaustavi dok teče)
  let igra = $state(false);
  let faza = $state("spreman"); // zaustavi: spreman | tece | stao
  let tStop = $state(null);
  let tOtkr = $state(0); // animacija otkrivanja: sat se zavrti od 0 do ciljnog t

  // ── provjera i otkrivanje ──
  let poslano = $state(null);
  let unosi = $state(untrack(() => (spec.pitaj ?? []).map(() => "")));
  const trenutno = () =>
    JSON.stringify(
      izracunaj ? unosi.map((x) => x.trim()) : postavi ? kl.t : tStop,
    );
  let neprom = $derived(poslano != null && poslano === trenutno());
  let otkriveno = $derived.by(() => {
    if (slobodno) return true;
    if (pokazi) return true;
    if (!neprom || !ishod) return false;
    if (ishod.tocno) return true;
    // postavi / zaustavi: učenik smije vidjeti ishod položaja koji je sam provjerio, dok ga ne pomakne
    // (nikad na zaključanoj kopiji pitanja)
    return (postavi || zaustavi) && !locked && !ishod.prazno;
  });
  // vrijeme do kojeg se sat zavrti nakon otkrivanja
  let tCilj = $derived(
    izracunaj ? tCiljaIzracun : postavi ? (kl.t ?? 0) : (tStop ?? 0),
  );

  // pokazi: sat na točno mjesto
  $effect(() => {
    if (!pokazi || !cilj) return;
    untrack(() => {
      if (postavi) kl = { ...kl, t: zaokruziT(spec, cilj.t) };
      if (zaustavi) {
        faza = "stao";
        tStop = Number(cilj.t.toFixed(6));
      }
    });
  });
  // na otkrivanje: sat se zavrti od 0 do t (bez animacije skoči)
  let animOtkr = $state(false);
  $effect(() => {
    if (slobodno) return;
    if (otkriveno) {
      untrack(() => {
        if (prefersReducedMotion.current) {
          tOtkr = tCilj;
          animOtkr = false;
        } else {
          tOtkr = 0;
          animOtkr = true;
        }
      });
    } else
      untrack(() => {
        animOtkr = false;
        tOtkr = 0;
      });
  });

  // vrijeme koje crtež pokazuje
  let tPrikaz = $derived.by(() => {
    if (slobodno) return t;
    if (izracunaj) return otkriveno ? tOtkr : 0;
    if (postavi) return otkriveno ? tOtkr : (kl.t ?? 0);
    // zaustavi
    if (otkriveno) return tOtkr;
    return faza === "tece" ? t : (tStop ?? 0);
  });
  let stanjeT = $derived(kl);
  let giba = $derived(
    (slobodno && igra) || animOtkr || (zaustavi && faza === "tece"),
  );
  let p = $derived(prikazUzoraka(spec, tPrikaz, otkriveno, stanjeT));
  let kocke = $derived(
    uzorciOd(spec).map((_, i) =>
      stanjeKockica(spec, i, tPrikaz, stanjeT, giba ? 0.12 : 0),
    ),
  );
  let graf = $derived(
    grafUzoraka(
      spec,
      {
        krivulje: p.vidljivo.krivulje,
        oznakeT: p.vidljivo.oznakeT,
        do: tPrikaz,
        kursor: true,
      },
      stanjeT,
    ),
  );
  // kockice kao tri putanje po posudi
  const putanja = (i, idx) => {
    const v = geo.vel;
    let d = "";
    for (const k of idx) {
      const q = kockica(geo, i, k);
      d += `M${q.x} ${q.y}h${v}v${v}h${-v}z`;
    }
    return d;
  };
  let putanje = $derived(
    kocke.map((st, i) => ({
      zive: putanja(i, st.zive),
      raspadnute: putanja(i, st.raspadnute),
      svjeze: putanja(i, st.svjeze),
    })),
  );

  // ── sat: jedna petlja ──
  let prikazPokrenut = false;
  onMount(() => {
    let id;
    let zadnji = 0;
    let akum = 0;
    const petlja = (now) => {
      const dt = zadnji ? Math.min(0.1, (now - zadnji) / 1000) : 0;
      zadnji = now;
      const skokovi = prefersReducedMotion.current;
      // uz smanjeno kretanje sat skače u koracima (pola T najkraćeg uzorka, četvrtina T u zaustavi)
      const korak = (v, brz, korakSim) => {
        if (!skokovi) return v + dt * brz;
        akum += dt;
        const korakReal = korakSim / brz;
        if (akum < korakReal) return v;
        akum = 0;
        return v + korakSim;
      };
      const Tmin = Math.min(...uzorciOd(spec).map((u) => u.T ?? 1));
      if (slobodno && igra) {
        t = Math.min(tMax, korak(t, brzina, Tmin / 2));
        if (t >= tMax) igra = false;
      }
      if (zaustavi && faza === "tece") {
        t = Math.min(tMax, korak(t, brzina, (cilj?.Teff ?? Tmin) / 4));
        if (t >= tMax) {
          faza = "stao";
          tStop = Number(tMax.toFixed(6));
        }
      }
      if (animOtkr) {
        const brz = Math.max(tCilj / 3.5, brzina);
        tOtkr = Math.min(tCilj, tOtkr + dt * brz);
        if (tOtkr >= tCilj) animOtkr = false;
      }
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    // prikaz: sat krene sam kad je widget na zaslonu
    let ob;
    if (prikaz && typeof IntersectionObserver !== "undefined" && figura) {
      ob = new IntersectionObserver(
        (e) => {
          if (e[0]?.isIntersecting && !prikazPokrenut) {
            prikazPokrenut = true;
            igra = true;
          }
        },
        { threshold: 0.3 },
      );
      ob.observe(figura);
    }
    return () => {
      cancelAnimationFrame(id);
      ob?.disconnect();
    };
  });

  function pokreni() {
    if (t >= tMax) t = 0;
    igra = !igra;
  }
  function ispocetka() {
    igra = false;
    t = 0;
  }

  // ── zaustavi ──
  function startStop() {
    if (locked || pokazi) return;
    if (faza === "tece") {
      faza = "stao";
      tStop = Number(t.toPrecision(3));
    } else {
      t = 0;
      tStop = null;
      faza = "tece";
    }
  }
  function zaustaviIspocetka() {
    if (locked || pokazi) return;
    faza = "spreman";
    tStop = null;
    t = 0;
  }

  // ── vučenje kursora po grafu ──
  const vuceSe = () => !locked && !pokazi && (istrazi || postavi);
  let svgEl = $state();
  let figura = $state();
  let vuce = $state(false);
  function tocka(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  }
  function postaviT(x) {
    const novo = tIzX(spec, x);
    if (postavi) kl = { ...kl, t: novo };
    else {
      igra = false;
      t = novo;
    }
  }
  function down(e) {
    if (!vuceSe()) return;
    const q = tocka(e);
    if (!q || q.y < graf.y0 - 14 || q.y > graf.y1 + 30) return;
    e.preventDefault();
    vuce = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    postaviT(q.x);
  }
  function move(e) {
    if (!vuce) return;
    const q = tocka(e);
    if (q) postaviT(q.x);
  }
  const up = () => (vuce = false);
  function key(e) {
    if (!vuceSe()) return;
    const kor = postavi ? klizacSata.korak : tMax / 60;
    const d = {
      ArrowRight: kor,
      ArrowUp: kor,
      ArrowLeft: -kor,
      ArrowDown: -kor,
      PageUp: 5 * kor,
      PageDown: -5 * kor,
    }[e.key];
    if (!d) return;
    e.preventDefault();
    const sad = postavi ? (kl.t ?? 0) : t;
    const novo = zaokruziT(spec, sad + d);
    if (postavi) kl = { ...kl, t: novo };
    else {
      igra = false;
      t = novo;
    }
  }

  // ── slanje ──
  function provjeriVrijeme() {
    if (locked || pokazi) return;
    poslano = trenutno();
    onodgovor(postavi ? kl.t : tStop);
  }
  function provjeriUnos(v) {
    if (locked) return;
    poslano = trenutno();
    onodgovor(v);
  }
  const polja = untrack(() => (izracunaj ? poljaIzracunaj(spec) : []));

  const uputa = untrack(() => {
    if (postavi)
      return `Pomakni sat (klizač ispod ili kursor na grafu), pa provjeri. Uzorak je u olovnoj kutiji dok ne provjeriš.`;
    if (zaustavi)
      return `Pokreni sat i pritisni **Stop** kad ${opisCilja(spec)}. Uzorak je u olovnoj kutiji, ali na osi vremena vidiš oznake T, 2T, 3T…`;
    if (izracunaj)
      return `Sat stoji na 0. Nakon točnog odgovora zavrti se do t = ${zapisVremena(tCiljaIzracun, jed)}.`;
    return "";
  });
  const r1 = (n) => Math.round(n * 10) / 10;
  const vrhPoklopca = (po) => `translateY(${-po.h - 30}px)`;
  const trolist = (cx, cy, r) => {
    // znak radioaktivnosti: tri isječka oko središta
    let d = "";
    for (let k = 0; k < 3; k++) {
      const a0 = ((-90 + k * 120 - 30) * Math.PI) / 180;
      const a1 = ((-90 + k * 120 + 30) * Math.PI) / 180;
      const ri = r * 0.3;
      d += `M${r1(cx + ri * Math.cos(a0))} ${r1(cy + ri * Math.sin(a0))}L${r1(cx + r * Math.cos(a0))} ${r1(cy + r * Math.sin(a0))}A${r} ${r} 0 0 1 ${r1(cx + r * Math.cos(a1))} ${r1(cy + r * Math.sin(a1))}L${r1(cx + ri * Math.cos(a1))} ${r1(cy + ri * Math.sin(a1))}A${ri} ${ri} 0 0 0 ${r1(cx + ri * Math.cos(a0))} ${r1(cy + ri * Math.sin(a0))}Z`;
    }
    return d;
  };
  // kazaljka: jedan krug = jedan T najkraćeg uzorka
  let kut = $derived(
    (tPrikaz / Math.min(...uzorciOd(spec).map((u) => u.T ?? 1))) * 360,
  );
  const ciljX = untrack(() =>
    izracunaj ? graf.x0 + (tCiljaIzracun / tMax) * (graf.x1 - graf.x0) : null,
  );
  const dirljivo = istrazi || postavi;
</script>

{#if slobodno}
  <div class="pr-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure pr" bind:this={figura}>
  <svg
    bind:this={svgEl}
    viewBox="0 0 {geo.W} {geo.H}"
    role="img"
    aria-label={p.aria}
    class:vuce
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
  >
    <defs>
      <pattern
        id="pr-olovo-{uid}"
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="8" height="8" class="pr-olovo-bg" />
        <line x1="0" y1="0" x2="0" y2="8" class="pr-olovo-crta" />
      </pattern>
    </defs>

    <!-- posude -->
    {#each geo.posude as po, i (i)}
      {@const u = p.uzorci[i]}
      <g style:--boja="var(--{po.boja})">
        <circle
          cx={po.naslovX + 5}
          cy={po.naslovY - 4}
          r="5"
          class="pr-tocka-boja"
        />
        <text x={po.naslovX + 15} y={po.naslovY} class="pr-naslov"
          ><tspan class="pr-oznaka">{u.oznaka}</tspan>
          <tspan dx="4" class="pr-dim">{u.naslov}</tspan></text
        >
        <rect
          x={po.x - 4}
          y={po.y - 4}
          width={po.w + 8}
          height={po.h + 8}
          rx="8"
          class="pr-posuda"
        />
        <path d={putanje[i].raspadnute} class="pr-raspadnuta" />
        <path d={putanje[i].zive} class="pr-ziva" />
        {#if putanje[i].svjeze}<path
            d={putanje[i].svjeze}
            class="pr-svjeza"
          />{/if}
        <!-- olovna kutija: pokriva uzorak do provjere -->
        <g
          class="pr-poklopac"
          class:otvoren={!u.poklopljen}
          style:transform={u.poklopljen ? "none" : vrhPoklopca(po)}
          aria-hidden="true"
        >
          <rect
            x={po.x - 5}
            y={po.y - 5}
            width={po.w + 10}
            height={po.h + 10}
            rx="8"
            fill="url(#pr-olovo-{uid})"
            class="pr-poklopac-okvir"
          />
          <circle
            cx={po.x + po.w / 2}
            cy={po.y + po.h / 2 - 10}
            r="22"
            class="pr-znak-bg"
          />
          <path
            d={trolist(po.x + po.w / 2, po.y + po.h / 2 - 10, 18)}
            class="pr-znak"
          />
          <circle
            cx={po.x + po.w / 2}
            cy={po.y + po.h / 2 - 10}
            r="3.6"
            class="pr-znak"
          />
          <text
            x={po.x + po.w / 2}
            y={po.y + po.h / 2 + 30}
            text-anchor="middle"
            class="pr-poklopac-tekst">olovna kutija</text
          >
          <text
            x={po.x + po.w / 2}
            y={po.y + po.h / 2 + 45}
            text-anchor="middle"
            class="pr-poklopac-mali">otvara se nakon provjere</text
          >
        </g>
        {#if u.brojka}
          <text
            x={po.x + po.w / 2}
            y={po.brojkaY}
            text-anchor="middle"
            class="pr-brojka">{u.brojka}</text
          >
        {/if}
      </g>
    {/each}

    <!-- sat -->
    <g class="pr-sat">
      <circle
        cx={geo.sat.cx}
        cy={geo.sat.cy}
        r={geo.sat.r}
        class="pr-sat-lice"
      />
      <rect
        x={geo.sat.cx - 3}
        y={geo.sat.cy - geo.sat.r - 5}
        width="6"
        height="4"
        rx="1"
        class="pr-sat-gumb"
      />
      <line
        x1={geo.sat.cx}
        y1={geo.sat.cy}
        x2={geo.sat.cx}
        y2={geo.sat.cy - geo.sat.r + 3}
        class="pr-sat-kazaljka"
        style:transform="rotate({r1(kut)}deg)"
        style:transform-origin="{geo.sat.cx}px {geo.sat.cy}px"
      />
      <circle cx={geo.sat.cx} cy={geo.sat.cy} r="1.8" class="pr-sat-os" />
      <text x={geo.sat.tekstX} y={geo.sat.tekstY} class="pr-sat-tekst"
        >{p.sat}</text
      >
      {#if p.nT}
        <text x={geo.sat.tekstX} y={geo.sat.tekstY + 15} class="pr-sat-n"
          >= {p.nT}</text
        >
      {/if}
      {#if p.omjer}
        <text
          x={geo.W - 16}
          y={geo.sat.tekstY}
          text-anchor="end"
          class="pr-omjer">{p.omjer}</text
        >
      {/if}
    </g>

    <!-- graf N/N₀ (t) -->
    <g class="pr-graf">
      <rect
        x={graf.x0}
        y={graf.y0}
        width={graf.x1 - graf.x0}
        height={graf.y1 - graf.y0}
        class="pr-graf-pozadina"
      />
      {#each graf.osY as o (o.tekst)}
        <line
          x1={graf.x0}
          x2={graf.x1}
          y1={o.y}
          y2={o.y}
          class={o.crtkano ? "pr-razina" : "pr-razina-1"}
        />
        <text
          x={graf.x0 - 6}
          y={o.y + 4}
          text-anchor="end"
          class="pr-os pr-os-y">{o.tekst}</text
        >
      {/each}
      <text x={graf.x0 - 6} y={graf.y0 - 8} text-anchor="end" class="pr-os-ime"
        >N/N₀</text
      >
      {#each graf.osX as o, k (k)}
        <line
          x1={o.x}
          x2={o.x}
          y1={graf.y1}
          y2={graf.y1 + 4}
          class="pr-os-crta"
        />
        {#if o.natpis}
          <text x={o.x} y={graf.y1 + 16} text-anchor="middle" class="pr-os"
            >{o.tekst}</text
          >
        {/if}
      {/each}
      <text x={graf.x1} y={graf.y1 + 30} text-anchor="end" class="pr-os-ime"
        >t ({graf.jedinica})</text
      >
      {#each graf.oznakeT as o (o.tekst)}
        <line x1={o.x} x2={o.x} y1={graf.y0} y2={graf.y1} class="pr-oznaka-T" />
        <text
          x={o.x}
          y={graf.y0 + 12}
          text-anchor="middle"
          class="pr-oznaka-T-t">{o.tekst}</text
        >
      {/each}
      {#if ciljX != null}
        <line x1={ciljX} x2={ciljX} y1={graf.y0} y2={graf.y1} class="pr-cilj" />
      {/if}
      {#each graf.krivulje as k (k.uzorak)}
        <polyline
          points={k.tocke.map((q) => q.join(",")).join(" ")}
          class="pr-krivulja"
          style:--boja="var(--{k.boja})"
        />
      {/each}
      {#each graf.tockeT as q, k (k)}
        <g style:--boja="var(--{q.boja})">
          <circle cx={q.x} cy={q.y} r="3.2" class="pr-tockaT" />
          {#if q.natpis}
            <text x={q.x + q.dx} y={q.y + q.dy} class="pr-tockaT-t"
              >{q.tekst}</text
            >
          {/if}
        </g>
      {/each}
      {#if graf.kursor != null}
        <line
          x1={graf.kursor}
          x2={graf.kursor}
          y1={graf.y0 - 4}
          y2={graf.y1}
          class="pr-kursor"
        />
        {#if dirljivo && !locked && !pokazi}
          <g
            class="pr-rucka"
            role="slider"
            tabindex="0"
            aria-label="Sat: povuci za promjenu vremena"
            aria-valuemin={0}
            aria-valuemax={tMax}
            aria-valuenow={postavi ? kl.t : t}
            aria-valuetext={p.sat}
            onkeydown={key}
          >
            <circle
              cx={graf.kursor}
              cy={graf.y1}
              r="16"
              class="pr-rucka-meta"
            />
            <circle cx={graf.kursor} cy={graf.y1} r="7" class="pr-rucka-vid" />
          </g>
        {/if}
      {/if}
    </g>
  </svg>
  {#if dirljivo && !locked && !pokazi}
    <figcaption class="pr-napomena">Povuci kružić po osi vremena.</figcaption>
  {/if}
</figure>

<!-- upravljanje -->
{#if slobodno}
  <div class="lx-actions pr-akcije">
    <button type="button" class="btn btn-primary" onclick={pokreni}
      >{igra ? "⏸ Zaustavi" : t >= tMax ? "↺ Ponovi" : "▶ Pokreni sat"}</button
    >
    <button
      type="button"
      class="btn btn-quiet"
      onclick={ispocetka}
      disabled={t === 0 && !igra}>↺ Ispočetka</button
    >
  </div>
  {#if istrazi && klizaciT.length}
    <Klizaci klizaci={klizaciT} bind:vrijednosti={kl} />
  {/if}
{:else if izracunaj}
  {#if !locked && !pokazi}<p class="pr-uputa">
      <Md text={uputa} inline />
    </p>{/if}
  <Unos
    {polja}
    bind:unosi
    {locked}
    tocno={!!ishod?.tocno && neprom}
    onposalji={provjeriUnos}
  />
{:else if postavi}
  {#if !locked && !pokazi}<p class="pr-uputa">
      <Md text={uputa} inline />
    </p>{/if}
  <Klizaci
    klizaci={[{ ...klizacSata, oznaka: klizacSata.oznaka ?? "sat" }]}
    bind:vrijednosti={kl}
    disabled={locked || pokazi}
  />
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriVrijeme}
      disabled={locked || pokazi}>Provjeri</button
    >
  </div>
{:else if zaustavi}
  {#if !locked && !pokazi}<p class="pr-uputa">
      <Md text={uputa} inline />
    </p>{/if}
  <div class="lx-actions pr-akcije">
    {#if faza !== "stao"}
      <button
        type="button"
        class="btn btn-primary pr-stop"
        class:tece={faza === "tece"}
        onclick={startStop}
        disabled={locked || pokazi}
        >{faza === "tece" ? "■ Stop" : "▶ Pokreni sat"}</button
      >
    {:else}
      <button
        type="button"
        class="btn btn-primary"
        onclick={provjeriVrijeme}
        disabled={locked || pokazi || neprom}>Provjeri</button
      >
      <button
        type="button"
        class="btn btn-quiet"
        onclick={zaustaviIspocetka}
        disabled={locked || pokazi}>↺ Ispočetka</button
      >
    {/if}
  </div>
  {#if faza === "stao" && tStop != null && !pokazi}
    <p class="pr-napomena pr-lijevo">
      Zaustavio si sat na {zapisVremena(tStop, jed)}.
    </p>
  {/if}
{/if}

{#if pokazi && !slobodno}
  <p class="lx-solution">Točan odgovor: {poluraspad.tocanOdgovor(spec)}</p>
{/if}

<style>
  .pr-tekst {
    margin-bottom: 10px;
  }
  .pr {
    max-width: 460px;
    margin-bottom: 6px;
  }
  .pr svg {
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .pr-napomena {
    text-align: right;
    font-size: 11px;
    color: var(--text-faint);
    margin: 3px 0 0;
  }
  .pr-lijevo {
    text-align: left;
    font-size: 13px;
    color: var(--text-dim);
  }
  .pr-uputa {
    font-size: 14px;
    color: var(--text-dim);
    margin: 4px 0 10px;
  }
  .pr-akcije {
    gap: 8px;
  }
  .pr-stop {
    min-width: 150px;
  }
  .pr-stop.tece {
    background: var(--danger);
    border-color: var(--danger);
  }
  .pr-naslov {
    font-size: 13px;
    fill: var(--text);
  }
  .pr-oznaka {
    font-weight: 700;
  }
  .pr-dim {
    fill: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 12px;
  }
  .pr-tocka-boja {
    fill: var(--boja);
  }
  .pr-posuda {
    fill: color-mix(in srgb, var(--text) 3%, var(--bg-elev));
    stroke: color-mix(in srgb, var(--boja) 45%, var(--border));
    stroke-width: 1.5;
  }
  .pr-ziva {
    fill: var(--boja);
  }
  .pr-raspadnuta {
    fill: color-mix(in srgb, var(--text-faint) 28%, transparent);
  }
  .pr-svjeza {
    fill: var(--text);
    filter: drop-shadow(0 0 2px var(--warn));
  }
  .pr-poklopac {
    transition:
      transform 0.7s cubic-bezier(0.5, 0, 0.3, 1),
      opacity 0.5s ease 0.2s;
  }
  .pr-poklopac.otvoren {
    opacity: 0;
    pointer-events: none;
  }
  .pr-olovo-bg {
    fill: color-mix(in srgb, var(--text-faint) 30%, var(--bg-elev-2));
  }
  .pr-olovo-crta {
    stroke: color-mix(in srgb, var(--text-faint) 45%, transparent);
    stroke-width: 3;
  }
  .pr-poklopac-okvir {
    stroke: var(--border-strong);
    stroke-width: 1.5;
  }
  .pr-znak-bg {
    fill: var(--warn);
  }
  .pr-znak {
    fill: #1a1a1a;
  }
  .pr-poklopac-tekst {
    font-size: 13px;
    font-weight: 700;
    fill: var(--text);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .pr-poklopac-mali {
    font-size: 10.5px;
    fill: var(--text-dim);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .pr-brojka {
    font-size: 12px;
    font-family: var(--font-mono);
    fill: var(--text);
  }
  .pr-sat-lice {
    fill: var(--bg-elev);
    stroke: var(--text-dim);
    stroke-width: 2;
  }
  .pr-sat-gumb {
    fill: var(--text-dim);
  }
  .pr-sat-kazaljka {
    stroke: var(--danger);
    stroke-width: 2;
    stroke-linecap: round;
  }
  .pr-sat-os {
    fill: var(--text);
  }
  .pr-sat-tekst {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 700;
    fill: var(--text);
  }
  .pr-sat-n {
    font-family: var(--font-mono);
    font-size: 11.5px;
    fill: var(--text-dim);
  }
  .pr-omjer {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    fill: var(--text);
  }
  .pr-graf-pozadina {
    fill: color-mix(in srgb, var(--text) 2%, var(--bg-elev));
    stroke: var(--border);
  }
  .pr-razina {
    stroke: var(--border-strong);
    stroke-dasharray: 4 4;
  }
  .pr-razina-1 {
    stroke: var(--border-strong);
  }
  .pr-os {
    font-size: 11px;
    fill: var(--text-dim);
    font-family: var(--font-mono);
  }
  .pr-os-y {
    font-family: inherit;
    font-size: 13px;
  }
  .pr-os-ime {
    font-size: 11px;
    fill: var(--text-faint);
  }
  .pr-os-crta {
    stroke: var(--text-faint);
  }
  .pr-oznaka-T {
    stroke: color-mix(in srgb, var(--primary) 35%, transparent);
    stroke-dasharray: 2 3;
  }
  .pr-oznaka-T-t {
    font-size: 10.5px;
    font-weight: 600;
    fill: var(--primary);
  }
  .pr-cilj {
    stroke: var(--text-dim);
    stroke-dasharray: 5 3;
  }
  .pr-krivulja {
    fill: none;
    stroke: var(--boja);
    stroke-width: 2.4;
    stroke-linejoin: round;
  }
  .pr-tockaT {
    fill: var(--bg-elev);
    stroke: var(--boja);
    stroke-width: 2;
  }
  .pr-tockaT-t {
    font-size: 10.5px;
    font-weight: 600;
    fill: var(--boja);
  }
  .pr-kursor {
    stroke: var(--text);
    stroke-width: 1.2;
    opacity: 0.6;
  }
  .pr-rucka {
    cursor: grab;
    outline: none;
  }
  .vuce .pr-rucka {
    cursor: grabbing;
  }
  .pr-rucka-meta {
    fill: transparent;
  }
  .pr-rucka-vid {
    fill: var(--text);
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .pr-rucka:focus-visible .pr-rucka-vid {
    stroke: var(--primary);
    stroke-width: 3;
  }
  @media (prefers-reduced-motion: reduce) {
    .pr-poklopac {
      transition: none;
    }
  }
</style>
