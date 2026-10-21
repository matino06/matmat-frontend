<script>
  // Stupčasti dijagram energije: prikaz (stanja se otkrivaju redom, stupci prelaze iz prethodnog stanja), dovrsi
  // (učenik vuče stupce pitanog stanja) i istraživanje sa scenom (pad, odskok, tobogan) i stupcima uživo.
  // Vrijednosti, provjera i fizika scene su u katalogu (energija_stupci.js).
  import { untrack } from "svelte";
  import { Tween, prefersReducedMotion } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import Md from "../Md.svelte";
  import Graf from "./_energijaGraf.svelte";
  import {
    energijaKorak,
    pitanoStanje,
    vuceSe,
    energijaUkupno,
    energijaKorisnost,
    energijaScena,
    lijepiKorak,
  } from "$lib/lesson/katalog/fizika/energija_stupci.js";
  import { formatNumber, formatSci } from "$lib/lesson/core/number.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const W = 360;
  let nacin = $derived(spec.nacin);
  let pitanje = $derived(nacin === "dovrsi");
  let J = $derived(spec.jedinica ?? "J");
  const fmt = (v) => formatSci(v, 4);
  const trajanjeAnim = () => (prefersReducedMotion.current ? 0 : 700);

  // ── prikaz i dovrsi ──
  let stanja = $derived(spec.stanja ?? []);
  let korak = $derived(nacin === "istrazi" ? 1 : energijaKorak(spec));
  let pi = $derived(pitanje ? pitanoStanje(spec) : -1);
  let vuku = $derived(pitanje ? vuceSe(spec) : []);

  // raspon mreže: malo iznad najvećeg stupca, u dovrsi i s mjestom za previsok stupac
  let raspon = $derived.by(() => {
    if (nacin === "istrazi") return { min: 0, max: 1 };
    const vis = stanja.flatMap((st) =>
      spec.slozeno
        ? [
            Object.values(st.vrijednosti).reduce(
              (a, v) => a + Math.max(0, v),
              0,
            ),
          ]
        : Object.values(st.vrijednosti),
    );
    const hi = Math.max(0, ...vis);
    const lo = Math.min(0, ...vis);
    const k = korak;
    const gore = Math.ceil((hi * (pitanje ? 1.3 : 1.1)) / k - 1e-9) * k;
    const dolje = lo < 0 ? Math.floor((lo * 1.15) / k + 1e-9) * k : 0;
    return { min: dolje, max: Math.max(gore, dolje + k) };
  });

  // prikaz: otkrivena stanja; svako stanje ima svoj Tween vrijednosti
  const tw = untrack(() =>
    (spec.stanja ?? []).map(
      (st) =>
        new Tween(
          Object.fromEntries(
            Object.keys(st.vrijednosti ?? {}).map((id) => [id, 0]),
          ),
          { easing: cubicInOut },
        ),
    ),
  );
  let pokazano = $state(
    untrack(() => (spec.nacin === "dovrsi" ? (spec.stanja?.length ?? 0) : 1)),
  );
  $effect(() => {
    if (nacin !== "prikaz") return;
    untrack(() =>
      tw[0]?.set({ ...stanja[0].vrijednosti }, { duration: trajanjeAnim() }),
    );
  });
  function dalje() {
    const k = pokazano;
    if (k >= stanja.length) return;
    const prije = tw[k - 1].current;
    const start = Object.fromEntries(
      Object.keys(stanja[k].vrijednosti).map((id) => [
        id,
        id in prije ? prije[id] : 0,
      ]),
    );
    tw[k].set(start, { duration: 0 });
    tw[k].set({ ...stanja[k].vrijednosti }, { duration: trajanjeAnim() * 1.2 });
    pokazano = k + 1;
  }
  function ispocetka() {
    tw.forEach((t, k) =>
      t.set(
        Object.fromEntries(
          Object.keys(stanja[k].vrijednosti).map((id) => [id, 0]),
        ),
        { duration: 0 },
      ),
    );
    pokazano = 1;
    tw[0].set({ ...stanja[0].vrijednosti }, { duration: trajanjeAnim() });
  }

  // dovrsi: učenikove vrijednosti
  let ulaz = $state(
    untrack(() =>
      Object.fromEntries(
        (spec.nacin === "dovrsi" ? vuceSe(spec) : []).map((id) => [id, 0]),
      ),
    ),
  );
  let poslano = $state(null);
  const pokaziTw = new Tween(0, { easing: cubicInOut });
  $effect(() => {
    if (!pitanje || !pokazi) return;
    untrack(() => {
      const od = { ...ulaz };
      const cilj = stanja[pi].vrijednosti;
      pokaziTw.set(0, { duration: 0 });
      pokaziTw.set(1, { duration: trajanjeAnim() });
      // animirani prijelaz prema točnim vrijednostima
      const korakAnim = () => {
        const f = pokaziTw.current;
        ulaz = Object.fromEntries(
          vuku.map((id) => [id, od[id] + (cilj[id] - od[id]) * f]),
        );
        if (f < 1) requestAnimationFrame(korakAnim);
        else ulaz = Object.fromEntries(vuku.map((id) => [id, cilj[id]]));
      };
      requestAnimationFrame(korakAnim);
    });
  });
  let neprom = $derived(
    poslano != null && vuku.every((id) => poslano[id] === ulaz[id]),
  );
  // stupci se označe tek uz točan odgovor (ili „pokaži“); krive stupce ne ističemo jer bi zaključana kopija
  // pitanja otkrila koji su stupci bili dobri
  let ok = $derived(pokazi || (ishod?.tocno && neprom));
  function promjena(gi, id, v) {
    if (locked || gi !== pi) return;
    ulaz[id] = v;
  }
  function provjeri() {
    if (locked) return;
    poslano = { ...ulaz };
    onodgovor({ ...ulaz });
  }

  let grupe = $derived(
    stanja.map((st, gi) => {
      const ids = Object.keys(st.vrijednosti);
      if (pitanje && gi === pi) {
        const zad = st.zadano ?? [];
        return {
          oznaka: st.oznaka,
          pitano: true,
          stupci: ids.map((id) => {
            const vuci = !zad.includes(id);
            const status = vuci && ok ? "ok" : "";
            return {
              id,
              v: vuci ? ulaz[id] : st.vrijednosti[id],
              vuci: vuci && !locked,
              status,
            };
          }),
        };
      }
      if (nacin === "prikaz") {
        const cur = tw[gi].current;
        return {
          oznaka: st.oznaka,
          prazno: gi >= pokazano,
          stupci: ids.map((id) => ({
            id,
            v: gi >= pokazano ? 0 : (cur[id] ?? 0),
          })),
        };
      }
      return {
        oznaka: st.oznaka,
        stupci: ids.map((id) => ({ id, v: st.vrijednosti[id] })),
      };
    }),
  );

  let ukupno = $derived(
    spec.zatvoren && spec.slozeno && nacin !== "istrazi"
      ? Object.values(
          stanja.find((_, k) => k !== pi)?.vrijednosti ?? {},
        ).reduce((a, v) => a + v, 0)
      : null,
  );
  let zbrojPitano = $derived(
    pitanje
      ? Object.keys(stanja[pi].vrijednosti).reduce(
          (a, id) =>
            a + (vuku.includes(id) ? ulaz[id] : stanja[pi].vrijednosti[id]),
          0,
        )
      : null,
  );
  let cilj = $derived(pitanje ? energijaUkupno(spec) : null);
  // Ukupna energija dolazi iz prvog nepitanog stanja. Kad je to jedan zadani stupac, crta i broj „ukupno“ samo ga
  // ponavljaju. Kad je zbroj više stupaca (npr. W + Q_h u toplinskom stroju), taj zbroj je upravo ono što učenik
  // treba izračunati (Q_t = W + Q_h), pa se do odgovora ne pokazuje: ni crta ni broj, a zbroj se ne boji po točnosti.
  let otkriveno = $derived(pokazi || !!ishod?.tocno);
  let ukupnoOdaje = $derived.by(() => {
    if (!pitanje || otkriveno || cilj == null) return false;
    const ref = stanja.find((_, k) => k !== pi)?.vrijednosti ?? {};
    return Object.values(ref).filter((v) => Math.abs(v) > 1e-9).length > 1;
  });
  let refOznaka = $derived(
    pitanje ? (stanja.find((_, k) => k !== pi)?.oznaka ?? "") : "",
  );
  let eta = $derived(
    spec.korisnost && nacin !== "istrazi"
      ? energijaKorisnost(spec, pitanje ? ulaz : null)
      : null,
  );
  let etaTekst = $derived.by(() => {
    if (!spec.korisnost) return "";
    const v = (id) => {
      for (let n = 0; n < stanja.length; n++) {
        const x =
          pitanje && n === pi && vuku.includes(id)
            ? ulaz[id]
            : stanja[n].vrijednosti[id];
        if (x != null && Math.abs(x) > 1e-9) return x;
      }
      return 0;
    };
    return `${fmt(v(spec.korisnost.korisno))} ${J} / ${fmt(v(spec.korisnost.ulozeno))} ${J}`;
  });
  let pokaziUkupnoPrikaz = $derived(nacin === "prikaz" && spec.zatvoren);

  let visinaGrafa = $derived(
    stanja.some(
      (st) => st.oznaka.length * 6 > (W - 44) / Math.max(1, stanja.length) - 6,
    )
      ? 252
      : 240,
  );
  let opis = $derived(
    `Stupci energije. ` +
      stanja
        .map((st, gi) =>
          pitanje && gi === pi
            ? `${st.oznaka}: tvoji stupci ${vuku.map((id) => `${id} ${fmt(ulaz[id])} ${J}`).join(", ")}`
            : nacin === "prikaz" && gi >= pokazano
              ? ""
              : `${st.oznaka}: ${Object.entries(st.vrijednosti)
                  .map(([id, v]) => `${id} ${fmt(v)} ${J}`)
                  .join(", ")}`,
        )
        .filter(Boolean)
        .join("; "),
  );

  // ── istraživanje sa scenom ──
  const BOJE_SCENE = [
    {
      id: "Ep",
      oznaka: "E_{gp}",
      naziv: "gravitacijska potencijalna",
      boja: "plava",
    },
    { id: "Ek", oznaka: "E_k", naziv: "kinetička", boja: "crvena" },
    { id: "Q", oznaka: "Q", naziv: "toplina i zvuk", boja: "narancasta" },
  ];
  let sc0 = $derived(spec.scena);
  let kliz = $state(
    untrack(() =>
      Object.fromEntries(
        (spec.klizaci ?? []).map((k) => [k.id, spec.scena?.[k.id]]),
      ),
    ),
  );
  let oblik = $state("strmi");
  let sc = $derived(nacin === "istrazi" ? { ...sc0, ...kliz } : null);
  let fiz = $derived(sc ? energijaScena(sc, oblik) : null);
  let tau = $state(0); // 0…1 položaj na putanji (vremenski)
  let igra = $state(false);
  let raf = 0;
  const TRAJANJE_ANIM = 2.4; // s, usporeno da se vidi
  function pusti() {
    cancelAnimationFrame(raf);
    if (prefersReducedMotion.current) {
      tau = 1;
      return;
    }
    if (tau >= 1) tau = 0;
    igra = true;
    let last = performance.now();
    const k = (now) => {
      tau = Math.min(1, tau + (now - last) / 1000 / TRAJANJE_ANIM);
      last = now;
      if (tau < 1 && igra) raf = requestAnimationFrame(k);
      else igra = false;
    };
    raf = requestAnimationFrame(k);
  }
  function stani() {
    igra = false;
    cancelAnimationFrame(raf);
  }
  $effect(() => () => cancelAnimationFrame(raf));
  let tr = $derived(fiz ? fiz.stanje(tau * fiz.trajanje) : null);
  // mjerilo stupaca: najveća moguća energija uz klizače, da se vidi kako masa i visina mijenjaju stupce
  let emax = $derived.by(() => {
    if (!sc0) return 1;
    const mx = (id) =>
      (spec.klizaci ?? []).find((k) => k.id === id)?.max ?? sc0[id];
    return (fiz?.g ?? 9.81) * mx("m") * mx("h");
  });
  let iKorak = $derived(lijepiKorak(emax));
  let iMax = $derived(Math.ceil(emax / iKorak - 1e-9) * iKorak);
  let iGrupe = $derived(
    tr
      ? [
          {
            oznaka: "sada",
            stupci: BOJE_SCENE.filter(
              (v) => v.id !== "Q" || sc.vrsta === "odskok",
            ).map((v) => ({ id: v.id, v: tr[v.id] })),
          },
        ]
      : [],
  );

  // geometrija scene (lijevi dio SVG-a)
  const S_X0 = 14;
  const S_X1 = 190;
  const S_TLO = 196;
  const S_VRH = 30;
  let hMax = $derived(
    sc0
      ? Math.max(
          sc0.h,
          (spec.klizaci ?? []).find((k) => k.id === "h")?.max ?? 0,
        )
      : 1,
  );
  // okomito mjerilo prema najvećoj visini; tobogan se vodoravno rasteže na cijelu širinu scene
  // (oba oblika jednako, pa se usporedba strmi/blagi ne mijenja)
  let mjerilo = $derived(sc ? (S_TLO - S_VRH) / hMax : 1);
  let mjeriloX = $derived(
    sc?.vrsta === "tobogan" ? (S_X1 - S_X0 - 12) / (hMax * 3.1) : mjerilo,
  );
  const SX = (x) => S_X0 + 8 + x * mjeriloX;
  const SY = (y) => S_TLO - y * mjerilo;
  let rKugle = $derived.by(() => {
    if (!sc) return 9;
    const k = (spec.klizaci ?? []).find((x) => x.id === "m");
    const f = k ? (sc.m - k.min) / (k.max - k.min || 1) : 0.5;
    return sc.vrsta === "tobogan" ? 8 + 4 * f : 7 + 5 * f;
  });
  let staze = $derived.by(() => {
    if (!sc || sc.vrsta !== "tobogan") return [];
    return ["strmi", "blagi"].map((o) => ({
      o,
      d: energijaScena(sc, o)
        .staza.map(
          ([x, y], i) =>
            `${i ? "L" : "M"}${SX(x).toFixed(1)},${SY(y).toFixed(1)}`,
        )
        .join(" "),
    }));
  });
  // položaj kugle: na stazi (normala prema gore) ili na okomitoj crti
  let kugla = $derived.by(() => {
    if (!tr) return null;
    if (sc.vrsta !== "tobogan") return { x: 92, y: SY(tr.y) - rKugle };
    // normala na stazu u koordinatama zaslona (vodoravno i okomito mjerilo nisu ista)
    const pts = fiz.staza;
    let k = pts.findIndex((p) => p[0] >= tr.x);
    k = Math.max(1, Math.min(pts.length - 1, k < 0 ? pts.length - 1 : k));
    const dx = SX(pts[k][0]) - SX(pts[k - 1][0]);
    const dy = SY(pts[k][1]) - SY(pts[k - 1][1]);
    const L = Math.hypot(dx, dy) || 1;
    return { x: SX(tr.x) + (dy / L) * rKugle, y: SY(tr.y) - (dx / L) * rKugle };
  });
  let iOpis = $derived(
    tr
      ? `Scena: tijelo na visini ${formatSci(tr.y, 3)} m, brzina ${formatSci(Math.abs(tr.v), 3)} m/s. Gravitacijska potencijalna energija ${fmt(tr.Ep)} J, kinetička ${fmt(tr.Ek)} J${sc.vrsta === "odskok" ? `, toplina i zvuk ${fmt(tr.Q)} J` : ""}.`
      : "",
  );
  const KLIZ_OZNAKA = {
    h: { oznaka: "visina h", jedinica: "m" },
    m: { oznaka: "masa m", jedinica: "kg" },
  };
  function promijeniKlizac() {
    stani();
    tau = 0;
  }
</script>

{#if pitanje}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="es-tekst"><Md text={spec.tekst} /></div>
{/if}

<div class="es">
  {#if nacin !== "istrazi"}
    <figure class="lx-figure es-fig">
      <svg viewBox="0 0 {W} {visinaGrafa}" role="img" aria-label={opis}>
        <Graf
          x={0}
          y={0}
          w={W}
          h={visinaGrafa}
          vrste={spec.vrste}
          stanja={grupe}
          slozeno={!!spec.slozeno}
          min={raspon.min}
          max={raspon.max}
          {korak}
          jedinica={J}
          ukupno={ukupnoOdaje ? null : ukupno}
          aktivno={pitanje && !locked}
          onpromjena={promjena}
        />
      </svg>
    </figure>

    <div class="es-legenda">
      {#each spec.vrste as v (v.id)}
        <span class="es-leg"
          ><i style:--c="var(--es-{v.boja ?? 'siva'})"></i><Md
            text={`$${v.oznaka}$${v.naziv ? ` ${v.naziv}` : ""}`}
            inline
          /></span
        >
      {/each}
    </div>

    {#if pitanje}
      <p class="lx-readout es-readout">
        {#if cilj != null && ukupnoOdaje}
          zbroj u stanju „{stanja[pi].oznaka}“: <b>{fmt(zbrojPitano)} {J}</b>
          · mora biti jednak zbroju u stanju „{refOznaka}“
        {:else if cilj != null}
          zbroj u stanju „{stanja[pi].oznaka}“:
          <b class:es-krivo={Math.abs(zbrojPitano - cilj) > korak / 2}
            >{fmt(zbrojPitano)} {J}</b
          >
          · mora ostati {fmt(cilj)}
          {J}
        {:else}
          povuci vrhove stupaca stanja „{stanja[pi].oznaka}“
        {/if}
        {#if eta != null}<br />korisnost η = {etaTekst} =
          <b>{formatNumber(eta * 100, 1)} %</b>{/if}
      </p>
      {#if !locked && vuku.every((id) => ulaz[id] === 0)}
        <p class="es-uputa">
          Povuci vrh svakog stupca u stanju <b>„{stanja[pi].oznaka}“</b> gore
          ili dolje (jedan razmak mreže = {fmt(korak)}
          {J}).
        </p>
      {/if}
      <div class="lx-actions">
        <button
          type="button"
          class="btn btn-primary"
          onclick={provjeri}
          disabled={locked || vuku.every((id) => ulaz[id] === 0)}
          >Provjeri</button
        >
      </div>
    {:else}
      {#if eta != null && pokazano >= stanja.length}
        <p class="lx-readout es-readout">
          korisnost η = {etaTekst} = <b>{formatNumber(eta * 100, 1)} %</b>
        </p>
      {/if}
      {#if pokaziUkupnoPrikaz && pokazano >= stanja.length}
        <p class="lx-readout es-readout">
          Zbroj stupaca je u svakom stanju isti: <b
            >{fmt(
              Object.values(stanja[0].vrijednosti).reduce((a, v) => a + v, 0),
            )}
            {J}</b
          >. Energija samo prelazi iz jednog oblika u drugi.
        </p>
      {/if}
      {#if stanja.length > 1}
        <div class="lx-actions es-akcije">
          {#if pokazano < stanja.length}
            <button type="button" class="btn btn-primary" onclick={dalje}
              >Dalje: {stanja[pokazano].oznaka} ▸</button
            >
          {:else}
            <button type="button" class="btn btn-ghost" onclick={ispocetka}
              >↺ Ispočetka</button
            >
          {/if}
        </div>
      {/if}
    {/if}
  {:else if fiz}
    <figure class="lx-figure es-fig es-scena-fig">
      <svg viewBox="0 0 {W} 230" role="img" aria-label={iOpis}>
        <!-- tlo -->
        <line class="lx-stroke es-tlo" x1="6" y1={S_TLO} x2="198" y2={S_TLO} />
        {#each Array.from({ length: 12 }, (_, k) => 10 + k * 16) as px (px)}
          <line
            class="es-srafura"
            x1={px}
            y1={S_TLO + 1}
            x2={px - 6}
            y2={S_TLO + 7}
          />
        {/each}
        {#if sc.vrsta === "tobogan"}
          {#each staze as s (s.o)}
            <path class="es-staza" class:es-druga={s.o !== oblik} d={s.d} />
          {/each}
        {:else}
          <line class="es-mjera" x1="128" y1={SY(sc.h)} x2="128" y2={S_TLO} />
          <line
            class="es-mjera-kraj"
            x1="122"
            y1={SY(sc.h)}
            x2="134"
            y2={SY(sc.h)}
          />
          <text class="es-mjera-t" x="138" y={SY(sc.h) + 4}
            >h = {formatNumber(sc.h, 2)} m</text
          >
          {#if sc.vrsta === "odskok"}
            <line
              class="es-mjera es-mjera-2"
              x1="110"
              y1={SY(sc.odskok_do)}
              x2="146"
              y2={SY(sc.odskok_do)}
            />
            <text class="es-mjera-t" x="138" y={SY(sc.odskok_do) - 4}
              >{formatNumber(sc.odskok_do, 2)} m</text
            >
          {/if}
        {/if}
        {#if sc.vrsta === "tobogan"}
          <text class="es-mjera-t" x={SX(0) + 22} y={SY(sc.h) + 4}
            >h = {formatNumber(sc.h, 2)} m</text
          >
        {/if}
        {#if kugla}
          <circle class="es-kugla" cx={kugla.x} cy={kugla.y} r={rKugle} />
          {#if Math.abs(tr.v) > 0.05}
            {@const len =
              8 +
              26 * Math.min(1, Math.abs(tr.v) / Math.sqrt(2 * fiz.g * hMax))}
            {#if sc.vrsta === "tobogan"}
              <line
                class="es-brzina"
                x1={kugla.x + rKugle + 3}
                y1={kugla.y}
                x2={kugla.x + rKugle + 3 + len}
                y2={kugla.y}
              />
            {:else}
              <line
                class="es-brzina"
                x1={kugla.x - rKugle - 8}
                y1={kugla.y}
                x2={kugla.x - rKugle - 8}
                y2={kugla.y + (tr.v < 0 ? len : -len)}
              />
            {/if}
          {/if}
        {/if}
        <text class="es-mjera-t" x="8" y="222"
          >h = {formatSci(tr.y, 3)} m · v = {formatSci(Math.abs(tr.v), 3)} m/s</text
        >

        <Graf
          x={200}
          y={4}
          w={160}
          h={222}
          vrste={BOJE_SCENE}
          stanja={iGrupe}
          min={0}
          max={iMax}
          korak={iKorak}
          jedinica="J"
        />
      </svg>
    </figure>

    <p class="lx-readout es-readout">
      E<sub>gp</sub> + E<sub>k</sub>{sc.vrsta === "odskok" ? " + Q" : ""} =
      <b>{fmt(tr.Ep + tr.Ek + tr.Q)} J</b> (uvijek isto)
    </p>

    <div class="es-kontrole">
      <button
        type="button"
        class="btn btn-primary"
        onclick={igra ? stani : pusti}
        >{igra ? "❚❚ Stani" : tau >= 1 ? "↺ Ponovi" : "▶ Pusti"}</button
      >
      <label class="es-polozaj">
        <span>položaj</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.005"
          bind:value={tau}
          oninput={stani}
          aria-label="Trenutak gibanja"
        />
      </label>
    </div>
    {#if sc.vrsta === "tobogan"}
      <div class="seg es-oblik" role="group" aria-label="Oblik tobogana">
        {#each ["strmi", "blagi"] as o (o)}
          <button
            type="button"
            class="seg-item"
            class:active={oblik === o}
            aria-pressed={oblik === o}
            onclick={() => ((oblik = o), (tau = 0), pusti())}
            >{o} tobogan</button
          >
        {/each}
      </div>
    {/if}
    {#if spec.klizaci?.length}
      <div class="es-klizaci">
        {#each spec.klizaci as k (k.id)}
          <div class="es-klizac">
            <div class="es-kl-glava">
              <label for="es-{k.id}-{spec.tekst.length}"
                >{KLIZ_OZNAKA[k.id].oznaka}</label
              >
              <output
                >{formatNumber(kliz[k.id])} {KLIZ_OZNAKA[k.id].jedinica}</output
              >
            </div>
            <input
              id="es-{k.id}-{spec.tekst.length}"
              type="range"
              min={k.min}
              max={k.max}
              step={k.korak}
              bind:value={kliz[k.id]}
              oninput={promijeniKlizac}
            />
          </div>
        {/each}
      </div>
    {/if}
    <div class="es-legenda">
      {#each BOJE_SCENE.filter((v) => v.id !== "Q" || sc.vrsta === "odskok") as v (v.id)}
        <span class="es-leg"
          ><i style:--c="var(--es-{v.boja})"></i><Md
            text={`$${v.oznaka}$ ${v.naziv}`}
            inline
          /></span
        >
      {/each}
    </div>
  {/if}
</div>

<style>
  .es {
    --es-plava: #60a5fa;
    --es-crvena: #f87171;
    --es-narancasta: #fbbf24;
    --es-zelena: #34d399;
    --es-ljubicasta: #a78bfa;
    --es-siva: #a1a1aa;
  }
  :global(html[data-theme="light"]) .es {
    --es-plava: #2563eb;
    --es-crvena: #dc2626;
    --es-narancasta: #d97706;
    --es-zelena: #059669;
    --es-ljubicasta: #7c3aed;
    --es-siva: #71717a;
  }
  .es-tekst {
    margin-bottom: 10px;
  }
  .es-fig {
    margin-bottom: 4px;
  }
  .es-scena-fig {
    max-width: 480px;
  }
  .es-legenda {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 14px;
    font-size: 13px;
    color: var(--text-dim);
    margin-bottom: 8px;
  }
  .es-leg {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .es-leg i {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    background: var(--c);
  }
  .es-readout {
    margin-top: 4px;
    line-height: 1.6;
  }
  .es-krivo {
    color: var(--warn) !important;
  }
  .es-uputa {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
  }
  .es-akcije {
    justify-content: center;
  }
  .es-tlo {
    stroke-width: 2;
  }
  .es-srafura {
    stroke: var(--border-strong);
  }
  .es-staza {
    fill: none;
    stroke: var(--text);
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  .es-staza.es-druga {
    stroke: var(--text-faint);
    stroke-width: 1.3;
    stroke-dasharray: 4 4;
  }
  .es-mjera {
    stroke: var(--text-faint);
    stroke-dasharray: 3 3;
  }
  .es-mjera-2 {
    stroke: var(--es-narancasta);
  }
  .es-mjera-kraj {
    stroke: var(--text-faint);
  }
  .es-mjera-t {
    fill: var(--text-dim);
    font: 500 11px var(--font-mono);
  }
  .es-kugla {
    fill: color-mix(in srgb, var(--primary) 35%, var(--bg-elev));
    stroke: var(--primary);
    stroke-width: 2;
  }
  .es-brzina {
    stroke: var(--es-crvena);
    stroke-width: 2.5;
    stroke-linecap: round;
  }
  .es-kontrole {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin: 6px 0 10px;
  }
  .es-kontrole .btn {
    height: var(--lx-control);
    padding: 0 16px;
    border-radius: var(--r-md);
    min-width: 104px;
  }
  .es-polozaj {
    flex: 1;
    min-width: 160px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .es-polozaj input,
  .es-klizac input {
    flex: 1;
    width: 100%;
    height: 28px;
    margin: 0;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .es-oblik {
    display: flex;
    width: fit-content;
    margin: 0 auto 10px;
  }
  .es-oblik .seg-item {
    font-size: 13px;
    padding: 7px 12px;
  }
  .es-klizaci {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 8px 18px;
    margin-bottom: 10px;
  }
  .es-kl-glava {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--text-dim);
  }
  .es-kl-glava output {
    font-family: var(--font-mono);
    color: var(--text);
  }
</style>
