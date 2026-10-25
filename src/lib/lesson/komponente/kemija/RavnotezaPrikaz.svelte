<script>
  // Crtež ravnotežne smjese za widget „ravnoteza“: posuda (plin pod klipom ili otopina u čaši) obojena prema
  // koncentracijama obojenih vrsta, grijanje ili led ispod, stupci koncentracija (svaka vrsta u svom mjerilu, crtica
  // je prethodna ravnoteža) i ploča s K i Q. Sve brojeve računa katalog/kemija/ravnoteza.js; ovdje se samo crta.
  import Formula from "./Formula.svelte";
  import { BOJE } from "$lib/lesson/katalog/kemija/_reakcije.js";
  import { ukljucene, bojaSmjese, bojaVrste, kvocijent, jedinicaK, jedinicaVelicine, simbolK, slovo, zapisBroja, zapisSmjera } from "$lib/lesson/katalog/kemija/ravnoteza.js";

  // c0: početna ravnoteža (mjerilo boje), prije: prethodna ravnoteža (crtica na stupcu), faza: "ravnoteza" |
  // "poremeceno" | "pomak", smjer: smjer pomaka koji je u tijeku, K0: K početne smjese
  let { spec, c, c0, prije = null, V = 1, T = 0, K, K0 = K, skala, faza = "ravnoteza", smjer = null, pokaziKQ = true, zamisljeno = false } = $props();

  const u = $derived(ukljucene(spec));
  const plin = $derived(u.every((x) => x.stanje === "g" || (spec.konstanta === "Kp" && x.stanje == null)));
  const boja = $derived(bojaSmjese(spec, c, c0));
  const Q = $derived(kvocijent(spec, c));
  const jedK = $derived(jedinicaK(spec));
  const jedC = $derived(jedinicaVelicine(spec));
  const K_ = $derived(simbolK(spec));
  const sl = $derived(slovo(spec));
  const omjer = $derived(Q / K);
  const uRavnotezi = $derived(Math.abs(Math.log(omjer)) < 1e-6);
  const kPromijenjen = $derived(Math.abs(Math.log(K / K0)) > 1e-9);

  // posuda: visina plina (klip) ili razina otopine prema volumenu
  const H_DNO = 168;
  const visina = $derived(plin ? Math.max(28, Math.min(146, 84 * Math.sqrt(V))) : Math.max(34, Math.min(140, 62 * Math.sqrt(V))));
  const vrh = $derived(H_DNO - visina);
  const ispuna = $derived(boja ? boja.hex : null);
  const prozirnost = $derived(boja ? boja.jakost : 1);

  const sirina = (x) => Math.max(0, Math.min(100, (100 * (c[x.formula] ?? 0)) / (skala[x.formula] || 1)));
  const sirinaPrije = (x) => (prije ? Math.max(0, Math.min(100, (100 * (prije[x.formula] ?? 0)) / (skala[x.formula] || 1))) : null);
  const bojaStupca = (x) => {
    const b = bojaVrste(spec, x.formula);
    return b && b !== "bezbojna" && BOJE[b]?.hex ? BOJE[b].hex : null;
  };
  const znak = $derived(uRavnotezi ? "=" : omjer < 1 ? "<" : ">");
</script>

<div class="rv-scena" class:anim={faza !== "ravnoteza"}>
  <div class="rv-posuda">
    <svg viewBox="0 0 120 200" role="img" aria-label={plin ? "Plinska smjesa u posudi s klipom" : "Otopina u čaši"}>
      {#if plin}
        <!-- cilindar s klipom -->
        <rect class="rv-ispuna" x="23" y={vrh} width="74" height={visina} fill={ispuna ?? "var(--rv-plin)"} fill-opacity={ispuna ? prozirnost : 1} />
        <path class="rv-staklo" d="M22,8 V168 H98 V8" />
        <rect class="rv-klip" x="23" y={vrh - 9} width="74" height="9" rx="1.5" />
        <rect class="rv-klip" x="56" y="2" width="8" height={Math.max(0, vrh - 9)} />
      {:else}
        <!-- čaša s otopinom -->
        <path class="rv-ispuna" d="M22,{vrh} H98 V160 a8,8 0 0 1 -8,8 H30 a8,8 0 0 1 -8,-8 Z" fill={ispuna ?? "var(--rv-voda)"} fill-opacity={ispuna ? prozirnost : 1} />
        <path class="rv-staklo" d="M16,20 h6 V160 a8,8 0 0 0 8,8 H90 a8,8 0 0 0 8,-8 V20 h6" />
      {/if}
      <!-- temperatura: plamen ili led -->
      {#if T > 0}
        {#each Array(Math.min(3, T)) as _, k (k)}
          <path class="rv-plamen" transform="translate({60 + (k - (Math.min(3, T) - 1) / 2) * 22},176)" d="M0,20 C-8,14 -6,6 -1,0 C0,6 4,7 5,3 C9,9 8,16 0,20 Z" />
        {/each}
      {:else if T < 0}
        {#each Array(Math.min(3, -T)) as _, k (k)}
          <rect class="rv-led" x={44 + (k - (Math.min(3, -T) - 1) / 2) * 20} y="178" width="13" height="13" rx="2.5" transform="rotate({k * 14 - 8} {50 + (k - (Math.min(3, -T) - 1) / 2) * 20} 184)" />
        {/each}
      {/if}
    </svg>
    {#if T !== 0}<span class="rv-temp">{T > 0 ? "toplije" : "hladnije"}</span>{/if}
  </div>

  <div class="rv-desno">
    <div class="rv-stupci" role="list" aria-label="Ravnotežne {plin && spec.konstanta === 'Kp' ? 'parcijalni tlakovi' : 'koncentracije'}">
      {#each u as x (x.formula)}
        <div class="rv-red" role="listitem">
          <span class="rv-oznaka">{sl}(<Formula f={x.formula} />)</span>
          <span class="rv-traka">
            <span class="rv-traka-ispuna" style="width:{sirina(x)}%;{bojaStupca(x) ? `background:${bojaStupca(x)}` : ''}"></span>
            {#if prije && sirinaPrije(x) != null}<span class="rv-prije" style="left:{sirinaPrije(x)}%" title="prethodna ravnoteža"></span>{/if}
          </span>
          <span class="rv-vrijednost">{zapisBroja(c[x.formula])}</span>
        </div>
      {/each}
      <p class="rv-jedinica"><Formula f={jedC} />{#if prije}<span class="rv-legenda"><span class="rv-prije-l"></span> prethodna ravnoteža</span>{/if}</p>
    </div>

    {#if pokaziKQ}
      <div class="rv-kq" aria-live="polite">
        <div class="rv-kq-red"><span class="rv-k">K<sub>{K_.slice(1)}</sub></span> = <Formula f={`${zapisBroja(K)}${jedK ? ` ${jedK}` : ""}`} />{#if kPromijenjen}<span class="rv-napomena">promijenio se s temperaturom</span>{/if}</div>
        <div class="rv-kq-red"><span class="rv-k">Q</span> = <Formula f={`${zapisBroja(Q)}${jedK ? ` ${jedK}` : ""}`} /></div>
        <p class="rv-status" class:pomak={!uRavnotezi}>
          {#if uRavnotezi}
            Q = K<sub>{K_.slice(1)}</sub>: smjesa je u ravnoteži.
          {:else}
            Q {znak} K<sub>{K_.slice(1)}</sub>: ravnoteža se pomiče <b>{zapisSmjera(smjer ?? (omjer < 1 ? "udesno" : "ulijevo"))}</b> <span class="rv-str" aria-hidden="true">{omjer < 1 ? "→" : "←"}</span>
          {/if}
        </p>
        {#if zamisljeno}<p class="rv-napomena">Koncentracije su zamišljene, samo za istraživanje.</p>{/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .rv-scena {
    --rv-voda: color-mix(in srgb, var(--lx-water) 14%, transparent);
    --rv-plin: color-mix(in srgb, var(--text-faint) 9%, transparent);
    display: flex;
    flex-wrap: wrap;
    gap: 12px 16px;
    align-items: flex-start;
    margin: 4px 0 8px;
  }
  .rv-posuda {
    flex: 0 0 auto;
    width: 112px;
    margin: 0 auto;
    display: grid;
    justify-items: center;
    gap: 2px;
  }
  .rv-posuda svg {
    display: block;
    width: 112px;
    height: auto;
    overflow: visible;
  }
  .rv-staklo {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 2.2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .rv-klip {
    fill: var(--text-faint);
  }
  .rv-ispuna,
  .rv-klip {
    transition:
      y 0.35s ease-out,
      height 0.35s ease-out,
      fill 0.25s linear,
      fill-opacity 0.25s linear,
      d 0.35s ease-out;
  }
  .rv-plamen {
    fill: #f2a330;
    stroke: #e4572e;
    stroke-width: 1;
  }
  .rv-led {
    fill: color-mix(in srgb, var(--lx-water) 35%, transparent);
    stroke: var(--lx-water);
    stroke-width: 1;
  }
  .rv-temp {
    font-size: 12px;
    color: var(--text-faint);
  }
  .rv-desno {
    flex: 1 1 240px;
    min-width: 0;
    display: grid;
    gap: 10px;
  }
  .rv-stupci {
    display: grid;
    grid-template-columns: auto minmax(60px, 1fr) auto;
    align-items: center;
    gap: 7px 10px;
  }
  .rv-red {
    display: contents;
  }
  .rv-oznaka {
    font-family: var(--font-sans);
    font-size: 14px;
    white-space: nowrap;
    color: var(--text);
  }
  .rv-traka {
    position: relative;
    height: 14px;
    border-radius: 999px;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    overflow: visible;
  }
  .rv-traka-ispuna {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    border-radius: 999px;
    background: var(--primary);
    transition: width 0.3s ease-out;
  }
  .anim .rv-traka-ispuna {
    transition: none;
  }
  .rv-prije {
    position: absolute;
    top: -4px;
    bottom: -4px;
    width: 0;
    border-left: 2px dashed var(--text-dim);
    transform: translateX(-1px);
  }
  .rv-vrijednost {
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
    font-size: 13.5px;
    min-width: 3.6em;
    text-align: right;
    color: var(--text-dim);
    white-space: nowrap;
  }
  .rv-jedinica {
    grid-column: 1 / -1;
    margin: -2px 0 0;
    font-size: 12px;
    color: var(--text-faint);
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    justify-content: space-between;
  }
  .rv-legenda {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .rv-prije-l {
    display: inline-block;
    height: 12px;
    border-left: 2px dashed var(--text-dim);
  }
  .rv-kq {
    display: grid;
    gap: 3px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    font-family: var(--font-sans);
    font-size: 14.5px;
  }
  .rv-kq-red {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 6px;
  }
  .rv-k {
    font-style: italic;
    font-weight: 600;
  }
  .rv-k sub {
    font-style: normal;
    font-size: 0.7em;
  }
  .rv-status {
    margin: 3px 0 0;
    font-size: 13.5px;
    color: var(--text-dim);
  }
  .rv-status.pomak {
    color: var(--primary);
  }
  .rv-str {
    font-weight: 700;
  }
  .rv-napomena {
    margin: 0;
    font-size: 12px;
    color: var(--text-faint);
  }
  @media (prefers-reduced-motion: reduce) {
    .rv-ispuna,
    .rv-klip,
    .rv-traka-ispuna {
      transition: none;
    }
  }
</style>
