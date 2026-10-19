<script>
  // Kružno gibanje: kotač, auto u zavoju i satelit u orbiti. Brojevi, granica trenja i točan smjer dolaze iz
  // katalog/fizika/kruzenje.js. Animacija je usporena (kotač od 300 okretaja u minuti se ne bi vidio), ali omjeri
  // brzina ostaju točni.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Strelica from "./_SileStrelica.svelte";
  import Klizaci from "./_SileKlizaci.svelte";
  import Ocitanja from "./_SileOcitanja.svelte";
  import {
    fizikaKruzenja,
    velicineKruzenja,
    prikaziKruzenja,
    tockeKotaca,
    predznakVrtnje,
    tocanSmjer,
    SMJEROVI,
  } from "$lib/lesson/katalog/fizika/kruzenje.js";
  import {
    pocetneVrijednosti,
    krajnjeKombinacije,
    klizaciOd,
    analizaCilja,
    odajuCilj,
    zakljucajKut,
    kutVektora,
    opisVelicine,
    iznosJed,
    broj,
    rad,
    smjerRijecima,
  } from "$lib/lesson/katalog/fizika/_sile.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const scena = untrack(() => spec.scena);
  const smjer = nacin === "smjer";
  const postavi = nacin === "postavi";
  const SG = untrack(() => predznakVrtnje(spec));
  const C = [180, 150];
  const r1 = (n) => Math.round(n * 10) / 10;
  const pol = (R, th) => [C[0] + R * Math.cos(th), C[1] - R * Math.sin(th)];

  let p = $state(untrack(() => pocetneVrijednosti(spec)));
  let fiz = $derived(fizikaKruzenja(spec, p));
  let vel = $derived(fiz.vel);
  let meta = $derived(velicineKruzenja(spec));
  const kraj = untrack(() =>
    krajnjeKombinacije(spec).map((q) => fizikaKruzenja(spec, q).vel),
  );
  const najv = (k) => Math.max(1e-12, ...kraj.map((v) => v[k] ?? 0));

  // ── geometrija ──
  const RK = 108; // kotač
  const RZ = 104; // sredina ceste
  // orbita: planet 84 px; niske orbite (200–2000 km) bile bi u mjerilu priljubljene uz planet, pa visina nije
  // u mjerilu, ali raste s pravom visinom (što je viša orbita, to je satelit dalje)
  const R0 = untrack(() => (scena === "orbita" ? fizikaKruzenja(spec).R : 1));
  const PX = 84 / R0;
  const hRaspon = untrack(() => {
    const h = kraj.map((v) => v.h ?? 0);
    return [Math.min(...h), Math.max(...h)];
  });
  let rOrb = $derived(
    scena === "orbita"
      ? 84 +
          18 +
          (hRaspon[1] > hRaspon[0]
            ? (44 * (vel.h - hRaspon[0])) / (hRaspon[1] - hRaspon[0])
            : 22)
      : 0,
  );
  let rPut = $derived(scena === "kotac" ? RK : scena === "zavoj" ? RZ : rOrb);

  // ── animacija: kut položaja (rad), izlijetanje po tangenti ──
  const POC = untrack(() => (smjer ? rad(spec.tocka) : rad(30)));
  let th = $state(POC);
  let leti = $state(null); // {x, y, vx, vy, t}
  let bezGravitacije = $state(false);
  let pusteno = $state(false);
  const omegaPrikaz = () => {
    if (scena === "kotac") return 2 * Math.PI * 0.5 * (vel.f / najv("f"));
    if (scena === "zavoj") return 2 * Math.PI * 0.16 * (vel.v / najv("v"));
    return (2 * Math.PI) / (7 * (vel.T / Math.min(...kraj.map((v) => v.T))));
  };
  const tockaPolumjer = () =>
    scena === "kotac" ? RK * tockeKotaca(spec)[0] : rPut;
  function odleti() {
    const w = omegaPrikaz();
    const R = tockaPolumjer();
    const [x, y] = pol(R, th);
    const t = th + (SG * Math.PI) / 2;
    const v = Math.max(60, w * R);
    leti = { x, y, vx: Math.cos(t) * v, vy: -Math.sin(t) * v, t: 0 };
  }
  // zavoj: preko granice auto odleti nakon trećine kruga; u „postavi“ tek nakon provjere
  let poslano = $state(null);
  let neprom = $derived(
    poslano != null &&
      klizaciOd(spec)[0] &&
      poslano === p[klizaciOd(spec)[0].id],
  );
  let otkriveno = $derived(
    !postavi || locked || pokazi || (neprom && ishod && !ishod.prazno),
  );
  let prijedeno = 0;
  let zadnji = 0;
  function korak(now) {
    const dt = Math.min(0.05, (now - (zadnji || now)) / 1000);
    zadnji = now;
    if (smjer && !leti) return;
    if (leti) {
      leti = {
        ...leti,
        x: leti.x + leti.vx * dt,
        y: leti.y + leti.vy * dt,
        t: leti.t + dt,
      };
      if (leti.t > 1.8) {
        leti = null;
        pusteno = false;
        prijedeno = 0;
        if (scena === "orbita" && bezGravitacije) bezGravitacije = false;
        if (smjer) th = POC;
      }
      return;
    }
    const d = omegaPrikaz() * dt * SG;
    th += d;
    prijedeno += Math.abs(d);
    if (
      scena === "zavoj" &&
      !fiz.prolazi &&
      otkriveno &&
      prijedeno > Math.PI * 0.7
    )
      odleti();
  }
  onMount(() => {
    let id;
    const petlja = (now) => {
      if (!prefersReducedMotion.current) korak(now);
      else zadnji = 0;
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  $effect(() => {
    void p;
    untrack(() => {
      prijedeno = 0;
      leti = null;
    });
  });
  function pustiTocku() {
    if (leti) return;
    pusteno = true;
    odleti();
  }
  function iskljuciGravitaciju() {
    if (leti) return;
    bezGravitacije = true;
    odleti();
  }

  // ── postavi ──
  const klizac = untrack(() => klizaciOd(spec)[0]);
  // dok učenik ne provjeri, ne vidi cilj ni ono što ga odaje: ciljanu veličinu, veličine koje se s njom mijenjaju
  // linearno (F_cp i a_cp) ni strelice tih veličina
  const odaju = untrack(() =>
    postavi && klizac
      ? odajuCilj(spec, klizac, (q) => fizikaKruzenja(spec, q).vel)
      : { vezane: new Set(), jednake: new Set() },
  );
  // skriveno: ni iznos ni crtež; bezIznosa: crta se, ali se iznos ne piše
  const skriveno = (k) => !otkriveno && odaju.vezane.has(k);
  const bezIznosa = (k) =>
    skriveno(k) || (!otkriveno && odaju.jednake.has(k));
  $effect(() => {
    if (!pokazi || !postavi) return;
    untrack(
      () =>
        (p = {
          ...p,
          [klizac.id]: analizaCilja(
            spec,
            klizac,
            (q) => fizikaKruzenja(spec, q).vel,
          ).best,
        }),
    );
  });
  function provjeriPostavi() {
    if (locked) return;
    poslano = p[klizac.id];
    prijedeno = 0;
    onodgovor({ ...p });
  }

  // ── smjer ──
  let kut = $state(null);
  let poslanKut = $state(null);
  let svgEl = $state();
  let aktivno = $derived(smjer && !locked && !pokazi);
  let tocno = $derived(pokazi || (ishod?.tocno && poslanKut === kut));
  $effect(() => {
    if (!pokazi || !smjer) return;
    untrack(() => (kut = tocanSmjer(spec)));
  });
  // nakon točnog „izlijetanja“ tijelo zaista odleti po tangenti
  $effect(() => {
    if (!smjer || !tocno || spec.pitaj !== "izlijetanje") return;
    untrack(() => setTimeout(odleti, 350));
  });
  let vuce = false;
  function down(e) {
    if (!aktivno) return;
    e.preventDefault();
    vuce = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (!vuce) return;
    const m = svgEl?.getScreenCTM();
    if (!m) return;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const [ox, oy] = pol(tockaPolumjer(), th);
    if (Math.hypot(q.x - ox, q.y - oy) < 10) return;
    kut = zakljucajKut(kutVektora(q.x - ox, oy - q.y), SMJEROVI);
  }
  const up = () => (vuce = false);
  function key(e) {
    if (!aktivno) return;
    const d = {
      ArrowLeft: 22.5,
      ArrowUp: 22.5,
      ArrowRight: -22.5,
      ArrowDown: -22.5,
    }[e.key];
    if (!d) return;
    e.preventDefault();
    kut = ((((kut ?? spec.tocka) + d) % 360) + 360) % 360;
  }
  function provjeriSmjer() {
    if (locked) return;
    poslanKut = kut;
    onodgovor(kut);
  }

  // ── strelice scene ──
  let tijelo = $derived(leti ? [leti.x, leti.y] : pol(tockaPolumjer(), th));
  const tangKut = (t) => t + (SG * Math.PI) / 2;
  let sStrelice = $derived.by(() => {
    if (leti && !(scena === "kotac" && !pusteno)) return [];
    const out = [];
    const od = tijelo;
    const smjerStr = (a, L, boja, oznaka, isprekidano = false) =>
      out.push({
        x1: od[0],
        y1: od[1],
        x2: od[0] + Math.cos(a) * L,
        y2: od[1] - Math.sin(a) * L,
        boja,
        oznaka,
        isprekidano,
      });
    const vidiV =
      !smjer || spec.pitaj === "akceleracija" || spec.pitaj === "sila";
    if (scena === "kotac" && !smjer) {
      tockeKotaca(spec).forEach((k, i) => {
        const T = i === 0 ? "A" : "B";
        const o = pol(RK * k, th);
        const L = (vel[`v_${T}`] / najv("v_A")) * 78;
        if (!skriveno(`v_${T}`))
          out.push({
            x1: o[0],
            y1: o[1],
            x2: o[0] + Math.cos(tangKut(th)) * L,
            y2: o[1] - Math.sin(tangKut(th)) * L,
            boja: "var(--primary)",
            oznaka: `v_${T}`,
          });
        if (
          prikaziKruzenja(spec).includes(`a_${T}`) &&
          !skriveno(`a_${T}`)
        ) {
          const La = (vel[`a_${T}`] / najv("a_A")) * 60;
          out.push({
            x1: o[0],
            y1: o[1],
            x2: o[0] - Math.cos(th) * La,
            y2: o[1] + Math.sin(th) * La,
            boja: "var(--warn)",
            oznaka: `a_${T}`,
          });
        }
      });
      return out;
    }
    if (scena === "zavoj") {
      if (vidiV && !skriveno("v"))
        smjerStr(
          tangKut(th),
          smjer ? 62 : (vel.v / najv("v")) * 74,
          "var(--primary)",
          "v",
        );
      // trenje daje potrebnu silu do granice F_max: duljina strelice odaje F_cp
      if (!smjer && !skriveno("F_cp") && !skriveno("a_cp")) {
        const Fm = Math.max(najv("F_cp"), najv("F_max"));
        smjerStr(
          th + Math.PI,
          (Math.min(vel.F_cp, vel.F_max) / Fm) * 74,
          "var(--warn)",
          "F_{tr}",
        );
      }
      return out;
    }
    if (scena === "orbita") {
      if (vidiV && !skriveno("v"))
        smjerStr(
          tangKut(th),
          smjer ? 58 : (vel.v / najv("v")) * 62,
          "var(--primary)",
          "v",
        );
      if (!smjer && !bezGravitacije && !skriveno("a") && !skriveno("F"))
        smjerStr(
          th + Math.PI,
          (vel.a / najv("a")) * 58,
          "var(--danger)",
          "F_g",
        );
      return out;
    }
    if (scena === "kotac" && vidiV)
      smjerStr(tangKut(th), 62, "var(--primary)", "v");
    return out;
  });

  let stavke = $derived(
    smjer
      ? []
      : prikaziKruzenja(spec).map((k) => {
          const m = meta[k];
          const ciljana = postavi && spec.cilj?.velicina === k;
          let tekst = opisVelicine(vel[k], m);
          if (scena === "orbita" && (k === "h" || k === "r"))
            tekst = iznosJed(vel[k] / 1000, "km");
          if (scena === "orbita" && k === "v")
            tekst = `${iznosJed(vel.v, "m/s")} = ${iznosJed(vel.v / 1000, "km/s")}`;
          if (k === "T" && vel.T > 120)
            tekst = `${iznosJed(vel.T, "s")} ≈ ${broj(vel.T / 60)} min`;
          return {
            kljuc: k,
            oznaka: m.oznaka,
            naziv: m.naziv,
            tekst,
            skriveno: bezIznosa(k),
            status:
              ciljana && otkriveno && neprom && ishod
                ? ishod.tocno
                  ? "ok"
                  : "bad"
                : ciljana && pokazi
                  ? "ok"
                  : null,
          };
        }),
  );

  // zavoj: stupci potrebna sila naspram najvećeg trenja
  let stupci = $derived.by(() => {
    if (scena !== "zavoj" || smjer) return null;
    const Fm = Math.max(najv("F_cp"), najv("F_max"));
    return {
      cp: Math.min(1, vel.F_cp / Fm),
      max: vel.F_max / Fm,
      prolazi: fiz.prolazi,
      skriven: skriveno("F_cp"),
    };
  });

  let opis = $derived.by(() => {
    const ime = {
      kotac: "Kotač koji se vrti",
      zavoj: "Auto u kružnom zavoju, pogled odozgo",
      orbita: "Satelit u kružnoj orbiti oko planeta",
    }[scena];
    const vrt =
      SG > 0 ? "suprotno od kazaljke na satu" : "kao kazaljka na satu";
    if (smjer)
      return `${ime}, vrti se ${vrt}. Strelica: ${kut == null ? "nije postavljena" : smjerRijecima(kut)}.`;
    return `${ime}, vrti se ${vrt}.`;
  });
  const GEN = { kotac: "označene točke", zavoj: "auta", orbita: "satelita" };
  const NOM = { kotac: "točka", zavoj: "auto", orbita: "satelit" };
  const uputa = untrack(() =>
    spec.pitaj === "izlijetanje"
      ? `Povuci vrh strelice tako da pokazuje kamo ${NOM[scena]} odleti.`
      : `Povuci vrh strelice tako da pokazuje ${{ brzina: "brzinu", akceleracija: "akceleraciju", sila: "silu" }[spec.pitaj]} ${GEN[scena]}.`,
  );
  const kotacZbice = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  let tockaS = $derived(pol(tockaPolumjer(), th));
  // bez postavljenog smjera ručka stoji koso od tijela, između mogućih odgovora
  let vrhSmjer = $derived(
    kut == null
      ? [
          tockaS[0] + Math.cos(th + 0.8) * 46,
          tockaS[1] - Math.sin(th + 0.8) * 46,
        ]
      : [
          tockaS[0] + Math.cos(rad(kut)) * 66,
          tockaS[1] - Math.sin(rad(kut)) * 66,
        ],
  );
  const uid = Math.random().toString(36).slice(2, 8);
  // luk sa strelicom koji pokazuje smjer vrtnje
  let vrtnja = $derived.by(() => {
    const Rv =
      scena === "orbita" ? rOrb + 20 : scena === "zavoj" ? RZ + 34 : RK + 16;
    const a0 = rad(205);
    const P0 = pol(Rv, a0);
    const P1 = pol(Rv, a0 + SG * 0.55);
    return `M${r1(P0[0])},${r1(P0[1])} A${r1(Rv)},${r1(Rv)} 0 0 ${SG > 0 ? 0 : 1} ${r1(P1[0])},${r1(P1[1])}`;
  });
</script>

{#if nacin === "istrazi"}
  <div class="kr-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure kr">
  <svg bind:this={svgEl} viewBox="0 0 360 300" role="img" aria-label={opis}>
    <!-- smjer vrtnje -->
    <path class="kr-vrtnja" d={vrtnja} marker-end="url(#kr-vrh-{uid})" />
    <defs>
      <marker
        id="kr-vrh-{uid}"
        viewBox="0 0 10 10"
        refX="6"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L10,5 L0,10 z" class="kr-vrh-m" />
      </marker>
    </defs>

    {#if scena === "kotac"}
      <circle class="kr-guma" cx={C[0]} cy={C[1]} r={RK + 7} />
      <circle class="kr-kotac" cx={C[0]} cy={C[1]} r={RK} />
      {#each kotacZbice as z (z)}
        {@const e = pol(RK, th + z)}
        <line
          class="kr-zbica"
          x1={C[0]}
          y1={C[1]}
          x2={r1(e[0])}
          y2={r1(e[1])}
        />
      {/each}
      <circle class="kr-os" cx={C[0]} cy={C[1]} r="6" />
      {#if !smjer}
        {#each tockeKotaca(spec) as k, i (i)}
          {#if !(i === 0 && pusteno)}
            {@const o = pol(RK * k, th)}
            <circle class="kr-tocka" cx={r1(o[0])} cy={r1(o[1])} r="6" />
            <text
              class="kr-tocka-t"
              x={r1(o[0] - 12 * Math.cos(th + 0.5))}
              y={r1(o[1] + 12 * Math.sin(th + 0.5) + 4)}
              text-anchor="middle">{i === 0 ? "A" : "B"}</text
            >
          {/if}
        {/each}
      {/if}
    {:else if scena === "zavoj"}
      <circle class="kr-trava" cx={C[0]} cy={C[1]} r={RZ - 22} />
      <circle class="kr-cesta" cx={C[0]} cy={C[1]} r={RZ} />
      <circle class="kr-crta" cx={C[0]} cy={C[1]} r={RZ} />
      <circle class="kr-sredina" cx={C[0]} cy={C[1]} r="3" />
      {#if stupci}
        <g class="kr-stupci">
          <text class="kr-st-t" x={C[0]} y={C[1] - 26} text-anchor="middle"
            >potrebno</text
          >
          <rect
            class="kr-st-okvir"
            x={C[0] - 50}
            y={C[1] - 20}
            width="100"
            height="12"
            rx="3"
          />
          {#if !stupci.skriven}
            <rect
              class="kr-st-cp"
              class:kr-prekoraceno={!stupci.prolazi}
              x={C[0] - 50}
              y={C[1] - 20}
              width={r1(100 * stupci.cp)}
              height="12"
              rx="3"
            />
          {/if}
          <text class="kr-st-t" x={C[0]} y={C[1] + 12} text-anchor="middle"
            >najveće trenje</text
          >
          <rect
            class="kr-st-okvir"
            x={C[0] - 50}
            y={C[1] + 18}
            width="100"
            height="12"
            rx="3"
          />
          <rect
            class="kr-st-max"
            x={C[0] - 50}
            y={C[1] + 18}
            width={r1(100 * stupci.max)}
            height="12"
            rx="3"
          />
        </g>
      {/if}
    {:else if scena === "orbita"}
      <circle class="kr-orbita" cx={C[0]} cy={C[1]} r={r1(rOrb)} />
      <circle class="kr-planet" cx={C[0]} cy={C[1]} r={r1(R0 * PX)} />
      <path
        class="kr-kopno"
        d="M{C[0] - R0 * PX * 0.5},{C[1] - R0 * PX * 0.3} q{R0 *
          PX *
          0.3},{-R0 * PX * 0.25} {R0 * PX * 0.55},{-R0 * PX * 0.05} q{R0 *
          PX *
          0.1},{R0 * PX * 0.3} {-R0 * PX * 0.2},{R0 * PX * 0.45} q{-R0 *
          PX *
          0.35},{R0 * PX * 0.05} {-R0 * PX * 0.35},{-R0 * PX * 0.4} z"
      />
      {#if bezGravitacije}
        <text class="kr-napomena" x={C[0]} y="292" text-anchor="middle"
          >gravitacija isključena</text
        >
      {/if}
    {/if}

    <!-- tijelo koje kruži -->
    {#if scena === "zavoj"}
      {@const a = leti ? Math.atan2(-leti.vy, leti.vx) : tangKut(th)}
      <g
        transform="translate({r1(tijelo[0])} {r1(tijelo[1])}) rotate({r1(
          (-a * 180) / Math.PI,
        )})"
        opacity={leti ? Math.max(0, 1 - leti.t / 1.8) : 1}
      >
        <rect class="kr-auto" x="-15" y="-8" width="30" height="16" rx="5" />
        <rect class="kr-staklo" x="3" y="-6" width="7" height="12" rx="2" />
      </g>
    {:else if scena === "orbita"}
      {@const a = leti ? Math.atan2(-leti.vy, leti.vx) : tangKut(th)}
      <g
        transform="translate({r1(tijelo[0])} {r1(tijelo[1])}) rotate({r1(
          (-a * 180) / Math.PI,
        )})"
        opacity={leti ? Math.max(0, 1 - leti.t / 1.8) : 1}
      >
        <rect class="kr-panel" x="-4" y="-16" width="8" height="10" />
        <rect class="kr-panel" x="-4" y="6" width="8" height="10" />
        <rect class="kr-satelit" x="-6" y="-6" width="12" height="12" rx="2" />
      </g>
    {:else if scena === "kotac" && (smjer || pusteno)}
      <circle
        class="kr-tocka"
        class:kr-leti={!!leti}
        cx={r1(tijelo[0])}
        cy={r1(tijelo[1])}
        r="6"
      />
    {/if}
    {#if leti}
      <line
        class="kr-trag"
        x1={r1(pol(tockaPolumjer(), th)[0])}
        y1={r1(pol(tockaPolumjer(), th)[1])}
        x2={r1(leti.x)}
        y2={r1(leti.y)}
      />
    {/if}

    {#each sStrelice as s, i (i)}
      <Strelica {...s} />
    {/each}

    <!-- smjer: učenikova strelica -->
    {#if smjer && !leti}
      {#if kut == null}
        <circle
          class="kr-prsten"
          cx={r1(tockaS[0])}
          cy={r1(tockaS[1])}
          r="46"
        />
      {:else}
        <Strelica
          x1={tockaS[0]}
          y1={tockaS[1]}
          x2={vrhSmjer[0]}
          y2={vrhSmjer[1]}
          boja={tocno
            ? "var(--success)"
            : ishod && !ishod.tocno && poslanKut === kut
              ? "var(--danger)"
              : "var(--primary)"}
          sirina={3.2}
        />
      {/if}
      {#if aktivno}
        <g
          class="lx-handle kr-ruc"
          role="slider"
          tabindex="0"
          aria-label="Strelica: povuci vrh ili koristi strelice za okretanje"
          aria-valuenow={kut ?? 0}
          aria-valuetext={kut == null ? "nije postavljena" : smjerRijecima(kut)}
          onpointerdown={down}
          onpointermove={move}
          onpointerup={up}
          onpointercancel={up}
          onkeydown={key}
        >
          <circle
            class="kr-hit"
            cx={r1(vrhSmjer[0])}
            cy={r1(vrhSmjer[1])}
            r="22"
          />
          <circle
            class="kr-rucka"
            class:kr-ceka={kut == null}
            cx={r1(vrhSmjer[0])}
            cy={r1(vrhSmjer[1])}
            r="11"
          />
        </g>
      {/if}
    {/if}
  </svg>
  {#if !prefersReducedMotion.current && !smjer}
    <figcaption class="kr-usporeno">
      prikaz je usporen{scena === "orbita"
        ? ", visina orbite nije u mjerilu"
        : ""}
    </figcaption>
  {/if}
</figure>

{#if smjer}
  <p class="kr-uputa">
    {uputa}
  </p>
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriSmjer}
      disabled={locked || kut == null}>Provjeri</button
    >
  </div>
{:else}
  <Ocitanja {stavke} />
  <Klizaci
    klizaci={spec.klizaci ?? []}
    bind:vrijednosti={p}
    disabled={postavi && (locked || pokazi)}
  />
  <div class="lx-actions kr-akcije">
    {#if postavi}
      <button
        type="button"
        class="btn btn-primary"
        onclick={provjeriPostavi}
        disabled={locked}>Provjeri</button
      >
    {/if}
    {#if scena === "kotac" && !postavi}
      <button
        type="button"
        class="btn btn-ghost"
        onclick={pustiTocku}
        disabled={!!leti || prefersReducedMotion.current}>Pusti točku A</button
      >
    {/if}
    {#if scena === "orbita" && !postavi}
      <button
        type="button"
        class="btn btn-ghost"
        onclick={iskljuciGravitaciju}
        disabled={!!leti || prefersReducedMotion.current}
        >Isključi gravitaciju</button
      >
    {/if}
  </div>
{/if}

<style>
  .kr-tekst {
    margin-bottom: 10px;
  }
  .kr {
    max-width: 400px;
    margin-bottom: 8px;
  }
  .kr svg {
    touch-action: manipulation;
  }
  .kr-usporeno {
    text-align: right;
    font-size: 11px;
    color: var(--text-faint);
    margin-top: -6px;
  }
  .kr-vrtnja {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 2;
  }
  .kr-vrh-m {
    fill: var(--text-faint);
  }
  .kr-guma {
    fill: none;
    stroke: var(--text);
    stroke-width: 10;
    opacity: 0.85;
  }
  .kr-kotac {
    fill: color-mix(in srgb, var(--text-dim) 10%, transparent);
    stroke: var(--text-dim);
    stroke-width: 2;
  }
  .kr-zbica {
    stroke: var(--text-faint);
    stroke-width: 3;
  }
  .kr-os {
    fill: var(--text);
  }
  .kr-tocka {
    fill: var(--primary);
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .kr-tocka-t {
    fill: var(--text);
    font: 700 13px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .kr-trava {
    fill: color-mix(in srgb, var(--success) 14%, transparent);
  }
  .kr-cesta {
    fill: none;
    stroke: color-mix(in srgb, var(--text-dim) 45%, var(--bg-elev));
    stroke-width: 40;
  }
  .kr-crta {
    fill: none;
    stroke: var(--bg-elev);
    stroke-width: 1.5;
    stroke-dasharray: 8 8;
  }
  .kr-sredina {
    fill: var(--text-dim);
  }
  .kr-auto {
    fill: var(--danger);
    stroke: var(--text);
    stroke-width: 1.2;
  }
  .kr-staklo {
    fill: color-mix(in srgb, var(--lx-water) 60%, var(--bg-elev));
  }
  .kr-st-t {
    fill: var(--text-dim);
    font: 600 10.5px var(--font-sans);
  }
  .kr-st-okvir {
    fill: var(--bg-elev);
    stroke: var(--border-strong);
  }
  .kr-st-cp {
    fill: var(--primary);
  }
  .kr-st-cp.kr-prekoraceno {
    fill: var(--danger);
  }
  .kr-st-max {
    fill: var(--warn);
  }
  .kr-orbita {
    fill: none;
    stroke: var(--border-strong);
    stroke-dasharray: 3 5;
  }
  .kr-planet {
    fill: color-mix(in srgb, var(--lx-water) 45%, var(--bg-elev));
    stroke: var(--lx-water);
    stroke-width: 1.5;
  }
  .kr-kopno {
    fill: color-mix(in srgb, var(--success) 55%, transparent);
  }
  .kr-satelit {
    fill: var(--text-dim);
    stroke: var(--text);
  }
  .kr-panel {
    fill: color-mix(in srgb, var(--primary) 70%, var(--bg-elev));
  }
  .kr-napomena {
    fill: var(--danger);
    font: 600 12px var(--font-sans);
  }
  .kr-trag {
    stroke: var(--text-faint);
    stroke-dasharray: 4 4;
    stroke-width: 1.5;
  }
  .kr-prsten {
    fill: none;
    stroke: var(--text-faint);
    stroke-dasharray: 4 4;
  }
  .kr-ruc {
    outline: none;
  }
  .kr-hit {
    fill: transparent;
  }
  .kr-rucka {
    fill: color-mix(in srgb, var(--primary) 20%, transparent);
    stroke: var(--primary);
    stroke-width: 1.8;
  }
  .kr-ruc:focus-visible .kr-rucka {
    stroke-width: 3.5;
  }
  .kr-rucka.kr-ceka {
    animation: kr-puls 1.4s ease-in-out infinite;
  }
  @keyframes kr-puls {
    50% {
      r: 14px;
    }
  }
  .kr-uputa {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 0 0 4px;
  }
  .kr-akcije:has(button) {
    justify-content: center;
  }
</style>
