<script>
  // Čestice plina u cilindru s klipom. Stanje (p, V, T, n, Ēk, v_ef) računa katalog/fizika/plin_posuda.js; ovdje se
  // samo crta i animira: brzina čestica razmjerna je √(T/M), broj čestica količini plina, klip stoji na volumenu.
  // Čestice se pomiču izravno u DOM-u (bez Svelteove reaktivnosti po sličici), a petlja stoji kad widget nije vidljiv.
  import { untrack, onMount } from "svelte";
  import { Tween, prefersReducedMotion } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import Md from "../Md.svelte";
  import { formatNumber } from "$lib/lesson/core/number.js";
  import { P_JEDINICE, V_JEDINICE } from "$lib/lesson/katalog/fizika/_plin.js";
  import {
    stanje,
    stanjeIstrazi,
    nakonPromjene,
    faktori,
    faktorPolja,
    tocnaPosuda,
    jediniceOd,
    JEDINICA,
    SMJER_TXT,
    SMJEROVI,
    iznos,
  } from "$lib/lesson/katalog/fizika/plin_posuda.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = $derived(spec.nacin);
  const pitanje = $derived(nacin !== "istrazi");
  const posude = $derived(spec.posude);
  const dvije = $derived(posude.length === 2);
  const jed = $derived(jediniceOd(spec));
  const kontrole = $derived(nacin === "istrazi" ? (spec.kontrole ?? []) : []);
  const uid = Math.random().toString(36).slice(2, 8);

  // ── klizači (istraživanje): jedna vrijednost za obje posude ──
  const p0 = untrack(() => spec.posude[0]);
  function zadaniRaspon(q) {
    const r = spec.raspon?.[q];
    if (r) return r;
    if (q === "T")
      return [
        Math.max(20, Math.round(p0.T / 2 / 10) * 10),
        Math.round((p0.T * 2) / 10) * 10,
      ];
    if (q === "V") return [p0.V / 4, p0.V * 1.5];
    return [p0.n / 10, p0.n * 1.5];
  }
  const rasponi = $derived(
    Object.fromEntries(["T", "V", "n"].map((q) => [q, zadaniRaspon(q)])),
  );
  const korakKlizaca = (q) =>
    q === "T" ? 5 : (rasponi[q][1] - rasponi[q][0]) / 100;
  let kontrola = $state({ T: p0.T, V: p0.V, n: p0.n });
  const vrijednostiKontrola = $derived(
    Object.fromEntries(kontrole.map((q) => [q, Number(kontrola[q])])),
  );

  // ── predviđanje: animacija promjene t = 0 → 1 (faktori na potenciju t, pa je i put fizikalno ispravan) ──
  const napredak = new Tween(0);
  const naPotenciju = (prom, t) =>
    Object.fromEntries(Object.entries(prom ?? {}).map(([q, f]) => [q, f ** t]));
  const gotovo = $derived(pokazi || !!ishod?.tocno);

  const stanja = $derived.by(() => {
    if (nacin === "istrazi")
      return posude.map((p) => stanjeIstrazi(spec, p, vrijednostiKontrola));
    if (nacin === "predvidi")
      return posude.map((p) =>
        nakonPromjene(spec, p, naPotenciju(spec.promjena, napredak.current)),
      );
    return posude.map((p) => stanje(spec, p));
  });
  const pocetna = $derived(posude.map((p) => stanje(spec, p)));

  // ── mjerila crteža: najveći V, p i T koje widget može prikazati ──
  const krajnja = $derived.by(() => {
    const out = [...pocetna];
    if (nacin === "predvidi")
      out.push(...posude.map((p) => nakonPromjene(spec, p)));
    if (nacin === "istrazi") {
      const kut = (q) => (kontrole.includes(q) ? rasponi[q] : [undefined]);
      for (const T of kut("T"))
        for (const V of kut("V"))
          for (const n of kut("n"))
            for (const p of posude)
              out.push(
                stanjeIstrazi(spec, p, {
                  ...(T != null && { T }),
                  ...(V != null && { V }),
                  ...(n != null && { n }),
                }),
              );
    }
    return out;
  });
  const Vmax = $derived(Math.max(...krajnja.map((s) => s.V)) * 1.08);
  const pMax = $derived(Math.max(...krajnja.map((s) => s.p)) * 1.2);
  const Tmax = $derived(Math.max(...krajnja.map((s) => s.T)) * 1.15);
  const nRef = $derived(Math.max(...pocetna.map((s) => s.n)));
  const brzinaRef = $derived(
    Math.max(...pocetna.map((s) => Math.sqrt(s.T / s.M))),
  );

  // ── geometrija ──
  const VB = { W: 360, H: 268 };
  const DNO = 222;
  const VRH = 40;
  const DEB = 13; // debljina klipa
  // prostor iznad klipa za uteg ili polugu; čvrsta boca ga ne treba
  const glava = $derived(posude.some((p) => p.klip !== "zakljucan") ? 34 : 0);
  const sirina = $derived(dvije ? 112 : 132);
  const sredista = $derived(dvije ? [96, 264] : [170]);
  const visinaPlina = (V) =>
    Math.max(18, (V / Vmax) * (DNO - VRH - DEB - glava));
  const unutra = (k) => ({
    l: sredista[k] - sirina / 2,
    r: sredista[k] + sirina / 2,
    b: DNO,
    t: DNO - visinaPlina(stanja[k].V),
  });
  const r1 = (n) => Math.round(n * 10) / 10;
  const MAXP = 64;
  const CESTICE = Array.from({ length: MAXP }, (_, i) => i);
  const BLJESKOVI = Array.from({ length: 14 }, (_, i) => i);
  const brojCestica = (s) =>
    Math.max(3, Math.min(MAXP, Math.round((40 * s.n) / nRef)));
  const brzinaPx = (s) =>
    Math.min(420, (110 * Math.sqrt(s.T / s.M)) / brzinaRef);

  // ── čestice ──
  const el = [[], []];
  const bljesakEl = [[], []];
  const cestice = [[], []];
  const bljeskovi = [[], []];
  let dno = [0, 0];
  // Maxwellova raspodjela brzina (3D), normirana na v_ef = 1
  function maxwell() {
    const g = () =>
      Math.sqrt(-2 * Math.log(1 - Math.random())) *
      Math.cos(2 * Math.PI * Math.random());
    return Math.sqrt((g() ** 2 + g() ** 2 + g() ** 2) / 3);
  }
  function nova(k, izVentila = false) {
    const u = unutra(k);
    const a = Math.random() * Math.PI * 2;
    const c = izVentila
      ? { x: u.r - 4, y: u.b - 26 }
      : {
          x: u.l + 4 + Math.random() * (u.r - u.l - 8),
          y: u.t + 4 + Math.random() * (u.b - u.t - 8),
        };
    return {
      ...c,
      dx: Math.cos(a),
      dy: Math.sin(a),
      f: maxwell(),
      izlazi: false,
      nestalo: false,
      alfa: 1,
    };
  }
  function pripremi() {
    for (let k = 0; k < posude.length; k++) {
      cestice[k] = Array.from({ length: MAXP }, () => nova(k));
      dno[k] = brojCestica(stanja[k]);
      cestice[k].forEach((c, i) => (c.nestalo = i >= dno[k]));
    }
  }

  let svgEl = $state();
  let vidljiv = true;
  let rafId = 0;
  let zadnje = 0;
  const VENTIL_Y = DNO - 26;

  function korak(t) {
    const dt = Math.min(0.05, zadnje ? (t - zadnje) / 1000 : 0);
    zadnje = t;
    const mirno = prefersReducedMotion.current;
    for (let k = 0; k < posude.length; k++) {
      const st = stanja[k];
      const u = unutra(k);
      const v = brzinaPx(st);
      const cilj = brojCestica(st);
      const lista = cestice[k];
      // ventil: višak čestica izlazi, manjak ulazi
      const aktivne = lista.filter((c) => !c.nestalo && !c.izlazi);
      if (aktivne.length > cilj)
        aktivne.slice(cilj).forEach((c) => (c.izlazi = true));
      else if (aktivne.length < cilj) {
        let treba = cilj - aktivne.length;
        for (const c of lista) {
          if (!treba) break;
          if (c.nestalo) {
            // bez animacije nova čestica odmah je negdje u posudi, inače ulazi kroz ventil
            Object.assign(
              c,
              nova(k, !mirno),
              mirno ? {} : { dx: -1, dy: (Math.random() - 0.5) * 0.6 },
            );
            treba--;
          }
        }
      }
      for (let i = 0; i < lista.length; i++) {
        const c = lista[i];
        const e = el[k][i];
        if (!e) continue;
        if (c.nestalo) {
          e.style.display = "none";
          continue;
        }
        if (c.izlazi) {
          // prema ventilu i van
          const tx = u.r + 40;
          const ty = VENTIL_Y;
          const d = Math.hypot(tx - c.x, ty - c.y) || 1;
          const s = Math.max(v, 90) * dt * 1.2;
          c.x += ((tx - c.x) / d) * s;
          c.y += ((ty - c.y) / d) * s;
          if (c.x > u.r) c.alfa = Math.max(0, 1 - (c.x - u.r) / 40);
          if (mirno || c.alfa <= 0.02) {
            c.nestalo = true;
            e.style.display = "none";
            continue;
          }
        } else if (!mirno) {
          c.x += c.dx * c.f * v * dt;
          c.y += c.dy * c.f * v * dt;
          const R = 2.6;
          const udar = (x, y) => bljesni(k, x, y);
          if (c.x < u.l + R)
            [c.x, c.dx] = [u.l + R, Math.abs(c.dx), udar(u.l, c.y)];
          if (c.x > u.r - R)
            [c.x, c.dx] = [u.r - R, -Math.abs(c.dx), udar(u.r, c.y)];
          if (c.y > u.b - R)
            [c.y, c.dy] = [u.b - R, -Math.abs(c.dy), udar(c.x, u.b)];
          if (c.y < u.t + R)
            [c.y, c.dy] = [u.t + R, Math.abs(c.dy), udar(c.x, u.t)];
        } else {
          c.y = Math.min(u.b - 3, Math.max(u.t + 3, c.y));
        }
        e.style.display = "";
        e.setAttribute("cx", r1(c.x));
        e.setAttribute("cy", r1(c.y));
        e.style.opacity = c.alfa;
      }
      // bljeskovi udaraca u stijenke: više udaraca (veći tlak) = više bljeskova
      const bl = bljeskovi[k];
      for (let i = 0; i < bljesakEl[k].length; i++) {
        const b = bl[i];
        const e = bljesakEl[k][i];
        if (!e) continue;
        if (!b || b.zivot <= 0) {
          e.style.opacity = 0;
          continue;
        }
        b.zivot -= dt * 4;
        e.setAttribute("cx", r1(b.x));
        e.setAttribute("cy", r1(b.y));
        e.style.opacity = Math.max(0, b.zivot) * 0.8;
      }
    }
    rafId =
      vidljiv && !prefersReducedMotion.current
        ? requestAnimationFrame(korak)
        : 0;
  }
  let bljesakIdx = [0, 0];
  function bljesni(k, x, y) {
    if (Math.random() > 0.35) return;
    const i = bljesakIdx[k]++ % 14;
    bljeskovi[k][i] = { x, y, zivot: 1 };
  }
  function pokreni() {
    if (rafId) return;
    zadnje = 0;
    rafId = requestAnimationFrame(korak);
  }

  onMount(() => {
    for (let k = 0; k < posude.length; k++) {
      el[k] = [...svgEl.querySelectorAll(`.pp-cestica[data-k="${k}"]`)];
      bljesakEl[k] = [...svgEl.querySelectorAll(`.pp-bljesak[data-k="${k}"]`)];
    }
    pripremi();
    korak(0);
    const io = new IntersectionObserver(([e]) => {
      vidljiv = e.isIntersecting;
      if (vidljiv) pokreni();
    });
    io.observe(svgEl);
    pokreni();
    return () => {
      io.disconnect();
      cancelAnimationFrame(rafId);
      rafId = 0;
    };
  });
  // bez animacije (reduced motion) crtež se osvježi kad se promijeni stanje
  $effect(() => {
    void stanja;
    if (prefersReducedMotion.current) untrack(() => korak(performance.now()));
    else untrack(pokreni);
  });

  // ── rad plina od početka: zbraja se p·ΔV pri svakoj promjeni (trapezno) ──
  let rad = $state([0, 0]);
  let prije = null;
  // stanja za parametar (kontrole u istraživanju, napredak animacije u predviđanju)
  const parametar = $derived(
    nacin === "istrazi" ? vrijednostiKontrola : { t: napredak.current },
  );
  function stanjaZa(par) {
    if (nacin === "istrazi")
      return posude.map((p) => stanjeIstrazi(spec, p, par));
    if (nacin === "predvidi")
      return posude.map((p) =>
        nakonPromjene(spec, p, naPotenciju(spec.promjena, par.t)),
      );
    return posude.map((p) => stanje(spec, p));
  }
  const SI = (s) => ({
    p: s.p * P_JEDINICE[jed.p],
    V: s.V * V_JEDINICE[jed.V],
  });
  $effect(() => {
    const sada = { ...parametar };
    untrack(() => {
      if (prije) {
        // između dvije promjene put se dijeli na 24 dijela, pa je ∫p dV točan i za adijabatu
        const w = posude.map((_, k) => rad[k] ?? 0);
        let a = stanjaZa(prije).map(SI);
        for (let i = 1; i <= 24; i++) {
          const par = Object.fromEntries(
            Object.keys(sada).map((q) => [
              q,
              prije[q] + ((sada[q] - prije[q]) * i) / 24,
            ]),
          );
          const b = stanjaZa(par).map(SI);
          b.forEach((t, k) => (w[k] += ((a[k].p + t.p) / 2) * (t.V - a[k].V)));
          a = b;
        }
        rad = w;
      }
      prije = sada;
    });
  });

  function ispocetka() {
    kontrola = { T: p0.T, V: p0.V, n: p0.n };
    untrack(() => {
      prije = null;
      rad = [0, 0];
    });
  }

  // ── povlačenje ručnog klipa ──
  let vucem = $state(false);
  const klipAktivan = $derived(kontrole.includes("V"));
  function vIzY(e) {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    const y = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()).y;
    const V = ((DNO - y - DEB / 2) / (DNO - VRH - DEB - glava)) * Vmax;
    const [a, b] = rasponi.V;
    const k = korakKlizaca("V");
    return Math.min(b, Math.max(a, a + Math.round((V - a) / k) * k));
  }
  function klipDolje(e) {
    if (!klipAktivan) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    vucem = true;
    const V = vIzY(e);
    if (V != null) kontrola.V = V;
  }
  function klipMic(e) {
    if (!vucem) return;
    const V = vIzY(e);
    if (V != null) kontrola.V = V;
  }
  function klipTipka(e) {
    if (!klipAktivan) return;
    const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[
      e.key
    ];
    if (!d) return;
    e.preventDefault();
    const [a, b] = rasponi.V;
    kontrola.V = Math.min(
      b,
      Math.max(a, Number(kontrola.V) + d * korakKlizaca("V")),
    );
  }

  // ── očitanja ──
  // U načinu odaberi izvedena veličina za koju se pita (Ēk, v_ef, p) ne smije biti među očitanjima prije odgovora:
  // usporedba dvaju brojeva odala bi točnu posudu. T, n i V su zadani podaci (njih učenik i treba usporediti).
  const IZVEDENE = ["Ek", "vef", "p"];
  const skrivenaOdaberi = $derived(
    nacin === "odaberi" && !gotovo && IZVEDENE.includes(spec.pitanje)
      ? spec.pitanje
      : null,
  );
  const prikazi = $derived(
    (
      spec.prikazi ??
      (nacin === "odaberi"
        ? ["T"]
        : ["p", "V", "T", ...(spec.promjena?.n != null ? ["n"] : [])])
    ).filter((q) => q !== skrivenaOdaberi),
  );
  const SIMB = {
    p: "p",
    V: "V",
    T: "T",
    n: "n",
    N: "N",
    Ek: "Ēk",
    vef: "v_ef",
    W: "W",
  };
  function vrijednost(k, q) {
    if (q === "W") return rad[k];
    return stanja[k][q];
  }
  function txt(k, q) {
    const v = vrijednost(k, q);
    if (q === "W")
      return `${Math.abs(v) < 1e-9 ? "0" : formatNumber(Number(v.toPrecision(3)), 0)}\u00a0J`;
    if (q === "N") return iznos(v);
    return iznos(v, JEDINICA(spec, q));
  }
  const otkriveno = $derived(
    nacin === "odaberi" && gotovo ? [spec.pitanje] : [],
  );
  const ocitanja = $derived([
    ...prikazi,
    ...otkriveno.filter((q) => !prikazi.includes(q)),
  ]);

  // ── predvidi ──
  const fpolja = $derived(nacin === "predvidi" ? faktorPolja(spec) : []);
  const tocniFaktori = $derived(nacin === "predvidi" ? faktori(spec) : {});
  const smjerOd = (f) =>
    f > 1 + 1e-9 ? "gore" : f < 1 - 1e-9 ? "dolje" : "isto";
  let odabir = $state(
    untrack(() =>
      Object.fromEntries(
        (spec.pitaj ?? []).map((q) => [q, { smjer: null, faktor: "" }]),
      ),
    ),
  );
  let poslano = $state(null);
  const IME_PITAJ = {
    p: "tlak p",
    V: "volumen V",
    T: "temperatura T",
    n: "količina n",
    Ek: "srednja kin. energija Ēk",
    vef: "efektivna brzina v_ef",
  };
  const SMJER_GUMB = { gore: "↑ raste", dolje: "↓ pada", isto: "= isto" };
  const spremno = $derived(
    nacin === "predvidi" &&
      spec.pitaj.every(
        (q) =>
          odabir[q].smjer &&
          (!fpolja.includes(q) ||
            odabir[q].smjer === "isto" ||
            String(odabir[q].faktor).trim()),
      ),
  );
  const neprom = $derived(
    poslano != null && JSON.stringify(poslano) === JSON.stringify(odabir),
  );
  // ── odaberi ──
  let izbor = $state(null);
  const tocna = $derived(nacin === "odaberi" ? tocnaPosuda(spec) : null);

  function provjeri() {
    if (locked) return;
    if (nacin === "predvidi") {
      poslano = JSON.parse(JSON.stringify(odabir));
      onodgovor(JSON.parse(JSON.stringify(odabir)));
    } else if (nacin === "odaberi") {
      onodgovor(izbor);
    }
  }

  // nakon točnog odgovora (ili „pokaži“) animacija izvede promjenu
  function animiraj() {
    napredak.set(0, { duration: 0 });
    napredak.set(1, {
      duration: prefersReducedMotion.current ? 0 : 2600,
      easing: cubicInOut,
    });
  }
  $effect(() => {
    if (!gotovo) return;
    untrack(() => {
      if (pokazi && nacin === "predvidi")
        odabir = Object.fromEntries(
          spec.pitaj.map((q) => [
            q,
            {
              smjer: smjerOd(tocniFaktori[q]),
              faktor: fpolja.includes(q)
                ? formatNumber(Number(tocniFaktori[q].toPrecision(3)))
                : "",
            },
          ]),
        );
      if (pokazi && nacin === "odaberi") izbor = tocna;
      if (nacin === "predvidi") animiraj();
    });
  });

  // ── crtež: plamen, termometar, manometar ──
  const toplije = (k) => stanja[k].T / pocetna[k].T;
  const kutKazaljke = (k) => -120 + 240 * Math.min(1, stanja[k].p / pMax);
  const PRAZNO_KLIP = {
    zakljucan: "zaključan klip",
    pomican: "slobodni klip s utegom",
    rucni: "klip pomičeš ti",
  };
  const opis = $derived(
    stanja
      .map(
        (s, k) =>
          `${posude[k].oznaka}: ${PRAZNO_KLIP[posude[k].klip]}${posude[k].toplina ? `, ${posude[k].toplina}` : ""}; ${skrivenaOdaberi === "p" ? "" : `p = ${iznos(s.p, jed.p)}, `}V = ${iznos(s.V, jed.V)}, T = ${iznos(s.T, "K")}`,
      )
      .join(". "),
  );
  const imaVentil = $derived(
    kontrole.includes("n") ||
      (nacin === "predvidi" && spec.promjena?.n != null),
  );
  const OZNAKA_KLIZACA = {
    T: "temperatura T (grij / hladi)",
    V: "volumen V (klip)",
    n: "količina plina n (ventil)",
  };
</script>

{#if pitanje}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="pp-tekst"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure pp">
  <svg
    bind:this={svgEl}
    viewBox="0 0 {VB.W} {VB.H}"
    role="img"
    aria-label={opis}
  >
    {#each posude as p, k (k)}
      {@const u = unutra(k)}
      {@const cx = sredista[k]}
      {@const odabrana = nacin === "odaberi" && izbor === k}
      <g
        class="pp-posuda"
        class:odabrana
        class:ok={nacin === "odaberi" && gotovo && tocna === k}
      >
        <text class="pp-ime" x={cx} y="16" text-anchor="middle"
          >{p.oznaka}
          <tspan class="pp-mala-svg">· {formatNumber(p.M)} g/mol</tspan></text
        >
        <!-- izolacija / termostat -->
        {#if p.toplina === "izolirano"}
          <rect
            class="pp-izolacija"
            x={u.l - 10}
            y={VRH - 8}
            width={u.r - u.l + 20}
            height={DNO - VRH + 18}
            rx="6"
          />
          <text class="pp-mala-svg" x={cx} y={DNO + 29} text-anchor="middle"
            >izolirano: Q = 0</text
          >
        {:else if p.toplina === "termostat"}
          <rect
            class="pp-termostat"
            x={u.l - 8}
            y={VRH - 6}
            width={u.r - u.l + 16}
            height={DNO - VRH + 14}
            rx="6"
          />
          <text class="pp-mala-svg" x={cx} y={DNO + 29} text-anchor="middle"
            >termostat: T stalna</text
          >
        {/if}
        <!-- plin -->
        <rect
          class="pp-plin"
          x={u.l}
          y={r1(u.t)}
          width={u.r - u.l}
          height={r1(u.b - u.t)}
          style:fill-opacity={0.05 + 0.18 * Math.min(1, stanja[k].p / pMax)}
        />
        <!-- bljeskovi udaraca -->
        {#each BLJESKOVI as i (i)}
          <circle class="pp-bljesak" r="3.2" data-k={k} style:opacity="0" />
        {/each}
        <!-- čestice -->
        {#each CESTICE as i (i)}
          <circle class="pp-cestica" class:druga={k === 1} r="2.6" data-k={k} />
        {/each}
        <!-- stijenke -->
        <path
          class="pp-stijenka"
          d={p.klip === "zakljucan"
            ? `M${u.l},${r1(u.t - DEB)} V${DNO} H${u.r} V${r1(u.t - DEB)}`
            : `M${u.l},${VRH - 4} V${DNO} H${u.r} V${VRH - 4}`}
        />
        {#if imaVentil}
          <path
            class="pp-stijenka pp-cijev"
            d="M{u.r},{VENTIL_Y - 4} H{u.r + 22} M{u.r},{VENTIL_Y + 4} H{u.r +
              22}"
          />
          <circle class="pp-ventil" cx={u.r + 13} cy={VENTIL_Y} r="5" />
        {/if}
        <!-- klip -->
        <g class="pp-klip-g">
          <rect
            class="pp-klip"
            x={u.l + 1}
            y={r1(u.t - DEB)}
            width={u.r - u.l - 2}
            height={DEB}
            rx="2"
          />
          {#if p.klip === "zakljucan"}
            <rect
              class="pp-zatik"
              x={u.l - 7}
              y={r1(u.t - DEB / 2 - 2.5)}
              width="12"
              height="5"
              rx="1.5"
            />
            <rect
              class="pp-zatik"
              x={u.r - 5}
              y={r1(u.t - DEB / 2 - 2.5)}
              width="12"
              height="5"
              rx="1.5"
            />
          {:else if p.klip === "pomican"}
            <rect
              class="pp-uteg"
              x={cx - 22}
              y={r1(u.t - DEB - 24)}
              width="44"
              height="24"
              rx="3"
            />
            <text
              class="pp-uteg-tekst"
              x={cx}
              y={r1(u.t - DEB - 8)}
              text-anchor="middle">uteg</text
            >
          {:else}
            <line
              class="pp-poluga"
              x1={cx}
              y1={r1(u.t - DEB)}
              x2={cx}
              y2={r1(Math.max(4, u.t - DEB - 30))}
            />
            <rect
              class="pp-drska"
              x={cx - 18}
              y={r1(Math.max(0, u.t - DEB - 36))}
              width="36"
              height="9"
              rx="4"
            />
            {#if klipAktivan}
              <rect
                class="pp-klip-meta lx-handle"
                role="slider"
                tabindex="0"
                aria-label="Klip: volumen plina"
                aria-valuenow={stanja[k].V}
                aria-valuetext={iznos(stanja[k].V, jed.V)}
                x={u.l}
                y={r1(Math.max(0, u.t - DEB - 40))}
                width={u.r - u.l}
                height="54"
                onpointerdown={klipDolje}
                onpointermove={klipMic}
                onpointerup={() => (vucem = false)}
                onpointercancel={() => (vucem = false)}
                onkeydown={klipTipka}
              />
            {/if}
          {/if}
        </g>
        <!-- plamen / hlađenje -->
        {#if !p.toplina}
          {#if toplije(k) > 1.02}
            {@const vel = Math.min(1, Math.log(toplije(k)) / Math.log(3))}
            {@const h = 12 + 13 * vel}
            <g class="pp-plamen" transform="translate({cx} {DNO + 30})">
              {#each [-24, 0, 24] as dx (dx)}
                <path
                  class="pp-plamen-jezik"
                  d="M{dx - 6},0 Q{dx - 8},{r1(-h * 0.55)} {dx},{r1(-h)} Q{dx +
                    8},{r1(-h * 0.55)} {dx + 6},0 Z"
                />
              {/each}
            </g>
          {:else if toplije(k) < 0.98}
            <text class="pp-hladno" x={cx} y={DNO + 24} text-anchor="middle"
              >❄ hlađenje</text
            >
          {/if}
        {/if}
        {#if !dvije}
          <!-- termometar lijevo -->
          {@const tx = u.l - 34}
          {@const vis = 150}
          {@const st = Math.min(1, stanja[k].T / Tmax)}
          <rect
            class="pp-termometar"
            x={tx - 5}
            y={DNO - 18 - vis}
            width="10"
            height={vis}
            rx="5"
          />
          <rect
            class="pp-zivin"
            x={tx - 2.5}
            y={r1(DNO - 18 - vis * st)}
            width="5"
            height={r1(vis * st)}
            rx="2.5"
          />
          <circle class="pp-zivin" cx={tx} cy={DNO - 12} r="8" />
          <text
            class="pp-mala-svg"
            x={tx}
            y={DNO - 26 - vis}
            text-anchor="middle">T</text
          >
          <!-- manometar desno -->
          {@const mx = u.r + (imaVentil ? 50 : 44)}
          {@const my = VRH + 58}
          <path
            class="pp-stijenka pp-cijev"
            d="M{u.r},{my + 30} H{mx} V{my + 22}"
          />
          <circle class="pp-manometar" cx={mx} cy={my} r="22" />
          {#each [-120, -60, 0, 60, 120] as a (a)}
            <line
              class="pp-crtica"
              x1={r1(mx + 17 * Math.sin((a * Math.PI) / 180))}
              y1={r1(my - 17 * Math.cos((a * Math.PI) / 180))}
              x2={r1(mx + 21 * Math.sin((a * Math.PI) / 180))}
              y2={r1(my - 21 * Math.cos((a * Math.PI) / 180))}
            />
          {/each}
          <line
            class="pp-kazaljka"
            x1={mx}
            y1={my}
            x2={r1(mx + 16 * Math.sin((kutKazaljke(k) * Math.PI) / 180))}
            y2={r1(my - 16 * Math.cos((kutKazaljke(k) * Math.PI) / 180))}
          />
          <circle class="pp-os" cx={mx} cy={my} r="2.5" />
          <text class="pp-mala-svg" x={mx} y={my + 13} text-anchor="middle"
            >p</text
          >
        {/if}
        {#if nacin === "odaberi" && !locked}
          <rect
            class="pp-dodir"
            role="button"
            tabindex="0"
            aria-label="Odaberi posudu: {p.oznaka}"
            aria-pressed={izbor === k}
            x={u.l - 12}
            y="0"
            width={u.r - u.l + 24}
            height={DNO + 10}
            rx="10"
            onclick={() => (izbor = k)}
            onkeydown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              (e.preventDefault(), (izbor = k))}
          />
        {/if}
        {#if odabrana || (nacin === "odaberi" && gotovo && tocna === k)}
          <rect
            class="pp-okvir"
            class:ok={gotovo && tocna === k}
            x={u.l - 14}
            y="2"
            width={u.r - u.l + 28}
            height={DNO + 6}
            rx="10"
          />
        {/if}
      </g>
    {/each}
  </svg>
</figure>

<div class="pp-ocitanja" class:dvije aria-live="polite">
  {#each posude as p, k (k)}
    <div class="pp-stupac">
      {#if dvije}<div class="pp-stupac-ime">{p.oznaka}</div>{/if}
      <div class="pp-chips">
        {#each ocitanja as q (q)}
          <div
            class="pp-ocitanje"
            class:promjena={nacin === "predvidi" &&
              gotovo &&
              q !== "N" &&
              Math.abs(stanja[k][q] / pocetna[k][q] - 1) > 1e-6}
          >
            <span class="pp-simbol">{SIMB[q]}</span>
            <span class="pp-vrijednost"
              >{#if nacin === "predvidi" && gotovo && q !== "W" && Math.abs(stanja[k][q] / pocetna[k][q] - 1) > 1e-6}<span
                  class="pp-prije">{iznos(pocetna[k][q])} →&nbsp;</span
                >
              {/if}{txt(k, q)}</span
            >
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>

{#if nacin === "istrazi"}
  <div class="pp-klizaci">
    {#each kontrole as q (q)}
      <div class="pp-klizac">
        <div class="pp-klizac-glava">
          <label for="pp-{uid}-{q}">{OZNAKA_KLIZACA[q]}</label>
          <output for="pp-{uid}-{q}"
            >{iznos(
              Number(kontrola[q]),
              q === "T" ? "K" : q === "V" ? jed.V : "mol",
            )}</output
          >
        </div>
        <input
          id="pp-{uid}-{q}"
          type="range"
          min={rasponi[q][0]}
          max={rasponi[q][1]}
          step={korakKlizaca(q)}
          bind:value={kontrola[q]}
        />
      </div>
    {/each}
  </div>
  <div class="lx-actions">
    <button type="button" class="btn btn-ghost" onclick={ispocetka}
      >Ispočetka</button
    >
    {#if klipAktivan}<span class="pp-mala">Klip možeš i povući.</span>{/if}
  </div>
{/if}

{#if nacin === "predvidi"}
  <div class="pp-redovi">
    {#each spec.pitaj as q (q)}
      {@const ok = gotovo && (pokazi || neprom)}
      <div class="pp-red" class:ok>
        <span class="pp-red-ime">{IME_PITAJ[q]}</span>
        <div class="pp-red-desno">
          <div class="seg pp-seg" role="group" aria-label={IME_PITAJ[q]}>
            {#each SMJEROVI as sm (sm)}
              <button
                type="button"
                class="seg-item"
                class:active={odabir[q].smjer === sm}
                aria-pressed={odabir[q].smjer === sm}
                aria-label={SMJER_TXT[sm]}
                disabled={locked}
                onclick={() => (odabir[q] = { ...odabir[q], smjer: sm })}
                >{SMJER_GUMB[sm]}</button
              >
            {/each}
          </div>
          {#if fpolja.includes(q)}
            <label class="pp-faktor">
              <span>×</span>
              <input
                class="inp pp-faktor-inp"
                inputmode="decimal"
                autocomplete="off"
                placeholder="?"
                aria-label="Koliko puta: {IME_PITAJ[q]}"
                disabled={locked || odabir[q].smjer === "isto"}
                bind:value={odabir[q].faktor}
              />
            </label>
          {/if}
        </div>
      </div>
    {/each}
  </div>
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked || !spremno}>Provjeri</button
    >
    {#if gotovo}<button type="button" class="btn btn-ghost" onclick={animiraj}
        >Ponovi animaciju</button
      >{/if}
    {#if !locked && fpolja.length}<span class="pp-mala"
        >Faktor: koliko puta je nova vrijednost veća (npr. 1,5 ili 0,5).</span
      >{/if}
  </div>
{/if}

{#if nacin === "odaberi"}
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-ghost"
      class:pp-jednako={izbor === "jednako"}
      aria-pressed={izbor === "jednako"}
      disabled={locked}
      onclick={() => (izbor = "jednako")}>Jednako u obje</button
    >
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeri}
      disabled={locked || izbor == null}>Provjeri</button
    >
    {#if !locked}<span class="pp-mala"
        >Dodirni posudu (ili „Jednako u obje“), pa Provjeri.</span
      >{/if}
  </div>
{/if}

<style>
  .pp-tekst {
    margin-bottom: 10px;
  }
  .pp {
    margin-bottom: 6px;
  }
  .pp svg {
    overflow: visible;
  }
  .pp-ime {
    font: 600 13px var(--font-sans);
    fill: var(--text);
  }
  .pp-mala-svg {
    font: 400 11px var(--font-sans);
    fill: var(--text-faint);
  }
  .pp-plin {
    fill: var(--primary);
    transition: fill-opacity 0.3s;
  }
  .pp-cestica {
    fill: var(--primary);
  }
  .pp-cestica.druga {
    fill: var(--warn);
  }
  .pp-bljesak {
    fill: var(--text);
    pointer-events: none;
  }
  .pp-stijenka {
    fill: none;
    stroke: var(--text);
    stroke-width: 3;
    stroke-linejoin: round;
  }
  .pp-cijev {
    stroke-width: 2;
  }
  .pp-ventil {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 2;
  }
  .pp-klip {
    fill: color-mix(in srgb, var(--text) 55%, var(--bg-elev));
    stroke: var(--text);
    stroke-width: 1.5;
  }
  .pp-zatik {
    fill: var(--danger);
  }
  .pp-uteg {
    fill: color-mix(in srgb, var(--text) 75%, var(--bg-elev));
  }
  .pp-uteg-tekst {
    font: 600 11px var(--font-sans);
    fill: var(--bg);
  }
  .pp-poluga {
    stroke: var(--text);
    stroke-width: 4;
  }
  .pp-drska {
    fill: var(--primary);
  }
  .pp-klip-meta {
    fill: transparent;
  }
  .pp-klip-meta:focus-visible {
    outline: none;
    fill: color-mix(in srgb, var(--primary) 12%, transparent);
  }
  .pp-izolacija {
    fill: none;
    stroke: var(--warn);
    stroke-width: 6;
    stroke-dasharray: 3 3;
    opacity: 0.6;
  }
  .pp-termostat {
    fill: none;
    stroke: var(--lx-water);
    stroke-width: 6;
    opacity: 0.45;
  }
  .pp-plamen-jezik {
    fill: #f97316;
    opacity: 0.9;
    transform-box: fill-box;
    transform-origin: bottom;
    animation: pp-plamen 0.5s ease-in-out infinite alternate;
  }
  .pp-plamen-jezik:nth-child(2) {
    fill: #fb923c;
    animation-delay: 0.15s;
  }
  @keyframes pp-plamen {
    from {
      opacity: 0.75;
    }
    to {
      opacity: 1;
    }
  }
  .pp-hladno {
    font: 600 12px var(--font-sans);
    fill: var(--lx-water);
  }
  .pp-termometar {
    fill: var(--bg-elev);
    stroke: var(--text-dim);
    stroke-width: 1.5;
  }
  .pp-zivin {
    fill: var(--danger);
  }
  .pp-manometar {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 2;
  }
  .pp-crtica {
    stroke: var(--text-dim);
    stroke-width: 1.5;
  }
  .pp-kazaljka {
    stroke: var(--danger);
    stroke-width: 2.5;
    stroke-linecap: round;
  }
  .pp-os {
    fill: var(--text);
  }
  .pp-dodir {
    fill: transparent;
    cursor: pointer;
  }
  .pp-dodir:hover {
    fill: color-mix(in srgb, var(--primary) 6%, transparent);
  }
  .pp-dodir:focus-visible {
    outline: none;
    fill: color-mix(in srgb, var(--primary) 10%, transparent);
  }
  .pp-okvir {
    fill: none;
    stroke: var(--primary);
    stroke-width: 2.5;
    pointer-events: none;
  }
  .pp-okvir.ok {
    stroke: var(--success);
  }
  .pp-ocitanja {
    display: grid;
    gap: 8px;
    max-width: 440px;
    margin: 0 auto 4px;
  }
  .pp-ocitanja.dvije {
    grid-template-columns: 1fr 1fr;
  }
  .pp-stupac-ime {
    font-size: 12.5px;
    font-weight: 600;
    text-align: center;
    margin-bottom: 4px;
  }
  .pp-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }
  .pp-ocitanje {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    font-family: var(--font-mono);
    font-size: 13.5px;
    transition: border-color 0.3s;
  }
  .pp-ocitanje.promjena {
    border-color: var(--primary-border);
  }
  .pp-prije {
    color: var(--text-dim);
    font-weight: 400;
  }
  .pp-simbol {
    color: var(--text-dim);
    font-style: italic;
  }
  .pp-vrijednost {
    color: var(--text);
    font-weight: 600;
    white-space: nowrap;
  }
  .pp-klizaci {
    display: grid;
    gap: 12px;
    max-width: 440px;
    margin: 12px auto 0;
  }
  .pp-klizac-glava {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 2px;
  }
  .pp-klizac-glava label {
    color: var(--text-dim);
    font-size: 14px;
  }
  .pp-klizac-glava output {
    font-family: var(--font-mono);
    font-size: 14px;
    white-space: nowrap;
  }
  .pp-klizac input[type="range"] {
    width: 100%;
    margin: 0;
    height: 28px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .pp-mala {
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .pp-redovi {
    display: grid;
    gap: 8px;
    margin-top: 8px;
  }
  .pp-red {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    padding: 9px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .pp-red.ok {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 8%, transparent);
  }
  .pp-red-ime {
    font-size: 14px;
  }
  @media (max-width: 560px) {
    .pp-red {
      flex-direction: column;
      align-items: stretch;
    }
  }
  .pp-red-desno {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .pp-seg .seg-item {
    border: 0;
    background: transparent;
    font-size: 13px;
    padding: 7px 10px;
    min-height: 34px;
  }
  .pp-seg .seg-item.active {
    background: var(--primary-dim);
    color: var(--text);
    box-shadow: 0 0 0 1px var(--primary-border);
  }
  .pp-seg .seg-item:disabled {
    cursor: default;
  }
  .pp-faktor {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    color: var(--text-dim);
  }
  .pp-faktor-inp {
    width: 72px;
    height: 36px;
    text-align: right;
    font-family: var(--font-mono);
    font-size: 16px;
  }
  .pp-jednako {
    background: var(--primary-dim);
    color: var(--text);
    border-color: var(--primary-border);
  }
</style>
