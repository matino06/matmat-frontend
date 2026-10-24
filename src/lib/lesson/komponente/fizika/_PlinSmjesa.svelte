<script>
  // plin_posuda, smjesa plinova (kemija): čvrsta boca s česticama više plinova (svaki svojom bojom, broj razmjeran
  // množini), manometar i stupac ukupnog tlaka podijeljen na parcijalne tlakove. Brojeve računa
  // katalog/fizika/_smjesa.js; ovdje se samo crta i animira. U istraživanju ventil mijenja množinu jednog plina; u
  // „Tvoj red“ widget ne pokazuje izračunate udjele ni tlakove (ni stupac, ni omjer čestica kad on nije zadan) dok
  // učenik ne provjeri.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Formula from "../kemija/Formula.svelte";
  import { formatNumber, formatSci, isNum } from "$lib/lesson/core/number.js";
  import { KONSTANTE } from "$lib/lesson/katalog/kemija/_tablice.js";
  import { formulaZapis } from "$lib/lesson/katalog/kemija/mol_racun.js";
  import {
    stanjeSmjese,
    trazeni,
    vrijednostTrazenog,
    jedinicaTrazenog,
    praviloTrazenog,
    zapisZadanog,
    rasponPlina,
    kontroleSmjese,
  } from "$lib/lesson/katalog/fizika/_smjesa.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const istrazi = $derived(spec.nacin === "istrazi");
  const gotovo = $derived(pokazi || !!ishod?.tocno);
  const sm = $derived(spec.smjesa);
  const uid = Math.random().toString(36).slice(2, 8);
  const BOJE = ["var(--primary)", "var(--warn)", "var(--lx-water)", "var(--text-dim)"];

  // ── ventili (istraživanje) ──
  const st0 = untrack(() => stanjeSmjese(spec));
  const kontrole = $derived(kontroleSmjese(spec));
  let kontrola = $state(
    untrack(() => Object.fromEntries(st0.plinovi.map((g) => [g.formula, g.n ?? 0]))),
  );
  const nIzKlizaca = $derived(
    Object.fromEntries(Object.entries(kontrola).map(([f, n]) => [f, Number(n)])),
  );
  const st = $derived(istrazi ? stanjeSmjese(spec, { n: nIzKlizaca }) : stanjeSmjese(spec));
  const raspon = (f) => rasponPlina(spec, f);
  const korakKlizaca = (f) => {
    const [a, b] = raspon(f);
    const k = (b - a) / 100;
    const p = 10 ** Math.floor(Math.log10(k));
    return [1, 2, 5, 10].map((x) => x * p).find((x) => x >= k) ?? k;
  };
  function ispocetka() {
    kontrola = Object.fromEntries(st0.plinovi.map((g) => [g.formula, g.n ?? 0]));
  }

  // ── mjerila ──
  const nNajvise = $derived(
    st0.plinovi.map((g) => (kontrole.includes(g.formula) ? raspon(g.formula)[1] : (g.n ?? 0))),
  );
  const pMax = $derived.by(() => {
    if (istrazi) {
      const najvise = stanjeSmjese(spec, {
        n: Object.fromEntries(st0.plinovi.map((g, i) => [g.formula, nNajvise[i]])),
      });
      return (najvise.p || 1) * 1.1;
    }
    return (st0.p || 1) * 1.2;
  });
  // u „Tvoj red“ omjer čestica smije se vidjeti samo kad je zadan (n, x ili p svakog plina); iz masa ili za plin
  // bez podatka on je dio odgovora
  const omjerZadan = st0.plinovi.every((g) => ["n", "x", "p"].includes(g.zadano));
  const skrijOmjer = $derived(!istrazi && !gotovo && !omjerZadan);
  const MAXP = 64;
  const brojCestica = $derived.by(() => {
    if (istrazi) {
      const K = 56 / Math.max(1e-12, nNajvise.reduce((a, b) => a + b, 0));
      return st.plinovi.map((g) => (g.n > 0 ? Math.max(1, Math.round(K * g.n)) : 0));
    }
    return st0.plinovi.map((g) => (g.x > 0 ? Math.max(1, Math.round(48 * g.x)) : 0));
  });
  const Mmin = $derived(Math.min(...st0.plinovi.map((g) => g.M)));

  // ── geometrija ──
  const VB = { W: 360, H: 232 };
  const U = { l: 78, r: 222, t: 34, b: 204 };
  const CX = (U.l + U.r) / 2;
  const R_C = 3;
  const cijevY = (k) => U.b - 22 - 30 * k;
  const cijevi = $derived(
    st0.plinovi.map((g, i) => ({ i, g })).filter((x) => kontrole.includes(x.g.formula)),
  );
  const cijevOd = (i) => {
    const k = cijevi.findIndex((c) => c.i === i);
    return k < 0 ? null : cijevY(k);
  };
  const MANO = { x: 262, y: 66, r: 22 };
  const STUPAC = { x: 300, w: 34, b: U.b, h: 150 };
  const r1 = (n) => Math.round(n * 10) / 10;
  const kutKazaljke = $derived(
    -120 + 240 * Math.min(1, isNum(st.p) ? st.p / pMax : 0.5),
  );
  const pokaziStupac = $derived((istrazi || gotovo) && isNum(st.p) && st.p > 0);
  const segmenti = $derived.by(() => {
    let y = STUPAC.b;
    return st.plinovi.map((g, i) => {
      const h = isNum(g.p) ? (Math.max(0, g.p) / pMax) * STUPAC.h : 0;
      y -= h;
      return { i, y, h };
    });
  });

  // ── čestice (izravno u DOM-u, bez Svelteove reaktivnosti po sličici) ──
  const CESTICE = Array.from({ length: MAXP }, (_, i) => i);
  let svgEl = $state();
  let el = [];
  let cestice = [];
  let vidljiv = true;
  let rafId = 0;
  let zadnje = 0;
  function maxwell() {
    const g = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
    return Math.sqrt((g() ** 2 + g() ** 2 + g() ** 2) / 3);
  }
  function nova(g, izCijevi) {
    const a = Math.random() * Math.PI * 2;
    const y = cijevOd(g);
    const c =
      izCijevi && y != null
        ? { x: U.l + 4, y, dx: 1, dy: (Math.random() - 0.5) * 0.6 }
        : {
            x: U.l + 5 + Math.random() * (U.r - U.l - 10),
            y: U.t + 5 + Math.random() * (U.b - U.t - 10),
            dx: Math.cos(a),
            dy: Math.sin(a),
          };
    return { ...c, g, f: maxwell(), izlazi: false, nestalo: false, alfa: 1, boja: "" };
  }
  function pripremi() {
    cestice = [];
    brojCestica.forEach((b, g) => {
      for (let i = 0; i < b && cestice.length < MAXP; i++) cestice.push(nova(g, false));
    });
    while (cestice.length < MAXP) cestice.push({ ...nova(0, false), nestalo: true, g: -1 });
  }
  function korak(t) {
    const dt = Math.min(0.05, zadnje ? (t - zadnje) / 1000 : 0);
    zadnje = t;
    const mirno = prefersReducedMotion.current;
    // ventil: višak čestica plina izlazi kroz njegovu cijev, manjak ulazi
    brojCestica.forEach((cilj, g) => {
      const aktivne = cestice.filter((c) => c.g === g && !c.nestalo && !c.izlazi);
      if (aktivne.length > cilj) aktivne.slice(cilj).forEach((c) => (c.izlazi = true));
      else if (aktivne.length < cilj) {
        let treba = cilj - aktivne.length;
        for (const c of cestice) {
          if (!treba) break;
          if (c.nestalo) {
            Object.assign(c, nova(g, !mirno));
            treba--;
          }
        }
      }
    });
    for (let i = 0; i < cestice.length; i++) {
      const c = cestice[i];
      const e = el[i];
      if (!e) continue;
      if (c.nestalo) {
        e.style.display = "none";
        continue;
      }
      const v = 110 * Math.sqrt(Mmin / (st0.plinovi[c.g]?.M ?? Mmin));
      if (c.izlazi) {
        const y = cijevOd(c.g);
        const tx = U.l - 44;
        const ty = y ?? U.t;
        const d = Math.hypot(tx - c.x, ty - c.y) || 1;
        const s = Math.max(v, 90) * dt * 1.2;
        c.x += ((tx - c.x) / d) * s;
        c.y += ((ty - c.y) / d) * s;
        if (c.x < U.l) c.alfa = Math.max(0, 1 - (U.l - c.x) / 40);
        if (mirno || y == null || c.alfa <= 0.02) {
          c.nestalo = true;
          e.style.display = "none";
          continue;
        }
      } else if (!mirno) {
        c.x += c.dx * c.f * v * dt;
        c.y += c.dy * c.f * v * dt;
        if (c.x < U.l + R_C) [c.x, c.dx] = [U.l + R_C, Math.abs(c.dx)];
        if (c.x > U.r - R_C) [c.x, c.dx] = [U.r - R_C, -Math.abs(c.dx)];
        if (c.y > U.b - R_C) [c.y, c.dy] = [U.b - R_C, -Math.abs(c.dy)];
        if (c.y < U.t + R_C) [c.y, c.dy] = [U.t + R_C, Math.abs(c.dy)];
      }
      const boja = skrijOmjer ? "var(--text-faint)" : BOJE[c.g % BOJE.length];
      if (c.boja !== boja) {
        e.style.fill = boja;
        c.boja = boja;
      }
      e.style.display = "";
      e.setAttribute("cx", r1(c.x));
      e.setAttribute("cy", r1(c.y));
      e.style.opacity = c.alfa;
    }
    rafId = vidljiv && !prefersReducedMotion.current ? requestAnimationFrame(korak) : 0;
  }
  function pokreni() {
    if (rafId) return;
    zadnje = 0;
    rafId = requestAnimationFrame(korak);
  }
  onMount(() => {
    el = [...svgEl.querySelectorAll(".ps-cestica")];
    pripremi();
    korak(0);
    const io = new IntersectionObserver(([e]) => {
      vidljiv = e.isIntersecting;
      if (vidljiv) pokreni();
    });
    io.observe(svgEl);
    pokreni();
    return () => {
      io.disconnect();
      cancelAnimationFrame(rafId);
      rafId = 0;
    };
  });
  $effect(() => {
    void brojCestica;
    void skrijOmjer;
    if (prefersReducedMotion.current) untrack(() => korak(performance.now()));
    else untrack(pokreni);
  });

  // ── tablica ──
  const koraci = $derived(trazeni(spec));
  const jed = $derived(st.jedinice);
  // traži li se veličina q za plin f (f = null: za cijelu smjesu)
  const pita = (q, f) =>
    koraci.some((t) => t.velicina === q && (f == null ? t.plin == null : t.plin != null && formulaZapis(t.plin) === f));
  const stupci = $derived.by(() => {
    const z = st0.plinovi.map((g) => g.zadano);
    const out = [];
    if (z.includes("m")) out.push("m");
    // n iz mase je međukorak: stupac se pojavi tek nakon provjere
    if (istrazi || z.includes("n") || koraci.some((t) => t.velicina === "n") || (gotovo && st.plinovi.every((g) => isNum(g.n))))
      out.push("n");
    if (istrazi || z.includes("x") || koraci.some((t) => t.velicina === "x") || gotovo) out.push("x");
    if (istrazi || z.includes("p") || koraci.some((t) => t.velicina === "p") || isNum(sm.p) || (gotovo && isNum(st.p)))
      out.push("p");
    return out;
  });
  const ZAGLAVLJE = $derived({ m: "m / g", n: "n / mol", x: "x", p: `p / ${jed.p}` });
  // izračunate vrijednosti u tablici: tri značajne znamenke s nulama na kraju (0,150 mol, 6,30 g), kao u zadatku
  function znacajne(v) {
    if (v === 0) return "0";
    const e = Math.floor(Math.log10(Math.abs(Number(v.toPrecision(3)))));
    if (e < -3 || e >= 6) return formatSci(v);
    return v.toFixed(Math.max(0, 2 - e)).replace("-", "−").replace(".", ",");
  }
  const broj = (q, v) =>
    !isNum(v) ? "—" : q === "x" ? formatNumber(Number(v.toPrecision(3))) : znacajne(v);
  // ćelija: {t: tekst, k: "zadano" | "pitanje" | "izracunato" | "odgovor" | "prazno"}
  function celija(i, q) {
    const g = i == null ? null : st.plinovi[i];
    const gs = i == null ? null : sm.plinovi[i];
    if (g && g.zadano === q && !istrazi) return { t: zapisZadanog(gs, q), k: "zadano" };
    if (!g && q === "p" && isNum(sm.p)) return { t: sm.zapis?.p ?? formatSci(sm.p), k: "zadano" };
    if (!g && q === "x") return istrazi || gotovo ? { t: "1", k: "izracunato" } : { t: "", k: "prazno" };
    const v = g ? g[q] : q === "m" ? (st.plinovi.every((h) => isNum(h.m)) ? st.plinovi.reduce((a, h) => a + h.m, 0) : null) : st[q];
    const trazi = pita(q, g?.formula);
    if (istrazi) return { t: q === "x" && !(st.n > 0) ? "—" : broj(q, v), k: "izracunato" };
    if (!gotovo) return trazi ? { t: "?", k: "pitanje" } : { t: "", k: "prazno" };
    return isNum(v) ? { t: broj(q, v), k: trazi ? "odgovor" : "izracunato" } : { t: "", k: "prazno" };
  }

  // uvjeti iz zadatka, kako ih piše tekst
  const uvjeti = $derived(
    [
      isNum(sm.V) ? `V = ${sm.zapis?.V ?? formatSci(sm.V)} ${jed.V}` : null,
      isNum(sm.t) ? `t = ${sm.zapis?.t ?? formatNumber(sm.t)} °C` : null,
      isNum(sm.T) ? `T = ${sm.zapis?.T ?? formatNumber(sm.T)} K` : null,
    ].filter(Boolean),
  );
  const iznosR = KONSTANTE.R.zapis;
  const mase = st0.plinovi.filter((g) => g.zadano === "m");
  const pokaziPravila = $derived(!!spec.operacije || gotovo);

  // ── odgovor ──
  let unosi = $state(untrack(() => trazeni(spec).map(() => "")));
  const potpun = $derived(unosi.every((v) => String(v).trim()));
  function predaj(e) {
    e.preventDefault();
    if (!locked && potpun) onodgovor($state.snapshot(unosi));
  }
  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      unosi = koraci.map((t) => {
        const v = vrijednostTrazenog(st0, t);
        return t.velicina === "x" ? formatNumber(Number(v.toPrecision(3))) : formatSci(v);
      });
    });
  });
  const ok = (i) => !!ishod?.tocno || pokazi || (ishod != null && ishod.praznina > i);
  const bad = (i) => ishod != null && !ishod.tocno && ishod.praznina === i && !ishod.prazno;
  const plinKoraka = (t) => (t.plin != null ? formulaZapis(t.plin) : null);
</script>

{#if istrazi}
  <div class="ps-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure ps">
  <svg bind:this={svgEl} viewBox="0 0 {VB.W} {VB.H}" role="img" aria-label="Boca sa smjesom plinova: {st.plinovi.map((g) => g.formula).join(', ')}">
    <!-- cijevi s ventilima (istraživanje) -->
    {#each cijevi as c (c.i)}
      {@const y = cijevOd(c.i)}
      <path class="ps-stijenka ps-cijev" d="M{U.l - 46},{y - 4} H{U.l} M{U.l - 46},{y + 4} H{U.l}" />
      <circle class="ps-ventil" cx={U.l - 24} cy={y} r="7" style:stroke={BOJE[c.i % BOJE.length]} />
    {/each}
    <!-- boca -->
    <rect class="ps-plin" x={U.l} y={U.t} width={U.r - U.l} height={U.b - U.t} rx="8"
      style:fill-opacity={0.04 + 0.14 * Math.min(1, isNum(st.p) ? st.p / pMax : 0.5)} />
    {#each CESTICE as i (i)}
      <circle class="ps-cestica" r={R_C} style:display="none" />
    {/each}
    <rect class="ps-stijenka" x={U.l} y={U.t} width={U.r - U.l} height={U.b - U.t} rx="8" />
    <rect class="ps-cep" x={CX - 16} y={U.t - 12} width="32" height="12" rx="2" />
    <!-- manometar: ukupni tlak -->
    <path class="ps-stijenka ps-cijev" d="M{U.r},{MANO.y + 42} H{MANO.x} V{MANO.y + MANO.r}" />
    <circle class="ps-manometar" cx={MANO.x} cy={MANO.y} r={MANO.r} />
    {#each [-120, -60, 0, 60, 120] as a (a)}
      <line class="ps-crtica"
        x1={r1(MANO.x + 17 * Math.sin((a * Math.PI) / 180))} y1={r1(MANO.y - 17 * Math.cos((a * Math.PI) / 180))}
        x2={r1(MANO.x + 21 * Math.sin((a * Math.PI) / 180))} y2={r1(MANO.y - 21 * Math.cos((a * Math.PI) / 180))} />
    {/each}
    <line class="ps-kazaljka" x1={MANO.x} y1={MANO.y}
      x2={r1(MANO.x + 16 * Math.sin((kutKazaljke * Math.PI) / 180))} y2={r1(MANO.y - 16 * Math.cos((kutKazaljke * Math.PI) / 180))} />
    <circle class="ps-os" cx={MANO.x} cy={MANO.y} r="2.5" />
    <text class="ps-mala" x={MANO.x} y={MANO.y + 13} text-anchor="middle">p</text>
    <!-- stupac tlaka: zbroj parcijalnih tlakova -->
    <rect class="ps-stupac-okvir" x={STUPAC.x} y={STUPAC.b - STUPAC.h} width={STUPAC.w} height={STUPAC.h} />
    {#if pokaziStupac}
      {#each segmenti as s (s.i)}
        {#if s.h > 0.2}
          <rect class="ps-segment" x={STUPAC.x} y={r1(s.y)} width={STUPAC.w} height={r1(s.h)} style:fill={BOJE[s.i % BOJE.length]} />
        {/if}
      {/each}
    {:else}
      <text class="ps-upitnik" x={STUPAC.x + STUPAC.w / 2} y={STUPAC.b - STUPAC.h / 2 + 6} text-anchor="middle">?</text>
    {/if}
    <text class="ps-mala" x={STUPAC.x + STUPAC.w / 2} y={STUPAC.b + 14} text-anchor="middle">p = zbroj</text>
    <text class="ps-mala" x={CX} y={U.b + 16} text-anchor="middle">{istrazi ? "čvrsta boca: V i T stalni" : skrijOmjer ? "boje čestica: nakon provjere" : "boca"}</text>
  </svg>
</figure>

{#if uvjeti.length}
  <div class="ps-uvjeti">
    {#each uvjeti as u (u)}<span class="ps-chip"><Formula f={u} /></span>{/each}
  </div>
{/if}

<div class="ps-tablica-omot">
  <table class="ps-tablica" aria-live="polite">
    <thead>
      <tr>
        <th scope="col">plin</th>
        {#each stupci as q (q)}<th scope="col"><i>{ZAGLAVLJE[q].split(" ")[0]}</i>{ZAGLAVLJE[q].slice(1)}</th>{/each}
      </tr>
    </thead>
    <tbody>
      {#each st.plinovi as g, i (g.formula)}
        <tr>
          <th scope="row">
            <span class="ps-boja" style:background={BOJE[i % BOJE.length]}></span>
            <Formula f={g.formula} />
          </th>
          {#each stupci as q (q)}
            {@const c = celija(i, q)}
            <td class={c.k}><Formula f={c.t} /></td>
          {/each}
        </tr>
      {/each}
      <tr class="ps-ukupno">
        <th scope="row">ukupno</th>
        {#each stupci as q (q)}
          {@const c = celija(null, q)}
          <td class={c.k}><Formula f={c.t} /></td>
        {/each}
      </tr>
    </tbody>
  </table>
</div>

{#if istrazi}
  <div class="ps-klizaci">
    {#each cijevi as c (c.i)}
      {@const f = c.g.formula}
      <div class="ps-klizac">
        <div class="ps-klizac-glava">
          <label for="ps-{uid}-{c.i}"><span class="ps-boja" style:background={BOJE[c.i % BOJE.length]}></span>ventil: <i>n</i>(<Formula {f} />)</label>
          <output for="ps-{uid}-{c.i}">{formatSci(Number(kontrola[f]) || 0)}&nbsp;mol</output>
        </div>
        <input id="ps-{uid}-{c.i}" type="range" min={raspon(f)[0]} max={raspon(f)[1]} step={korakKlizaca(f)} bind:value={kontrola[f]} />
      </div>
    {/each}
  </div>
  <div class="lx-actions">
    <button type="button" class="btn btn-ghost" onclick={ispocetka}>Ispočetka</button>
  </div>
{:else}
  <form class="ps-odgovor" onsubmit={predaj}>
    {#each koraci as t, i (i)}
      {@const f = plinKoraka(t)}
      {@const u = jedinicaTrazenog(spec, t)}
      <div class="ps-red" class:ok={ok(i)} class:bad={bad(i)}>
        <label class="ps-oznaka" for="ps-{uid}-u{i}">
          {#if t.velicina === "M" || t.velicina === "Mr"}<i>M</i>{#if t.velicina === "Mr"}<sub>r</sub>{/if}(smjese){:else}<i>{t.velicina}</i>{#if f}(<Formula {f} />){/if}{/if}&nbsp;=
        </label>
        <span class="ps-unos">
          <input id="ps-{uid}-u{i}" class="inp ps-inp" class:ok={ok(i)} class:bad={bad(i)} inputmode="decimal" autocomplete="off" placeholder="?" disabled={locked} bind:value={unosi[i]} />
          {#if u}<span class="lx-unit"><Formula f={u} /></span>{/if}
        </span>
        {#if pokaziPravila}<span class="ps-pravilo">{#each praviloTrazenog(spec, t).split("Mr") as dio, k (k)}{#if k}M<sub>r</sub>{/if}<Formula f={dio} />{/each}</span>{/if}
      </div>
    {/each}
    <div class="ps-akcija">
      <button class="btn btn-primary" type="submit" disabled={locked || !potpun}>Provjeri</button>
      {#if !locked && koraci.some((t) => t.velicina === "x")}<span class="ps-mala-html">Udio: npr. 0,25 ili 25 %.</span>{/if}
    </div>
  </form>
{/if}

{#if pokaziPravila && (uvjeti.length || mase.length)}
  <p class="ps-konst">
    {#if uvjeti.length}Iz tablica: <span class="ps-nw"><i>R</i> = <Formula f={iznosR} /></span>{#if isNum(sm.t)}, <span class="ps-nw"><i>T</i> = <i>t</i> + 273 K</span>{/if}{#if mase.length}. {/if}{/if}{#if mase.length}Iz Ar s lista:{#each mase as g, k (g.formula)}{k ? "," : ""} <span class="ps-nw"><i>M</i>(<Formula f={g.formula} />) = {g.M.toFixed(2).replace(".", ",")} g/mol</span>{/each}{/if}
  </p>
{/if}

<style>
  .ps-tekst {
    margin-bottom: 10px;
  }
  .ps {
    margin-bottom: 4px;
  }
  .ps svg {
    overflow: visible;
  }
  .ps-mala {
    font: 400 11px var(--font-sans);
    fill: var(--text-faint);
  }
  .ps-upitnik {
    font: 600 16px var(--font-sans);
    fill: var(--text-faint);
  }
  .ps-plin {
    fill: var(--primary);
    transition: fill-opacity 0.3s;
  }
  .ps-stijenka {
    fill: none;
    stroke: var(--text);
    stroke-width: 3;
    stroke-linejoin: round;
  }
  .ps-cijev {
    stroke-width: 2;
  }
  .ps-cep {
    fill: color-mix(in srgb, var(--text) 55%, var(--bg-elev));
    stroke: var(--text);
    stroke-width: 1.5;
  }
  .ps-ventil {
    fill: var(--bg-elev);
    stroke-width: 3;
  }
  .ps-manometar {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 2;
  }
  .ps-crtica {
    stroke: var(--text-dim);
    stroke-width: 1.5;
  }
  .ps-kazaljka {
    stroke: var(--danger);
    stroke-width: 2.5;
    stroke-linecap: round;
    transition: all 0.3s;
  }
  .ps-os {
    fill: var(--text);
  }
  .ps-stupac-okvir {
    fill: var(--bg-elev);
    stroke: var(--border-strong);
    stroke-width: 1.5;
  }
  .ps-segment {
    stroke: var(--bg);
    stroke-width: 1;
    opacity: 0.9;
    transition:
      y 0.25s,
      height 0.25s;
  }
  .ps-uvjeti {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin: 0 auto 8px;
  }
  .ps-chip {
    display: inline-block;
    padding: 2px 9px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    font-size: 13px;
    color: var(--text-dim);
    white-space: nowrap;
  }
  .ps-tablica-omot {
    max-width: 440px;
    margin: 0 auto;
    overflow-x: auto;
  }
  .ps-tablica {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-sans);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }
  .ps-tablica th,
  .ps-tablica td {
    padding: 5px 6px;
    border-bottom: 1px solid var(--border);
    text-align: right;
    white-space: nowrap;
  }
  .ps-tablica thead th {
    font-weight: 500;
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .ps-tablica th[scope="row"],
  .ps-tablica thead th:first-child {
    text-align: left;
    font-weight: 600;
  }
  .ps-ukupno th,
  .ps-ukupno td {
    border-bottom: 0;
    border-top: 1.5px solid var(--border-strong);
  }
  .ps-ukupno th {
    font-weight: 500;
    color: var(--text-dim);
  }
  .ps-tablica td.zadano {
    color: var(--text);
  }
  .ps-tablica td.pitanje {
    color: var(--lx-turn);
    font-weight: 700;
  }
  .ps-tablica td.izracunato {
    color: var(--text-dim);
  }
  .ps-tablica td.odgovor {
    color: var(--success);
    font-weight: 700;
  }
  .ps-boja {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: 0;
  }
  .ps-klizaci {
    display: grid;
    gap: 12px;
    max-width: 440px;
    margin: 12px auto 0;
  }
  .ps-klizac-glava {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 2px;
  }
  .ps-klizac-glava label {
    color: var(--text-dim);
    font-size: 14px;
  }
  .ps-klizac-glava output {
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
  }
  .ps-klizac input[type="range"] {
    width: 100%;
    margin: 0;
    height: 28px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .ps-odgovor {
    display: grid;
    gap: 8px;
    margin-top: 12px;
  }
  .ps-red {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .ps-red.ok {
    border-color: var(--lx-ok);
  }
  .ps-red.bad {
    border-color: var(--lx-bad);
  }
  .ps-oznaka {
    font-family: var(--font-sans);
    font-size: 16px;
    white-space: nowrap;
    min-width: 76px;
  }
  .ps-unos {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .ps-inp {
    width: 130px;
    height: var(--lx-control);
    padding: 6px 8px;
    text-align: right;
    font-family: var(--font-sans);
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
  }
  .ps-pravilo {
    flex-basis: 100%;
    font-size: 13px;
    color: var(--primary);
    font-weight: 600;
  }
  .ps-akcija {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
  }
  .ps-akcija .btn-primary {
    height: var(--lx-control);
    padding: 0 16px;
    font-size: 14px;
    border-radius: var(--r-md);
  }
  .ps-mala-html {
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .ps-konst {
    margin: 10px 0 0;
    font-size: 12.5px;
    color: var(--text-faint);
  }
  .ps-nw {
    white-space: nowrap;
  }
</style>
