<script>
  // Kvant: foton, elektronvolt, fotoelektrični efekt i de Broglie. Fizika, geometrija kadrova, očitanja, provjera
  // i „što je skriveno“ su u katalogu (katalog/fizika/kvant.js i _kvant.js); ovdje je samo crtanje i unos.
  // Odgovor se otkriva samo uz pokazi ili točan ishod; locked kopija izgleda kao početno stanje.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Foton from "./_KvantFoton.svelte";
  import Ev from "./_KvantEv.svelte";
  import Fotoefekt from "./_KvantFotoefekt.svelte";
  import Broglie from "./_KvantBroglie.svelte";
  import {
    vidljivo,
    ocitanja,
    opisCrteza,
    uputa as uputaZa,
    pitanja,
    izracun,
    zapisPolja,
    najboljaVrijednost,
    metaKlizaca,
    tekstKlizaca,
    klizaciOd,
    ishodPredvidi,
    IZBORI,
    NAZIV_PREDVIDI,
    trebaPotenciju,
  } from "$lib/lesson/katalog/fizika/kvant.js";
  import {
    fizika,
    pocetnoStanje,
    bojaFotona,
    NEUTRALNA,
    kadarFoton,
    kadarEV,
    kadarFotoefekt,
    stupciBilance,
    kadarDeBroglie,
    LOPTICA,
  } from "$lib/lesson/katalog/fizika/_kvant.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const scena = untrack(() => spec.scena);
  const gledanje = nacin === "istrazi" || nacin === "prikaz";
  const uid = Math.random().toString(36).slice(2, 8);

  let st = $state(untrack(() => pocetnoStanje(spec)));
  let otkriveno = $derived(pokazi || !!ishod?.tocno);

  // ── animacija (uz reduced-motion jedan nepomičan kadar) ──
  const T_MIRNO = 2.4;
  let t = $state(T_MIRNO);
  onMount(() => {
    let id;
    let zadnji = 0;
    const petlja = (now) => {
      if (!prefersReducedMotion.current) {
        const dt = Math.min(0.05, (now - (zadnji || now)) / 1000);
        t += dt;
      } else t = T_MIRNO;
      zadnji = now;
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  // brojač fotona kreće od nule kad se promijeni svjetlost
  let t0 = $state(0);
  $effect(() => {
    void st.lambda;
    void st.jakost;
    untrack(() => (t0 = t));
  });

  // ── postavi ──
  const klizac = untrack(() =>
    nacin === "postavi" ? klizaciOd(spec)[0] : null,
  );
  let poslanaVr = $state(null);
  let provjereno = $derived(
    nacin === "postavi" &&
      !!ishod &&
      !ishod.prazno &&
      poslanaVr != null &&
      poslanaVr === st[klizac.id],
  );
  $effect(() => {
    if (!pokazi || nacin !== "postavi") return;
    untrack(() => (st = { ...st, [klizac.id]: najboljaVrijednost(spec) }));
  });
  function provjeriPostavi() {
    if (locked) return;
    poslanaVr = st[klizac.id];
    onodgovor({ [klizac.id]: st[klizac.id] });
  }

  // ── predvidi ──
  const pitPredvidi = untrack(() =>
    nacin === "predvidi" ? pitanja(spec) : [],
  );
  const predvidi = untrack(() =>
    nacin === "predvidi" ? ishodPredvidi(spec) : null,
  );
  let odabir = $state({});
  $effect(() => {
    if (!pokazi || nacin !== "predvidi") return;
    untrack(() => (odabir = { ...predvidi.tocno }));
  });
  function provjeriPredvidi() {
    if (locked) return;
    onodgovor({ ...odabir });
  }

  // ── izracunaj ──
  const pit = untrack(() => (nacin === "izracunaj" ? pitanja(spec) : []));
  const rez = untrack(() => pit.map((q) => izracun(spec, q)));
  let unosi = $state(pit.map(() => ""));
  $effect(() => {
    if (!pokazi || nacin !== "izracunaj") return;
    untrack(() => (unosi = rez.map((r) => zapisPolja(r.vrijednost))));
  });
  function provjeriIzracun(e) {
    e?.preventDefault();
    if (locked) return;
    onodgovor([...unosi]);
  }
  function potencija(i) {
    const v = unosi[i].trim();
    if (!/10\^/.test(v)) unosi[i] = `${v || "1"}·10^`;
    document.getElementById(`kv-${uid}-${i}`)?.focus();
  }

  // ── crtanje ──
  // predvidi: nakon točnog odgovora crta se stanje nakon promjene
  let stCrtanje = $derived(
    nacin === "predvidi" && otkriveno ? predvidi.stanje : st,
  );
  let vid = $derived(vidljivo(spec, otkriveno, provjereno));
  let f = $derived(fizika(spec, stCrtanje));
  let bojaF = $derived(
    scena === "foton" || scena === "fotoefekt" ? bojaFotona(f.lambdaNm) : null,
  );
  let boja = $derived(bojaF ? (vid.boja ? bojaF.rgb : NEUTRALNA) : NEUTRALNA);
  let kadar = $derived.by(() => {
    if (scena === "foton") {
      return kadarFoton(spec, stCrtanje, t, vid, t0);
    }
    if (scena === "elektronvolt") return kadarEV(spec, stCrtanje, t);
    if (scena === "fotoefekt") return kadarFotoefekt(spec, stCrtanje, t, vid);
    return kadarDeBroglie(spec, stCrtanje, t, vid);
  });
  let stupci = $derived(
    scena === "fotoefekt" ? stupciBilance(spec, stCrtanje) : null,
  );
  let oc = $derived(ocitanja(spec, stCrtanje, vid, { otkriveno, provjereno }));
  let opis = $derived(opisCrteza(spec, stCrtanje, vid));
  let napon = $derived.by(() => {
    if (scena !== "fotoefekt") return "";
    if (!vid.izvorPoznat) return "U_z = ?";
    return `U = ${tekstKlizaca(spec, "U", f.U)}`;
  });
  const uputa = untrack(() => uputaZa(spec));

  // ── gumbi metala i čestica (istrazi) ──
  const metali = untrack(() =>
    Array.isArray(spec.metali) ? spec.metali : null,
  );
  const cestice = untrack(() =>
    Array.isArray(spec.cestice) ? spec.cestice : null,
  );
  const IME_CESTICE = {
    elektron: "elektron",
    proton: "proton",
    loptica: LOPTICA.ime,
  };
  let bezV = $derived(scena === "de_broglie" && st.cestica === "loptica");

  // traka spektra uz klizač λ (UV i IC sivo)
  const spektar = (k) => {
    const s = [];
    for (let i = 0; i <= 16; i++) {
      const nm = k.min + ((k.max - k.min) * i) / 16;
      s.push(
        `rgb(${bojaFotona(nm).rgb.join(" ")}) ${((100 * i) / 16).toFixed(1)}%`,
      );
    }
    return `linear-gradient(90deg, ${s.join(", ")})`;
  };
  const klizaci = untrack(() => klizaciOd(spec));
  let klizaciZakljucani = $derived(nacin === "postavi" && (locked || pokazi));
  // „E_k“ → E s indeksom k (oznake iz kataloga)
  const dijelovi = (tekst) =>
    String(tekst)
      .split(/([A-Za-zλ]_\{?[a-z0-9]+\}?)/)
      .map((d) => {
        const m = d.match(/^([A-Za-zλ])_\{?([a-z0-9]+)\}?$/);
        return m ? { t: m[1], sub: m[2] } : { t: d };
      });
  const postaviKlizac = (id, x) =>
    (st = { ...st, [id]: Math.round(Number(x) * 1e9) / 1e9 });
</script>

{#if gledanje}
  <div class="kv-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

{#if nacin === "predvidi"}
  <div class="kv-promjena">
    <span class="kv-promjena-n">Promjena:</span>
    {predvidi.opis}
  </div>
{/if}

<figure class="lx-figure kv-fig">
  {#if scena === "foton"}
    <Foton
      {kadar}
      {vid}
      {boja}
      oznakaZracenja={vid.boja ? bojaF.oznaka : null}
      izvor={spec.izvor ?? ""}
      {opis}
    />
  {:else if scena === "elektronvolt"}
    <Ev {kadar} U={st.U} {opis} />
  {:else if scena === "fotoefekt"}
    <Fotoefekt
      {kadar}
      {stupci}
      {f}
      {vid}
      {boja}
      oznakaZracenja={bojaF.oznaka}
      {napon}
      {opis}
    />
  {:else}
    <Broglie {kadar} {f} {vid} {opis} />
  {/if}
</figure>

{#if oc.length}
  <div class="kv-ocitanja" aria-live="polite">
    {#each oc as o (o.naziv)}
      <span
        class="kv-chip"
        class:ok={o.stanje === "ok"}
        class:bad={o.stanje === "bad"}
        ><span class="kv-chip-n"
          >{#each dijelovi(o.naziv) as d, j (j)}{d.t}{#if d.sub}<sub
                >{d.sub}</sub
              >{/if}{/each}</span
        >
        <b
          >{#each dijelovi(o.tekst) as d, j (j)}{d.t}{#if d.sub}<sub
                >{d.sub}</sub
              >{/if}{/each}</b
        ></span
      >
    {/each}
  </div>
{/if}

{#if metali}
  <div class="kv-gumbi" role="group" aria-label="Metal pločice">
    {#each metali as m, i (m.naziv)}
      <button
        type="button"
        class="btn btn-quiet kv-gumb"
        class:sel={st.metal === i}
        aria-pressed={st.metal === i}
        onclick={() => (st = { ...st, metal: i })}>{m.naziv}</button
      >
    {/each}
  </div>
{/if}
{#if cestice}
  <div class="kv-gumbi" role="group" aria-label="Čestica">
    {#each cestice as c (c)}
      <button
        type="button"
        class="btn btn-quiet kv-gumb"
        class:sel={st.cestica === c}
        aria-pressed={st.cestica === c}
        onclick={() => (st = { ...st, cestica: c })}>{IME_CESTICE[c]}</button
      >
    {/each}
  </div>
{/if}

{#if uputa && !locked && !pokazi}
  <p class="kv-uputa">{uputa}</p>
{/if}

{#if klizaci.length && (gledanje || nacin === "postavi")}
  <div class="kv-klizaci">
    {#each klizaci as k (k.id)}
      {#if !(k.id === "v" && bezV)}
        {@const m = metaKlizaca(spec, k.id)}
        <div class="kv-red">
          <div class="kv-glava">
            <label for="kv-{uid}-{k.id}">{m.oznaka}</label>
            <output for="kv-{uid}-{k.id}" class="kv-vr">
              {#if k.id === "lambda"}<span
                  class="kv-boja"
                  style:background="rgb({bojaFotona(st.lambda).rgb.join(' ')})"
                ></span>{/if}{tekstKlizaca(spec, k.id, st[k.id])}</output
            >
          </div>
          <input
            id="kv-{uid}-{k.id}"
            type="range"
            min={k.min}
            max={k.max}
            step={k.korak}
            disabled={klizaciZakljucani}
            value={st[k.id]}
            aria-valuetext={tekstKlizaca(spec, k.id, st[k.id])}
            style:accent-color={k.id === "lambda"
              ? `rgb(${bojaFotona(st.lambda).rgb.join(" ")})`
              : null}
            oninput={(e) => postaviKlizac(k.id, e.currentTarget.value)}
          />
          {#if k.id === "lambda"}
            <div
              class="kv-spektar"
              style:background={spektar(k)}
              aria-hidden="true"
            ></div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
{/if}
{#if bezV}
  <p class="kv-uputa">Teniska loptica: m = 0,057 kg, v = 50 m/s.</p>
{/if}

{#if nacin === "postavi"}
  <div class="lx-actions kv-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriPostavi}
      disabled={locked}>Provjeri</button
    >
  </div>
{:else if nacin === "predvidi"}
  <div class="kv-predvidi">
    {#each pitPredvidi as k (k)}
      <fieldset class="kv-pitanje" disabled={locked}>
        <legend
          >{#each dijelovi(NAZIV_PREDVIDI[k]) as d, j (j)}{d.t}{#if d.sub}<sub
                >{d.sub}</sub
              >{/if}{/each}</legend
        >
        <div class="kv-izbori">
          {#each IZBORI as iz (iz.id)}
            <button
              type="button"
              class="btn btn-quiet kv-gumb"
              class:sel={odabir[k] === iz.id}
              class:ok={otkriveno && odabir[k] === iz.id}
              aria-pressed={odabir[k] === iz.id}
              onclick={() => (odabir = { ...odabir, [k]: iz.id })}
              >{iz.tekst}</button
            >
          {/each}
        </div>
      </fieldset>
    {/each}
    <div class="lx-actions">
      <button
        type="button"
        class="btn btn-primary"
        onclick={provjeriPredvidi}
        disabled={locked || pitPredvidi.some((k) => !odabir[k])}
        >Provjeri</button
      >
    </div>
  </div>
{:else if nacin === "izracunaj"}
  <form class="kv-izr" onsubmit={provjeriIzracun}>
    {#each rez as r, i (i)}
      <div class="kv-polje">
        <label for="kv-{uid}-{i}" class="kv-naziv">{r.naziv}</label>
        <div class="lx-broj">
          <span class="kv-oznaka"
            ><b
              >{#each dijelovi(r.oznaka) as d, j (j)}{d.t}{#if d.sub}<sub
                    >{d.sub}</sub
                  >{/if}{/each}</b
            > =</span
          >
          <input
            id="kv-{uid}-{i}"
            class="inp lx-broj-inp"
            class:ok={otkriveno}
            inputmode="decimal"
            autocomplete="off"
            placeholder="?"
            disabled={locked}
            aria-label="{r.naziv} u {r.jedinica}"
            bind:value={unosi[i]}
          />
          <span class="lx-unit">{r.jedinica}</span>
          {#if !locked && trebaPotenciju(r.jedinica)}
            <button
              type="button"
              class="btn btn-quiet kv-pot"
              onclick={() => potencija(i)}
              aria-label="Dodaj potenciju broja 10">·10ⁿ</button
            >
          {/if}
        </div>
      </div>
    {/each}
    <div class="lx-actions">
      <button
        class="btn btn-primary"
        type="submit"
        disabled={locked || unosi.some((u) => !u.trim())}>Provjeri</button
      >
    </div>
  </form>
{/if}

<style>
  .kv-tekst {
    margin-bottom: 10px;
  }
  .kv-fig {
    max-width: 440px;
    margin-bottom: 8px;
  }
  .kv-promjena {
    max-width: 440px;
    margin: 0 auto 10px;
    padding: 8px 12px;
    border-radius: 10px;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    font-size: 14px;
  }
  .kv-promjena-n {
    font-weight: 600;
    margin-right: 4px;
  }
  .kv-ocitanja {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin: 0 auto 10px;
    max-width: 440px;
  }
  .kv-chip {
    display: inline-flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    font-size: 13px;
    color: var(--text-dim);
  }
  .kv-chip b {
    font-family: var(--font-mono);
    color: var(--text);
    font-weight: 600;
  }
  .kv-chip.ok {
    border-color: var(--lx-ok);
    background: color-mix(in srgb, var(--lx-ok) 10%, transparent);
  }
  .kv-chip.bad {
    border-color: var(--lx-bad);
    background: color-mix(in srgb, var(--lx-bad) 8%, transparent);
  }
  .kv-chip-n {
    font-size: 12px;
  }
  .kv-gumbi,
  .kv-izbori {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin: 0 auto 10px;
  }
  .kv-gumb {
    min-height: 40px;
    padding: 0 14px;
    border: 1px solid var(--border-strong);
    border-radius: 999px;
  }
  .kv-gumb.sel {
    border-color: var(--primary);
    background: var(--primary-dim);
    color: var(--text);
  }
  .kv-gumb.ok {
    border-color: var(--lx-ok);
    background: color-mix(in srgb, var(--lx-ok) 12%, transparent);
  }
  .kv-uputa {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 0 0 8px;
  }
  .kv-klizaci {
    display: grid;
    gap: 10px;
    max-width: 440px;
    margin: 0 auto 12px;
  }
  .kv-glava {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 2px;
    font-size: 14px;
  }
  .kv-glava label {
    color: var(--text-dim);
  }
  .kv-vr {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
  }
  .kv-boja {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    box-shadow: 0 0 0 1px var(--border-strong);
  }
  input[type="range"] {
    width: 100%;
    margin: 0;
    height: 32px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  input[type="range"]:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .kv-spektar {
    height: 5px;
    margin: -4px 2px 0;
    border-radius: 3px;
    opacity: 0.85;
  }
  .kv-akcije {
    justify-content: center;
  }
  .kv-predvidi {
    display: grid;
    gap: 6px;
  }
  .kv-pitanje {
    border: 0;
    padding: 0;
    margin: 0;
  }
  .kv-pitanje legend {
    font-size: 14px;
    margin-bottom: 6px;
    text-align: center;
    width: 100%;
  }
  .kv-izr {
    display: grid;
    gap: 10px;
  }
  .kv-polje {
    display: grid;
    gap: 4px;
  }
  .kv-naziv {
    font-size: 13.5px;
    color: var(--text-dim);
  }
  .kv-oznaka {
    font-size: 14px;
    color: var(--text);
  }
  .kv-oznaka b {
    font-family: var(--font-serif, serif);
    font-style: italic;
    font-size: 16px;
  }
  .kv-pot {
    min-width: 44px;
    min-height: 36px;
    font-family: var(--font-mono);
  }
</style>
