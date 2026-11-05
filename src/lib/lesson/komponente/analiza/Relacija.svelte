<script>
  // Relacija na konačnom skupu: tablica A×A (redak = prvi element, stupac = drugi) i/ili graf sa strelicama i petljama.
  // „nadopuni“: dodir prazne ćelije dodaje par (zadani su zaključani); „svojstva“: četiri prekidača; „klase“: dodir
  // elementa pa dodir razreda (bez povlačenja). „prikaz“ je samo crtež. Točan odgovor (zatvorenje, svojstva, razredi)
  // računa katalog; widget ga crta tek nakon točnog odgovora ili „Pokaži točan odgovor“.
  import Md from "../Md.svelte";
  import { elementi, kljuc, kljucPara, skupRelacije, ciljnaRelacija, prikazi, tekstElementa, imeRelacije, ponudenaSvojstva, svojstvaRelacije, razredi as razrediRelacije, NAZIV_SVOJSTVA } from "../../katalog/analiza/relacija.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const nacin = $derived(spec.nacin);
  const E = $derived(elementi(spec));
  const R = $derived(skupRelacije(spec));
  const poKljucu = $derived(new Map(E.map((e) => [kljuc(e), e])));
  const ime = $derived(`$${imeRelacije(spec)}$`);
  // nadopuna se radi u tablici, pa je tablica tu uvijek; graf uz nju ako ga autor traži
  const vidi = $derived(nacin === "nadopuni" ? ["tablica", ...prikazi(spec).filter((p) => p === "graf")] : prikazi(spec));
  const istakni = $derived(new Set(nacin === "prikaz" ? (spec.istakni ?? []).map(([a, b]) => kljucPara(a, b)) : []));

  // poruka nakon krive provjere ističe par ili elemente koje imenuje, dok učenik ne promijeni odgovor
  let diran = $state(false);
  $effect(() => {
    ishod;
    diran = false;
  });
  const upozoriPar = $derived(!diran && ishod && !ishod.tocno && ishod.par ? kljucPara(ishod.par[0], ishod.par[1]) : null);
  const upozoriEl = $derived(new Set(!diran && ishod && !ishod.tocno && ishod.elementi ? ishod.elementi.map(kljuc) : []));

  // ── nadopuni ──
  let dodano = $state([]);
  const cilj = $derived(nacin === "nadopuni" ? ciljnaRelacija(spec) : new Set());
  function prebaci(a, b) {
    if (locked) return;
    const k = kljucPara(a, b);
    dodano = dodano.includes(k) ? dodano.filter((x) => x !== k) : [...dodano, k];
    diran = true;
  }
  function posaljiParove() {
    const parovi = [...R, ...dodano].map((k) => k.split("\u0000").map((x) => poKljucu.get(x)));
    onodgovor(parovi);
  }

  // stanje para: zadan | dodan | ok | fali | visak | ist | nedostaje | prazno
  function stanje(a, b) {
    const k = kljucPara(a, b);
    if (R.has(k)) return istakni.has(k) ? "zadan ist" : "zadan";
    if (nacin === "prikaz") return istakni.has(k) ? "nedostaje" : "prazno";
    if (nacin !== "nadopuni") return "prazno";
    const ima = dodano.includes(k);
    if (pokazi) return ima ? (cilj.has(k) ? "ok" : "visak") : cilj.has(k) ? "fali" : "prazno";
    if (ishod?.tocno) return ima ? "ok" : "prazno";
    return ima ? "dodan" : "prazno";
  }
  const OPIS_STANJA = { zadan: "u relaciji", "zadan ist": "u relaciji, istaknut", dodan: "dodao si", ok: "u relaciji", fali: "fali", visak: "nije potreban", nedostaje: "nije u relaciji, istaknut", prazno: "nije u relaciji" };
  const par = (a, b) => `(${tekstElementa(a)}, ${tekstElementa(b)})`;

  // ── graf ──
  const n = $derived(E.length);
  const GW = 320;
  const GH = $derived(n === 2 ? 190 : 320);
  const cx = GW / 2;
  const cy = $derived(GH / 2);
  const Rk = $derived(n === 2 ? 92 : 100);
  const kut0 = $derived(n === 2 ? Math.PI : n % 2 === 0 ? -Math.PI / 2 - Math.PI / n : -Math.PI / 2);
  const cvorovi = $derived(
    E.map((e, i) => {
      const t = tekstElementa(e);
      const kut = kut0 + (2 * Math.PI * i) / n;
      return { e, k: kljuc(e), t, x: cx + Rk * Math.cos(kut), y: cy + Rk * Math.sin(kut), hw: Math.max(17, 4.4 * t.length + 9), hh: 17 };
    }),
  );
  const r1 = (v) => Math.round(v * 10) / 10;
  const jed = (x, y) => {
    const d = Math.hypot(x, y) || 1;
    return [x / d, y / d];
  };
  // udaljenost od središta čvora do ruba u smjeru (ux, uy)
  const rub = (c, ux, uy) => Math.min(Math.abs(ux) > 1e-6 ? c.hw / Math.abs(ux) : Infinity, Math.abs(uy) > 1e-6 ? c.hh / Math.abs(uy) : Infinity) + 3;
  const vrh = (x, y, ux, uy) => {
    const [px, py] = [-uy, ux];
    return `${r1(x)},${r1(y)} ${r1(x - ux * 9 + px * 4.5)},${r1(y - uy * 9 + py * 4.5)} ${r1(x - ux * 9 - px * 4.5)},${r1(y - uy * 9 - py * 4.5)}`;
  };
  const bridovi = $derived.by(() => {
    const out = [];
    const vidljiv = (a, b) => stanje(a.e, b.e) !== "prazno";
    for (const a of cvorovi)
      for (const b of cvorovi) {
        if (!vidljiv(a, b)) continue;
        const st = stanje(a.e, b.e);
        if (a === b) {
          // petlja prema van od središta crteža
          const [ux, uy] = jed(a.x - cx, a.y - cy);
          const rot = (t) => [ux * Math.cos(t) - uy * Math.sin(t), ux * Math.sin(t) + uy * Math.cos(t)];
          const [s1, s2] = [rot(0.6), rot(-0.6)];
          const [d1, d2] = [rub(a, ...s1), rub(a, ...s2)];
          const P0 = [a.x + s1[0] * d1, a.y + s1[1] * d1];
          const P3 = [a.x + s2[0] * d2, a.y + s2[1] * d2];
          const [c1, c2] = [rot(0.75), rot(-0.75)];
          const C1 = [a.x + c1[0] * (d1 + 40), a.y + c1[1] * (d1 + 40)];
          const C2 = [a.x + c2[0] * (d2 + 40), a.y + c2[1] * (d2 + 40)];
          const [vx, vy] = jed(P3[0] - C2[0], P3[1] - C2[1]);
          const kraj = [P3[0] - vx * 8, P3[1] - vy * 8];
          out.push({ id: `${a.k}-${b.k}`, petlja: true, cvor: a.k, k: kljucPara(a.e, b.e), opis: `${a.t} → ${b.t}`, st, d: `M${r1(P0[0])},${r1(P0[1])} C${r1(C1[0])},${r1(C1[1])} ${r1(C2[0])},${r1(C2[1])} ${r1(kraj[0])},${r1(kraj[1])}`, vrh: vrh(P3[0], P3[1], vx, vy) });
          continue;
        }
        // par u oba smjera: dva luka, svaki na svojoj strani
        const obostrano = vidljiv(b, a);
        const [dx, dy] = [b.x - a.x, b.y - a.y];
        const [nx, ny] = jed(-dy, dx);
        const pomak = obostrano ? 20 : 0;
        const C = [(a.x + b.x) / 2 + nx * pomak, (a.y + b.y) / 2 + ny * pomak];
        const [ux, uy] = jed(C[0] - a.x, C[1] - a.y);
        const [vx, vy] = jed(b.x - C[0], b.y - C[1]);
        const P0 = [a.x + ux * rub(a, ux, uy), a.y + uy * rub(a, ux, uy)];
        const P2 = [b.x - vx * rub(b, vx, vy), b.y - vy * rub(b, vx, vy)];
        const kraj = [P2[0] - vx * 8, P2[1] - vy * 8];
        out.push({ id: `${a.k}-${b.k}`, k: kljucPara(a.e, b.e), opis: `${a.t} → ${b.t}`, st, d: `M${r1(P0[0])},${r1(P0[1])} Q${r1(C[0])},${r1(C[1])} ${r1(kraj[0])},${r1(kraj[1])}`, vrh: vrh(P2[0], P2[1], vx, vy) });
      }
    return out;
  });
  // okvir crteža: čvorovi i, gdje ih ima, petlje (petlja strši oko 45 px prema van)
  const okvir = $derived.by(() => {
    const petlja = new Set(bridovi.filter((b) => b.petlja).map((b) => b.cvor));
    const m = (c) => (petlja.has(c.k) ? 52 : 8);
    const x0 = Math.min(...cvorovi.map((c) => c.x - c.hw - m(c)));
    const x1 = Math.max(...cvorovi.map((c) => c.x + c.hw + m(c)));
    const y0 = Math.min(...cvorovi.map((c) => c.y - c.hh - m(c)));
    const y1 = Math.max(...cvorovi.map((c) => c.y + c.hh + m(c)));
    return { x: r1(x0), y: r1(y0), w: r1(x1 - x0), h: r1(y1 - y0) };
  });
  const opisGrafa = $derived(`Graf relacije: ${bridovi.length ? bridovi.map((b) => b.opis).join(", ") : "nema parova"}.`);

  // ── svojstva ──
  let oznacena = $state([]);
  const ponudena = $derived(ponudenaSvojstva(spec));
  const tocnaSvojstva = $derived(nacin === "svojstva" ? svojstvaRelacije(spec) : []);
  function prebaciSvojstvo(p) {
    if (locked) return;
    oznacena = oznacena.includes(p) ? oznacena.filter((x) => x !== p) : [...oznacena, p];
  }
  const NASLOV = { refleksivna: "Refleksivna", simetricna: "Simetrična", antisimetricna: "Antisimetrična", tranzitivna: "Tranzitivna" };

  // ── klase ──
  let razredi = $state([]); // popisi ključeva
  let odabran = $state(null); // ključ odabranog elementa
  const nerazvrstani = $derived(E.map(kljuc).filter((k) => !razredi.some((r) => r.includes(k))));
  const gdjeOdabran = $derived(odabran == null ? null : razredi.findIndex((r) => r.includes(odabran)));
  const tocniRazredi = $derived(nacin === "klase" ? razrediRelacije(spec).map((r) => r.map(kljuc)) : []);
  const prikazaniRazredi = $derived(pokazi ? tocniRazredi : razredi);
  function odaberi(k) {
    if (locked) return;
    odabran = odabran === k ? null : k;
  }
  function stavi(i) {
    if (locked || odabran == null) return;
    const k = odabran;
    let novi = razredi.map((r) => r.filter((x) => x !== k));
    if (i === "novi") novi.push([k]);
    else if (i !== "van") novi[i] = [...novi[i], k];
    // prazni razredi nestaju; redoslijed elemenata u razredu kao u skupu
    const red = E.map(kljuc);
    razredi = novi.filter((r) => r.length).map((r) => [...r].sort((x, y) => red.indexOf(x) - red.indexOf(y)));
    odabran = null;
    diran = true;
  }
  const brojRazreda = (i) => `${i + 1}. razred`;
</script>

{#snippet tablica(interaktivna)}
  <div class="rl-tab-wrap">
    <table class="rl-tab" aria-label="Tablica relacije: redak je prvi element para, stupac drugi">
      <thead>
        <tr>
          <th class="rl-kut" scope="col"><Md text={ime} inline /></th>
          {#each E as b (kljuc(b))}<th scope="col">{tekstElementa(b)}</th>{/each}
        </tr>
      </thead>
      <tbody>
        {#each E as a (kljuc(a))}
          <tr>
            <th scope="row">{tekstElementa(a)}</th>
            {#each E as b (kljuc(b))}
              {@const st = stanje(a, b)}
              {@const k = kljucPara(a, b)}
              <td class:dijag={kljuc(a) === kljuc(b)}>
                {#if interaktivna && !R.has(k)}
                  <button class="rl-cell {st}" class:upozori={upozoriPar === k} disabled={locked} aria-pressed={dodano.includes(k)} aria-label={`Par ${par(a, b)}: ${OPIS_STANJA[st]}`} onclick={() => prebaci(a, b)}>
                    <span class="rl-dot"></span>
                  </button>
                {:else}
                  <span class="rl-cell {st}" class:upozori={upozoriPar === k} class:zakljucan={interaktivna}>
                    <span class="rl-dot"></span>
                    {#if st !== "prazno"}<span class="sr-only">Par {par(a, b)}: {OPIS_STANJA[st]}</span>{/if}
                  </span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/snippet}

{#snippet graf()}
  <figure class="lx-figure rl-graf" style:width={`min(100%, ${okvir.w}px)`}>
    <svg viewBox={`${okvir.x} ${okvir.y} ${okvir.w} ${okvir.h}`} role="img" aria-label={opisGrafa}>
      {#each bridovi as b (b.id)}
        <g class="rl-brid {b.st}" class:upozori={upozoriPar === b.k}>
          <path d={b.d} />
          <polygon points={b.vrh} />
        </g>
      {/each}
      {#each cvorovi as c (c.k)}
        <g class="rl-cvor" class:upozori={upozoriEl.has(c.k)}>
          <rect x={r1(c.x - c.hw)} y={r1(c.y - c.hh)} width={r1(2 * c.hw)} height={2 * c.hh} rx={c.hh} />
          <text x={r1(c.x)} y={r1(c.y)} dy="0.35em" text-anchor="middle">{c.t}</text>
        </g>
      {/each}
    </svg>
  </figure>
{/snippet}

{#snippet cip(k, interaktivan)}
  {#if interaktivan}
    <button class="rl-cip" class:odabran={odabran === k} class:upozori={upozoriEl.has(k)} disabled={locked} aria-pressed={odabran === k} aria-label={`Element ${tekstElementa(poKljucu.get(k))}${odabran === k ? ", odabran" : ""}`} onclick={() => odaberi(k)}>{tekstElementa(poKljucu.get(k))}</button>
  {:else}
    <span class="rl-cip" class:ok={pokazi || ishod?.tocno} class:upozori={upozoriEl.has(k)}>{tekstElementa(poKljucu.get(k))}</span>
  {/if}
{/snippet}

{#snippet cipovi(r, interaktivni)}
  <!-- zagrade se drže prvog i zadnjeg elementa, da „}“ ne ostane sama u novom retku -->
  {#each r as k, j (k)}
    <span class="rl-grupa">{#if j === 0}<span class="rl-zag">{"{"}</span>{/if}{@render cip(k, interaktivni)}{#if j === r.length - 1}<span class="rl-zag">{"}"}</span>{/if}</span>
  {/each}
{/snippet}

<div class="lx-question"><Md text={spec.tekst} /></div>

{#if vidi.length}
  <div class="rl-crtezi">
    {#if vidi.includes("tablica")}
      <div class="rl-crtez">
        {@render tablica(nacin === "nadopuni")}
        <p class="lx-hint rl-uputa">
          {#if nacin === "nadopuni"}Redak je prvi element para, stupac drugi. Dodirni prazno polje da dodaš par; zadani parovi su zaključani.{:else}Redak je prvi element para, stupac drugi.{/if}
        </p>
      </div>
    {/if}
    {#if vidi.includes("graf")}{@render graf()}{/if}
  </div>
  {#if nacin === "nadopuni"}
    <div class="rl-legenda" aria-hidden="true">
      <span><span class="rl-mini zadan"></span>zadano</span>
      <span><span class="rl-mini {ishod?.tocno || pokazi ? 'ok' : 'dodan'}"></span>dodao si</span>
      {#if pokazi}<span><span class="rl-mini fali"></span>fali</span><span><span class="rl-mini visak"></span>nije potrebno</span>{/if}
    </div>
  {/if}
{/if}

{#if nacin === "nadopuni"}
  <div class="lx-actions">
    <button class="btn btn-primary" disabled={locked || !dodano.length} onclick={posaljiParove}>Provjeri</button>
  </div>
{:else if nacin === "svojstva"}
  <span class="lx-hint rl-uputa">Označi sva svojstva koja relacija ima. Ako nema nijedno, samo provjeri.</span>
  <div class="lx-options rl-svojstva">
    {#each ponudena as p (p)}
      {@const da = oznacena.includes(p)}
      {@const tocno = tocnaSvojstva.includes(p)}
      <button
        class="lx-option"
        class:sel={da && !pokazi && !ishod?.tocno}
        class:ok={(pokazi && tocno) || (ishod?.tocno && da)}
        class:bad={pokazi && da && !tocno}
        disabled={locked}
        aria-pressed={da}
        aria-label={`${NAZIV_SVOJSTVA[p]}${pokazi ? (tocno ? ": ima" : ": nema") : ""}`}
        onclick={() => prebaciSvojstvo(p)}
      >
        <span class="lx-mark box">{da || (pokazi && tocno) ? "✓" : ""}</span>
        <span>{NASLOV[p]}</span>
      </button>
    {/each}
  </div>
  <div class="lx-actions">
    <button class="btn btn-primary" disabled={locked} onclick={() => onodgovor([...oznacena])}>Provjeri</button>
  </div>
{:else if nacin === "klase"}
  <div class="rl-klase">
    {#if !pokazi}
      {#if odabran != null && gdjeOdabran >= 0 && !locked}
        <button class="rl-skup rl-meta" onclick={() => stavi("van")} aria-label={`Vrati ${tekstElementa(poKljucu.get(odabran))} među nerazvrstane`}>
          <span class="rl-nasl">Nerazvrstani</span>
          <span class="rl-cipovi">{#each nerazvrstani as k (k)}{@render cip(k, false)}{/each}<span class="rl-ovdje">vrati ovamo</span></span>
        </button>
      {:else if nerazvrstani.length}
        <div class="rl-skup rl-bazen">
          <span class="rl-nasl">Nerazvrstani</span>
          <span class="rl-cipovi">{#each nerazvrstani as k (k)}{@render cip(k, true)}{/each}</span>
        </div>
      {/if}
    {/if}
    {#each prikazaniRazredi as r, i (i)}
      {#if !pokazi && odabran != null && gdjeOdabran !== i && !locked}
        <button class="rl-skup rl-razred rl-meta" onclick={() => stavi(i)} aria-label={`Stavi ${tekstElementa(poKljucu.get(odabran))} u ${brojRazreda(i)}`}>
          <span class="rl-nasl">{brojRazreda(i)}</span>
          <span class="rl-cipovi">{@render cipovi(r, false)}<span class="rl-ovdje">stavi ovdje</span></span>
        </button>
      {:else}
        <div class="rl-skup rl-razred" class:ok={pokazi || ishod?.tocno}>
          <span class="rl-nasl">{brojRazreda(i)}</span>
          <span class="rl-cipovi">{@render cipovi(r, !pokazi && !ishod?.tocno)}</span>
        </div>
      {/if}
    {/each}
    {#if !pokazi && !locked}
      <button class="rl-novi" disabled={odabran == null} onclick={() => stavi("novi")}>
        + Novi razred{#if odabran != null}<span class="rl-za">&nbsp;za {tekstElementa(poKljucu.get(odabran))}</span>{/if}
      </button>
      <span class="lx-hint rl-uputa">Dodirni element, pa razred u koji ide (ili „Novi razred“).</span>
    {/if}
  </div>
  <div class="lx-actions">
    <button class="btn btn-primary" disabled={locked || nerazvrstani.length > 0} onclick={() => onodgovor(razredi.map((r) => r.map((k) => poKljucu.get(k))))}>Provjeri</button>
  </div>
{/if}

<style>
  .rl-crtezi {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px 20px;
    margin: 4px 0 6px;
  }
  .rl-crtez {
    max-width: 100%;
  }
  .rl-tab-wrap {
    max-width: 100%;
    overflow-x: auto;
  }
  .rl-tab {
    --rl-c: 40px;
    border-collapse: separate;
    border-spacing: 3px;
    margin: 0 auto;
  }
  @media (min-width: 480px) {
    .rl-tab {
      --rl-c: 44px;
    }
  }
  .rl-tab th {
    font-size: 13.5px;
    font-weight: 500;
    color: var(--text-dim);
    white-space: nowrap;
    padding: 0 4px;
    text-align: center;
  }
  .rl-tab thead th {
    padding-bottom: 2px;
  }
  .rl-tab tbody th {
    text-align: right;
    padding-right: 6px;
  }
  .rl-kut {
    color: var(--text);
  }
  .rl-tab td {
    padding: 0;
  }
  .rl-cell {
    width: var(--rl-c);
    height: var(--rl-c);
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-elev);
    color: var(--text);
    transition:
      border-color 0.12s,
      background 0.12s;
  }
  .dijag .rl-cell {
    background: var(--bg-elev-2);
  }
  button.rl-cell {
    cursor: pointer;
    touch-action: manipulation;
  }
  button.rl-cell:hover:not(:disabled) {
    border-color: var(--border-strong);
  }
  button.rl-cell:disabled {
    cursor: default;
  }
  .rl-dot {
    width: 14px;
    height: 14px;
    border-radius: 999px;
  }
  .zadan .rl-dot {
    background: var(--text);
  }
  .zakljucan.zadan {
    border-style: solid;
    border-color: var(--border-strong);
  }
  .dodan {
    border-color: var(--primary-border);
    background: var(--primary-dim) !important;
  }
  .dodan .rl-dot {
    background: var(--primary);
  }
  .ok {
    border-color: var(--lx-ok);
  }
  .ok .rl-dot {
    background: var(--lx-ok);
  }
  .fali {
    border: 1.5px dashed var(--lx-ok);
  }
  .fali .rl-dot {
    border: 2px solid var(--lx-ok);
  }
  .visak {
    border-color: var(--lx-bad);
    background: color-mix(in srgb, var(--lx-bad) 10%, transparent) !important;
  }
  .visak .rl-dot {
    background: var(--lx-bad);
  }
  .rl-cell.ist {
    border-color: var(--primary);
    background: var(--primary-dim) !important;
  }
  .nedostaje {
    border: 1.5px dashed var(--primary);
  }
  .nedostaje .rl-dot {
    border: 2px dashed var(--primary);
  }
  .rl-cell.upozori {
    box-shadow: 0 0 0 2px var(--lx-bad);
  }
  .rl-uputa {
    text-align: center;
    margin: 2px 0 6px;
  }

  .rl-legenda {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 14px;
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .rl-legenda > span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }
  .rl-mini {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    border: 0 !important;
    background: none !important;
  }
  .rl-mini.zadan {
    background: var(--text) !important;
  }
  .rl-mini.dodan {
    background: var(--primary) !important;
  }
  .rl-mini.ok {
    background: var(--lx-ok) !important;
  }
  .rl-mini.fali {
    border: 2px solid var(--lx-ok) !important;
  }
  .rl-mini.visak {
    background: var(--lx-bad) !important;
  }

  /* graf */
  .rl-graf {
    margin: 0;
  }
  .rl-brid path {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.6;
  }
  .rl-brid polygon {
    fill: var(--text-dim);
    stroke: none;
  }
  .rl-brid.dodan path,
  .rl-brid.ist path,
  .rl-brid.nedostaje path {
    stroke: var(--primary);
    stroke-width: 2.2;
  }
  .rl-brid.dodan polygon,
  .rl-brid.ist polygon,
  .rl-brid.nedostaje polygon {
    fill: var(--primary);
  }
  .rl-brid.nedostaje path,
  .rl-brid.fali path {
    stroke-dasharray: 5 4;
  }
  .rl-brid.ok path,
  .rl-brid.fali path {
    stroke: var(--lx-ok);
    stroke-width: 2.2;
  }
  .rl-brid.ok polygon,
  .rl-brid.fali polygon {
    fill: var(--lx-ok);
  }
  .rl-brid.visak path {
    stroke: var(--lx-bad);
    stroke-width: 2.2;
  }
  .rl-brid.visak polygon {
    fill: var(--lx-bad);
  }
  .rl-cvor rect {
    fill: var(--bg-elev);
    stroke: var(--border-strong);
    stroke-width: 1.4;
  }
  .rl-cvor text {
    fill: var(--text);
    font-size: 14px;
    font-family: var(--font-sans);
  }
  .rl-cvor.upozori rect {
    stroke: var(--lx-bad);
    stroke-width: 2.2;
  }

  /* svojstva */
  .rl-svojstva {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  /* klase */
  .rl-klase {
    display: grid;
    gap: 8px;
  }
  .rl-skup {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
    width: 100%;
    min-height: 52px;
    padding: 8px 10px;
    text-align: left;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    color: var(--text);
  }
  .rl-bazen {
    background: var(--bg-elev-2);
  }
  .rl-razred.ok {
    border-color: var(--lx-ok);
  }
  button.rl-meta {
    cursor: pointer;
    border: 1.5px dashed var(--primary);
    background: var(--primary-dim);
    touch-action: manipulation;
  }
  .rl-nasl {
    flex: 0 0 auto;
    min-width: 76px;
    font-size: 12.5px;
    color: var(--text-faint);
  }
  .rl-cipovi {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    flex: 1 1 160px;
  }
  .rl-grupa {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .rl-zag {
    color: var(--text-faint);
    font-size: 18px;
    line-height: 1;
  }
  .rl-cip {
    min-width: 40px;
    height: 40px;
    padding: 0 10px;
    display: inline-grid;
    place-items: center;
    font-size: 15px;
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    background: var(--bg-elev);
    color: var(--text);
    white-space: nowrap;
  }
  button.rl-cip {
    cursor: pointer;
    touch-action: manipulation;
  }
  button.rl-cip:disabled {
    cursor: default;
  }
  .rl-cip.odabran {
    border: 2px solid var(--primary);
    background: var(--primary-dim);
    font-weight: 600;
  }
  .rl-cip.ok {
    border-color: var(--lx-ok);
  }
  .rl-cip.upozori {
    border: 2px solid var(--lx-bad);
  }
  .rl-ovdje {
    margin-left: auto;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--primary);
    white-space: nowrap;
  }
  .rl-novi {
    min-height: 44px;
    padding: 8px 12px;
    border: 1.5px dashed var(--border-strong);
    border-radius: var(--r-lg);
    background: none;
    color: var(--text-dim);
    font-size: 14px;
    cursor: pointer;
  }
  .rl-novi:not(:disabled) {
    border-color: var(--primary);
    color: var(--primary);
    background: var(--primary-dim);
  }
  .rl-novi:disabled {
    cursor: default;
    opacity: 0.7;
  }
  .rl-za {
    font-weight: 600;
  }
</style>
