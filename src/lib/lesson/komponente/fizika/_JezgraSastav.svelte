<script>
  // jezgra / sastav: atom od kuglica (jezgra) i elektroni na ljuskama. Učenik dodaje ili miče protone, neutrone i
  // elektrone; u „slozi“ do točnog odgovora nema simbola, imena, A ni naboja (katalog: ocitanjaSastava).
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Kuglice from "./_JezgraKuglice.svelte";
  import Zapis from "./_JezgraZapis.svelte";
  import {
    stanjeSastava,
    sastavCilja,
    mijenjaCilj,
    ocitanjaSastava,
    promjenaSastava,
    tipoviJezgre,
    uskladiTipove,
    kuglice,
    polumjerJezgre,
    elektroniPolozaji,
    zIzSimbola,
    mdKratko,
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
  const slozi = nacin === "slozi";
  const ciljevi = untrack(() => spec.ciljevi ?? []);
  const MAX = { p: Z_MAX, n: 160, e: Z_MAX };
  const POLJA = [
    { k: "p", znak: "p⁺", ime: "protoni", klasa: "p" },
    { k: "n", znak: "n", ime: "neutroni", klasa: "n" },
    { k: "e", znak: "e⁻", ime: "elektroni", klasa: "e" },
  ];

  const iz = (o) => {
    const Z = zIzSimbola(o.simbol);
    return { p: Z, n: o.A - Z, e: Z - (o.naboj ?? 0) };
  };
  const pocetno = untrack(() =>
    nacin === "prikaz"
      ? iz(spec.atom)
      : nacin === "istrazi"
        ? { ...(spec.pocetak ?? { p: 6, n: 6, e: 6 }) }
        : { p: 0, n: 0, e: 0 },
  );
  // slozi: jedno stanje po cilju; drugi cilj prepisuje polja koja ne mijenja
  let stanja = $state(
    untrack(() =>
      slozi ? ciljevi.map(() => ({ p: 0, n: 0, e: 0 })) : [{ ...pocetno }],
    ),
  );
  let aktivni = $state(0);
  const mijenja = (i) => (slozi ? mijenjaCilj(ciljevi[i], i) : ["p", "n", "e"]);
  const efektivno = (i) => {
    const s = stanja[i];
    if (i === 0) return s;
    const m = mijenja(i);
    const o = { ...s };
    for (const k of ["p", "n", "e"]) if (!m.includes(k)) o[k] = stanja[0][k];
    return o;
  };
  let otkriveno = $derived(!slozi || pokazi || !!ishod?.tocno);
  $effect(() => {
    if (!pokazi || !slozi) return;
    untrack(() => {
      stanja = ciljevi.map((c) => sastavCilja(c));
    });
  });

  let cur = $derived(efektivno(aktivni));
  let st = $derived(stanjeSastava(cur));
  let oc = $derived(ocitanjaSastava(spec, st, otkriveno));

  // kuglice: niz tipova se mijenja postupno, da unutarnje kuglice ostanu na mjestu
  let tipovi = $state(untrack(() => tipoviJezgre(pocetno.p, pocetno.n, 5)));
  $effect(() => {
    const { p, n } = cur;
    untrack(() => {
      tipovi = uskladiTipove(tipovi, p, n, 5);
    });
  });
  const C = [180, 138];
  let R1 = $derived(st.A > 150 ? 7.5 : 8.5);
  let k = $derived(kuglice(tipovi, R1));
  let R = $derived(polumjerJezgre(tipovi.length, R1));
  let faza = $state(0);
  let el = $derived(
    elektroniPolozaji(cur.e, Math.max(26, R + 14), st.A > 150 ? 15 : 18, faza),
  );
  onMount(() => {
    let id;
    let t0 = 0;
    const petlja = (now) => {
      if (!prefersReducedMotion.current) {
        const dt = t0 ? Math.min(0.05, (now - t0) / 1000) : 0;
        faza += dt * 0.5;
      }
      t0 = now;
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });

  // promjena elementa ili izotopa (samo kad se smije vidjeti)
  let prethodno = null;
  let poruka = $state("");
  let pulsiraj = $state(0);
  function postavi(k, v) {
    if (locked || pokazi) return;
    const s = { ...stanja[aktivni] };
    s[k] = Math.max(0, Math.min(MAX[k], Math.round(Number(v) || 0)));
    prethodno = stanjeSastava(efektivno(aktivni));
    stanja[aktivni] = s;
    if (!slozi) {
      const sad = stanjeSastava(efektivno(aktivni));
      const pr = promjenaSastava(prethodno, sad);
      if (pr) {
        poruka = pr;
        if (prethodno.p !== sad.p) pulsiraj++;
      }
    }
  }
  const promijeni = (k, d) => postavi(k, stanja[aktivni][k] + d);
  function izotop(o) {
    const z = iz(o);
    prethodno = stanjeSastava(stanja[0]);
    stanja[0] = z;
    poruka = promjenaSastava(prethodno, stanjeSastava(z)) ?? "";
  }

  function provjeri() {
    if (locked) return;
    onodgovor(ciljevi.map((_, i) => ({ ...efektivno(i) })));
  }

  const r1 = (n) => Math.round(n * 10) / 10;
  let skriveniZapis = { gore: "?", dolje: "?", simbol: "?" };
  let opis = $derived(
    otkriveno && st.element
      ? `Atom: ${st.ime}, ${cur.p} protona, ${cur.n} neutrona, ${cur.e} elektrona, ${st.opisNaboja}.`
      : `Atom: ${cur.p} protona, ${cur.n} neutrona, ${cur.e} elektrona.`,
  );
  let cilj = $derived(slozi ? ciljevi[aktivni] : null);
  let ciljTekst = $derived(
    cilj
      ? (cilj.tekst ??
          `${(cilj.naboj ?? 0) === 0 ? "Neutralni atom" : "Ion"} ${mdKratko(zIzSimbola(cilj.simbol), cilj.A)}${cilj.naboj ? (cilj.naboj > 0 ? ` (naboj +${cilj.naboj})` : ` (naboj −${-cilj.naboj})`) : ""}`)
      : "",
  );
</script>

{#if slozi}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="jz-tekst"><Md text={spec.tekst} /></div>
{/if}

{#if slozi && ciljevi.length > 1}
  <div class="jz-ciljevi" role="tablist" aria-label="Atomi koje slažeš">
    {#each ciljevi as c, i (i)}
      <button
        type="button"
        role="tab"
        class="jz-cilj"
        class:sel={aktivni === i}
        aria-selected={aktivni === i}
        onclick={() => (aktivni = i)}
        >{i + 1}. <Md
          inline
          text={mdKratko(zIzSimbola(c.simbol), c.A)}
        /></button
      >
    {/each}
  </div>
{/if}
{#if slozi}
  <p class="jz-cilj-tekst"><Md text={ciljTekst} /></p>
{/if}

<figure class="lx-figure jz">
  <svg viewBox="0 0 360 276" role="img" aria-label={opis}>
    {#if el.oblak}
      <circle class="jz-oblak" cx={C[0]} cy={C[1]} r={r1(el.prsteni[1])} />
      <text
        class="jz-oblak-t"
        x={C[0]}
        y={C[1] + el.prsteni[1] - 6}
        text-anchor="middle">oblak od {cur.e} e⁻</text
      >
    {:else}
      {#each el.prsteni as rp, i (i)}
        <circle class="jz-ljuska" cx={C[0]} cy={C[1]} r={r1(rp)} />
      {/each}
      {#each el.tocke as t, i (i)}
        <circle class="jz-e" cx={r1(C[0] + t.x)} cy={r1(C[1] + t.y)} r="3.4" />
      {/each}
    {/if}
    {#key pulsiraj}
      <g class="jz-jezgra" class:jz-puls={pulsiraj > 0}>
        <Kuglice {k} x={C[0]} y={C[1]} />
      </g>
    {/key}
    {#if tipovi.length === 0}
      <text class="jz-prazno" x={C[0]} y={C[1] + 4} text-anchor="middle"
        >prazna jezgra</text
      >
    {/if}
    <g class="jz-zapis-okvir">
      <rect x="6" y="6" width="86" height="56" rx="10" />
      <Zapis
        zapis={otkriveno || spec.simbol_uzivo
          ? (oc.zapis ?? skriveniZapis)
          : skriveniZapis}
        x={49}
        y={46}
        vel={26}
      />
    </g>
    <g class="jz-legenda">
      <circle cx="292" cy="16" r="5" class="jz-lp" /><text x="301" y="20"
        >proton</text
      >
      <circle cx="292" cy="33" r="5" class="jz-ln" /><text x="301" y="37"
        >neutron</text
      >
      <circle cx="292" cy="50" r="3.4" class="jz-e" /><text x="301" y="54"
        >elektron</text
      >
    </g>
    <text class="jz-shema" x="354" y="270" text-anchor="end"
      >shematski, nije u mjerilu</text
    >
  </svg>
</figure>

{#if oc.redovi.length}
  <div class="jz-ocitanja" aria-live="polite">
    {#if oc.ime}<div class="jz-ime">{oc.ime}</div>{/if}
    {#each oc.redovi as r (r.oznaka)}
      <div class="jz-red"><span>{r.oznaka}</span><b>{r.vrijednost}</b></div>
    {/each}
  </div>
{/if}
{#if !slozi && poruka}
  <p class="jz-poruka" role="status"><Md inline text={poruka} /></p>
{/if}

{#if nacin !== "prikaz"}
  <div class="jz-brojaci">
    {#each POLJA as f (f.k)}
      {@const ok = mijenja(aktivni).includes(f.k)}
      {@const dis = locked || pokazi || !ok}
      <div class="jz-brojac" class:jz-fiksno={!ok}>
        <span class="jz-b-ime"
          ><i class="jz-tocka {f.klasa}"></i>{f.ime}
          {#if !ok}<small>(isto kao u 1.)</small>{/if}</span
        >
        <div class="jz-b-kontrole">
          <button
            type="button"
            class="jz-tipka"
            disabled={dis || cur[f.k] <= 0}
            aria-label="{f.ime}: oduzmi 10"
            onclick={() => promijeni(f.k, -10)}>−10</button
          >
          <button
            type="button"
            class="jz-tipka"
            disabled={dis || cur[f.k] <= 0}
            aria-label="{f.ime}: oduzmi 1"
            onclick={() => promijeni(f.k, -1)}>−1</button
          >
          <input
            class="inp jz-broj"
            type="number"
            inputmode="numeric"
            min="0"
            max={MAX[f.k]}
            aria-label="broj: {f.ime}"
            value={cur[f.k]}
            disabled={dis}
            onchange={(e) => postavi(f.k, e.currentTarget.value)}
          />
          <button
            type="button"
            class="jz-tipka"
            disabled={dis || cur[f.k] >= MAX[f.k]}
            aria-label="{f.ime}: dodaj 1"
            onclick={() => promijeni(f.k, 1)}>+1</button
          >
          <button
            type="button"
            class="jz-tipka"
            disabled={dis || cur[f.k] >= MAX[f.k]}
            aria-label="{f.ime}: dodaj 10"
            onclick={() => promijeni(f.k, 10)}>+10</button
          >
        </div>
      </div>
    {/each}
  </div>
{/if}

{#if !slozi && spec.izotopi?.length}
  <div class="jz-izotopi">
    <span class="jz-iz-t">Složi:</span>
    {#each spec.izotopi as o, i (i)}
      {@const z = iz(o)}
      <button
        type="button"
        class="jz-iz"
        class:sel={cur.p === z.p && cur.n === z.n}
        onclick={() => izotop(o)}
        ><Md inline text={mdKratko(z.p, o.A)} /></button
      >
    {/each}
  </div>
{/if}

{#if slozi}
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked}>Provjeri</button
    >
    {#if ciljevi.length > 1 && aktivni < ciljevi.length - 1 && !locked}
      <button
        type="button"
        class="btn btn-ghost"
        onclick={() => (aktivni = aktivni + 1)}
        >Dalje: <Md
          inline
          text={mdKratko(
            zIzSimbola(ciljevi[aktivni + 1].simbol),
            ciljevi[aktivni + 1].A,
          )}
        /></button
      >
    {/if}
  </div>
  {#if ciljevi.length > 1 && !locked}
    <p class="lx-hint">Namjesti oba atoma (1. i 2.), pa provjeri.</p>
  {/if}
{/if}

<style>
  .jz-tekst {
    margin-bottom: 10px;
  }
  .jz {
    max-width: 400px;
    margin-bottom: 6px;
  }
  .jz-ciljevi {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
  }
  .jz-cilj,
  .jz-iz {
    min-height: 36px;
    padding: 4px 14px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text);
    font-weight: 600;
    font-size: 15px;
  }
  .jz-cilj.sel,
  .jz-iz.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }
  .jz-cilj-tekst {
    margin: 0 0 4px;
    font-size: 14px;
    color: var(--text-dim);
  }
  .jz-ljuska {
    fill: none;
    stroke: var(--border-strong);
    stroke-dasharray: 3 4;
  }
  .jz-e {
    fill: var(--lx-water);
    stroke: var(--bg-elev);
    stroke-width: 1;
  }
  .jz-oblak {
    fill: color-mix(in srgb, var(--lx-water) 14%, transparent);
    stroke: color-mix(in srgb, var(--lx-water) 40%, transparent);
    stroke-dasharray: 2 4;
  }
  .jz-oblak-t,
  .jz-legenda text,
  .jz-prazno {
    fill: var(--text-dim);
    font: 500 11.5px var(--font-sans);
  }
  .jz-shema {
    fill: var(--text-faint);
    font: 400 10px var(--font-sans);
  }
  .jz-lp {
    fill: #e5484d;
  }
  .jz-ln {
    fill: color-mix(in srgb, var(--text-dim) 70%, var(--bg-elev));
  }
  .jz-zapis-okvir rect {
    fill: var(--bg-elev);
    stroke: var(--border);
  }
  .jz-jezgra {
    transform-origin: 180px 138px;
  }
  .jz-puls {
    animation: jz-puls 0.5s ease-out;
  }
  @keyframes jz-puls {
    40% {
      transform: scale(1.12);
    }
  }
  .jz-ocitanja {
    display: grid;
    gap: 2px;
    margin: 0 auto 8px;
    max-width: 360px;
    font-size: 14px;
  }
  .jz-ime {
    text-align: center;
    font-weight: 700;
    font-size: 15px;
  }
  .jz-red {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    color: var(--text-dim);
  }
  .jz-red b {
    color: var(--text);
    font-weight: 600;
    text-align: right;
  }
  .jz-poruka {
    margin: 0 auto 8px;
    max-width: 360px;
    padding: 6px 10px;
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--warn) 14%, transparent);
    font-size: 13.5px;
    text-align: center;
  }
  .jz-brojaci {
    display: grid;
    gap: 8px;
    max-width: 400px;
    margin: 0 auto;
  }
  .jz-brojac {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    flex-wrap: wrap;
  }
  .jz-fiksno {
    opacity: 0.6;
  }
  .jz-b-ime {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
  }
  .jz-b-ime small {
    font-weight: 400;
    color: var(--text-faint);
  }
  .jz-tocka {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    display: inline-block;
  }
  .jz-tocka.p {
    background: #e5484d;
  }
  .jz-tocka.n {
    background: color-mix(in srgb, var(--text-dim) 70%, var(--bg-elev));
  }
  .jz-tocka.e {
    background: var(--lx-water);
    width: 9px;
    height: 9px;
  }
  .jz-b-kontrole {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .jz-tipka {
    min-width: 40px;
    height: 38px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text);
    font: 600 14px var(--font-mono);
    touch-action: manipulation;
  }
  .jz-tipka:hover:not(:disabled) {
    background: var(--bg-hover);
  }
  .jz-tipka:disabled {
    opacity: 0.4;
  }
  .jz-broj {
    width: 58px;
    height: 38px;
    text-align: center;
    font: 600 16px var(--font-mono);
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .jz-broj::-webkit-inner-spin-button,
  .jz-broj::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .jz-izotopi {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 10px;
  }
  .jz-iz-t {
    font-size: 13px;
    color: var(--text-dim);
  }
  @media (max-width: 380px) {
    .jz-tipka {
      min-width: 36px;
    }
    .jz-broj {
      width: 52px;
    }
  }
</style>
