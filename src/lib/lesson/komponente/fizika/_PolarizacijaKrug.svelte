<script>
  // Krug „gledano uzduž zrake“: dvostruke strelice pokazuju smjer titranja (duljina = amplituda). Bez strelica i s
  // upitnikom kad se ishod još ne smije vidjeti.
  import { smjerSprijeda } from "$lib/lesson/katalog/fizika/polarizacija.js";

  let { x, y, r = 16, strelice = [], upitnik = false, mrak = false } = $props();
  const r2 = (n) => Math.round(n * 100) / 100;
  let crte = $derived(
    strelice
      .filter((s) => s.duljina > 0.04)
      .map((s) => {
        const d = smjerSprijeda(s.kut);
        const L = r * 0.78 * Math.min(1, s.duljina);
        const h = Math.min(4.2, L * 0.45);
        const p = [-d[1], d[0]];
        const vrh = (k) => {
          const t = [x + d[0] * L * k, y + d[1] * L * k];
          const b = [t[0] - d[0] * h * k, t[1] - d[1] * h * k];
          return `${r2(t[0])},${r2(t[1])} ${r2(b[0] + p[0] * h * 0.6)},${r2(b[1] + p[1] * h * 0.6)} ${r2(b[0] - p[0] * h * 0.6)},${r2(b[1] - p[1] * h * 0.6)}`;
        };
        return {
          x1: r2(x - d[0] * (L - h)),
          y1: r2(y - d[1] * (L - h)),
          x2: r2(x + d[0] * (L - h)),
          y2: r2(y + d[1] * (L - h)),
          v1: vrh(1),
          v2: vrh(-1),
        };
      }),
  );
</script>

<g class="pk" aria-hidden="true">
  <circle class="pk-krug" class:pk-mrak={mrak} cx={x} cy={y} {r} />
  {#if upitnik}
    <text class="pk-upitnik" {x} y={y + 5} text-anchor="middle">?</text>
  {:else}
    {#each crte as c, i (i)}
      <line class="pk-crta" x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} />
      <polygon class="pk-vrh" points={c.v1} />
      <polygon class="pk-vrh" points={c.v2} />
    {/each}
  {/if}
</g>

<style>
  .pk-krug {
    fill: var(--bg-elev);
    stroke: var(--border-strong);
    stroke-width: 1.3;
  }
  .pk-krug.pk-mrak {
    fill: color-mix(in srgb, var(--text) 10%, var(--bg-elev));
  }
  .pk-crta {
    stroke: var(--text);
    stroke-width: 1.6;
    stroke-linecap: round;
  }
  .pk-vrh {
    fill: var(--text);
  }
  .pk-upitnik {
    fill: var(--text-faint);
    font: 700 13px var(--font-sans);
  }
</style>
