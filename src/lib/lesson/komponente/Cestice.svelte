<script>
  // Kutije s česticama koje se gibaju kao u čvrstom tijelu, tekućini i plinu. Položaji se mijenjaju izravno na
  // <circle> elementima: 60 sličica u sekundi kroz reaktivno stanje bilo bi skupo bez ikakve koristi.
  import { untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "./Md.svelte";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const OPIS = {
    cvrsto: "čestice gusto složene u redove, titraju na mjestu",
    tekuce: "čestice blizu jedna drugoj u donjem dijelu kutije, klize jedna uz drugu",
    plin: "malo čestica daleko jedna od druge, slobodno lete i odbijaju se od stijenki",
  };
  const R = { cvrsto: 6.5, tekuce: 6.5, plin: 5 };
  const RUB = 4; // unutarnji rub kutije u viewBoxu 0–100
  const VRH_TEKUCINE = 50;

  let pitanje = $derived(spec.nacin === "odaberi");
  let kutije = $derived(spec.kutije ?? []);

  // početni raspored je ujedno i statična slika za prefers-reduced-motion
  function raspored(stanje) {
    const p = [];
    if (stanje === "cvrsto") {
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) p.push({ x: 29 + c * 14, y: 89 - r * 14 });
    } else if (stanje === "tekuce") {
      const redovi = [
        [6, 89],
        [5, 76],
        [3, 63],
      ];
      for (const [n, y] of redovi) {
        const x0 = 50 - ((n - 1) * 15) / 2;
        for (let i = 0; i < n; i++) p.push({ x: x0 + i * 15 + (n === 3 ? 4 : 0), y });
      }
    } else {
      const xy = [
        [20, 20],
        [56, 14],
        [84, 34],
        [16, 56],
        [50, 50],
        [82, 72],
        [26, 86],
        [60, 84],
      ];
      for (const [x, y] of xy) p.push({ x, y });
    }
    return p.map((q, i) => {
      const smjer = Math.random() * Math.PI * 2;
      const brzina = stanje === "plin" ? 38 + Math.random() * 18 : stanje === "tekuce" ? 6 : 0;
      return { ...q, hx: q.x, hy: q.y, vx: Math.cos(smjer) * brzina, vy: Math.sin(smjer) * brzina, f: 5 + Math.random() * 4, g: 5 + Math.random() * 4, fi: Math.random() * 7, ps: Math.random() * 7, i };
    });
  }

  const cestice = untrack(() => (spec.kutije ?? []).map((k) => raspored(k.stanje)));
  // elementi <circle> po kutijama, pune se kroz bind:this
  const krugovi = untrack(() => (spec.kutije ?? []).map(() => []));
  // animacija mijenja kružiće izravno (bez stanja po sličici), pa se elementi samo zapamte
  function registriraj(node, [k, i]) {
    krugovi[k][i] = node;
    return { destroy: () => (krugovi[k][i] = null) };
  }

  function korak(stanje, ps, t, dt) {
    const r = R[stanje];
    const min = RUB + r;
    const max = 100 - RUB - r;
    if (stanje === "cvrsto") {
      // titranje oko stalnog mjesta, bez pomicanja s mjesta
      for (const p of ps) {
        p.x = p.hx + 1.1 * Math.sin(p.f * t + p.fi);
        p.y = p.hy + 1.1 * Math.sin(p.g * t + p.ps);
      }
      return;
    }
    for (const p of ps) {
      if (stanje === "tekuce") {
        // nasumično guranje uz trenje i malo teže prema dnu: čestice ostaju zajedno, ali mijenjaju mjesta
        p.vx += (Math.random() - 0.5) * 400 * dt;
        p.vy += ((Math.random() - 0.5) * 400 + 25) * dt;
        const d = Math.exp(-1.8 * dt);
        p.vx *= d;
        p.vy *= d;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const gore = stanje === "tekuce" ? VRH_TEKUCINE + r : min;
      if (p.x < min) (p.x = min), (p.vx = Math.abs(p.vx));
      if (p.x > max) (p.x = max), (p.vx = -Math.abs(p.vx));
      if (p.y < gore) (p.y = gore), (p.vy = Math.abs(p.vy));
      if (p.y > max) (p.y = max), (p.vy = -Math.abs(p.vy));
    }
    // sudari: razmakni preklopljene čestice i zamijeni im brzine duž spojnice
    const dmin = 2 * r + 0.4;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i];
        const b = ps[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d >= dmin) continue;
        const nx = dx / d;
        const ny = dy / d;
        const push = (dmin - d) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          a.vx += rel * nx;
          a.vy += rel * ny;
          b.vx -= rel * nx;
          b.vy -= rel * ny;
        }
      }
    }
  }

  function nacrtaj() {
    cestice.forEach((ps, k) =>
      ps.forEach((p, i) => {
        const el = krugovi[k][i];
        if (!el) return;
        el.setAttribute("cx", p.x.toFixed(1));
        el.setAttribute("cy", p.y.toFixed(1));
      }),
    );
  }

  $effect(() => {
    if (prefersReducedMotion.current) {
      cestice.forEach((ps) => ps.forEach((p) => ((p.x = p.hx), (p.y = p.hy))));
      nacrtaj();
      return;
    }
    let id;
    let prije = null;
    const petlja = (ms) => {
      const t = ms / 1000;
      // nakon skrivene kartice dt bi bio golem i čestice bi proletjele kroz stijenke
      const dt = prije == null ? 0 : Math.min(0.04, t - prije);
      prije = t;
      untrack(() => kutije).forEach((k, i) => cestice[i] && korak(k.stanje, cestice[i], t, dt));
      nacrtaj();
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });

  // odaberi
  let izbor = $state(null);
  let poslano = $state(null);

  function provjeri() {
    if (locked || izbor == null) return;
    poslano = izbor;
    onodgovor(izbor);
  }
  function stanjeKutije(i) {
    if (pokazi && i === spec.tocna) return "ok";
    if (ishod && !ishod.prazno && poslano === izbor && i === izbor) return ishod.tocno ? "ok" : "bad";
    return "";
  }
</script>

{#if pitanje}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="cs-tekst"><Md text={spec.tekst} /></div>
{/if}

{#snippet slika(k, i)}
  <svg viewBox="0 0 100 100" role="img" aria-label={`Kutija ${k.oznaka}: ${OPIS[k.stanje] ?? ""}`}>
    <rect class="cs-kutija" x="1.5" y="1.5" width="97" height="97" rx="6" />
    {#each cestice[i] ?? [] as p (p.i)}
      <circle use:registriraj={[i, p.i]} class="cs-cestica" cx={p.hx} cy={p.hy} r={R[k.stanje]} />
    {/each}
  </svg>
{/snippet}

<div class="cs-kutije">
  {#each kutije as k, i (i)}
    {#if pitanje}
      {@const st = stanjeKutije(i)}
      <button
        type="button"
        class="lx-option cs-box"
        class:sel={izbor === i && !st}
        class:ok={st === "ok"}
        class:bad={st === "bad"}
        aria-pressed={izbor === i}
        aria-label={`Kutija ${k.oznaka}: ${OPIS[k.stanje] ?? ""}`}
        disabled={locked}
        onclick={() => (izbor = i)}
      >
        {@render slika(k, i)}
        <span class="cs-oznaka">{k.oznaka}</span>
      </button>
    {:else}
      <div class="cs-box cs-prikaz">
        {@render slika(k, i)}
        <span class="cs-oznaka">{k.oznaka}</span>
      </div>
    {/if}
  {/each}
</div>

{#if pitanje}
  <div class="lx-actions">
    <button type="button" class="btn btn-primary" onclick={provjeri} disabled={locked || izbor == null}>Provjeri</button>
  </div>
{/if}

<style>
  .cs-tekst {
    margin-bottom: 12px;
  }
  .cs-kutije {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    margin: 4px 0 8px;
  }
  .cs-box {
    flex: 1 1 130px;
    max-width: 170px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px;
  }
  .cs-box :global(svg) {
    width: 100%;
    height: auto;
    display: block;
  }
  .cs-prikaz {
    border: 1px solid transparent;
  }
  .cs-oznaka {
    font-weight: 600;
    font-size: 14px;
    text-align: center;
  }
  .cs-kutija {
    fill: var(--bg);
    stroke: var(--text);
    stroke-width: 1.5;
  }
  .cs-cestica {
    fill: color-mix(in srgb, var(--lx-look, var(--primary)) 70%, var(--bg-elev));
    stroke: var(--lx-look, var(--primary));
    stroke-width: 1;
  }
</style>
