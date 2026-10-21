<script>
  // Scena „prorez“: uže (transverzalni val) i zvuk (longitudinalni) kroz ogradu s prorezom. Geometrija, valovi i
  // tko prolazi dolaze iz katalog/fizika/polarizacija.js. U „odaberi“ se iza ograde ništa ne vidi do točnog odgovora.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import {
    scenaProrez,
    valoviProrez,
    tockaRuba,
    kutIzTocke,
    zakljucaj,
    normOs,
    opisOsi,
    titranjeUzeta,
    OPCIJE_PROREZ,
    tocnaOpcijaProrez,
    KORAK_FILTRA,
  } from "$lib/lesson/katalog/fizika/polarizacija.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const odaberi = nacin === "odaberi";
  const okrece = nacin === "istrazi";

  let ruka = $state(untrack(() => spec.prorez ?? 0));
  let izbor = $state(null);
  // u „odaberi“ ishod se vidi tek kad je odgovor točan ili pokazan (inače bi drugi pokušaj bio pogađanje s rješenjem)
  let otkriveno = $derived(!odaberi || pokazi || !!ishod?.tocno);
  let scena = $derived(scenaProrez(spec, normOs(ruka), !otkriveno));

  let faza = $state(0);
  onMount(() => {
    let id;
    let prije = 0;
    const petlja = (now) => {
      if (!prefersReducedMotion.current) {
        const dt = Math.min(0.05, (now - (prije || now)) / 1000);
        faza = (faza + dt * 0.8) % 1;
      }
      prije = now;
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  let valovi = $derived(valoviProrez(spec, scena, faza, !otkriveno));

  // ── okretanje proreza (istrazi) ──
  const RR = 44;
  let svgEl = $state();
  let vuce = false;
  let srediste = $derived([scena.xOgrade, scena.staze[0].y]);
  let vrh = $derived(tockaRuba(srediste, RR, ruka));
  function down(e) {
    if (!okrece) return;
    e.preventDefault();
    vuce = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (!vuce) return;
    const m = svgEl?.getScreenCTM();
    if (!m) return;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    if (Math.hypot(q.x - srediste[0], q.y - srediste[1]) < 6) return;
    ruka = zakljucaj(kutIzTocke(srediste, [q.x, q.y]));
  }
  const up = () => (vuce = false);
  function key(e) {
    if (!okrece) return;
    const d = {
      ArrowLeft: KORAK_FILTRA,
      ArrowUp: KORAK_FILTRA,
      ArrowRight: -KORAK_FILTRA,
      ArrowDown: -KORAK_FILTRA,
    }[e.key];
    if (!d) return;
    e.preventDefault();
    ruka = zakljucaj(ruka + d);
  }

  function odaberiOpciju(k) {
    if (locked) return;
    izbor = k;
    onodgovor(k);
  }
  const PROLAZ = { da: "prolazi", ne: "ne prolazi", djelomicno: "djelomično" };
  const tocka = (p) => p.join(",");
  let opis = $derived.by(() => {
    const dijelovi = scena.staze.map(
      (st) => `${st.naziv}${st.prolazi ? `: ${PROLAZ[st.prolazi]}` : ""}`,
    );
    return `Ograda s prorezom (${opisOsi(scena.prorez)}). Uže se trese ${opisOsi(titranjeUzeta(spec))}. ${dijelovi.join("; ")}.`;
  });
</script>

<figure class="lx-figure pp">
  <svg
    bind:this={svgEl}
    viewBox="0 0 {scena.sirina} {scena.visina}"
    role="img"
    aria-label={opis}
  >
    {#each scena.staze as st, i (st.val)}
      {@const v = valovi[i]}
      <text class="pp-naziv" x="8" y={st.y - 60}>{st.naziv}</text>
      <!-- smjer širenja -->
      <line class="pp-smjer" x1="296" y1={st.y - 64} x2="334" y2={st.y - 64} />
      <polygon
        class="pp-smjer-vrh"
        points="338,{st.y - 64} 331,{st.y - 68} 331,{st.y - 60}"
      />
      <!-- ograda s prorezom -->
      <polygon class="pp-ploca" points={st.ograda.ploca.map(tocka).join(" ")} />
      <polygon class="pp-otvor" points={st.ograda.otvor.map(tocka).join(" ")} />

      {#if v.val === "uze"}
        <polyline class="pp-uze" points={v.prije.map(tocka).join(" ")} />
        {#if v.poslije.length}
          <polyline class="pp-uze" points={v.poslije.map(tocka).join(" ")} />
        {/if}
        {#if v.prije.length}
          <circle class="pp-ruka" cx={v.prije[0][0]} cy={v.prije[0][1]} r="7" />
        {/if}
      {:else}
        {#each v.cestice as c, j (j)}
          <circle class="pp-cestica" cx={c[0]} cy={c[1]} r="1.7" />
        {/each}
        <g class="pp-zvucnik">
          <rect x="6" y={st.y - 9} width="9" height="18" rx="1.5" />
          <polygon
            points="15,{st.y - 9} 26,{st.y - 18} 26,{st.y + 18} 15,{st.y + 9}"
          />
        </g>
      {/if}
      {#if !otkriveno}
        <text class="pp-upitnik" x="272" y={st.y + 6} text-anchor="middle"
          >?</text
        >
      {:else if st.prolazi}
        <text
          class="pp-ishod"
          class:pp-da={st.prolazi === "da"}
          class:pp-ne={st.prolazi === "ne"}
          x="352"
          y={st.y + 40}
          text-anchor="end">{PROLAZ[st.prolazi]}</text
        >
      {/if}
    {/each}

    {#if okrece}
      <g
        class="lx-handle pp-ruc"
        role="slider"
        tabindex="0"
        aria-label="Prorez: povuci ručku ili okreći strelicama"
        aria-valuemin="0"
        aria-valuemax="180"
        aria-valuenow={Math.round(scena.prorez)}
        aria-valuetext={opisOsi(scena.prorez)}
        onpointerdown={down}
        onpointermove={move}
        onpointerup={up}
        onpointercancel={up}
        onkeydown={key}
      >
        <line
          class="pp-krak"
          x1={srediste[0]}
          y1={srediste[1]}
          x2={vrh[0]}
          y2={vrh[1]}
        />
        <circle class="pp-hit" cx={vrh[0]} cy={vrh[1]} r="22" />
        <circle class="pp-rucka" cx={vrh[0]} cy={vrh[1]} r="9" />
      </g>
    {/if}
  </svg>
</figure>
<p class="lx-readout">
  prorez: <b>{opisOsi(scena.prorez)}</b> · uže se trese:
  <b>{opisOsi(titranjeUzeta(spec))}</b
  >{#if okrece && scena.staze.length === 2}<span class="pp-napomena">
      obje ograde okreću se zajedno</span
    >{/if}
</p>

{#if odaberi}
  <div class="lx-options pp-opcije">
    {#each OPCIJE_PROREZ as o (o.kljuc)}
      <!-- krivi odabir dobije ✕ tek uz „pokaži“; do tada je samo odabran (zaključana kopija ne smije suziti izbor) -->
      {@const ok =
        (izbor === o.kljuc && ishod?.tocno) ||
        (pokazi && o.kljuc === tocnaOpcijaProrez(spec))}
      {@const kriv = pokazi && izbor === o.kljuc && !ok}
      <button
        type="button"
        class="lx-option"
        class:ok
        class:bad={kriv}
        class:sel={izbor === o.kljuc && !ok && !kriv}
        disabled={locked}
        onclick={() => odaberiOpciju(o.kljuc)}
      >
        <span class="lx-mark">{ok ? "✓" : kriv ? "✕" : ""}</span>
        {o.tekst}
      </button>
    {/each}
  </div>
{/if}

<style>
  .pp {
    max-width: 460px;
  }
  .pp svg {
    touch-action: manipulation;
  }
  .pp-naziv {
    fill: var(--text-dim);
    font: 600 11.5px var(--font-sans);
  }
  .pp-smjer {
    stroke: var(--text-faint);
    stroke-width: 1.5;
  }
  .pp-smjer-vrh {
    fill: var(--text-faint);
  }
  .pp-ploca {
    fill: color-mix(in srgb, var(--warn) 22%, var(--bg-elev));
    stroke: color-mix(in srgb, var(--warn) 50%, var(--text-dim));
    stroke-width: 1.5;
  }
  .pp-otvor {
    fill: var(--bg-elev);
    stroke: color-mix(in srgb, var(--warn) 50%, var(--text-dim));
    stroke-width: 1;
  }
  .pp-uze {
    fill: none;
    stroke: var(--danger);
    stroke-width: 2.6;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .pp-ruka {
    fill: color-mix(in srgb, var(--text-dim) 40%, var(--bg-elev));
    stroke: var(--text-dim);
  }
  .pp-cestica {
    fill: var(--lx-water);
  }
  .pp-zvucnik {
    fill: var(--text-dim);
  }
  .pp-upitnik {
    fill: var(--text-faint);
    font: 700 20px var(--font-sans);
  }
  .pp-ishod {
    font: 700 12px var(--font-sans);
    fill: var(--text-dim);
  }
  .pp-ishod.pp-da {
    fill: var(--success);
  }
  .pp-ishod.pp-ne {
    fill: var(--danger);
  }
  .pp-ruc {
    outline: none;
  }
  .pp-krak {
    stroke: var(--primary);
    stroke-width: 1.5;
    stroke-dasharray: 3 3;
  }
  .pp-hit {
    fill: transparent;
  }
  .pp-rucka {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .pp-ruc:focus-visible .pp-rucka {
    stroke: var(--text);
    stroke-width: 3;
  }
  .pp-napomena {
    display: block;
    font-family: var(--font-sans);
    font-size: 12px;
    color: var(--text-faint);
  }
  .pp-opcije {
    grid-template-columns: 1fr 1fr;
  }
</style>
