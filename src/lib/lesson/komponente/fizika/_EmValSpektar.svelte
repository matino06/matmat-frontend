<script>
  // em_val / spektar: elektromagnetski spektar na logaritamskoj skali (radio lijevo, gama desno). Učenik vuče oznaku
  // (istrazi, smjesti) ili dodiruje područje (odaberi_podrucje). Skala, područja, očitanja i što je skriveno: katalog.
  import { untrack } from "svelte";
  import {
    SPEKTAR,
    PODRUCJA,
    UREDAJI,
    spektarCrtez,
    ocitanjeSpektra,
    vidljivoSpektra,
    zadanaLambda,
    zaokruziLambda,
    korakLambda,
    xLambda,
    xInset,
    podrucje,
    susjedi,
    lambdaTekst,
  } from "$lib/lesson/katalog/fizika/em_val.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const smjesti = nacin === "smjesti";
  const odaberiP = nacin === "odaberi_podrucje";
  const odgovor = smjesti || odaberiP;
  const zadana = untrack(() => zadanaLambda(spec));
  const tocnoP = untrack(() => (zadana ? podrucje(zadana) : null));

  // oznaka (λ u m, uvijek „lijepa“ vrijednost) i odabrano područje
  let lam = $state(
    untrack(() =>
      nacin === "istrazi"
        ? zaokruziLambda(zadana ?? 5e-7)
        : nacin === "prikaz"
          ? zadana
          : null,
    ),
  );
  let odabrano = $state(null);
  let poslano = $state(null);
  const trenutno = () => (smjesti ? lam : odabrano);
  let tocno = $derived(
    pokazi || (!!ishod?.tocno && poslano != null && poslano === trenutno()),
  );
  let krivo = $derived(
    !!ishod &&
      !ishod.tocno &&
      !ishod.prazno &&
      poslano != null &&
      poslano === trenutno(),
  );
  let otkriveno = $derived(!odgovor || tocno);
  let aktivno = $derived(!locked && !pokazi);
  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (smjesti) lam = zaokruziLambda(zadana);
      if (odaberiP) odabrano = tocnoP.id;
    });
  });
  function provjeri() {
    if (locked) return;
    const v = trenutno();
    if (v == null) return;
    poslano = v;
    onodgovor(v);
  }

  let vid = $derived(vidljivoSpektra(spec, otkriveno));
  // u odaberi_podrucje oznaka se pokaže tek s točnim odgovorom, na zadanoj valnoj duljini
  let lamCrtez = $derived(odaberiP ? (otkriveno ? zadana : null) : lam);
  let crtez = $derived(spektarCrtez(spec, { lambda: lamCrtez, otkriveno }));
  let ocit = $derived(ocitanjeSpektra(spec, lamCrtez, otkriveno));

  // istaknuta područja
  let stanja = $derived.by(() => {
    const st = {};
    if (otkriveno && (odgovor || nacin === "prikaz") && tocnoP) {
      st[tocnoP.id] = "ok";
      for (const s of susjedi(tocnoP.id)) st[s.id] = "susjed";
    } else if (nacin === "istrazi" && lam != null) {
      const p = podrucje(lam);
      if (p) st[p.id] = "aktivno";
    }
    if (odaberiP && odabrano && !st[odabrano])
      st[odabrano] = krivo ? "bad" : "sel";
    return st;
  });

  // ── unos ──
  const { yF, yL, inset } = SPEKTAR;
  let svgEl = $state();
  let vuce = null; // "traka" | "inset"
  const tockaSvg = (e) => {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  };
  function zona(q) {
    if (q.y >= yF - 12 && q.y <= yL + 12) return "traka";
    if (
      q.y >= inset.y - 14 &&
      q.y <= inset.y + inset.h + 14 &&
      q.x >= inset.x0 - 8 &&
      q.x <= inset.x1 + 8
    )
      return "inset";
    return null;
  }
  function postavi(q, z) {
    lam = zaokruziLambda(z === "inset" ? xInset(q.x) : xLambda(q.x));
  }
  function down(e) {
    if (!aktivno || !(vid.vuci || odaberiP)) return;
    const q = tockaSvg(e);
    if (!q) return;
    const z = zona(q);
    if (!z) return;
    if (odaberiP) {
      odabrano = z === "inset" ? "vidljivo" : podrucje(xLambda(q.x))?.id;
      return;
    }
    e.preventDefault();
    vuce = z;
    postavi(q, z);
    try {
      svgEl.setPointerCapture(e.pointerId);
    } catch {
      /* sintetički događaj bez pokazivača */
    }
  }
  function move(e) {
    if (!vuce) return;
    const q = tockaSvg(e);
    if (q) postavi(q, vuce);
  }
  const up = () => (vuce = null);
  function korak(d) {
    if (!aktivno) return;
    lam = lam == null ? zaokruziLambda(5e-7) : korakLambda(lam, d);
  }
  function tipka(e, id) {
    if (!aktivno || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    odabrano = id;
  }

  const r1 = (n) => Math.round(n * 10) / 10;
  const uid = Math.random().toString(36).slice(2, 8);
  let opis = $derived(
    `Elektromagnetski spektar od radiovalova (lijevo, duge valne duljine) do gama-zračenja (desno, kratke valne duljine).${
      ocit
        ? ` Oznaka: λ = ${ocit.lambda}${ocit.f ? `, f = ${ocit.f}` : ""}${ocit.podrucje ? `, ${ocit.podrucje}` : ""}.`
        : ""
    }`,
  );
  const naziv = (id) => PODRUCJA.find((p) => p.id === id)?.naziv ?? "";
</script>

<figure class="lx-figure ev-sp">
  <svg
    bind:this={svgEl}
    viewBox="0 0 {SPEKTAR.vb[0]} {SPEKTAR.vb[1]}"
    role="img"
    aria-label={opis}
    class="ev-sp-svg"
    class:ev-vuci={vid.vuci && aktivno}
    class:ev-bira={odaberiP && aktivno}
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
  >
    <defs>
      <linearGradient id="ev-duga-{uid}" x1="0" x2="1" y1="0" y2="0">
        {#each crtez.duga as d (d.pomak)}
          <stop offset={d.pomak} stop-color={d.boja} />
        {/each}
      </linearGradient>
      <marker
        id="ev-sp-vrh-{uid}"
        viewBox="0 0 10 10"
        refX="6"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L10,5 L0,10 z" class="ev-sp-vrh" />
      </marker>
    </defs>

    <!-- smjerovi rasta -->
    <text
      class="ev-sp-smjer ev-sp-f"
      x={SPEKTAR.x1}
      y={SPEKTAR.yNaslovF}
      text-anchor="end">frekvencija i energija rastu →</text
    >
    <text
      class="ev-sp-smjer"
      x={SPEKTAR.x0}
      y={SPEKTAR.yNaslovL}
      text-anchor="start">← valna duljina raste</text
    >

    <!-- os f -->
    {#each crtez.fCrtice as x (x)}
      <line
        class="ev-sp-crtica"
        x1={x}
        y1={yF + 1}
        x2={x}
        y2={SPEKTAR.yTraka}
      />
    {/each}
    {#each crtez.fOznake as o (o.x)}
      <text class="ev-sp-oznaka" x={o.x} y={yF - 4} text-anchor="middle"
        >{o.tekst}&nbsp;Hz</text
      >
    {/each}

    <!-- povećano vidljivo (ispod) i lepeza do trake -->
    <line
      class="ev-sp-lepeza"
      x1={crtez.vidljivo.x0}
      y1={yL}
      x2={inset.x0}
      y2={inset.y}
    />
    <line
      class="ev-sp-lepeza"
      x1={crtez.vidljivo.x1}
      y1={yL}
      x2={inset.x1}
      y2={inset.y}
    />
    <text
      class="ev-sp-naslov"
      x={(inset.x0 + inset.x1) / 2}
      y={inset.y - 6}
      text-anchor="middle">vidljiva svjetlost</text
    >
    {#if stanja.vidljivo}
      <rect
        class="ev-sp-okvir ev-{stanja.vidljivo}"
        x={inset.x0 - 3}
        y={inset.y - 3}
        width={inset.x1 - inset.x0 + 6}
        height={inset.h + 6}
        rx="5"
      />
    {/if}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <rect
      class="ev-sp-duga"
      x={inset.x0}
      y={inset.y}
      width={inset.x1 - inset.x0}
      height={inset.h}
      rx="3"
      fill="url(#ev-duga-{uid})"
      role={odaberiP ? "button" : undefined}
      tabindex={odaberiP && aktivno ? 0 : undefined}
      aria-label={odaberiP ? "vidljiva svjetlost" : undefined}
      onkeydown={(e) => tipka(e, "vidljivo")}
    />
    <text
      class="ev-sp-oznaka"
      x={inset.x0}
      y={inset.y + inset.h + 12}
      text-anchor="middle">{crtez.vidljivo.lijevo.tekst}</text
    >
    <text
      class="ev-sp-oznaka"
      x={inset.x1}
      y={inset.y + inset.h + 12}
      text-anchor="middle">{crtez.vidljivo.desno.tekst}</text
    >
    {#each crtez.vidljivo.crtice as c (c.x)}
      <line
        class="ev-sp-crtica"
        x1={c.x}
        y1={inset.y + inset.h}
        x2={c.x}
        y2={inset.y + inset.h + 3}
      />
      <text
        class="ev-sp-oznaka ev-sp-mala"
        x={c.x}
        y={inset.y + inset.h + 12}
        text-anchor="middle">{c.tekst}</text
      >
    {/each}

    <!-- traka područja -->
    {#each crtez.podrucja as p (p.id)}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <rect
        class="ev-sp-podrucje"
        x={p.x0}
        y={SPEKTAR.yTraka}
        width={Math.max(0.5, p.x1 - p.x0)}
        height={SPEKTAR.hTraka}
        fill={p.boja ?? `url(#ev-duga-${uid})`}
        role={odaberiP ? "button" : undefined}
        tabindex={odaberiP && aktivno ? 0 : undefined}
        aria-label={odaberiP ? p.naziv : undefined}
        onkeydown={(e) => tipka(e, p.id)}
      />
      {#if p.kratko}
        <text
          class="ev-sp-ime"
          x={p.xs}
          y={SPEKTAR.yTraka + SPEKTAR.hTraka / 2 + 4}
          text-anchor="middle">{p.kratko}</text
        >
      {/if}
    {/each}
    <rect
      class="ev-sp-rub"
      x={SPEKTAR.x0}
      y={SPEKTAR.yTraka}
      width={SPEKTAR.x1 - SPEKTAR.x0}
      height={SPEKTAR.hTraka}
    />
    {#each crtez.podrucja as p (p.id)}
      {#if stanja[p.id]}
        <rect
          class="ev-sp-okvir ev-{stanja[p.id]}"
          x={p.x0 - 1.5}
          y={SPEKTAR.yTraka - 2}
          width={Math.max(4, p.x1 - p.x0 + 3)}
          height={SPEKTAR.hTraka + 4}
          rx="3"
        />
      {/if}
    {/each}

    <!-- os λ -->
    {#each crtez.lambdaCrtice as x (x)}
      <line class="ev-sp-crtica" x1={x} y1={yL} x2={x} y2={yL + 5} />
    {/each}
    {#each crtez.lambdaOznake as o (o.x)}
      <text
        class="ev-sp-oznaka"
        x={o.x}
        y={yL + 16}
        text-anchor={o.x < 30 ? "start" : o.x > 330 ? "end" : "middle"}
        >{o.tekst}</text
      >
    {/each}

    <!-- oznaka -->
    {#if crtez.oznaka}
      {@const o = crtez.oznaka}
      <line
        class="ev-sp-marker-halo"
        x1={o.x}
        y1={yF - 1}
        x2={o.x}
        y2={yL + 4}
      />
      <line class="ev-sp-marker" x1={o.x} y1={yF - 1} x2={o.x} y2={yL + 4} />
      <path
        class="ev-sp-pin"
        d="M{r1(o.x - 7)},{yF - 9} L{r1(o.x + 7)},{yF - 9} L{o.x},{yF} z"
      />
      {#if vid.vuci && aktivno}
        <circle class="ev-sp-rucka" cx={o.x} cy={yL} r="7" />
      {/if}
      {#if o.xInset != null}
        <line
          class="ev-sp-marker-halo"
          x1={o.xInset}
          y1={inset.y - 3}
          x2={o.xInset}
          y2={inset.y + inset.h + 3}
        />
        <line
          class="ev-sp-marker"
          x1={o.xInset}
          y1={inset.y - 3}
          x2={o.xInset}
          y2={inset.y + inset.h + 3}
        />
      {/if}
    {/if}
  </svg>
</figure>

{#if ocit}
  <div class="ev-sp-ocit" aria-live="polite">
    {#if vid.vuci && aktivno}
      <button
        type="button"
        class="ev-sp-korak"
        onclick={() => korak(1)}
        aria-label="dulja valna duljina">◀</button
      >
    {/if}
    <div class="ev-sp-vrijednosti">
      <span>λ = <b>{ocit.lambda}</b> <small>= {ocit.lambdaM}</small></span>
      {#if ocit.f}<span>f = <b>{ocit.f}</b></span>{/if}
      {#if ocit.podrucje && nacin === "istrazi"}<span class="ev-sp-podr"
          >{ocit.podrucje}</span
        >{/if}
    </div>
    {#if vid.vuci && aktivno}
      <button
        type="button"
        class="ev-sp-korak"
        onclick={() => korak(-1)}
        aria-label="kraća valna duljina">▶</button
      >
    {/if}
  </div>
{:else if smjesti}
  <p class="ev-uputa">
    Dodirni traku ili povuci po njoj; fino namjesti strelicama.
  </p>
{:else if odaberiP && !otkriveno}
  <p class="ev-uputa">
    Dodirni područje na traci{odabrano
      ? ""
      : " (vidljivu svjetlost dodirni na povećanoj dugi ispod)"}.
    {#if odabrano}Odabrano: <b>{naziv(odabrano)}</b>{/if}
  </p>
{/if}

{#if nacin === "istrazi"}
  <div class="ev-kontrole">
    <div class="ev-chips ev-sp-uredaji">
      {#each UREDAJI as u (u.naziv)}
        <button
          type="button"
          class="ev-chip"
          class:on={lam === zaokruziLambda(u.lambda)}
          onclick={() => (lam = zaokruziLambda(u.lambda))}>{u.naziv}</button
        >
      {/each}
    </div>
  </div>
  {#if ocit?.izmedu}<p class="ev-zakljucak">
      {ocit.podrucje}: {ocit.izmedu}
    </p>{/if}
{:else if otkriveno && tocnoP && nacin !== "istrazi"}
  <p class="ev-zakljucak" class:ev-ok={odgovor}>
    λ = {lambdaTekst(zadana)}: <b>{tocnoP.naziv}</b>, {ocit?.izmedu ?? ""}
  </p>
{/if}

{#if odgovor}
  <div class="lx-actions ev-sp-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked || pokazi || trenutno() == null}>Provjeri</button
    >
  </div>
{/if}

<style>
  .ev-sp {
    max-width: 460px;
    margin-bottom: 4px;
  }
  .ev-sp-svg {
    touch-action: pan-y;
  }
  .ev-sp-svg.ev-vuci {
    cursor: ew-resize;
  }
  .ev-sp-svg.ev-bira .ev-sp-podrucje,
  .ev-sp-svg.ev-bira .ev-sp-duga {
    cursor: pointer;
  }
  .ev-sp-podrucje:focus-visible,
  .ev-sp-duga:focus-visible {
    outline: 2px solid var(--primary);
  }
  .ev-sp-podrucje {
    opacity: 0.92;
  }
  :global(html[data-theme="dark"]) .ev-sp-podrucje {
    opacity: 0.78;
  }
  .ev-sp-rub {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .ev-sp-ime {
    fill: #1f2937;
    font: 600 11.5px var(--font-sans);
    pointer-events: none;
  }
  .ev-sp-okvir {
    fill: none;
    stroke-width: 2.5;
    pointer-events: none;
  }
  .ev-sp-okvir.ev-ok {
    stroke: var(--success);
    stroke-width: 3.5;
  }
  .ev-sp-okvir.ev-susjed {
    stroke: var(--success);
    stroke-dasharray: 4 3;
    stroke-width: 2;
  }
  .ev-sp-okvir.ev-sel {
    stroke: var(--primary);
    stroke-width: 3.5;
  }
  .ev-sp-okvir.ev-bad {
    stroke: var(--danger);
    stroke-width: 3.5;
  }
  .ev-sp-okvir.ev-aktivno {
    stroke: var(--text);
    stroke-width: 2;
  }
  .ev-sp-crtica {
    stroke: var(--text-faint);
    stroke-width: 1;
  }
  .ev-sp-oznaka {
    fill: var(--text-dim);
    font: 11px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .ev-sp-mala {
    fill: var(--text-faint);
    font-size: 9.5px;
  }
  .ev-sp-naslov {
    fill: var(--text-dim);
    font: 600 11px var(--font-sans);
  }
  .ev-sp-smjer {
    fill: var(--text-dim);
    font: 600 11px var(--font-sans);
  }
  .ev-sp-f {
    fill: var(--warn);
  }
  .ev-sp-lepeza {
    stroke: var(--border-strong);
    stroke-dasharray: 2 3;
  }
  .ev-sp-marker-halo {
    stroke: var(--bg-elev);
    stroke-width: 5;
  }
  .ev-sp-marker {
    stroke: var(--text);
    stroke-width: 2;
  }
  .ev-sp-pin {
    fill: var(--text);
  }
  .ev-sp-rucka {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .ev-sp-vrh {
    fill: var(--text-dim);
  }
  .ev-sp-ocit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    max-width: 460px;
    margin: 0 auto 6px;
  }
  .ev-sp-vrijednosti {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: baseline;
    column-gap: 14px;
    row-gap: 2px;
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--text-dim);
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    min-width: 0;
  }
  .ev-sp-vrijednosti b {
    color: var(--text);
  }
  .ev-sp-vrijednosti small {
    font-size: 11.5px;
    color: var(--text-faint);
  }
  .ev-sp-podr {
    font-family: var(--font-sans);
    font-weight: 600;
    color: var(--text);
  }
  .ev-sp-korak {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    color: var(--text);
    font-size: 15px;
  }
  .ev-sp-korak:hover {
    border-color: var(--border-strong);
    background: var(--bg-hover);
  }
  .ev-sp-uredaji {
    justify-content: center;
  }
  .ev-sp-akcije {
    justify-content: center;
  }
</style>
