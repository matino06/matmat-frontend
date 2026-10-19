<script>
  // Strujni krug: shema se crta iz stabla spoja (katalog/fizika/_krug.js), struja teče kao točkice (brže kad je
  // veća), žarulje svijetle razmjerno snazi, mjerila pokazuju žive vrijednosti. Sve brojeve računa isti kod kao
  // provjera u katalogu.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import { formatSci } from "$lib/lesson/core/number.js";
  import {
    oznakeZaRaspored,
    linijeElementa,
    linijeIzvora,
    grupaIzbora,
    pocetakPostavi,
    stanjeIz,
    pretrazi,
    nazivKlizaca,
    jedinicaKlizaca,
    kandidati,
    stanjePoslije,
    rjesenjeOdaberi,
    oznakaPitanja,
    postaviVrijednost,
    pocetnaVrijednost,
    fraza,
    PROMJENE,
  } from "$lib/lesson/katalog/fizika/strujni_krug.js";
  import { stablo, rijesi, pocetnoStanje, vrijednost, rasporedi, tockaNa, duljina, naziv, GEOM, JEDINICA, fmt, zatvorena, vrstaSkupine } from "$lib/lesson/katalog/fizika/_krug.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  const MR = GEOM.MR;
  const RAZMAK = 18; // razmak točkica struje

  let nacin = $derived(spec.nacin);
  let T = $derived(stablo(spec.spoj));
  let oznake = $derived(oznakeZaRaspored(spec));
  let izbor = $derived(grupaIzbora(spec, T));

  function pocetno() {
    const T0 = stablo(spec.spoj);
    return spec.nacin === "postavi" ? stanjeIz(spec, T0, pocetakPostavi(spec, T0)) : pocetnoStanje(spec);
  }
  let st = $state(untrack(pocetno));

  // odaberi s promjenom: nakon točnog odgovora (ili „pokaži“) sklopka se prebaci da se vidi što se dogodilo
  let promjena = $derived(nacin === "odaberi" && spec.odaberi?.kriterij in PROMJENE);
  let poslije = $derived(promjena && (pokazi || !!ishod?.tocno));
  let prikaz = $derived(poslije ? stanjePoslije(spec, T) : st);
  let rez = $derived(rijesi(spec, prikaz, T));
  let L = $derived(rasporedi(spec, prikaz, T, oznake));

  // ── struja kao točkice ──
  const Iref = untrack(() => {
    const T0 = stablo(spec.spoj);
    const st0 = pocetnoStanje(spec);
    const sve = { ...st0, sklopke: Object.fromEntries(T0.listovi.filter((l) => l.vrsta === "S").map((l) => [l.id, true])) };
    return Math.max(1e-9, rijesi(spec, st0, T0).I, rijesi(spec, sve, T0).I);
  });
  let struje = $derived(L.zice.map((z) => (z.kljucevi ? z.kljucevi.reduce((s, k) => s + (k === "@" ? rez.I : (rez.po[k]?.I ?? 0)), 0) : 0)));
  let duljine = $derived(L.zice.map((z) => duljina(z.pts)));
  const brzina = (I) => (I > Iref * 1e-4 ? Math.min(130, Math.max(7, 46 * Math.sqrt(I / Iref))) : 0);

  let elektroni = $state(false);
  let tick = $state(0);
  let offs = [];
  let tockice = $derived.by(() => {
    void tick;
    const out = [];
    L.zice.forEach((z, i) => {
      if (!(struje[i] > Iref * 1e-4)) return;
      const len = duljine[i];
      for (let s = (offs[i] ?? 0) % RAZMAK; s < len; s += RAZMAK) out.push(tockaNa(z.pts, elektroni ? len - s : s));
    });
    return out;
  });

  // presjek žice: brojač naboja q = ∫ I dt
  let vrijeme = $state(0);
  let naboj = $state(0);
  const e = 1.602e-19;

  let svgEl = $state();
  onMount(() => {
    let raf;
    let last = performance.now();
    let vidljivo = true;
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([z]) => (vidljivo = z.isIntersecting)) : null;
    if (io && svgEl) io.observe(svgEl);
    const korak = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (vidljivo) {
        if (!prefersReducedMotion.current) {
          struje.forEach((I, i) => (offs[i] = ((offs[i] ?? 0) + brzina(I) * dt) % RAZMAK));
          tick++;
        }
        if (spec.presjek) {
          vrijeme += dt;
          naboj += rez.I * dt;
        }
      }
      raf = requestAnimationFrame(korak);
    };
    raf = requestAnimationFrame(korak);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  });
  function presjekIspocetka() {
    vrijeme = 0;
    naboj = 0;
  }

  // ── žarulje ──
  const Pref = untrack(() => Math.max(1e-12, ...stablo(spec.spoj).listovi.filter((l) => l.vrsta === "Z").map((l) => l.Pnaz)));
  function sjaj(c) {
    const P = rez.po[c.key]?.P ?? 0;
    return Math.sqrt(Math.min(1.25, Math.max(0, P / Pref)));
  }

  // ── izracunaj ──
  let unosi = $state(untrack(() => (spec.pitaj ?? []).map(() => "")));
  const istiElement = (a, b) => a === b || ((a === "izvor" || a === "ukupno") && (b === "izvor" || b === "ukupno"));
  function pitano(m) {
    if (nacin !== "izracunaj" || pokazi) return false;
    const v = m.vrsta === "A" ? "I" : "U";
    return (spec.pitaj ?? []).some((q) => q.velicina === v && istiElement(q.element, m.element));
  }
  let trazeni = $derived(new Set(nacin === "izracunaj" ? (spec.pitaj ?? []).map((q) => q.element) : []));

  // ── odaberi ──
  let odabrano = $state([]);
  let kand = $derived(nacin === "odaberi" ? kandidati(spec, T) : []);
  let tocniOdabir = $derived(nacin === "odaberi" && (pokazi || ishod?.tocno) ? rjesenjeOdaberi(spec, T).tocni : []);
  function dodir(c) {
    if (nacin === "istrazi" && c.vrsta === "S") {
      st.sklopke = { ...st.sklopke, [c.id]: !zatvorena(c, st) };
      return;
    }
    if (nacin !== "odaberi" || locked || !kand.includes(c.id)) return;
    if (promjena) odabrano = odabrano.includes(c.id) ? odabrano.filter((x) => x !== c.id) : [...odabrano, c.id];
    else odabrano = [c.id];
  }
  const aktivan = (c) => (nacin === "istrazi" && c.vrsta === "S") || (nacin === "odaberi" && !locked && kand.includes(c.id));
  function tipka(ev, c) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      dodir(c);
    }
  }

  // ── klizači i spoj ──
  let klizaci = $derived(nacin === "istrazi" || nacin === "postavi" ? (spec.klizaci ?? []) : []);
  const vrijednostKlizaca = (k) => (k.element === "izvor" ? st.emf : k.element === "r" ? st.r : (st.R?.[k.element] ?? pocetnaVrijednost(spec, T, k.element)));
  function pomakni(k, v) {
    if (locked && nacin === "postavi") return;
    postaviVrijednost(st, k.element, Number(v));
  }
  let vrstaIzbora = $derived(izbor ? vrstaSkupine(izbor, st) : null);
  function spoji(v) {
    if (!izbor || (locked && nacin === "postavi")) return;
    st.spoj = { ...st.spoj, [izbor.key]: v };
  }

  // ── postavi ──
  function provjeri() {
    if (locked) return;
    if (nacin === "izracunaj") onodgovor([...unosi]);
    else if (nacin === "odaberi") onodgovor([...odabrano]);
    else if (nacin === "postavi") onodgovor({ klizaci: Object.fromEntries(klizaci.map((k) => [k.element, vrijednostKlizaca(k)])), spoj: izbor ? vrstaIzbora : null });
  }

  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (nacin === "izracunaj") {
        const r0 = rijesi(spec, pocetnoStanje(spec), T);
        unosi = spec.pitaj.map((q) => fmt(vrijednost(r0, q.velicina, q.element)));
      } else if (nacin === "postavi") {
        const b = pretrazi(spec, T).rjesenja[0];
        if (b) st = stanjeIz(spec, T, b.odg);
      } else if (nacin === "odaberi") odabrano = rjesenjeOdaberi(spec, T).tocni;
    });
  });

  // ── tekst ──
  const s1 = (n) => formatSci(n, 3);
  const ocitanje = (m) => {
    const v = vrijednost(rez, m.vrsta === "A" ? "I" : "U", m.element);
    return `${s1(Math.abs(v) < 1e-12 ? 0 : v)}\u202f${m.vrsta === "A" ? "A" : "V"}`;
  };
  const podatak = (q) => {
    const v = vrijednost(rez, q.velicina, q.element);
    return Number.isFinite(v) ? `${s1(v)} ${JEDINICA[q.velicina]}` : "∞";
  };
  let opisSheme = $derived(
    [
      "Shema strujnog kruga.",
      spec.izvor ? `Izvor ${linijeIzvora(spec, prikaz).join(", ")}.` : "Stezaljke A i B.",
      ...T.listovi.map((c) => `${linijeElementa(spec, c, prikaz).join(" ")}${c.vrsta === "S" ? (zatvorena(c, prikaz) ? " zatvorena" : " otvorena") : ""}.`),
      ...L.mjerila.map((m) => `${m.vrsta === "A" ? "Ampermetar" : "Voltmetar"}: ${pitano(m) ? "?" : ocitanje(m)}.`),
    ].join(" "),
  );

  const pitanje = $derived(nacin !== "istrazi");
  const r1 = (n) => Math.round(n * 10) / 10;
  const tocke = (pts) => pts.map((p) => p.join(",")).join(" ");
</script>

{#if pitanje}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="sk-tekst"><Md text={spec.tekst} /></div>
{/if}

{#snippet tijelo(el)}
  {@const c = el.c}
  {@const h = el.o === "h"}
  {@const istaknut = trazeni.has(c.id)}
  {@const sel = odabrano.includes(c.id)}
  {@const ok = tocniOdabir.includes(c.id)}
  {#if c.vrsta === "R"}
    <rect class="sk-tijelo" class:sk-trazen={istaknut} class:sk-sel={sel} class:sk-ok={ok} x={el.x - (h ? 20 : 8)} y={el.y - (h ? 8 : 20)} width={h ? 40 : 16} height={h ? 16 : 40} rx="1.5" />
  {:else if c.vrsta === "Z"}
    {@const b = sjaj(c)}
    {#if b > 0.02}
      <circle cx={el.x} cy={el.y} r={r1(15 + 20 * b)} fill="url(#sk-sjaj-{uid})" opacity={r1(0.25 + 0.75 * Math.min(1, b)) } />
    {/if}
    <circle class="sk-zarulja" class:sk-trazen={istaknut} class:sk-sel={sel} class:sk-ok={ok} cx={el.x} cy={el.y} r="13" style="--b: {Math.round(Math.min(1, b) * 85)}%" />
    <path class="sk-nit" class:sk-gori={b > 0.05} d="M{el.x - 9.2},{el.y - 9.2} L{el.x + 9.2},{el.y + 9.2} M{el.x + 9.2},{el.y - 9.2} L{el.x - 9.2},{el.y + 9.2}" />
  {:else if c.vrsta === "S"}
    {@const z = zatvorena(c, prikaz)}
    {@const P = (u, v) => (h ? [el.x + u, el.y + v] : [el.x + v, el.y + u])}
    {@const a = P(-18, 0)}
    {@const kraj = z ? P(18, 0) : P(-18 + 36 * Math.cos(0.5), el.ls * 36 * Math.sin(0.5))}
    <line class="sk-poluga" class:sk-otvorena={!z} x1={a[0]} y1={a[1]} x2={r1(kraj[0])} y2={r1(kraj[1])} />
    <circle class="sk-kontakt" cx={a[0]} cy={a[1]} r="3" />
    <circle class="sk-kontakt" cx={P(18, 0)[0]} cy={P(18, 0)[1]} r="3" />
  {/if}
{/snippet}

<div class="sk-fig">
  <svg bind:this={svgEl} viewBox="0 0 {L.w} {L.h}" style="width: {L.w}px" role="img" aria-label={opisSheme}>
    <defs>
      <radialGradient id="sk-sjaj-{uid}">
        <stop offset="0%" style="stop-color: var(--warn); stop-opacity: 0.85" />
        <stop offset="45%" style="stop-color: var(--warn); stop-opacity: 0.35" />
        <stop offset="100%" style="stop-color: var(--warn); stop-opacity: 0" />
      </radialGradient>
    </defs>

    <!-- žice (voltmetri tanje) -->
    {#each L.zice as z, i (i)}
      <polyline class="sk-zica" class:sk-most={!z.kljucevi} points={tocke(z.pts)} />
    {/each}

    <!-- točkice struje ispod elemenata -->
    <g class="sk-tockice" class:sk-elektroni={elektroni} aria-hidden="true">
      {#each tockice as [x, y], i (i)}
        <circle cx={r1(x)} cy={r1(y)} r="2.3" />
      {/each}
    </g>

    {#each L.cvorovi as [x, y], i (i)}
      <circle class="sk-cvor" cx={x} cy={y} r="3" />
    {/each}

    <!-- izvor -->
    {#if L.izvor}
      {@const iz = L.izvor}
      {@const red = linijeIzvora(spec, prikaz)}
      {#if iz.kutija}
        <rect class="sk-kutija" x={iz.kutija.x} y={iz.kutija.y} width={iz.kutija.w} height={iz.kutija.h} rx="4" />
        <rect class="sk-tijelo" x={iz.x - 7} y={iz.yr - 15} width="14" height="30" rx="1.5" />
      {/if}
      <line class="sk-ploca" x1={iz.x - 15} y1={iz.yb - 5} x2={iz.x + 15} y2={iz.yb - 5} />
      <line class="sk-ploca sk-kratka" x1={iz.x - 8} y1={iz.yb + 5} x2={iz.x + 8} y2={iz.yb + 5} />
      <text class="sk-plus" x={iz.x - 9} y={iz.yb - 10} text-anchor="middle">+</text>
      <text class="sk-oznaka sk-ime" x={iz.oznaka.x} y={iz.yb} dominant-baseline="central">{red[0]}</text>
      {#if red[1]}<text class="sk-oznaka" x={iz.oznaka.x} y={iz.yr} dominant-baseline="central">{red[1]}</text>{/if}
    {/if}
    {#if L.stezaljke}
      {@const sz = L.stezaljke}
      <circle class="sk-stezaljka" cx={sz.x} cy={sz.yTop} r="4.5" />
      <circle class="sk-stezaljka" cx={sz.x} cy={sz.yBot} r="4.5" />
      <text class="sk-oznaka sk-ime" x={sz.x - 10} y={sz.yTop} text-anchor="end" dominant-baseline="central">A</text>
      <text class="sk-oznaka sk-ime" x={sz.x - 10} y={sz.yBot} text-anchor="end" dominant-baseline="central">B</text>
    {/if}
    {#if L.presjek}
      <line class="sk-presjek" x1={L.presjek.x} y1={L.presjek.y - 14} x2={L.presjek.x} y2={L.presjek.y + 14} />
      <text class="sk-oznaka" x={L.presjek.x} y={L.presjek.y - 19} text-anchor="middle">presjek</text>
    {/if}

    <!-- elementi -->
    {#each L.elementi as el (el.c.key)}
      {@const red = linijeElementa(spec, el.c, prikaz)}
      {@render tijelo(el)}
      {#each red as t, i (i)}
        {@const y = el.oznaka.poravnaj === "dno" ? el.oznaka.y - (red.length - 1 - i) * 14 : el.oznaka.y + (i - (red.length - 1) / 2) * 14}
        <text class="sk-oznaka" class:sk-ime={i === 0} class:sk-upit={t.endsWith("?")} x={el.oznaka.x} {y} text-anchor={el.oznaka.anchor} dominant-baseline={el.oznaka.poravnaj === "dno" ? "auto" : "central"}>{t}</text>
      {/each}
      {#if nacin === "odaberi" && !locked && kand.includes(el.c.id) && !odabrano.includes(el.c.id) && !tocniOdabir.includes(el.c.id)}
        {#if el.c.vrsta === "Z"}
          <circle class="sk-kand" cx={el.x} cy={el.y} r="18.5" />
        {:else}
          <rect class="sk-kand" x={el.x - (el.o === "h" ? 25 : 13)} y={el.y - (el.o === "h" ? 13 : 25)} width={el.o === "h" ? 50 : 26} height={el.o === "h" ? 26 : 50} rx="5" />
        {/if}
      {/if}
      {#if aktivan(el.c)}
        <rect
          class="sk-meta"
          x={el.x - 23}
          y={el.y - 23}
          width="46"
          height="46"
          rx="9"
          role="button"
          tabindex="0"
          aria-pressed={nacin === "odaberi" ? odabrano.includes(el.c.id) : zatvorena(el.c, prikaz)}
          aria-label={el.c.vrsta === "S" ? `Sklopka ${naziv(el.c)}: ${zatvorena(el.c, prikaz) ? "zatvorena, dodirni da je otvoriš" : "otvorena, dodirni da je zatvoriš"}` : `Odaberi ${naziv(el.c)}`}
          onclick={() => dodir(el.c)}
          onkeydown={(ev) => tipka(ev, el.c)}
        />
      {/if}
    {/each}

    <!-- mjerila -->
    {#each L.mjerila as m, i (i)}
      {@const upit = pitano(m)}
      <circle class="sk-mjerilo" class:sk-trazen={upit} cx={m.x} cy={m.y} r={MR} />
      <text class="sk-slovo" x={m.x} y={m.y + 0.5} text-anchor="middle" dominant-baseline="central">{m.vrsta}</text>
      <text class="sk-ocitanje" class:sk-upit={upit} x={m.ocitanje.x} y={m.ocitanje.y} text-anchor={m.ocitanje.anchor} dominant-baseline={m.ocitanje.baseline}>{upit ? "?" : ocitanje(m)}</text>
    {/each}
  </svg>
</div>

{#if nacin === "istrazi" && T.listovi.some((c) => c.vrsta === "S")}
  <p class="sk-hint">Dodirni sklopku da je otvoriš ili zatvoriš.</p>
{/if}
{#if nacin === "odaberi"}
  <p class="sk-hint">
    {#if poslije}
      Sklopka {naziv(T.po[spec.odaberi.sklopka])} je sada {zatvorena(T.po[spec.odaberi.sklopka], prikaz) ? "zatvorena" : "otvorena"}: pogledaj kako svijetle žarulje.
    {:else if promjena}
      Dodirni sve žarulje za koje to vrijedi (može ih biti i više), pa provjeri.
    {:else}
      Dodirni jedan element na shemi, pa provjeri.
    {/if}
  </p>
{/if}

<div class="sk-kontrole">
  {#if izbor && (nacin === "istrazi" || nacin === "postavi")}
    <div class="seg sk-seg" role="group" aria-label="Vrsta spoja">
      {#each [["ser", "Serijski"], ["par", "Paralelno"]] as [v, t] (v)}
        <button type="button" class="seg-item" class:active={vrstaIzbora === v} aria-pressed={vrstaIzbora === v} disabled={locked && nacin === "postavi"} onclick={() => spoji(v)}>{t}</button>
      {/each}
    </div>
  {/if}

  {#each klizaci as k (k.element)}
    <div class="sk-klizac">
      <div class="sk-klizac-head">
        <label for="sk-{uid}-{k.element}">{nazivKlizaca(spec, T, k)}</label>
        <output for="sk-{uid}-{k.element}">{fmt(vrijednostKlizaca(k))} {jedinicaKlizaca(k)}</output>
      </div>
      <input id="sk-{uid}-{k.element}" type="range" min={k.min} max={k.max} step={k.korak} value={vrijednostKlizaca(k)} disabled={locked && nacin === "postavi"} oninput={(ev) => pomakni(k, ev.currentTarget.value)} />
    </div>
  {/each}

  {#if nacin === "postavi"}
    {@const c = spec.cilj}
    <div class="sk-podaci" aria-live="polite">
      <div class="sk-podatak sk-cilj">
        <span><Md text={`Cilj: ${c.oznaka ?? fraza(T, c.velicina, c.element)}`} inline /></span>
        <span class="sk-iznos">{s1(c.vrijednost)} {JEDINICA[c.velicina]}</span>
      </div>
      <div class="sk-podatak">
        <span>Sada</span>
        <span class="sk-iznos">{c.skriveno && !locked && !pokazi ? "?" : podatak(c)}</span>
      </div>
    </div>
  {/if}

  {#if (spec.podaci ?? []).length}
    <div class="sk-podaci" aria-live="polite">
      {#each spec.podaci as q, i (i)}
        <div class="sk-podatak">
          <span><Md text={q.oznaka ?? fraza(T, q.velicina, q.element)} inline /></span>
          <span class="sk-iznos">{podatak(q)}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if L.presjek}
    <div class="sk-podaci" aria-live="off">
      <div class="sk-podatak">
        <span>Proteklo vrijeme <Md text="$t$" inline /></span>
        <span class="sk-iznos">{s1(vrijeme)} s</span>
      </div>
      <div class="sk-podatak">
        <span>Naboj kroz presjek <Md text="$q = I\,t$" inline /></span>
        <span class="sk-iznos">{s1(naboj)} C</span>
      </div>
      <div class="sk-podatak">
        <span>Broj elektrona <Md text={"$N = \\frac{q}{e}$"} inline /></span>
        <span class="sk-iznos">{s1(naboj / e)}</span>
      </div>
      <button type="button" class="btn btn-quiet sk-mali" onclick={presjekIspocetka}>Brojač ispočetka</button>
    </div>
  {/if}

  {#if nacin === "istrazi" && spec.izvor}
    <label class="sk-prekidac">
      <input type="checkbox" bind:checked={elektroni} />
      Prikaži gibanje elektrona (suprotno od smjera struje)
    </label>
  {/if}
</div>

{#if nacin === "izracunaj"}
  <form
    class="sk-unos"
    onsubmit={(ev) => {
      ev.preventDefault();
      provjeri();
    }}
  >
    {#each spec.pitaj as q, i (i)}
      <div class="sk-red">
        <label for="sk-{uid}-p{i}"><Md text={oznakaPitanja(spec, T, q)} inline /></label>
        <span class="sk-polje">
          <input
            id="sk-{uid}-p{i}"
            class="inp lx-broj-inp"
            class:ok={pokazi || ishod?.polja?.[i] === true}
            class:bad={ishod && !ishod.prazno && ishod.polja?.[i] === false}
            inputmode="decimal"
            autocomplete="off"
            placeholder="?"
            disabled={locked}
            bind:value={unosi[i]}
          />
          <span class="lx-unit">{JEDINICA[q.velicina]}</span>
        </span>
      </div>
    {/each}
    <div class="lx-actions">
      <button class="btn btn-primary" type="submit" disabled={locked || unosi.every((u) => !String(u).trim())}>Provjeri</button>
    </div>
  </form>
{:else if nacin === "postavi" || nacin === "odaberi"}
  <div class="lx-actions">
    <button class="btn btn-primary" type="button" disabled={locked || (nacin === "odaberi" && !odabrano.length)} onclick={provjeri}>Provjeri</button>
  </div>
{/if}

<style>
  .sk-tekst {
    margin-bottom: 8px;
  }
  .sk-fig {
    display: flex;
    justify-content: center;
    margin: 4px 0 8px;
  }
  .sk-fig svg {
    max-width: 100%;
    height: auto;
    display: block;
    overflow: visible;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
  }
  .sk-zica {
    fill: none;
    stroke: var(--text);
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .sk-zica.sk-most {
    stroke: var(--text-dim);
    stroke-width: 1.4;
  }
  .sk-cvor {
    fill: var(--text);
  }
  .sk-tockice circle {
    fill: var(--primary);
  }
  .sk-tockice.sk-elektroni circle {
    fill: var(--lx-water, #38bdf8);
  }
  .sk-tijelo {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 2;
  }
  .sk-zarulja {
    fill: color-mix(in srgb, var(--warn) var(--b), var(--bg-elev));
    stroke: var(--text);
    stroke-width: 2;
  }
  .sk-nit {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.6;
    stroke-linecap: round;
  }
  .sk-nit.sk-gori {
    stroke: var(--text);
  }
  .sk-poluga {
    stroke: var(--text);
    stroke-width: 2.4;
    stroke-linecap: round;
    transition: all 0.2s ease;
  }
  .sk-kontakt {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 1.8;
  }
  .sk-ploca {
    stroke: var(--text);
    stroke-width: 3;
  }
  .sk-ploca.sk-kratka {
    stroke-width: 5;
  }
  .sk-plus {
    font-size: 12px;
    fill: var(--text-dim);
  }
  .sk-kutija {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1.3;
    stroke-dasharray: 4 3;
  }
  .sk-stezaljka {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 2;
  }
  .sk-presjek {
    stroke: var(--primary);
    stroke-width: 1.6;
    stroke-dasharray: 3 3;
  }
  .sk-oznaka {
    font-size: 12px;
    font-family: var(--font-sans);
    fill: var(--text-dim);
  }
  .sk-oznaka.sk-ime {
    font-size: 13px;
    font-weight: 600;
    fill: var(--text);
  }
  .sk-upit {
    fill: var(--primary) !important;
    font-weight: 600;
  }
  .sk-mjerilo {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 1.8;
  }
  .sk-slovo {
    font-size: 12px;
    font-weight: 700;
    font-family: var(--font-sans);
    fill: var(--text);
  }
  .sk-ocitanje {
    font-size: 11.5px;
    font-family: var(--font-mono);
    font-feature-settings: "tnum";
    fill: var(--text);
  }
  .sk-trazen {
    stroke: var(--primary) !important;
    stroke-width: 2.4;
  }
  .sk-sel {
    stroke: var(--primary) !important;
    stroke-width: 3;
  }
  .sk-ok {
    stroke: var(--success) !important;
    stroke-width: 3;
  }
  .sk-meta {
    fill: transparent;
    stroke: none;
    cursor: pointer;
    outline: none;
  }
  .sk-kand {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1.3;
    stroke-dasharray: 4 3;
  }
  .sk-meta:hover {
    fill: color-mix(in srgb, var(--primary) 10%, transparent);
  }
  .sk-meta:focus-visible {
    stroke: var(--primary);
    stroke-width: 1.5;
  }
  .sk-hint {
    margin: 0 0 8px;
    text-align: center;
    font-size: 13px;
    color: var(--text-dim);
  }
  .sk-kontrole {
    display: grid;
    gap: 12px;
    max-width: 440px;
    margin: 0 auto;
  }
  .sk-kontrole:empty {
    display: none;
  }
  .sk-seg {
    justify-self: center;
  }
  .sk-seg .seg-item {
    border: none;
    background: transparent;
    font-size: 13px;
    padding: 7px 16px;
  }
  .sk-seg .seg-item.active {
    background: var(--bg);
  }
  .sk-klizac-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 2px;
  }
  .sk-klizac-head label {
    color: var(--text-dim);
  }
  .sk-klizac-head output {
    font-family: var(--font-mono);
    font-size: 14px;
    white-space: nowrap;
  }
  .sk-klizac input[type="range"] {
    width: 100%;
    margin: 0;
    height: 28px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .sk-podaci {
    display: grid;
    gap: 6px;
  }
  .sk-podatak {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 12px;
    padding: 9px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    font-size: 14px;
    color: var(--text-dim);
  }
  .sk-podatak.sk-cilj {
    border-color: var(--primary-border);
  }
  .sk-iznos {
    font-family: var(--font-mono);
    font-feature-settings: "tnum";
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
  }
  .sk-mali {
    justify-self: end;
    font-size: 12px;
  }
  .sk-prekidac {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-dim);
    cursor: pointer;
  }
  .sk-prekidac input {
    accent-color: var(--primary);
    width: 16px;
    height: 16px;
  }
  .sk-unos {
    display: grid;
    gap: 8px;
    margin-top: 6px;
  }
  .sk-red {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 12px;
  }
  .sk-red label {
    min-width: 72px;
  }
  .sk-polje {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .sk-polje .lx-unit {
    min-width: 18px;
  }
  @media (prefers-reduced-motion: reduce) {
    .sk-poluga {
      transition: none;
    }
  }
</style>
