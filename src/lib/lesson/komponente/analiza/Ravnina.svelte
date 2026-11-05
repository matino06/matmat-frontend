<script>
  // ravnina: (Gaussova) ravnina s mrežom, kružnicama, zrakama, pravcima, točkama i osjenčanim skupom S. Sve izračune
  // (područje i rubovi S, sjecišta, čvorovi za postavljanje, pripadnost) radi katalog/analiza/ravnina.js; ovdje se crta.
  // „postavi“: dodir postavlja ili uklanja točku na najbližem čvoru (mreža ili sjecište kružnice i zrake); tipkovnicom
  // strelice biraju čvor, Enter ili razmak postavlja. „pripada“: dodir točke ili gumba ispod crteža označava točku.
  // U „Tvoj red“ S se ne crta dok odgovor nije otkriven (provjera točna, „Pokaži točan odgovor“ ili zaključano).
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import { formatNumber } from "../../core/number.js";
  import { okvir, crtezSkupa, cvorovi, texCvora, texTocke, tocka, pripadaju, texOznake } from "$lib/lesson/katalog/analiza/ravnina.js";
  import { realni } from "$lib/lesson/katalog/analiza/ravnina_kompleksno.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const s = untrack(() => spec);
  const nacin = s.nacin;
  const uid = Math.random().toString(36).slice(2, 8);
  const kompl = !!s.kompleksno;
  const o = okvir(s);
  const { W, H, L, R, T, B, X, Y } = o;
  const [x0, x1, y0, y1] = [s.x[0], s.x[1], s.y[0], s.y[1]];
  const broj = (v) => (typeof v === "number" ? v : realni(String(v)));

  // ── mreža i osi (kao graf_funkcije) ──
  const k = broj(s.korak ?? 1) || 1;
  function crtice(a, b) {
    const out = [];
    for (let i = Math.ceil(a / k - 1e-9); i * k <= b + 1e-9 && out.length < 60; i++) out.push(i);
    return out;
  }
  const tx = crtice(x0, x1);
  const ty = crtice(y0, y1);
  const svakaX = Math.ceil(tx.length / 16);
  const svakaY = Math.ceil(ty.length / 12);
  const ox = x0 <= 0 && x1 >= 0 ? 0 : x0;
  const oy = y0 <= 0 && y1 >= 0 ? 0 : y0;
  const osX = s.os_x ?? (kompl ? "Re" : "x");
  const osY = s.os_y ?? (kompl ? "Im" : "y");

  // ── zadani crtež ──
  const kruznice = (s.kruznice ?? []).map((kr) => ({ c: tocka(kr.sredina), r: broj(kr.r) * o.mjerilo, isprekidano: kr.isprekidano })).filter((kr) => kr.c && kr.r > 0);
  // koliko daleko od p u smjeru d do ruba crteža
  function doRuba(p, d) {
    let t = Infinity;
    if (d[0] > 1e-12) t = Math.min(t, (x1 - p[0]) / d[0]);
    if (d[0] < -1e-12) t = Math.min(t, (x0 - p[0]) / d[0]);
    if (d[1] > 1e-12) t = Math.min(t, (y1 - p[1]) / d[1]);
    if (d[1] < -1e-12) t = Math.min(t, (y0 - p[1]) / d[1]);
    return Math.max(0, t);
  }
  const duz = (a, b) => ({ x1: X(a[0]), y1: Y(a[1]), x2: X(b[0]), y2: Y(b[1]) });
  const zrake = (s.zrake ?? [])
    .map((z) => {
      const p = tocka(z.od ?? 0);
      const f = broj(z.kut);
      if (!p || f == null) return null;
      const d = [Math.cos(f), Math.sin(f)];
      const t = doRuba(p, d);
      return { ...duz(p, [p[0] + t * d[0], p[1] + t * d[1]]), isprekidano: z.isprekidano };
    })
    .filter(Boolean);
  const pravci = (s.pravci ?? [])
    .map((pr) => {
      if (pr.x != null) return { ...duz([broj(pr.x), y0], [broj(pr.x), y1]), isprekidano: pr.isprekidano };
      if (pr.y != null) return { ...duz([x0, broj(pr.y)], [x1, broj(pr.y)]), isprekidano: pr.isprekidano };
      const [A, Bt] = (pr.kroz ?? []).map(tocka);
      if (!A || !Bt) return null;
      const n = Math.hypot(Bt[0] - A[0], Bt[1] - A[1]) || 1;
      const d = [(Bt[0] - A[0]) / n, (Bt[1] - A[1]) / n];
      const [tp, tm] = [doRuba(A, d), doRuba(A, [-d[0], -d[1]])];
      return { ...duz([A[0] - tm * d[0], A[1] - tm * d[1]], [A[0] + tp * d[0], A[1] + tp * d[1]]), isprekidano: pr.isprekidano };
    })
    .filter(Boolean);
  const tocke = (s.tocke ?? []).map((t, i) => {
    const p = tocka(t);
    return { i, p, px: p ? X(p[0]) : 0, py: p ? Y(p[1]) : 0, oznaka: t?.oznaka, prazna: t?.prazna };
  });

  // ── skup S ──
  const skup = crtezSkupa(s, o);
  const uS = nacin === "pripada" ? pripadaju(s) : [];
  const imaPunih = !!skup?.rubovi.some((r) => r.puna);
  const imaIsprekidanih = !!skup?.rubovi.some((r) => !r.puna);

  // ── postavi ──
  const cv = nacin === "postavi" ? cvorovi(s).map((c) => ({ ...c, px: X(c.x), py: Y(c.y) })) : [];
  const ciljTocke = nacin === "postavi" ? (s.odgovor ?? []).map(tocka).filter(Boolean) : [];
  const nCilj = s.n === false ? null : (s.n ?? ciljTocke.length);
  const polarno = nacin === "postavi" && s.polarno ? s.polarno : null;
  const sredinaPol = polarno ? (tocka(polarno.sredina ?? 0) ?? [0, 0]) : null;
  const polKruznice = polarno ? [...new Set(cv.map((c) => c.r))].filter((r) => r > 0) : [];
  const polZrake = polarno ? [...new Map(cv.filter((c) => c.r > 0).map((c) => [c.m, c.kut])).values()] : [];
  const polMaks = Math.max(0, ...polKruznice);
  let postavljene = $state([]);
  // kursor tipkovnice: čvor najbliži središtu crteža
  let kursor = $state(
    cv.length
      ? cv.reduce((best, c, i) => (Math.hypot(c.px - (L + W - R) / 2, c.py - (T + H - B) / 2) < Math.hypot(cv[best].px - (L + W - R) / 2, cv[best].py - (T + H - B) / 2) ? i : best), 0)
      : 0,
  );
  let fokus = $state(false);

  // ── pripada ──
  let oznacene = $state([]);

  const zakljucano = $derived(locked || !!ishod?.tocno);
  const otkriveno = $derived(nacin === "prikaz" || pokazi || locked || !!ishod?.tocno);
  const vidiSkup = $derived(!!skup && otkriveno);

  function svgTocka(e) {
    const svg = e.currentTarget;
    const m = svg.getScreenCTM?.();
    if (!m) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(m.inverse());
    return [p.x, p.y];
  }
  function najblizi(popis, p, max) {
    let [best, d] = [-1, max];
    popis.forEach((c, i) => {
      const di = Math.hypot(c.px - p[0], c.py - p[1]);
      if (di < d) [best, d] = [i, di];
    });
    return best;
  }
  function prebaci(i) {
    if (zakljucano || i < 0) return;
    postavljene = postavljene.includes(i) ? postavljene.filter((j) => j !== i) : [...postavljene, i];
  }
  function oznaci(i) {
    if (zakljucano) return;
    oznacene = oznacene.includes(i) ? oznacene.filter((j) => j !== i) : [...oznacene, i];
  }
  function dodir(e) {
    if (zakljucano) return;
    const p = svgTocka(e);
    if (!p) return;
    if (nacin === "postavi") {
      const i = najblizi(cv, p, 30);
      if (i >= 0) {
        kursor = i;
        prebaci(i);
      }
    } else if (nacin === "pripada") {
      const i = najblizi(
        tocke.filter((t) => t.p),
        p,
        24,
      );
      if (i >= 0) oznaci(tocke.filter((t) => t.p)[i].i);
    }
  }
  // susjedni čvor u smjeru strelice: mreža po i/j, polarno po kutu (lijevo/desno) i polumjeru (gore/dolje)
  function susjed(i, tipka) {
    const c = cv[i];
    if (!c) return i;
    if (polarno) {
      const radijusi = [...new Set(cv.map((q) => q.ri))].sort((a, b) => a - b);
      const naR = (ri) => cv.map((q, j) => [q, j]).filter(([q]) => q.ri === ri);
      if (tipka === "ArrowRight" || tipka === "ArrowLeft") {
        const isti = naR(c.ri);
        const n = isti.length;
        const pos = isti.findIndex(([, j]) => j === i);
        return isti[(pos + (tipka === "ArrowRight" ? 1 : n - 1)) % n][1];
      }
      const ri = radijusi[radijusi.indexOf(c.ri) + (tipka === "ArrowUp" ? 1 : -1)];
      if (ri == null) return i;
      const kandidati = naR(ri);
      if (!kandidati.length) return i;
      // isti smjer (kut) na drugoj kružnici; za r = 0 jedini čvor
      const dk = (q) => Math.abs(Math.atan2(Math.sin(q.kut - c.kut), Math.cos(q.kut - c.kut)));
      return kandidati.reduce((a, b) => (dk(b[0]) < dk(a[0]) ? b : a))[1];
    }
    const [di, dj] = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[tipka];
    const j = cv.findIndex((q) => q.i === c.i + di && q.j === c.j + dj);
    return j >= 0 ? j : i;
  }
  function tipke(e) {
    if (nacin !== "postavi" || zakljucano) return;
    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      kursor = susjed(kursor, e.key);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      prebaci(kursor);
    }
  }

  // ── oznake na crtežu: kratki LaTeX u znakove, indeks i potencija kao manji tekst ──
  const GRCKA = { alpha: "α", beta: "β", gamma: "γ", varphi: "φ", phi: "φ", theta: "θ", pi: "π", omega: "ω", infty: "∞" };
  function bezDolara(t) {
    return String(t ?? "")
      .replace(/\$/g, "")
      .replace(/[₀-₉]+/g, (m) => `_{${[...m].map((c) => "₀₁₂₃₄₅₆₇₈₉".indexOf(c)).join("")}}`)
      .replace(/\\([A-Za-z]+)/g, (m, n) => GRCKA[n] ?? m)
      .replace(/\\(?:bar|overline)\{([^{}]*)\}/g, (_, a) => [...a].map((c) => `${c}̄`).join(""))
      .replace(/-/g, "−");
  }
  function dijelovi(t) {
    const out = [];
    let pomak = 0;
    for (const m of bezDolara(t).matchAll(/([_^])(?:\{([^{}]*)\}|(.))|([^_^]+)/g)) {
      const [tekst, v] = m[4] != null ? [m[4], 0] : [m[2] ?? m[3], m[1] === "_" ? 0.35 : -0.45];
      out.push({ t: tekst.replace(/[{}\\]/g, ""), dy: `${v - pomak}em`, malo: v !== 0 });
      pomak = v;
    }
    return out;
  }
  // oznaka gore desno od točke, ali ne preko ruba crteža
  const oznakaKod = (px, py) => ({ x: px > W - R - 34 ? px - 8 : px + 8, y: py < T + 14 ? py + 16 : py - 8, sidro: px > W - R - 34 ? "end" : "start" });

  const tekstTocke = (t) => (t.oznaka ? `${texOznake(t.oznaka)} = ${texTocke(s, t.p)}` : texTocke(s, t.p));
  const brojPostavljenih = $derived(postavljene.length);
  const opisKursora = $derived(nacin === "postavi" && fokus && cv[kursor] ? `Odabrano mjesto ${texCvora(s, cv[kursor]).replace(/\\[a-z]+|[{}]/g, " ")}${postavljene.includes(kursor) ? ", točka je postavljena" : ""}.` : "");
  const opisSlike =
    nacin === "postavi"
      ? `${kompl ? "Gaussova ravnina" : "Koordinatna ravnina"}: dodirni mjesto ili ga odaberi strelicama i pritisni Enter da postaviš ili ukloniš točku.`
      : `${kompl ? "Gaussova ravnina" : "Koordinatna ravnina"}, ${osX} od ${formatNumber(x0)} do ${formatNumber(x1)}, ${osY} od ${formatNumber(y0)} do ${formatNumber(y1)}${skup ? ", sa skupom S" : ""}.`;
</script>

{#snippet natpis(t)}{#each dijelovi(t) as d, i (i)}<tspan dy={d.dy} font-size={d.malo ? "0.72em" : null}>{d.t}</tspan>{/each}{/snippet}

{#if nacin === "prikaz"}
  <Md text={s.tekst} />
{:else}
  <div class="lx-question">
    <Md text={s.tekst} />
    <span class="lx-hint">
      {#if nacin === "postavi"}
        Dodirni {polarno ? "sjecište kružnice i zrake" : "čvor mreže"} da postaviš točku; ponovni dodir je uklanja.
      {:else}
        Dodirni točke koje pripadaju skupu.
      {/if}
    </span>
  </div>
{/if}

<div class="lx-figure rv" class:dobro={ishod?.tocno}>
  <!-- tipkovnica za postavljanje točaka je na samom crtežu (role="application"); u „pripada“ su gumbi ispod crteža -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <svg
    viewBox="0 0 {W} {H}"
    role={nacin === "postavi" ? "application" : "img"}
    aria-label={opisSlike}
    tabindex={nacin === "postavi" && !zakljucano ? 0 : undefined}
    class:interaktivno={nacin !== "prikaz" && !zakljucano}
    onclick={dodir}
    onkeydown={tipke}
    onfocus={() => (fokus = true)}
    onblur={() => (fokus = false)}
  >
    <defs>
      <clipPath id="rv-clip-{uid}"><rect x={L} y={T} width={W - L - R} height={H - T - B} /></clipPath>
    </defs>
    {#each tx as i (i)}<line class="rv-grid" x1={X(i * k)} y1={Y(y0)} x2={X(i * k)} y2={Y(y1)} />{/each}
    {#each ty as i (i)}<line class="rv-grid" x1={X(x0)} y1={Y(i * k)} x2={X(x1)} y2={Y(i * k)} />{/each}

    {#if vidiSkup}
      <g clip-path="url(#rv-clip-{uid})">
        {#if skup.podrucje}<g class="rv-podrucje"><path d={skup.podrucje} shape-rendering="crispEdges" /></g>{/if}
      </g>
    {/if}

    <line class="rv-axis" x1={X(x0)} y1={Y(oy)} x2={X(x1)} y2={Y(oy)} />
    <line class="rv-axis" x1={X(ox)} y1={Y(y0)} x2={X(ox)} y2={Y(y1)} />
    {#each tx as i, j (i)}
      {#if Math.abs(i * k - ox) > 1e-9 && j % svakaX === 0}<text class="rv-tick" x={X(i * k)} y={Y(oy) + 12} text-anchor="middle" dominant-baseline="middle">{formatNumber(Number((i * k).toPrecision(10)))}</text>{/if}
    {/each}
    {#each ty as i, j (i)}
      {#if Math.abs(i * k - oy) > 1e-9 && j % svakaY === 0}<text class="rv-tick" x={X(ox) - 6} y={Y(i * k)} text-anchor="end" dominant-baseline="middle">{formatNumber(Number((i * k).toPrecision(10)))}</text>{/if}
    {/each}
    <text class="rv-tick rv-os" x={X(x1) - 2} y={Y(oy) - 8} text-anchor="end">{@render natpis(osX)}</text>
    <text class="rv-tick rv-os" x={X(ox) + 7} y={Y(y1) + 10} text-anchor="start">{@render natpis(osY)}</text>

    <g clip-path="url(#rv-clip-{uid})">
      {#if polarno}
        {#each polKruznice as r (r)}<circle class="rv-vodilja" cx={X(sredinaPol[0])} cy={Y(sredinaPol[1])} r={r * o.mjerilo} />{/each}
        {#each polZrake as f, j (j)}<line class="rv-vodilja" x1={X(sredinaPol[0])} y1={Y(sredinaPol[1])} x2={X(sredinaPol[0] + polMaks * Math.cos(f))} y2={Y(sredinaPol[1] + polMaks * Math.sin(f))} />{/each}
      {/if}
      {#each kruznice as kr, j (j)}<circle class="rv-crta" class:isprekidano={kr.isprekidano} cx={X(kr.c[0])} cy={Y(kr.c[1])} r={kr.r} />{/each}
      {#each zrake as z, j (j)}<line class="rv-crta" class:isprekidano={z.isprekidano} x1={z.x1} y1={z.y1} x2={z.x2} y2={z.y2} />{/each}
      {#each pravci as p, j (j)}<line class="rv-crta" class:isprekidano={p.isprekidano} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} />{/each}
      {#if vidiSkup}
        {#each skup.rubovi as r, j (j)}<polyline class="rv-rub" class:isprekidano={!r.puna} points={r.tocke} />{/each}
        {#each skup.krivulje as kv, j (j)}<polyline class="rv-krivulja" points={kv} />{/each}
      {/if}
    </g>
    {#if vidiSkup}
      {#each skup.krajevi as kr, j (j)}<circle class="rv-kraj" class:puna={kr.puna} cx={kr.px} cy={kr.py} r="4" />{/each}
    {/if}

    {#if nacin === "postavi"}
      {#if polarno}
        {#each cv as c, j (j)}<circle class="rv-cvor" cx={c.px} cy={c.py} r="2.4" />{/each}
      {/if}
      {#if pokazi}
        {#each ciljTocke as p, j (j)}<circle class="rv-cilj" cx={X(p[0])} cy={Y(p[1])} r="9.5" />{/each}
      {/if}
      {#each postavljene as i (i)}<circle class="rv-postavljena" class:ok={ishod?.tocno} cx={cv[i].px} cy={cv[i].py} r="6.5" />{/each}
      {#if fokus && cv[kursor] && !zakljucano}<circle class="rv-kursor" cx={cv[kursor].px} cy={cv[kursor].py} r="12" />{/if}
    {/if}

    {#each tocke as t (t.i)}
      {#if t.p}
        {#if nacin === "pripada"}
          <circle class="rv-pt-izbor" class:sel={oznacene.includes(t.i)} cx={t.px} cy={t.py} r="6" />
        {:else}
          <circle class="rv-pt" class:prazna={t.prazna} cx={t.px} cy={t.py} r="4" />
        {/if}
        {#if t.oznaka}
          {@const z = oznakaKod(t.px, t.py)}
          <text class="rv-lbl" x={z.x} y={z.y} text-anchor={z.sidro}>{@render natpis(t.oznaka)}</text>
        {/if}
      {/if}
    {/each}
    <!-- točke skupa S (dvije jednakosti) iznad zadanih točaka: u „pripada“ se vide unutar kružića -->
    {#if vidiSkup}
      {#each skup.tocke as t, j (j)}<circle class="rv-skup-tocka" cx={t.px} cy={t.py} r={nacin === "pripada" ? 3.2 : 5.5} />{/each}
    {/if}
  </svg>

  {#if vidiSkup && (skup.podrucje || skup.krivulje.length || skup.tocke.length)}
    <div class="rv-legenda">
      <span><i class="rv-leg-s" class:crta={!skup.podrucje && skup.krivulje.length} class:tocka={!skup.podrucje && !skup.krivulje.length}></i>skup S</span>
      {#if imaPunih}<span><i class="rv-leg-puna"></i>rub pripada S</span>{/if}
      {#if imaIsprekidanih}<span><i class="rv-leg-isp"></i>rub ne pripada S</span>{/if}
    </div>
  {/if}
</div>

{#if nacin === "postavi"}
  <p class="sr-only" aria-live="polite">{opisKursora}</p>
  <div class="rv-status">
    Postavljeno: <b>{brojPostavljenih}{nCilj != null ? ` / ${nCilj}` : ""}</b>
  </div>
  {#if postavljene.length}
    <div class="rv-chips">
      {#each postavljene as i (i)}
        <button class="rv-chip" type="button" disabled={zakljucano} onclick={() => prebaci(i)} aria-label="Ukloni točku {texCvora(s, cv[i]).replace(/\\[a-z]+|[{}]/g, ' ')}">
          <Md text={`$${texCvora(s, cv[i])}$`} inline />{#if !zakljucano}<span class="rv-x" aria-hidden="true">×</span>{/if}
        </button>
      {/each}
    </div>
  {/if}
  <div class="lx-actions">
    <button class="btn btn-primary" type="button" disabled={zakljucano || !postavljene.length} onclick={() => onodgovor(postavljene.map((i) => [cv[i].x, cv[i].y]))}>Provjeri</button>
    {#if postavljene.length && !zakljucano}<button class="btn btn-quiet" type="button" onclick={() => (postavljene = [])}>Ukloni sve</button>{/if}
  </div>
{:else if nacin === "pripada"}
  <div class="rv-chips" role="group" aria-label="Točke: označi one koje pripadaju skupu">
    {#each tocke as t (t.i)}
      {#if t.p}
        <button class="rv-chip" class:sel={oznacene.includes(t.i)} type="button" aria-pressed={oznacene.includes(t.i)} disabled={zakljucano} onclick={() => oznaci(t.i)}>
          <span class="lx-mark box" aria-hidden="true">{oznacene.includes(t.i) ? "✓" : ""}</span>
          <Md text={`$${tekstTocke(t)}$`} inline />
          {#if otkriveno && (pokazi || ishod?.tocno)}<span class="rv-pripada" class:da={uS.includes(t.i)}>{uS.includes(t.i) ? "∈ S" : "∉ S"}</span>{/if}
        </button>
      {/if}
    {/each}
  </div>
  <div class="lx-actions">
    <button class="btn btn-primary" type="button" disabled={zakljucano} onclick={() => onodgovor([...oznacene].sort((a, b) => a - b))}>Provjeri</button>
  </div>
{/if}

<style>
  .lx-figure.rv {
    max-width: 480px;
  }
  .rv svg.interaktivno {
    cursor: pointer;
  }
  .rv svg:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: 6px;
  }
  .rv-grid {
    stroke: var(--border);
    stroke-width: 1;
  }
  .rv-axis {
    stroke: var(--text-dim);
    stroke-width: 1.4;
  }
  .rv-tick {
    fill: var(--text-faint);
    font: 11px var(--font-sans);
  }
  .rv-os {
    font-style: italic;
    font-size: 12px;
  }
  .rv-podrucje {
    opacity: 0.2;
  }
  .rv-podrucje path {
    fill: var(--primary);
  }
  .rv-rub {
    fill: none;
    stroke: var(--primary);
    stroke-width: 2.2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .rv-rub.isprekidano {
    stroke-dasharray: 7 5;
    stroke-linecap: butt;
  }
  .rv-krivulja {
    fill: none;
    stroke: var(--primary);
    stroke-width: 3.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .rv-kraj {
    fill: var(--bg-elev);
    stroke: var(--primary);
    stroke-width: 2.2;
  }
  .rv-kraj.puna {
    fill: var(--primary);
  }
  .rv-skup-tocka {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .rv-crta {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.6;
  }
  .rv-crta.isprekidano {
    stroke-dasharray: 6 4;
  }
  .rv-vodilja {
    fill: none;
    stroke: var(--border-strong);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .rv-cvor {
    fill: var(--text-faint);
  }
  .rv-postavljena {
    fill: var(--lx-turn);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .rv-postavljena.ok {
    fill: var(--lx-ok);
  }
  .rv-cilj {
    fill: none;
    stroke: var(--lx-ok);
    stroke-width: 2.5;
  }
  .rv-kursor {
    fill: none;
    stroke: var(--lx-turn);
    stroke-width: 2;
    stroke-dasharray: 3 2;
  }
  .rv-pt {
    fill: var(--text);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .rv-pt.prazna {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 1.8;
  }
  .rv-pt-izbor {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 2;
  }
  .rv-pt-izbor.sel {
    fill: var(--lx-turn);
    stroke: var(--lx-turn);
  }
  .rv-lbl {
    fill: var(--text);
    font: 600 12.5px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .rv-legenda {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 16px;
    margin-top: 6px;
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .rv-legenda span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .rv-legenda i {
    display: inline-block;
    width: 18px;
    height: 12px;
  }
  .rv-leg-s {
    background: color-mix(in srgb, var(--primary) 20%, transparent);
    border-radius: 2px;
  }
  .rv-leg-s.crta {
    height: 3.4px !important;
    background: var(--primary);
  }
  .rv-leg-s.tocka {
    width: 10px !important;
    height: 10px !important;
    border-radius: 999px;
    background: var(--primary);
  }
  .rv-leg-puna {
    height: 2.2px !important;
    background: var(--primary);
  }
  .rv-leg-isp {
    height: 2.2px !important;
    background: repeating-linear-gradient(90deg, var(--primary) 0 6px, transparent 6px 10px);
  }
  .rv-status {
    text-align: center;
    font-size: 13px;
    color: var(--text-dim);
    margin: -4px 0 8px;
  }
  .rv-status b {
    color: var(--text);
  }
  .rv-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .rv-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 6px 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    color: var(--text);
    font-size: 15px;
    white-space: nowrap;
    cursor: pointer;
  }
  .rv-chip:disabled {
    cursor: default;
  }
  .rv-chip.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }
  .rv-chip .lx-mark {
    margin-top: 0;
  }
  .rv-x {
    color: var(--text-faint);
    font-size: 17px;
    line-height: 1;
  }
  .rv-pripada {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--lx-bad);
  }
  .rv-pripada.da {
    color: var(--lx-ok);
  }
</style>
