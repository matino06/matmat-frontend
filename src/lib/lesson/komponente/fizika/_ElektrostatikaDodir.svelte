<script>
  // Dodir dviju vodljivih kugli na izolirajućim stalcima (naboji_polje, nacin "dodir" ili istrazi s kuglama):
  // kugle se primaknu, elektroni prijeđu preko dodira dok se naboj ne razdijeli, pa se kugle razmaknu. U istrazi
  // učenik mijenja naboje i može kuglu „dotaknuti rukom“ (naboj oteče u zemlju). Raspodjelu računa katalog
  // (nakonDodira), isti kod kao provjera.
  import { untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import { nakonDodira } from "$lib/lesson/katalog/fizika/_elektrostatika.js";
  import { formatNumber, parseNumber } from "$lib/lesson/core/number.js";
  import { glatko, ogranici } from "./_elektrostatika.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const istrazi = untrack(() => spec.nacin === "istrazi");
  const pocetni = untrack(() => spec.kugle.map((k) => k.q));
  let q = $state([...pocetni]);
  const klizaci = untrack(() => (istrazi ? (spec.klizaci ?? []) : []));

  // geometrija
  const W = 360;
  const H = 210;
  const CY = 92;
  const POD = 192;
  const Rmax = untrack(() => Math.max(...spec.kugle.map((k) => k.R ?? 1)));
  const r = untrack(() =>
    spec.kugle.map((k) => Math.max(24, 42 * ((k.R ?? 1) / Rmax))),
  );
  const MIR = [96, 264];
  const f1 = (n) => Math.round(n * 10) / 10;
  const fmtQ = (v) => {
    const r = Math.round(v * 100) / 100;
    return `${r > 0 ? "+" : ""}${formatNumber(Math.abs(r) < 0.005 ? 0 : r, 0)} nC`;
  };

  // ── animacija: t 0 → 1 (primakni 0–0,3, prijelaz 0,3–0,7, razmakni 0,7–1) ──
  let anim = $state(null); // {vrsta: "dodir" | "zemlja", i?, od: [q], do: [q]}
  let t = $state(0);
  let raf = 0;
  function pokreni(a) {
    cancelAnimationFrame(raf);
    anim = a;
    if (prefersReducedMotion.current) {
      t = 1;
      zavrsi();
      return;
    }
    t = 0;
    const start = performance.now();
    const trajanje = a.vrsta === "dodir" ? 2600 : 1800;
    const korak = (sad) => {
      t = Math.min(1, (sad - start) / trajanje);
      if (t < 1) raf = requestAnimationFrame(korak);
      else zavrsi();
    };
    raf = requestAnimationFrame(korak);
  }
  function zavrsi() {
    q = [...anim.do];
  }
  $effect(() => () => cancelAnimationFrame(raf));

  let primak = $derived(
    anim?.vrsta === "dodir"
      ? t < 0.3
        ? glatko(t / 0.3)
        : t < 0.7
          ? 1
          : 1 - glatko((t - 0.7) / 0.3)
      : 0,
  );
  let prijelaz = $derived(
    anim && t < 1
      ? glatko(
          ogranici(
            (t - (anim.vrsta === "dodir" ? 0.3 : 0.25)) /
              (anim.vrsta === "dodir" ? 0.4 : 0.5),
            0,
            1,
          ),
        )
      : 1,
  );
  let prikazQ = $derived(
    anim && t < 1 ? anim.od.map((v, i) => v + (anim.do[i] - v) * prijelaz) : q,
  );
  let x = $derived([
    MIR[0] + (W / 2 - r[0] - MIR[0]) * primak,
    MIR[1] + (W / 2 + r[1] - MIR[1]) * primak,
  ]);
  let ruka = $derived(anim?.vrsta === "zemlja" && t < 1 ? anim.i : -1);

  // elektroni u prijelazu: prema kugli kojoj naboj pada (dobiva elektrone)
  let elektroni = $derived.by(() => {
    if (!anim || t >= 1) return [];
    const faza = anim.vrsta === "dodir" ? (t - 0.3) / 0.4 : (t - 0.25) / 0.5;
    if (faza <= 0 || faza >= 1) return [];
    const i = anim.vrsta === "dodir" ? 0 : anim.i;
    const dq = anim.do[i] - anim.od[i];
    if (Math.abs(dq) < 1e-9) return [];
    const m = Math.min(7, Math.max(2, Math.round(Math.abs(dq) / perZnak)));
    // put: dodir → od središta jedne kugle do druge; zemlja → od kugle do uzemljenja ispod nje (ili obrnuto)
    let a;
    let b;
    if (anim.vrsta === "dodir") {
      const izA = dq > 0; // A gubi elektrone
      a = [izA ? x[0] : x[1], CY];
      b = [izA ? x[1] : x[0], CY];
    } else {
      const k = [x[i] + r[i] * 0.7, CY + r[i] * 0.7];
      const z = [x[i] + r[i] + 22, POD - 6];
      [a, b] = dq > 0 ? [k, z] : [z, k];
    }
    return Array.from({ length: m }, (_, k) => {
      const u = faza * 1.6 - (0.6 * k) / (m - 1);
      if (u <= 0 || u >= 1) return null;
      return {
        k,
        x: a[0] + (b[0] - a[0]) * u,
        y: a[1] + (b[1] - a[1]) * u + Math.sin(u * Math.PI * 2 + k) * 4,
      };
    }).filter(Boolean);
  });

  // ── znakovi naboja: najviše 12 po kugli ──
  const perZnak = untrack(() =>
    Math.max(
      1,
      Math.ceil(
        Math.max(
          ...pocetni.map(Math.abs),
          ...nakonDodira(spec.kugle).map(Math.abs),
          istrazi && klizaci.length ? 12 : 1,
        ) / 12,
      ),
    ),
  );
  const SLOTOVI = Array.from({ length: 12 }, (_, i) => {
    const rr = 0.68 * Math.sqrt((i + 0.5) / 12);
    const a = i * 2.39996 + 0.4;
    return [rr * Math.cos(a), rr * Math.sin(a)];
  });
  const znakovi = (v) => Math.min(12, Math.round(Math.abs(v) / perZnak));

  // ── odgovor ──
  let unos = $state(["", ""]);
  let poslano = $state(null);
  let tocno = untrack(() => nakonDodira(spec.kugle));
  let otkrij = $derived(!istrazi && (pokazi || !!ishod?.tocno));
  let neprom = $derived(
    poslano != null && poslano[0] === unos[0] && poslano[1] === unos[1],
  );
  let stanje = $derived(
    otkrij
      ? "ok"
      : ishod && !ishod.tocno && !ishod.prazno && neprom
        ? "bad"
        : "",
  );
  let gotovo = $state(false);

  $effect(() => {
    if (!otkrij) return;
    untrack(() => {
      if (pokazi) unos = tocno.map((v) => formatNumber(v, 2));
      if (!gotovo) {
        gotovo = true;
        pokreni({ vrsta: "dodir", od: [...pocetni], do: [...tocno] });
      }
    });
  });

  function provjeri() {
    if (locked) return;
    poslano = [...unos];
    onodgovor([...unos]);
  }
  let popunjeno = $derived(
    unos.every((u) => parseNumber(String(u).replace(/^\+/, ""), "nC") != null),
  );

  // ── istrazi ──
  let animira = $derived(!!anim && t < 1);
  function dodirni() {
    pokreni({
      vrsta: "dodir",
      od: [...q],
      do: nakonDodira(spec.kugle.map((k, i) => ({ ...k, q: q[i] }))),
    });
  }
  function uzemlji(i) {
    pokreni({
      vrsta: "zemlja",
      i,
      od: [...q],
      do: q.map((v, j) => (j === i ? 0 : v)),
    });
  }
  function vrati() {
    cancelAnimationFrame(raf);
    anim = null;
    t = 0;
    q = [...pocetni];
  }

  let opis = $derived(
    spec.kugle
      .map((k, i) => `kugla ${k.oznaka}: ${fmtQ(prikazQ[i])}`)
      .join(", "),
  );
  let smjerElektrona = $derived.by(() => {
    if (!anim || anim.vrsta !== "dodir") return "";
    const dq = anim.do[0] - anim.od[0];
    if (Math.abs(dq) < 1e-9) return "";
    const [a, b] = spec.kugle.map((k) => k.oznaka);
    return dq > 0
      ? `elektroni prelaze s ${a} na ${b}`
      : `elektroni prelaze s ${b} na ${a}`;
  });
</script>

{#if istrazi}
  <div class="dz-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure dz" class:dz-ok={stanje === "ok"}>
  <svg viewBox="0 0 {W} {H}" role="img" aria-label={opis}>
    <line class="dz-pod" x1="16" y1={POD} x2={W - 16} y2={POD} />
    {#each spec.kugle as k, i (i)}
      {@const cx = x[i]}
      {@const R = r[i]}
      {@const v = prikazQ[i]}
      {@const n = znakovi(v)}
      <!-- izolirajući stalak -->
      <rect
        class="dz-stalak"
        x={f1(cx - 3)}
        y={f1(CY + R)}
        width="6"
        height={f1(POD - CY - R - 4)}
        rx="2"
      />
      <rect
        class="dz-baza"
        x={f1(cx - 18)}
        y={POD - 6}
        width="36"
        height="6"
        rx="2"
      />
      <circle
        class="dz-kugla"
        class:plus={v > 0.004}
        class:minus={v < -0.004}
        cx={f1(cx)}
        cy={CY}
        r={f1(R)}
      />
      <circle
        class="dz-sjaj"
        cx={f1(cx - R * 0.35)}
        cy={f1(CY - R * 0.4)}
        r={f1(R * 0.22)}
      />
      {#each SLOTOVI.slice(0, n) as s, j (j)}
        <text
          class="dz-znak"
          class:minus={v < 0}
          x={f1(cx + s[0] * R * 1.25)}
          y={f1(CY + s[1] * R * 1.25 + 4.5)}
          text-anchor="middle">{v < 0 ? "−" : "+"}</text
        >
      {/each}
      <text class="dz-ime" x={f1(cx)} y={f1(CY - R - 8)} text-anchor="middle"
        >{k.oznaka}</text
      >
      <text
        class="dz-q"
        class:plus={v > 0.004}
        class:minus={v < -0.004}
        x={f1(cx)}
        y={POD + 15}
        text-anchor="middle">{fmtQ(v)}</text
      >
      {#if ruka === i}
        <g class="dz-zemlja">
          <path
            d="M{f1(cx + R * 0.7)},{f1(CY + R * 0.7)} L{f1(cx + R + 22)},{POD -
              6}"
          />
          <path
            d="M{f1(cx + R + 12)},{POD - 6} h20 M{f1(cx + R + 15)},{POD -
              2} h14 M{f1(cx + R + 18)},{POD + 2} h8"
          />
        </g>
      {/if}
    {/each}
    {#each elektroni as e (e.k)}
      <g class="dz-e">
        <circle cx={f1(e.x)} cy={f1(e.y)} r="6" />
        <text x={f1(e.x)} y={f1(e.y + 3.5)} text-anchor="middle">e</text>
      </g>
    {/each}
    {#if perZnak > 1}<text
        class="lx-label dz-legenda"
        x={W - 10}
        y="14"
        text-anchor="end">jedan znak = {formatNumber(perZnak)} nC</text
      >{/if}
    {#if smjerElektrona && animira}<text
        class="lx-label dz-legenda"
        x={W / 2}
        y="16"
        text-anchor="middle">{smjerElektrona}</text
      >{/if}
  </svg>
</figure>

{#if istrazi}
  <div class="dz-ukupno">ukupno: <b>{fmtQ(prikazQ[0] + prikazQ[1])}</b></div>
  {#if klizaci.length}
    <div class="dz-kontrole">
      {#each spec.kugle as k, i (i)}
        {#if klizaci.includes(k.oznaka)}
          <label class="dz-red">
            <span class="dz-red-ime">{k.oznaka}</span>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={q[i]}
              disabled={animira}
              oninput={(e) => (q[i] = Number(e.currentTarget.value))}
              aria-label="naboj kugle {k.oznaka} u nC"
            />
            <output class="dz-red-v">{fmtQ(q[i])}</output>
          </label>
        {/if}
      {/each}
    </div>
  {/if}
  <div class="lx-actions dz-gumbi">
    <button
      type="button"
      class="btn btn-primary"
      onclick={dodirni}
      disabled={animira}>Dodirni kugle</button
    >
    {#if spec.uzemljenje}
      {#each spec.kugle as k, i (i)}
        <button
          type="button"
          class="btn btn-ghost"
          onclick={() => uzemlji(i)}
          disabled={animira || Math.abs(q[i]) < 1e-9}
          >Dotakni {k.oznaka} rukom</button
        >
      {/each}
    {/if}
    <button
      type="button"
      class="btn btn-ghost"
      onclick={vrati}
      disabled={animira}>Vrati</button
    >
  </div>
{:else}
  <form
    class="dz-odgovor"
    onsubmit={(e) => {
      e.preventDefault();
      if (popunjeno) provjeri();
    }}
  >
    {#each spec.kugle as k, i (i)}
      <label class="dz-polje">
        <span>{k.oznaka} nakon dodira:</span>
        <input
          class="inp lx-broj-inp dz-inp"
          class:ok={stanje === "ok"}
          class:bad={stanje === "bad"}
          inputmode="decimal"
          autocomplete="off"
          placeholder="?"
          disabled={locked}
          bind:value={unos[i]}
          aria-label="naboj kugle {k.oznaka} nakon dodira, u nC"
        />
        <span class="lx-unit">nC</span>
      </label>
    {/each}
    <div class="lx-actions">
      <button
        type="submit"
        class="btn btn-primary"
        disabled={locked || !popunjeno}>Provjeri</button
      >
      {#if otkrij && !animira}<button
          type="button"
          class="btn btn-ghost"
          onclick={() =>
            pokreni({ vrsta: "dodir", od: [...pocetni], do: [...tocno] })}
          >Ponovi dodir</button
        >{/if}
    </div>
  </form>
  {#if !otkrij}<p class="lx-hint">
      Upiši naboje s predznakom (npr. −3 ili 2,5). Nakon točnog odgovora vidjet
      ćeš dodir.
    </p>{/if}
{/if}

<style>
  .dz,
  .dz-ukupno,
  .dz-kontrole {
    --np-plus: #f87171;
    --np-minus: #60a5fa;
  }
  :global(html[data-theme="light"]) :is(.dz, .dz-ukupno, .dz-kontrole) {
    --np-plus: #dc2626;
    --np-minus: #2563eb;
  }
  .dz-tekst {
    margin-bottom: 12px;
  }
  .dz {
    margin-bottom: 6px;
  }
  .dz-pod {
    stroke: var(--border-strong);
    stroke-width: 1.5;
  }
  .dz-stalak {
    fill: color-mix(in srgb, var(--warn) 35%, var(--bg-elev));
  }
  .dz-baza {
    fill: var(--text-faint);
  }
  .dz-kugla {
    fill: color-mix(in srgb, var(--text-faint) 32%, var(--bg-elev));
    stroke: var(--text-dim);
    stroke-width: 2;
    transition:
      fill 0.3s,
      stroke 0.3s;
  }
  .dz-kugla.plus {
    fill: color-mix(
      in srgb,
      var(--np-plus) 14%,
      color-mix(in srgb, var(--text-faint) 26%, var(--bg-elev))
    );
  }
  .dz-kugla.minus {
    fill: color-mix(
      in srgb,
      var(--np-minus) 16%,
      color-mix(in srgb, var(--text-faint) 26%, var(--bg-elev))
    );
  }
  .dz.dz-ok .dz-kugla {
    stroke: var(--success);
  }
  .dz-sjaj {
    fill: var(--text);
    opacity: 0.12;
  }
  .dz-znak {
    font: 700 15px var(--font-sans);
    fill: var(--np-plus);
  }
  .dz-znak.minus {
    fill: var(--np-minus);
  }
  .dz-ime {
    font: 600 13px var(--font-sans);
    fill: var(--text);
  }
  .dz-q {
    font: 600 13px var(--font-mono);
    fill: var(--text-dim);
  }
  .dz-q.plus {
    fill: var(--np-plus);
  }
  .dz-q.minus {
    fill: var(--np-minus);
  }
  .dz-e circle {
    fill: var(--np-minus);
  }
  .dz-e text {
    font: 700 9px var(--font-sans);
    fill: var(--bg);
  }
  .dz-zemlja path {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 2;
    stroke-linecap: round;
  }
  .dz-legenda {
    font-size: 11px;
  }
  .dz-ukupno {
    text-align: center;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-dim);
    margin-bottom: 6px;
  }
  .dz-ukupno b {
    color: var(--text);
  }
  .dz-kontrole {
    display: grid;
    gap: 6px;
    max-width: 440px;
    margin: 0 auto;
  }
  .dz-red {
    display: grid;
    grid-template-columns: 26px 1fr 72px;
    align-items: center;
    gap: 10px;
  }
  .dz-red-ime {
    font-weight: 600;
  }
  .dz-red input[type="range"] {
    width: 100%;
    height: 28px;
    margin: 0;
    accent-color: var(--primary);
  }
  .dz-red-v {
    font-family: var(--font-mono);
    font-size: 13.5px;
    text-align: right;
  }
  .dz-gumbi {
    justify-content: center;
  }
  .dz-odgovor {
    display: grid;
    gap: 8px;
  }
  .dz-polje {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .dz-polje > span:first-child {
    min-width: 130px;
  }
  .dz-inp {
    width: 110px;
  }
</style>
