<script>
  // titracija: SVG bireta (očitanje s dvije decimale) iznad Erlenmeyerove tikvice u boji indikatora, uz to krivulja
  // pH–V. Sav račun (pH u svakoj točki, V ekvivalencije, jednadžba, omjer, prikladni indikatori, pufer) je u
  // katalog/kemija/titracija.js; ovdje je samo prikaz. Boje indikatora su kemijski podatak (iz ph_skala.js).
  // U „Tvoj red“ krivulja i oznaka točke ekvivalencije ne vide se prije provjere: kod „ekvivalencija“ učenik vidi
  // samo boju u tikvici i očitanje birete. Kap pada CSS animacijom; uz prefers-reduced-motion vidi se odmah stanje.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import Formula from "./Formula.svelte";
  import { formatNumber, formatSci } from "$lib/lesson/core/number.js";
  import { INDIKATORI, bojaNaPH, bojeZa, bojaPoId, zapisPH } from "$lib/lesson/katalog/kemija/ph_skala.js";
  import {
    titracija,
    modelOf,
    prikladni,
    lanacOf,
    puferModel,
    reakcijaPufera,
    trazeno,
    indId,
    KAP,
    zapisMl,
    zapisV,
    zapisCZadan,
  } from "$lib/lesson/katalog/kemija/titracija.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const s = untrack(() => spec);
  const nacin = s.nacin;
  const istrazi = nacin === "istrazi";
  const ekv = nacin === "ekvivalencija";
  const racun = nacin === "izracunaj";
  const izborInd = nacin === "indikator";
  const pufer = nacin === "pufer";
  const uid = Math.random().toString(36).slice(2, 8);

  const m = pufer ? null : modelOf(s);
  const aktivno = $derived(!locked && !pokazi);
  const rijeseno = $derived(!!ishod?.tocno || pokazi);
  const r2 = (x) => Math.round(x * 100) / 100;

  // ── volumen titranta ──
  const traziC = racun && trazeno(s) === "c_analit";
  const maxV = m ? (istrazi ? m.osDo : m.bireta) : 0;
  let V = $state(traziC ? s.utroseno.V : 0);
  let kapi = $state(0); // brojač za animaciju kapi
  let zaustavljeno = $state(null); // volumen kod kojeg je učenik provjerio (ekvivalencija)
  function dodaj(dv) {
    if (V >= maxV) return;
    V = r2(Math.min(maxV, V + dv));
    kapi++;
  }
  function ispocetka() {
    V = 0;
    kapi = 0;
  }
  const pH = $derived(m ? m.pH(V) : 7);
  const ind = m?.ind ?? null;
  // u računu je zadan volumen „do promjene boje“: tikvica se crta kap iza njega, kad je boja već promijenjena
  const pHBoje = $derived(racun && traziC ? m.pH(V + KAP) : pH);
  const bojaTikvice = $derived(ind ? bojaNaPH(ind, pHBoje) : null);
  const nazivBoje = (i, p) => bojaPoId(i, bojeZa(i, p)[0])?.naziv ?? "";

  // ── crtež: bireta i tikvica (viewBox 0 0 120 300) ──
  const BIR = m?.bireta ?? 50;
  const Y0 = 16;
  const Y1 = 186;
  const yBir = (v) => Y0 + (Math.max(0, Math.min(BIR, v)) / BIR) * (Y1 - Y0);
  const oznakaSvakih = BIR >= 50 ? 10 : BIR >= 25 ? 5 : 2;
  const crtice = Array.from({ length: BIR + 1 }, (_, i) => i);
  const yTikvice = $derived(m ? 289 - (30 * (m.Va + V)) / (m.Va + m.bireta) : 280);

  // ── graf pH–V ──
  const GW = 320;
  const GH = 210;
  const GL = 30;
  const GR = 12;
  const GT = 10;
  const GB = 24;
  const gDo = $derived(m ? (ekv ? Math.max(m.osDo, Math.min(m.bireta, Math.ceil((zaustavljeno ?? V) / 5) * 5)) : m.osDo) : 1);
  const gx = (v) => GL + (v / gDo) * (GW - GL - GR);
  const gy = (p) => GT + ((14 - Math.max(0, Math.min(14, p))) / 14) * (GH - GT - GB);
  const korakX = $derived(gDo <= 12 ? 2 : gDo <= 30 ? 5 : 10);
  const ticksX = $derived(Array.from({ length: Math.floor(gDo / korakX) + 1 }, (_, i) => i * korakX));
  const tocke = $derived.by(() => {
    if (!m) return [];
    const N = 260;
    const vs = Array.from({ length: N + 1 }, (_, i) => (gDo * i) / N);
    for (const d of [0.01, 0.02, 0.05, 0.1, 0.2, 0.4, 0.7]) vs.push(m.Vekv - d, m.Vekv + d);
    vs.push(m.Vekv);
    return [...new Set(vs.filter((v) => v >= 0 && v <= gDo))].sort((a, b) => a - b).map((v) => [v, m.pH(v)]);
  });
  const crta = (pts) => pts.map(([v, p]) => `${gx(v).toFixed(1)},${gy(p).toFixed(1)}`).join(" ");
  const krivuljaTocke = $derived(istrazi ? [...tocke.filter(([v]) => v < V), [V, pH]] : tocke);
  const prikaziGraf = $derived(!!m && (istrazi || rijeseno || (izborInd && s.krivulja === true)));
  const prikaziEkv = $derived(!!m && (istrazi ? V >= m.Vekv - 1e-9 : rijeseno));
  const slabo = m ? !m.an.jaka : false;
  const polaEkv = $derived(!!m && slabo && (istrazi ? V >= m.Vekv / 2 : rijeseno));
  const pojasi = $derived.by(() => {
    if (!m) return [];
    if (izborInd) return rijeseno ? ponudeni.map((i) => ({ i, dobar: prikladni(m).includes(i) })).filter((x) => INDIKATORI[x.i].prijelaz) : [];
    return ind && INDIKATORI[ind].prijelaz ? [{ i: ind, dobar: true }] : [];
  });

  // stanje u tikvici (istraživanje)
  const konj = m ? (m.an.priroda === "kiselina" ? m.jed?.anion : m.jed?.kation) : null;
  const stanjeTikvice = $derived.by(() => {
    if (!m) return "";
    if (V <= 0) return `u tikvici je samo ${m.an.formula}`;
    if (Math.abs(V - m.Vekv) < KAP / 2) return slabo && konj ? `točka ekvivalencije: ${konj} hidrolizira, pH ${m.pHekv > 7 ? ">" : "<"} 7` : "točka ekvivalencije: n(H₃O⁺) = n(OH⁻)";
    if (V < m.Vekv) return slabo && konj ? `pufer: ${m.an.formula} i ${konj}` : `višak ${m.an.formula}`;
    return `višak ${m.ti.formula}`;
  });

  // ── ekvivalencija ──
  function zaustavi() {
    if (!aktivno || V <= 0) return;
    zaustavljeno = V;
    onodgovor({ V });
  }
  $effect(() => {
    if (!pokazi || !ekv) return;
    untrack(() => {
      if (zaustavljeno == null) zaustavljeno = V > 0 ? V : null;
      V = r2(m.Vekv);
    });
  });

  // ── izračun ──
  const koraci = racun ? lanacOf(s, m) : [];
  let unosi = $state(koraci.map(() => ""));
  const potpun = $derived(unosi.every((v) => String(v).trim()));
  const okKorak = (i) => !!ishod?.tocno || (ishod != null && ishod.praznina != null && ishod.praznina > i);
  const badKorak = (i) => ishod != null && !ishod.tocno && ishod.praznina === i && !ishod.prazno;
  function potencija(i) {
    const v = String(unosi[i]).trim();
    if (!/10\^/.test(v)) unosi[i] = `${v || "1"}·10^-`;
    document.getElementById(`tt-${uid}-${i}`)?.focus();
  }
  function predajRacun(e) {
    e.preventDefault();
    if (aktivno && potpun) onodgovor({ koraci: $state.snapshot(unosi) });
  }
  // primjer zapisa uz ·10ⁿ: broj koji nije ni blizu nijednog točnog odgovora
  const primjerN = ["3,25·10^-4", "7,5·10^-3", "1,16·10^-2"].find((t, i) => koraci.every((k) => Math.abs(Math.log10(k.vrijednost) - Math.log10([3.25e-4, 7.5e-3, 1.16e-2][i])) > 0.3)) ?? "3,25·10^-4";
  let sirinaLanca = $state(0);
  const vodoravno = $derived(sirinaLanca >= 190 * koraci.length);

  // ── indikator ──
  const ponudeni = izborInd ? (s.ponudeni ?? ["fenolftalein", "metiloranz"]).map(indId) : [];
  let izbor = $state([]);
  function prebaci(i) {
    if (!aktivno) return;
    izbor = izbor.includes(i) ? izbor.filter((x) => x !== i) : [...izbor, i];
  }
  $effect(() => {
    if (!pokazi || !izborInd) return;
    untrack(() => (izbor = prikladni(m)));
  });
  const intervali = s.intervali !== false;
  const zapisInt = (i) => INDIKATORI[i].prijelaz?.map((x) => formatNumber(x)).join("–");

  // ── pufer ──
  const pm = pufer ? puferModel(s) : null;
  let kapiP = $state(pm ? pm.dodatak.map(() => 0) : []);
  let kapP = $state(0);
  function kapni(i, n) {
    if (kapiP.reduce((a, x) => a + x, 0) + n > 60) return;
    kapiP[i] += n;
    kapP++;
  }
  function isprazniP() {
    kapiP = kapiP.map(() => 0);
    kapP = 0;
  }
  const pH0 = pm ? { voda: pm.pH(false, pm.dodatak.map(() => 0)), pufer: pm.pH(true, pm.dodatak.map(() => 0)) } : null;
  const pHP = $derived(pm ? { voda: pm.pH(false, kapiP), pufer: pm.pH(true, kapiP) } : null);
  const tisuce = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  function promjena(p0, p) {
    const f = 10 ** (p0 - p);
    if (Math.abs(p0 - p) < 0.005) return "";
    const x = f >= 1 ? f : 1 / f;
    const t = x >= 100 ? tisuce(Number(x.toPrecision(2))) : formatNumber(Number(x.toPrecision(2)));
    return `c(H₃O⁺) ${f >= 1 ? "porasla" : "pala"} ${t} puta`;
  }

  // ── zajedničko ──
  const jednadzbaVidljiva = $derived(!!m?.jed && (istrazi ? s.jednadzba !== false : s.jednadzba === true || rijeseno));
  const tocanTekst = $derived(pokazi ? titracija.tocanOdgovor(s) : "");
  let sirina = $state(0);
  const siroko = $derived(sirina >= 620);
  const cSkrivena = ekv || traziC;
</script>

{#snippet tekst(t)}{#each String(t).split(" ") as w, k (k)}{k ? " " : ""}<Formula f={w} />{/each}{/snippet}

{#snippet jednadzba(j)}
  <div class="tt-eq" aria-label="Jednadžba neutralizacije">
    {#each j.lijevo as c, k (k)}
      <span class="tt-par">{#if k}<span class="tt-plus">+</span>{/if}{#if c.k > 1}<span class="tt-k">{c.k}</span>{/if}<Formula f={c.f} /></span>
    {/each}
    <span class="tt-par"><span class="tt-str">→</span>{#if j.desno[0].k > 1}<span class="tt-k">{j.desno[0].k}</span>{/if}<Formula f={j.desno[0].f} /></span>
    {#each j.desno.slice(1) as c, k (k)}
      <span class="tt-par"><span class="tt-plus">+</span>{#if c.k > 1}<span class="tt-k">{c.k}</span>{/if}<Formula f={c.f} /></span>
    {/each}
  </div>
{/snippet}

{#snippet podaci()}
  <div class="tt-podaci">
    <div class="tt-red">
      <span class="tt-uloga">tikvica</span>
      <span class="tt-formula"><Formula f={m.an.formula} /></span>
      {#if m.an.naziv}<span class="tt-naziv">{m.an.naziv}</span>{/if}
      {#if s.analit.V != null}<span class="tt-chip">V = {zapisV(s.analit)}</span>{/if}
      {#if cSkrivena}<span class="tt-chip">c = ?</span>{:else if s.analit.c != null}<span class="tt-chip"><Formula f={`c = ${zapisCZadan(s.analit)}`} /></span>{/if}
      {#if m.an.Kzadan != null}<span class="tt-chip">K<sub>{m.an.Kime === "Kb" ? "b" : "a"}</sub> = <Formula f={`${s.analit.zapis_K ?? formatSci(m.an.Kzadan)} mol/dm³`} /></span>{/if}
    </div>
    <div class="tt-red">
      <span class="tt-uloga">bireta</span>
      <span class="tt-formula"><Formula f={m.ti.formula} /></span>
      {#if m.ti.naziv}<span class="tt-naziv">{m.ti.naziv}</span>{/if}
      {#if s.titrant.c != null}<span class="tt-chip"><Formula f={`c = ${zapisCZadan(s.titrant)}`} /></span>{/if}
    </div>
    {#if ind || traziC}
      <div class="tt-red">
        {#if ind}<span class="tt-uloga">indikator</span><span class="tt-naziv">{INDIKATORI[ind].naziv}</span>{/if}
        {#if traziC}<span class="tt-chip tt-chip-jak">utrošeno: V(<Formula f={m.ti.formula} />) = {s.utroseno.zapis ?? formatNumber(s.utroseno.V)} mL</span>{/if}
      </div>
    {/if}
  </div>
{/snippet}

{#snippet aparat()}
  <svg class="tt-svg" viewBox="0 0 120 300" role="img" aria-label="Bireta s {m.ti.formula} iznad tikvice s {m.an.formula}; očitanje {zapisMl(V)} mL{ind ? `; ${INDIKATORI[ind].naziv} ${nazivBoje(ind, pHBoje)}` : ''}">
    <defs>
      <clipPath id="tt-{uid}-t"><path d="M50.8 236 V252.5 L19 292 Q17 297 22 297 H98 Q103 297 101 292 L69.2 252.5 V236 Z" /></clipPath>
      <clipPath id="tt-{uid}-b"><path d="M53 6 V192 L58 200 V224 H62 V200 L67 192 V6 Z" /></clipPath>
    </defs>
    <!-- stalak -->
    <line class="tt-stalak" x1="106" y1="4" x2="106" y2="298" />
    <line class="tt-stalak" x1="68" y1="58" x2="106" y2="58" />
    <!-- bireta: tekućina od očitanja do vrha -->
    <g clip-path="url(#tt-{uid}-b)">
      <rect class="tt-titrant" x="50" y={yBir(V)} width="20" height={230 - yBir(V)} />
    </g>
    {#each crtice as i (i)}
      {@const y = yBir(i)}
      <line class="tt-crtica" x1="52" y1={y} x2={i % 5 === 0 ? 59 : 56} y2={y} />
      {#if i % oznakaSvakih === 0}<text class="tt-broj" x="49" y={y + 3}>{i}</text>{/if}
    {/each}
    <line class="tt-menisk" x1="53" y1={yBir(V)} x2="67" y2={yBir(V)} />
    <path class="tt-pokazivac" d="M70 {yBir(V)} l6 -4 v8 Z" />
    <path class="tt-staklo" d="M52 6 V192 L57 200 V224 h6 V200 L68 192 V6" />
    <rect class="tt-slavina" x="47" y="200" width="26" height="6" rx="2" />
    <!-- kap -->
    {#if kapi > 0}
      {#key kapi}
        <circle class="tt-kap" cx="60" cy="228" r="2.4" style="--pad: {yTikvice - 230}px" />
      {/key}
    {/if}
    <!-- tikvica -->
    <g clip-path="url(#tt-{uid}-t)">
      <rect class="tt-voda" x="0" y={yTikvice} width="120" height={300 - yTikvice} />
      {#if bojaTikvice}<rect class="tt-boja" x="0" y={yTikvice} width="120" height={300 - yTikvice} style="fill: {bojaTikvice}" />{/if}
    </g>
    <path class="tt-staklo" d="M50 234 V252 L18 291.5 Q15.5 298 22 298 H98 Q104.5 298 102 291.5 L70 252 V234" />
  </svg>
{/snippet}

{#snippet graf()}
  <figure class="tt-graf">
    <svg viewBox="0 0 {GW} {GH}" role="img" aria-label="Krivulja titracije: pH ovisno o dodanom volumenu {m.ti.formula}">
      {#each pojasi as b (b.i)}
        {@const [a, c] = INDIKATORI[b.i].prijelaz}
        <rect class="tt-pojas" class:los={!b.dobar} x={GL} y={gy(c)} width={GW - GL - GR} height={gy(a) - gy(c)} style="fill: {bojaNaPH(b.i, (a + c) / 2)}" />
        <text class="tt-pojas-t" x={GW - GR - 4} y={gy(c) + 10} text-anchor="end">{INDIKATORI[b.i].kratko}</text>
      {/each}
      {#each [0, 2, 4, 6, 8, 10, 12, 14] as p (p)}
        <line class="tt-mreza" x1={GL} y1={gy(p)} x2={GW - GR} y2={gy(p)} />
        <text class="tt-tick" x={GL - 5} y={gy(p) + 3.5} text-anchor="end">{p}</text>
      {/each}
      <line class="tt-neutral" x1={GL} y1={gy(7)} x2={GW - GR} y2={gy(7)} />
      {#each ticksX as v (v)}
        <line class="tt-os" x1={gx(v)} y1={GH - GB} x2={gx(v)} y2={GH - GB + 4} />
        <text class="tt-tick" x={gx(v)} y={GH - GB + 15} text-anchor="middle">{v}</text>
      {/each}
      <line class="tt-os" x1={GL} y1={GT - 4} x2={GL} y2={GH - GB} />
      <line class="tt-os" x1={GL} y1={GH - GB} x2={GW - GR} y2={GH - GB} />
      <text class="tt-osT" x={GL + 4} y={GT + 4}>pH</text>
      {#if prikaziEkv}
        {@const ex = gx(m.Vekv)}
        {@const ey = gy(m.pHekv)}
        <line class="tt-ekv" x1={ex} y1={ey} x2={ex} y2={GH - GB} />
      {/if}
      <polyline class="tt-krivulja" points={crta(krivuljaTocke)} />
      {#if polaEkv}
        {@const hx = gx(m.Vekv / 2)}
        {@const hy = gy(m.pH(m.Vekv / 2))}
        <circle class="tt-pola" cx={hx} cy={hy} r="3.5" />
        <text class="tt-lbl" x={hx + 6} y={hy + (m.smjer > 0 ? 15 : -8)}>{m.smjer > 0 ? "pH = pK" : "pOH = pK"}<tspan dy="3" font-size="8">{m.smjer > 0 ? "a" : "b"}</tspan></text>
      {/if}
      {#if ekv && rijeseno && zaustavljeno != null && Math.abs(zaustavljeno - m.Vekv) > 0.02}
        <line class="tt-ti" x1={gx(zaustavljeno)} y1={GT} x2={gx(zaustavljeno)} y2={GH - GB} />
        <text class="tt-lbl" x={gx(zaustavljeno) + 4} y={GT + 22}>tvoj kraj</text>
      {/if}
      {#if prikaziEkv}
        {@const ex = gx(m.Vekv)}
        {@const ey = gy(m.pHekv)}
        <!-- oznaka lijevo od točke, na strani gdje krivulje nema (iznad nje kad pH raste, ispod kad pada) -->
        {@const lijevo = ex > GL + 120}
        {@const y1 = m.smjer > 0 === lijevo ? ey - 22 : ey + 18}
        <circle class="tt-tocka-ekv" cx={ex} cy={ey} r="4.5" />
        <text class="tt-lbl jak" x={lijevo ? ex - 8 : ex + 8} y={y1} text-anchor={lijevo ? "end" : "start"}>točka ekvivalencije</text>
        <text class="tt-lbl" x={lijevo ? ex - 8 : ex + 8} y={y1 + 13} text-anchor={lijevo ? "end" : "start"}>{zapisMl(m.Vekv)} mL, pH {zapisPH(m.pHekv)}</text>
      {/if}
      {#if istrazi}<circle class="tt-sad" cx={gx(V)} cy={gy(pH)} r="4" />{/if}
    </svg>
    <figcaption class="tt-osx">V(<Formula f={m.ti.formula} />) / mL</figcaption>
  </figure>
{/snippet}

{#snippet gumbi()}
  <div class="tt-gumbi" role="group" aria-label="Dodaj titrant iz birete">
    <button type="button" class="btn btn-quiet tt-g" disabled={!aktivno || V >= maxV} onclick={() => dodaj(5)}>+5 mL</button>
    <button type="button" class="btn btn-quiet tt-g" disabled={!aktivno || V >= maxV} onclick={() => dodaj(1)}>+1 mL</button>
    <button type="button" class="btn btn-quiet tt-g" disabled={!aktivno || V >= maxV} onclick={() => dodaj(0.1)}>+0,1 mL</button>
    <button type="button" class="btn btn-quiet tt-g" disabled={!aktivno || V >= maxV} onclick={() => dodaj(KAP)}>+1 kap</button>
  </div>
  {#if istrazi}
    <input
      class="tt-klizac"
      type="range"
      min="0"
      max={maxV}
      step={KAP}
      value={V}
      oninput={(e) => (V = r2(Number(e.currentTarget.value)))}
      aria-label="Dodani volumen {m.ti.formula} u mL"
      aria-valuetext="{zapisMl(V)} mL"
    />
  {/if}
  {#if V > 0 && aktivno}<button type="button" class="btn btn-quiet tt-ispocetka" onclick={ispocetka}>Ispočetka (napuni biretu)</button>{/if}
{/snippet}

{#if s.tekst}
  {#if istrazi || pufer}<div class="tt-tekst"><Md text={s.tekst} /></div>{:else}<div class="lx-question"><Md text={s.tekst} /></div>{/if}
{/if}
{#if istrazi || pufer}<p class="tt-hint">{pufer ? "Kapaj i usporedi" : "Dodaji titrant"} – ovo nije zadatak, samo istražuješ.</p>{/if}

<div class="tt" bind:clientWidth={sirina}>
  {#if pufer}
    <div class="tt-podaci">
      <div class="tt-red">
        <span class="tt-uloga">pufer</span>
        {#each [s.pufer.kiselina, s.pufer.sol] as x, k (k)}
          <span class="tt-chip">{#if k}<span class="tt-plus-c">+</span>{/if}<span class="tt-chip-f"><Formula f={x.formula} /></span> <Formula f={`${x.zapis ?? formatNumber(x.c)} mol/dm³`} />{#if x.V != null}, {x.zapis_V ?? formatNumber(x.V)} mL{/if}</span>
        {/each}
      </div>
      <div class="tt-red">
        <span class="tt-chip">u svakoj epruveti {formatNumber(pm.uzorak)} mL</span>
        {#each pm.dodatak as d, i (i)}<span class="tt-chip"><span class="tt-chip-f"><Formula f={d.formula} /></span> <Formula f={`${d.zapis ?? formatNumber(d.c)} mol/dm³`} /></span>{/each}
        <span class="tt-chip">1 kap = 0,05 mL</span>
      </div>
    </div>
    <div class="tt-casse">
      {#each [["voda", "destilirana voda"], ["pufer", "pufer"]] as [k, naslov] (k)}
        <figure class="tt-casa">
          <figcaption class="tt-casa-n">{naslov}</figcaption>
          <svg viewBox="0 0 80 120" width="80" height="120" aria-hidden="true">
            <defs><clipPath id="tt-{uid}-{k}"><path d="M14 18 V104 a10 10 0 0 0 10 10 H56 a10 10 0 0 0 10 -10 V18 Z" /></clipPath></defs>
            {#if kapP > 0}
              {#key kapP}<circle class="tt-kap" cx="40" cy="4" r="2.4" style="--pad: {58}px" />{/key}
            {/if}
            <g clip-path="url(#tt-{uid}-{k})"><rect class="tt-voda" x="0" y="62" width="80" height="60" /></g>
            <path class="tt-staklo" d="M10 16 H14 V104 a10 10 0 0 0 10 10 H56 a10 10 0 0 0 10 -10 V16 H70" />
          </svg>
          <div class="tt-casa-ph">
            <span class="tt-papir" style="background: {bojaNaPH('univerzalni', pHP[k])}" title="univerzalni indikatorski papir"></span>
            <span class="tt-casa-v" aria-live="polite"><span class="tt-casa-l">pH</span> <b>{zapisPH(pHP[k])}</b></span>
          </div>
          <div class="tt-casa-pocetno">početno {zapisPH(pH0[k])}</div>
          {#if promjena(pH0[k], pHP[k])}<div class="tt-casa-pr">{@render tekst(promjena(pH0[k], pHP[k]))}</div>{/if}
        </figure>
      {/each}
    </div>
    <div class="tt-gumbi" role="group" aria-label="Dodaj u obje epruvete">
      {#each pm.dodatak as d, i (i)}
        <button type="button" class="btn btn-quiet tt-g" onclick={() => kapni(i, 1)}>+1 kap <Formula f={d.formula} /></button>
        <button type="button" class="btn btn-quiet tt-g" onclick={() => kapni(i, 10)}>+10 kapi <Formula f={d.formula} /></button>
      {/each}
    </div>
    {#if kapiP.some((x) => x > 0)}
      <p class="tt-stanje">
        U svakoj epruveti: {#each pm.dodatak.map((d, i) => ({ d, i })).filter((x) => kapiP[x.i] > 0) as { d, i }, j (i)}{j ? ", " : ""}{kapiP[i]} {kapiP[i] % 10 === 1 && kapiP[i] % 100 !== 11 ? "kap" : "kapi"} <Formula f={d.formula} />{/each}
      </p>
      {#each pm.dodatak as d, i (i)}
        {#if kapiP[i] > 0}<p class="tt-reakcija">U puferu: {@render tekst(reakcijaPufera(pm, d))}</p>{/if}
      {/each}
      <button type="button" class="btn btn-quiet tt-ispocetka" onclick={isprazniP}>Ispočetka</button>
    {/if}
  {:else}
    {@render podaci()}
    {#if jednadzbaVidljiva}{@render jednadzba(m.jed)}{/if}

    {#if !izborInd}
      <div class="tt-stol" class:siroko>
        <div class="tt-aparat">{@render aparat()}</div>
        <div class="tt-desno">
          {#if siroko && prikaziGraf}{@render graf()}{/if}
          <div class="tt-panel">
            {#if !racun}
              <div class="tt-ocit" aria-live="polite">
                <span class="tt-ocit-n">očitanje birete</span>
                <b>{zapisMl(V)} mL</b>
              </div>
            {/if}
            {#if ind}
              <div class="tt-bojanaziv">
                <span class="tt-tocka" class:bezbojna={nazivBoje(ind, pHBoje) === "bezbojan"} style="background: {bojaTikvice}"></span>
                {INDIKATORI[ind].kratko}: {nazivBoje(ind, pHBoje)}
              </div>
            {/if}
            {#if istrazi}
              <div class="tt-ph" aria-live="polite">pH <b>{zapisPH(pH)}</b></div>
              <div class="tt-stanje">{@render tekst(stanjeTikvice)}</div>
            {/if}
            {#if istrazi || ekv}{@render gumbi()}{/if}
          </div>
        </div>
      </div>
      {#if !siroko && prikaziGraf}{@render graf()}{/if}
    {:else if prikaziGraf}
      {@render graf()}
    {/if}

    {#if ekv}
      <div class="lx-actions"><button class="btn btn-primary" type="button" disabled={!aktivno || V <= 0} onclick={zaustavi}>Zaustavi i provjeri</button></div>
    {:else if racun}
      <form onsubmit={predajRacun} bind:clientWidth={sirinaLanca}>
        <div class="tt-lanac" class:vodoravno>
          {#each koraci as k, i (k.id)}
            {#if i > 0}
              <div class="tt-strelica" aria-hidden="true">
                <span class="tt-str-r">→</span><span class="tt-str-d">↓</span>
                {#if s.operacije}<span class="tt-op">{@render tekst(k.formula)}</span>{/if}
              </div>
            {/if}
            <div class="tt-kartica" class:ok={okKorak(i)} class:bad={badKorak(i)}>
              <div class="tt-glava"><span class="tt-sym"><Formula f={k.oznaka} /></span>{#if s.operacije && i === 0}<span class="tt-op">{@render tekst(k.formula)}</span>{/if}</div>
              <div class="tt-unos">
                <input
                  id="tt-{uid}-{i}"
                  class="inp tt-inp"
                  class:ok={okKorak(i)}
                  class:bad={badKorak(i)}
                  inputmode="decimal"
                  autocomplete="off"
                  aria-label="{k.oznaka} u {k.jed}"
                  placeholder="?"
                  disabled={!aktivno}
                  bind:value={unosi[i]}
                />
                <span class="lx-unit"><Formula f={k.jed} /></span>
              </div>
              {#if k.jed === "mol" && aktivno}
                <div class="tt-pot">
                  <button type="button" class="btn btn-quiet" onclick={() => potencija(i)} aria-label="Dodaj potenciju broja 10">·10ⁿ</button>
                  <span>npr. {primjerN}</span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
        <div class="lx-actions"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpun}>Provjeri</button></div>
      </form>
    {:else if izborInd}
      <p class="tt-uputa">Odaberi sve prikladne indikatore.</p>
      <div class="tt-izbori" role="group" aria-label="Indikatori">
        {#each ponudeni as i (i)}
          {@const I = INDIKATORI[i]}
          {@const sel = izbor.includes(i)}
          <button
            type="button"
            role="checkbox"
            aria-checked={sel}
            class="tt-izbor"
            class:sel
            class:ok={rijeseno && prikladni(m).includes(i)}
            class:bad={ishod && !ishod.tocno && ishod.krivi?.includes(i)}
            disabled={!aktivno}
            onclick={() => prebaci(i)}
          >
            <span class="tt-kvacica" aria-hidden="true">{sel ? "✓" : ""}</span>
            <span class="tt-izbor-t">
              <span class="tt-izbor-n">{I.naziv}</span>
              <span class="tt-izbor-b">
                {#if i === "univerzalni"}
                  <span class="tt-traka" style="background: linear-gradient(to right, {[0, 3, 5, 7, 9, 11, 14].map((p) => bojaNaPH('univerzalni', p)).join(', ')})"></span>
                  {#if intervali}<span class="tt-int">mijenja boju kroz cijelu skalu</span>{/if}
                {:else}
                  {#each I.boje as b, k (b.id)}<span class="tt-tocka sm" class:bezbojna={!b.boja} style={b.boja ? `background: ${b.boja}` : ""} title={b.naziv}></span>{#if k < 2}<span class="tt-strk">→</span>{/if}{/each}
                  {#if intervali}<span class="tt-int">pH {zapisInt(i)}</span>{/if}
                {/if}
              </span>
            </span>
          </button>
        {/each}
      </div>
      <div class="lx-actions"><button class="btn btn-primary" type="button" disabled={!aktivno || !izbor.length} onclick={() => onodgovor($state.snapshot(izbor))}>Provjeri</button></div>
    {/if}
  {/if}
</div>

{#if tocanTekst}
  <p class="lx-solution">Točan odgovor: <b class="tt-tocno">{@render tekst(tocanTekst)}</b></p>
{/if}

<style>
  .tt {
    display: grid;
    gap: 12px;
    min-width: 0;
  }
  .tt-tekst {
    margin-bottom: 6px;
  }
  .tt-hint {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .tt :global(sub) {
    font-size: 0.68em;
    vertical-align: -0.3em;
    line-height: 0;
  }

  /* zadani podaci */
  .tt-podaci {
    display: grid;
    gap: 6px;
  }
  .tt-red {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 8px;
  }
  .tt-uloga {
    font-size: 12px;
    color: var(--text-faint);
    min-width: 58px;
  }
  .tt-formula {
    font-family: var(--font-sans);
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
  }
  .tt-naziv {
    color: var(--text-dim);
    font-size: 14px;
  }
  .tt-chip {
    display: inline-block;
    padding: 2px 9px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    font-size: 13px;
    color: var(--text-dim);
    white-space: nowrap;
  }
  .tt-chip-jak {
    color: var(--text);
    font-size: 14px;
  }
  .tt-chip-f {
    color: var(--text);
    font-weight: 600;
  }
  .tt-plus-c {
    margin-right: 6px;
    color: var(--text-faint);
  }

  /* jednadžba: „+“ i strelica ostaju uz pojam iza sebe */
  .tt-eq {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 0;
    font-family: var(--font-sans);
    font-size: 16px;
    color: var(--text);
  }
  .tt-par {
    white-space: nowrap;
  }
  .tt-plus,
  .tt-str {
    margin: 0 7px;
    color: var(--text-dim);
  }
  .tt-k {
    margin-right: 2px;
  }

  /* bireta + tikvica uz ploču s očitanjem; graf ispod (ili desno kad je široko) */
  .tt-stol {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }
  .tt-aparat {
    flex: 0 0 104px;
  }
  .tt-svg {
    display: block;
    width: 104px;
    height: auto;
  }
  .tt-desno {
    flex: 1 1 auto;
    min-width: 0;
    display: grid;
    gap: 10px;
  }
  .tt-panel {
    display: grid;
    gap: 10px;
    align-content: start;
  }
  .tt-ocit {
    display: grid;
    gap: 2px;
  }
  .tt-ocit-n {
    font-size: 12px;
    color: var(--text-faint);
  }
  .tt-ocit b {
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
    font-size: 24px;
    color: var(--text);
  }
  .tt-bojanaziv {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text);
  }
  .tt-ph {
    font-size: 14px;
    color: var(--text-dim);
  }
  .tt-ph b {
    font-size: 18px;
    color: var(--primary);
    font-variant-numeric: tabular-nums;
  }
  .tt-stanje {
    margin: 0;
    font-size: 13px;
    color: var(--text-dim);
  }
  .tt-gumbi {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .tt-g {
    border: 1px solid var(--border);
    background: var(--bg-elev);
    min-height: var(--lx-control);
    min-width: 64px;
    padding: 0 10px;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .tt-ispocetka {
    justify-self: start;
    min-height: 36px;
    font-size: 13px;
  }
  .tt-klizac {
    width: 100%;
    margin: 0;
    height: 36px;
    accent-color: var(--primary);
    cursor: pointer;
  }

  /* crtež */
  .tt-staklo {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.4;
    stroke-linejoin: round;
  }
  .tt-stalak {
    stroke: var(--border-strong);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .tt-slavina {
    fill: var(--bg-elev-2);
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .tt-titrant {
    fill: color-mix(in srgb, var(--lx-water) 22%, transparent);
  }
  .tt-voda {
    fill: color-mix(in srgb, var(--lx-water) 16%, transparent);
  }
  .tt-boja {
    opacity: 0.85;
    transition: fill 0.35s ease;
  }
  .tt-crtica {
    stroke: var(--text-dim);
    stroke-width: 0.6;
  }
  .tt-broj {
    fill: var(--text-dim);
    font: 8.5px var(--font-sans);
    text-anchor: end;
  }
  .tt-menisk {
    stroke: var(--text);
    stroke-width: 1.6;
  }
  .tt-pokazivac {
    fill: var(--primary);
  }
  .tt-kap {
    fill: color-mix(in srgb, var(--lx-water) 70%, transparent);
    opacity: 0;
    animation: tt-pad 0.45s ease-in;
  }
  @keyframes tt-pad {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    to {
      transform: translateY(var(--pad));
      opacity: 0;
    }
  }

  /* graf */
  .tt-graf {
    margin: 0;
    max-width: 460px;
    width: 100%;
  }
  .tt-graf svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .tt-osx {
    margin-top: -2px;
    text-align: right;
    font-size: 12px;
    color: var(--text-dim);
  }
  .tt-mreza {
    stroke: var(--border);
    stroke-width: 0.6;
  }
  .tt-neutral {
    stroke: var(--text-faint);
    stroke-width: 0.8;
    stroke-dasharray: 3 3;
  }
  .tt-os {
    stroke: var(--text-dim);
    stroke-width: 1;
  }
  .tt-tick {
    fill: var(--text-faint);
    font: 10px var(--font-sans);
  }
  .tt-osT {
    fill: var(--text-dim);
    font: 600 11px var(--font-sans);
  }
  .tt-krivulja {
    fill: none;
    stroke: var(--text);
    stroke-width: 2.2;
    stroke-linejoin: round;
  }
  .tt-ekv {
    stroke: var(--primary);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  .tt-tocka-ekv {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .tt-sad {
    fill: var(--text);
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .tt-pola {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.5;
  }
  .tt-ti {
    stroke: var(--danger);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .tt-lbl {
    fill: var(--text-dim);
    font: 10.5px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .tt-lbl.jak {
    fill: var(--primary);
    font-weight: 600;
  }
  .tt-pojas {
    fill-opacity: 0.22;
  }
  .tt-pojas.los {
    fill-opacity: 0.1;
  }
  .tt-pojas-t {
    fill: var(--text-dim);
    font: 10px var(--font-sans);
  }

  /* lanac računa */
  .tt-lanac {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    max-width: 380px;
  }
  .tt-kartica {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    min-width: 0;
  }
  .tt-kartica.ok {
    border-color: var(--lx-ok);
  }
  .tt-kartica.bad {
    border-color: var(--lx-bad);
  }
  .tt-glava {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 8px;
  }
  .tt-sym {
    font-family: var(--font-sans);
    font-weight: 700;
    font-size: 16px;
    color: var(--text);
  }
  .tt-unos {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .tt-inp {
    width: 100%;
    max-width: 150px;
    min-width: 0;
    height: var(--lx-control);
    padding: 6px 8px;
    text-align: right;
    font-family: var(--font-mono);
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
  }
  .tt-pot {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-faint);
  }
  .tt-pot .btn {
    min-width: 44px;
    min-height: 36px;
    font-family: var(--font-mono);
  }
  .tt-strelica {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0 2px 18px;
    color: var(--text-faint);
  }
  .tt-str-r {
    display: none;
  }
  .tt-str-d,
  .tt-str-r {
    font-size: 18px;
    line-height: 1;
  }
  .tt-op {
    font-size: 13px;
    color: var(--primary);
    font-weight: 600;
  }
  .tt-lanac.vodoravno {
    flex-direction: row;
    max-width: none;
  }
  .vodoravno .tt-kartica {
    flex: 1 1 0;
  }
  .vodoravno .tt-strelica {
    flex-direction: column;
    justify-content: center;
    align-self: center;
    gap: 2px;
    padding: 0 2px;
  }
  .vodoravno .tt-str-r {
    display: inline;
  }
  .vodoravno .tt-str-d {
    display: none;
  }

  /* izbor indikatora */
  .tt-uputa {
    margin: 0;
    font-size: 13.5px;
    color: var(--text-dim);
  }
  .tt-izbori {
    display: grid;
    gap: 8px;
  }
  .tt-izbor {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    color: var(--text);
    text-align: left;
  }
  .tt-izbor:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }
  .tt-izbor.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }
  .tt-izbor.ok {
    border-color: var(--lx-ok);
  }
  .tt-izbor.bad {
    border-color: var(--lx-bad);
  }
  .tt-kvacica {
    flex: 0 0 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border: 1.5px solid var(--border-strong);
    border-radius: 6px;
    font-size: 14px;
    font-weight: 700;
    color: var(--primary);
  }
  .tt-izbor-t {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .tt-izbor-n {
    font-size: 15px;
    font-weight: 600;
  }
  .tt-izbor-b {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .tt-strk {
    color: var(--text-faint);
    font-size: 11px;
  }
  .tt-int {
    margin-left: 6px;
  }
  .tt-traka {
    display: inline-block;
    width: 90px;
    height: 12px;
    border-radius: 3px;
    border: 1px solid var(--border-strong);
  }
  .tt-tocka {
    flex-shrink: 0;
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.15);
  }
  .tt-tocka.sm {
    width: 13px;
    height: 13px;
  }
  .tt-tocka.bezbojna {
    border: 1.5px dashed var(--text-faint);
    background: transparent !important;
  }

  /* pufer */
  .tt-casse {
    display: flex;
    justify-content: center;
    gap: 18px;
    flex-wrap: wrap;
  }
  .tt-casa {
    margin: 0;
    display: grid;
    justify-items: center;
    gap: 4px;
    width: 132px;
  }
  .tt-casa-n {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }
  .tt-casa-ph {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .tt-papir {
    display: inline-block;
    width: 12px;
    height: 30px;
    border-radius: 2px;
    border: 1px solid var(--border-strong);
    transition: background 0.35s ease;
  }
  .tt-casa-v b {
    font-size: 22px;
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }
  .tt-casa-l {
    font-size: 13px;
    color: var(--text-dim);
  }
  .tt-casa-pocetno {
    font-size: 12px;
    color: var(--text-faint);
  }
  .tt-casa-pr {
    font-size: 12.5px;
    color: var(--primary);
    text-align: center;
  }
  .tt-reakcija {
    margin: 0;
    font-size: 14px;
    color: var(--text);
  }

  .tt-tocno {
    color: var(--success);
    font-family: var(--font-sans);
    font-weight: 600;
  }

  @media (max-width: 420px) {
    .tt-aparat {
      flex-basis: 92px;
    }
    .tt-svg {
      width: 92px;
    }
    .tt-stol {
      gap: 10px;
    }
    .tt-g {
      min-width: 0;
      flex: 1 1 calc(50% - 6px);
    }
    .tt-ocit b {
      font-size: 21px;
    }
  }
</style>
