<script>
  // jednadzba: jednadžba kemijske reakcije u jednom redu (na mobitelu se lomi kod strelice). Ispred formule je
  // koeficijent (gumbi + i − u istraživanju, polje u „Tvoj red“, prazno = 1), iza nje stanje (zadano ili izbor).
  // Brojač atoma i naboja vidi se u istraživanju i, ako autor zada brojac: true, u „Tvoj red“. Sva kemija
  // (atomi, naboj, točni koeficijenti) je u katalog/kemija/jednadzba.js.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import { tocanOdgovor } from "../../katalog/index.js";
  import { tvari, tocniKoef, stanjaOd, brojac, nzd, trazeKoef, trazeStanja, zapisNaboja, STANJA, NAJVISE } from "$lib/lesson/katalog/kemija/jednadzba.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const nacin = untrack(() => spec.nacin);
  const istrazi = nacin === "istrazi";
  const t = untrack(() => tvari(spec));
  const tocni = untrack(() => tocniKoef(spec, t));
  const zadanaStanja = untrack(() => stanjaOd(spec, t));
  const unosKoef = untrack(() => trazeKoef(spec));
  const unosStanja = untrack(() => trazeStanja(spec));
  const vidiBrojac = untrack(() => istrazi || (unosKoef && spec.brojac === true));
  const lijevo = t.filter((c) => c.strana === "L");
  const desno = t.filter((c) => c.strana === "D");

  // istraživanje: brojevi; „Tvoj red“: tekst iz polja (prazno = 1)
  let koef = $state(untrack(() => (istrazi ? [...(spec.pocetak ?? t.map(() => 1))] : t.map(() => ""))));
  let stanja = $state(t.map(() => ""));

  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (unosKoef && tocni) koef = tocni.map((k) => (k === 1 ? "" : String(k)));
      if (unosStanja) stanja = zadanaStanja.map((s) => s ?? "");
    });
  });

  const broj = (v) => {
    if (typeof v === "number") return v;
    const x = String(v ?? "").trim();
    return x === "" ? 1 : /^\d+$/.test(x) ? Number(x) : 0;
  };
  let brojevi = $derived(koef.map(broj));
  let b = $derived(brojac(t, brojevi));
  let djelitelj = $derived(nzd(brojevi));
  let aktivno = $derived(!locked && !pokazi);
  let complete = $derived(!unosStanja || t.every((c, i) => c.elektron || stanja[i]));

  function korak(i, d) {
    koef[i] = Math.max(1, Math.min(NAJVISE, koef[i] + d));
  }
  function provjeri() {
    if (!aktivno || !complete) return;
    onodgovor({ koeficijenti: [...koef], stanja: [...stanja] });
  }

  // formula → dijelovi s indeksima i nabojem: „SO₄²⁻“ → S, O, sub 4, sup 2−
  const SUB = "₀₁₂₃₄₅₆₇₈₉";
  const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "−" };
  function dijelovi(f) {
    const out = [];
    for (const ch of String(f)) {
      const v = SUB.includes(ch) ? "sub" : ch in SUP ? "sup" : "t";
      const z = v === "sub" ? String(SUB.indexOf(ch)) : v === "sup" ? SUP[ch] : ch;
      const zadnji = out[out.length - 1];
      if (zadnji?.v === v) zadnji.z += z;
      else out.push({ v, z });
    }
    return out;
  }
  const stanjeZapis = (s) => `(${s})`;

  const iznad = untrack(() => spec.iznad ?? "");
  const dvosmjerna = untrack(() => spec.strelica === "⇌");
  const W = Math.max(44, Math.round([...iznad].length * 7.4 + 18));
  let opis = $derived(
    `${lijevo.map((c) => `${istrazi ? brojevi[c.i] + " " : ""}${c.formula}`).join(" plus ")} daje ${desno.map((c) => `${istrazi ? brojevi[c.i] + " " : ""}${c.formula}`).join(" plus ")}`,
  );
</script>

{#snippet formula(f)}
  {#each dijelovi(f) as d, k (k)}{#if d.v === "sub"}<sub>{d.z}</sub>{:else if d.v === "sup"}<sup>{d.z}</sup>{:else}{d.z}{/if}{/each}
{/snippet}

{#snippet clan(c)}
  <span class="jd-clan">
    {#if istrazi}
      <span class="jd-step">
        <button type="button" class="jd-sbtn" aria-label="Povećaj koeficijent ispred {c.formula}" disabled={koef[c.i] >= NAJVISE} onclick={() => korak(c.i, 1)}>+</button>
        <span class="jd-k" class:jedan={koef[c.i] === 1} aria-live="polite">{koef[c.i]}</span>
        <button type="button" class="jd-sbtn" aria-label="Smanji koeficijent ispred {c.formula}" disabled={koef[c.i] <= 1} onclick={() => korak(c.i, -1)}>−</button>
      </span>
    {:else if unosKoef}
      <input
        class="inp jd-kinp"
        class:ok={ishod?.tocno}
        class:bad={ishod && !ishod.tocno && ishod.koefKrivo}
        inputmode="numeric"
        autocomplete="off"
        placeholder="1"
        aria-label="Koeficijent ispred {c.formula}"
        disabled={!aktivno}
        bind:value={koef[c.i]}
        onkeydown={(e) => e.key === "Enter" && provjeri()}
      />
    {:else if tocni?.[c.i] > 1}
      <span class="jd-k-tekst">{tocni[c.i]}</span>
    {/if}
    <span class="jd-f">{@render formula(c.formula)}</span>
    {#if !c.elektron}
      {#if unosStanja}
        <select
          class="inp jd-sinp"
          class:ok={ishod?.tocno}
          class:bad={ishod && !ishod.tocno && ishod.stanjaKrivo?.includes(c.i)}
          aria-label="Stanje tvari {c.formula}"
          disabled={!aktivno}
          bind:value={stanja[c.i]}
        >
          <option value="">(?)</option>
          {#each STANJA as s (s)}<option value={s}>{stanjeZapis(s)}</option>{/each}
        </select>
      {:else if zadanaStanja[c.i]}
        <span class="jd-st">{stanjeZapis(zadanaStanja[c.i])}</span>
      {/if}
    {/if}
  </span>
{/snippet}

{#if istrazi}
  <div class="jd-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<div class="jd-eq" role="group" aria-label={istrazi ? opis : "Jednadžba reakcije"}>
  <div class="jd-strana">
    {#each lijevo as c, k (c.i)}
      {#if k}<span class="jd-plus">+</span>{/if}
      {@render clan(c)}
    {/each}
  </div>
  <div class="jd-strana">
    <span class="jd-str" aria-label={dvosmjerna ? "ravnoteža" : "daje"}>
      {#if iznad}<span class="jd-iznad">{@render formula(iznad)}</span>{/if}
      <svg width={W} height="14" viewBox="0 0 {W} 14" aria-hidden="true">
        {#if dvosmjerna}
          <path d="M2,5 H{W - 2} l-6,-4" />
          <path d="M{W - 2},9 H2 l6,4" />
        {:else}
          <path d="M2,7 H{W - 3}" />
          <path class="vrh" d="M{W - 1},7 l-8,-4.5 v9 z" />
        {/if}
      </svg>
    </span>
    {#each desno as c, k (c.i)}
      {#if k}<span class="jd-plus">+</span>{/if}
      {@render clan(c)}
    {/each}
  </div>
</div>

{#if unosKoef && !locked}
  <p class="lx-hint jd-napomena">Prazno polje znači 1 (na maturi se koeficijent 1 ne piše).</p>
{/if}

{#if vidiBrojac}
  <table class="jd-brojac" aria-label="Broj atoma i naboj lijevo i desno">
    <thead>
      <tr><th scope="col">element</th><th scope="col">lijevo</th><th scope="col">desno</th><th scope="col"><span class="sr-only">slaže se</span></th></tr>
    </thead>
    <tbody>
      {#each b.redovi as r (r.simbol)}
        <tr class:ok={r.ok} class:bad={!r.ok}>
          <th scope="row">{r.simbol} <span class="jd-naziv">{r.naziv}</span></th>
          <td>{r.lijevo}</td>
          <td>{r.desno}</td>
          <td class="jd-znak">{r.ok ? "✓" : "≠"}<span class="sr-only">{r.ok ? " slaže se" : " ne slaže se"}</span></td>
        </tr>
      {/each}
      {#if b.naboj}
        <tr class:ok={b.naboj.ok} class:bad={!b.naboj.ok}>
          <th scope="row">naboj</th>
          <td>{zapisNaboja(b.naboj.lijevo)}</td>
          <td>{zapisNaboja(b.naboj.desno)}</td>
          <td class="jd-znak">{b.naboj.ok ? "✓" : "≠"}<span class="sr-only">{b.naboj.ok ? " slaže se" : " ne slaže se"}</span></td>
        </tr>
      {/if}
    </tbody>
  </table>
  {#if istrazi}
    <p class="jd-stanje" class:ok={b.izjednaceno && djelitelj === 1} role="status">
      {#if b.izjednaceno && djelitelj > 1}
        Atomi{b.naboj ? " i naboj" : ""} se slažu, ali sve koeficijente možeš podijeliti s {djelitelj}.
      {:else if b.izjednaceno}
        Izjednačeno: svakog elementa{b.naboj ? " i naboja" : ""} ima jednako lijevo i desno.
      {:else}
        Još se ne slaže: {b.redovi.filter((r) => !r.ok).length + (b.naboj && !b.naboj.ok ? 1 : 0)} od {b.redovi.length + (b.naboj ? 1 : 0)}.
      {/if}
    </p>
  {/if}
{/if}

{#if !istrazi}
  <div class="lx-actions">
    <button class="btn btn-primary" disabled={!aktivno || !complete} onclick={provjeri}>Provjeri</button>
  </div>
  {#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}
{/if}

<style>
  .jd-tekst {
    margin-bottom: 12px;
  }
  .jd-eq {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 10px 10px;
    margin: 6px 0 10px;
    font-family: var(--font-sans);
    font-size: 20px;
    line-height: 1.2;
    color: var(--text);
  }
  .jd-strana {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .jd-clan {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .jd-f {
    font-weight: 500;
  }
  .jd-f sub,
  .jd-iznad sub {
    font-size: 0.68em;
    vertical-align: -0.3em;
    line-height: 0;
  }
  .jd-f sup,
  .jd-iznad sup {
    font-size: 0.68em;
    vertical-align: 0.55em;
    line-height: 0;
  }
  .jd-st {
    font-size: 0.8em;
    color: var(--text-dim);
  }
  .jd-plus {
    color: var(--text-dim);
  }
  .jd-k-tekst {
    font-weight: 500;
  }
  .jd-str {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    color: var(--text);
  }
  .jd-str svg {
    display: block;
    overflow: visible;
  }
  .jd-str path {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .jd-str path.vrh {
    fill: currentColor;
    stroke: none;
  }
  .jd-iznad {
    font-size: 12px;
    line-height: 1;
    color: var(--text-dim);
    white-space: nowrap;
  }

  /* koeficijent: polje */
  .jd-kinp {
    width: 2.4em;
    height: var(--lx-control);
    padding: 0 4px;
    text-align: center;
    font-family: var(--font-mono);
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
  }
  .jd-kinp::placeholder {
    color: var(--text-faint);
    opacity: 0.7;
  }
  /* stanje: izbor */
  .jd-sinp {
    height: 34px;
    padding: 0 4px;
    font-size: 16px;
    width: auto;
  }

  /* koeficijent: gumbi u istraživanju */
  .jd-step {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .jd-sbtn {
    width: 34px;
    height: 26px;
    display: grid;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 16px;
    line-height: 1;
    touch-action: manipulation;
  }
  .jd-sbtn:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }
  .jd-sbtn:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .jd-k {
    min-width: 1.4em;
    text-align: center;
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .jd-k.jedan {
    color: var(--text-faint);
  }

  .jd-napomena {
    text-align: center;
    margin-top: 0;
  }

  /* brojač */
  .jd-brojac {
    margin: 6px auto 8px;
    border-collapse: collapse;
    font-size: 14px;
    min-width: 240px;
  }
  .jd-brojac th,
  .jd-brojac td {
    padding: 5px 12px;
    border-bottom: 1px solid var(--border);
    text-align: center;
  }
  .jd-brojac thead th {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-faint);
  }
  .jd-brojac tbody th {
    text-align: left;
    font-weight: 600;
  }
  .jd-brojac td {
    font-family: var(--font-mono);
  }
  .jd-naziv {
    font-weight: 400;
    color: var(--text-faint);
    font-size: 12px;
  }
  .jd-brojac tr.ok .jd-znak {
    color: var(--lx-ok);
  }
  .jd-brojac tr.bad .jd-znak {
    color: var(--lx-bad);
  }
  .jd-znak {
    font-family: var(--font-sans);
    font-weight: 700;
  }
  .jd-stanje {
    text-align: center;
    font-size: 14px;
    color: var(--text-dim);
    margin: 0;
  }
  .jd-stanje.ok {
    color: var(--lx-ok);
    font-weight: 600;
  }

  @media (max-width: 420px) {
    .jd-eq {
      font-size: 18px;
    }
    .jd-brojac th,
    .jd-brojac td {
      padding: 5px 8px;
    }
  }
</style>
