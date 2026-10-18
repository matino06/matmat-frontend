<script>
  // naboj_u_polju: čestica kruži u polju okomitom na papir (kružnica u mjerilu, sila prema središtu), čestica pod
  // kutom prema silnicama, vodič sa strujom koji se zakreće, i „pogodi detektor“ (spektrometar masa). Sve iznose
  // (r, F, T, mjesto pada) računa katalog (naboj_u_polju.js), pa crtež i provjera uvijek kažu isto.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import BrojUnos from "../BrojUnos.svelte";
  import Strelica from "./_MagnetizamStrelica.svelte";
  import Okomito from "./_MagnetizamOkomito.svelte";
  import Polje from "./_MagnetizamPolje.svelte";
  import { Sat, svgTocka, smanjenoGibanje } from "./_magnetizam.svelte.js";
  import "./_magnetizam.css";
  import {
    naboj_u_polju,
    cesticaOf,
    krug,
    velicine,
    kruzenje,
    smjerSileKut,
    vrijednostiKlizaca,
    pocetakKlizaca,
    faktor,
    jedKlizaca,
    doskok,
    pogodiTol,
  } from "$lib/lesson/katalog/fizika/naboj_u_polju.js";
  import { formatSci, formatNumber } from "$lib/lesson/core/number.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const W = 360;
  const r1 = (n) => Math.round(n * 10) / 10;
  let nacin = $derived(spec.nacin);
  let istrazi = $derived(nacin === "istrazi");
  let jeKrug = $derived(krug(spec));
  let c = $derived(spec.objekt === "cestica" ? cesticaOf(spec) : null);

  // ── klizači (indeks na popisu vrijednosti) ──
  let klizaci = $derived(spec.klizaci ?? []);
  let idx = $state(
    untrack(() =>
      Object.fromEntries(
        (spec.klizaci ?? []).map((k) => {
          const vals = vrijednostiKlizaca(k);
          const p = pocetakKlizaca(spec, k);
          return [
            k.id,
            Math.max(
              0,
              vals.findIndex(
                (x) => Math.abs(x - p) <= 1e-9 * Math.max(1, Math.abs(x)),
              ),
            ),
          ];
        }),
      ),
    ),
  );
  let kutVuci = $state(null);
  // trenutne vrijednosti u SI
  let o = $derived.by(() => {
    const out = {};
    for (const k of klizaci)
      out[k.id] = vrijednostiKlizaca(k)[idx[k.id]] * faktor(k);
    if (kutVuci != null) out.kut = kutVuci;
    return out;
  });
  let x = $derived(velicine(spec, o));

  // ── sat i animacija kruženja ──
  const sat = new Sat();
  let treba = $derived(
    spec.objekt === "cestica" && jeKrug && nacin !== "pogodi",
  );
  $effect(() => {
    if (!treba && !ispaljeno) return;
    return sat.pokreni();
  });

  // mjerilo kružnice: najveća kružnica iz raspona klizača stane u crtež
  let mjerilo = $derived.by(() => {
    if (spec.objekt !== "cestica" || !jeKrug) return 1;
    if (nacin === "pogodi") return 230 / Math.max(spec.detektor, 1e-30);
    let rmax = velicine(spec).r;
    const kv = klizaci.find((k) => k.id === "v");
    const kb = klizaci.find((k) => k.id === "B");
    const vMax = kv ? Math.max(...vrijednostiKlizaca(kv)) * faktor(kv) : spec.v;
    const bMin = kb ? Math.min(...vrijednostiKlizaca(kb)) * faktor(kb) : spec.B;
    rmax = Math.max(rmax, velicine(spec, { v: vMax, B: bMin }).r);
    // najveća kružnica ≈ 115 px, ali početna ne manja od 45 px (veće izlaze preko ruba crteža)
    return Math.max(115 / rmax, 45 / velicine(spec).r);
  });
  // traka mjerila: okrugla duljina ≈ 50–90 px
  let traka = $derived.by(() => {
    const cilj = 70 / mjerilo;
    const p = Math.pow(10, Math.floor(Math.log10(cilj)));
    const d = [1, 2, 5, 10]
      .map((k) => k * p)
      .reduce((a, b) =>
        Math.abs(b * mjerilo - 70) < Math.abs(a * mjerilo - 70) ? b : a,
      );
    const [n, jed] =
      d >= 1
        ? [d, "m"]
        : d >= 0.01
          ? [d * 100, "cm"]
          : d >= 1e-3
            ? [d * 1000, "mm"]
            : [d * 1e6, "µm"];
    return {
      px: d * mjerilo,
      txt: `${formatNumber(Number(n.toPrecision(3)))} ${jed}`,
    };
  });

  const T0 = untrack(() =>
    spec.objekt === "cestica" && krug(spec) ? velicine(spec).T : 1,
  );
  let tVis = $derived(
    spec.objekt === "cestica" && jeKrug
      ? Math.max(1.4, Math.min(8, (3.2 * x.T) / T0))
      : 3,
  );
  let smjerKr = $derived(
    spec.objekt === "cestica" && jeKrug ? kruzenje(spec) : 1,
  );
  let kutCest = $state(0);
  let tPrije = 0;
  $effect(() => {
    if (!treba) return;
    const t = sat.t;
    untrack(() => {
      kutCest += ((t - tPrije) * 2 * Math.PI) / tVis;
      tPrije = t;
    });
  });

  // ── pogodi ──
  let ispaljeno = $state(false);
  let tIspaljeno = $state(0);
  let poslano = $state(null);
  let pogodiK = $derived(
    nacin === "pogodi" ? klizaci.find((k) => k.id === spec.mijenja) : null,
  );
  let vrijednostSI = $derived(
    pogodiK
      ? vrijednostiKlizaca(pogodiK)[idx[pogodiK.id]] * faktor(pogodiK)
      : null,
  );
  let neprom = $derived(poslano != null && poslano === vrijednostSI);
  let tocno = $derived(pokazi || (!!ishod?.tocno && neprom));
  function ispali() {
    if (locked) return;
    poslano = vrijednostSI;
    ispaljeno = true;
    tIspaljeno = sat.t;
    onodgovor(vrijednostSI);
  }
  $effect(() => {
    if (!pokazi || !pogodiK) return;
    untrack(() => {
      const vals = vrijednostiKlizaca(pogodiK);
      const i = vals.findIndex(
        (v) =>
          Math.abs(
            doskok(spec, { [spec.mijenja]: v * faktor(pogodiK) }) -
              spec.detektor,
          ) <= pogodiTol(spec),
      );
      if (i >= 0) idx[pogodiK.id] = i;
      ispaljeno = true;
      tIspaljeno = sat.t - 10;
    });
  });
  // promjena klizača poništava hitac
  $effect(() => {
    void vrijednostSI;
    untrack(() => {
      if (poslano != null && poslano !== vrijednostSI && !locked)
        ispaljeno = false;
    });
  });

  // ── vodič: zakretanje povlačenjem kraja ──
  let svgEl = $state();
  let vuce = $state(false);
  function vDolje(e) {
    if (!istrazi) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    vuce = true;
    vPomak(e);
  }
  function vPomak(e) {
    if (!vuce) return;
    const p = svgTocka(svgEl, e);
    if (!p) return;
    let a = (Math.atan2(-(p[1] - 125), p[0] - 180) * 180) / Math.PI;
    if (a < 0) a += 180;
    const kk = klizaci.find((k) => k.id === "kut");
    if (kk) {
      const vals = vrijednostiKlizaca(kk);
      let best = 0;
      vals.forEach(
        (v, i) => Math.abs(v - a) < Math.abs(vals[best] - a) && (best = i),
      );
      idx.kut = best;
      kutVuci = null;
    } else kutVuci = Math.round(a / 5) * 5;
  }
  const fmtK = (k, v) =>
    `${k.id === "kut" ? formatNumber(v) : formatSci(v)} ${jedKlizaca(k)}`.replace(
      " °",
      "°",
    );
  const IME = { v: "brzina v", B: "polje B", kut: "kut α", I: "struja I" };

  let unos = $state("");
</script>

{#snippet klizaciBlok(popis)}
  <div class="mg-kontrole">
    {#each popis as k (k.id)}
      {@const vals = vrijednostiKlizaca(k)}
      <label class="mg-klizac">
        <span class="mg-red-ime">{k.oznaka ?? IME[k.id]}</span>
        <output>{fmtK(k, vals[idx[k.id]])}</output>
        <input
          type="range"
          min="0"
          max={vals.length - 1}
          step="1"
          bind:value={idx[k.id]}
          oninput={() => (kutVuci = null)}
          disabled={locked && !istrazi}
          aria-label={k.oznaka ?? IME[k.id]}
          aria-valuetext={fmtK(k, vals[idx[k.id]])}
        />
      </label>
    {/each}
  </div>
{/snippet}

<div class="mg">
  {#if istrazi}
    <div class="mg-tekst"><Md text={spec.tekst} /></div>
  {:else}
    <div class="lx-question"><Md text={spec.tekst} /></div>
  {/if}

  {#if spec.objekt === "cestica" && jeKrug && nacin !== "pogodi"}
    {@const C = [180, 130]}
    {@const rp = x.r * mjerilo}
    {@const kut = kutCest * smjerKr}
    {@const p = [C[0] + rp * Math.cos(kut), C[1] + rp * Math.sin(kut)]}
    {@const t = [-Math.sin(kut) * smjerKr, Math.cos(kut) * smjerKr]}
    {@const u = [(C[0] - p[0]) / rp, (C[1] - p[1]) / rp]}
    <figure class="lx-figure">
      <svg
        viewBox="0 0 {W} 260"
        role="img"
        aria-label="{c.ime} kruži u magnetskom polju po kružnici polumjera {formatSci(
          x.r,
        )} m"
      >
        <Polje
          smjer={spec.smjer_B}
          x0={0}
          y0={0}
          x1={W}
          y1={260}
          razmak={36}
          oznaka=""
          jako={0.4}
        />
        <g class="c-b"
          ><rect
            x="4"
            y="4"
            width="98"
            height="24"
            rx="6"
            class="mg-leg"
          /><text class="mg-txt it" x="10" y="22">B</text><text
            class="mg-mali"
            x="26"
            y="21"
            >{spec.smjer_B === "u_papir" ? "⊗ u papir" : "⊙ iz papira"}</text
          ></g
        >
        <circle cx={C[0]} cy={C[1]} r={rp} class="mg-putanja" />
        <circle cx={C[0]} cy={C[1]} r="3" class="mg-tocka" />
        <line
          x1={C[0]}
          y1={C[1]}
          x2={C[0] + rp * Math.cos(Math.PI * 0.75)}
          y2={C[1] + rp * Math.sin(Math.PI * 0.75)}
          class="mg-r"
        />
        <text
          x={C[0] + (rp / 2) * Math.cos(Math.PI * 0.75) - 12}
          y={C[1] + (rp / 2) * Math.sin(Math.PI * 0.75) + 2}
          class="mg-txt it mg-r-txt"
          >r{nacin === "izracunaj" && spec.pitaj.velicina === "r"
            ? " = ?"
            : ""}</text
        >
        <Strelica
          x1={p[0] + u[0] * 14}
          y1={p[1] + u[1] * 14}
          x2={p[0] + u[0] * Math.min(rp - 4, 50)}
          y2={p[1] + u[1] * Math.min(rp - 4, 50)}
          boja="c-f"
          oznaka="F"
          sirina={2.8}
          vrh={9}
        />
        <Strelica
          x1={p[0] + t[0] * 13}
          y1={p[1] + t[1] * 13}
          x2={p[0] + t[0] * 52}
          y2={p[1] + t[1] * 52}
          boja="c-v"
          oznaka="v"
          sirina={2.8}
          vrh={9}
        />
        <circle
          cx={p[0]}
          cy={p[1]}
          r="11"
          class="mg-cestica"
          class:neg={c.q < 0}
        />
        <text x={p[0]} y={p[1] + 4.5} text-anchor="middle" class="mg-predznak"
          >{c.q < 0 ? "−" : "+"}</text
        >
        <!-- traka mjerila -->
        <g transform="translate({W - 14 - traka.px} 244)">
          <rect
            x="-6"
            y="-16"
            width={traka.px + 12}
            height="24"
            rx="5"
            class="mg-leg"
          />
          <line
            x1="0"
            y1="0"
            x2={traka.px}
            y2="0"
            class="lx-stroke"
            stroke-width="2"
          />
          <line
            x1="0"
            y1="-4"
            x2="0"
            y2="4"
            class="lx-stroke"
            stroke-width="2"
          />
          <line
            x1={traka.px}
            y1="-4"
            x2={traka.px}
            y2="4"
            class="lx-stroke"
            stroke-width="2"
          />
          <text x={traka.px / 2} y="-5" text-anchor="middle" class="mg-mali"
            >{traka.txt}</text
          >
        </g>
      </svg>
    </figure>
    {#if istrazi}
      <p class="mg-ocitanje" aria-live="polite">
        F = |q|·v·B = <b>{formatSci(x.F)} N</b> · r = mv/(|q|B) =
        <b>{formatSci(x.r)} m</b><br />T = 2πm/(|q|B) =
        <b>{formatSci(x.T)} s</b> · brzina po iznosu stalna: sila samo zakreće
      </p>
      {@render klizaciBlok(klizaci)}
    {:else}
      <p class="mg-ocitanje">
        {c.ime} · v = {formatSci(spec.v)} m/s · B = {formatSci(spec.B)} T
      </p>
      <BrojUnos
        jedinica={spec.pitaj.jedinica ??
          { r: "m", F: "N", T: "s" }[spec.pitaj.velicina]}
        {locked}
        {ishod}
        bind:vrijednost={unos}
        oznaka={spec.pitaj.velicina}
        {onodgovor}
      />
    {/if}
  {:else if spec.objekt === "cestica" && nacin === "pogodi"}
    {@const yR = 200}
    {@const desno = smjerKr > 0}
    {@const ex = desno ? 50 : W - 50}
    {@const dPx = spec.detektor * mjerilo}
    {@const rp = x.r * mjerilo}
    {@const anim = ispaljeno
      ? smanjenoGibanje()
        ? 1
        : Math.min(1, (sat.t - tIspaljeno) / 1.4)
      : 0}
    {@const pts = Array.from({ length: 41 }, (_, i) => {
      const a = (Math.PI * i * anim) / 40;
      return [
        ex + (desno ? 1 : -1) * rp * (1 - Math.cos(a)),
        yR - rp * Math.sin(a),
      ];
    })}
    {@const kraj = pts.at(-1)}
    {@const pogodak =
      ispaljeno &&
      anim >= 1 &&
      Math.abs(2 * x.r - spec.detektor) <= pogodiTol(spec)}
    <figure class="lx-figure">
      <svg
        viewBox="0 0 {W} 250"
        role="img"
        aria-label="Spektrometar: {c.ime} ulazi u polje i nakon polukruga pada na ravninu ulaza; detektor je {formatSci(
          spec.detektor * 100,
        )} cm od ulaza"
      >
        <defs
          ><clipPath id="mg-kp"
            ><rect x="0" y="0" width={W} height={yR + 2} /></clipPath
          ></defs
        >
        <rect x="0" y="0" width={W} height={yR} class="mg-podrucje-b" />
        <Polje
          smjer={spec.smjer_B}
          x0={0}
          y0={0}
          x1={W}
          y1={yR}
          razmak={34}
          oznaka=""
          jako={0.4}
        />
        <line x1="0" y1={yR} x2={W} y2={yR} class="mg-rub" />
        <!-- izvor i ulaz -->
        <rect
          x={ex - 11}
          y={yR + 14}
          width="22"
          height="30"
          rx="4"
          class="mg-izvor"
        />
        <Strelica
          x1={ex}
          y1={yR + 14}
          x2={ex}
          y2={yR - 26}
          boja="c-v"
          oznaka="v"
          sirina={2.6}
          vrh={9}
          stranaOznake={desno ? -1 : 1}
        />
        <!-- detektor -->
        <rect
          x={ex + (desno ? 1 : -1) * dPx - 14}
          y={yR - 5}
          width="28"
          height="10"
          rx="3"
          class="mg-detektor"
          class:pogodak
        />
        <text
          x={ex + (desno ? 1 : -1) * dPx}
          y={yR + 24}
          text-anchor="middle"
          class="mg-mali">detektor</text
        >
        <line
          x1={ex}
          y1={yR + 50}
          x2={ex + (desno ? 1 : -1) * dPx}
          y2={yR + 50}
          class="mg-mjera"
        />
        <text
          x={ex + ((desno ? 1 : -1) * dPx) / 2}
          y={yR + 46}
          text-anchor="middle"
          class="mg-mali">d = {formatSci(spec.detektor * 100)} cm</text
        >
        {#if ispaljeno}
          <g clip-path="url(#mg-kp)">
            <path
              d={pts
                .map((q, i) => `${i ? "L" : "M"}${r1(q[0])},${r1(q[1])}`)
                .join(" ")}
              class="mg-putanja-puna"
            />
            <circle
              cx={kraj[0]}
              cy={kraj[1]}
              r="7"
              class="mg-cestica"
              class:neg={c.q < 0}
            />
          </g>
        {/if}
        <g class="c-b"
          ><rect
            x="4"
            y="4"
            width="98"
            height="24"
            rx="6"
            class="mg-leg"
          /><text class="mg-txt it" x="10" y="22">B</text><text
            class="mg-mali"
            x="26"
            y="21"
            >{spec.smjer_B === "u_papir" ? "⊗ u papir" : "⊙ iz papira"}</text
          ></g
        >
      </svg>
    </figure>
    <p class="mg-ocitanje">
      {c.ime} · m = {formatSci(c.m)} kg · |q| = {formatSci(Math.abs(c.q))} C{spec.mijenja ===
      "B"
        ? ` · v = ${formatSci(x.v)} m/s`
        : ` · B = ${formatSci(x.B)} T`}
    </p>
    {@render klizaciBlok(klizaci)}
    <div class="lx-actions">
      <button
        type="button"
        class="btn btn-primary"
        onclick={ispali}
        disabled={locked}>Ispali i provjeri</button
      >
      {#if !locked}<span class="mg-hint"
          >Namjesti {spec.mijenja === "B" ? "polje" : "brzinu"}, pa ispali
          česticu.</span
        >{/if}
    </div>
  {:else if spec.objekt === "cestica"}
    <!-- polje u ravnini papira, brzina pod kutom α -->
    {@const C = [180, 120]}
    {@const a = (x.kut * Math.PI) / 180}
    {@const F = smjerSileKut(spec, x.kut)}
    {@const sinA = Math.abs(Math.sin(a))}
    <figure class="lx-figure">
      <svg
        viewBox="0 0 {W} 240"
        role="img"
        aria-label="{c.ime}, brzina pod kutom {formatNumber(
          x.kut,
        )}° prema silnicama; sila {F === 'nula'
          ? 'nula'
          : F === 'u_papir'
            ? 'u papir'
            : 'iz papira'}"
      >
        <Polje
          smjer="desno"
          x0={0}
          y0={0}
          x1={W}
          y1={240}
          razmak={40}
          oznaka="B"
          jako={0.5}
        />
        <Strelica
          x1={C[0] + Math.cos(a) * 14}
          y1={C[1] - Math.sin(a) * 14}
          x2={C[0] + Math.cos(a) * 80}
          y2={C[1] - Math.sin(a) * 80}
          boja="c-v"
          oznaka="v"
          sirina={3}
        />
        {#if x.kut > 0}
          <path
            d="M{C[0] + 32},{C[1]} A32,32 0 {x.kut > 180 ? 1 : 0} 0 {r1(
              C[0] + 32 * Math.cos(a),
            )},{r1(C[1] - 32 * Math.sin(a))}"
            class="mg-stroke c-v"
            stroke-width="1.8"
          />
          <g class="c-v"
            ><text
              class="mg-txt"
              x={C[0] + 40 * Math.cos(a / 2) + 4}
              y={C[1] - 40 * Math.sin(a / 2) + 4}>α</text
            ></g
          >
        {/if}
        <circle
          cx={C[0]}
          cy={C[1]}
          r="12"
          class="mg-cestica"
          class:neg={c.q < 0}
        />
        <text x={C[0]} y={C[1] + 5} text-anchor="middle" class="mg-predznak"
          >{c.q < 0 ? "−" : "+"}</text
        >
        {#if F === "u_papir" || F === "iz_papira"}
          <Okomito
            x={C[0] - 52}
            y={C[1] + 44}
            r={6 + 12 * sinA}
            smjer={F}
            boja="c-f"
            oznaka="F"
            ispuna
          />
        {:else}
          <g class="c-f"
            ><text
              class="mg-txt it"
              x={C[0] - 52}
              y={C[1] + 50}
              text-anchor="middle">F = 0</text
            ></g
          >
        {/if}
      </svg>
    </figure>
    {#if istrazi}
      <p class="mg-ocitanje" aria-live="polite">
        F = |q|·v·B·sin α = <b>{formatSci(x.F < 1e-30 ? 0 : x.F)} N</b>
        {x.kut === 0 || x.kut === 180 ? "· uzduž silnica nema sile" : ""}
      </p>
      {@render klizaciBlok(klizaci)}
    {:else}
      <p class="mg-ocitanje">
        {c.ime} · v = {formatSci(spec.v)} m/s · B = {formatSci(spec.B)} T · α = {formatNumber(
          spec.kut,
        )}°
      </p>
      <BrojUnos
        jedinica={spec.pitaj.jedinica ?? "N"}
        {locked}
        {ishod}
        bind:vrijednost={unos}
        oznaka="Sila"
        {onodgovor}
      />
    {/if}
  {:else}
    <!-- vodič u polju -->
    {@const C = [180, 125]}
    {@const a = (x.kut * Math.PI) / 180}
    {@const F = smjerSileKut(spec, x.kut)}
    {@const sinA = Math.abs(Math.sin(a))}
    {@const L = 95}
    <figure class="lx-figure">
      <svg
        bind:this={svgEl}
        viewBox="0 0 {W} 250"
        role="img"
        aria-label="Vodič pod kutom {formatNumber(
          x.kut,
        )}° prema silnicama; sila {F === 'nula'
          ? 'nula'
          : F === 'u_papir'
            ? 'u papir'
            : 'iz papira'}"
      >
        <Polje
          smjer="desno"
          x0={0}
          y0={0}
          x1={W}
          y1={250}
          razmak={40}
          oznaka="B"
          jako={0.5}
        />
        <line
          x1={C[0] - Math.cos(a) * L}
          y1={C[1] + Math.sin(a) * L}
          x2={C[0] + Math.cos(a) * L}
          y2={C[1] - Math.sin(a) * L}
          class="mg-zica"
          stroke-width="8"
          stroke-linecap="round"
        />
        <Strelica
          x1={C[0] + Math.cos(a) * 30 - Math.sin(a) * 20}
          y1={C[1] - Math.sin(a) * 30 - Math.cos(a) * 20}
          x2={C[0] + Math.cos(a) * 80 - Math.sin(a) * 20}
          y2={C[1] - Math.sin(a) * 80 - Math.cos(a) * 20}
          stranaOznake={-1}
          boja="c-i"
          oznaka="I"
          sirina={2.6}
          vrh={9}
        />
        {#if x.kut > 0}
          <path
            d="M{C[0] + 34},{C[1]} A34,34 0 0 0 {r1(
              C[0] + 34 * Math.cos(a),
            )},{r1(C[1] - 34 * Math.sin(a))}"
            class="mg-stroke c-v"
            stroke-width="1.8"
          />
          <g class="c-v"
            ><text
              class="mg-txt"
              x={C[0] + 44 * Math.cos(a / 2) + 2}
              y={C[1] - 44 * Math.sin(a / 2) + 5}>α</text
            ></g
          >
        {/if}
        {#if F === "u_papir" || F === "iz_papira"}
          <Okomito
            x={C[0] - 60 * Math.sin(a) * 0 - 70}
            y={C[1] + 70}
            r={6 + 14 * sinA}
            smjer={F}
            boja="c-f"
            oznaka="F"
            ispuna
          />
        {:else}
          <g class="c-f"
            ><text
              class="mg-txt it"
              x={C[0] - 70}
              y={C[1] + 76}
              text-anchor="middle">F = 0</text
            ></g
          >
        {/if}
        {#if istrazi}
          {@const hx = C[0] + Math.cos(a) * L}
          {@const hy = C[1] - Math.sin(a) * L}
          <circle cx={hx} cy={hy} r="9" class="mg-rucica" />
          <circle
            cx={hx}
            cy={hy}
            r="22"
            fill="transparent"
            class="lx-handle"
            role="slider"
            tabindex="0"
            aria-label="Kraj vodiča: povuci da ga zakreneš"
            aria-valuemin={0}
            aria-valuemax={180}
            aria-valuenow={x.kut}
            onpointerdown={vDolje}
            onpointermove={vPomak}
            onpointerup={() => (vuce = false)}
            onpointercancel={() => (vuce = false)}
            onkeydown={(e) => {
              const kk = klizaci.find((k) => k.id === "kut");
              const d = {
                ArrowLeft: 1,
                ArrowUp: 1,
                ArrowRight: -1,
                ArrowDown: -1,
              }[e.key];
              if (kk && d) {
                e.preventDefault();
                idx.kut = Math.max(
                  0,
                  Math.min(vrijednostiKlizaca(kk).length - 1, idx.kut + d),
                );
              }
            }}
          />
        {/if}
      </svg>
    </figure>
    {#if istrazi}
      <p class="mg-ocitanje" aria-live="polite">
        F = B·I·ℓ·sin α = <b>{formatSci(x.F < 1e-12 ? 0 : x.F)} N</b>{x.kut ===
          0 || x.kut === 180
          ? " · vodič uzduž silnica: sile nema"
          : x.kut === 90
            ? " · okomit vodič: najveća sila"
            : ""}
      </p>
      {@render klizaciBlok(klizaci)}
      <p class="mg-hint">Povuci kružić na kraju vodiča da ga zakreneš.</p>
    {:else}
      <p class="mg-ocitanje">
        B = {formatNumber(spec.B)} T · I = {formatNumber(spec.I)} A · ℓ = {formatNumber(
          spec.l,
        )}
        {spec.jedinica_l ?? "m"} · α = {formatNumber(spec.kut)}°
      </p>
      <BrojUnos
        jedinica={spec.pitaj.jedinica ?? "N"}
        {locked}
        {ishod}
        bind:vrijednost={unos}
        oznaka="Sila"
        {onodgovor}
      />
    {/if}
  {/if}

  {#if pokazi && !istrazi}<p class="lx-solution">
      Točan odgovor: {naboj_u_polju.tocanOdgovor(spec)}
    </p>{/if}
  {#if tocno && nacin === "pogodi"}<p class="mg-hint">
      Pogodak: 2r = d, pa r = d/2 = {formatSci(spec.detektor / 2)} m.
    </p>{/if}
</div>

<style>
  .mg-tekst {
    margin-bottom: 10px;
  }
  .mg :global(.mg-leg) {
    fill: var(--bg-elev);
    opacity: 0.9;
  }
  .mg :global(.mg-putanja) {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.6;
    stroke-dasharray: 6 5;
  }
  .mg :global(.mg-putanja-puna) {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 2;
    stroke-dasharray: 6 4;
  }
  .mg :global(.mg-r) {
    stroke: var(--mg-ind);
    stroke-width: 1.6;
  }
  .mg :global(.mg-r-txt) {
    fill: var(--mg-ind);
  }
  .mg :global(.mg-tocka) {
    fill: var(--text);
  }
  .mg :global(.mg-cestica) {
    fill: color-mix(in srgb, var(--mg-i) 22%, var(--bg-elev));
    stroke: var(--mg-i);
    stroke-width: 2.5;
  }
  .mg :global(.mg-cestica.neg) {
    fill: color-mix(in srgb, var(--mg-s) 22%, var(--bg-elev));
    stroke: var(--mg-s);
  }
  .mg :global(.mg-predznak) {
    fill: var(--text);
    font: 700 15px var(--font-mono);
    pointer-events: none;
  }
  .mg :global(.mg-podrucje-b) {
    fill: color-mix(in srgb, var(--mg-b) 6%, transparent);
  }
  .mg :global(.mg-rub) {
    stroke: var(--mg-b);
    stroke-width: 2;
  }
  .mg :global(.mg-izvor) {
    fill: var(--bg-elev);
    stroke: var(--text-dim);
    stroke-width: 1.5;
  }
  .mg :global(.mg-detektor) {
    fill: var(--text-faint);
    stroke: var(--text-dim);
  }
  .mg :global(.mg-detektor.pogodak) {
    fill: var(--success);
    stroke: var(--success);
  }
  .mg :global(.mg-mjera) {
    stroke: var(--text-faint);
    stroke-dasharray: 3 3;
  }
  .mg :global(.mg-rucica) {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .mg-klizac {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 10px;
    align-items: baseline;
  }
  .mg-klizac output {
    font-family: var(--font-mono);
    font-size: 14px;
  }
  .mg-klizac input {
    grid-column: 1 / -1;
    width: 100%;
    height: 28px;
    margin: 0;
    accent-color: var(--primary);
  }
</style>
