<script>
  // Graf funkcije s mrežom po jedinici (ili po π/k), parametrima na klizačima i oznakama (crte, strelice, točke).
  // „poklopi“: učenik klizačima namješta svoj graf dok ne legne na isprekidani graf iz zadatka; „istrazi“ je isto
  // bez cilja; „prikaz“ je samo slika. Isti crtež koristi i graf uz zadatak (bezTeksta).
  import Md from "./Md.svelte";
  import { formatNumber } from "../core/number.js";
  import { vrijednost, texIzraza } from "../core/izraz.js";
  import { vrijednostiKlizaca, indeksVrijednosti, funkcijeGrafa, ciljniParametri, okvirCrteza, tockaCrteza, tockaIzPolja } from "../katalog/matematika.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {}, bezTeksta = false } = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  const okvir = $derived(okvirCrteza(spec));
  const W = $derived(okvir.W);
  const L = $derived(okvir.L);
  const R = $derived(okvir.R);
  const T = $derived(okvir.T);
  const B = $derived(okvir.B);
  const H = $derived(okvir.H);
  const osi = $derived(spec.osi !== false);
  const mreza = $derived(spec.mreza !== false && spec.osi !== false);

  const x0 = $derived(spec.x[0]);
  const x1 = $derived(spec.x[1]);
  const y0 = $derived(spec.y[0]);
  const y1 = $derived(spec.y[1]);
  const kx = $derived(spec.pi_x ? Math.PI / spec.pi_x : (spec.korak_x ?? 1));
  const ky = $derived(spec.korak_y ?? 1);
  const X = (x) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const Y = (y) => H - B - ((y - y0) / (y1 - y0)) * (H - T - B);
  const r1 = (n) => Math.round(n * 10) / 10;

  function crtice(a, b, k) {
    const out = [];
    for (let i = Math.ceil(a / k - 1e-9); i * k <= b + 1e-9 && out.length < 60; i++) out.push(i);
    return out;
  }
  const tx = $derived(crtice(x0, x1, kx));
  const ty = $derived(crtice(y0, y1, ky));
  const svakaX = $derived(Math.ceil(tx.length / 16));
  const svakaY = $derived(Math.ceil(ty.length / 12));
  const ox = $derived(x0 <= 0 && x1 >= 0 ? 0 : x0);
  const oy = $derived(y0 <= 0 && y1 >= 0 ? 0 : y0);

  // oznaka crtice: broj, ili višekratnik od π/k („π/2“, „3π/2“, „−π“)
  function oznakaX(i) {
    if (!spec.pi_x) return formatNumber(i * kx);
    const nzd = (a, b) => (b ? nzd(b, a % b) : a);
    const g = nzd(Math.abs(i), spec.pi_x) || 1;
    const [b, n] = [i / g, spec.pi_x / g];
    const brojnik = Math.abs(b) === 1 ? "π" : `${Math.abs(b)}π`;
    return `${b < 0 ? "−" : ""}${brojnik}${n === 1 ? "" : `/${n}`}`;
  }

  // ── parametri (klizači) ──
  const klizaci = $derived(spec.klizaci ?? []);
  const opcije = $derived(klizaci.map((k) => vrijednostiKlizaca(k)));
  // svelte-ignore state_referenced_locally (korak se za novi spec iscrtava iznova)
  let indeksi = $state((spec.klizaci ?? []).map((k) => Math.max(0, indeksVrijednosti(k, k.pocetak))));
  $effect(() => {
    if (pokazi && spec.cilj) indeksi = klizaci.map((k) => Math.max(0, indeksVrijednosti(k, spec.cilj[k.id])));
  });
  const parametri = $derived(Object.fromEntries(klizaci.map((k, i) => [k.id, opcije[i][indeksi[i]]?.v])));

  const unutra = (y) => Number.isFinite(y) && y >= y0 - 1e-9 && y <= y1 + 1e-9;
  const N = 480;

  // Krivulja se reže na rubu osi y (s točnim sjecištem), umjesto da skoči preko praznog dijela. Funkcija s
  // ograničenom domenom (od, do) uzorkuje se i točno na krajevima, da graf završi baš u njima.
  function segmenti(f, uvjet = () => true, krajevi = []) {
    const segs = [];
    let cur = [];
    let prev = null;
    const rub = (out, inn) => {
      const yb = out[1] > y1 ? y1 : y0;
      const t = (yb - out[1]) / (inn[1] - out[1]);
      return [out[0] + t * (inn[0] - out[0]), yb];
    };
    const xs = Array.from({ length: N + 1 }, (_, k) => x0 + ((x1 - x0) * k) / N);
    for (const k of krajevi) if (Number.isFinite(k) && k > x0 && k < x1) xs.push(k);
    xs.sort((a, b) => a - b);
    for (const x of xs) {
      const y = f(x);
      const p = [x, y];
      if (unutra(y) && uvjet(y)) {
        if (!cur.length && prev && Number.isFinite(prev[1]) && !unutra(prev[1])) cur.push(rub(prev, p));
        cur.push(p);
      } else if (cur.length) {
        if (Number.isFinite(y) && !unutra(y)) cur.push(rub(p, prev));
        segs.push(cur);
        cur = [];
      }
      prev = p;
    }
    if (cur.length) segs.push(cur);
    return segs.filter((s) => s.length > 1).map((s) => s.map(([x, y]) => `${r1(X(x))},${r1(Y(y))}`).join(" "));
  }

  const fns = $derived(funkcijeGrafa(spec, parametri));
  const cilj = $derived(spec.nacin === "poklopi" ? funkcijeGrafa(spec, ciljniParametri(spec))[0] : null);
  const krivulje = $derived(fns.map((fn, i) => ({ ...fn, i, linije: segmenti(fn.f, undefined, [fn.od, fn.do]) })));
  const ciljLinije = $derived(cilj ? segmenti(cilj.f) : []);

  // ── istaknuti dio: gdje je prva funkcija iznad/ispod osi x, i taj dio osi ──
  const istaknuto = $derived.by(() => {
    const z = spec.istakni?.znak;
    if (!z) return null;
    const f = fns[0].f;
    const vrijedi = (y) => (z === ">0" ? y > 1e-12 : z === "<0" ? y < -1e-12 : z === ">=0" ? y >= -1e-12 : y <= 1e-12);
    const nultocka = (a, b) => {
      for (let i = 0; i < 60; i++) {
        const m = (a + b) / 2;
        if (Math.sign(f(a)) === Math.sign(f(m))) a = m;
        else b = m;
      }
      return (a + b) / 2;
    };
    const dijelovi = [];
    let od = null;
    const M = 2000;
    let px = x0;
    for (let k = 0; k <= M; k++) {
      const x = x0 + ((x1 - x0) * k) / M;
      const da = vrijedi(f(x));
      if (da && od == null) od = k === 0 ? { x: x0, rub: true } : { x: nultocka(px, x), rub: false };
      if (!da && od != null) {
        dijelovi.push({ od, do: { x: nultocka(px, x), rub: false } });
        od = null;
      }
      px = x;
    }
    if (od != null) dijelovi.push({ od, do: { x: x1, rub: true } });
    return { dijelovi, linije: segmenti(f, vrijedi), puni: z.includes("=") };
  });

  const formula = $derived.by(() => {
    if (!spec.formula) return "";
    let t = spec.formula;
    // {A} je vrijednost, {A:k} koeficijent ispred izraza (1 se ne piše, −1 je samo minus)
    klizaci.forEach((k, i) => {
      const o = opcije[i][indeksi[i]];
      t = t.replaceAll(`{${k.id}}`, o?.tex ?? k.id);
      t = t.replaceAll(`{${k.id}:k}`, o?.v === 1 ? "" : o?.v === -1 ? "-" : (o?.tex ?? k.id));
    });
    return t.replace(/\+\s*-/g, "- ").replace(/-\s*-/g, "+ ");
  });

  const tocke = $derived(
    (spec.tocke ?? []).map((t) => {
      const p = tockaIzPolja(t);
      return { x: p?.[0] ?? null, y: p?.[1] ?? null, oznaka: t.oznaka, polozaj: t.polozaj, prazna: t.prazna };
    }),
  );
  const crte = $derived((spec.crte ?? []).map((c) => ({ x: "x" in c ? vrijednost(String(c.x)) : null, y: "y" in c ? vrijednost(String(c.y)) : null, oznaka: c.oznaka })));
  const strelice = $derived((spec.strelice ?? []).map((s) => ({ od: s.od.map((v) => vrijednost(String(v))), do: s.do.map((v) => vrijednost(String(v))), oznaka: s.oznaka })));
  // Oznaka na crtežu je običan SVG tekst: kratki LaTeX (α, √3, a⃗, 90°) pretvara se u znakove, a indeks i
  // potencija (v_c, x^2) postaju manji tekst ispod ili iznad crte (dijelovi → <tspan>).
  const GRCKA = { alpha: "α", beta: "β", gamma: "γ", delta: "δ", varphi: "φ", phi: "φ", theta: "θ", pi: "π", omega: "ω", lambda: "λ", mu: "μ", sigma: "σ", rho: "ρ", varepsilon: "ε", Delta: "Δ", infty: "∞", in: "∈", le: "≤", ge: "≥", neq: "≠", approx: "≈" };
  function bezDolara(t) {
    return String(t ?? "")
      .replace(/\$/g, "")
      .replace(/\\(?:vec|overrightarrow)\{([^{}]*)\}/g, (_, a) => `${a}\u20d7`)
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2")
      .replace(/\\sqrt\{([^{}]*)\}/g, (_, a) => (a.length > 1 ? `√(${a})` : `√${a}`))
      .replace(/\^\{?\\circ\}?/g, "°")
      .replace(/\\(?:cdot|times)/g, "·")
      .replace(/\\(?:left|right)/g, "")
      .replace(/\\([A-Za-z]+)/g, (m, n) => GRCKA[n] ?? m)
      .replace(/\\[,;!]/g, " ")
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

  // ── geometrija ──
  const P = (t) => {
    const p = tockaCrteza(t);
    return p ? [X(p[0]), Y(p[1])] : null;
  };
  const likovi = $derived((spec.likovi ?? []).map((l) => ({ ...l, pts: l.tocke.map(P) })).filter((l) => l.pts.every(Boolean)));
  const kruznice = $derived(
    (spec.kruznice ?? []).map((k) => {
      const c = P(k.sredina);
      const r = vrijednost(String(k.r));
      return { ...k, c, rx: (r * (W - L - R)) / (x1 - x0), ry: (r * (H - T - B)) / (y1 - y0) };
    }),
  );
  // Središte crteža: oznake dužina i točaka idu od njega prema van (da ne padnu u lik).
  const sredisteCrteza = $derived.by(() => {
    const sve = [...likovi.flatMap((l) => l.pts), ...(spec.duzine ?? []).flatMap((d) => [P(d.od), P(d.do)]), ...kruznice.map((k) => k.c)].filter(Boolean);
    if (!sve.length) return [(L + W - R) / 2, (T + H - B) / 2];
    return [sve.reduce((a, p) => a + p[0], 0) / sve.length, sve.reduce((a, p) => a + p[1], 0) / sve.length];
  });
  const duzine = $derived(
    (spec.duzine ?? [])
      .map((d) => {
        const [a, b] = [P(d.od), P(d.do)];
        if (!a || !b) return null;
        const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        let [nx, ny] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
        const [cx, cy] = sredisteCrteza;
        let str = d.strana ?? ((mx - cx) * nx + (my - cy) * ny >= 0 ? 1 : -1);
        if (Math.abs((mx - cx) * nx + (my - cy) * ny) < 1 && d.strana == null) str = ny <= 0 ? 1 : -1;
        [nx, ny] = [nx * str, ny * str];
        return { ...d, a, b, lx: mx + nx * 12, ly: my + ny * 12, sidro: Math.abs(nx) < 0.35 ? "middle" : nx > 0 ? "start" : "end" };
      })
      .filter(Boolean),
  );
  const vektori = $derived((spec.vektori ?? []).map((v) => ({ ...v, a: P(v.od), b: P(v.do) })).filter((v) => v.a && v.b));
  const kutovi = $derived(
    (spec.kutovi ?? [])
      .map((k) => {
        const [v, a, b] = [P(k.vrh), P(k.od), P(k.do)];
        if (!v || !a || !b) return null;
        const a1 = Math.atan2(a[1] - v[1], a[0] - v[0]);
        let d = Math.atan2(b[1] - v[1], b[0] - v[0]) - a1;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d <= -Math.PI) d += 2 * Math.PI;
        const r = 18;
        const tocka = (kut, rr) => [v[0] + rr * Math.cos(kut), v[1] + rr * Math.sin(kut)];
        const [p1, p2] = [tocka(a1, r), tocka(a1 + d, r)];
        const s = 11;
        const u1 = [Math.cos(a1), Math.sin(a1)];
        const u2 = [Math.cos(a1 + d), Math.sin(a1 + d)];
        const kvadrat = `M${v[0] + u1[0] * s},${v[1] + u1[1] * s} L${v[0] + (u1[0] + u2[0]) * s},${v[1] + (u1[1] + u2[1]) * s} L${v[0] + u2[0] * s},${v[1] + u2[1] * s}`;
        const luk = `M${p1[0]},${p1[1]} A${r},${r} 0 0 ${d > 0 ? 1 : 0} ${p2[0]},${p2[1]}`;
        const [lx, ly] = tocka(a1 + d / 2, k.pravi ? 24 : 31);
        return { ...k, put: k.pravi ? kvadrat : luk, lx, ly };
      })
      .filter(Boolean),
  );
  const tekstovi = $derived(
    (spec.tekstovi ?? []).map((t) => {
      const p = tockaIzPolja(t);
      return { tekst: t.tekst, x: p ? X(p[0]) : null, y: p ? Y(p[1]) : null };
    }),
  );
  // položaj oznake točke: zadan, ili (bez osi) od središta crteža prema van, ili gore desno
  const POMAK = { gore: [0, -11, "middle"], dolje: [0, 17, "middle"], lijevo: [-8, 4, "end"], desno: [8, 4, "start"], "gore-desno": [7, -9, "start"], "gore-lijevo": [-7, -9, "end"], "dolje-desno": [7, 15, "start"], "dolje-lijevo": [-7, 15, "end"] };
  function oznakaTocke(t) {
    const [px, py] = [X(t.x), Y(t.y)];
    let polozaj = t.polozaj;
    if (!polozaj && !osi) {
      const [cx, cy] = sredisteCrteza;
      const [dx, dy] = [px - cx, py - cy];
      if (Math.hypot(dx, dy) < 3) polozaj = "gore-desno";
      else {
        const v = dy < -Math.abs(dx) * 0.4 ? "gore" : dy > Math.abs(dx) * 0.4 ? "dolje" : "";
        const h = dx > Math.abs(dy) * 0.4 ? "desno" : dx < -Math.abs(dy) * 0.4 ? "lijevo" : "";
        polozaj = v && h ? `${v}-${h}` : v || h || "gore-desno";
      }
    }
    if (!polozaj) return { x: px + 7, y: py + (py < 30 ? 13 : -10), sidro: "start" };
    const [ox, oy, sidro] = POMAK[polozaj];
    return { x: px + ox, y: py + oy, sidro };
  }

  const boja = (i) => `var(--gf-c${(i % 3) + 1})`;
  const opis = $derived(
    !fns.length
      ? "Crtež uz zadatak."
      : `Graf funkcije${fns.length > 1 ? "" : ` ${fns[0]?.oznaka ?? ""}`}, x od ${formatNumber(x0)} do ${formatNumber(x1)}, y od ${formatNumber(y0)} do ${formatNumber(y1)}.`,
  );
  const zakljucano = $derived(locked || (spec.nacin === "poklopi" && ishod?.tocno));
</script>

{#snippet natpis(t)}{#each dijelovi(t) as d, i (i)}<tspan dy={d.dy} font-size={d.malo ? "0.72em" : null}>{d.t}</tspan>{/each}{/snippet}

{#if !bezTeksta}
  {#if spec.nacin === "poklopi"}
    <div class="lx-question"><Md text={spec.tekst} /></div>
  {:else}
    <Md text={spec.tekst} />
  {/if}
  {#if spec.nacin === "istrazi"}<p class="lx-hint">Pomiči klizače i gledaj kako se graf mijenja – ovo nije zadatak.</p>{/if}
{/if}

{#if formula}<div class="gf-formula"><Md text={`$${formula}$`} /></div>{/if}

<div class="lx-figure gf" class:dobro={spec.nacin === "poklopi" && ishod?.tocno}>
  <svg viewBox="0 0 {W} {H}" role="img" aria-label={opis}>
    <defs>
      <marker id="gf-v-{uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 1 L9 5 L0 9 z" class="gf-strelica-vrh" />
      </marker>
      <marker id="gf-vek-{uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M0 1 L9 5 L0 9 z" class="gf-vektor-vrh" />
      </marker>
    </defs>
    {#if mreza}
      {#each tx as i (i)}<line class="gf-grid" x1={X(i * kx)} y1={Y(y0)} x2={X(i * kx)} y2={Y(y1)} />{/each}
      {#each ty as i (i)}<line class="gf-grid" x1={X(x0)} y1={Y(i * ky)} x2={X(x1)} y2={Y(i * ky)} />{/each}
    {/if}
    {#if osi}
      <line class="gf-axis" x1={X(x0)} y1={Y(oy)} x2={X(x1)} y2={Y(oy)} />
      <line class="gf-axis" x1={X(ox)} y1={Y(y0)} x2={X(ox)} y2={Y(y1)} />
      {#each tx as i, j (i)}
        {#if Math.abs(i * kx - ox) > 1e-9 && j % svakaX === 0}<text class="gf-tick" x={X(i * kx)} y={Y(oy) + 12} text-anchor="middle" dominant-baseline="middle">{oznakaX(i)}</text>{/if}
      {/each}
      {#each ty as i, j (i)}
        {#if Math.abs(i * ky - oy) > 1e-9 && j % svakaY === 0}<text class="gf-tick" x={X(ox) - 6} y={Y(i * ky)} text-anchor="end" dominant-baseline="middle">{formatNumber(i * ky)}</text>{/if}
      {/each}
      <text class="gf-tick gf-os" x={X(x1) - 2} y={Y(oy) - 8} text-anchor="end">{@render natpis(spec.os_x ?? "x")}</text>
      <text class="gf-tick gf-os" x={X(ox) + 7} y={Y(y1) + 10} text-anchor="start">{@render natpis(spec.os_y ?? "y")}</text>
    {/if}

    {#each likovi as l, j (j)}
      <polygon class="gf-lik" class:ispuna={l.ispuna} class:isprekidano={l.isprekidano} points={l.pts.map((p) => `${r1(p[0])},${r1(p[1])}`).join(" ")} />
    {/each}
    {#each kruznice as k, j (j)}
      {#if k.c}<ellipse class="gf-lik" class:ispuna={k.ispuna} class:isprekidano={k.isprekidano} cx={k.c[0]} cy={k.c[1]} rx={k.rx} ry={k.ry} />{/if}
    {/each}

    {#each crte as c, j (j)}
      {#if c.y != null}
        <line class="gf-crta" x1={X(x0)} y1={Y(c.y)} x2={X(x1)} y2={Y(c.y)} />
        {#if c.oznaka}<text class="gf-lbl small" x={X(x1) - 4} y={Y(c.y) - 7} text-anchor="end">{@render natpis(c.oznaka)}</text>{/if}
      {:else if c.x != null}
        <line class="gf-crta" x1={X(c.x)} y1={Y(y0)} x2={X(c.x)} y2={Y(y1)} />
        {#if c.oznaka}<text class="gf-lbl small" x={X(c.x) + 5} y={Y(y1) + 12} text-anchor="start">{@render natpis(c.oznaka)}</text>{/if}
      {/if}
    {/each}

    {#if istaknuto}
      {#each istaknuto.dijelovi as d, j (j)}
        <line class="gf-os-dio" x1={X(d.od.x)} y1={Y(oy)} x2={X(d.do.x)} y2={Y(oy)} />
      {/each}
    {/if}

    {#each ciljLinije as pts, j (j)}<polyline class="gf-curve gf-cilj" points={pts} />{/each}
    {#each krivulje as k (k.i)}
      {#each k.linije as pts, j (j)}<polyline class="gf-curve" class:isprekidano={k.isprekidano} style="stroke: {boja(k.i)}" points={pts} />{/each}
    {/each}
    {#if istaknuto}
      {#each istaknuto.linije as pts, j (j)}<polyline class="gf-curve gf-istaknuto" points={pts} />{/each}
      {#each istaknuto.dijelovi as d, j (j)}
        {#each [d.od, d.do] as kraj, m (m)}
          {#if !kraj.rub}<circle class="gf-kruzic" class:puni={istaknuto.puni} cx={X(kraj.x)} cy={Y(oy)} r="4.5" />{/if}
        {/each}
      {/each}
    {/if}

    {#each duzine as d, j (j)}
      <line class="gf-duzina" class:isprekidano={d.isprekidano} class:istaknuto={d.istaknuto} x1={d.a[0]} y1={d.a[1]} x2={d.b[0]} y2={d.b[1]} />
      {#if d.oznaka}<text class="gf-lbl small" x={d.lx} y={d.ly} text-anchor={d.sidro} dominant-baseline="middle">{@render natpis(d.oznaka)}</text>{/if}
    {/each}
    {#each kutovi as k, j (j)}
      <path class="gf-kut" d={k.put} />
      {#if k.oznaka}<text class="gf-lbl small gf-kut-t" x={k.lx} y={k.ly} text-anchor="middle" dominant-baseline="middle">{@render natpis(k.oznaka)}</text>{/if}
    {/each}
    {#each vektori as v, j (j)}
      <line class="gf-vektor" x1={v.a[0]} y1={v.a[1]} x2={v.b[0]} y2={v.b[1]} marker-end="url(#gf-vek-{uid})" />
      {#if v.oznaka}
        {@const [nx, ny] = [-(v.b[1] - v.a[1]), v.b[0] - v.a[0]].map((c) => c / (Math.hypot(v.b[0] - v.a[0], v.b[1] - v.a[1]) || 1))}
        <text class="gf-lbl small gf-vektor-t" x={(v.a[0] + v.b[0]) / 2 + nx * 11} y={(v.a[1] + v.b[1]) / 2 + ny * 11} text-anchor="middle" dominant-baseline="middle">{@render natpis(v.oznaka)}</text>
      {/if}
    {/each}

    {#each strelice as s, j (j)}
      <line class="gf-strelica" x1={X(s.od[0])} y1={Y(s.od[1])} x2={X(s.do[0])} y2={Y(s.do[1])} marker-start="url(#gf-v-{uid})" marker-end="url(#gf-v-{uid})" />
      {#if s.oznaka}
        {@const okomita = Math.abs(X(s.od[0]) - X(s.do[0])) < 4}
        <text
          class="gf-lbl small gf-strelica-t"
          x={(X(s.od[0]) + X(s.do[0])) / 2 + (okomita ? 7 : 0)}
          y={(Y(s.od[1]) + Y(s.do[1])) / 2 + (okomita ? 0 : -8)}
          text-anchor={okomita ? "start" : "middle"}
          dominant-baseline="middle">{@render natpis(s.oznaka)}</text
        >
      {/if}
    {/each}

    {#each tocke as t, j (j)}
      {#if t.x != null && t.y != null && t.x >= x0 - 1e-9 && t.x <= x1 + 1e-9 && unutra(t.y)}
        <circle class="gf-pt" class:prazna={t.prazna} cx={X(t.x)} cy={Y(t.y)} r="4" />
        {#if t.oznaka}
          {@const o = oznakaTocke(t)}
          <text class="gf-lbl small" x={o.x} y={o.y} text-anchor={o.sidro}>{@render natpis(t.oznaka)}</text>
        {/if}
      {/if}
    {/each}
    {#each tekstovi as t, j (j)}
      {#if t.x != null}<text class="gf-lbl small" x={t.x} y={t.y} text-anchor="middle" dominant-baseline="middle">{@render natpis(t.tekst)}</text>{/if}
    {/each}
  </svg>
  {#if krivulje.length > 1 || cilj}
    <div class="gf-legenda">
      {#each krivulje.filter((k) => k.oznaka || cilj) as k (k.i)}
        <span><i style="background: {boja(k.i)}"></i>{spec.nacin === "poklopi" && k.i === 0 ? "tvoj graf" : bezDolara(k.oznaka)}</span>
      {/each}
      {#if cilj}<span><i class="gf-leg-cilj"></i>graf iz zadatka</span>{/if}
    </div>
  {/if}
</div>

{#if klizaci.length}
  <div class="gf-klizaci">
    {#each klizaci as k, i (k.id)}
      <div class="gf-klizac">
        <label for="gf-{uid}-{k.id}"><Md text={k.oznaka} inline /></label>
        <input id="gf-{uid}-{k.id}" type="range" min="0" max={opcije[i].length - 1} step="1" bind:value={indeksi[i]} disabled={zakljucano} aria-valuetext={String(opcije[i][indeksi[i]]?.izvor ?? "")} />
        <output for="gf-{uid}-{k.id}" class="gf-vr"><Md text={`$${opcije[i][indeksi[i]]?.tex ?? ""}$`} inline /></output>
      </div>
    {/each}
  </div>
{/if}

{#if spec.nacin === "poklopi"}
  <div class="lx-actions">
    <button class="btn btn-primary" disabled={zakljucano} onclick={() => onodgovor({ ...parametri })}>Provjeri</button>
  </div>
  {#if pokazi}<p class="lx-solution">Točno: <Md text={klizaci.map((k) => `$${k.id} = ${texIzraza(String(spec.cilj[k.id]))}$`).join(", ")} inline /></p>{/if}
{/if}

<style>
  .lx-figure.gf {
    max-width: 540px;
  }
  .gf {
    --gf-c1: var(--primary);
    --gf-c2: var(--warn);
    --gf-c3: var(--success);
  }
  .gf-grid {
    stroke: var(--border);
    stroke-width: 1;
  }
  .gf-axis {
    stroke: var(--text-dim);
    stroke-width: 1.4;
  }
  .gf-tick {
    fill: var(--text-faint);
    font: 11px var(--font-sans);
  }
  .gf-os {
    font-style: italic;
    font-size: 12px;
  }
  .gf-curve {
    fill: none;
    stroke-width: 2.6;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .gf-curve.isprekidano {
    stroke-dasharray: 7 5;
  }
  .gf-cilj {
    stroke: var(--text-faint);
    stroke-width: 4;
    stroke-dasharray: 8 6;
    opacity: 0.75;
  }
  .gf.dobro .gf-cilj {
    stroke: var(--success);
  }
  .gf-istaknuto {
    stroke: var(--success);
    stroke-width: 4;
  }
  .gf-os-dio {
    stroke: var(--success);
    stroke-width: 6;
    stroke-linecap: round;
    opacity: 0.55;
  }
  .gf-kruzic {
    fill: var(--bg-elev);
    stroke: var(--success);
    stroke-width: 2.2;
  }
  .gf-kruzic.puni {
    fill: var(--success);
  }
  .gf-crta {
    stroke: var(--text-dim);
    stroke-width: 1.4;
    stroke-dasharray: 5 4;
  }
  .gf-strelica {
    stroke: var(--danger);
    stroke-width: 1.8;
  }
  .gf-strelica-vrh {
    fill: var(--danger);
  }
  .gf-strelica-t {
    fill: var(--danger);
  }
  .gf-lbl {
    fill: var(--text);
    font: 600 13px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .gf-lbl.small {
    font-size: 12.5px;
  }
  .gf-pt {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .gf-pt.prazna {
    fill: var(--bg-elev);
    stroke: var(--primary);
    stroke-width: 2;
  }
  .gf-lik {
    fill: none;
    stroke: var(--text);
    stroke-width: 1.8;
    stroke-linejoin: round;
  }
  .gf-lik.ispuna {
    fill: color-mix(in srgb, var(--primary) 12%, transparent);
  }
  .gf-lik.isprekidano,
  .gf-duzina.isprekidano {
    stroke-dasharray: 6 4;
  }
  .gf-duzina {
    stroke: var(--text);
    stroke-width: 1.8;
    stroke-linecap: round;
  }
  .gf-duzina.istaknuto {
    stroke: var(--primary);
    stroke-width: 3;
  }
  .gf-kut {
    fill: none;
    stroke: var(--warn);
    stroke-width: 1.6;
  }
  .gf-kut-t {
    fill: var(--warn);
  }
  .gf-vektor {
    stroke: var(--primary);
    stroke-width: 2.4;
  }
  .gf-vektor-vrh,
  .gf-vektor-t {
    fill: var(--primary);
  }
  .gf-legenda {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 16px;
    margin-top: 6px;
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .gf-legenda span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .gf-legenda i {
    display: inline-block;
    width: 18px;
    height: 3px;
    border-radius: 2px;
  }
  .gf-leg-cilj {
    background: repeating-linear-gradient(90deg, var(--text-faint) 0 5px, transparent 5px 8px);
  }
  .gf-formula {
    margin: 4px 0 8px;
    text-align: center;
    font-size: 17px;
  }
  .gf-klizaci {
    display: grid;
    gap: 6px;
    max-width: 440px;
    margin: 8px auto 4px;
  }
  .gf-klizac {
    display: grid;
    grid-template-columns: 44px 1fr 64px;
    align-items: center;
    gap: 10px;
  }
  .gf-klizac label {
    color: var(--text-dim);
    text-align: right;
  }
  .gf-klizac input[type="range"] {
    width: 100%;
    margin: 0;
    height: 30px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .gf-vr {
    font-size: 15px;
    color: var(--text);
  }
</style>
