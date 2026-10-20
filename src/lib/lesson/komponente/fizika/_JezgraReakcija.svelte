<script>
  // jezgra / reakcija: jednadžba nuklearne reakcije s malim jezgrama i dvije vage (zbroj A, zbroj Z). U „dovrsi“
  // vage do provjere ne uračunavaju X, da ravnoteža ne oda odgovor; nakon točnog X „padne“ na vage i reakcija se
  // animira (sudar, bljesak, produkti). Raspored i kadrovi animacije dolaze iz kataloga.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Clan from "./_JezgraClan.svelte";
  import Zapis from "./_JezgraZapis.svelte";
  import {
    rasporedReakcije,
    kadarReakcije,
    vageZaCrtanje,
    zapisClana,
    brojClana,
    rjesenjeReakcije,
    nazivAZ,
    odabirAZ,
    zapisCestice,
    zapisJezgre,
    tekstZapisa,
    mdZapisa,
    element,
    CESTICE,
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
  const dovrsi = nacin === "dovrsi";
  const W = 360;
  const raspored = untrack(() => rasporedReakcije(spec, W));
  const imaX = raspored.elementi.some((e) => e.clan?.nepoznato);
  // male jezgre (do A = 30) crtaju se većim kuglicama, da se vide
  const R1 = untrack(() =>
    [...spec.lijevo, ...spec.desno].every((c) => !c.A || c.A <= 30) ? 6.5 : 4,
  );

  // odabir učenika za X: {cestica} ili {A, Z}
  let odabir = $state(null);
  let gradi = $state(false); // otvoren unos jezgre (A, Z)
  // unos jezgre kreće prazan: X se šalje tek kad su upisani i A i Z (početna vrijednost ne smije biti odgovor)
  let jA = $state(null);
  let jZ = $state(null);
  let otkriveno = $derived(!dovrsi || pokazi || !!ishod?.tocno);
  const tocanOdabir = untrack(() => {
    if (!imaX) return null;
    const r = rjesenjeReakcije(spec);
    const n = nazivAZ(r.A, r.Z);
    return n?.cestica ? { cestica: n.cestica } : { A: r.A, Z: r.Z };
  });
  $effect(() => {
    if (!pokazi || !dovrsi) return;
    untrack(() => {
      odabir = tocanOdabir;
      gradi = !tocanOdabir.cestica;
      if (!tocanOdabir.cestica) {
        jA = tocanOdabir.A;
        jZ = tocanOdabir.Z;
      }
    });
  });

  // X na crtežu: u dovrsi nakon točnog / pokaži točna čestica, inače ono što je učenik odabrao
  let xClan = $derived(otkriveno && dovrsi ? tocanOdabir : odabir);
  let skrijZ = $derived(dovrsi && !!spec.bez_z && !otkriveno);
  let vage = $derived(vageZaCrtanje(spec, xClan, !dovrsi || otkriveno, skrijZ));
  let uravnotezeno = $derived(vage.every((v) => v.jednako));

  const PALETA = [
    { id: "p", tekst: "p", ime: "proton" },
    { id: "n", tekst: "n", ime: "neutron" },
    { id: "e-", tekst: "e⁻", ime: "elektron" },
    { id: "e+", tekst: "e⁺", ime: "pozitron" },
    { id: "alfa", tekst: "α", ime: "α-čestica" },
    { id: "gama", tekst: "γ", ime: "γ-foton" },
  ];
  const aktivno = $derived(
    imaX &&
      nacin !== "prikaz" &&
      !locked &&
      !pokazi &&
      !(dovrsi && ishod?.tocno),
  );
  function biraj(id) {
    if (!aktivno) return;
    gradi = false;
    odabir = odabir?.cestica === id ? null : { cestica: id };
  }
  function otvoriJezgru() {
    if (!aktivno) return;
    gradi = true;
    odabir = jA != null && jZ != null ? { A: jA, Z: jZ } : null;
  }
  function postaviJezgru(k, v) {
    if (!aktivno) return;
    const prazno = String(v ?? "").trim() === "" || !Number.isFinite(Number(v));
    const n = prazno
      ? null
      : Math.max(0, Math.min(k === "Z" ? Z_MAX : 300, Math.round(Number(v))));
    if (k === "A") jA = n;
    else jZ = n;
    odabir = jA != null && jZ != null ? { A: jA, Z: jZ } : null;
  }
  function provjeri() {
    if (locked) return;
    onodgovor(odabir ? { ...odabir } : null);
  }

  // ── animacija ──
  let t = $state(1);
  let tece = $state(false);
  function pokreni() {
    if (prefersReducedMotion.current) {
      t = 1;
      return;
    }
    t = 0;
    tece = true;
  }
  let prvi = true;
  $effect(() => {
    if (dovrsi && (ishod?.tocno || pokazi) && prvi) {
      prvi = false;
      untrack(pokreni);
    }
  });
  onMount(() => {
    let id;
    let t0 = 0;
    const petlja = (now) => {
      if (tece) {
        const dt = t0 ? Math.min(0.05, (now - t0) / 1000) : 0;
        t = Math.min(1, t + dt / 1.9);
        if (t >= 1) tece = false;
      }
      t0 = now;
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  let kadar = $derived(tece ? kadarReakcije(raspored, t, W) : null);
  const polozaj = (e) => {
    if (!kadar) return { x: e.x, opacity: 1, skala: 1 };
    const k = kadar.clanovi.find((c) => c.strana === e.strana && c.i === e.i);
    return k ?? { x: e.x, opacity: 1, skala: 1 };
  };

  const r1 = (n) => Math.round(n * 10) / 10;
  const YJ = 44;
  const YZ = 100;
  const upitnik = { gore: "?", dolje: "?", simbol: "X" };
  function zapisZa(e) {
    if (e.clan.nepoznato) {
      if (!xClan) return upitnik;
      return xClan.cestica
        ? zapisCestice(xClan.cestica)
        : zapisJezgre(xClan.Z, xClan.A);
    }
    const z = zapisClana(e.clan);
    return skrijZ && !e.clan.cestica ? { ...z, dolje: "?" } : z;
  }
  let opisX = $derived.by(() => {
    const x = odabirAZ(odabir);
    if (!x) return "";
    const n = nazivAZ(x.A, x.Z);
    if (odabir.cestica)
      return `${mdZapisa(zapisCestice(odabir.cestica))} (${CESTICE[odabir.cestica].ime})`;
    if (!element(x.Z)) return `A = ${x.A}, Z = ${x.Z}: nema takvog elementa`;
    return n ? `${mdZapisa(n.zapis)} (${n.ime})` : `A = ${x.A}, Z = ${x.Z}`;
  });
  let opis = $derived(
    `Reakcija: ${raspored.elementi
      .map((e) =>
        e.vrsta === "plus"
          ? "+"
          : e.vrsta === "strelica"
            ? "daje"
            : e.clan.nepoznato
              ? xClan && (otkriveno || !dovrsi)
                ? tekstZapisa(zapisZa(e))
                : "X"
              : `${brojClana(e.clan) > 1 ? brojClana(e.clan) + " " : ""}${tekstZapisa(zapisZa(e))}`,
      )
      .join(" ")}`,
  );
  const vagaY = (i) => 142 + i * 50;
</script>

{#if dovrsi}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="jz-tekst"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure jzr">
  <svg viewBox="0 0 {W} 238" role="img" aria-label={opis}>
    <defs>
      <radialGradient id="jzr-blj">
        <stop offset="0" stop-color="#fff7c2" />
        <stop offset="0.5" stop-color="#fbbf24" stop-opacity="0.7" />
        <stop offset="1" stop-color="#f59e0b" stop-opacity="0" />
      </radialGradient>
    </defs>
    <!-- jednadžba -->
    {#each raspored.elementi as e, i (i)}
      {#if e.vrsta === "plus"}
        <text
          class="jzr-op"
          x={e.x}
          y={YJ + 6}
          text-anchor="middle"
          opacity={kadar ? 0.15 : 1}>+</text
        >
      {:else if e.vrsta === "strelica"}
        <g opacity={kadar ? 0.15 : 1}>
          <line class="jzr-str" x1={e.x - 12} y1={YJ} x2={e.x + 9} y2={YJ} />
          <path class="jzr-vrh" d="M{e.x + 13},{YJ} l-7,-4.5 v9 z" />
        </g>
      {:else}
        {@const p = polozaj(e)}
        {@const b = brojClana(e.clan)}
        {#if e.clan.nepoznato}
          {#if !kadar}
            <rect
              class="jzr-slot"
              class:pun={!!xClan}
              class:ok={otkriveno && dovrsi}
              x={r1(e.x - e.w / 2)}
              y="14"
              width={r1(e.w)}
              height="104"
              rx="10"
            />
          {/if}
          {#if xClan}
            <Clan
              {R1}
              clan={xClan}
              x={p.x}
              y={YJ}
              skala={p.skala}
              opacity={p.opacity}
              bezZ={skrijZ}
            />
          {:else}
            <text class="jzr-x" x={e.x} y={YJ + 8} text-anchor="middle">X</text>
          {/if}
        {:else if b > 1}
          <text
            class="jzr-koef"
            x={r1(p.x - e.w / 2 + 5)}
            y={YZ}
            text-anchor="middle"
            opacity={kadar ? 0 : 1}>{b}</text
          >
          {#each Array.from({ length: b }, (_, q) => q) as j (j)}
            <Clan
              {R1}
              clan={e.clan}
              x={p.x + 5 + (j - (b - 1) / 2) * 12}
              y={YJ + (j % 2 ? 7 : -5)}
              skala={p.skala}
              opacity={p.opacity}
              bezZ={skrijZ}
            />
          {/each}
        {:else}
          <Clan
            {R1}
            clan={e.clan}
            x={p.x}
            y={YJ}
            skala={p.skala}
            opacity={p.opacity}
            bezZ={skrijZ}
          />
        {/if}
        {#if !kadar}
          <Zapis zapis={zapisZa(e)} x={e.x + (b > 1 ? 6 : 0)} y={YZ} vel={18} />
        {/if}
      {/if}
    {/each}
    {#if kadar && kadar.bljesak > 0}
      <circle
        cx={W / 2}
        cy={YJ}
        r={r1(14 + 34 * kadar.bljesak)}
        fill="url(#jzr-blj)"
        opacity={r1(kadar.bljesak)}
      />
    {/if}

    <!-- vage -->
    {#each vage as v, i (v.kljuc)}
      {@const y = vagaY(i)}
      {@const a = (-v.nagib * Math.PI) / 180}
      {@const dx = 110 * Math.cos(a)}
      {@const dy = 110 * Math.sin(a)}
      <g class="jzr-vaga" class:ravno={v.jednako}>
        <text class="jzr-v-ozn" x={W / 2} y={y + 36} text-anchor="middle"
          >{v.oznaka}{v.jednako ? " ✓" : ""}</text
        >
        <path class="jzr-osl" d="M{W / 2},{y + 6} l-8,16 h16 z" />
        <line
          class="jzr-greda"
          x1={r1(W / 2 - dx)}
          y1={r1(y + 6 + dy)}
          x2={r1(W / 2 + dx)}
          y2={r1(y + 6 - dy)}
        />
        <text class="jzr-v-t" x="4" y={r1(y + dy - 2)} text-anchor="start"
          >{v.lijevo}</text
        >
        <text class="jzr-v-t" x={W - 4} y={r1(y - dy - 2)} text-anchor="end"
          >{v.desno}</text
        >
        <text class="jzr-strana" x={r1(W / 2 - dx)} y={r1(y + 20 + dy)}
          >lijevo</text
        >
        <text
          class="jzr-strana"
          x={r1(W / 2 + dx)}
          y={r1(y + 20 - dy)}
          text-anchor="end">desno</text
        >
      </g>
    {/each}
  </svg>
</figure>

{#if dovrsi && !otkriveno}
  <p class="jzr-napomena">
    Vage ne uračunavaju X dok ne provjeriš: one pokazuju samo poznate članove.
  </p>
{/if}
{#if nacin === "istrazi" && imaX && odabir && uravnotezeno}
  <p class="jzr-ok" role="status">
    Obje vage su u ravnoteži: reakcija je moguća.
  </p>
{/if}

{#if imaX && nacin !== "prikaz"}
  <div class="jzr-paleta" role="group" aria-label="Čestica X">
    {#each PALETA as c (c.id)}
      <button
        type="button"
        class="jzr-p"
        class:sel={odabir?.cestica === c.id && !gradi}
        aria-pressed={odabir?.cestica === c.id && !gradi}
        aria-label={c.ime}
        disabled={!aktivno}
        onclick={() => biraj(c.id)}
      >
        <span class="jzr-p-z"
          ><Md inline text={mdZapisa(zapisCestice(c.id))} /></span
        >
        <span class="jzr-p-i">{c.ime}</span>
      </button>
    {/each}
    <button
      type="button"
      class="jzr-p"
      class:sel={gradi}
      aria-pressed={gradi}
      disabled={!aktivno}
      onclick={otvoriJezgru}
    >
      <span class="jzr-p-z"
        ><Md inline text={"\\({}^{A}_{Z}\\text{?}\\)"} /></span
      >
      <span class="jzr-p-i">jezgra…</span>
    </button>
  </div>
  {#if gradi}
    <div class="jzr-gradi">
      <label
        >A <input
          class="inp jzr-inp"
          type="number"
          inputmode="numeric"
          min="0"
          max="300"
          value={jA ?? ""}
          disabled={!aktivno}
          onchange={(e) => postaviJezgru("A", e.currentTarget.value)}
        /></label
      >
      <label
        >Z <input
          class="inp jzr-inp"
          type="number"
          inputmode="numeric"
          min="0"
          max={Z_MAX}
          value={jZ ?? ""}
          disabled={!aktivno}
          onchange={(e) => postaviJezgru("Z", e.currentTarget.value)}
        /></label
      >
    </div>
  {/if}
  {#if odabir}
    <p class="jzr-odabir">X = <Md inline text={opisX} /></p>
  {/if}
{/if}

<div class="lx-actions">
  {#if dovrsi}
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked}>Provjeri</button
    >
  {/if}
  {#if !dovrsi || otkriveno}
    <button
      type="button"
      class="btn btn-ghost"
      onclick={pokreni}
      disabled={tece ||
        prefersReducedMotion.current ||
        (imaX && !(xClan && uravnotezeno))}>Pokreni reakciju</button
    >
  {/if}
</div>

<style>
  .jz-tekst {
    margin-bottom: 10px;
  }
  .jzr {
    max-width: 440px;
    margin-bottom: 4px;
  }
  .jzr-op {
    fill: var(--text-dim);
    font: 600 18px var(--font-sans);
  }
  .jzr-str {
    stroke: var(--text);
    stroke-width: 2;
  }
  .jzr-vrh {
    fill: var(--text);
  }
  .jzr-slot {
    fill: color-mix(in srgb, var(--primary) 6%, transparent);
    stroke: var(--primary);
    stroke-width: 1.5;
    stroke-dasharray: 5 4;
  }
  .jzr-slot.pun {
    stroke-dasharray: none;
  }
  .jzr-slot.ok {
    stroke: var(--success);
    fill: color-mix(in srgb, var(--success) 8%, transparent);
  }
  .jzr-x {
    fill: var(--primary);
    font: 700 22px var(--font-sans);
  }
  .jzr-koef {
    fill: var(--text);
    font: 700 17px var(--font-sans);
  }
  .jzr-osl {
    fill: var(--text-faint);
  }
  .jzr-greda {
    stroke: var(--text-dim);
    stroke-width: 3;
    stroke-linecap: round;
    transition: all 0.4s ease;
  }
  .jzr-vaga.ravno .jzr-greda {
    stroke: var(--success);
  }
  .jzr-v-t {
    fill: var(--text);
    font: 600 12px var(--font-mono);
    transition: all 0.4s ease;
  }
  .jzr-v-ozn {
    fill: var(--text-dim);
    font: 600 11.5px var(--font-sans);
  }
  .jzr-vaga.ravno .jzr-v-ozn {
    fill: var(--success);
  }
  .jzr-strana {
    fill: var(--text-faint);
    font: 400 10.5px var(--font-sans);
  }
  .jzr-napomena {
    margin: 0 0 8px;
    font-size: 12.5px;
    color: var(--text-faint);
    text-align: center;
  }
  .jzr-ok {
    margin: 0 0 8px;
    text-align: center;
    color: var(--success);
    font-weight: 600;
    font-size: 14px;
  }
  .jzr-paleta {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
    gap: 6px;
    max-width: 440px;
    margin: 0 auto;
  }
  .jzr-p {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    min-height: 52px;
    padding: 6px 4px;
    border-radius: var(--r-lg);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text);
  }
  .jzr-p:hover:not(:disabled) {
    background: var(--bg-hover);
  }
  .jzr-p.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }
  .jzr-p:disabled {
    cursor: default;
  }
  .jzr-p-z {
    font: 700 17px var(--font-sans);
  }
  .jzr-p-i {
    font-size: 11.5px;
    color: var(--text-dim);
  }
  .jzr-gradi {
    display: flex;
    justify-content: center;
    gap: 14px;
    margin-top: 8px;
    font-weight: 600;
  }
  .jzr-gradi label {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .jzr-inp {
    width: 72px;
    height: 38px;
    text-align: center;
    font: 600 16px var(--font-mono);
  }
  .jzr-odabir {
    margin: 8px 0 0;
    text-align: center;
    font-size: 14px;
    color: var(--text-dim);
  }
</style>
