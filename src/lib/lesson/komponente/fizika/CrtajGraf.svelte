<script>
  // Učenik crta graf: vuče čvorove izlomljene crte (v–t), razine stepenica (a–t) ili pravac kroz izmjerene točke.
  // „istrazi“: zadani graf s kursorom, površinom do kursora i trokutom nagiba. Površine, nagibi i krive dionice
  // dolaze iz kataloga (crtaj_graf.js), pa crtež i provjera kažu isto.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import { formatNumber, formatSci } from "../../core/number.js";
  import { crtaj_graf, osi, vrstaGrafa, vrijednostGrafa, povrsinaDo, povrsineDionica, pravacTocaka, pocetneVrijednosti, pocetniPravac, krivi } from "../../katalog/fizika/crtaj_graf.js";
  import { crtice } from "../../katalog/fizika/_kinematika.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  let sirinaKutije = $state(400);
  const W = $derived(Math.round(Math.min(400, Math.max(300, sirinaKutije))));
  const L = 48;
  const R = 16;
  const T = 24;
  const B = 30;
  const H = 250;
  const RH = 150;

  const nacin = $derived(spec.nacin);
  const tocanOdgovor = (s) => crtaj_graf.tocanOdgovor(s);
  const vrsta = $derived(vrstaGrafa(spec));
  const o = $derived(osi(spec));
  const cx = $derived(spec.cvorovi_x ?? []);
  const x0 = $derived(spec.x[0]);
  const x1 = $derived(spec.x[1]);
  const X = (x) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const xIzPx = (px) => x0 + ((px - L) / (W - L - R)) * (x1 - x0);
  const osY = (y, h) => (v) => T + (h - T - B) * (1 - (v - y[0]) / (y[1] - y[0]));
  const Y = $derived(osY(spec.y, H));
  const yIzPx = (py) => spec.y[0] + (1 - (py - T) / (H - T - B)) * (spec.y[1] - spec.y[0]);
  const r1 = (n) => Math.round(n * 10) / 10;

  // mreža: crtice svake korak_x / korak_y, oznake rjeđe ako ih je previše
  const tx = $derived(crtice(x0, x1, spec.korak_x));
  const ty = $derived(crtice(spec.y[0], spec.y[1], spec.korak_y));
  // oznake samo na „lijepim“ crtama (−4, −2, 0, 2 …), ne na svakoj trećoj (0,5; 3,5 …)
  const oznakaSvakih = (raspon, korak, koliko) => {
    for (const m of [1, 2, 5, 10, 20, 25, 50, 100]) if (m * korak >= raspon / koliko - 1e-9) return m * korak;
    return 100 * korak;
  };

  const korakOznakaX = $derived(oznakaSvakih(x1 - x0, spec.korak_x, 9));
  const korakOznakaY = $derived(oznakaSvakih(spec.y[1] - spec.y[0], spec.korak_y, 7));
  const oznacena = (v, k) => Math.abs(v / k - Math.round(v / k)) < 1e-6;
  const y0os = $derived(spec.y[0] <= 0 && spec.y[1] >= 0 ? 0 : spec.y[0]);

  // ── vrijednosti koje učenik namješta ──
  const fiksni = $derived(new Set(spec.fiksni ?? []));
  let ys = $state(untrack(() => (nacin === "istrazi" ? [...(spec.vrijednosti ?? [])] : nacin === "pravac" ? [] : pocetneVrijednosti(spec))));
  // pravac: dvije točke (ili jedna uz kroz_ishodiste) iz kojih se računa nagib
  function pocetneRucke() {
    if (nacin !== "pravac") return [];
    const p = pocetniPravac(spec);
    const sx = x1 - x0;
    const xa = spec.kroz_ishodiste ? 0 : x0 + sx * 0.12;
    const xb = x0 + sx * 0.88;
    return [
      [xa, p.nagib * xa + p.odsjecak],
      [xb, p.nagib * xb + p.odsjecak],
    ];
  }
  let rucke = $state(untrack(pocetneRucke));
  let dirano = $state(false);
  const pravac = $derived.by(() => {
    if (nacin !== "pravac" || rucke.length < 2) return null;
    const [[ax, ay], [bx, by]] = rucke;
    const k = (by - ay) / (bx - ax || 1e-12);
    return { nagib: k, odsjecak: ay - k * ax };
  });

  const zakljucano = $derived(locked || !!ishod?.tocno);

  // prikaz točnog odgovora
  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (nacin === "pravac") {
        const p = pravacTocaka(spec);
        rucke = rucke.map(([x]) => [x, p.nagib * x + p.odsjecak]);
      } else if (nacin !== "istrazi") ys = [...spec.odgovor];
    });
  });

  // ── provjera ──
  let poslano = $state(null);
  function provjeri() {
    if (zakljucano) return;
    if (nacin === "pravac") {
      const odg = dirano ? { ...pravac } : null;
      poslano = JSON.stringify(rucke);
      onodgovor(odg);
    } else {
      poslano = JSON.stringify(ys);
      onodgovor([...ys]);
    }
  }
  const neprom = $derived(poslano != null && poslano === JSON.stringify(nacin === "pravac" ? rucke : ys));
  const losi = $derived(ishod && !ishod.tocno && !ishod.prazno && neprom && nacin !== "pravac" ? new Set(krivi(spec, ys)) : new Set());
  const dobro = $derived(!!ishod?.tocno || pokazi);

  // ── povlačenje ──
  let svgEl = $state();
  let vuce = $state(null); // {vrsta: "cvor" | "razina" | "rucka" | "kursor", i}
  function tocka(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  }
  const naMrezu = (v) => Math.min(spec.y[1], Math.max(spec.y[0], Math.round(v / spec.korak_y) * spec.korak_y));
  function postavi(e) {
    const p = tocka(e);
    if (!p || !vuce) return;
    if (vuce.vrsta === "kursor") {
      kursor = Math.min(cx.at(-1), Math.max(cx[0], xIzPx(p.x)));
      return;
    }
    if (vuce.vrsta === "rucka") {
      const sx = (x1 - x0) / 40;
      const sy = (spec.y[1] - spec.y[0]) / 60;
      let x = Math.min(x1, Math.max(x0, Math.round(xIzPx(p.x) / sx) * sx));
      const y = Math.min(spec.y[1], Math.max(spec.y[0], Math.round(yIzPx(p.y) / sy) * sy));
      const drugi = rucke[1 - vuce.i]?.[0];
      if (drugi != null && Math.abs(x - drugi) < (x1 - x0) * 0.05) x = drugi + (x >= drugi ? 1 : -1) * (x1 - x0) * 0.05;
      rucke[vuce.i] = [x, y];
      dirano = true;
      return;
    }
    const v = naMrezu(yIzPx(p.y));
    if (ys[vuce.i] !== v) ys[vuce.i] = v;
  }
  function dolje(e, vrstaVuce, i) {
    if (e.button > 0) return;
    if (vrstaVuce !== "kursor" && zakljucano) return;
    e.preventDefault();
    vuce = { vrsta: vrstaVuce, i };
    svgEl.setPointerCapture?.(e.pointerId);
    postavi(e);
  }
  const pomak = (e) => vuce && postavi(e);
  const gore = () => (vuce = null);
  function tipka(e, i) {
    if (zakljucano) return;
    const d = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    ys[i] = naMrezu(ys[i] + d * spec.korak_y);
  }
  function tipkaRucka(e, i) {
    if (zakljucano) return;
    const [dx, dy] = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key] ?? [0, 0];
    if (!dx && !dy) return;
    e.preventDefault();
    const [x, y] = rucke[i];
    rucke[i] = [Math.min(x1, Math.max(x0, x + (dx * (x1 - x0)) / 40)), Math.min(spec.y[1], Math.max(spec.y[0], y + (dy * (spec.y[1] - spec.y[0])) / 60))];
    dirano = true;
  }

  // ── istraživanje: kursor ──
  let kursor = $state(untrack(() => (spec.cvorovi_x ? (spec.cvorovi_x[0] + spec.cvorovi_x[1]) / 2 : 0)));
  function tipkaKursor(e) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    kursor = Math.min(cx.at(-1), Math.max(cx[0], kursor + (d * spec.korak_x) / 2));
  }
  const kursorY = $derived(nacin === "istrazi" ? vrijednostGrafa(vrsta, cx, ys, kursor) : 0);
  const dionicaKursora = $derived(Math.max(0, cx.findIndex((x, i) => i > 0 && kursor <= x + 1e-9) - 1));
  const povrsinaKursora = $derived(nacin === "istrazi" ? povrsinaDo(vrsta, cx, ys, kursor) : 0);

  // ── crtež grafa ──
  function linijaGrafa(v, c, yy, Yf) {
    if (v === "stepenice") return c.slice(1).map((b, i) => ({ d: `M${r1(X(c[i]))},${r1(Yf(yy[i]))} H${r1(X(b))}`, i }));
    return [{ d: c.map((x, i) => `${i ? "L" : "M"}${r1(X(x))},${r1(Yf(yy[i]))}`).join(" "), i: 0 }];
  }
  // okomiti spojevi stepenica (isprekidano)
  function spojevi(c, yy, Yf) {
    return c.slice(1, -1).map((x, i) => `M${r1(X(x))},${r1(Yf(yy[i]))} V${r1(Yf(yy[i + 1]))}`);
  }
  // površina ispod grafa od početka do xKraj
  function poligon(v, c, yy, Yf, xKraj = c.at(-1)) {
    const pts = [[c[0], 0]];
    for (let i = 0; i < c.length; i++) {
      if (c[i] > xKraj) break;
      if (v === "stepenice") {
        if (i > 0) pts.push([c[i], yy[i - 1]]);
        if (i < c.length - 1) pts.push([c[i], yy[i]]);
      } else pts.push([c[i], yy[i]]);
    }
    pts.push([xKraj, vrijednostGrafa(v, c, yy, xKraj)], [xKraj, 0]);
    return pts.map(([x, y]) => `${r1(X(x))},${r1(Yf(y))}`).join(" ");
  }

  const povrsine = $derived(nacin === "istrazi" || nacin === "pravac" ? [] : povrsineDionica(vrsta, cx, ys));
  const fmt = (n) => formatNumber(Number(n.toPrecision(4)));
  const sJed = (j) => (j ? `\u00a0${j}` : "");

  // trokut nagiba: dionica pod kursorom (istrazi) ili između ručki (pravac)
  const trokut = $derived.by(() => {
    if (nacin === "istrazi" && spec.nagib && vrsta === "izlomljena") {
      const i = dionicaKursora;
      const [a, b] = [cx[i], cx[i + 1]];
      return { a: [a, ys[i]], b: [b, ys[i + 1]], dx: b - a, dy: ys[i + 1] - ys[i] };
    }
    if (nacin === "pravac" && rucke.length === 2) {
      const [[ax, ay], [bx, by]] = [...rucke].sort((p, q) => p[0] - q[0]);
      return { a: [ax, ay], b: [bx, by], dx: bx - ax, dy: by - ay };
    }
    return null;
  });

  // pravac nacrtan preko cijelog crteža (odrezan na rubu osi)
  function crtaPravca(k, n) {
    const pts = [];
    for (const x of [x0, x1]) pts.push([x, k * x + n]);
    for (const y of spec.y) if (Math.abs(k) > 1e-12) pts.push([(y - n) / k, y]);
    const u = pts.filter(([x, y]) => x >= x0 - 1e-9 && x <= x1 + 1e-9 && y >= spec.y[0] - 1e-9 && y <= spec.y[1] + 1e-9).sort((p, q) => p[0] - q[0]);
    if (u.length < 2) return "";
    const [a, b] = [u[0], u.at(-1)];
    return `M${r1(X(a[0]))},${r1(Y(a[1]))} L${r1(X(b[0]))},${r1(Y(b[1]))}`;
  }
  const lsq = $derived(nacin === "pravac" ? pravacTocaka(spec) : null);

  // ── referenca (zadani graf iznad, ista os x) ──
  const ref = $derived(spec.referenca);
  const refC = $derived(ref?.cvorovi_x ?? cx);
  const refY = $derived(ref ? osY(ref.y, RH) : null);
  const refTy = $derived(ref ? crtice(ref.y[0], ref.y[1], ref.korak_y ?? (ref.y[1] - ref.y[0]) / 4) : []);
  const refO = $derived(ref ? osi({ os_x: spec.os_x, os_y: ref.os_y }) : null);

  const opis = $derived(
    nacin === "pravac"
      ? `Graf ${o.y.ime}–${o.x.ime} s ${spec.tocke.length} izmjerenih točaka i pravcem koji se vuče za hvatišta.`
      : nacin === "istrazi"
        ? `Zadani graf ${o.y.ime}–${o.x.ime}. Vuci kursor ili koristi strelice lijevo i desno.`
        : `Graf ${o.y.ime}–${o.x.ime} koji crtaš: ${vrsta === "stepenice" ? "razina na svakoj dionici" : "točke izlomljene crte"} vuku se gore-dolje ili strelicama.`,
  );
  const uputa = $derived(
    nacin === "pravac"
      ? `Povuci ${spec.kroz_ishodiste ? "hvatište" : "oba hvatišta"} tako da pravac prolazi što bliže svim točkama.`
      : nacin === "stepenice"
        ? "Povuci razinu na svakoj dionici gore ili dolje (lijepi se za crte mreže)."
        : nacin === "izlomljena"
          ? "Povuci svaku točku gore ili dolje (lijepi se za crte mreže)."
          : "Vuci kursor po grafu – ovo nije zadatak.",
  );
</script>

{#snippet natpisOsi(tekst, x, y, sidro)}
  <text class="cg-osi" {x} {y} text-anchor={sidro}>{tekst}</text>
{/snippet}

{#if nacin === "istrazi"}
  <Md text={spec.tekst} />
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}
<p class="lx-hint cg-uputa">{uputa}</p>

{#if ref}
  <div class="lx-figure cg-fig cg-ref">
    <svg viewBox="0 0 {W} {RH}" role="img" aria-label="Zadani graf {refO.y.ime}–{refO.x.ime}">
      {#each tx as x (x)}
        <line class="cg-mreza" x1={X(x)} y1={refY(ref.y[1])} x2={X(x)} y2={refY(ref.y[0])} />
        {#if oznacena(x, korakOznakaX)}<text class="cg-tick" x={X(x)} y={RH - B + 14} text-anchor="middle">{formatNumber(x)}</text>{/if}
      {/each}
      {#each refTy as y (y)}
        <line class="cg-mreza" x1={L} y1={refY(y)} x2={W - R} y2={refY(y)} />
        <text class="cg-tick" x={L - 6} y={refY(y) + 4} text-anchor="end">{formatNumber(y)}</text>
      {/each}
      <line class="cg-os" x1={L} y1={refY(ref.y[0] <= 0 && ref.y[1] >= 0 ? 0 : ref.y[0])} x2={W - R} y2={refY(ref.y[0] <= 0 && ref.y[1] >= 0 ? 0 : ref.y[0])} />
      <line class="cg-os" x1={L} y1={refY(ref.y[0])} x2={L} y2={refY(ref.y[1])} />
      {@render natpisOsi(ref.os_y, L - 6, T - 10, "start")}
      {@render natpisOsi(spec.os_x, W - R, RH - 4, "end")}
      {#if (ref.vrsta ?? "izlomljena") === "stepenice"}
        {#each spojevi(refC, ref.vrijednosti, refY) as d, j (j)}<path class="cg-spoj cg-ref-boja" {d} />{/each}
      {/if}
      {#each linijaGrafa(ref.vrsta ?? "izlomljena", refC, ref.vrijednosti, refY) as l (l.i)}<path class="cg-crta cg-ref-boja" d={l.d} />{/each}
    </svg>
  </div>
{/if}

<div class="lx-figure cg-fig" class:dobro bind:clientWidth={sirinaKutije}>
  <svg
    bind:this={svgEl}
    viewBox="0 0 {W} {H}"
    role="img"
    aria-label={opis}
    class:cg-istrazi={nacin === "istrazi"}
    onpointerdown={nacin === "istrazi" ? (e) => dolje(e, "kursor", 0) : undefined}
    onpointermove={pomak}
    onpointerup={gore}
    onpointercancel={gore}
  >
    <!-- mreža i osi -->
    {#each tx as x (x)}
      <line class="cg-mreza" x1={X(x)} y1={Y(spec.y[1])} x2={X(x)} y2={Y(spec.y[0])} />
      {#if oznacena(x, korakOznakaX)}<text class="cg-tick" x={X(x)} y={H - B + 14} text-anchor="middle">{formatNumber(x)}</text>{/if}
    {/each}
    {#each ty as y (y)}
      <line class="cg-mreza" x1={L} y1={Y(y)} x2={W - R} y2={Y(y)} />
      {#if oznacena(y, korakOznakaY)}<text class="cg-tick" x={L - 6} y={Y(y) + 4} text-anchor="end">{formatNumber(y)}</text>{/if}
    {/each}
    <line class="cg-os" x1={L} y1={Y(y0os)} x2={W - R} y2={Y(y0os)} />
    <line class="cg-os" x1={L} y1={Y(spec.y[0])} x2={L} y2={Y(spec.y[1])} />
    {@render natpisOsi(spec.os_y, L - 6, T - 10, "start")}
    {@render natpisOsi(spec.os_x, W - R, H - 4, "end")}

    {#if nacin === "pravac"}
      {#if pokazi && lsq}<path class="cg-lsq" d={crtaPravca(lsq.nagib, lsq.odsjecak)} />{/if}
      {#each spec.tocke as [x, y], j (j)}
        <circle class="cg-mjerenje" cx={X(x)} cy={Y(y)} r="4.5" />
      {/each}
      {#if pravac}
        {#if trokut}
          <path class="cg-trokut" d="M{X(trokut.a[0])},{Y(trokut.a[1])} H{X(trokut.b[0])} V{Y(trokut.b[1])}" />
          <text class="cg-mala" x={(X(trokut.a[0]) + X(trokut.b[0])) / 2} y={Y(trokut.a[1]) + (trokut.dy >= 0 ? -6 : 15)} text-anchor="middle">Δ{o.x.ime}</text>
          <text class="cg-mala" x={X(trokut.b[0]) + (X(trokut.b[0]) > W - R - 60 ? -5 : 5)} y={(Y(trokut.a[1]) + Y(trokut.b[1])) / 2 + 4} text-anchor={X(trokut.b[0]) > W - R - 60 ? "end" : "start"}>Δ{o.y.ime}</text>
        {/if}
        <path class="cg-pravac" d={crtaPravca(pravac.nagib, pravac.odsjecak)} />
        {#if spec.kroz_ishodiste}<circle class="cg-ishodiste" cx={X(0)} cy={Y(0)} r="4" />{/if}
        {#each rucke as [x, y], i (i)}
          {#if !(spec.kroz_ishodiste && i === 0)}
            <g
              class="cg-rucka"
              class:lx-handle={!zakljucano}
              role="slider"
              tabindex={zakljucano ? -1 : 0}
              aria-label="Hvatište pravca {i + 1}"
              aria-valuenow={y}
              aria-valuetext="{o.x.ime} = {fmt(x)}, {o.y.ime} = {fmt(y)}"
              onpointerdown={(e) => dolje(e, "rucka", i)}
              onkeydown={(e) => tipkaRucka(e, i)}
            >
              <circle class="cg-meta" cx={X(x)} cy={Y(y)} r="22" />
              <circle class="cg-cvor" cx={X(x)} cy={Y(y)} r="8" />
            </g>
          {/if}
        {/each}
      {/if}
    {:else}
      <!-- površina -->
      {#if spec.povrsina && (nacin === "istrazi" || dobro)}
        <polygon class="cg-povrsina" points={poligon(vrsta, cx, ys, Y, nacin === "istrazi" ? kursor : cx.at(-1))} />
        {#if nacin !== "istrazi"}
          {#each povrsine as p, i (i)}
            {@const xm = (cx[i] + cx[i + 1]) / 2}
            {@const ym = vrijednostGrafa(vrsta, cx, ys, xm) / 2}
            {#if Math.abs(p) > 1e-9}<text class="cg-pov-t" x={X(xm)} y={Y(ym) + 4} text-anchor="middle">{fmt(p)}{sJed(o.povrsina.jedinica)}</text>{/if}
          {/each}
        {/if}
      {/if}
      {#if vrsta === "stepenice"}
        {#each spojevi(cx, ys, Y) as d, j (j)}<path class="cg-spoj" {d} />{/each}
      {/if}
      {#each linijaGrafa(vrsta, cx, ys, Y) as l (l.i)}
        <path class="cg-crta" class:los={vrsta === "stepenice" && losi.has(l.i)} d={l.d} />
      {/each}

      {#if nacin === "istrazi"}
        {#if trokut}
          <path class="cg-trokut" d="M{X(trokut.a[0])},{Y(trokut.a[1])} H{X(trokut.b[0])} V{Y(trokut.b[1])}" />
          {#if Math.abs(trokut.dy) > 1e-9}<text class="cg-mala" x={X(trokut.b[0]) + (X(trokut.b[0]) > W - R - 60 ? -5 : 5)} y={(Y(trokut.a[1]) + Y(trokut.b[1])) / 2 + 4} text-anchor={X(trokut.b[0]) > W - R - 60 ? "end" : "start"}>Δ{o.y.ime} = {fmt(trokut.dy)}</text>{/if}
          <text class="cg-mala" x={(X(trokut.a[0]) + X(trokut.b[0])) / 2} y={Y(trokut.a[1]) + (trokut.dy >= 0 ? -6 : 15)} text-anchor="middle">Δ{o.x.ime} = {fmt(trokut.dx)}</text>
        {/if}
        <line class="cg-kursor" x1={X(kursor)} y1={Y(spec.y[0])} x2={X(kursor)} y2={Y(spec.y[1])} />
        <g
          class="cg-rucka"
          role="slider"
          tabindex="0"
          aria-label="Kursor; strelice lijevo i desno"
          aria-valuemin={cx[0]}
          aria-valuemax={cx.at(-1)}
          aria-valuenow={kursor}
          aria-valuetext="{o.x.ime} = {fmt(kursor)} {o.x.jedinica}, {o.y.ime} = {fmt(kursorY)} {o.y.jedinica}"
          onkeydown={tipkaKursor}
        >
          <circle class="cg-kursor-t" cx={X(kursor)} cy={Y(kursorY)} r="6.5" />
        </g>
      {:else}
        <!-- hvatišta: široka okomita traka oko svakog čvora (izlomljena) ili razina dionice (stepenice) -->
        {#each ys as y, i (i)}
          {@const xa = vrsta === "stepenice" ? cx[i] : cx[i]}
          {@const xc = vrsta === "stepenice" ? (cx[i] + cx[i + 1]) / 2 : cx[i]}
          {#if fiksni.has(i)}
            <circle class="cg-cvor fiksni" cx={X(xc)} cy={Y(y)} r="6" />
          {:else}
            <g
              class="cg-rucka"
              class:lx-handle={!zakljucano}
              class:los={losi.has(i)}
              role="slider"
              tabindex={zakljucano ? -1 : 0}
              aria-label={vrsta === "stepenice" ? `Razina na dionici ${formatNumber(cx[i])}–${formatNumber(cx[i + 1])} ${o.x.jedinica}` : `Točka u ${o.x.ime} = ${formatNumber(cx[i])} ${o.x.jedinica}`}
              aria-valuemin={spec.y[0]}
              aria-valuemax={spec.y[1]}
              aria-valuenow={y}
              aria-valuetext="{o.y.ime} = {formatNumber(y)} {o.y.jedinica}"
              onpointerdown={(e) => dolje(e, vrsta === "stepenice" ? "razina" : "cvor", i)}
              onkeydown={(e) => tipka(e, i)}
            >
              {#if vrsta === "stepenice"}
                <rect class="cg-meta" x={X(xa) + 3} y={Y(y) - 20} width={Math.max(10, X(cx[i + 1]) - X(xa) - 6)} height="40" />
              {:else}
                <rect class="cg-meta" x={X(xa) - 20} y={T - 6} width="40" height={H - T - B + 12} />
              {/if}
              <circle class="cg-cvor" cx={X(xc)} cy={Y(y)} r={vrsta === "stepenice" ? 7 : 8} />
              {#if vrsta === "stepenice"}<path class="cg-strelice" d="M{X(xc)},{Y(y) - 13} l-3.5,4 h7 z M{X(xc)},{Y(y) + 13} l-3.5,-4 h7 z" />{/if}
            </g>
          {/if}
        {/each}
      {/if}
    {/if}
  </svg>
</div>

<!-- očitanje uživo -->
<p class="lx-readout cg-ocitanje" aria-live="polite">
  {#if nacin === "pravac" && pravac}
    {o.nagib.oznaka} = Δ{o.y.ime} / Δ{o.x.ime} = <b>{formatSci(pravac.nagib)}{sJed(o.nagib.jedinica)}</b>
  {:else if nacin === "istrazi"}
    {o.x.ime} = <b>{fmt(kursor)}{sJed(o.x.jedinica)}</b> → {o.y.ime} = <b>{fmt(kursorY)}{sJed(o.y.jedinica)}</b>
    {#if spec.povrsina}<br />{o.povrsina.oznaka} (površina do kursora) = <b>{fmt(povrsinaKursora)}{sJed(o.povrsina.jedinica)}</b>{/if}
    {#if trokut}<br />{o.nagib.oznaka} = Δ{o.y.ime} / Δ{o.x.ime} = {fmt(trokut.dy)} / {fmt(trokut.dx)} = <b>{fmt(trokut.dy / trokut.dx)}{sJed(o.nagib.jedinica)}</b>{/if}
  {:else if vuce && (vuce.vrsta === "cvor" || vuce.vrsta === "razina")}
    {#if vuce.vrsta === "cvor"}{o.x.ime} = {formatNumber(cx[vuce.i])}{sJed(o.x.jedinica)},{:else}{formatNumber(cx[vuce.i])}–{formatNumber(cx[vuce.i + 1])}{sJed(o.x.jedinica)}:{/if}
    <b>{o.y.ime} = {formatNumber(ys[vuce.i])}{sJed(o.y.jedinica)}</b>
  {:else if dobro && spec.povrsina && povrsine.length}
    {o.povrsina.oznaka} = površina = {povrsine.map((p) => fmt(p)).join(" + ")} = <b>{fmt(povrsine.reduce((a, b) => a + b, 0))}{sJed(o.povrsina.jedinica)}</b>
  {:else}
    &nbsp;
  {/if}
</p>

{#if nacin !== "istrazi"}
  <div class="lx-actions">
    <button type="button" class="btn btn-primary" onclick={provjeri} disabled={zakljucano}>Provjeri</button>
  </div>
  {#if pokazi}<p class="lx-solution">Točno: {tocanOdgovor(spec)}</p>{/if}
{/if}

<style>
  .cg-uputa {
    margin: 0 0 10px;
  }
  .cg-fig {
    max-width: 520px;
  }
  .cg-ref {
    margin-bottom: 0;
  }
  .cg-istrazi {
    cursor: ew-resize;
    touch-action: pan-y;
    outline: none;
  }
  .cg-istrazi:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: var(--r-md);
  }
  .cg-mreza {
    stroke: var(--border);
    stroke-width: 1;
  }
  .cg-os {
    stroke: var(--text-dim);
    stroke-width: 1.4;
  }
  .cg-tick {
    fill: var(--text-faint);
    font: 11px var(--font-sans);
  }
  .cg-osi {
    fill: var(--text-dim);
    font: italic 12px var(--font-sans);
  }
  .cg-crta {
    fill: none;
    stroke: var(--primary);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .cg-crta.los {
    stroke: var(--danger);
  }
  .cg-ref-boja {
    stroke: var(--warn);
  }
  .cg-spoj {
    fill: none;
    stroke: var(--primary);
    stroke-width: 1.4;
    stroke-dasharray: 3 3;
  }
  .cg-spoj.cg-ref-boja {
    stroke: var(--warn);
  }
  .dobro .cg-crta {
    stroke: var(--success);
  }
  .cg-meta {
    fill: transparent;
  }
  .cg-cvor {
    fill: var(--bg-elev);
    stroke: var(--primary);
    stroke-width: 3;
  }
  .cg-cvor.fiksni {
    fill: var(--text-dim);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .cg-rucka:focus-visible {
    outline: none;
  }
  .cg-rucka:focus-visible .cg-cvor,
  .cg-rucka:hover .cg-cvor {
    stroke-width: 4;
    fill: var(--primary-dim);
  }
  .cg-rucka.los .cg-cvor {
    stroke: var(--danger);
  }
  .dobro .cg-cvor {
    stroke: var(--success);
  }
  .cg-strelice {
    fill: var(--primary);
    opacity: 0.7;
  }
  .cg-povrsina {
    fill: color-mix(in srgb, var(--primary) 18%, transparent);
  }
  .dobro .cg-povrsina {
    fill: color-mix(in srgb, var(--success) 16%, transparent);
  }
  .cg-pov-t {
    fill: var(--text);
    font: 600 12.5px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .cg-mjerenje {
    fill: var(--warn);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .cg-pravac {
    stroke: var(--primary);
    stroke-width: 2.6;
    stroke-linecap: round;
  }
  .dobro .cg-pravac {
    stroke: var(--success);
  }
  .cg-lsq {
    stroke: var(--success);
    stroke-width: 4;
    stroke-dasharray: 8 6;
    opacity: 0.6;
  }
  .cg-ishodiste {
    fill: var(--primary);
  }
  .cg-trokut {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.3;
    stroke-dasharray: 4 3;
  }
  .cg-mala {
    fill: var(--text-dim);
    font: 11.5px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .cg-kursor {
    stroke: var(--text-dim);
    stroke-width: 1.3;
    stroke-dasharray: 4 3;
  }
  .cg-kursor-t {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .cg-ocitanje {
    margin-top: 2px;
    line-height: 1.7;
  }
</style>
