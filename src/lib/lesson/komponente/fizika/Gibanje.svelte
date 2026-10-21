<script>
  // Gibanje jednog ili dvaju tijela: animacija (▶/⏸, premotavanje), tragovi svakih Δt, strelice v i a, brojači i
  // povezani grafovi s kursorom vremena. Položaj, brzinu i trenutke cilja računa katalog (modelGibanja), pa crtež
  // i provjera uvijek kažu isto. „zaustavi“: učenik bilježi trenutke; „postavi“: učenik namješta klizače.
  import { untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import { formatNumber } from "../../core/number.js";
  import { modelGibanja, pocetniParametri, trenuciCilja, tolerancijaTrenutka, rjesenjePostavi, rasponScene, velicine, zadaniBrojaci } from "../../katalog/fizika/gibanje.js";
  import { lijepKorak, crtice, lijepRaspon } from "../../katalog/fizika/_kinematika.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  // širina crteža prati širinu widgeta (na mobitelu manji viewBox = čitljiviji tekst)
  let sirinaKutije = $state(400);
  const W = $derived(Math.round(Math.min(400, Math.max(300, sirinaKutije))));
  const BOJE = ["var(--primary)", "var(--warn)"];

  const nacin = $derived(spec.nacin);
  const pitanje = $derived(nacin !== "istrazi");
  const rav = $derived(spec.prostor === "ravnina");
  const vert = $derived(spec.prostor === "vertikalno");
  const vel = $derived(velicine(spec));

  // ── parametri i model ──
  const klizaci = $derived(spec.klizaci ?? []);
  let parametri = $state(untrack(() => pocetniParametri(spec)));
  const model = $derived(modelGibanja(spec, parametri));
  const T = $derived(model.tKraj);
  const raspon = $derived(rasponScene(spec));
  const tijela = $derived(model.tijela);
  const opisi = $derived(spec.tijela);

  // ── vrijeme i animacija ──
  let t = $state(0);
  let igra = $state(false);
  // animacija traje 3–8 s: kratko gibanje (hitac od 1 s) usporeno, dugo (vožnja od 18 s) ubrzano
  const ubrzanje = $derived(spec.ubrzanje ?? (T < 3 ? T / 3 : T > 8 ? T / 8 : 1));
  const brzinaOpis = $derived(ubrzanje > 1.05 ? `ubrzano ${formatNumber(Math.round(ubrzanje * 10) / 10)}×` : ubrzanje < 0.95 ? `usporeno ${formatNumber(Math.round((1 / ubrzanje) * 10) / 10)}×` : "stvarna brzina");
  const korakT = $derived(Math.max(0.01, lijepKorak(T, 200)));

  $effect(() => {
    if (!igra) return;
    let zadnje = performance.now();
    let id;
    const korak = (sad) => {
      const dt = Math.min(0.1, (sad - zadnje) / 1000);
      zadnje = sad;
      const [kraj, u] = untrack(() => [T, ubrzanje]);
      const nt = Math.min(kraj, untrack(() => t) + dt * u);
      t = nt;
      if (nt >= kraj) {
        igra = false;
        return;
      }
      id = requestAnimationFrame(korak);
    };
    id = requestAnimationFrame(korak);
    return () => cancelAnimationFrame(id);
  });

  function pokreni() {
    if (prefersReducedMotion.current) {
      t = T;
      return;
    }
    if (t >= T - 1e-9) t = 0;
    igra = true;
  }
  const pauziraj = () => (igra = false);
  function ispocetka() {
    igra = false;
    t = 0;
  }
  function pomakniT(d) {
    igra = false;
    t = Math.min(T, Math.max(0, Math.round((t + d) / korakT) * korakT));
  }
  function promjenaKlizaca() {
    igra = false;
    t = 0;
  }
  $effect(() => {
    // novo trajanje (klizač) ne smije ostaviti kursor iza kraja
    if (t > T) t = T;
  });

  // ── stanje u trenutku t ──
  const stanja = $derived(tijela.map((b) => b.stanje(t)));
  const tragoviT = $derived.by(() => {
    const dt = spec.tragovi;
    if (!dt) return [];
    const out = [];
    for (let k = 0; k * dt <= t + 1e-9 && out.length < 120; k++) out.push(k * dt);
    return out;
  });

  // najveća brzina i akceleracija u gibanju: mjerilo strelica
  const maks = $derived.by(() => {
    let [v, a] = [0, 0];
    for (const b of tijela) {
      for (let i = 0; i <= 200; i++) {
        const st = b.stanje((T * i) / 200);
        v = Math.max(v, Math.abs(st.v ?? 0), Math.abs(st.vx ?? 0), Math.abs(st.vy ?? 0));
        a = Math.max(a, Math.abs(st.a ?? 0));
      }
    }
    return { v, a };
  });
  const kv = $derived(maks.v > 0 ? 64 / maks.v : 0);
  const ka = $derived(maks.a > 0 ? 40 / maks.a : 0);
  const strelice = $derived(spec.strelice ?? []);

  // ── scena: staza ──
  const PADX = 24;
  const laneH = $derived(tijela.length > 1 ? 76 : 62);
  const stazaVrh = $derived(spec.crte?.length ? 26 : 10);
  const stazaH = $derived(stazaVrh + tijela.length * laneH + (tijela.length > 1 ? 50 : 34));
  const sR = $derived(raspon.s ?? [0, 1]);
  const XS = (v) => PADX + ((v - sR[0]) / (sR[1] - sR[0])) * (W - 2 * PADX);
  const linijaY = (i) => stazaVrh + laneH * (i + 1) - 6;

  // ── scena: okomito ──
  const VH = 300;
  const VT = 22;
  const VB = 28;
  const VL = 52;
  const YV = (h) => VH - VB - ((h - sR[0]) / (sR[1] - sR[0])) * (VH - VT - VB);
  const stupX = (i) => (tijela.length === 1 ? W * 0.56 : [W * 0.44, W * 0.75][i]);

  // ── scena: ravnina ──
  const RL = 44;
  const RR = 16;
  const RT = 18;
  const RB = 32;
  const xR = $derived(raspon.x ?? [0, 1]);
  const yR = $derived(raspon.y ?? [0, 1]);
  const pw = $derived(W - RL - RR);
  const ph = $derived(Math.min(250, Math.max(130, (pw * (yR[1] - yR[0])) / (xR[1] - xR[0]))));
  const ravH = $derived(RT + ph + RB);
  const XR = (x) => RL + ((x - xR[0]) / (xR[1] - xR[0])) * pw;
  const YR = (y) => RT + ph - ((y - yR[0]) / (yR[1] - yR[0])) * ph;
  const sx = $derived(pw / (xR[1] - xR[0]));
  const sy = $derived(ph / (yR[1] - yR[0]));

  const H = $derived(rav ? ravH : vert ? VH : stazaH);

  // položaj tijela na crtežu (px)
  function tockaTijela(i, st) {
    if (rav) return [XR(st.x), YR(st.y)];
    if (vert) return [stupX(i), YV(st.s)];
    return [XS(st.s), linijaY(i) - 10];
  }
  // smjer kretanja (auto gleda kamo vozi)
  const smjer = $derived(
    tijela.map((b, i) => {
      const st = stanja[i];
      const v = rav ? st.vx : st.v;
      if (Math.abs(v ?? 0) > 1e-9) return Math.sign(v);
      if (rav) return Math.sign(b.vx0 || 1);
      const d = b.stanje(T).s - b.stanje(0).s;
      return d < 0 ? -1 : 1;
    }),
  );

  // strelica u px: od [x, y] za [dx, dy]
  function strelica(x, y, dx, dy) {
    const L = Math.hypot(dx, dy);
    if (L < 2) return null;
    const [ux, uy] = [dx / L, dy / L];
    const vrh = Math.min(8, L * 0.6);
    const [bx, by] = [x + dx - ux * vrh, y + dy - uy * vrh];
    return { linija: `M${r1(x)},${r1(y)} L${r1(bx)},${r1(by)}`, glava: `M${r1(x + dx)},${r1(y + dy)} L${r1(bx - uy * 4.5)},${r1(by + ux * 4.5)} L${r1(bx + uy * 4.5)},${r1(by - ux * 4.5)} Z`, kraj: [x + dx, y + dy], u: [ux, uy] };
  }
  const r1 = (n) => Math.round(n * 10) / 10;

  const strelicePx = $derived(
    tijela.map((b, i) => {
      const st = stanja[i];
      const [x, y] = tockaTijela(i, st);
      const out = {};
      if (strelice.includes("v")) {
        if (rav) {
          const d = Math.hypot(st.vx * sx, st.vy * sy);
          if (d > 0) out.v = strelica(x, y, ((st.vx * sx) / d) * st.v * kv, ((-st.vy * sy) / d) * st.v * kv);
          if (tijela.length === 1 && out.v) {
            out.vx = strelica(x, y, st.vx * kv, 0);
            out.vy = strelica(x, y, 0, -st.vy * kv);
          }
        } else if (vert) out.v = strelica(x + 22, y, 0, -st.v * kv);
        else out.v = strelica(x, y - 22, st.v * kv, 0);
      }
      if (strelice.includes("a") && !st.miruje) {
        if (rav) out.a = strelica(x, y, 0, st.a * ka);
        else if (vert) out.a = strelica(x - 22, y + st.a * ka, 0, -st.a * ka);
        else out.a = strelica(x, y - 36, st.a * ka, 0);
      }
      return out;
    }),
  );

  // put u ravnini do trenutka t
  const putanje = $derived(
    rav
      ? tijela.map((b) => {
          const kraj = Math.min(t, b.kraj ?? t);
          const n = 60;
          return Array.from({ length: n + 1 }, (_, k) => {
            const st = b.stanje((kraj * k) / n);
            return `${r1(XR(st.x))},${r1(YR(st.y))}`;
          }).join(" ");
        })
      : [],
  );

  // ── zaustavi ──
  let zabiljezeno = $state([]);
  const korijeni = $derived(nacin === "zaustavi" ? trenuciCilja(spec) : []);
  function zabiljezi() {
    if (locked) return;
    igra = false;
    const tt = Math.round(t * 100) / 100;
    if (!zabiljezeno.some((x) => Math.abs(x - tt) < 1e-9)) zabiljezeno = [...zabiljezeno, tt].sort((a, b) => a - b);
  }
  const ukloni = (x) => (zabiljezeno = zabiljezeno.filter((y) => y !== x));
  const pogodak = (x) => korijeni.some((r) => Math.abs(r - x) <= tolerancijaTrenutka(spec, r));

  // ── postavi ──
  const rjesenje = $derived(nacin === "postavi" ? rjesenjePostavi(spec) : null);

  function provjeri() {
    if (locked) return;
    igra = false;
    if (nacin === "zaustavi") onodgovor([...zabiljezeno]);
    else onodgovor({ ...parametri });
  }

  // prikaz točnog odgovora u samom widgetu
  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      igra = false;
      if (nacin === "zaustavi") {
        zabiljezeno = korijeni.map((r) => Math.round(r * 100) / 100);
        t = korijeni[0] ?? 0;
      } else if (nacin === "postavi" && rjesenje) {
        for (const [k, v] of Object.entries(rjesenje.parametri)) parametri[k] = v;
        t = 0;
        pokreni();
      }
    });
  });
  const zakljucano = $derived(locked || !!ishod?.tocno);

  // ── brojači ──
  const brojaci = $derived(zadaniBrojaci(spec).filter((b) => b !== "t"));
  const BR = { s: null, x: "x", y: "y", vx: "vx", vy: "vy", v: "v", v_kmh: "v", a: "a" };
  function fmt(n, d = 1) {
    if (!Number.isFinite(n)) return "—";
    const r = Math.abs(n) < 0.5 * 10 ** -d ? 0 : n;
    return r.toFixed(d).replace(".", ",").replace("-", "−");
  }
  function brojac(k, st) {
    if (k === "v_kmh") return { ime: "v", jed: "km/h", vr: fmt(st.v * 3.6, 0) };
    const v = vel[BR[k] ?? k];
    const d = k === "a" ? 2 : 1;
    return { ime: v?.oznaka ?? k, jed: v?.jedinica ?? "", vr: fmt(st[k], d) };
  }
  const decT = $derived(korakT < 0.1 ? 2 : 1);

  // ── grafovi ──
  const vrste = $derived(spec.graf?.vrste ?? []);
  const GL = 46;
  const GR = 14;
  const GT = 22;
  const GB = 24;
  const gH = $derived(vrste.length > 1 ? 126 : 148);
  const GX = (tt) => GL + (tt / T) * (W - GL - GR);
  const VEL_GRAFA = { "s-t": "s", "v-t": "v", "a-t": "a", "x-t": "x", "y-t": "y", "vx-t": "vx", "vy-t": "vy" };

  const grafovi = $derived(
    vrste.map((vr) => {
      const k = VEL_GRAFA[vr];
      const nizovi = tijela.map((b) => {
        const kraj = Math.min(T, b.kraj ?? T);
        // zadnja točka malo prije kraja: u samom kraju počinje sljedeća dionica (a skoči na 0)
        const ts = Array.from({ length: 241 }, (_, i) => (i === 240 ? kraj - 1e-7 * Math.max(1, kraj) : (kraj * i) / 240));
        for (const l of b.lomovi) if (l < kraj) ts.push(l - 1e-7, l + 1e-7);
        ts.sort((a, c) => a - c);
        return ts.map((tt) => [tt, b.stanje(tt)[k]]).filter(([, v]) => Number.isFinite(v));
      });
      const sve = nizovi.flat().map(([, v]) => v);
      for (const c of spec.crte ?? []) if (Number.isFinite(c?.[k])) sve.push(c[k]);
      const [y0, y1] = lijepRaspon(Math.min(0, ...sve), Math.max(0, ...sve), 4);
      const Y = (v) => GT + (gH - GT - GB) * (1 - (v - y0) / (y1 - y0));
      const crteG = (spec.crte ?? []).filter((c) => Number.isFinite(c?.[k])).map((c) => ({ y: Y(c[k]), oznaka: c.oznaka }));
      const oz = vel[k];
      return { vr, k, nizovi, y0, y1, Y, crte: crteG, oznaka: oz?.oznaka ?? k, jedinica: oz?.jedinica ?? "", tyKorak: lijepKorak(y1 - y0, 4) };
    }),
  );
  const tTicks = $derived(crtice(0, T, lijepKorak(T, 6)));

  function linija(niz, Y, doT = Infinity) {
    const pts = [];
    for (const [tt, v] of niz) {
      if (tt > doT) {
        const zadnja = niz.findLast(([x]) => x <= doT);
        if (zadnja && pts.length) pts.push(`${r1(GX(doT))},${r1(Y(interp(niz, doT)))}`);
        break;
      }
      pts.push(`${r1(GX(tt))},${r1(Y(v))}`);
    }
    return pts.join(" ");
  }
  function interp(niz, tt) {
    for (let i = 1; i < niz.length; i++) {
      if (niz[i][0] >= tt) {
        const [[a, va], [b, vb]] = [niz[i - 1], niz[i]];
        return b - a < 1e-12 ? vb : va + ((vb - va) * (tt - a)) / (b - a);
      }
    }
    return niz.at(-1)?.[1] ?? 0;
  }
  // površina ispod v–t do kursora (put, uz predznak = pomak)
  function povrsina(niz, Y) {
    const pts = [`${r1(GX(0))},${r1(Y(0))}`];
    for (const [tt, v] of niz) {
      if (tt > t) break;
      pts.push(`${r1(GX(tt))},${r1(Y(v))}`);
    }
    const kraj = Math.min(t, niz.at(-1)?.[0] ?? 0);
    pts.push(`${r1(GX(kraj))},${r1(Y(interp(niz, kraj)))}`, `${r1(GX(kraj))},${r1(Y(0))}`);
    return pts.join(" ");
  }
  const povrsine = $derived(
    tijela.map((b) => {
      // pomak od početka do t: točno iz modela (s(t) − s(0)), isti broj kao brojač
      const k = rav ? (vrste.includes("vy-t") && !vrste.includes("vx-t") ? "y" : "x") : "s";
      return b.stanje(t)[k] - b.stanje(0)[k];
    }),
  );
  const graf = $derived(spec.graf ?? {});

  // povlačenje po grafu premotava vrijeme
  let vuceGraf = null;
  function tIzDogadaja(e, svg) {
    const m = svg?.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    t = Math.min(T, Math.max(0, ((p.x - GL) / (W - GL - GR)) * T));
  }
  function grafDolje(e) {
    if (e.button > 0) return;
    igra = false;
    vuceGraf = e.currentTarget;
    vuceGraf.setPointerCapture?.(e.pointerId);
    tIzDogadaja(e, vuceGraf);
  }
  const grafPomak = (e) => vuceGraf && tIzDogadaja(e, vuceGraf);
  const grafGore = () => (vuceGraf = null);

  // ── opis za čitač zaslona ──
  const sazetak = $derived(
    `t = ${fmt(t, 2)} s. ` +
      tijela
        .map((b, i) => {
          const st = stanja[i];
          return rav ? `${b.naziv}: x = ${fmt(st.x)} m, y = ${fmt(st.y)} m, v = ${fmt(st.v)} m/s` : `${b.naziv}: ${vel.s.oznaka} = ${fmt(st.s)} m, v = ${fmt(st.v)} m/s`;
        })
        .join("; "),
  );
  const opisScene = $derived(`${rav ? "Hitac u ravnini" : vert ? "Gibanje okomito" : "Gibanje po stazi"}: ${tijela.map((b) => b.naziv).join(" i ")}. ${sazetak}`);
  const ikonaSlovo = (i) => (opisi[i]?.naziv ?? "?").charAt(0).toUpperCase();
</script>

{#snippet ikona(i, x, y)}
  {@const b = tijela[i]}
  {@const boja = BOJE[i % 2]}
  <g transform="translate({r1(x)} {r1(y)}) scale({smjer[i]} 1)" class="gb-tijelo" style:--c={boja}>
    {#if b.ikona === "auto"}
      <g transform="scale(-1 1)">
      <path class="gb-auto" d="M-17,4 L-17,-3 Q-16,-6 -12,-6 L-7,-6 L-3,-12 L8,-12 L12,-6 L15,-5 Q18,-4 18,0 L18,4 Z" />
      <circle class="gb-kotac" cx="-9" cy="5" r="3.6" />
      <circle class="gb-kotac" cx="10" cy="5" r="3.6" />
      <path class="gb-prozor" d="M-5,-6.5 L-1.5,-10.5 L3,-10.5 L3,-6.5 Z M5,-6.5 L5,-10.5 L7.5,-10.5 L10.2,-6.5 Z" />
      </g>
    {:else if b.ikona === "paket"}
      <rect class="gb-puno" x="-8" y="-8" width="16" height="16" rx="2" />
      <path class="gb-traka" d="M-8,0 H8 M0,-8 V8" />
    {:else if b.ikona === "lopta"}
      <circle class="gb-puno" r="7.5" />
      <path class="gb-traka" d="M-7,-2 Q0,3 7,-2" />
    {:else}
      <circle class="gb-puno" r="10" />
      <text class="gb-slovo" y="4" text-anchor="middle" transform="scale({smjer[i]} 1)">{ikonaSlovo(i)}</text>
    {/if}
  </g>
{/snippet}

{#snippet strelicaSvg(s, klasa, oznaka, boja)}
  {#if s}
    <g class="gb-str {klasa}" style:--c={boja}>
      <path class="gb-str-l" d={s.linija} />
      <path class="gb-str-g" d={s.glava} />
      {#if oznaka}<text class="gb-str-t" x={r1(s.kraj[0] + s.u[0] * 9 + (Math.abs(s.u[0]) < 0.3 ? 8 : 0))} y={r1(s.kraj[1] + s.u[1] * 9 + 4)} text-anchor="middle">{oznaka}</text>{/if}
    </g>
  {/if}
{/snippet}

{#snippet ime(k)}{#if k === "vx"}v<sub>x</sub>{:else if k === "vy"}v<sub>y</sub>{:else}{vel[BR[k] ?? k]?.oznaka ?? k}{/if}{/snippet}

{#if pitanje}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <Md text={spec.tekst} />
{/if}
<p class="lx-hint gb-uputa">
  {#if nacin === "istrazi"}Pokreni, zaustavi i premotavaj{klizaci.length ? ", mijenjaj klizače" : ""} – ovo nije zadatak.
  {:else if nacin === "zaustavi"}Pokreni pa zaustavi (ili povuci vrijeme) u pravom trenutku i pritisni „Zabilježi trenutak“. Kad zabilježiš sve, pritisni Provjeri.
  {:else}Namjesti klizač, pusti gibanje i pogledaj ishod. Kad pogodiš, pritisni Provjeri.{/if}
</p>

<!-- scena -->
<div class="lx-figure gb-scena" class:dobro={ishod?.tocno} bind:clientWidth={sirinaKutije}>
  <svg viewBox="0 0 {W} {H}" role="img" aria-label={opisScene}>
    {#if rav}
      <!-- tlo, osi, mreža -->
      {#each crtice(xR[0], xR[1], lijepKorak(xR[1] - xR[0], 6)) as x (x)}
        <line class="gb-mreza" x1={XR(x)} y1={YR(yR[0])} x2={XR(x)} y2={YR(yR[1])} />
        <text class="gb-tick" x={XR(x)} y={YR(yR[0]) + 14} text-anchor="middle">{formatNumber(x)}</text>
      {/each}
      {#each crtice(yR[0], yR[1], lijepKorak(yR[1] - yR[0], 4)) as y (y)}
        <line class="gb-mreza" x1={XR(xR[0])} y1={YR(y)} x2={XR(xR[1])} y2={YR(y)} />
        <text class="gb-tick" x={XR(xR[0]) - 6} y={YR(y) + 4} text-anchor="end">{formatNumber(y)}</text>
      {/each}
      <rect class="gb-tlo" x={XR(xR[0])} y={YR(0)} width={pw} height="5" />
      <line class="gb-os" x1={XR(xR[0])} y1={YR(0)} x2={XR(xR[1])} y2={YR(0)} />
      <line class="gb-os" x1={XR(xR[0])} y1={YR(yR[0])} x2={XR(xR[0])} y2={YR(yR[1])} />
      <text class="gb-tick gb-osi" x={XR(xR[1])} y={YR(yR[0]) + 28} text-anchor="end">x (m)</text>
      <text class="gb-tick gb-osi" x={XR(xR[0]) + 6} y={RT - 6}>y (m)</text>
      {#each spec.crte ?? [] as c, j (j)}
        {#if c.x != null}
          <line class="gb-crta" x1={XR(c.x)} y1={YR(0)} x2={XR(c.x)} y2={YR(yR[1])} />
          <path class="gb-cilj" d="M{XR(c.x) - 9},{YR(0) - 10} L{XR(c.x) - 7},{YR(0)} L{XR(c.x) + 7},{YR(0)} L{XR(c.x) + 9},{YR(0) - 10}" />
          {#if c.oznaka}<text class="gb-crta-t" x={XR(c.x)} y={YR(yR[1]) + 12} text-anchor="middle">{c.oznaka}</text>{/if}
        {:else if c.y != null}
          <line class="gb-crta" x1={XR(xR[0])} y1={YR(c.y)} x2={XR(xR[1])} y2={YR(c.y)} />
          {#if c.oznaka}<text class="gb-crta-t" x={XR(xR[1]) - 2} y={YR(c.y) - 5} text-anchor="end">{c.oznaka}</text>{/if}
        {/if}
      {/each}
      <!-- putanja, tragovi s projekcijama na osi -->
      {#each tijela as b, i (b.id)}
        <polyline class="gb-putanja" style:--c={BOJE[i % 2]} points={putanje[i]} />
        {#each tragoviT as tt (tt)}
          {@const st = b.stanje(Math.min(tt, b.kraj ?? tt))}
          <circle class="gb-trag" style:--c={BOJE[i % 2]} cx={XR(st.x)} cy={YR(st.y)} r="3.4" />
          <circle class="gb-proj" style:--c={BOJE[i % 2]} cx={XR(st.x)} cy={YR(yR[0]) + 0.5} r="2.2" />
          <circle class="gb-proj" style:--c={BOJE[i % 2]} cx={XR(xR[0]) - 0.5} cy={YR(st.y)} r="2.2" />
        {/each}
      {/each}
    {:else if vert}
      <!-- ljestvica visine i tlo -->
      <line class="gb-os" x1={VL} y1={YV(sR[0])} x2={VL} y2={YV(sR[1])} />
      {#each crtice(sR[0], sR[1], lijepKorak(sR[1] - sR[0], 6)) as h (h)}
        <line class="gb-mreza" x1={VL} y1={YV(h)} x2={W - 12} y2={YV(h)} />
        <line class="gb-os" x1={VL - 4} y1={YV(h)} x2={VL} y2={YV(h)} />
        <text class="gb-tick" x={VL - 7} y={YV(h) + 4} text-anchor="end">{formatNumber(h)}</text>
      {/each}
      <text class="gb-tick gb-osi" x={VL + 6} y={VT - 8}>h (m)</text>
      {#if sR[0] <= 0}
        <rect class="gb-tlo" x={VL} y={YV(0)} width={W - 12 - VL} height="6" />
        <line class="gb-os" x1={VL} y1={YV(0)} x2={W - 12} y2={YV(0)} />
      {/if}
      {#each spec.crte ?? [] as c, j (j)}
        {#if c.s != null}
          <line class="gb-crta" x1={VL} y1={YV(c.s)} x2={W - 12} y2={YV(c.s)} />
          {#if c.oznaka}<text class="gb-crta-t" x={W - 14} y={YV(c.s) - 5} text-anchor="end">{c.oznaka}</text>{/if}
        {/if}
      {/each}
      {#each tijela as b, i (b.id)}
        {#if tijela.length > 1}<text class="gb-ime" style:--c={BOJE[i % 2]} x={stupX(i)} y={VT - 8} text-anchor="middle">{b.naziv}</text>{/if}
        <!-- trag gore lijevo, dolje desno: vidi se da tijelo istu visinu prolazi dvaput -->
        {#each tragoviT as tt (tt)}
          {@const st = b.stanje(tt)}
          {#if !st.miruje || tt <= (b.kraj ?? Infinity)}
            <circle class="gb-trag" style:--c={BOJE[i % 2]} cx={stupX(i) + (st.v > 1e-9 ? -10 : st.v < -1e-9 ? 10 : 0)} cy={YV(st.s)} r="3.4" />
          {/if}
        {/each}
      {/each}
    {:else}
      <!-- staza: trake, ljestvica -->
      {#each tijela as b, i (b.id)}
        <line class="gb-traka-l" x1={PADX - 8} y1={linijaY(i)} x2={W - PADX + 8} y2={linijaY(i)} />
        {#if tijela.length > 1}<text class="gb-ime" style:--c={BOJE[i % 2]} x={PADX - 6} y={linijaY(i) + 15}>{b.naziv}</text>{/if}
        {#each tragoviT as tt (tt)}
          <circle class="gb-trag" style:--c={BOJE[i % 2]} cx={XS(b.stanje(tt).s)} cy={linijaY(i)} r="3.4" />
        {/each}
      {/each}
      {#each crtice(sR[0], sR[1], lijepKorak(sR[1] - sR[0], 6)) as s (s)}
        <line class="gb-os" x1={XS(s)} y1={stazaH - 30} x2={XS(s)} y2={stazaH - 25} />
        <text class="gb-tick" x={XS(s)} y={stazaH - 12} text-anchor="middle">{formatNumber(s)}</text>
      {/each}
      <line class="gb-os" x1={PADX} y1={stazaH - 30} x2={W - PADX} y2={stazaH - 30} />
      <text class="gb-tick gb-osi" x={W - 4} y={stazaH - 1} text-anchor="end">s (m)</text>
      {#each spec.crte ?? [] as c, j (j)}
        {#if c.s != null}
          <line class="gb-crta" x1={XS(c.s)} y1={16} x2={XS(c.s)} y2={stazaH - 30} />
          {#if c.oznaka}<text class="gb-crta-t" x={XS(c.s)} y={11} text-anchor="middle">{c.oznaka}</text>{/if}
        {/if}
      {/each}
    {/if}

    <!-- zabilježeni trenuci: obris tijela na tom mjestu -->
    {#if nacin === "zaustavi"}
      {#each zabiljezeno as zt (zt)}
        {#each tijela as b, i (b.id)}
          {@const [px, py] = tockaTijela(i, b.stanje(zt))}
          <circle class="gb-biljeska" class:ok={(ishod?.tocno || pokazi) && pogodak(zt)} cx={px} cy={py} r="12" />
        {/each}
      {/each}
    {/if}

    <!-- tijela i strelice -->
    {#each tijela as b, i (b.id)}
      {@const [px, py] = tockaTijela(i, stanja[i])}
      {@render ikona(i, px, py)}
      {@render strelicaSvg(strelicePx[i].vx, "gb-komp", "", BOJE[i % 2])}
      {@render strelicaSvg(strelicePx[i].vy, "gb-komp", "", BOJE[i % 2])}
      {@render strelicaSvg(strelicePx[i].v, "gb-v", "v", BOJE[i % 2])}
      {@render strelicaSvg(strelicePx[i].a, "gb-a", "a", "var(--danger)")}
    {/each}
  </svg>
</div>

<!-- klizači (istrazi, postavi) -->
{#if klizaci.length}
  <div class="gb-klizaci">
    {#each klizaci as k (k.id)}
      <div class="gb-klizac">
        <label for="gb-{uid}-{k.id}"><Md text={k.oznaka} inline /></label>
        <input id="gb-{uid}-{k.id}" type="range" min={k.min} max={k.max} step={k.korak} bind:value={parametri[k.id]} oninput={promjenaKlizaca} disabled={zakljucano} />
        <output for="gb-{uid}-{k.id}" class="gb-kl-vr mono">{formatNumber(parametri[k.id])}{k.jedinica ? `${k.jedinica === "°" ? "" : "\u00a0"}${k.jedinica}` : ""}</output>
      </div>
    {/each}
  </div>
{/if}

<!-- kontrole vremena -->
<div class="gb-kontrole">
  {#if igra}
    <button type="button" class="btn btn-ghost gb-gumb" onclick={pauziraj} aria-label="Pauza">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10M11 3v10" /></svg>Pauza
    </button>
  {:else}
    <button type="button" class="btn btn-ghost gb-gumb" onclick={pokreni} disabled={nacin === "zaustavi" && zakljucano && !pokazi} aria-label={t >= T - 1e-9 ? "Pokreni ponovno" : "Pokreni"}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path class="puno" d="M5 3l8 5-8 5z" /></svg>{t > 0 && t < T - 1e-9 ? "Nastavi" : "Pokreni"}
    </button>
  {/if}
  <button type="button" class="btn btn-quiet gb-gumb gb-ikona" onclick={ispocetka} aria-label="Ispočetka" title="Ispočetka">
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.5 2.5v3h3" /></svg>
  </button>
  <div class="gb-vrijeme">
    <input type="range" min="0" max={T} step={korakT} bind:value={t} oninput={() => (igra = false)} aria-label="Vrijeme" aria-valuetext="{fmt(t, decT)} sekundi" />
    <div class="gb-vrijeme-red">
      <output class="gb-t mono">t = {fmt(t, decT)} s</output>
      <span class="gb-brzina">{brzinaOpis}</span>
    </div>
  </div>
</div>
{#if nacin === "zaustavi"}
  <div class="gb-fino">
    <button type="button" class="btn btn-quiet" onclick={() => pomakniT(-korakT * (korakT < 0.05 ? 5 : 1))} aria-label="Malo unatrag">−{formatNumber(korakT * (korakT < 0.05 ? 5 : 1))} s</button>
    <button type="button" class="btn btn-quiet" onclick={() => pomakniT(korakT * (korakT < 0.05 ? 5 : 1))} aria-label="Malo naprijed">+{formatNumber(korakT * (korakT < 0.05 ? 5 : 1))} s</button>
  </div>
{/if}

<!-- brojači -->
{#if brojaci.length}
  <div class="gb-brojaci" class:dva={tijela.length > 1}>
    {#each tijela as b, i (b.id)}
      <div class="gb-red">
        {#if tijela.length > 1}<span class="gb-red-ime" style:--c={BOJE[i % 2]}><i></i>{b.naziv}</span>{/if}
        {#each brojaci as k (k)}
          {@const br = brojac(k, stanja[i])}
          <span class="gb-br"><span class="gb-br-ime">{@render ime(k)}</span><b class="mono">{br.vr}</b><span class="gb-br-jed">{br.jed}</span></span>
        {/each}
      </div>
    {/each}
  </div>
{/if}
<p class="sr-only" aria-live="polite">{igra ? "" : sazetak}</p>

<!-- grafovi -->
{#each grafovi as gr (gr.vr)}
  <div class="lx-figure gb-graf">
    <svg
      viewBox="0 0 {W} {gH}"
      role="img"
      aria-label="Graf {gr.oznaka}–t. Povuci po grafu za premotavanje vremena."
      onpointerdown={grafDolje}
      onpointermove={grafPomak}
      onpointerup={grafGore}
      onpointercancel={grafGore}
    >
      {#each tTicks as x (x)}
        <line class="gb-mreza" x1={GX(x)} y1={GT} x2={GX(x)} y2={gH - GB} />
        {#if GX(x) < W - GR - 30}<text class="gb-tick" x={GX(x)} y={gH - GB + 14} text-anchor="middle">{formatNumber(x)}</text>{/if}
      {/each}
      {#each crtice(gr.y0, gr.y1, gr.tyKorak) as y (y)}
        <line class="gb-mreza" x1={GL} y1={gr.Y(y)} x2={W - GR} y2={gr.Y(y)} />
        <text class="gb-tick" x={GL - 6} y={gr.Y(y) + 4} text-anchor="end">{formatNumber(y)}</text>
      {/each}
      <line class="gb-os" x1={GL} y1={gr.Y(0)} x2={W - GR} y2={gr.Y(0)} />
      <line class="gb-os" x1={GL} y1={GT} x2={GL} y2={gH - GB} />
      <text class="gb-tick gb-osi" x={W - GR} y={gH - GB + 14} text-anchor="end">t (s)</text>
      <text class="gb-tick gb-osi" x={GL - 6} y={GT - 9}>
        {#if gr.k === "vx"}v<tspan dy="3" font-size="0.75em">x</tspan><tspan dy="-3"> </tspan>{:else if gr.k === "vy"}v<tspan dy="3" font-size="0.75em">y</tspan><tspan dy="-3"> </tspan>{:else}{`${gr.oznaka} `}{/if}({gr.jedinica})
      </text>
      {#each gr.crte as c, j (j)}
        <line class="gb-crta" x1={GL} y1={c.y} x2={W - GR} y2={c.y} />
      {/each}
      {#if graf.povrsina && ["v", "vx", "vy"].includes(gr.k)}
        {#each gr.nizovi as niz, i (i)}
          <polygon class="gb-povrsina" style:--c={BOJE[i % 2]} points={povrsina(niz, gr.Y)} />
        {/each}
      {/if}
      {#each gr.nizovi as niz, i (i)}
        <polyline class="gb-krivulja sjena" style:--c={BOJE[i % 2]} points={linija(niz, gr.Y)} />
        <polyline class="gb-krivulja" style:--c={BOJE[i % 2]} points={linija(niz, gr.Y, t)} />
      {/each}
      {#if nacin === "zaustavi"}
        {#each zabiljezeno as zt (zt)}
          <path class="gb-oznaka-t" class:ok={(ishod?.tocno || pokazi) && pogodak(zt)} d="M{GX(zt)},{gH - GB} l-5,7 h10 z" />
        {/each}
      {/if}
      <line class="gb-kursor" x1={GX(t)} y1={GT} x2={GX(t)} y2={gH - GB} />
      {#each tijela as b, i (b.id)}
        {@const v = stanja[i][gr.k]}
        {#if Number.isFinite(v) && t <= (b.kraj ?? Infinity) + 1e-9}<circle class="gb-kursor-t" style:--c={BOJE[i % 2]} cx={GX(t)} cy={gr.Y(v)} r="4" />{/if}
      {/each}
      {#if graf.povrsina && ["v", "vx", "vy"].includes(gr.k)}
        <text class="gb-povrsina-t" x={W - GR} y={GT - 9} text-anchor="end">
          površina = {tijela.length > 1 ? povrsine.map((p) => `${fmt(p)} m`).join(" / ") : `${fmt(povrsine[0])} m`}
        </text>
      {/if}
    </svg>
  </div>
{/each}

{#if nacin === "zaustavi"}
  <!-- zabilježeni trenuci označe se tek uz točan odgovor (ili „pokaži“): crveni trenutak bi otkrio koji su ostali dobri -->
  <div class="gb-biljeske">
    <button type="button" class="btn btn-ghost" onclick={zabiljezi} disabled={zakljucano}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>Zabilježi trenutak
    </button>
    {#each zabiljezeno as zt (zt)}
      <span class="gb-chip mono" class:ok={(ishod?.tocno || pokazi) && pogodak(zt)}>
        t = {fmt(zt, 2)} s
        {#if !zakljucano}<button type="button" class="gb-chip-x" onclick={() => ukloni(zt)} aria-label="Ukloni t = {fmt(zt, 2)} s">×</button>{/if}
      </span>
    {:else}
      <span class="gb-prazno">još ništa nije zabilježeno</span>
    {/each}
  </div>
{/if}

{#if pitanje}
  <div class="lx-actions">
    <button type="button" class="btn btn-primary" onclick={provjeri} disabled={zakljucano || (nacin === "zaustavi" && !zabiljezeno.length)}>Provjeri</button>
  </div>
  {#if pokazi}
    <p class="lx-solution">
      Točno:
      {#if nacin === "zaustavi"}{korijeni.map((r) => `t = ${formatNumber(Math.round(r * 100) / 100)} s`).join(" i ")}
      {:else if rjesenje}{klizaci.map((k) => `${k.oznaka.replace(/\$/g, "")} = ${formatNumber(rjesenje.parametri[k.id])}${k.jedinica ? ` ${k.jedinica}` : ""}`).join(", ")}{/if}
    </p>
  {/if}
{/if}

<style>
  .gb-uputa {
    margin: 0 0 10px;
  }
  .gb-scena {
    max-width: 520px;
    margin-bottom: 6px;
  }
  .gb-graf {
    max-width: 520px;
    margin: 6px auto 4px;
  }
  .gb-graf svg {
    cursor: ew-resize;
    touch-action: pan-y;
  }
  .gb-mreza {
    stroke: var(--border);
    stroke-width: 1;
  }
  .gb-os {
    stroke: var(--text-dim);
    stroke-width: 1.3;
  }
  .gb-tick {
    fill: var(--text-faint);
    font: 11px var(--font-sans);
  }
  .gb-osi {
    font-style: italic;
    fill: var(--text-dim);
  }
  .gb-tlo {
    fill: color-mix(in srgb, var(--text-dim) 18%, transparent);
  }
  .gb-traka-l {
    stroke: var(--border-strong);
    stroke-width: 2;
    stroke-linecap: round;
  }
  .gb-ime {
    fill: var(--c);
    font: 600 12px var(--font-sans);
  }
  .gb-crta {
    stroke: var(--text-dim);
    stroke-width: 1.3;
    stroke-dasharray: 5 4;
  }
  .gb-crta-t {
    fill: var(--text);
    font: 600 11.5px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .gb-cilj {
    fill: color-mix(in srgb, var(--success) 22%, transparent);
    stroke: var(--success);
    stroke-width: 1.6;
  }
  .gb-trag {
    fill: color-mix(in srgb, var(--c) 45%, transparent);
    stroke: var(--c);
    stroke-width: 1;
  }
  .gb-proj {
    fill: var(--c);
    opacity: 0.55;
  }
  .gb-putanja {
    fill: none;
    stroke: var(--c);
    stroke-width: 1.4;
    stroke-dasharray: 3 3;
    opacity: 0.7;
  }
  .gb-puno,
  .gb-auto {
    fill: var(--c);
    stroke: color-mix(in srgb, var(--c) 60%, var(--text));
    stroke-width: 1;
  }
  .gb-kotac {
    fill: var(--text);
    stroke: var(--bg-elev);
    stroke-width: 1.2;
  }
  .gb-prozor {
    fill: color-mix(in srgb, var(--bg-elev) 75%, transparent);
  }
  .gb-traka {
    fill: none;
    stroke: color-mix(in srgb, var(--bg-elev) 70%, transparent);
    stroke-width: 1.4;
  }
  .gb-slovo {
    fill: var(--on-primary, #fff);
    font: 700 11px var(--font-sans);
  }
  .gb-str-l {
    fill: none;
    stroke: var(--c);
    stroke-width: 2.6;
    stroke-linecap: round;
  }
  .gb-str-g {
    fill: var(--c);
  }
  .gb-str-t {
    fill: var(--c);
    font: italic 700 13px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .gb-komp .gb-str-l {
    stroke-width: 1.4;
    stroke-dasharray: 3 2;
    opacity: 0.8;
  }
  .gb-komp .gb-str-g {
    opacity: 0.8;
  }
  .gb-biljeska {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.4;
    stroke-dasharray: 3 3;
  }
  .gb-biljeska.ok {
    stroke: var(--success);
  }
  .dobro .gb-cilj {
    fill: color-mix(in srgb, var(--success) 45%, transparent);
  }

  .gb-kontrole {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    max-width: 520px;
    margin: 0 auto;
  }
  .gb-gumb svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .gb-gumb svg .puno,
  .gb-gumb svg path.puno {
    fill: currentColor;
    stroke: none;
  }
  .gb-gumb {
    min-height: 40px;
    min-width: 40px;
    justify-content: center;
  }
  .gb-ikona {
    padding: 8px;
  }
  .gb-vrijeme {
    flex: 1;
    min-width: 0;
  }
  .gb-vrijeme input[type="range"] {
    width: 100%;
    margin: 0;
    height: 28px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .gb-vrijeme-red {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: var(--text-faint);
  }
  .gb-t {
    white-space: nowrap;
    color: var(--text);
    font-size: 13px;
  }
  .gb-fino {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-top: 2px;
  }
  .gb-fino .btn {
    min-height: 36px;
    font-family: var(--font-mono);
  }
  .gb-brojaci {
    display: grid;
    gap: 6px;
    max-width: 520px;
    margin: 10px auto 4px;
  }
  .gb-red {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .gb-red-ime {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 76px;
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .gb-red-ime i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--c);
  }
  .gb-br {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    padding: 5px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    font-size: 13px;
  }
  .gb-br-ime {
    font-style: italic;
    color: var(--text-dim);
  }
  .gb-br-ime::after {
    content: " =";
    font-style: normal;
  }
  .gb-br b {
    min-width: 3.2em;
    text-align: right;
    font-weight: 600;
    color: var(--text);
  }
  .gb-br-jed {
    color: var(--text-faint);
    font-size: 12px;
  }
  .gb-krivulja {
    fill: none;
    stroke: var(--c);
    stroke-width: 2.6;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .gb-krivulja.sjena {
    stroke-width: 2;
    opacity: 0.25;
  }
  .gb-povrsina {
    fill: color-mix(in srgb, var(--c) 20%, transparent);
    stroke: none;
  }
  .gb-povrsina-t {
    fill: var(--text);
    font: 600 12px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .gb-kursor {
    stroke: var(--text-dim);
    stroke-width: 1.2;
    stroke-dasharray: 4 3;
  }
  .gb-kursor-t {
    fill: var(--c);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .gb-oznaka-t {
    fill: var(--text-dim);
  }
  .gb-oznaka-t.ok {
    fill: var(--success);
  }
  .gb-klizaci {
    display: grid;
    gap: 6px;
    max-width: 460px;
    margin: 12px auto 4px;
  }
  .gb-klizac {
    display: grid;
    grid-template-columns: minmax(90px, auto) 1fr 76px;
    align-items: center;
    gap: 10px;
    font-size: 14px;
  }
  .gb-klizac label {
    color: var(--text-dim);
  }
  .gb-klizac input[type="range"] {
    width: 100%;
    margin: 0;
    height: 30px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .gb-kl-vr {
    text-align: right;
    color: var(--text);
    white-space: nowrap;
  }
  .gb-biljeske {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
  }
  .gb-biljeske .btn svg {
    width: 13px;
    height: 13px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }
  .gb-chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 4px 4px 4px 10px;
    border: 1px solid var(--primary-border);
    border-radius: var(--r-pill);
    background: var(--primary-dim);
    font-size: 13px;
    color: var(--text);
  }
  .gb-chip.ok {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 12%, transparent);
    padding-right: 10px;
  }
  .gb-chip-x {
    width: 26px;
    height: 26px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--text-dim);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
  }
  .gb-chip-x:hover {
    background: var(--bg-hover);
    color: var(--text);
  }
  .gb-prazno {
    font-size: 12.5px;
    color: var(--text-faint);
  }
  @media (max-width: 420px) {
    .gb-klizac {
      grid-template-columns: 1fr 70px;
    }
    .gb-klizac label {
      grid-column: 1 / -1;
      margin-bottom: -6px;
    }
    .gb-br {
      padding: 4px 8px;
      font-size: 12.5px;
    }
    .gb-red-ime {
      min-width: 0;
      width: 100%;
      justify-content: center;
    }
  }
</style>
