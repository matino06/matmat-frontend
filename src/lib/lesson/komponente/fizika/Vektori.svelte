<script>
  // Vektori na mreži (zbroj, rastav, razlika, put i pomak) i scena „rad“ (sila pod kutom, komponenta u smjeru
  // pomaka, predznak rada). Točni vrhovi i provjera su u katalog/fizika/vektori.js.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Strelica from "./_SileStrelica.svelte";
  import Ocitanja from "./_SileOcitanja.svelte";
  import {
    krajevi,
    pocetakZbroja,
    vrhZbroja,
    pocetakRazlike,
    deltaV,
    komponente,
    korakVuci,
    duljina,
    radVelicine,
    RAD_META,
    korakKuta,
    radKlizac,
  } from "$lib/lesson/katalog/fizika/vektori.js";
  import {
    analizaCilja,
    opisVelicine,
    iznosJed,
    rad,
    formatNumber,
  } from "$lib/lesson/katalog/fizika/_sile.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const jeRad = untrack(() => spec.scena === "rad");
  const pitanje = nacin !== "istrazi";
  const r1 = (n) => Math.round(n * 10) / 10;
  const okr = (x) => Math.round(x * 1e9) / 1e9;
  let aktivno = $derived(!locked && !pokazi);
  let svgEl = $state();
  function svgTocka(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [q.x, q.y];
  }

  // ════════ mreža ════════
  const M = untrack(() => spec.mreza ?? { x: [0, 1], y: [0, 1], korak: 1 });
  const jed = M.jedinica ?? "";
  const RUB = 26;
  const sx = M.x[1] - M.x[0];
  const sy = M.y[1] - M.y[0];
  const S = Math.min((360 - 2 * RUB) / sx, (340 - 2 * RUB) / sy);
  const VW = Math.max(240, sx * S + 2 * RUB);
  const VH = sy * S + 2 * RUB;
  const OX = (VW - sx * S) / 2;
  const X = (x) => OX + (x - M.x[0]) * S;
  const Y = (y) => RUB + (M.y[1] - y) * S;
  const svijet = ([px, py]) => [
    M.x[0] + (px - OX) / S,
    M.y[1] - (py - RUB) / S,
  ];
  const snapV = (v, k) => okr(Math.round(v / k) * k);
  const unutra = ([x, y]) => [
    Math.min(M.x[1], Math.max(M.x[0], x)),
    Math.min(M.y[1], Math.max(M.y[0], y)),
  ];
  const crte = (od, do_, k) =>
    Array.from({ length: Math.round((do_ - od) / k) + 1 }, (_, i) =>
      okr(od + i * k),
    );
  const linijeX = jeRad ? [] : crte(M.x[0], M.x[1], M.korak);
  const linijeY = jeRad ? [] : crte(M.y[0], M.y[1], M.korak);
  // brojevi na osima: svaki drugi ako ih je puno
  const svakiN = Math.max(
    1,
    Math.ceil(Math.max(linijeX.length, linijeY.length) / 7),
  );
  const BOJE = [
    "var(--lx-water)",
    "var(--success)",
    "var(--warn)",
    "var(--text-dim)",
  ];

  // zadani vektori; u istrazi se pomični vrhovi vuku (pamti se pomak d, pa se nadovezani vektori pomiču zajedno)
  const pocetni = untrack(() => (jeRad ? [] : krajevi(spec)));
  let dd = $state(pocetni.map((v) => v.d));
  let vektoriSad = $derived.by(() => {
    const out = [];
    pocetni.forEach((v, i) => {
      const izvorni = spec.vektori[i];
      const od = Array.isArray(izvorni.od)
        ? izvorni.od
        : i > 0
          ? out[i - 1].do
          : [0, 0];
      const d = dd[i];
      out.push({ ...v, od, d, do: [okr(od[0] + d[0]), okr(od[1] + d[1])] });
    });
    return out;
  });
  let putanja = $state(untrack(() => (spec.putanja ?? []).map((t) => [...t])));
  const prikazi = untrack(
    () => spec.prikazi ?? (spec.putanja ? ["put"] : ["iznos"]),
  );

  // učenikove točke
  const P0 = untrack(() =>
    jeRad
      ? [0, 0]
      : nacin === "razlika"
        ? pocetakRazlike(spec)
        : pocetakZbroja(spec),
  );
  let vrh = $state(
    untrack(() =>
      nacin === "razlika"
        ? [okr(P0[0] + pocetni[0].d[0]), okr(P0[1] + pocetni[0].d[1])]
        : [...P0],
    ),
  );
  let komp = $state([0, 0]); // rastavi: vodoravna i okomita komponenta
  // razlika: Δv kreće iz vrha prenesenog v₁
  let repDv = $derived(
    nacin === "razlika"
      ? [okr(P0[0] + pocetni[0].d[0]), okr(P0[1] + pocetni[0].d[1])]
      : P0,
  );

  $effect(() => {
    if (!pokazi || jeRad) return;
    untrack(() => {
      if (nacin === "zbroji") vrh = vrhZbroja(spec);
      if (nacin === "razlika")
        vrh = [
          okr(repDv[0] + deltaV(spec)[0]),
          okr(repDv[1] + deltaV(spec)[1]),
        ];
      if (nacin === "rastavi") komp = [...komponente(spec)];
    });
  });

  let vuce = null; // {vrsta, i}
  function down(e, vrsta, i = 0) {
    if (!aktivno && pitanje) return;
    e.preventDefault();
    e.stopPropagation();
    vuce = { vrsta, i };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (!vuce) return;
    const t = svgTocka(e);
    if (!t) return;
    if (jeRad) {
      pomakniKut(t);
      return;
    }
    const w = unutra(svijet(t));
    const k = korakVuci(spec);
    const sn = [snapV(w[0], k), snapV(w[1], k)];
    if (vuce.vrsta === "vrh") vrh = sn;
    else if (vuce.vrsta === "kx") komp = [okr(sn[0] - P0[0]), komp[1]];
    else if (vuce.vrsta === "ky") komp = [komp[0], okr(sn[1] - P0[1])];
    else if (vuce.vrsta === "vektor") {
      const od = vektoriSad[vuce.i].od;
      const d = [okr(sn[0] - od[0]), okr(sn[1] - od[1])];
      if (d[0] !== 0 || d[1] !== 0)
        dd = dd.map((x, j) => (j === vuce.i ? d : x));
    } else if (vuce.vrsta === "putanja")
      putanja = putanja.map((x, j) => (j === vuce.i ? sn : x));
  }
  const up = () => (vuce = null);

  function key(e, vrsta, i = 0) {
    if ((!aktivno && pitanje) || jeRad) return;
    const k = korakVuci(spec);
    const pom = {
      ArrowRight: [k, 0],
      ArrowLeft: [-k, 0],
      ArrowUp: [0, k],
      ArrowDown: [0, -k],
    }[e.key];
    if (!pom) return;
    e.preventDefault();
    const pomakni = (t) => unutra([okr(t[0] + pom[0]), okr(t[1] + pom[1])]);
    if (vrsta === "vrh") vrh = pomakni(vrh);
    else if (vrsta === "kx") komp = [okr(komp[0] + pom[0]), komp[1]];
    else if (vrsta === "ky") komp = [komp[0], okr(komp[1] + pom[1])];
    else if (vrsta === "vektor") {
      const t = pomakni(vektoriSad[i].do);
      dd = dd.map((x, j) =>
        j === i
          ? [okr(t[0] - vektoriSad[i].od[0]), okr(t[1] - vektoriSad[i].od[1])]
          : x,
      );
    } else if (vrsta === "putanja")
      putanja = putanja.map((x, j) => (j === i ? pomakni(x) : x));
  }

  // provjera
  let poslano = $state(null);
  const odgovorSad = () =>
    jeRad
      ? kut
      : nacin === "rastavi"
        ? [...komp]
        : nacin === "razlika"
          ? [okr(vrh[0] - repDv[0]), okr(vrh[1] - repDv[1])]
          : [...vrh];
  let neprom = $derived(
    poslano != null && poslano === JSON.stringify(odgovorSad()),
  );
  let otkriveno = $derived(!pitanje || locked || pokazi);
  let losa = $derived(neprom && ishod && !ishod.tocno && !ishod.prazno);
  function provjeri() {
    if (locked) return;
    poslano = JSON.stringify(odgovorSad());
    onodgovor(odgovorSad());
  }

  const fmtV = (t) =>
    `(${formatNumber(okr(t[0]))}, ${formatNumber(okr(t[1]))})`;
  let stavkeMreza = $derived.by(() => {
    if (jeRad) return [];
    const out = [];
    if (nacin === "istrazi") {
      if (putanja.length >= 2) {
        const put = putanja
          .slice(1)
          .reduce(
            (z, t, i) =>
              z + duljina([t[0] - putanja[i][0], t[1] - putanja[i][1]]),
            0,
          );
        const p = [
          putanja.at(-1)[0] - putanja[0][0],
          putanja.at(-1)[1] - putanja[0][1],
        ];
        out.push({
          kljuc: "put",
          oznaka: "s",
          naziv: "put (duljina puta)",
          tekst: iznosJed(put, jed),
          boja: "var(--lx-water)",
        });
        out.push({
          kljuc: "pomak",
          oznaka: "Δr",
          naziv: "pomak (od početka do kraja)",
          tekst: iznosJed(duljina(p), jed),
          boja: "var(--primary)",
        });
      }
      vektoriSad.forEach((v, i) => {
        const ozn = v.oznaka && v.oznaka.length <= 3 ? v.oznaka : `v_${i + 1}`;
        if (prikazi.includes("iznos"))
          out.push({
            kljuc: `i${i}`,
            oznaka: ozn,
            naziv: "iznos",
            tekst: iznosJed(duljina(v.d), jed),
            boja: BOJE[i % 4],
          });
        if (prikazi.includes("komponente"))
          out.push({
            kljuc: `k${i}`,
            oznaka: ozn,
            naziv: "komponente (x, y)",
            tekst: fmtV(v.d),
            boja: BOJE[i % 4],
          });
      });
      if (prikazi.includes("zbroj") && vektoriSad.length >= 2) {
        const z = vektoriSad.reduce(
          (a, v) => [a[0] + v.d[0], a[1] + v.d[1]],
          [0, 0],
        );
        out.push({
          kljuc: "z",
          oznaka: "zbroj",
          naziv: `komponente ${fmtV(z)}`,
          tekst: iznosJed(duljina(z), jed),
          boja: "var(--primary)",
        });
      }
    }
    if (nacin === "zbroji" && otkriveno)
      out.push({
        kljuc: "z",
        oznaka: "zbroj",
        naziv: "iznos zbroja",
        tekst: iznosJed(duljina([vrh[0] - P0[0], vrh[1] - P0[1]]), jed),
        status: "ok",
      });
    if (nacin === "rastavi") {
      out.push({
        kljuc: "kx",
        oznaka: "F_x",
        naziv: "vodoravna komponenta",
        tekst: iznosJed(komp[0], jed),
        skriveno: !otkriveno,
        boja: "var(--primary)",
      });
      out.push({
        kljuc: "ky",
        oznaka: "F_y",
        naziv: "okomita komponenta",
        tekst: iznosJed(komp[1], jed),
        skriveno: !otkriveno,
        boja: "var(--success)",
      });
    }
    if (nacin === "razlika" && otkriveno)
      out.push({
        kljuc: "dv",
        oznaka: "Δv",
        naziv: "iznos promjene brzine",
        tekst: iznosJed(duljina([vrh[0] - repDv[0], vrh[1] - repDv[1]]), jed),
        status: "ok",
      });
    return out;
  });

  // ════════ rad ════════
  const F = untrack(() => spec.F ?? 1);
  const SM = untrack(() => spec.s ?? 1);
  let kut = $state(untrack(() => spec.kut ?? 0));
  let vel = $derived(jeRad ? radVelicine(spec, kut) : null);
  const RX0 = 92;
  const RPOD = 170;
  const RL = 92; // duljina strelice sile
  const RSP = 150; // duljina strelice pomaka
  let tijek = $state(0); // 0–1 položaj sanduka u animaciji
  $effect(() => {
    if (!pokazi || !jeRad || nacin !== "postavi") return;
    untrack(
      () =>
        (kut = analizaCilja(
          { ...spec, klizaci: [radKlizac(spec)] },
          radKlizac(spec),
          (p) => radVelicine(spec, p.kut),
        ).best),
    );
  });
  function pomakniKut([px, py]) {
    const c = [RX0 + tijek * RSP, RPOD - 24];
    let a = (Math.atan2(c[1] - py, px - c[0]) * 180) / Math.PI;
    if (a < -90) a = 180;
    else if (a < 0) a = 0;
    kut = Math.round(a / korakKuta(spec)) * korakKuta(spec);
  }
  function kutKey(e) {
    if (!aktivno && pitanje) return;
    const k = korakKuta(spec);
    const d = { ArrowLeft: k, ArrowUp: k, ArrowRight: -k, ArrowDown: -k }[
      e.key
    ];
    if (!d) return;
    e.preventDefault();
    kut = Math.min(180, Math.max(0, kut + d));
  }
  onMount(() => {
    if (!jeRad || nacin !== "istrazi") return;
    let id;
    let t0 = 0;
    const petlja = (now) => {
      if (!prefersReducedMotion.current) {
        t0 ||= now;
        const f = ((now - t0) / 3200) % 1.25;
        tijek = Math.min(1, f);
      }
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  let bojaRada = $derived(
    !vel
      ? ""
      : vel.W > 1e-9
        ? "var(--success)"
        : vel.W < -1e-9
          ? "var(--danger)"
          : "var(--text-dim)",
  );
  let stavkeRad = $derived.by(() => {
    if (!jeRad) return [];
    const skrij = nacin === "postavi" && !otkriveno && !(neprom && ishod);
    return [
      {
        kljuc: "kut",
        oznaka: "α",
        naziv: RAD_META.kut.naziv,
        tekst: `${formatNumber(kut)}°`,
      },
      {
        kljuc: "F_s",
        oznaka: "F_s",
        naziv: "komponenta sile u smjeru pomaka (F·cos α)",
        tekst: iznosJed(vel.F_s, "N"),
        boja: bojaRada,
        skriveno: skrij,
      },
      {
        kljuc: "W",
        oznaka: "W",
        naziv: "rad W = F·s·cos α",
        tekst: opisVelicine(vel.W, RAD_META.W),
        boja: bojaRada,
        skriveno: skrij,
        status:
          nacin === "postavi" && neprom && ishod
            ? ishod.tocno
              ? "ok"
              : "bad"
            : pokazi
              ? "ok"
              : null,
      },
    ];
  });

  let opis = $derived(
    jeRad
      ? `Sanduk se pomiče ${iznosJed(SM, "m")} udesno; sila ${iznosJed(F, "N")} pod kutom ${formatNumber(kut)}° prema smjeru pomaka.`
      : `Mreža, jedan kvadratić ${iznosJed(M.korak, jed)}. Zadani vektori: ${vektoriSad.map((v) => `${v.oznaka ?? ""} od ${fmtV(v.od)} do ${fmtV(v.do)}`).join("; ")}.`,
  );
  const uputa = {
    zbroji:
      "Povuci vrh ljubičaste strelice iz početne točke do mjesta gdje završava zbroj, pa provjeri.",
    rastavi:
      "Povuci dvije ručice: vodoravnu komponentu po vodoravnoj osi i okomitu po okomitoj osi.",
    razlika: "Povuci vrh strelice Δv koja kreće iz vrha v₁.",
    rad: "Povuci vrh sile da je okreneš.",
  };
</script>

{#if pitanje}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="ve-tekst"><Md text={spec.tekst} /></div>
{/if}

{#if !jeRad}
  <figure class="lx-figure ve" style:max-width="{Math.round(VW * 1.25)}px">
    <svg
      bind:this={svgEl}
      viewBox="0 0 {r1(VW)} {r1(VH)}"
      role="img"
      aria-label={opis}
    >
      {#each linijeX as x (x)}
        <line
          class="ve-mreza"
          class:ve-os={x === 0 && !spec.strane_svijeta}
          x1={r1(X(x))}
          y1={RUB}
          x2={r1(X(x))}
          y2={r1(VH - RUB)}
        />
      {/each}
      {#each linijeY as y (y)}
        <line
          class="ve-mreza"
          class:ve-os={y === 0 && !spec.strane_svijeta}
          x1={r1(X(M.x[0]))}
          y1={r1(Y(y))}
          x2={r1(X(M.x[1]))}
          y2={r1(Y(y))}
        />
      {/each}
      {#if spec.strane_svijeta}
        <text class="ve-strana" x={r1(VW / 2)} y="17" text-anchor="middle"
          >S</text
        >
        <text
          class="ve-strana"
          x={r1(VW / 2)}
          y={r1(VH - 6)}
          text-anchor="middle">J</text
        >
        <text
          class="ve-strana"
          x={r1(VW - 10)}
          y={r1(VH / 2 + 5)}
          text-anchor="middle">I</text
        >
        <text class="ve-strana" x="10" y={r1(VH / 2 + 5)} text-anchor="middle"
          >Z</text
        >
        <text
          class="lx-label"
          x={r1(X(M.x[1]))}
          y={r1(VH - 8)}
          text-anchor="end">□ = {iznosJed(M.korak, jed)}</text
        >
      {:else}
        {#each linijeX.filter((x) => Math.round(x / M.korak) % svakiN === 0) as x (x)}
          <text
            class="lx-label ve-broj"
            x={r1(X(x))}
            y={r1(VH - RUB + 15)}
            text-anchor="middle">{formatNumber(x)}</text
          >
        {/each}
        {#each linijeY.filter((y) => Math.round(y / M.korak) % svakiN === 0) as y (y)}
          <text
            class="lx-label ve-broj"
            x={r1(X(M.x[0]) - 5)}
            y={r1(Y(y) + 4)}
            text-anchor="end">{formatNumber(y)}</text
          >
        {/each}
        {#if jed}<text
            class="lx-label"
            x={r1(X(M.x[1]))}
            y="16"
            text-anchor="end">{jed}</text
          >{/if}
      {/if}

      <!-- zadani vektori -->
      {#if nacin === "razlika"}
        {#each vektoriSad as v, i (i)}
          {@const od = P0}
          <Strelica
            x1={X(od[0])}
            y1={Y(od[1])}
            x2={X(od[0] + v.d[0])}
            y2={Y(od[1] + v.d[1])}
            boja={BOJE[i]}
            oznaka={v.oznaka ?? `v_${i + 1}`}
          />
          {#if v.od[0] !== P0[0] || v.od[1] !== P0[1]}
            <Strelica
              x1={X(v.od[0])}
              y1={Y(v.od[1])}
              x2={X(v.do[0])}
              y2={Y(v.do[1])}
              boja={BOJE[i]}
              prozirnost={0.35}
              isprekidano
              sirina={2}
            />
          {/if}
        {/each}
      {:else}
        {#each vektoriSad as v, i (i)}
          {#if nacin === "rastavi" && (losa || pokazi || locked)}
            <line
              class="ve-okomica"
              x1={r1(X(v.do[0]))}
              y1={r1(Y(v.do[1]))}
              x2={r1(X(v.do[0]))}
              y2={r1(Y(v.od[1]))}
            />
            <line
              class="ve-okomica"
              x1={r1(X(v.do[0]))}
              y1={r1(Y(v.do[1]))}
              x2={r1(X(v.od[0]))}
              y2={r1(Y(v.do[1]))}
            />
          {/if}
          {#if nacin === "istrazi" && prikazi.includes("komponente")}
            <line
              class="ve-okomica"
              x1={r1(X(v.od[0]))}
              y1={r1(Y(v.od[1]))}
              x2={r1(X(v.do[0]))}
              y2={r1(Y(v.od[1]))}
            />
            <line
              class="ve-okomica"
              x1={r1(X(v.do[0]))}
              y1={r1(Y(v.od[1]))}
              x2={r1(X(v.do[0]))}
              y2={r1(Y(v.do[1]))}
            />
          {/if}
          <Strelica
            x1={X(v.od[0])}
            y1={Y(v.od[1])}
            x2={X(v.do[0])}
            y2={Y(v.do[1])}
            boja={BOJE[i % 4]}
            oznaka={v.oznaka ?? ""}
            oznakaOdmak={v.oznaka && v.oznaka.length > 3 ? 0 : 14}
            oznakaStrana={v.oznaka && v.oznaka.length > 3 ? -16 : 0}
          />
          {#if v.pomicno}
            <circle
              class="ve-rucka lx-handle"
              role="slider"
              tabindex="0"
              aria-label="Vrh vektora {v.oznaka ??
                i + 1}: povuci ili koristi strelice"
              aria-valuenow={duljina(v.d)}
              aria-valuetext={fmtV(v.do)}
              cx={r1(X(v.do[0]))}
              cy={r1(Y(v.do[1]))}
              r="12"
              style:--b={BOJE[i % 4]}
              onpointerdown={(e) => down(e, "vektor", i)}
              onpointermove={move}
              onpointerup={up}
              onpointercancel={up}
              onkeydown={(e) => key(e, "vektor", i)}
            />
          {/if}
        {/each}
      {/if}
      {#if nacin === "istrazi" && prikazi.includes("zbroj") && vektoriSad.length >= 2}
        {@const z = vektoriSad.reduce(
          (a, v) => [a[0] + v.d[0], a[1] + v.d[1]],
          [0, 0],
        )}
        {@const o = vektoriSad[0].od}
        <Strelica
          x1={X(o[0])}
          y1={Y(o[1])}
          x2={X(o[0] + z[0])}
          y2={Y(o[1] + z[1])}
          boja="var(--primary)"
          isprekidano
          oznaka="zbroj"
          oznakaOdmak={0}
          oznakaStrana={18}
        />
      {/if}

      <!-- putanja: dionice i pomak -->
      {#if putanja.length >= 2}
        {#each putanja.slice(1) as t, i (i)}
          <Strelica
            x1={X(putanja[i][0])}
            y1={Y(putanja[i][1])}
            x2={X(t[0])}
            y2={Y(t[1])}
            boja="var(--lx-water)"
            sirina={3}
          />
        {/each}
        <Strelica
          x1={X(putanja[0][0])}
          y1={Y(putanja[0][1])}
          x2={X(putanja.at(-1)[0])}
          y2={Y(putanja.at(-1)[1])}
          boja="var(--primary)"
          isprekidano
          oznaka="Δr"
          oznakaOdmak={0}
          oznakaStrana={-18}
        />
        <circle
          class="ve-o"
          cx={r1(X(putanja[0][0]))}
          cy={r1(Y(putanja[0][1]))}
          r="4"
        />
        <text
          class="ve-o-t"
          x={r1(X(putanja[0][0]) - 8)}
          y={r1(Y(putanja[0][1]) - 8)}
          text-anchor="end">O</text
        >
        {#each putanja.slice(1) as t, j (j)}
          <circle
            class="ve-rucka lx-handle"
            role="slider"
            tabindex="0"
            aria-label="Točka puta {j + 1}: povuci ili koristi strelice"
            aria-valuenow={j + 1}
            aria-valuetext={fmtV(t)}
            cx={r1(X(t[0]))}
            cy={r1(Y(t[1]))}
            r="12"
            style:--b="var(--lx-water)"
            onpointerdown={(e) => down(e, "putanja", j + 1)}
            onpointermove={move}
            onpointerup={up}
            onpointercancel={up}
            onkeydown={(e) => key(e, "putanja", j + 1)}
          />
        {/each}
      {/if}

      <!-- učenikov odgovor -->
      {#if nacin === "zbroji" || nacin === "razlika"}
        {@const rep = nacin === "razlika" ? repDv : P0}
        {#if nacin === "zbroji"}
          <circle class="ve-o" cx={r1(X(P0[0]))} cy={r1(Y(P0[1]))} r="4" />
          <text
            class="ve-o-t"
            x={r1(X(P0[0]) - 8)}
            y={r1(Y(P0[1]) - 8)}
            text-anchor="end">O</text
          >
        {/if}
        <Strelica
          x1={X(rep[0])}
          y1={Y(rep[1])}
          x2={X(vrh[0])}
          y2={Y(vrh[1])}
          boja={losa ? "var(--danger)" : "var(--primary)"}
          sirina={3.2}
          oznaka={nacin === "razlika" ? "Δv" : ""}
        />
        {#if aktivno}
          <g
            class="ve-vrh lx-handle"
            role="slider"
            tabindex="0"
            aria-label="Vrh strelice: povuci ili koristi strelice"
            aria-valuenow={duljina([vrh[0] - rep[0], vrh[1] - rep[1]])}
            aria-valuetext={fmtV(vrh)}
            onpointerdown={(e) => down(e, "vrh")}
            onpointermove={move}
            onpointerup={up}
            onpointercancel={up}
            onkeydown={(e) => key(e, "vrh")}
          >
            <circle
              class="ve-hit"
              cx={r1(X(vrh[0]))}
              cy={r1(Y(vrh[1]))}
              r="20"
            />
            <circle
              class="ve-rucka"
              class:ve-ceka={vrh[0] === rep[0] && vrh[1] === rep[1]}
              cx={r1(X(vrh[0]))}
              cy={r1(Y(vrh[1]))}
              r="8"
              style:--b="var(--primary)"
            />
          </g>
        {/if}
      {/if}
      {#if nacin === "rastavi"}
        <Strelica
          x1={X(P0[0])}
          y1={Y(P0[1])}
          x2={X(P0[0] + komp[0])}
          y2={Y(P0[1])}
          boja="var(--primary)"
          sirina={3}
          oznaka={Math.abs(komp[0]) > 0 ? "F_x" : ""}
        />
        <Strelica
          x1={X(P0[0])}
          y1={Y(P0[1])}
          x2={X(P0[0])}
          y2={Y(P0[1] + komp[1])}
          boja="var(--success)"
          sirina={3}
          oznaka={Math.abs(komp[1]) > 0 ? "F_y" : ""}
        />
        {#if aktivno}
          {@const gx = [X(P0[0] + komp[0]), Y(P0[1]) + 16]}
          {@const gy = [X(P0[0]) - 16, Y(P0[1] + komp[1])]}
          <g
            class="lx-handle ve-vrh"
            role="slider"
            tabindex="0"
            aria-label="Vodoravna komponenta: povuci lijevo ili desno"
            aria-valuenow={komp[0]}
            onpointerdown={(e) => down(e, "kx")}
            onpointermove={move}
            onpointerup={up}
            onpointercancel={up}
            onkeydown={(e) => key(e, "kx")}
          >
            <circle class="ve-hit" cx={r1(gx[0])} cy={r1(gx[1])} r="20" />
            <path
              class="ve-grip"
              style:--b="var(--primary)"
              d="M{r1(gx[0])},{r1(gx[1] - 9)} l8,12 h-16 z"
            />
            <line
              class="ve-grip-l"
              style:--b="var(--primary)"
              x1={r1(gx[0])}
              y1={r1(gx[1] - 9)}
              x2={r1(gx[0])}
              y2={r1(Y(P0[1]))}
            />
          </g>
          <g
            class="lx-handle ve-vrh"
            role="slider"
            tabindex="0"
            aria-label="Okomita komponenta: povuci gore ili dolje"
            aria-valuenow={komp[1]}
            onpointerdown={(e) => down(e, "ky")}
            onpointermove={move}
            onpointerup={up}
            onpointercancel={up}
            onkeydown={(e) => key(e, "ky")}
          >
            <circle class="ve-hit" cx={r1(gy[0])} cy={r1(gy[1])} r="20" />
            <path
              class="ve-grip"
              style:--b="var(--success)"
              d="M{r1(gy[0] + 9)},{r1(gy[1])} l-12,8 v-16 z"
            />
            <line
              class="ve-grip-l"
              style:--b="var(--success)"
              x1={r1(gy[0] + 9)}
              y1={r1(gy[1])}
              x2={r1(X(P0[0]))}
              y2={r1(gy[1])}
            />
          </g>
        {/if}
      {/if}
    </svg>
  </figure>
  <Ocitanja stavke={stavkeMreza} />
{:else}
  {@const c = [RX0 + tijek * RSP, RPOD - 24]}
  {@const t = [c[0] + Math.cos(rad(kut)) * RL, c[1] - Math.sin(rad(kut)) * RL]}
  {@const th = [
    c[0] + Math.cos(rad(kut)) * (RL + 14),
    c[1] - Math.sin(rad(kut)) * (RL + 14),
  ]}
  {@const fs = Math.cos(rad(kut)) * RL}
  <figure class="lx-figure ve">
    <svg bind:this={svgEl} viewBox="0 30 360 200" role="img" aria-label={opis}>
      <line class="ve-pod" x1="10" y1={RPOD} x2="350" y2={RPOD} />
      <rect
        class="ve-duh"
        x={RX0 + RSP - 30}
        y={RPOD - 46}
        width="60"
        height="46"
        rx="3"
      />
      <Strelica
        x1={RX0}
        y1={RPOD + 22}
        x2={RX0 + RSP}
        y2={RPOD + 22}
        boja="var(--text-dim)"
        sirina={2}
      />
      <text
        class="lx-label"
        x={RX0 + RSP / 2}
        y={RPOD + 44}
        text-anchor="middle">s = {iznosJed(SM, "m")}</text
      >
      <rect
        class="ve-sanduk"
        x={r1(c[0] - 30)}
        y={RPOD - 46}
        width="60"
        height="46"
        rx="3"
      />
      <!-- projekcija vrha sile na smjer pomaka -->
      <line
        class="ve-okomica"
        x1={r1(t[0])}
        y1={r1(t[1])}
        x2={r1(t[0])}
        y2={r1(c[1])}
      />
      {#if Math.abs(fs) > 2}
        <Strelica
          x1={c[0]}
          y1={c[1]}
          x2={c[0] + fs}
          y2={c[1]}
          boja={bojaRada}
          sirina={4}
          glava={11}
          oznaka="F_s"
          oznakaOdmak={0}
          oznakaStrana={fs > 0 ? 16 : -16}
        />
      {/if}
      {#if kut > 0.5 && kut < 179.5}
        {@const ar = 30}
        <path
          class="ve-luk"
          d="M{r1(c[0] + ar)},{r1(c[1])} A{ar},{ar} 0 0 0 {r1(
            c[0] + ar * Math.cos(rad(kut)),
          )},{r1(c[1] - ar * Math.sin(rad(kut)))}"
        />
        <text
          class="ve-kut-t"
          x={r1(c[0] + 44 * Math.cos(rad(kut / 2)))}
          y={r1(c[1] - 44 * Math.sin(rad(kut / 2)) + 4)}
          text-anchor="middle">α</text
        >
      {/if}
      <Strelica
        x1={c[0]}
        y1={c[1]}
        x2={t[0]}
        y2={t[1]}
        boja="var(--primary)"
        sirina={3}
        oznaka="F"
        oznakaOdmak={0}
        oznakaStrana={-16}
      />
      <circle class="ve-tezste" cx={r1(c[0])} cy={r1(c[1])} r="3.2" />
      {#if aktivno || !pitanje}
        <g
          class="lx-handle ve-vrh"
          role="slider"
          tabindex="0"
          aria-label="Kut sile: povuci vrh ili koristi strelice"
          aria-valuemin="0"
          aria-valuemax="180"
          aria-valuenow={kut}
          aria-valuetext="{formatNumber(kut)}°"
          onpointerdown={(e) => down(e, "kut")}
          onpointermove={move}
          onpointerup={up}
          onpointercancel={up}
          onkeydown={kutKey}
        >
          <circle class="ve-hit" cx={r1(th[0])} cy={r1(th[1])} r="22" />
          <circle
            class="ve-rucka"
            cx={r1(th[0])}
            cy={r1(th[1])}
            r="8"
            style:--b="var(--primary)"
          />
        </g>
      {/if}
      {#if nacin === "istrazi" && Math.abs(vel.W) < 1e-9}
        <text class="ve-nula" x="350" y="54" text-anchor="end"
          >sila ne obavlja rad</text
        >
      {/if}
    </svg>
  </figure>
  <Ocitanja stavke={stavkeRad} />
{/if}

{#if pitanje}
  <p class="ve-uputa">{jeRad ? uputa.rad : uputa[nacin]}</p>
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked}>Provjeri</button
    >
  </div>
{:else if !jeRad && ((spec.vektori ?? []).some((v) => v.pomicno) || spec.putanja)}
  <p class="ve-uputa">Povuci kružiće.</p>
{:else if jeRad}
  <p class="ve-uputa">
    Povuci vrh sile i okreći je; zeleno je pozitivan rad, crveno negativan.
  </p>
{/if}

<style>
  .ve-tekst {
    margin-bottom: 10px;
  }
  .ve {
    margin-bottom: 8px;
  }
  .ve svg {
    touch-action: manipulation;
  }
  .ve-mreza {
    stroke: var(--border);
    stroke-width: 1;
  }
  .ve-mreza.ve-os {
    stroke: var(--text-faint);
    stroke-width: 1.6;
  }
  .ve-strana {
    fill: var(--text-dim);
    font: 700 13px var(--font-sans);
  }
  .ve-broj {
    font-size: 10.5px;
  }
  .ve-o {
    fill: var(--text);
  }
  .ve-o-t {
    fill: var(--text);
    font: 600 13px var(--font-sans);
  }
  .ve-okomica {
    stroke: var(--text-faint);
    stroke-dasharray: 4 3;
    stroke-width: 1.3;
  }
  .ve-rucka {
    fill: color-mix(in srgb, var(--b) 20%, transparent);
    stroke: var(--b);
    stroke-width: 1.8;
    outline: none;
  }
  .ve-rucka:focus-visible,
  .ve-vrh:focus-visible .ve-rucka {
    stroke-width: 4;
  }
  .ve-rucka.ve-ceka {
    fill: color-mix(in srgb, var(--b) 25%, var(--bg-elev));
    animation: ve-puls 1.4s ease-in-out infinite;
  }
  @keyframes ve-puls {
    50% {
      r: 11px;
    }
  }
  .ve-vrh {
    outline: none;
  }
  .ve-hit {
    fill: transparent;
  }
  .ve-grip {
    fill: var(--b);
  }
  .ve-vrh:focus-visible .ve-grip {
    stroke: var(--text);
  }
  .ve-grip-l {
    stroke: var(--b);
    stroke-width: 1.3;
    stroke-dasharray: 2 2;
  }
  .ve-pod {
    stroke: var(--text);
    stroke-width: 2;
  }
  .ve-sanduk {
    fill: color-mix(in srgb, var(--warn) 22%, var(--bg-elev));
    stroke: var(--text);
    stroke-width: 1.8;
  }
  .ve-duh {
    fill: none;
    stroke: var(--text-faint);
    stroke-dasharray: 5 4;
  }
  .ve-luk {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.4;
  }
  .ve-kut-t {
    fill: var(--text-dim);
    font: italic 600 13px var(--font-sans);
  }
  .ve-tezste {
    fill: var(--text);
  }
  .ve-nula {
    fill: var(--text-dim);
    font: 600 13px var(--font-sans);
  }
  .ve-uputa {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 0 0 4px;
  }
</style>
