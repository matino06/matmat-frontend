<script>
  // Tijela u posudi s tekućinom: pliva, lebdi ili tone. Ishod računa katalog iz gustoća (uronjeno.ishodi), ovdje se
  // samo prikazuje, tako da crtež i provjera nikad ne kažu različito.
  import { untrack } from "svelte";
  import { Tween, prefersReducedMotion } from "svelte/motion";
  import { cubicOut, backOut } from "svelte/easing";
  import Md from "./Md.svelte";
  import { uronjeno } from "$lib/lesson/katalog/istrazivanje.js";
  import { formatNumber } from "$lib/lesson/core/number.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const ISHODI = ["pliva", "lebdi", "tone"];
  const OPIS = { pliva: "pliva", lebdi: "lebdi", tone: "tone" };

  // posuda u koordinatama viewBoxa
  const L = 36;
  const R = 324;
  const RUB = 58;
  const POVRSINA = 108;
  const DNO = 246;
  const VIS = 40; // visina tijela
  const GORE = 22; // središte tijela prije pada, iznad posude

  let pitanje = $derived(spec.nacin === "predvidi");
  let tijela = $derived(spec.tijela ?? []);
  let rf = $derived(spec.tekucina.gustoca);
  let istina = $derived(uronjeno.ishodi(spec));
  let sirina = $derived(Math.min(64, (R - L) / Math.max(1, tijela.length) - 12));
  const xOf = (i, n) => L + ((i + 0.5) * (R - L)) / n;

  // gdje tijelo stane: pliva uronjeno u omjeru ρt/ρf, lebdi u sredini, tone do dna
  function cilj(i) {
    const t = tijela[i];
    const o = istina[i];
    if (o === "pliva") return POVRSINA + (t.gustoca / rf) * VIS - VIS / 2;
    if (o === "lebdi") return (POVRSINA + DNO) / 2;
    return DNO - 2 - VIS / 2;
  }

  const pos = untrack(() => spec.tijela ?? []).map(() => new Tween(GORE));
  let unutra = $state(untrack(() => (spec.tijela ?? []).map(() => false)));

  function spusti(i) {
    if (unutra[i]) return;
    unutra[i] = true;
    const o = istina[i];
    const k = prefersReducedMotion.current ? 0 : 1;
    pos[i].set(GORE, { duration: 0 });
    // pliva: propadne malo dublje pa se vrati na površinu (backOut), ostala usporavaju u tekućini
    pos[i].set(cilj(i), { duration: (o === "pliva" ? 900 : o === "lebdi" ? 1000 : 1200) * k, easing: o === "pliva" ? backOut : cubicOut });
  }
  function spustiSve() {
    tijela.forEach((_, i) => setTimeout(() => spusti(i), prefersReducedMotion.current ? 0 : i * 180));
  }
  function izvadiSve() {
    unutra = tijela.map(() => false);
    pos.forEach((p) => p.set(GORE, { duration: 0 }));
  }

  // predvidi
  let izbor = $state(untrack(() => (spec.tijela ?? []).map(() => null)));
  let poslano = $state(null);

  function provjeri() {
    if (locked) return;
    poslano = [...izbor];
    onodgovor([...izbor]);
  }
  let neprom = $derived(poslano != null && poslano.every((p, i) => p === izbor[i]));
  let prvaKriva = $derived(ishod && !ishod.tocno && !ishod.prazno && neprom ? izbor.findIndex((p, i) => p !== istina[i]) : -1);

  $effect(() => {
    if (!pitanje || !(pokazi || ishod?.tocno)) return;
    untrack(() => {
      if (pokazi) izbor = [...istina];
      spustiSve();
    });
  });

  const boja = (rho) => {
    const x = Math.round(14 + 56 * Math.min(1, Math.log1p(rho) / Math.log1p(8)));
    return { fill: `color-mix(in srgb, var(--text) ${x}%, var(--bg-elev))`, text: x > 42 ? "var(--bg)" : "var(--text)" };
  };
  const rho = (v) => `${formatNumber(v)} g/cm³`;

  let opis = $derived(
    `Posuda s tekućinom: ${spec.tekucina.naziv}, gustoća ${rho(rf)}.` +
      tijela
        .map((t, i) => (unutra[i] ? ` ${t.naziv} (${rho(t.gustoca)}) ${OPIS[istina[i]]}.` : ""))
        .join(""),
  );
</script>

{#if pitanje}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="ur-tekst"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure ur">
  <svg viewBox="0 0 360 260" role="img" aria-label={opis}>
    {#each tijela as t, i (i)}
      {#if unutra[i]}
        {@const b = boja(t.gustoca)}
        {@const x = xOf(i, tijela.length)}
        <g transform="translate({x} {Math.round(pos[i].current * 10) / 10})">
          <rect class="ur-tijelo" x={-sirina / 2} y={-VIS / 2} width={sirina} height={VIS} rx="5" style:fill={b.fill} />
          <text class="ur-rho" y="4.5" text-anchor="middle" style:fill={b.text}>{formatNumber(t.gustoca)}</text>
        </g>
      {/if}
    {/each}
    <!-- tekućina je preko tijela, pa je uronjeni dio zatamnjen kao pod vodom -->
    <path class="lx-water ur-tekucina" d="M{L},{POVRSINA} V{DNO - 8} Q{L},{DNO} {L + 8},{DNO} H{R - 8} Q{R},{DNO} {R},{DNO - 8} V{POVRSINA} Z" />
    <line class="ur-povrsina" x1={L} y1={POVRSINA} x2={R} y2={POVRSINA} />
    <path class="lx-stroke ur-posuda" d="M{L - 8},{RUB} H{L} V{DNO - 8} Q{L},{DNO} {L + 8},{DNO} H{R - 8} Q{R},{DNO} {R},{DNO - 8} V{RUB} H{R + 8}" />
  </svg>
  <figcaption class="ur-natpis">{spec.tekucina.naziv}, ρ = {rho(rf)} <span class="ur-mala">· brojevi na tijelima su gustoće u g/cm³</span></figcaption>
</figure>

{#if !pitanje}
  <div class="ur-chips">
    {#each tijela as t, i (i)}
      <button type="button" class="btn btn-ghost ur-chip" class:ur-unutra={unutra[i]} aria-pressed={unutra[i]} disabled={unutra[i]} onclick={() => spusti(i)}>
        <span class="ur-chip-ime">{t.naziv}</span>
        <span class="ur-chip-rho">ρ = {rho(t.gustoca)}</span>
      </button>
    {/each}
  </div>
  <div class="lx-actions">
    <button type="button" class="btn btn-ghost" onclick={izvadiSve} disabled={!unutra.some(Boolean)}>Izvadi sve</button>
  </div>
{:else}
  <div class="ur-redovi">
    {#each tijela as t, i (i)}
      {@const ok = pokazi || (ishod?.tocno && neprom)}
      <div class="ur-red" class:ok class:bad={prvaKriva === i}>
        <div class="ur-ime">
          <span>{t.naziv}</span>
          <span class="ur-mala">ρ = {rho(t.gustoca)}</span>
        </div>
        <div class="seg" role="group" aria-label={t.naziv}>
          {#each ISHODI as o (o)}
            <button type="button" class="seg-item" class:active={izbor[i] === o} aria-pressed={izbor[i] === o} disabled={locked} onclick={() => (izbor[i] = o)}>{o}</button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  <div class="lx-actions">
    <button type="button" class="btn btn-primary" onclick={provjeri} disabled={locked || izbor.some((p) => p == null)}>Provjeri</button>
  </div>
{/if}

<style>
  .ur-tekst {
    margin-bottom: 12px;
  }
  .ur {
    margin-bottom: 8px;
  }
  .ur-tijelo {
    stroke: var(--text);
    stroke-width: 1.5;
  }
  .ur-rho {
    font: 600 12px var(--font-mono);
  }
  .ur .ur-tekucina {
    stroke: none;
  }
  .ur-povrsina {
    stroke: var(--lx-water);
    stroke-width: 1.5;
  }
  .ur .ur-posuda {
    stroke-width: 2;
  }
  .ur-natpis {
    text-align: center;
    font-size: 13px;
    color: var(--text);
    margin-top: 6px;
  }
  .ur-mala {
    color: var(--text-dim);
    font-size: 12px;
  }
  .ur-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
  .ur-chip {
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    padding: 9px 13px;
    border-radius: var(--r-lg);
  }
  .ur-chip-ime {
    color: var(--text);
  }
  .ur-chip-rho {
    font-family: var(--font-mono);
    font-size: 12px;
  }
  .ur-chip.ur-unutra {
    opacity: 0.55;
    cursor: default;
  }
  .ur-redovi {
    display: grid;
    gap: 8px;
  }
  .ur-red {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px 12px;
    padding: 9px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .ur-red.ok {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 10%, transparent);
  }
  .ur-red.bad {
    border-color: var(--danger);
    background: color-mix(in srgb, var(--danger) 10%, transparent);
  }
  .ur-ime {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .ur-red .seg-item {
    font-size: 13px;
    padding: 7px 12px;
    border: 0;
    background: transparent;
  }
  .ur-red .seg-item.active {
    background: var(--primary-dim);
    color: var(--text);
    box-shadow: 0 0 0 1px var(--primary-border);
  }
  .ur-red .seg-item:disabled {
    cursor: default;
  }
</style>
