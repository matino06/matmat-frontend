<script>
  // Kutija s česticama za krivulju zagrijavanja: dio čestica je u krutom stanju (titraju u rešetki), dio u tekućem
  // (klize uz dno), dio u plinu (lete). Udjeli se mijenjaju glatko dok učenik vuče po krivulji (taljenje 40 % …), a
  // toplija tvar jače titra. Položaji se mijenjaju izravno na <circle> elementima.
  import { prefersReducedMotion } from "svelte/motion";

  let { tekuce = 0, plin = 0, toplina = 0.3, oznaka = "" } = $props();

  const N = 16;
  const R = 5.2;
  const MIN = 4 + R;
  const MAX = 96 - R;
  // rešetka 4×4 pri dnu; redoslijed taljenja: gornji redovi prvi
  const cestice = Array.from({ length: N }, (_, i) => {
    const red = Math.floor(i / 4);
    const stup = i % 4;
    const hx = 29 + stup * 14;
    const hy = 89 - red * 13;
    return {
      i,
      hx,
      hy,
      x: hx,
      y: hy,
      vx: 0,
      vy: 0,
      fi: i * 1.7,
      ps: i * 2.3,
      f: 6 + (i % 5),
      mod: "kruto",
    };
  });
  // čestica i se tali kad udio tekućeg+plina prijeđe njezin prag; gornji redovi (veći i) idu prvi
  const redTaljenja = [...cestice]
    .sort((a, b) => b.hy - a.hy || a.hx - b.hx)
    .reverse();

  const krugovi = [];
  function registriraj(node, i) {
    krugovi[i] = node;
    return { destroy: () => (krugovi[i] = null) };
  }

  function modovi() {
    const nTek = Math.round((tekuce + plin) * N);
    const nPlin = Math.round(plin * N);
    redTaljenja.forEach((c, k) => {
      const novi = k < nPlin ? "plin" : k < nTek ? "tekuce" : "kruto";
      if (novi === c.mod) return;
      if (novi === "plin") {
        const a = (c.i * 2.39996) % (2 * Math.PI);
        c.vx = Math.cos(a) * 45;
        c.vy = -Math.abs(Math.sin(a)) * 45 - 10;
      }
      if (novi === "kruto") {
        c.vx = 0;
        c.vy = 0;
      }
      c.mod = novi;
    });
  }

  function korak(t, dt) {
    const amp = 0.6 + 1.8 * toplina;
    const brzinaPlina = 35 + 40 * toplina;
    for (const c of cestice) {
      if (c.mod === "kruto") {
        // vrati se prema mjestu u rešetki i titraj oko njega
        const tx = c.hx + amp * Math.sin(c.f * t + c.fi);
        const ty = c.hy + amp * Math.sin((c.f + 1.3) * t + c.ps);
        c.x += (tx - c.x) * Math.min(1, dt * 10);
        c.y += (ty - c.y) * Math.min(1, dt * 10);
        continue;
      }
      if (c.mod === "tekuce") {
        c.vx += (Math.random() - 0.5) * (300 + 300 * toplina) * dt;
        c.vy += ((Math.random() - 0.5) * (300 + 300 * toplina) + 60) * dt;
        const d = Math.exp(-2 * dt);
        c.vx *= d;
        c.vy *= d;
      } else {
        const v = Math.hypot(c.vx, c.vy) || 1;
        c.vx *= brzinaPlina / v;
        c.vy *= brzinaPlina / v;
      }
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      const gore = c.mod === "tekuce" ? 46 : MIN;
      if (c.x < MIN) ((c.x = MIN), (c.vx = Math.abs(c.vx)));
      if (c.x > MAX) ((c.x = MAX), (c.vx = -Math.abs(c.vx)));
      if (c.y < gore) ((c.y = gore), (c.vy = Math.abs(c.vy)));
      if (c.y > MAX) ((c.y = MAX), (c.vy = -Math.abs(c.vy)));
    }
    // razmakni preklopljene čestice (krute se ne pomiču: rešetka drži)
    const dmin = 2 * R + 0.4;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const a = cestice[i];
        const b = cestice[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d >= dmin) continue;
        const nx = dx / d;
        const ny = dy / d;
        const push = dmin - d;
        const ka = a.mod === "kruto" ? 0 : b.mod === "kruto" ? 1 : 0.5;
        const kb = 1 - ka;
        if (a.mod === "kruto" && b.mod === "kruto") continue;
        a.x -= nx * push * ka;
        a.y -= ny * push * ka;
        b.x += nx * push * kb;
        b.y += ny * push * kb;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0 && a.mod !== "kruto" && b.mod !== "kruto") {
          a.vx += rel * nx;
          a.vy += rel * ny;
          b.vx -= rel * nx;
          b.vy -= rel * ny;
        }
      }
    }
  }

  // statičan raspored bez animacije: krute u rešetki, tekuće razmaknute pri dnu, plin razbacan
  function staticno() {
    const tek = cestice.filter((c) => c.mod === "tekuce");
    const pl = cestice.filter((c) => c.mod === "plin");
    tek.forEach((c, k) => {
      c.x = c.hx + ((k % 2) - 0.5) * 6;
      c.y = c.hy + 2;
    });
    pl.forEach((c, k) => {
      c.x = 14 + ((k * 37) % 72);
      c.y = 12 + ((k * 23) % 40);
    });
    cestice
      .filter((c) => c.mod === "kruto")
      .forEach((c) => ((c.x = c.hx), (c.y = c.hy)));
  }

  function nacrtaj() {
    for (const c of cestice) {
      const el = krugovi[c.i];
      if (!el) continue;
      el.setAttribute("cx", c.x.toFixed(1));
      el.setAttribute("cy", c.y.toFixed(1));
      el.setAttribute("class", `fc-c fc-${c.mod}`);
    }
  }

  $effect(() => {
    void [tekuce, plin];
    modovi();
    if (prefersReducedMotion.current) {
      staticno();
      nacrtaj();
    }
  });

  $effect(() => {
    if (prefersReducedMotion.current) return;
    let id;
    let prije = null;
    const petlja = (ms) => {
      const t = ms / 1000;
      const dt = prije == null ? 0 : Math.min(0.04, t - prije);
      prije = t;
      korak(t, dt);
      nacrtaj();
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
</script>

<svg class="fc" viewBox="0 0 100 100" role="img" aria-label={oznaka}>
  <rect class="fc-kutija" x="1.5" y="1.5" width="97" height="97" rx="6" />
  {#each cestice as c (c.i)}
    <circle
      use:registriraj={c.i}
      class="fc-c fc-kruto"
      cx={c.hx}
      cy={c.hy}
      r={R}
    />
  {/each}
</svg>

<style>
  .fc {
    width: 100%;
    height: auto;
    display: block;
  }
  .fc-kutija {
    fill: var(--bg);
    stroke: var(--text);
    stroke-width: 1.5;
  }
  .fc :global(.fc-c) {
    stroke-width: 1;
  }
  .fc :global(.fc-kruto) {
    fill: color-mix(in srgb, var(--primary) 75%, var(--bg-elev));
    stroke: var(--primary);
  }
  .fc :global(.fc-tekuce) {
    fill: color-mix(in srgb, var(--lx-water) 70%, var(--bg-elev));
    stroke: var(--lx-water);
  }
  .fc :global(.fc-plin) {
    fill: color-mix(in srgb, var(--warn) 65%, var(--bg-elev));
    stroke: var(--warn);
  }
</style>
