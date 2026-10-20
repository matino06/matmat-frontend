<script>
  // poluraspad / aktivnost: bočica izotopa, Geigerov brojač koji klikće to rjeđe što je jezgara manje i ploča A = λ·N.
  // Fizika, tekstovi i što je skriveno dolaze iz katalog/fizika/poluraspad.js; ovdje se crta i animira.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Klizaci from "./_SileKlizaci.svelte";
  import Unos from "./_PoluraspadUnos.svelte";
  import {
    poluraspad,
    geometrijaAktivnosti,
    jezgreBocice,
    prikazAktivnosti,
    tMaxAktivnosti,
    brzinaSataAktivnosti,
    poljaIzracunaj,
    rng,
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
  const slobodno = istrazi || prikaz;
  const geo = geometrijaAktivnosti();
  const tMax = untrack(() => tMaxAktivnosti(spec));
  const brzina = untrack(() => brzinaSataAktivnosti(spec));
  const tCiljaIzracun = untrack(() => spec.t ?? 0);

  let kl = $state(
    untrack(() =>
      Object.fromEntries(
        (spec.klizaci ?? []).map((k) => [k.id, k.pocetak ?? k.min]),
      ),
    ),
  );
  const klizaci = untrack(() => spec.klizaci ?? []);
  let t = $state(0);
  let igra = $state(false);
  let tOtkr = $state(0);
  let animOtkr = $state(false);

  // ── provjera i otkrivanje ──
  let poslano = $state(null);
  let unosi = $state(untrack(() => (spec.pitaj ?? []).map(() => "")));
  const trenutno = () => JSON.stringify(unosi.map((x) => x.trim()));
  let neprom = $derived(poslano != null && poslano === trenutno());
  let otkriveno = $derived(slobodno || pokazi || (!!ishod?.tocno && neprom));
  $effect(() => {
    if (slobodno) return;
    if (otkriveno)
      untrack(() => {
        if (prefersReducedMotion.current || tCiljaIzracun <= 0) {
          tOtkr = tCiljaIzracun;
          animOtkr = false;
        } else {
          tOtkr = 0;
          animOtkr = true;
        }
      });
    else
      untrack(() => {
        tOtkr = 0;
        animOtkr = false;
      });
  });
  let tPrikaz = $derived(slobodno ? t : otkriveno ? tOtkr : 0);
  let p = $derived(prikazAktivnosti(spec, tPrikaz, otkriveno, kl));
  let jezgre = $derived(jezgreBocice(spec, p.udio));

  // ── Geigerov brojač: klikovi (izgled; brzina iz kataloga) ──
  let klikova = $state(0);
  let cestice = $state([]); // {id, x, y, rodjen}
  let led = $state(0);
  let zvuk = $state(false);
  let ctx = null;
  function kliknizvuk() {
    if (!zvuk) return;
    try {
      ctx ??= new AudioContext();
      const n = ctx.createBufferSource();
      const b = ctx.createBuffer(1, 400, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
      n.buffer = b;
      const g = ctx.createGain();
      g.gain.value = 0.35;
      n.connect(g).connect(ctx.destination);
      n.start();
    } catch {
      zvuk = false;
    }
  }
  function prekidacZvuka() {
    zvuk = !zvuk;
    if (zvuk) {
      ctx ??= new AudioContext();
      ctx.resume?.();
    }
  }

  let figura = $state();
  let prikazPokrenut = false;
  onMount(() => {
    const slucaj = rng(untrack(() => spec.sjeme ?? 90));
    let id;
    let zadnji = 0;
    let doKlika = 0.2;
    let akum = 0;
    let idC = 0;
    const petlja = (now) => {
      const dt = zadnji ? Math.min(0.1, (now - zadnji) / 1000) : 0;
      zadnji = now;
      const skokovi = prefersReducedMotion.current;
      if (slobodno && igra) {
        if (skokovi) {
          akum += dt;
          const korakSim = tMax / 12;
          if (akum >= korakSim / brzina) {
            akum = 0;
            t = Math.min(tMax, t + korakSim);
          }
        } else t = Math.min(tMax, t + dt * brzina);
        if (t >= tMax) igra = false;
      }
      if (animOtkr) {
        tOtkr = Math.min(tCiljaIzracun, tOtkr + dt * brzina);
        if (tOtkr >= tCiljaIzracun) animOtkr = false;
      }
      // klikovi: slučajni razmaci (eksponencijalna razdioba), srednja stopa iz kataloga
      doKlika -= dt * p.stopa;
      if (doKlika <= 0) {
        doKlika = -Math.log(1 - slucaj() * 0.999);
        klikova++;
        led = now;
        kliknizvuk();
        if (!skokovi) {
          const zive = jezgre.map((z, k) => (z ? k : -1)).filter((k) => k >= 0);
          if (zive.length) {
            const k = zive[Math.floor(slucaj() * zive.length)];
            cestice = [
              ...cestice.slice(-6),
              { id: idC++, ...geo.jezgre[k], rodjen: now },
            ];
          }
        }
      }
      if (cestice.length && now - cestice[0].rodjen > 400)
        cestice = cestice.filter((c) => now - c.rodjen <= 400);
      sad = now;
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    let ob;
    if (prikaz && typeof IntersectionObserver !== "undefined" && figura) {
      ob = new IntersectionObserver(
        (e) => {
          if (e[0]?.isIntersecting && !prikazPokrenut) {
            prikazPokrenut = true;
            igra = true;
          }
        },
        { threshold: 0.5 },
      );
      ob.observe(figura);
    }
    return () => {
      cancelAnimationFrame(id);
      ob?.disconnect();
      ctx?.close?.();
    };
  });
  let sad = $state(0);
  const cilj = { x: geo.sonda.x2 - 6, y: geo.sonda.y2 };
  const polozaj = (c) => {
    const u = Math.min(1, (sad - c.rodjen) / 400);
    return {
      x: c.x + (cilj.x - c.x) * u,
      y: c.y + (cilj.y - c.y) * u,
      o: 1 - u * 0.7,
    };
  };
  let ledSvijetli = $derived(sad - led < 70);

  function pokreni() {
    if (t >= tMax) t = 0;
    igra = !igra;
  }
  function ispocetka() {
    igra = false;
    t = 0;
  }
  function provjeriUnos(v) {
    if (locked) return;
    poslano = trenutno();
    onodgovor(v);
  }
  const polja = untrack(() => (izracunaj ? poljaIzracunaj(spec) : []));
  const b = geo.bocica;
  const br = geo.brojac;
  const pl = geo.ploca;
  const kucice = [
    { k: "A", x: 12, w: 116, ime: "A (aktivnost)" },
    { k: "lambda", x: 148, w: 112, ime: "λ (konstanta raspada)" },
    { k: "N", x: 274, w: 74, ime: "N (jezgre)" },
  ];
  const kut = (x) => Math.round(x * 10) / 10;
  let kazaljka = $derived(kut((tPrikaz / tMax) * 360 * 3));
</script>

{#if slobodno}
  <div class="pa-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure pa" bind:this={figura}>
  <svg viewBox="0 0 {geo.W} {geo.H}" role="img" aria-label={p.aria}>
    <!-- sat i T -->
    <circle cx={geo.sat.cx} cy={geo.sat.cy} r={geo.sat.r} class="pa-sat-lice" />
    <line
      x1={geo.sat.cx}
      y1={geo.sat.cy}
      x2={geo.sat.cx}
      y2={geo.sat.cy - geo.sat.r + 3}
      class="pa-sat-kazaljka"
      style:transform="rotate({kazaljka}deg)"
      style:transform-origin="{geo.sat.cx}px {geo.sat.cy}px"
    />
    <text x={geo.sat.tekstX} y={geo.sat.tekstY} class="pa-sat-tekst"
      >{p.sat}</text
    >
    <text x={geo.W - 14} y={geo.sat.tekstY} text-anchor="end" class="pa-T"
      >{p.T}</text
    >

    <!-- bočica -->
    <rect
      x={b.x + 24}
      y={b.y - 14}
      width={b.w - 48}
      height="18"
      rx="3"
      class="pa-cep"
    />
    <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="14" class="pa-bocica" />
    {#each geo.jezgre as j, k (k)}
      <circle
        cx={j.x}
        cy={j.y}
        r="3.1"
        class={jezgre[k] ? "pa-jezgra" : "pa-jezgra-mrtva"}
      />
    {/each}
    <text
      x={b.x + b.w / 2}
      y={b.y + b.h + 16}
      text-anchor="middle"
      class="pa-izotop"
      >{p.izotop}{#if p.ime}<tspan class="pa-dim" dx="5">{p.ime}</tspan
        >{/if}</text
    >

    <!-- sonda i brojač -->
    <line
      x1={geo.sonda.x1}
      y1={geo.sonda.y1}
      x2={geo.sonda.x2}
      y2={geo.sonda.y2}
      class="pa-kabel"
    />
    <rect
      x={geo.sonda.x2 - 14}
      y={geo.sonda.y2 - 8}
      width="26"
      height="16"
      rx="5"
      class="pa-sonda"
    />
    {#each cestice as c (c.id)}
      {@const q = polozaj(c)}
      <circle
        cx={kut(q.x)}
        cy={kut(q.y)}
        r="2.4"
        class="pa-cestica"
        opacity={q.o}
      />
    {/each}
    <rect
      x={br.x}
      y={br.y}
      width={br.w}
      height={br.h}
      rx="10"
      class="pa-brojac"
    />
    <rect
      x={br.x + 10}
      y={br.y + 10}
      width={br.w - 20}
      height="36"
      rx="5"
      class="pa-zaslon"
    />
    <text
      x={br.x + br.w / 2}
      y={br.y + 34}
      text-anchor="middle"
      class="pa-zaslon-t">{p.zaslon}</text
    >
    <text x={br.x + 12} y={br.y + 64} class="pa-brojac-ime"
      >Geigerov brojač</text
    >
    <circle
      cx={br.x + br.w - 16}
      cy={br.y + 60}
      r="5"
      class="pa-led"
      class:svijetli={ledSvijetli}
    />
    <text x={br.x + 12} y={br.y + 84} class="pa-klikovi"
      >klikova: {klikova}</text
    >

    <!-- ploča A = λ·N -->
    {#each kucice as k (k.k)}
      {@const v = p.kucice[k.k]}
      <rect
        x={k.x}
        y={pl.y}
        width={k.w}
        height={pl.h}
        rx="8"
        class="pa-kucica"
        class:upitnik={v === "?"}
      />
      <text
        x={k.x + k.w / 2}
        y={pl.y + 17}
        text-anchor="middle"
        class="pa-kucica-ime">{k.ime}</text
      >
      <text
        x={k.x + k.w / 2}
        y={pl.y + 40}
        text-anchor="middle"
        class="pa-kucica-v"
        class:upitnik={v === "?"}>{v}</text
      >
    {/each}
    <text x="138" y={pl.y + 38} text-anchor="middle" class="pa-znak">=</text>
    <text x="267" y={pl.y + 38} text-anchor="middle" class="pa-znak">·</text>
    <text
      x={geo.W / 2}
      y={pl.y + pl.h + 18}
      text-anchor="middle"
      class="pa-dim pa-mali"
      >1 Bq = 1 raspad u sekundi · λ = ln 2 / T, T u sekundama</text
    >
  </svg>
</figure>

<div class="lx-actions pa-akcije">
  {#if slobodno}
    <button type="button" class="btn btn-primary" onclick={pokreni}
      >{igra ? "⏸ Zaustavi" : t >= tMax ? "↺ Ponovi" : "▶ Pokreni sat"}</button
    >
    <button
      type="button"
      class="btn btn-quiet"
      onclick={ispocetka}
      disabled={t === 0 && !igra}>↺ Ispočetka</button
    >
  {/if}
  <button
    type="button"
    class="btn btn-quiet"
    onclick={prekidacZvuka}
    aria-pressed={zvuk}>{zvuk ? "🔊 Zvuk uključen" : "🔇 Zvuk brojača"}</button
  >
</div>
{#if istrazi && klizaci.length}
  <Klizaci {klizaci} bind:vrijednosti={kl} />
{/if}

{#if izracunaj}
  {#if p.lanac}
    <div class="pa-lanac" aria-label="Postupak">
      {#each p.lanac as l (l)}<div>{l}</div>{/each}
    </div>
  {/if}
  <Unos
    {polja}
    bind:unosi
    {locked}
    tocno={!!ishod?.tocno && neprom}
    onposalji={provjeriUnos}
  />
{/if}

{#if pokazi && !slobodno}
  <p class="lx-solution">Točan odgovor: {poluraspad.tocanOdgovor(spec)}</p>
{/if}

<style>
  .pa-tekst {
    margin-bottom: 10px;
  }
  .pa {
    max-width: 460px;
    margin-bottom: 6px;
  }
  .pa-akcije {
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .pa-sat-lice {
    fill: var(--bg-elev);
    stroke: var(--text-dim);
    stroke-width: 2;
  }
  .pa-sat-kazaljka {
    stroke: var(--danger);
    stroke-width: 2;
    stroke-linecap: round;
  }
  .pa-sat-tekst {
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 700;
    fill: var(--text);
  }
  .pa-T {
    font-family: var(--font-mono);
    font-size: 13px;
    fill: var(--text-dim);
  }
  .pa-cep {
    fill: var(--text-faint);
  }
  .pa-bocica {
    fill: color-mix(in srgb, var(--success) 8%, var(--bg-elev));
    stroke: color-mix(in srgb, var(--success) 50%, var(--border));
    stroke-width: 2;
  }
  .pa-jezgra {
    fill: var(--success);
    filter: drop-shadow(
      0 0 2px color-mix(in srgb, var(--success) 70%, transparent)
    );
  }
  .pa-jezgra-mrtva {
    fill: color-mix(in srgb, var(--text-faint) 30%, transparent);
  }
  .pa-izotop {
    font-size: 14px;
    font-weight: 700;
    fill: var(--text);
  }
  .pa-dim {
    fill: var(--text-dim);
    font-weight: 400;
    font-size: 12px;
  }
  .pa-mali {
    font-size: 10.5px;
  }
  .pa-kabel {
    stroke: var(--text-faint);
    stroke-width: 4;
    stroke-linecap: round;
  }
  .pa-sonda {
    fill: var(--text-dim);
  }
  .pa-cestica {
    fill: var(--warn);
  }
  .pa-brojac {
    fill: var(--bg-elev-2);
    stroke: var(--border-strong);
    stroke-width: 1.5;
  }
  .pa-zaslon {
    fill: #0f1a12;
    stroke: var(--border-strong);
  }
  .pa-zaslon-t {
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 700;
    fill: #6ee7b7;
  }
  .pa-brojac-ime {
    font-size: 11.5px;
    fill: var(--text-dim);
  }
  .pa-klikovi {
    font-size: 11px;
    font-family: var(--font-mono);
    fill: var(--text-faint);
  }
  .pa-led {
    fill: color-mix(in srgb, var(--danger) 25%, var(--bg-elev));
  }
  .pa-led.svijetli {
    fill: var(--danger);
  }
  .pa-kucica {
    fill: var(--bg-elev);
    stroke: var(--border-strong);
  }
  .pa-kucica.upitnik {
    stroke-dasharray: 4 3;
  }
  .pa-kucica-ime {
    font-size: 10px;
    fill: var(--text-dim);
  }
  .pa-kucica-v {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    fill: var(--text);
  }
  .pa-kucica-v.upitnik {
    fill: var(--text-faint);
    font-size: 16px;
  }
  .pa-znak {
    font-size: 18px;
    font-weight: 700;
    fill: var(--text-dim);
  }
  .pa-lanac {
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.7;
    padding: 8px 12px;
    margin-bottom: 10px;
    border-radius: 8px;
    background: var(--bg-elev-2);
    overflow-x: auto;
  }
</style>
