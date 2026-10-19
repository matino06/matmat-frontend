<script>
  // Scena s tijelom i silama: nacrtaj (učenik dovuče kartice sila na tijelo i okrene strelice), istrazi (klizači,
  // tijelo se giba s izračunatom akceleracijom) i postavi (namjesti klizač do cilja). Sile, iznosi i akceleracija
  // dolaze iz katalog/fizika/sile_tijelo.js (fizikaSila), isto kao u provjeri.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Strelica from "./_SileStrelica.svelte";
  import Klizaci from "./_SileKlizaci.svelte";
  import Ocitanja from "./_SileOcitanja.svelte";
  import {
    fizikaSila,
    velicineScene,
    prikaziScene,
    smjeroviNacrtaj,
    karteNacrtaj,
    tocanCrtez,
    tijelaScene,
    DULJINE,
  } from "$lib/lesson/katalog/fizika/sile_tijelo.js";
  import {
    pocetneVrijednosti,
    krajnjeKombinacije,
    klizaciOd,
    analizaCilja,
    odajuCilj,
    zakljucajKut,
    kutVektora,
    opisVelicine,
    rastaviOznaku,
    smjerRijecima,
    iznosJed,
    rad,
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
  const crtaj = nacin === "nacrtaj";
  const postavi = nacin === "postavi";
  const PXM = 22; // piksela po metru u animaciji
  const ULEN = 13; // duljina jednog stupnja strelice u „nacrtaj“
  const r1 = (n) => Math.round(n * 10) / 10;

  // ── parametri i fizika ──
  let p = $state(untrack(() => pocetneVrijednosti(spec)));
  let fiz = $derived(fizikaSila(spec, p));
  let meta = $derived(velicineScene(spec));
  let tijela = $derived(tijelaScene(spec));

  // mjerilo strelica: najveća sila u cijelom rasponu klizača stane u LMAX piksela
  const LMAX =
    { kutija: 80, kolica: 80, dizalo: 78, kosina: 78, kolotura: 66 }[scena] ??
    80;
  // uz širok raspon klizača početne bi strelice bile sitne: mjerilo je najviše 2× početna najveća sila, a
  // dulje strelice (krajnji položaji klizača) se skraćuju na 1,35 · LMAX
  const najveca = (q) =>
    Math.max(1e-9, ...fizikaSila(spec, q).sile.map((f) => f.iznos));
  const FMAX = untrack(() =>
    Math.min(
      Math.max(...krajnjeKombinacije(spec).map(najveca)),
      2 * najveca(pocetneVrijednosti(spec)),
    ),
  );
  const duljinaSile = (F) => Math.min(1.35 * LMAX, (F / FMAX) * LMAX);

  const VLASTITE = ["var(--primary)", "var(--text)", "var(--text-dim)"];
  function boja(id) {
    if (/^G\d?$/.test(id)) return "var(--danger)";
    if (id === "N") return "var(--lx-water)";
    if (id === "F_tr") return "var(--warn)";
    if (/^T\d?$/.test(id)) return "var(--success)";
    const i = (spec.sile ?? []).findIndex((f) => f.id === id);
    return i >= 0 ? VLASTITE[i % 3] : "var(--text-dim)";
  }

  // ── geometrija scene ──
  const H =
    { kutija: 250, kolica: 250, dizalo: 280, kosina: 262, kolotura: 292 }[
      scena
    ] ?? 250;
  // gornji rub crteža (prazan prostor iznad scene se odreže)
  const Y0 =
    { kutija: 40, kolica: 40, dizalo: 0, kosina: 16, kolotura: crtaj ? 0 : 18 }[
      scena
    ] ?? 0;
  const POD = 172;
  // kosina: donji desni kut fiksan, duljina ovisi o nagibu
  let kos = $derived.by(() => {
    if (scena !== "kosina") return null;
    const a = fiz.kut ?? 0;
    const t = Math.tan(rad(a));
    const B = a > 0.5 ? Math.min(300, 168 / t) : 300;
    const top = [335 - B, 228 - B * t];
    const d = [Math.cos(rad(a)), Math.sin(rad(a))];
    return {
      a,
      B,
      top,
      d,
      n: [Math.sin(rad(a)), -Math.cos(rad(a))],
      L: B / Math.cos(rad(a)),
    };
  });

  // pomak (u pikselima) duž osi gibanja; za dizalo pomiče se okno, ne tijelo
  let pom = $state(0);
  let okno = $state(0);
  function centar(i, s = pom) {
    if (scena === "kutija") return [180 + s, POD - 25];
    if (scena === "kolica") return [180 + s, POD - 36];
    if (scena === "dizalo") return [180, 160];
    if (scena === "kosina") {
      const u = Math.min(kos.L - 34, (crtaj ? kos.L * 0.45 : 46) + s);
      return [
        kos.top[0] + kos.d[0] * u + kos.n[0] * 17,
        kos.top[1] + kos.d[1] * u + kos.n[1] * 17,
      ];
    }
    if (scena === "kolotura")
      return i === 0 ? [crtaj ? 120 : 84 + s, 96] : [274, 165 + s];
    return [180, 120];
  }

  // ── postavi: dok učenik ne provjeri, ne vidi ni cilj ni ono što ga odaje ──
  const klizac = untrack(() => klizaciOd(spec)[0]);
  let poslano = $state(null);
  let neprom = $derived(poslano != null && klizac && poslano === p[klizac.id]);
  let otkriveno = $derived(
    !postavi || locked || pokazi || (neprom && ishod && !ishod.prazno),
  );
  // ciljana veličina i one koje se s njom mijenjaju linearno (F_rez uz a, N uz vagu); stalne jednake odgovoru
  // (F_tr kad se traži sila guranja) crtaju se bez iznosa
  const odaju = untrack(() =>
    postavi && klizac
      ? odajuCilj(spec, klizac, (q) => fizikaSila(spec, q).vel)
      : { vezane: new Set(), jednake: new Set() },
  );
  // skriveno: ni iznos ni crtež; bezIznosa: crta se, ali se iznos ne piše
  const skriveno = (k) => !otkriveno && odaju.vezane.has(k);
  const bezIznosa = (k) =>
    skriveno(k) || (!otkriveno && odaju.jednake.has(k));
  // gibanje pokazuje akceleraciju (miruje li tijelo, ubrzava li), pa stoji dok se akceleracija ne smije vidjeti
  let mirno = $derived(skriveno("a") || skriveno("F_rez"));

  // ── animacija (istrazi, postavi) ──
  let v = 0;
  let pauza = 0;
  const raspon = () =>
    scena === "kosina"
      ? [0, (kos?.L ?? 200) - 90]
      : scena === "kolotura"
        ? [0, 70]
        : [-80, 80];
  function pocetak() {
    const v0 = spec.v0 ?? 0;
    v = v0;
    okno = 0;
    if (mirno) {
      v = 0;
      pom = 0;
      return;
    }
    if (scena === "kutija" || scena === "kolica") {
      const smjer = Math.sign(v0 || fiz.a);
      pom = smjer > 0 ? -80 : smjer < 0 ? 80 : 0;
    } else pom = 0;
  }
  untrack(pocetak);
  // promjena klizača: gibanje kreće ispočetka s novom akceleracijom
  $effect(() => {
    void p;
    void mirno;
    untrack(pocetak);
  });

  let zadnji = 0;
  function korak(now) {
    const dt = Math.min(0.05, (now - (zadnji || now)) / 1000);
    zadnji = now;
    if (mirno) return;
    if (pauza > 0) {
      pauza -= dt;
      if (pauza <= 0) pocetak();
      return;
    }
    const f = fizikaSila(spec, p, v);
    const imaTrenje = f.vel.F_tr > 1e-9;
    const nv = v + f.a * dt;
    // kinetičko trenje ne može okrenuti smjer: tijelo stane
    v = imaTrenje && Math.sign(nv) !== Math.sign(v) && v !== 0 ? 0 : nv;
    if (scena === "dizalo") {
      okno += v * dt * PXM * 1.4;
      if (Math.abs(v) > 7 || Math.abs(okno) > 2000) pauza = 0.8;
      return;
    }
    pom += v * dt * PXM;
    const [lo, hi] = raspon();
    if (pom < lo - 1e-6 || pom > hi + 1e-6) {
      pom = Math.min(hi, Math.max(lo, pom));
      pauza = 0.9;
    }
  }
  onMount(() => {
    if (crtaj) return;
    let id;
    const petlja = (now) => {
      if (!prefersReducedMotion.current) korak(now);
      else zadnji = 0;
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });

  // ── postavi ──
  $effect(() => {
    if (!pokazi || !postavi) return;
    untrack(() => {
      const a = analizaCilja(spec, klizac, (q) => fizikaSila(spec, q).vel);
      p = { ...p, [klizac.id]: a.best };
    });
  });
  function provjeriPostavi() {
    if (locked) return;
    poslano = p[klizac.id];
    onodgovor({ ...p });
  }

  let stavke = $derived(
    crtaj
      ? []
      : prikaziScene(spec).map((k) => {
          const m = meta[k];
          const ciljana = postavi && spec.cilj?.velicina === k;
          return {
            kljuc: k,
            oznaka: m.oznaka,
            naziv: m.naziv,
            tekst: opisVelicine(fiz.vel[k], m),
            boja:
              k === "T" || fiz.sile.some((f) => f.id === k)
                ? boja(k === "T" ? "T1" : k)
                : null,
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

  // ── nacrtaj ──
  const karte = untrack(() => (crtaj ? karteNacrtaj(spec) : []));
  const dozvoljeni = untrack(() => (crtaj ? smjeroviNacrtaj(spec) : []));
  const viseTijela = untrack(() => tijelaScene(spec).length > 1);
  let strelice = $state([]); // {id, tijelo, kut | null, duljina}
  let odabrana = $state(null); // kartica čeka dodir tijela (scena s dva tijela)
  let svgEl = $state();
  let duh = $state(null); // kartica koja se vuče: {id, x, y}
  let aktivno = $derived(crtaj && !locked && !pokazi);

  $effect(() => {
    if (!pokazi || !crtaj) return;
    untrack(() => (strelice = tocanCrtez(spec)));
  });

  const naCrtezu = (id) => strelice.some((s) => s.id === id);
  const karta = (id) => karte.find((c) => c.id === id);

  function svgTocka(clientX, clientY) {
    const m = svgEl?.getScreenCTM();
    if (!m) return null;
    const q = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return [q.x, q.y];
  }
  function tijeloKod(t) {
    if (!t) return -1;
    let best = -1;
    let d = 78;
    tijela.forEach((_, i) => {
      const c = centar(i, 0);
      const di = Math.hypot(t[0] - c[0], t[1] - c[1]);
      if (di < d) {
        d = di;
        best = i;
      }
    });
    return best;
  }
  function dodaj(id, tijelo, t = null) {
    if (naCrtezu(id)) return;
    const c = centar(tijelo, 0);
    let kut = null;
    if (t && Math.hypot(t[0] - c[0], t[1] - c[1]) > 22)
      kut = zakljucajKut(kutVektora(t[0] - c[0], c[1] - t[1]), dozvoljeni);
    strelice = [...strelice, { id, tijelo, kut, duljina: 3 }];
    odabrana = null;
  }
  const ukloni = (id) => (strelice = strelice.filter((s) => s.id !== id));

  // kartica: dodir dodaje (ili uklanja), povlačenje spušta na tijelo
  let start = null;
  function kartaDown(e, id) {
    if (!aktivno) return;
    start = { id, x: e.clientX, y: e.clientY, vuce: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function kartaMove(e) {
    if (!start) return;
    if (
      !start.vuce &&
      Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6 &&
      !naCrtezu(start.id)
    )
      start.vuce = true;
    if (start.vuce) {
      e.preventDefault();
      duh = { id: start.id, x: e.clientX, y: e.clientY };
    }
  }
  function kartaUp(e) {
    if (!start) return;
    const { id, vuce } = start;
    start = null;
    duh = null;
    if (vuce) {
      const t = svgTocka(e.clientX, e.clientY);
      const i = viseTijela
        ? tijeloKod(t)
        : t && t[0] >= 0 && t[0] <= 360 && t[1] >= 0 && t[1] <= H
          ? 0
          : -1;
      if (i >= 0) dodaj(id, i, t);
      return;
    }
    if (naCrtezu(id)) ukloni(id);
    else if (!viseTijela) dodaj(id, 0);
    else odabrana = odabrana === id ? null : id;
  }
  function kartaKey(e, id) {
    if (!aktivno || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    if (naCrtezu(id)) ukloni(id);
    else if (!viseTijela) dodaj(id, 0);
    else odabrana = odabrana === id ? null : id;
  }
  function tijeloKlik(i) {
    if (aktivno && odabrana) dodaj(odabrana, i);
  }

  // vrh strelice: smjer se zaključava, duljina 1–6
  let vuceVrh = null;
  function vrhDown(e, id) {
    if (!aktivno) return;
    e.preventDefault();
    e.stopPropagation();
    vuceVrh = id;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function vrhMove(e) {
    if (!vuceVrh) return;
    const t = svgTocka(e.clientX, e.clientY);
    const s = strelice.find((x) => x.id === vuceVrh);
    if (!t || !s) return;
    const c = centar(s.tijelo, 0);
    const dx = t[0] - c[0];
    const dy = c[1] - t[1];
    const dist = Math.hypot(dx, dy);
    if (dist < 8) return;
    const kut = zakljucajKut(kutVektora(dx, dy), dozvoljeni);
    const duljina = Math.min(DULJINE, Math.max(1, Math.round(dist / ULEN)));
    strelice = strelice.map((x) =>
      x.id === vuceVrh ? { ...x, kut, duljina } : x,
    );
  }
  const vrhUp = () => (vuceVrh = null);
  function vrhKey(e, id) {
    if (!aktivno) return;
    const s = strelice.find((x) => x.id === id);
    if (!s) return;
    const i =
      s.kut == null
        ? -1
        : dozvoljeni.findIndex((k) => Math.abs(k - s.kut) < 1e-6);
    let n = { ...s };
    if (e.key === "ArrowLeft")
      n.kut = dozvoljeni[(i + 1 + dozvoljeni.length) % dozvoljeni.length];
    else if (e.key === "ArrowRight")
      n.kut =
        dozvoljeni[
          (Math.max(i, 0) - 1 + dozvoljeni.length) % dozvoljeni.length
        ];
    else if (e.key === "ArrowUp") n.duljina = Math.min(DULJINE, s.duljina + 1);
    else if (e.key === "ArrowDown") n.duljina = Math.max(1, s.duljina - 1);
    else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      ukloni(id);
      return;
    } else return;
    e.preventDefault();
    strelice = strelice.map((x) => (x.id === id ? n : x));
  }
  function provjeriCrtez() {
    if (locked) return;
    onodgovor(strelice.map((s) => ({ ...s })));
  }
  function ocisti() {
    strelice = [];
    odabrana = null;
  }
  const vrhStrelice = (s) => {
    const c = centar(s.tijelo, 0);
    if (s.kut == null) {
      const i = strelice.filter((x) => x.kut == null).indexOf(s);
      const a = rad(35 + 50 * i);
      return [c[0] + Math.cos(a) * ULEN * 3.4, c[1] - Math.sin(a) * ULEN * 3.4];
    }
    return [
      c[0] + Math.cos(rad(s.kut)) * s.duljina * ULEN,
      c[1] - Math.sin(rad(s.kut)) * s.duljina * ULEN,
    ];
  };

  // ── crtanje sila u istrazi/postavi ──
  // u „postavi“ prije provjere ne crta se sila koja odaje cilj (N kad je cilj vaga; T1/T2 su veličina T)
  let vidljiveSile = $derived(
    fiz.sile.filter(
      (f) => !skriveno(f.id) && !skriveno(f.id.replace(/\d$/, "")),
    ),
  );
  let sileCrtez = $derived(
    crtaj
      ? []
      : vidljiveSile.map((f) => {
          const c = centar(f.tijelo);
          const L = duljinaSile(f.iznos);
          return {
            ...f,
            x1: c[0],
            y1: c[1],
            x2: c[0] + Math.cos(rad(f.kut)) * L,
            y2: c[1] - Math.sin(rad(f.kut)) * L,
          };
        }),
  );
  // rezultanta: crtkana, malo odmaknuta od tijela da se ne preklopi sa silama
  let rezultanta = $derived.by(() => {
    // rezultanta je izvedena iz cilja (F_rez = m·a, a uz vagu i N − G), pa se u „postavi“ vidi tek nakon provjere
    if (crtaj || scena === "kolotura" || !otkriveno) return null;
    const Fr = scena === "kosina" ? fiz.vel.m * fiz.vel.a : fiz.vel.F_rez;
    if (Math.abs(Fr) < FMAX * 0.01) return null;
    const L = duljinaSile(Math.abs(Fr)) * Math.sign(Fr);
    const c = centar(0);
    if (scena === "dizalo") return { x1: 236, y1: 160, x2: 236, y2: 160 - L };
    if (scena === "kosina") {
      const o = [c[0] + kos.n[0] * 40, c[1] + kos.n[1] * 40];
      return {
        x1: o[0],
        y1: o[1],
        x2: o[0] + kos.d[0] * L,
        y2: o[1] + kos.d[1] * L,
      };
    }
    const x0 = c[0] + 16 * Math.sign(L);
    return { x1: x0, y1: POD + 24, x2: x0 + L, y2: POD + 24 };
  });

  // ── opis za čitače ekrana ──
  let opis = $derived.by(() => {
    const ime = {
      kutija: "Sanduk na podu",
      kolica: "Kolica",
      dizalo: "Osoba na vagi u dizalu",
      kosina: "Tijelo na kosini",
      kolotura: "Dva tijela povezana niti preko koloture",
    }[scena];
    if (crtaj)
      return `${ime}. Nacrtane sile: ${strelice.length ? strelice.map((s) => `${karta(s.id)?.izvor ?? s.id} ${s.kut == null ? "bez smjera" : smjerRijecima(s.kut)}`).join(", ") : "nijedna"}.`;
    return `${ime}. Sile: ${vidljiveSile.map((f) => `${f.izvor}${bezIznosa(f.id) ? "" : ` ${iznosJed(f.iznos, "N")}`} ${smjerRijecima(f.kut)}`).join(", ")}.`;
  });

  const kosinaPut = $derived(
    kos
      ? `M${r1(kos.top[0])},${r1(kos.top[1])} L335,228 L${r1(kos.top[0])},228 Z`
      : "",
  );
  const uze = $derived(
    (spec.sile ?? [])
      .filter((f) => f.uze)
      .map((f) => {
        const k = rad(
          typeof f.smjer === "number"
            ? f.smjer
            : ({
                desno: 0,
                lijevo: 180,
                gore: 90,
                "gore-desno": 45,
                "gore-lijevo": 135,
              }[f.smjer] ?? 0),
        );
        const c = centar(0);
        const e = Math.min(
          33 / Math.max(1e-6, Math.abs(Math.cos(k))),
          25 / Math.max(1e-6, Math.abs(Math.sin(k))),
        );
        return {
          x1: c[0] + Math.cos(k) * e,
          y1: c[1] - Math.sin(k) * e,
          x2: c[0] + Math.cos(k) * 150,
          y2: c[1] - Math.sin(k) * 150,
        };
      }),
  );
  let vaga = $derived(
    opisVelicine(fiz.vel.vaga, meta.vaga ?? { jedinica: "N" }),
  );
  let vagaSkrivena = $derived(skriveno("vaga"));
</script>

{#if nacin === "istrazi"}
  <div class="st-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure st">
  <svg
    bind:this={svgEl}
    viewBox="0 {Y0} 360 {H - Y0}"
    role="img"
    aria-label={opis}
  >
    <!-- ── scena ── -->
    {#if scena === "kutija" || scena === "kolica"}
      <line class="st-pod" x1="8" y1={POD} x2="352" y2={POD} />
      {#each Array.from({ length: 23 }, (_, i) => i) as i (i)}
        <line
          class="st-srafura"
          x1={14 + i * 15}
          y1={POD + 1}
          x2={6 + i * 15}
          y2={POD + 9}
        />
      {/each}
      {#each uze as u, i (i)}
        <line
          class="st-uze"
          x1={r1(u.x1)}
          y1={r1(u.y1)}
          x2={r1(u.x2)}
          y2={r1(u.y2)}
        />
      {/each}
      {#if scena === "kutija"}
        {@const c = centar(0, crtaj ? 0 : pom)}
        <rect
          class="st-tijelo st-drvo"
          x={r1(c[0] - 33)}
          y={POD - 50}
          width="66"
          height="50"
          rx="3"
        />
        <path
          class="st-letva"
          d="M{r1(c[0] - 33)},{POD - 50} L{r1(c[0] + 33)},{POD} M{r1(
            c[0] + 33,
          )},{POD - 50} L{r1(c[0] - 33)},{POD}"
        />
      {:else}
        {@const c = centar(0, crtaj ? 0 : pom)}
        <rect
          class="st-tijelo"
          x={r1(c[0] - 38)}
          y={POD - 54}
          width="76"
          height="36"
          rx="5"
        />
        <circle class="st-kotac" cx={r1(c[0] - 22)} cy={POD - 9} r="9" />
        <circle class="st-kotac" cx={r1(c[0] + 22)} cy={POD - 9} r="9" />
      {/if}
    {:else if scena === "dizalo"}
      {#each Array.from({ length: 9 }, (_, i) => i) as i (i)}
        {@const y = ((((i * 40 + okno) % 360) + 360) % 360) - 40}
        <line class="st-okno" x1="84" y1={r1(y)} x2="104" y2={r1(y)} />
        <line class="st-okno" x1="256" y1={r1(y)} x2="276" y2={r1(y)} />
      {/each}
      <line class="st-zid" x1="82" y1="0" x2="82" y2={H} />
      <line class="st-zid" x1="278" y1="0" x2="278" y2={H} />
      <line class="st-uze" x1="180" y1="0" x2="180" y2="26" />
      <rect class="st-kabina" x="108" y="26" width="144" height="230" rx="6" />
      <!-- osoba na vagi -->
      <circle class="st-osoba" cx="180" cy="104" r="13" />
      <path
        class="st-osoba-tijelo"
        d="M180,118 V182 M180,132 L160,162 M180,132 L200,162 M180,182 L168,232 M180,182 L192,232"
      />
      <rect class="st-vaga" x="146" y="232" width="68" height="12" rx="3" />
      <rect class="st-lcd" x="190" y="36" width="56" height="24" rx="4" />
      <text class="st-lcd-t" x="218" y="52.5" text-anchor="middle"
        >{crtaj ? "vaga" : vagaSkrivena ? "?" : vaga}</text
      >
      {#if !crtaj && !skriveno("a") && Math.abs(fiz.vel.a) > 1e-9}
        <Strelica
          x1={304}
          y1={140}
          x2={304}
          y2={140 - Math.max(-60, Math.min(60, fiz.vel.a * 7))}
          boja="var(--text-dim)"
          sirina={2}
          oznaka="a"
        />
      {/if}
    {:else if scena === "kosina"}
      <line class="st-pod" x1="8" y1="228" x2="352" y2="228" />
      <path class="st-kosina" d={kosinaPut} />
      {#if kos.a > 0.5}
        <path
          class="lx-faint"
          d="M{r1(335 - 34)},228 A34,34 0 0 1 {r1(
            335 - 34 * Math.cos(rad(kos.a)),
          )},{r1(228 - 34 * Math.sin(rad(kos.a)))}"
        />
        <text
          class="lx-label"
          x={r1(335 - 46 * Math.cos(rad(kos.a / 2)))}
          y={r1(228 - 46 * Math.sin(rad(kos.a / 2)) + 4)}
          text-anchor="middle">{Math.round(kos.a)}°</text
        >
      {/if}
      {@const c = centar(0, crtaj ? 0 : pom)}
      <rect
        class="st-tijelo st-drvo"
        x={r1(c[0] - 23)}
        y={r1(c[1] - 16)}
        width="46"
        height="32"
        rx="3"
        transform="rotate({r1(kos.a)} {r1(c[0])} {r1(c[1])})"
      />
    {:else if scena === "kolotura"}
      {@const c1 = centar(0, crtaj ? 0 : pom)}
      {@const c2 = centar(1, crtaj ? 0 : pom)}
      <rect class="st-stol" x="14" y="120" width="238" height="10" rx="2" />
      <line class="st-noga" x1="30" y1="130" x2="30" y2={H - 6} />
      <line class="st-noga" x1="236" y1="130" x2="236" y2={H - 6} />
      <line class="st-nosac" x1="248" y1="120" x2="262" y2="108" />
      <line class="st-nit" x1={r1(c1[0] + 33)} y1="96" x2="262" y2="96" />
      <line class="st-nit" x1="274" y1="108" x2="274" y2={r1(c2[1] - 22)} />
      <circle class="st-kolotura" cx="262" cy="108" r="12" />
      <circle class="st-os" cx="262" cy="108" r="2.5" />
      <rect
        class="st-tijelo st-drvo"
        x={r1(c1[0] - 33)}
        y="72"
        width="66"
        height="48"
        rx="3"
      />
      <rect
        class="st-tijelo st-metal"
        x="252"
        y={r1(c2[1] - 22)}
        width="44"
        height="44"
        rx="3"
      />
      <text class="lx-label" x={r1(c1[0] - 46)} y="100" text-anchor="middle"
        >m₁</text
      >
      <text class="lx-label" x="318" y={r1(c2[1] + 4)} text-anchor="middle"
        >m₂</text
      >
    {/if}

    <!-- ── sile ── -->
    {#if crtaj}
      {#if odabrana}
        {#each tijela as ime, i (i)}
          {@const c = centar(i, 0)}
          <circle
            class="st-meta"
            cx={r1(c[0])}
            cy={r1(c[1])}
            r="44"
            onpointerup={() => tijeloKlik(i)}
            role="presentation"
          />
          <text
            class="st-meta-t"
            x={r1(c[0])}
            y={r1(c[1] + 60)}
            text-anchor="middle">{ime}</text
          >
        {/each}
      {/if}
      {#each strelice as s (s.id)}
        {@const c = centar(s.tijelo, 0)}
        {@const t = vrhStrelice(s)}
        {@const k = karta(s.id)}
        {#if s.kut == null}
          <circle
            class="st-prsten"
            cx={r1(c[0])}
            cy={r1(c[1])}
            r={ULEN * 3.4}
          />
          <line
            class="st-prsten"
            x1={r1(c[0])}
            y1={r1(c[1])}
            x2={r1(t[0])}
            y2={r1(t[1])}
          />
        {:else}
          <Strelica
            x1={c[0]}
            y1={c[1]}
            x2={t[0]}
            y2={t[1]}
            boja={k?.lazna ? "var(--text-dim)" : boja(s.id)}
            oznaka={k?.oznaka ?? s.id}
            oznakaOdmak={15}
          />
        {/if}
        {#if aktivno || s.kut == null}<g
            class="st-vrh"
            class:lx-handle={aktivno}
            role="slider"
            tabindex={aktivno ? 0 : -1}
            aria-label="Strelica sile {k?.izvor ??
              s.id}: strelice lijevo/desno okreću, gore/dolje mijenjaju duljinu"
            aria-valuenow={s.duljina}
            aria-valuetext={s.kut == null
              ? "bez smjera"
              : `${smjerRijecima(s.kut)}, duljina ${s.duljina}`}
            onpointerdown={(e) => vrhDown(e, s.id)}
            onpointermove={vrhMove}
            onpointerup={vrhUp}
            onpointercancel={vrhUp}
            onkeydown={(e) => vrhKey(e, s.id)}
          >
            <circle class="st-vrh-hit" cx={r1(t[0])} cy={r1(t[1])} r="20" />
            <circle
              class="st-vrh-dot"
              class:st-ceka={s.kut == null}
              cx={r1(t[0])}
              cy={r1(t[1])}
              r={s.kut == null ? 10 : 11}
              style:--b={k?.lazna ? "var(--text-dim)" : boja(s.id)}
            />
            {#if s.kut == null}
              {@const o = rastaviOznaku(k?.oznaka ?? s.id)}
              <text class="st-ceka-t" x={r1(t[0] + 13)} y={r1(t[1] - 10)}
                >{o.osnova}{#if o.indeks}<tspan dy="3" font-size="10"
                    >{o.indeks}</tspan
                  >{/if}</text
              >
            {/if}
          </g>{/if}
      {/each}
      {#each tijela.map((_t, i) => i) as i (i)}
        {@const c = centar(i, 0)}
        <circle class="st-tezste" cx={r1(c[0])} cy={r1(c[1])} r="3.2" />
      {/each}
    {:else}
      {#if scena === "kosina" && spec.rastav}
        {@const c = centar(0)}
        {@const Lp = duljinaSile(fiz.vel.F_par)}
        {@const Lo = duljinaSile(fiz.vel.F_okom)}
        <Strelica
          x1={c[0]}
          y1={c[1]}
          x2={c[0] + kos.d[0] * Lp}
          y2={c[1] + kos.d[1] * Lp}
          boja="var(--danger)"
          isprekidano
          sirina={1.8}
          prozirnost={0.75}
          oznaka="F_∥"
          oznakaStrana={-12}
        />
        <Strelica
          x1={c[0]}
          y1={c[1]}
          x2={c[0] - kos.n[0] * Lo}
          y2={c[1] - kos.n[1] * Lo}
          boja="var(--danger)"
          isprekidano
          sirina={1.8}
          prozirnost={0.75}
          oznaka="F_⊥"
          oznakaStrana={12}
        />
      {/if}
      {#each sileCrtez as f (f.id)}
        <Strelica
          x1={f.x1}
          y1={f.y1}
          x2={f.x2}
          y2={f.y2}
          boja={boja(f.id)}
          oznaka={f.oznaka}
          oznakaOdmak={scena === "dizalo" ? -6 : 14}
          oznakaStrana={scena === "dizalo" ? 17 : 0}
        />
      {/each}
      {#if rezultanta}
        <Strelica
          {...rezultanta}
          boja="var(--text)"
          isprekidano
          sirina={2}
          oznaka={"F_{rez}"}
          oznakaOdmak={20}
        />
      {/if}
      {#each tijela.map((_t, i) => i) as i (i)}
        {@const c = centar(i)}
        <circle class="st-tezste" cx={r1(c[0])} cy={r1(c[1])} r="3.2" />
      {/each}
    {/if}
  </svg>
</figure>

{#if duh}
  {@const k = karta(duh.id)}
  {@const o = rastaviOznaku(k?.oznaka)}
  <div
    class="st-duh"
    style:left="{duh.x}px"
    style:top="{duh.y}px"
    aria-hidden="true"
  >
    <i>{o.osnova}</i>{#if o.indeks}<sub>{o.indeks}</sub>{/if}
    <span>{k?.izvor}</span>
  </div>
{/if}

{#if crtaj}
  <p class="st-uputa">
    {#if odabrana}
      Dodirni tijelo na koje djeluje sila „{karta(odabrana)?.izvor}“:
      {#each tijela as ime, i (i)}<button
          type="button"
          class="btn btn-ghost st-na-tijelo"
          onclick={() => tijeloKlik(i)}>{ime}</button
        >{/each}
    {:else}
      Povuci karticu na {viseTijela ? "tijelo na koje sila djeluje" : "crtež"} (ili
      je dodirni), pa povlačenjem vrha strelice odredi smjer{spec.odnosi
        ? " i duljinu"
        : ""}.
    {/if}
  </p>
  <div class="st-karte" role="group" aria-label="Kartice sila">
    {#each karte as k (k.id)}
      {@const o = rastaviOznaku(k.oznaka)}
      {@const na = naCrtezu(k.id)}
      <button
        type="button"
        class="st-karta"
        class:st-na={na}
        class:st-odabrana={odabrana === k.id}
        class:lx-handle={aktivno && !na}
        disabled={!aktivno}
        aria-pressed={na}
        title={na ? "Dodirni za uklanjanje s crteža" : "Povuci na crtež"}
        style:--b={na
          ? k.lazna
            ? "var(--text-dim)"
            : boja(k.id)
          : "var(--border-strong)"}
        onpointerdown={(e) => kartaDown(e, k.id)}
        onpointermove={kartaMove}
        onpointerup={kartaUp}
        onpointercancel={() => ((start = null), (duh = null))}
        onkeydown={(e) => kartaKey(e, k.id)}
        onclick={(e) => e.preventDefault()}
      >
        <span class="st-karta-o"
          ><i>{o.osnova}</i>{#if o.indeks}<sub>{o.indeks}</sub>{/if}</span
        >
        <span class="st-karta-i">{k.izvor}</span>
        {#if na}<span class="st-karta-x" aria-hidden="true">✕</span>{/if}
      </button>
    {/each}
  </div>
  <div class="lx-actions">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriCrtez}
      disabled={locked || !strelice.length}>Provjeri</button
    >
    {#if strelice.length && aktivno}<button
        type="button"
        class="btn btn-ghost"
        onclick={ocisti}>Očisti</button
      >{/if}
  </div>
{:else}
  <Ocitanja {stavke} />
  <Klizaci
    klizaci={spec.klizaci ?? []}
    bind:vrijednosti={p}
    disabled={postavi && (locked || pokazi)}
  />
  {#if postavi}
    <div class="lx-actions">
      <button
        type="button"
        class="btn btn-primary"
        onclick={provjeriPostavi}
        disabled={locked}>Provjeri</button
      >
    </div>
  {/if}
{/if}

<style>
  .st-tekst {
    margin-bottom: 10px;
  }
  .st {
    max-width: 460px;
    margin-bottom: 10px;
  }
  .st svg {
    touch-action: manipulation;
  }
  .st-pod {
    stroke: var(--text);
    stroke-width: 2;
  }
  .st-srafura {
    stroke: var(--border-strong);
    stroke-width: 1.2;
  }
  .st-tijelo {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 1.8;
  }
  .st-drvo {
    fill: color-mix(in srgb, var(--warn) 22%, var(--bg-elev));
  }
  .st-metal {
    fill: color-mix(in srgb, var(--text-dim) 30%, var(--bg-elev));
  }
  .st-letva {
    stroke: color-mix(in srgb, var(--warn) 45%, var(--text-dim));
    stroke-width: 1.2;
    fill: none;
    opacity: 0.6;
  }
  .st-kotac {
    fill: var(--bg-elev-2);
    stroke: var(--text);
    stroke-width: 1.8;
  }
  .st-uze,
  .st-nit {
    stroke: var(--text-dim);
    stroke-width: 2;
  }
  .st-zid {
    stroke: var(--border-strong);
    stroke-width: 2;
  }
  .st-okno {
    stroke: var(--text-faint);
    stroke-width: 2;
  }
  .st-kabina {
    fill: color-mix(in srgb, var(--bg-elev-2) 70%, transparent);
    stroke: var(--text);
    stroke-width: 2;
  }
  .st-osoba {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 2;
  }
  .st-osoba-tijelo {
    stroke: var(--text);
    stroke-width: 4;
    stroke-linecap: round;
    fill: none;
  }
  .st-vaga {
    fill: var(--bg-elev);
    stroke: var(--text);
    stroke-width: 1.6;
  }
  .st-lcd {
    fill: var(--bg);
    stroke: var(--border-strong);
  }
  .st-lcd-t {
    fill: var(--success);
    font: 600 12px var(--font-mono);
  }
  .st-kosina {
    fill: color-mix(in srgb, var(--text-dim) 14%, transparent);
    stroke: var(--text);
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .st-stol {
    fill: color-mix(in srgb, var(--warn) 30%, var(--bg-elev));
    stroke: var(--text);
    stroke-width: 1.5;
  }
  .st-noga,
  .st-nosac {
    stroke: var(--text);
    stroke-width: 3;
  }
  .st-kolotura {
    fill: var(--bg-elev-2);
    stroke: var(--text);
    stroke-width: 2;
  }
  .st-os {
    fill: var(--text);
  }
  .st-tezste {
    fill: var(--text);
    pointer-events: none;
  }
  .st-meta {
    fill: color-mix(in srgb, var(--primary) 12%, transparent);
    stroke: var(--primary);
    stroke-dasharray: 5 4;
    stroke-width: 1.5;
    cursor: pointer;
  }
  .st-meta-t {
    fill: var(--primary);
    font: 600 12px var(--font-sans);
    pointer-events: none;
  }
  .st-prsten {
    fill: none;
    stroke: var(--text-faint);
    stroke-dasharray: 4 4;
    stroke-width: 1.3;
  }
  .st-vrh {
    outline: none;
  }
  .st-vrh-hit {
    fill: transparent;
  }
  .st-vrh-dot {
    fill: color-mix(in srgb, var(--b) 20%, transparent);
    stroke: var(--b);
    stroke-width: 2.5;
  }
  .st-vrh-dot.st-ceka {
    fill: color-mix(in srgb, var(--b) 25%, var(--bg-elev));
    animation: st-puls 1.4s ease-in-out infinite;
  }
  .st-vrh:focus-visible .st-vrh-dot {
    stroke-width: 4;
  }
  .st-ceka-t {
    fill: var(--text);
    font: italic 600 13px var(--font-sans);
    pointer-events: none;
  }
  @keyframes st-puls {
    50% {
      r: 12px;
    }
  }
  .st-uputa {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 0 0 10px;
  }
  .st-na-tijelo {
    margin: 4px 0 0 6px;
    padding: 4px 10px;
    font-size: 13px;
  }
  .st-karte {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .st-karta {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-height: 48px;
    padding: 7px 12px;
    border: 1.5px solid var(--b);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    color: var(--text);
    font: inherit;
    text-align: left;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }
  .st-karta:disabled {
    cursor: default;
  }
  .st-karta.st-na {
    background: color-mix(in srgb, var(--b) 12%, var(--bg-elev));
    padding-right: 28px;
  }
  .st-karta.st-odabrana {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-dim);
  }
  .st-karta-o {
    font-size: 15px;
    font-weight: 600;
  }
  .st-karta-o sub {
    font-size: 10.5px;
  }
  .st-karta-i {
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .st-karta-x {
    position: absolute;
    top: 6px;
    right: 9px;
    font-size: 11px;
    color: var(--text-faint);
  }
  .st-duh {
    position: fixed;
    z-index: 50;
    transform: translate(-50%, -120%);
    padding: 6px 10px;
    border: 1.5px solid var(--primary);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 13px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
    pointer-events: none;
    white-space: nowrap;
  }
  .st-duh span {
    color: var(--text-dim);
  }
</style>
