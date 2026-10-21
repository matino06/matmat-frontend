<script>
  // Hidrostatički tlak: posude različitih oblika, sonda s manometrom koja se vuče kroz tekućinu, uronjena kocka sa
  // silama tlaka na plohe. Svi brojevi dolaze iz kataloga (tlak, sileTijela, najveciTlak…), pa crtež i provjera
  // nikad ne kažu različito.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import BrojUnos from "../BrojUnos.svelte";
  import {
    posude as posudeOf,
    tlak,
    tlakDno,
    tijelo as tijeloOf,
    sileTijela,
    korakSonde,
    dubinaCilja,
    najveciTlak,
    p0Of,
  } from "$lib/lesson/katalog/fizika/tlak_dubina.js";
  import { gOf, fmtBroj, fmtJ } from "$lib/lesson/katalog/fizika/_fluidi.js";
  import { formatNumber } from "$lib/lesson/core/number.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const W = 360;
  const VRH = 56; // vrh stijenki
  const POV = 74; // površina najviše tekućine

  let nacin = $derived(spec.nacin);
  let ps = $derived(posudeOf(spec));
  let n = $derived(ps.length);
  let g = $derived(gOf(spec));
  let p0 = $derived(p0Of(spec));
  let spojene = $derived(!!spec.spojene);
  let DNO = $derived(spojene ? 226 : 236);
  let Hmax = $derived(Math.max(...ps.map((p) => p.h)));
  let mj = $derived((DNO - POV) / Hmax); // px po metru
  let korak = $derived(korakSonde(spec));
  let kocka = $derived(tijeloOf(spec));
  let pi = $derived(
    Number.isInteger(spec.pitaj?.posuda) ? spec.pitaj.posuda : 0,
  );
  let velicina = $derived(spec.pitaj?.velicina ?? "p");
  let pokaziRjesenje = $derived(pokazi || !!ishod?.tocno);

  // ── posude ──
  let slot = $derived(Math.min((W - 28) / n, 230));
  const cxOf = (i) => W / 2 + (i - (n - 1) / 2) * slot;
  // profil posude: u od 0 (dno) do 1 (vrh stijenke) → [pomak središta, pola širine], u dijelovima širine mjesta
  const PROFIL = {
    valjak: () => [0, 0.27],
    siroka: () => [0, 0.42],
    uska: () => [0, 0.075],
    lijevak: (u) => [0, 0.1 + 0.32 * u],
    obrnuti_lijevak: (u) => [0, 0.42 - 0.32 * u],
    kosa: (u) => [-0.2 + 0.4 * u, 0.15],
    boca: (u) => [
      0,
      u < 0.42 ? 0.36 : u < 0.6 ? 0.36 - ((u - 0.42) / 0.18) * 0.27 : 0.09,
    ],
  };
  const yOfU = (u) => DNO - u * (DNO - VRH);
  const uOfY = (y) => (DNO - y) / (DNO - VRH);
  function rubovi(i, y) {
    const [o, hw] = PROFIL[ps[i].oblik](Math.min(1, Math.max(0, uOfY(y))));
    const c = cxOf(i) + o * slot;
    return [c - hw * slot, c + hw * slot];
  }
  const US = Array.from({ length: 41 }, (_, k) => k / 40);
  const r1 = (x) => Math.round(x * 10) / 10;
  const povrsina = (i) => DNO - ps[i].h * mj;
  // stijenke: lijevo od vrha do dna, dno, desno do vrha (kod spojenih posuda dno je otvoreno prema cijevi)
  function stijenke(i) {
    const L = US.map((u) => [rubovi(i, yOfU(u))[0], yOfU(u)]).reverse();
    const R = US.map((u) => [rubovi(i, yOfU(u))[1], yOfU(u)]);
    if (spojene)
      return `M${L.map((p) => p.map(r1).join(",")).join(" L")} M${R.map((p) => p.map(r1).join(",")).join(" L")}`;
    return `M${[...L, ...R].map((p) => p.map(r1).join(",")).join(" L")}`;
  }
  function tekucina(i) {
    const yp = povrsina(i);
    const us = [...US.filter((u) => yOfU(u) > yp), uOfY(yp)];
    const L = us.map((u) => [rubovi(i, yOfU(u))[0], yOfU(u)]);
    const R = us.map((u) => [rubovi(i, yOfU(u))[1], yOfU(u)]).reverse();
    return `M${[...L, ...R].map((p) => p.map(r1).join(",")).join(" L")} Z`;
  }
  // cijev koja spaja dna spojenih posuda
  let cijevSpoj = $derived.by(() => {
    if (!spojene) return null;
    const a = rubovi(0, DNO)[0];
    const b = rubovi(n - 1, DNO)[1];
    const vrhovi = [];
    for (let i = 0; i < n - 1; i++)
      vrhovi.push([rubovi(i, DNO)[1], rubovi(i + 1, DNO)[0]]);
    return { a, b, vrhovi };
  });

  const BOJE = ["var(--lx-water)", "var(--warn)", "var(--success)"];
  let boje = $derived.by(() => {
    const imena = [...new Set(ps.map((p) => p.tekucina))];
    return ps.map((p) => {
      const t = (p.tekucina ?? "").toLowerCase();
      if (/voda|more/.test(t)) return "var(--lx-water)";
      if (/ulje|alkohol|benzin/.test(t)) return "var(--warn)";
      if (/živa/.test(t)) return "var(--text-dim)";
      return BOJE[imena.indexOf(p.tekucina) % 3];
    });
  });

  // ── sonda ──
  const snap = (d, h) =>
    Math.min(h, Math.max(0, Math.round(d / korak) * korak));
  function pocetnaSonda() {
    const h = posudeOf(spec)[0].h;
    const k = korakSonde(spec);
    if (spec.nacin === "postavi") {
      const cilj = dubinaCilja(spec);
      return {
        i: Number.isInteger(spec.pitaj?.posuda) ? spec.pitaj.posuda : 0,
        d: Math.abs(cilj - k) < k / 2 ? 2 * k : k,
        f: 0,
      };
    }
    return { i: 0, d: Math.round(h / 2 / k) * k, f: 0 };
  }
  let sonda = $state(untrack(pocetnaSonda));
  let vuceSondu = $state(false);
  let sondaX = $derived.by(() => {
    const y = povrsina(sonda.i) + sonda.d * mj;
    const [a, b] = rubovi(sonda.i, y);
    return { x: (a + b) / 2 + sonda.f * ((b - a) / 2 - 9), y };
  });
  let pSonde = $derived(tlak(spec, sonda.i, sonda.d));
  let pMax = $derived(Math.max(...ps.map((_, i) => tlakDno(spec, i))));
  let kut = $derived(-135 + 270 * Math.min(1, pSonde / pMax));
  let poslanaDubina = $state(null);

  // u izmjeri sonda se pojavi tek s rješenjem, u točki koju se pita
  $effect(() => {
    if (nacin === "izmjeri" && velicina === "p" && pokaziRjesenje)
      untrack(() => (sonda = { i: pi, d: spec.pitaj.dubina, f: 0 }));
    if (nacin === "postavi" && pokazi)
      untrack(() => (sonda = { ...sonda, i: pi, d: dubinaCilja(spec) }));
  });

  let svgEl = $state();
  const tocka = (e) => {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  };
  let sondaAktivna = $derived(
    (nacin === "istrazi" && !kocka) || (nacin === "postavi" && !locked),
  );
  function postaviSondu(e, i) {
    const p = tocka(e);
    if (!p) return;
    if (nacin === "postavi" && i !== pi) return;
    const h = ps[i].h;
    const d = snap((p.y - povrsina(i)) / mj, h);
    const y = povrsina(i) + d * mj;
    const [a, b] = rubovi(i, y);
    const pola = Math.max(1, (b - a) / 2 - 9);
    sonda = { i, d, f: Math.max(-1, Math.min(1, (p.x - (a + b) / 2) / pola)) };
  }
  function sondaDolje(e, i) {
    if (!sondaAktivna || e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    vuceSondu = true;
    postaviSondu(e, i);
  }
  function sondaPomak(e, i) {
    if (vuceSondu) postaviSondu(e, i);
  }
  const sondaGore = () => (vuceSondu = false);
  function sondaTipka(e) {
    if (!sondaAktivna) return;
    const h = ps[sonda.i].h;
    if (e.key === "ArrowDown")
      sonda = { ...sonda, d: snap(sonda.d + korak, h) };
    else if (e.key === "ArrowUp")
      sonda = { ...sonda, d: snap(sonda.d - korak, h) };
    else if (
      (e.key === "ArrowRight" || e.key === "ArrowLeft") &&
      nacin === "istrazi" &&
      n > 1
    ) {
      const i = (sonda.i + (e.key === "ArrowRight" ? 1 : n - 1)) % n;
      sonda = { i, d: Math.min(sonda.d, ps[i].h), f: 0 };
    } else return;
    e.preventDefault();
  }

  // ── kocka ──
  let dKocke = $state(untrack(() => tijeloOf(spec)?.d ?? 0));
  let vuceKocku = $state(false);
  let pomakKocke = 0;
  let kPx = $derived(kocka ? kocka.a * mj : 0);
  let cxK = $derived(cxOf(0));
  let yK = $derived(kocka ? povrsina(0) + dKocke * mj : 0);
  let sile = $derived(kocka ? sileTijela(spec, dKocke) : null);
  let kStrelica = $derived(kocka ? (0.9 * kPx) / (ps[0].rho * g * ps[0].h) : 0); // px po Pa
  let kockaAktivna = $derived(!!kocka && nacin === "istrazi");
  const snapK = (d) =>
    Math.min(ps[0].h - kocka.a, Math.max(0, Math.round(d / korak) * korak));
  function kockaDolje(e) {
    if (!kockaAktivna || e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = tocka(e);
    pomakKocke = p ? p.y - yK : 0;
    vuceKocku = true;
  }
  function kockaPomak(e) {
    if (!vuceKocku) return;
    const p = tocka(e);
    if (p) dKocke = snapK((p.y - pomakKocke - povrsina(0)) / mj);
  }
  const kockaGore = () => (vuceKocku = false);
  function kockaTipka(e) {
    if (!kockaAktivna) return;
    if (e.key === "ArrowDown") dKocke = snapK(dKocke + korak);
    else if (e.key === "ArrowUp") dKocke = snapK(dKocke - korak);
    else return;
    e.preventDefault();
  }

  // ── usporedi ──
  let izbor = $state(null);
  let poslanIzbor = $state(undefined);
  let tocnaPosuda = $derived(nacin === "usporedi" ? najveciTlak(spec) : null);
  function odaberi(i) {
    if (locked || nacin !== "usporedi") return;
    izbor = i;
  }
  // krivi odabir ostaje samo označen (bez crvenog): zaključana kopija pitanja ne smije suziti izbor
  let stanjeIzbora = $derived(
    ishod?.tocno && poslanIzbor === izbor ? "ok" : "",
  );
  function provjeri() {
    if (locked) return;
    if (nacin === "usporedi") {
      poslanIzbor = izbor;
      onodgovor(izbor);
    } else {
      poslanaDubina = sonda.d;
      onodgovor(Math.round(sonda.d * 1e6) / 1e6);
    }
  }
  let stanjeSonde = $derived(
    nacin !== "postavi"
      ? ""
      : pokazi
        ? "ok"
        : ishod && !ishod.prazno && poslanaDubina === sonda.d
          ? ishod.tocno
            ? "ok"
            : "bad"
          : "",
  );
  let unos = $state("");

  // ── prikaz ──
  const fP = (p) => fmtJ(p, "Pa");
  const fM = (d) => `${formatNumber(Math.round(d * 1e4) / 1e4)} m`;
  let pokaziDial = $derived(
    !kocka && (nacin === "istrazi" || (nacin === "izmjeri" && pokaziRjesenje)),
  );
  let pokaziSondu = $derived(
    !kocka &&
      (nacin === "istrazi" ||
        nacin === "postavi" ||
        (nacin === "izmjeri" && pokaziRjesenje)),
  );
  let dialX = $derived(Math.min(W - 26, Math.max(26, sondaX.x)));
  let istaVisina = $derived(ps.every((p) => p.h === ps[0].h));
  let isteDubine = $derived(
    ps
      .map((p, j) =>
        j !== sonda.i && sonda.d <= p.h + 1e-9
          ? {
              j,
              x:
                cxOf(j) +
                PROFIL[p.oblik](uOfY(povrsina(j) + sonda.d * mj))[0] * slot,
              y: povrsina(j) + sonda.d * mj,
              p: tlak(spec, j, sonda.d),
            }
          : null,
      )
      .filter(Boolean),
  );
  // kotirna crta dubine uz sondu: lijevo, a ako nema mjesta, desno
  let kota = $derived.by(() => {
    const x = sondaX.x;
    // oznaka desno od sonde (unutar tekućine), osim uz desni rub crteža
    const desno = x + 70 < W;
    return {
      x: desno ? x + 13 : x - 13,
      tx: desno ? x + 18 : x - 18,
      anchor: desno ? "start" : "end",
    };
  });
  // bez manometra gornji dio crteža je prazan
  let vbVrh = $derived(pokaziDial ? 0 : 30);
  const rhoTekst = (i) => `${formatNumber(ps[i].rho)}`;
  let formula = $derived(
    `${p0 ? `${fmtBroj(p0)} + ` : ""}${rhoTekst(sonda.i)} · ${formatNumber(g)} · ${formatNumber(Math.round(sonda.d * 1e4) / 1e4)}`,
  );
  let razlicite = $derived(new Set(ps.map((p) => p.tekucina)).size > 1);

  let opis = $derived(
    `${n === 1 ? "Posuda" : `${n} posude`} s tekućinom (${[...new Set(ps.map((p) => `${p.tekucina}, ρ = ${formatNumber(p.rho)} kg/m³`))].join("; ")}), ` +
      (istaVisina
        ? `visina tekućine ${fM(ps[0].h)}`
        : ps.map((p, i) => `posuda ${i + 1}: ${fM(p.h)}`).join(", ")) +
      (pokaziSondu && nacin === "istrazi"
        ? `. Sonda u posudi ${sonda.i + 1} na dubini ${fM(sonda.d)}: p = ${fP(pSonde)}`
        : "") +
      (kocka ? `. Kocka stranice ${fM(kocka.a)} na dubini ${fM(dKocke)}.` : ""),
  );
</script>

{#if nacin === "istrazi"}
  <div class="td-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<div
  class="lx-figure td"
  class:td-jedna={n === 1}
  role={sondaAktivna || kockaAktivna ? "slider" : undefined}
  tabindex={sondaAktivna || kockaAktivna ? 0 : undefined}
  aria-label={kockaAktivna
    ? "Dubina kocke: povuci ili koristi strelice gore i dolje"
    : sondaAktivna
      ? `Dubina sonde: povuci ili koristi strelice gore i dolje${nacin === "istrazi" && n > 1 ? ", lijevo i desno mijenja posudu" : ""}`
      : undefined}
  aria-valuemin={sondaAktivna || kockaAktivna ? 0 : undefined}
  aria-valuemax={kockaAktivna
    ? ps[0].h - kocka.a
    : sondaAktivna
      ? ps[sonda.i].h
      : undefined}
  aria-valuenow={kockaAktivna ? dKocke : sondaAktivna ? sonda.d : undefined}
  aria-valuetext={kockaAktivna
    ? `${fM(dKocke)}, uzgon ${fmtJ(sile.Fu, "N", 3)}`
    : sondaAktivna
      ? `${fM(sonda.d)}${nacin === "istrazi" ? `, ${fP(pSonde)}` : ""}`
      : undefined}
  onkeydown={(e) =>
    kockaAktivna ? kockaTipka(e) : sondaAktivna ? sondaTipka(e) : null}
>
  <svg
    bind:this={svgEl}
    viewBox="0 {vbVrh} {W} {264 - vbVrh}"
    role="img"
    aria-label={opis}
  >
    <defs>
      <marker
        id="td-vrh"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
      </marker>
    </defs>

    {#if cijevSpoj}
      <rect
        class="td-tek"
        style:--td-boja={boje[0]}
        x={cijevSpoj.a}
        y={DNO}
        width={cijevSpoj.b - cijevSpoj.a}
        height="12"
      />
      <path
        class="lx-stroke td-zid"
        d="M{cijevSpoj.a},{DNO} V{DNO + 12} H{cijevSpoj.b} V{DNO}"
      />
      {#each cijevSpoj.vrhovi as [a, b], k (k)}
        <line class="lx-stroke td-zid" x1={a} y1={DNO} x2={b} y2={DNO} />
      {/each}
    {/if}

    {#each ps as p, i (i)}
      {@const odabrana = nacin === "usporedi" && izbor === i}
      <g
        class="td-posuda"
        class:td-odabrana={odabrana}
        class:ok={odabrana && stanjeIzbora === "ok"}
      >
        <path class="td-tek" style:--td-boja={boje[i]} d={tekucina(i)} />
        <line
          class="td-povrsina"
          style:--td-boja={boje[i]}
          x1={rubovi(i, povrsina(i))[0]}
          y1={povrsina(i)}
          x2={rubovi(i, povrsina(i))[1]}
          y2={povrsina(i)}
        />
        <path class="lx-stroke td-zid" d={stijenke(i)} />
        {#if sondaAktivna && (nacin === "istrazi" || i === pi)}
          <path
            class="td-hit lx-handle"
            role="presentation"
            d={tekucina(i)}
            onpointerdown={(e) => sondaDolje(e, i)}
            onpointermove={(e) => sondaPomak(e, i)}
            onpointerup={sondaGore}
            onpointercancel={sondaGore}
          />
        {/if}
      </g>
      <text
        class="lx-label td-ime"
        x={cxOf(i)}
        y={(spojene ? DNO + 12 : DNO) + 16}
        text-anchor="middle"
      >
        {n > 1 ? `${i + 1}` : ""}{razlicite
          ? `${n > 1 ? " · " : ""}${p.tekucina}`
          : ""}
      </text>
    {/each}

    <!-- visina tekućine: kotirna crta uz prvu posudu (ili uz svaku, ako su različite) -->
    {#if !pokaziSondu || nacin === "postavi"}
      {#each istaVisina ? [0] : ps.map((_, i) => i) as i (i)}
        {@const xk = Math.max(8, rubovi(i, DNO)[0] - 10)}
        {#if !(nacin === "izmjeri" && velicina === "p" && i === pi && Math.abs(spec.pitaj.dubina - ps[i].h) < 1e-9)}
          <line
            class="td-kota"
            x1={xk}
            y1={povrsina(i)}
            x2={xk}
            y2={DNO}
            marker-start="url(#td-vrh)"
            marker-end="url(#td-vrh)"
          />
          <text class="td-kota-t" x={xk - 4} y={VRH - 8} text-anchor="start"
            >h = {fM(ps[i].h)}</text
          >
        {/if}
      {/each}
    {/if}

    {#if nacin === "izmjeri" && velicina === "p" && !pokaziRjesenje}
      {@const yA = povrsina(pi) + spec.pitaj.dubina * mj}
      {@const xA =
        (rubovi(pi, Math.min(yA, DNO - 1))[0] +
          rubovi(pi, Math.min(yA, DNO - 1))[1]) /
        2}
      {@const yT = Math.min(yA, DNO - 6)}
      <line
        class="td-kota td-kota-a"
        x1={xA - 14}
        y1={povrsina(pi)}
        x2={xA - 14}
        y2={yA}
        marker-start="url(#td-vrh)"
        marker-end="url(#td-vrh)"
      />
      <text
        class="td-kota-t"
        x={xA - 19}
        y={(povrsina(pi) + yA) / 2 + 4}
        text-anchor="end">{fM(spec.pitaj.dubina)}</text
      >
      <circle class="td-tocka" cx={xA} cy={yT} r="6" />
      <text class="td-tocka-t" x={xA + 10} y={yT - 6}>?</text>
    {/if}

    <!-- ista dubina u ostalim posudama -->
    {#if pokaziSondu && nacin === "istrazi" && n > 1}
      {#if istaVisina}
        <line
          class="td-izobara"
          x1="8"
          y1={sondaX.y}
          x2={W - 8}
          y2={sondaX.y}
        />
      {/if}
      {#each isteDubine as t (t.j)}
        <circle class="td-ista" cx={t.x} cy={t.y} r="5" />
      {/each}
    {/if}

    {#if pokaziSondu}
      <g
        class="td-sonda"
        class:td-vuce={vuceSondu}
        class:ok={stanjeSonde === "ok" ||
          (nacin === "izmjeri" && pokaziRjesenje)}
        class:bad={stanjeSonde === "bad"}
      >
        {#if pokaziDial}
          <line
            class="td-cijevcica"
            x1={sondaX.x}
            y1={sondaX.y}
            x2={dialX}
            y2="41"
          />
        {:else}
          <line
            class="td-cijevcica"
            x1={sondaX.x}
            y1={sondaX.y}
            x2={sondaX.x}
            y2={VRH - 10}
          />
        {/if}
        <line
          class="td-kota"
          x1={kota.x}
          y1={povrsina(sonda.i)}
          x2={kota.x}
          y2={sondaX.y}
          marker-start="url(#td-vrh)"
          marker-end="url(#td-vrh)"
        />
        <text
          class="td-kota-t"
          x={kota.tx}
          y={(povrsina(sonda.i) + sondaX.y) / 2 + 4}
          text-anchor={kota.anchor}>{fM(sonda.d)}</text
        >
        <circle class="td-glava" cx={sondaX.x} cy={sondaX.y} r="7" />
        <circle class="td-glava-in" cx={sondaX.x} cy={sondaX.y} r="2.5" />
      </g>
    {/if}

    {#if pokaziDial}
      <g class="td-dial" transform="translate({dialX} 22)">
        <circle r="18" class="td-dial-lice" />
        {#each [0, 0.25, 0.5, 0.75, 1] as t (t)}
          {@const a = ((-135 + 270 * t - 90) * Math.PI) / 180}
          <line
            class="td-dial-crt"
            x1={r1(Math.cos(a) * 14)}
            y1={r1(Math.sin(a) * 14)}
            x2={r1(Math.cos(a) * 17)}
            y2={r1(Math.sin(a) * 17)}
          />
        {/each}
        <line
          class="td-igla"
          x1="0"
          y1="0"
          x2="0"
          y2="-13"
          style:transform="rotate({kut}deg)"
        />
        <circle r="2.5" class="td-os" />
      </g>
      <text
        class="td-dial-t"
        class:ok={nacin === "izmjeri"}
        x={dialX + (dialX > W - 120 ? -24 : 24)}
        y="27"
        text-anchor={dialX > W - 120 ? "end" : "start"}>{fP(pSonde)}</text
      >
    {/if}

    {#if kocka}
      {@const L1 = sile.p1 * kStrelica}
      {@const L2 = sile.p2 * kStrelica}
      {@const pm = (sile.p1 + sile.p2) / 2}
      {@const Ls = Math.min(38, pm * kStrelica)}
      {@const brojevi = nacin === "istrazi" || pokaziRjesenje}
      <g class="td-kocka" class:td-vuce={vuceKocku}>
        <rect
          class="td-kocka-r"
          x={cxK - kPx / 2}
          y={yK}
          width={kPx}
          height={kPx}
          rx="2"
        />
        {#if L1 > 2}<line
            class="td-sila"
            x1={cxK - kPx / 4}
            y1={yK}
            x2={cxK - kPx / 4}
            y2={yK + L1}
            marker-end="url(#td-vrh)"
          />{/if}
        <line
          class="td-sila"
          x1={cxK + kPx / 4}
          y1={yK + kPx}
          x2={cxK + kPx / 4}
          y2={yK + kPx - L2}
          marker-end="url(#td-vrh)"
        />
        {#if Ls > 3}
          <line
            class="td-sila td-bocna"
            x1={cxK - kPx / 2 - Ls - 2}
            y1={yK + kPx / 2}
            x2={cxK - kPx / 2 - 2}
            y2={yK + kPx / 2}
            marker-end="url(#td-vrh)"
          />
          <line
            class="td-sila td-bocna"
            x1={cxK + kPx / 2 + Ls + 2}
            y1={yK + kPx / 2}
            x2={cxK + kPx / 2 + 2}
            y2={yK + kPx / 2}
            marker-end="url(#td-vrh)"
          />
        {/if}
        <text
          class="td-sila-t"
          x={cxK - kPx / 2 - 6}
          y={yK + 10}
          text-anchor="end">F₁</text
        >
        <text class="td-sila-t" x={cxK + kPx / 2 + 6} y={yK + kPx - 2}>F₂</text>
        <line
          class="td-uzgon"
          x1={cxK}
          y1={yK - 3}
          x2={cxK}
          y2={yK - 3 - (L2 - L1)}
          marker-end="url(#td-vrh)"
        />
        <text class="td-uzgon-t" x={cxK + 6} y={yK - 6 - (L2 - L1) / 2}
          >F_u</text
        >
        {#if brojevi}
          <line
            class="td-kota"
            x1={cxK + kPx / 2 + 40}
            y1={povrsina(0)}
            x2={cxK + kPx / 2 + 40}
            y2={yK}
            marker-start="url(#td-vrh)"
            marker-end="url(#td-vrh)"
          />
          <text
            class="td-kota-t"
            x={cxK + kPx / 2 + 45}
            y={(povrsina(0) + yK) / 2 + 4}>{fM(dKocke)}</text
          >
        {/if}
        {#if kockaAktivna}
          <rect
            class="td-hit lx-handle"
            role="presentation"
            x={cxK - kPx / 2 - 14}
            y={yK - 14}
            width={kPx + 28}
            height={kPx + 28}
            onpointerdown={kockaDolje}
            onpointermove={kockaPomak}
            onpointerup={kockaGore}
            onpointercancel={kockaGore}
          />
        {/if}
      </g>
    {/if}

    {#if nacin === "usporedi"}
      {#each ps as p, i (i)}
        <rect
          class="td-hit td-tap"
          role="button"
          tabindex={locked ? -1 : 0}
          aria-label="Posuda {i + 1}{razlicite ? `, ${p.tekucina}` : ''}"
          aria-pressed={izbor === i}
          x={cxOf(i) - slot / 2 + 3}
          y={VRH - 6}
          width={slot - 6}
          height={DNO - VRH + 28}
          onclick={() => odaberi(i)}
          onkeydown={(e) =>
            (e.key === "Enter" || e.key === " ") &&
            (e.preventDefault(), odaberi(i))}
        />
        {#if pokaziRjesenje}
          <text
            class="td-dno-t"
            class:ok={pokaziRjesenje &&
              (tocnaPosuda === "jednako" || tocnaPosuda === i)}
            x={cxOf(i)}
            y={DNO - 8}
            text-anchor="middle">{fmtBroj(tlakDno(spec, i))} Pa</text
          >
        {/if}
      {/each}
    {/if}
  </svg>
</div>

{#if nacin === "istrazi" && !kocka}
  <p class="lx-readout" aria-live="polite">
    p = {p0 ? "p₀ + " : ""}ρ·g·h = {formula} = <b>{fP(pSonde)}</b>
  </p>
  {#if n > 1 && isteDubine.length}
    <p class="td-napomena">
      {#if isteDubine.every((t) => Math.abs(t.p - pSonde) < 1e-6)}
        Na istoj dubini u {isteDubine.length === 1
          ? "drugoj posudi"
          : "ostalim posudama"} tlak je isti: {fP(pSonde)}.
      {:else}
        Na istoj dubini: {isteDubine
          .map((t) => `posuda ${t.j + 1}: ${fP(t.p)}`)
          .join(" · ")}
      {/if}
    </p>
  {/if}
  <p class="td-hint">
    Povuci sondu (ili dodirni tekućinu) — manometar gore pokazuje tlak.
  </p>
{/if}

{#if kocka && (nacin === "istrazi" || pokaziRjesenje)}
  <div class="td-sile" aria-live="polite">
    <div>
      <span>gornja ploha</span><span class="mono"
        >p₁ = ρ·g·{fM(dKocke)} = {fP(sile.p1)}</span
      ><span class="mono">F₁ = p₁·S = <b>{fmtJ(sile.F1, "N", 3)}</b></span>
    </div>
    <div>
      <span>donja ploha</span><span class="mono"
        >p₂ = ρ·g·{fM(dKocke + kocka.a)} = {fP(sile.p2)}</span
      ><span class="mono">F₂ = p₂·S = <b>{fmtJ(sile.F2, "N", 3)}</b></span>
    </div>
    <div class="td-fu">
      <span>uzgon</span><span class="mono">F_u = F₂ − F₁ = ρ·g·V</span><span
        class="mono"><b>{fmtJ(sile.Fu, "N", 3)}</b></span
      >
    </div>
  </div>
  {#if nacin === "istrazi"}<p class="td-hint">
      Povuci kocku gore-dolje. Strelice su sile tlaka na plohe; bočne se
      poništavaju.
    </p>{/if}
{:else if kocka}
  <p class="lx-readout">
    kocka: a = {fM(kocka.a)}, V = {formatNumber(
      Math.round(kocka.V * 1e6) / 1e3,
    )} dm³ · {ps[0].tekucina}: ρ = {formatNumber(ps[0].rho)} kg/m³ · g = {formatNumber(
      g,
    )} m/s²
  </p>
{/if}

{#if nacin === "izmjeri"}
  {#if !kocka}
    <p class="lx-readout">
      {ps[pi].tekucina}: ρ = {formatNumber(ps[pi].rho)} kg/m³ · g = {formatNumber(
        g,
      )} m/s²{p0 ? ` · p₀ = ${fP(p0)}` : ""}
    </p>
  {/if}
  <BrojUnos
    jedinica={spec.jedinica ?? (velicina === "p" ? "Pa" : "N")}
    {locked}
    {ishod}
    bind:vrijednost={unos}
    {onodgovor}
    oznaka={velicina === "p" ? "Tlak u označenoj točki" : "Sila"}
  />
{:else if nacin === "postavi"}
  <p class="lx-readout">
    {ps[pi].tekucina}: ρ = {formatNumber(ps[pi].rho)} kg/m³ · g = {formatNumber(
      g,
    )} m/s² · sonda na dubini <b class={stanjeSonde}>{fM(sonda.d)}</b>
  </p>
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked}>Provjeri</button
    >
  </div>
{:else if nacin === "usporedi"}
  <p class="lx-readout">
    Dodirni posudu s najvećim tlakom na dnu ili odaberi „Jednako u svima“.
  </p>
  <div class="lx-actions td-usp">
    <button
      type="button"
      class="btn btn-ghost td-jednako"
      class:sel={izbor === "jednako"}
      class:ok={izbor === "jednako" && stanjeIzbora === "ok"}
      aria-pressed={izbor === "jednako"}
      disabled={locked}
      onclick={() => odaberi("jednako")}>Jednako u svima</button
    >
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked || izbor == null}>Provjeri</button
    >
  </div>
{/if}

<style>
  .td-tekst {
    margin-bottom: 12px;
  }
  .td {
    border-radius: var(--r-lg);
    outline: none;
  }
  .td:focus-visible {
    box-shadow: 0 0 0 2px var(--primary-border);
  }
  .td.td-jedna {
    max-width: 380px;
  }
  .td svg {
    overflow: visible;
  }
  .td-tek {
    fill: color-mix(in srgb, var(--td-boja) 30%, transparent);
    stroke: none;
  }
  .td-povrsina {
    stroke: var(--td-boja);
    stroke-width: 1.8;
  }
  .td .td-zid {
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .td-odabrana .td-zid {
    stroke: var(--primary);
    stroke-width: 3;
  }
  .td-odabrana .td-tek {
    fill: color-mix(in srgb, var(--td-boja) 45%, transparent);
  }
  .td-posuda.ok .td-zid {
    stroke: var(--success);
  }
  .td-hit {
    fill: transparent;
    pointer-events: all;
  }
  .td-tap {
    cursor: pointer;
    outline: none;
  }
  .td-tap:focus-visible {
    stroke: var(--primary);
    stroke-width: 2;
    stroke-dasharray: 4 3;
  }
  .td-ime {
    font-size: 12px;
    font-weight: 600;
  }
  .td-kota {
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .td-kota-t {
    fill: var(--text);
    font: 600 11.5px var(--font-mono);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .td-kota-a {
    stroke: var(--primary);
  }
  .td-tocka {
    fill: var(--bg-elev);
    stroke: var(--primary);
    stroke-width: 2.5;
  }
  .td-tocka-t {
    fill: var(--primary);
    font: 700 15px var(--font-sans);
  }
  .td-izobara {
    stroke: var(--text-dim);
    stroke-width: 1;
    stroke-dasharray: 5 4;
    opacity: 0.7;
  }
  .td-ista {
    fill: var(--bg-elev);
    stroke: var(--text-dim);
    stroke-width: 2;
  }
  .td-sonda .td-cijevcica {
    stroke: var(--text-dim);
    stroke-width: 2;
  }
  .td-glava {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .td-glava-in {
    fill: var(--bg-elev);
  }
  .td-sonda.ok .td-glava {
    fill: var(--success);
  }
  .td-sonda.bad .td-glava {
    fill: var(--danger);
  }
  .td-sonda,
  .td-kocka {
    pointer-events: none;
  }
  .td-kocka .td-hit {
    pointer-events: all;
  }
  .td-dial-lice {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 1.8;
  }
  .td-dial-crt {
    stroke: var(--text-dim);
    stroke-width: 1.2;
  }
  .td-igla {
    stroke: var(--danger);
    stroke-width: 2.4;
    stroke-linecap: round;
    transition: transform 0.15s ease-out;
  }
  .td-os {
    fill: var(--text);
  }
  .td-dial-t {
    fill: var(--text);
    font: 700 13px var(--font-mono);
  }
  .td-dial-t.ok {
    fill: var(--success);
  }
  .td-kocka-r {
    fill: color-mix(in srgb, var(--text-dim) 45%, var(--bg-elev));
    stroke: var(--text);
    stroke-width: 1.8;
  }
  .td-vuce .td-kocka-r {
    stroke: var(--primary);
  }
  .td-sila {
    stroke: var(--primary);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .td-bocna {
    stroke-width: 2;
    opacity: 0.45;
  }
  .td-sila-t {
    fill: var(--primary);
    font: 700 12px var(--font-sans);
  }
  .td-uzgon {
    stroke: var(--success);
    stroke-width: 3.2;
  }
  .td-uzgon-t {
    fill: var(--success);
    font: 700 12px var(--font-sans);
  }
  .td-dno-t {
    fill: var(--text);
    font: 600 11px var(--font-mono);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .td-dno-t.ok {
    fill: var(--success);
  }
  .td-napomena {
    text-align: center;
    font-size: 13px;
    color: var(--text);
    margin: -4px 0 6px;
  }
  .td-hint {
    text-align: center;
    font-size: 12.5px;
    color: var(--text-faint);
    margin: 0;
  }
  .td-sile {
    display: grid;
    gap: 6px;
    max-width: 440px;
    margin: 0 auto 8px;
    font-size: 13px;
  }
  .td-sile > div {
    display: grid;
    grid-template-columns: 7.5em 1fr auto;
    gap: 2px 10px;
    align-items: baseline;
    padding: 7px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
  }
  .td-sile > div > span:first-child {
    color: var(--text-dim);
  }
  .td-sile .td-fu {
    border-color: color-mix(in srgb, var(--success) 50%, var(--border));
  }
  .td-fu b {
    color: var(--success);
  }
  .td-usp {
    justify-content: center;
  }
  .td-jednako {
    height: var(--lx-control);
  }
  .td-jednako.sel {
    border-color: var(--primary);
    background: var(--primary-dim);
    color: var(--text);
  }
  .td-jednako.ok {
    border-color: var(--success);
  }
  .lx-readout b.ok {
    color: var(--success);
  }
  .lx-readout b.bad {
    color: var(--danger);
  }
  @media (max-width: 480px) {
    .td-sile > div {
      grid-template-columns: 1fr;
    }
    .td-sile > div > span:last-child {
      text-align: right;
    }
  }
</style>
