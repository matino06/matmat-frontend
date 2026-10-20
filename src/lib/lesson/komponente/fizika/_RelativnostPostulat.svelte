<script>
  // Postulat STR: brod pošalje svjetlosni signal prema Zemlji. Stvarni puls putuje brzinom c, a crtkani „duh“
  // brzinom kakvu bi dalo zbrajanje brzina. Položaji i natpisi dolaze iz postulatStanje (katalog).
  import { onMount, untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import {
    postulatStanje,
    postulatPostava,
    SIGNALI,
  } from "$lib/lesson/katalog/fizika/relativnost.js";

  let {
    spec,
    beta,
    smjer,
    pokreni = 0,
    kreni = true,
    petlja = false,
  } = $props();

  const sig = untrack(() => spec.signal ?? "laser");
  let t = $state(null);
  let post = $derived(postulatPostava(spec, beta, smjer));
  let st = $derived(postulatStanje(spec, t, beta, smjer));

  $effect(() => {
    void pokreni;
    untrack(() => {
      if (!kreni) t = null;
      else t = prefersReducedMotion.current ? post.kraj : -post.predtrk;
    });
  });
  onMount(() => {
    let id;
    let zadnji = 0;
    let stoji = 0;
    const korak = (now) => {
      const dt = Math.min(0.05, (now - (zadnji || now)) / 1000);
      zadnji = now;
      if (t != null && !prefersReducedMotion.current) {
        if (t < post.kraj) t = Math.min(post.kraj, t + dt);
        else if (petlja) {
          stoji += dt;
          if (stoji > 1.6) {
            stoji = 0;
            t = -post.predtrk;
          }
        }
      }
      id = requestAnimationFrame(korak);
    };
    id = requestAnimationFrame(korak);
    return () => cancelAnimationFrame(id);
  });

  // valni paket: kratka sinusoida s prednjim krajem u x
  const paket = (x, y, L = 26) => {
    let d = `M${x},${y}`;
    for (let i = 1; i <= 26; i++) {
      const u = i / 26;
      d += ` L${(x + u * L).toFixed(1)},${(y - Math.sin(u * Math.PI * 4) * 5 * Math.sin(u * Math.PI)).toFixed(1)}`;
    }
    return d;
  };
  const zvijezde = Array.from({ length: 26 }, (_, i) => ({
    x: (i * 83 + 17) % 360,
    y: 8 + ((i * 47) % 180),
    r: i % 4 === 0 ? 1.3 : 0.8,
  }));
  let opis = $derived(
    `Svemirski brod leti brzinom ${st.oznake.brod.slice(4)} ${smjer === "od" ? "od Zemlje" : "prema Zemlji"} i šalje ${SIGNALI[sig].naziv} prema detektoru na Zemlji.` +
      (st.izmjereno ? ` Detektor je izmjerio brzinu ${st.izmjereno}.` : ""),
  );
</script>

<svg viewBox="0 0 360 200" role="img" aria-label={opis}>
  {#each zvijezde as z, i (i)}
    <circle class="rp-zv" cx={z.x} cy={z.y} r={z.r} />
  {/each}
  <!-- Zemlja i detektor -->
  <circle class="rp-zemlja" cx="-34" cy="112" r="78" />
  <path
    class="rp-kopno"
    d="M-10,62 q22,8 30,30 q-6,18 -26,16 q-8,-22 -4,-46 z M6,130 q16,4 18,22 q-14,12 -26,4 z"
  />
  <text class="rp-t" x="8" y="22">Zemlja</text>
  <g transform="translate({st.detektor.x} {st.detektor.y})">
    <rect
      class="rp-det"
      x="-12"
      y="-20"
      width="14"
      height="40"
      rx="3"
      class:rp-svijetli={!!st.izmjereno}
    />
    <path class="rp-det-l" d="M2,-14 q10,14 0,28" />
  </g>
  <text class="rp-t" x="10" y="190">detektor</text>
  {#if st.izmjereno}
    <g class="rp-mjera">
      <rect x="76" y="150" width="150" height="34" rx="8" />
      <text x="151" y="164" text-anchor="middle" class="rp-mjera-n"
        >izmjereno na Zemlji</text
      >
      <text x="151" y="178" text-anchor="middle" class="rp-mjera-v"
        >{st.izmjereno}</text
      >
    </g>
  {/if}

  <!-- staze: stvarni puls i „duh“ -->
  <line class="rp-staza" x1={st.detektor.x + 4} y1="100" x2="352" y2="100" />
  {#if st.duh}
    <line class="rp-staza" x1={st.detektor.x + 4} y1="128" x2="352" y2="128" />
  {/if}

  <!-- brod -->
  <g transform="translate({st.brod.x} {st.brod.y})">
    {#if st.brod.gleda === "lijevo"}
      <path
        class="rp-brod"
        d="M0,13 L14,2 L52,2 L58,0 L58,26 L52,24 L14,24 Z"
      />
      <path class="rp-plamen" d="M58,7 L70,13 L58,19 Z" />
    {:else}
      <path class="rp-brod" d="M58,13 L44,2 L6,2 L0,0 L0,26 L6,24 L44,24 Z" />
      <path class="rp-plamen" d="M0,7 L-12,13 L0,19 Z" />
    {/if}
    <circle class="rp-prozor" cx="29" cy="13" r="4" />
    <!-- smjer leta -->
    <line class="rp-str" x1="14" y1="-10" x2="44" y2="-10" />
    {#if st.brod.gleda === "lijevo"}
      <path class="rp-str-v" d="M10,-10 l7,-4 l0,8 z" />
    {:else}
      <path class="rp-str-v" d="M48,-10 l-7,-4 l0,8 z" />
    {/if}
    <text class="rp-t rp-jako" x="29" y="-17" text-anchor="middle"
      >{st.oznake.brod}</text
    >
  </g>

  <!-- signal -->
  {#if st.duh}
    <path class="rp-duh" d={paket(st.duh.x, 128)} />
    <text
      class="rp-t rp-duh-t"
      x={Math.min(250, Math.max(st.detektor.x + 8, st.duh.x))}
      y="146">{st.oznake.duh}</text
    >
  {/if}
  {#if st.puls}
    <path class="rp-puls rp-{sig}" d={paket(st.puls.x, 100)} />
    <text
      class="rp-t rp-jako"
      x={Math.min(280, Math.max(st.detektor.x + 8, st.puls.x))}
      y="88">{st.oznake.puls}</text
    >
  {:else if !kreni}
    <text class="rp-t" x="206" y="172" text-anchor="middle"
      >{SIGNALI[sig].naziv}: kolikom brzinom stiže?</text
    >
  {/if}
</svg>
{#if !prefersReducedMotion.current}
  <figcaption class="rp-usp">
    prikaz je jako usporen: svjetlost od broda do Zemlje putuje {post.tStvarno
      .toString()
      .replace(".", ",")} s
  </figcaption>
{/if}

<style>
  svg {
    background: color-mix(in srgb, #0b1020 85%, var(--bg-elev));
    border-radius: var(--r-lg);
  }
  .rp-zv {
    fill: #cbd5e1;
    opacity: 0.55;
  }
  .rp-zemlja {
    fill: #1d4ed8;
    stroke: #60a5fa;
    stroke-width: 1.5;
  }
  .rp-kopno {
    fill: #22c55e;
    opacity: 0.7;
  }
  .rp-t {
    fill: #cbd5e1;
    font: 500 11px var(--font-sans);
  }
  .rp-jako {
    fill: #f8fafc;
    font-weight: 700;
    font-size: 12px;
  }
  .rp-det {
    fill: #334155;
    stroke: #94a3b8;
  }
  .rp-det.rp-svijetli {
    fill: #16a34a;
  }
  .rp-det-l {
    fill: none;
    stroke: #94a3b8;
    stroke-width: 2;
  }
  .rp-mjera rect {
    fill: color-mix(in srgb, #16a34a 30%, #0b1020);
    stroke: #4ade80;
  }
  .rp-mjera-n {
    fill: #bbf7d0;
    font: 500 10px var(--font-sans);
  }
  .rp-mjera-v {
    fill: #f0fdf4;
    font: 700 12.5px var(--font-mono);
  }
  .rp-staza {
    stroke: #475569;
    stroke-dasharray: 2 6;
  }
  .rp-brod {
    fill: #e2e8f0;
    stroke: #64748b;
    stroke-width: 1.2;
  }
  .rp-plamen {
    fill: #f59e0b;
  }
  .rp-prozor {
    fill: #38bdf8;
  }
  .rp-str {
    stroke: #f8fafc;
    stroke-width: 2;
  }
  .rp-str-v {
    fill: #f8fafc;
  }
  .rp-puls {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
  }
  .rp-laser {
    stroke: #f87171;
  }
  .rp-radio {
    stroke: #a78bfa;
  }
  .rp-farovi {
    stroke: #fde047;
  }
  .rp-duh {
    fill: none;
    stroke: #94a3b8;
    stroke-width: 2;
    stroke-dasharray: 3 3;
    opacity: 0.8;
  }
  .rp-duh-t {
    fill: #94a3b8;
    font-style: italic;
  }
  .rp-usp {
    text-align: right;
    font-size: 11px;
    color: var(--text-faint);
    margin-top: 2px;
  }
</style>
