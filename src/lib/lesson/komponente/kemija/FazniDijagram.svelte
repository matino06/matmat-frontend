<script>
  // fazni_dijagram: fazni dijagram čiste tvari (lekcija 045). Sav račun je u katalog/kemija/fazni_dijagram.js; ovdje je
  // samo prikaz. U „Tvoj red“ područja nisu obojena ni imenovana, zadane točke i putevi nisu ucrtani (osim uz
  // pokazi_tocke) i nema očitanja s krivulje: sve se ucrta tek nakon provjere ili „Pokaži odgovor“. Istraživanje:
  // pomična točka koja se privuče na krivulju i trojnu točku, čestice i naziv stanja, put pri stalnom tlaku ili stalnoj
  // temperaturi s popisom faznih promjena i animacijom.
  import { untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Formula from "./Formula.svelte";
  import { formatNumber } from "$lib/lesson/core/number.js";
  import {
    fazni_dijagram,
    dijagramOf,
    kljucDijagrama,
    DIJAGRAMI,
    imeTvari,
    faza,
    stanjeU,
    najblizaKrivulja,
    udaljenostTrojne,
    prijelaziPuta,
    tockaOf,
    tockeOf,
    opisTocke,
    putOf,
    opisPuta,
    ocitanjaOf,
    traziOf,
    zapisU,
    zapisW,
    zapisOcitanja,
    zapisKoraka,
    jedinicaKoraka,
    stanjeTocke,
    stanjeIme,
    wOd,
    sJ,
    FAZA_IME,
    FAZA_ZNAK,
    KRIVULJE,
    KRIVULJA_GEN,
    PRIJELAZI,
    PRIJELAZ_IME,
    ENDOTERMNO,
    SLOVA,
    znakPrijelaza,
  } from "$lib/lesson/katalog/kemija/fazni_dijagram.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const s = untrack(() => spec);
  const nacin = s.nacin;
  const istrazi = nacin === "istrazi";
  const uid = Math.random().toString(36).slice(2, 8);
  const aktivno = $derived(!locked && !pokazi);
  const rijeseno = $derived(!!ishod?.tocno || pokazi);
  const tocanTekst = $derived(pokazi ? fazni_dijagram.tocanOdgovor(s) : "");
  const okK = (i) => !!ishod?.tocno || (ishod != null && ishod.praznina != null && ishod.praznina > i);
  const badK = (i) => ishod != null && !ishod.tocno && ishod.praznina === i && !ishod.prazno;

  // ── dijagram ──
  const tvari = istrazi && Array.isArray(s.tvari) ? s.tvari.map(kljucDijagrama) : null;
  let odabrana = $state(tvari ? Math.max(0, tvari.indexOf(kljucDijagrama(s.dijagram))) : 0);
  const M = $derived(tvari ? dijagramOf({ dijagram: tvari[odabrana] }) : dijagramOf(s));
  const D = $derived(M.D);
  const nazivi = $derived(istrazi || (s.nazivi ?? !!D.nazivi));
  const podrucja = $derived(istrazi || rijeseno);

  // ── graf ──
  const GW = 340;
  const GH = 252;
  const GL = 46;
  const GR = 12;
  const GT = 10;
  const GB = 26;
  const sx = (u) => GL + ((u - M.x0) / (M.x1 - M.x0)) * (GW - GL - GR);
  const sy = (w) => GT + ((M.y1 - w) / (M.y1 - M.y0)) * (GH - GT - GB);
  const yIn = (w) => Math.max(M.y0, Math.min(M.y1, w));
  function crtice(od, doo, korak) {
    if (!(korak > 0)) return [];
    const prvi = Math.ceil(od / korak - 1e-9) * korak;
    const out = [];
    for (let v = prvi, i = 0; v <= doo + 1e-9 && i < 80; v += korak, i++) out.push(Number(v.toPrecision(10)));
    return out;
  }
  const mreza = $derived.by(() => {
    if (M.shema) return { gx: crtice(M.x0, M.x1, 1), gy: crtice(M.y0, M.y1, 1), fx: crtice(M.x0, M.x1, 0.2), fy: crtice(M.y0, M.y1, 0.2) };
    const [mx, my] = M.os.mreza;
    const [fx, fy] = M.os.fino ?? [0, 0];
    return { gx: crtice(M.x0, M.x1, mx), gy: crtice(M.y0, M.y1, my), fx: crtice(M.x0, M.x1, fx), fy: crtice(M.y0, M.y1, fy) };
  });
  // oznake na osima: [{v (u ili w), z}]
  const oznakeX = $derived(M.shema ? (M.os.ox ?? []).map((q) => ({ v: q.u, z: q.z ?? formatNumber(q.v) })) : mreza.gx.map((v) => ({ v, z: formatNumber(v) })));
  const oznakeY = $derived(M.shema ? (M.os.oy ?? []).map((q) => ({ v: q.u, z: q.z ?? formatNumber(q.v) })) : mreza.gy.map((v) => ({ v, z: M.log ? `1×10${sup(v)}` : formatNumber(v) })));
  const SUPS = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "-": "⁻" };
  const sup = (n) => [...String(Math.round(n))].map((c) => SUPS[c] ?? c).join("");
  // tekst u SVG-u s indeksima i potencijama (tspan s pomakom)
  const SUBC = "₀₁₂₃₄₅₆₇₈₉";
  const SUPC = "⁰¹²³⁴⁵⁶⁷⁸⁹⁻";
  function svgDijelovi(f) {
    const out = [];
    let pom = 0;
    for (const ch of String(f)) {
      const v = SUBC.includes(ch) ? 1 : SUPC.includes(ch) ? 2 : 0;
      const z = v === 1 ? String(SUBC.indexOf(ch)) : v === 2 ? "0123456789−"[SUPC.indexOf(ch)] : ch;
      const zad = out[out.length - 1];
      if (zad && zad.v === v) {
        zad.z += z;
        continue;
      }
      const cilj = v === 1 ? 3 : v === 2 ? -4 : 0;
      out.push({ v, z, dy: cilj - pom });
      pom = cilj;
    }
    return out;
  }
  const crta = (P) => P.map(([u, w]) => `${sx(u).toFixed(1)},${sy(yIn(w)).toFixed(1)}`).join(" ");
  // područja kao mnogokuti iz krivulja i rubova okvira
  const mnogokuti = $derived.by(() => {
    const S = M.linije.sublimacija;
    const L = M.linije.taljenje;
    const V = M.linije.isparavanje;
    const vZad = V[V.length - 1];
    const sv = [[M.x0, M.y1], ...S, ...L.slice(1), [L[L.length - 1][0], M.y1]];
    const tek = M.uVrh != null ? [...L, [M.uVrh, M.y1], ...[...V].reverse()] : [...L, [M.x1, M.y1], [M.x1, vZad[1]], ...[...V].reverse()];
    const pl = M.uVrh != null ? [[M.x0, M.y0], ...S, ...V.slice(1), [M.x1, M.y1], [M.x1, M.y0]] : [[M.x0, M.y0], ...S, ...V.slice(1), [M.x1, M.y0]];
    return { s: crta(sv), l: crta(tek), g: crta(pl) };
  });
  const polozaj = (k) => {
    const q = D.polozaj?.[k];
    return q ? { u: q[0], w: wOd(M, q[1]), a: q[2] ?? "middle" } : null;
  };

  // ── istraživanje ──
  function pocetak(m, prvi) {
    if (prvi && s.tocka != null) {
      const P = tockaOf(m, s.tocka);
      if (Number.isFinite(P.u) && Number.isFinite(P.w)) return [P.u, P.w];
    }
    // malo ispod natpisa „čvrsto“, da točka ne prekrije natpis
    const q = m.D.polozaj?.s;
    if (!q) return [(m.x0 + m.uT) / 2, (m.wT + m.y1) / 2];
    return [q[0], wOd(m, q[1]) - 0.12 * (m.y1 - m.y0)];
  }
  const p0 = istrazi ? untrack(() => pocetak(M, true)) : [0, 0];
  let pu = $state(p0[0]);
  let pw = $state(p0[1]);
  let put = $state(null); // null | "p" (stalan tlak) | "t" (stalna temperatura)
  let animira = $state(false);
  let raf = 0;
  let pauza = 0;
  function stani() {
    cancelAnimationFrame(raf);
    clearTimeout(pauza);
    animira = false;
  }
  $effect(() => () => stani());
  function odaberi(i) {
    stani();
    odabrana = i;
    const m = dijagramOf({ dijagram: tvari[i] });
    [pu, pw] = pocetak(m, false);
    put = null;
  }
  const uMin = $derived(Math.max(M.x0, M.subPocetak));
  const uMax = $derived(M.uVrh != null ? M.x1 : M.vapKraj);
  const uKlamp = (u) => Math.max(uMin, Math.min(uMax, u));
  const wKlamp = (w) => Math.max(M.y0, Math.min(M.y1, w));
  // privlačenje na trojnu točku i krivulje
  function postavi(u, w) {
    u = uKlamp(u);
    w = wKlamp(w);
    if (udaljenostTrojne(M, u, w) < 0.035) [u, w] = [M.uT, M.wT];
    else {
      const n = najblizaKrivulja(M, u, w);
      if (n.d < 0.025 && n.gdje) [u, w] = n.gdje;
    }
    pu = u;
    pw = w;
  }
  let vuce = false;
  function izPokazivaca(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * GW;
    const y = ((e.clientY - r.top) / r.height) * GH;
    postavi(M.x0 + ((x - GL) / (GW - GL - GR)) * (M.x1 - M.x0), M.y1 - ((y - GT) / (GH - GT - GB)) * (M.y1 - M.y0));
  }
  function dolje(e) {
    if (!istrazi) return;
    stani();
    vuce = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    izPokazivaca(e);
  }
  const pomak = (e) => vuce && izPokazivaca(e);
  const gore = () => (vuce = false);
  function tipka(e) {
    if (!istrazi) return;
    const du = (M.x1 - M.x0) / 100;
    const dw = (M.y1 - M.y0) / 100;
    const m = { ArrowLeft: [-du, 0], ArrowRight: [du, 0], ArrowUp: [0, dw], ArrowDown: [0, -dw] }[e.key];
    if (!m) return;
    e.preventDefault();
    stani();
    // tipkama bez privlačenja, da se može i sići s krivulje
    pu = uKlamp(pu + m[0] * (e.shiftKey ? 5 : 1));
    pw = wKlamp(pw + m[1] * (e.shiftKey ? 5 : 1));
  }
  const istr = $derived.by(() => {
    if (!istrazi) return null;
    const st = stanjeU(M, pu, pw);
    return { ...st, faza: st.stanje.length === 1 ? st.stanje : null };
  });
  // fazne promjene na cijeloj crti kroz točku (grijanje slijeva nadesno, tlačenje odozdo prema gore)
  const crtaPuta = $derived.by(() => {
    if (!istrazi || !put) return null;
    const A = put === "p" ? [uMin, pw] : [pu, M.y0];
    const B = put === "p" ? [uMax, pw] : [pu, M.y1];
    const koraci = prijelaziPuta(M, A, B);
    return { A, B, koraci, pocetna: faza(M, ...A) };
  });
  function pokreni(smjer) {
    stani();
    const os = put === "p" ? "u" : "w";
    const cilj = os === "u" ? (smjer > 0 ? uMax : uMin) : smjer > 0 ? M.y1 : M.y0;
    if (prefersReducedMotion.current) {
      if (os === "u") pu = cilj;
      else pw = cilj;
      return;
    }
    const raspon = os === "u" ? uMax - uMin : M.y1 - M.y0;
    const brzina = raspon / 4; // u sekundi
    let zadnje = performance.now();
    let f = faza(M, pu, pw);
    animira = true;
    const tocka = (x) => (os === "u" ? [x, pw] : [pu, x]);
    const korak = (sad) => {
      const dt = Math.max(0, Math.min(0.05, (sad - zadnje) / 1000));
      zadnje = sad;
      const cur = os === "u" ? pu : pw;
      let nov = cur + smjer * brzina * dt;
      if ((smjer > 0 && nov >= cilj) || (smjer < 0 && nov <= cilj)) nov = cilj;
      const f2 = faza(M, ...tocka(nov));
      if (f2 !== f) {
        // stani baš na krivulji: ondje su dvije faze u ravnoteži
        let a = cur;
        let b = nov;
        for (let i = 0; i < 40; i++) {
          const c = (a + b) / 2;
          if (faza(M, ...tocka(c)) === f) a = c;
          else b = c;
        }
        // b je već na strani nove faze: nastavak ne pronađe isti prijelaz ponovno
        if (os === "u") pu = b;
        else pw = b;
        f = f2;
        pauza = setTimeout(() => {
          zadnje = performance.now();
          raf = requestAnimationFrame(korak);
        }, 1100);
        return;
      }
      if (os === "u") pu = nov;
      else pw = nov;
      if (nov === cilj) {
        animira = false;
        return;
      }
      raf = requestAnimationFrame(korak);
    };
    raf = requestAnimationFrame(korak);
  }
  function odaberiPut(p) {
    stani();
    put = put === p ? null : p;
  }

  // ── stanje ──
  const tocke = nacin === "stanje" ? untrack(() => tockeOf(s).map((t0) => tockaOf(M, t0))) : [];
  const tocnaStanja = nacin === "stanje" ? untrack(() => tocke.map((P) => stanjeTocke(M, P))) : [];
  let stanja = $state(tocke.map(() => null));
  const RED1 = ["s", "l", "g"];
  const RED2 = ["sl", "lg", "sg"];
  const oznakaTocke = (P, i) => (P.trojna ? (D.oznaka_trojne ? `u točki ${D.oznaka_trojne}` : "u trojnoj točki") : `${tocke.length > 1 ? `${SLOVA[i]}: ` : ""}${opisTocke(P)}`);

  // ── očitanje ──
  const ocitanja = nacin === "ocitaj" ? untrack(() => ocitanjaOf(s, M)) : [];
  const polja = ocitanja.flatMap((r, i) => (r.pita === "trojna" ? [{ r, i, dio: 0 }, { r, i, dio: 1 }] : [{ r, i, dio: 0 }]));
  let unosiO = $state(polja.map(() => ""));
  function glavaPolja(q) {
    const x = traziOf(s)[q.i];
    if (q.r.pita === "trojna") return { sym: q.dio === 0 ? (M.os.jx === "K" ? "T" : "t") : "p", ime: `trojne točke${D.oznaka_trojne ? ` ${D.oznaka_trojne}` : ""}`, jed: q.dio === 0 ? M.os.jx : M.os.jy };
    if (q.r.pita === "t") return { sym: q.r.jed === "K" ? "T" : "t", ime: x?.oznaka ?? `pri ${q.r.P.zp}`, jed: q.r.jed };
    return { sym: "p", ime: x?.oznaka ?? `pri ${q.r.P.zt}`, jed: M.os.jy };
  }

  // ── put ──
  const P = nacin === "put" ? untrack(() => putOf(M, s.od, s.do)) : null;
  const izravno = P?.vrsta === "izravno";
  const vrijednosti = nacin === "put" && !!s.vrijednosti && !izravno;
  let niz = $state([]);
  let vr = $state([]);
  const SVI = Object.keys(PRIJELAZI);
  function dodaj(k) {
    if (!aktivno) return;
    if (izravno) {
      niz = [k];
      return;
    }
    if (niz.length >= 3) return;
    niz = [...niz, k];
    vr = [...vr, ""];
  }
  function makni(i) {
    if (!aktivno) return;
    niz = niz.filter((_, j) => j !== i);
    vr = vr.filter((_, j) => j !== i);
  }

  // ── uvjeti ──
  const putevi = nacin === "uvjeti" ? untrack(() => s.putevi.map((x) => ({ ...putOf(M, x.od, x.do), opis: x.opis }))) : [];
  const tocanPut = putevi.findIndex((r) => r.niz?.includes(s.prijelaz));
  let izabran = $state(null);

  // „Pokaži odgovor“: točno u polja
  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (nacin === "stanje") stanja = [...tocnaStanja];
      if (nacin === "ocitaj") unosiO = polja.map((q) => zapisOcitanja(M, q.r, q.dio));
      if (nacin === "put") {
        niz = [...P.niz];
        vr = P.koraci.map((k) => zapisKoraka(M, P, k));
      }
      if (nacin === "uvjeti") izabran = tocanPut;
    });
  });

  const potpun = $derived.by(() => {
    if (nacin === "stanje") return stanja.every(Boolean);
    if (nacin === "ocitaj") return unosiO.every((v) => String(v).trim());
    if (nacin === "put") return niz.length > 0 && (!vrijednosti || vr.every((v) => String(v).trim()));
    if (nacin === "uvjeti") return izabran != null;
    return false;
  });
  function predaj(e) {
    e.preventDefault();
    if (!aktivno || !potpun) return;
    if (nacin === "stanje") onodgovor({ stanja: $state.snapshot(stanja) });
    if (nacin === "ocitaj") onodgovor({ unosi: $state.snapshot(unosiO) });
    if (nacin === "put") onodgovor({ prijelazi: $state.snapshot(niz), ...(vrijednosti ? { vrijednosti: $state.snapshot(vr) } : {}) });
    if (nacin === "uvjeti") onodgovor({ put: izabran });
  }

  // ── što se ucrta na graf ──
  // tocke {u, w, klasa, oznaka?}, vodici {u, w} (do obje osi), puteve {A, B, oznaka?, klasa}
  const crtez = $derived.by(() => {
    const out = { tocke: [], vodici: [], putevi: [], oznake: [] };
    const vidi = rijeseno || s.pokazi_tocke;
    if (nacin === "stanje" && vidi)
      tocke.forEach((Q, i) => {
        if (!Q.trojna) out.tocke.push({ u: Q.u, w: Q.w, klasa: rijeseno ? "ok" : "zadana", oznaka: tocke.length > 1 ? SLOVA[i] : null });
      });
    if (nacin === "ocitaj" && rijeseno)
      for (const r of ocitanja) {
        out.tocke.push({ u: r.u, w: r.w, klasa: "ok" });
        out.vodici.push({ u: r.u, w: r.w });
        out.oznake.push({ u: r.u, w: r.w, dolje: r.pita === "trojna", z: r.pita === "trojna" ? `${sJ(zapisU(M, r.u), M.os.jx)}; ${sJ(zapisW(M, r.w), M.os.jy)}` : r.pita === "t" ? sJ(zapisOcitanja(M, r), r.jed) : sJ(zapisW(M, r.w), M.os.jy) });
      }
    if (nacin === "put" && P && !P.greska && vidi) {
      out.putevi.push({ A: [P.A.u, P.A.w], B: [P.B.u, P.B.w], klasa: "put" });
      if (rijeseno && !izravno)
        P.koraci.forEach((k, i) => {
          // uz vrijednost broj koraka ne stane na isto mjesto (prekrivali bi se)
          out.tocke.push({ u: k.u, w: k.w, klasa: "ok", oznaka: vrijednosti ? "" : String(i + 1) });
          if (vrijednosti) out.oznake.push({ u: k.u, w: k.w, z: sJ(zapisKoraka(M, P, k), jedinicaKoraka(M, P)) });
        });
    }
    if (nacin === "uvjeti" && vidi)
      putevi.forEach((r, i) => {
        if (!r.greska) out.putevi.push({ A: [r.A.u, r.A.w], B: [r.B.u, r.B.w], klasa: rijeseno && i === tocanPut ? "put" : "drugi", oznaka: SLOVA[i] });
      });
    return out;
  });
  const tockaIstr = $derived(istrazi ? { u: pu, w: pw } : null);
  // tekst s formulama: prelama se samo između pojmova, a strelica i „ד ostaju uz pojam iza sebe
  function pojmovi(t) {
    const r = String(t).split(" ");
    const out = [];
    for (let i = 0; i < r.length; i++) {
      const x = r[i];
      if (["→", "⇌"].includes(x) && i + 1 < r.length) {
        out.push(`${x} ${r[i + 1]}`);
        i++;
      } else if ((x === "×" || x === "=") && out.length && i + 1 < r.length) {
        out[out.length - 1] += ` ${x} ${r[i + 1]}`;
        i++;
      } else out.push(x);
    }
    return out;
  }
</script>

{#snippet ell(p)}{#each String(p).split(/(ℓ)/) as d, k (k)}{#if d === "ℓ"}<span class="fd-ell">ℓ</span>{:else if d}<Formula f={d} />{/if}{/each}{/snippet}

{#snippet tx(t)}<span class="fd-tx">{#each pojmovi(t) as p, i (i)}{i ? " " : ""}<span class="fd-nw">{@render ell(p)}</span>{/each}</span>{/snippet}

{#snippet svgTxt(t)}{#each svgDijelovi(t) as d, k (k)}<tspan dy={d.dy || null} font-size={d.v ? "0.72em" : null}>{d.z}</tspan>{/each}{/snippet}

{#snippet cestice(f, mali = false)}
  <svg class="fd-cest" class:mali viewBox="0 0 40 40" aria-hidden="true">
    <rect class="fd-kutija" x="1" y="1" width="38" height="38" rx="5" />
    {#if f === "s"}
      {#each [0, 1, 2, 3] as r (r)}{#each [0, 1, 2, 3] as c (c)}<circle class="fd-c s" cx={9 + c * 7.3} cy={31 - r * 7.3} r="3.1" />{/each}{/each}
    {:else if f === "l"}
      {#each [[7, 33], [14, 32], [21, 33.5], [28, 32], [34, 33], [10, 26], [17, 25.5], [24, 26.5], [31, 25.5], [13, 19], [21, 19.5], [28, 19]] as [x, y], i (i)}<circle class="fd-c l" cx={x} cy={y} r="3.1" />{/each}
    {:else}
      {#each [[8, 9], [27, 7], [33, 21], [15, 22], [7, 33], [24, 32]] as [x, y], i (i)}<circle class="fd-c g" cx={x} cy={y} r="2.8" />{/each}
    {/if}
  </svg>
{/snippet}

{#snippet stanjeSlika(st)}
  <div class="fd-slika" aria-hidden="true">
    {#each [...st] as f, i (i)}{#if i}<span class="fd-rav">⇌</span>{/if}{@render cestice(f, st.length > 1)}{/each}
  </div>
{/snippet}

{#snippet osY()}<i>p</i> / {M.os.jy}{/snippet}

{#snippet graf()}
  <figure class="fd-graf">
    <div class="fd-osy">{@render osY()}</div>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <svg
      viewBox="0 0 {GW} {GH}"
      role={istrazi ? "application" : "img"}
      aria-label="Fazni dijagram: {imeTvari(D)}{istr ? `; točka: ${stanjeIme(istr.stanje)}` : ''}"
      class:vuci={istrazi}
      tabindex={istrazi ? 0 : null}
      onpointerdown={dolje}
      onpointermove={pomak}
      onpointerup={gore}
      onpointercancel={gore}
      onkeydown={tipka}
    >
      <defs>
        <clipPath id="fd-{uid}-k"><rect x={GL} y={GT} width={GW - GL - GR} height={GH - GT - GB} /></clipPath>
        <marker id="fd-{uid}-s" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="fd-vrh" d="M0 1 L9 5 L0 9 Z" /></marker>
        <marker id="fd-{uid}-s2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="fd-vrh2" d="M0 1 L9 5 L0 9 Z" /></marker>
      </defs>
      <g clip-path="url(#fd-{uid}-k)">
        {#if podrucja}
          <polygon class="fd-pod s" points={mnogokuti.s} />
          <polygon class="fd-pod l" points={mnogokuti.l} />
          <polygon class="fd-pod g" points={mnogokuti.g} />
        {/if}
        {#each mreza.fx as x, i (i)}<line class="fd-fino" x1={sx(x)} y1={GT} x2={sx(x)} y2={GH - GB} />{/each}
        {#each mreza.fy as y, i (i)}<line class="fd-fino" x1={GL} y1={sy(y)} x2={GW - GR} y2={sy(y)} />{/each}
        {#each mreza.gx as x, i (i)}<line class="fd-mreza" x1={sx(x)} y1={GT} x2={sx(x)} y2={GH - GB} />{/each}
        {#each mreza.gy as y, i (i)}<line class="fd-mreza" x1={GL} y1={sy(y)} x2={GW - GR} y2={sy(y)} />{/each}
        {#if crtaPuta}
          <line class="fd-crta-puta" x1={sx(crtaPuta.A[0])} y1={sy(crtaPuta.A[1])} x2={sx(crtaPuta.B[0])} y2={sy(crtaPuta.B[1])} />
        {/if}
        {#each KRIVULJE as k (k)}<polyline class="fd-krivulja" points={crta(M.linije[k])} />{/each}
        {#each crtez.vodici as d, i (i)}
          <polyline class="fd-vodic" points="{sx(d.u)},{GH - GB} {sx(d.u)},{sy(d.w)} {GL},{sy(d.w)}" />
        {/each}
        {#each crtez.putevi as p, i (i)}
          <line class="fd-put {p.klasa}" x1={sx(p.A[0])} y1={sy(p.A[1])} x2={sx(p.B[0])} y2={sy(p.B[1])} marker-end="url(#fd-{uid}-{p.klasa === 'put' ? 's' : 's2'})" />
          <circle class="fd-put-poc {p.klasa}" cx={sx(p.A[0])} cy={sy(p.A[1])} r="3.5" />
        {/each}
      </g>
      {#if podrucja}
        {#each ["s", "l", "g"] as f (f)}
          {@const q = polozaj(f)}
          {#if q}<text class="fd-ime-pod {f}" x={sx(q.u)} y={sy(q.w)} text-anchor="middle">{FAZA_IME[f]}</text>{/if}
        {/each}
      {/if}
      {#if nazivi}
        {#each KRIVULJE as k (k)}
          {@const q = polozaj(k)}
          {#if q}<text class="fd-ime-kr" x={sx(q.u)} y={sy(q.w)} text-anchor={q.a}>{k}</text>{/if}
        {/each}
      {/if}
      <line class="fd-os" x1={GL} y1={GT - 4} x2={GL} y2={GH - GB} />
      <line class="fd-os" x1={GL} y1={GH - GB} x2={GW - GR + 4} y2={GH - GB} />
      {#each oznakeX as o, i (i)}
        <line class="fd-os" x1={sx(o.v)} y1={GH - GB} x2={sx(o.v)} y2={GH - GB + 3} />
        <text class="fd-tick" x={sx(o.v)} y={GH - GB + 14} text-anchor="middle">{@render svgTxt(o.z)}</text>
      {/each}
      {#each oznakeY as o, i (i)}
        <line class="fd-os" x1={GL - 3} y1={sy(o.v)} x2={GL} y2={sy(o.v)} />
        <text class="fd-tick" x={GL - 5} y={sy(o.v) + 3.5} text-anchor="end">{@render svgTxt(o.z)}</text>
      {/each}
      <circle class="fd-trojna" cx={sx(M.uT)} cy={sy(M.wT)} r="3" />
      {#if D.oznaka_trojne}<text class="fd-ime-t" x={sx(M.uT) + 6} y={sy(M.wT) + 13}>{D.oznaka_trojne}</text>{/if}
      {#each crtez.putevi as p, i (i)}
        {#if p.oznaka}<text class="fd-slovo {p.klasa}" x={sx(p.A[0]) - 5} y={sy(p.A[1]) - 5} text-anchor="end">{p.oznaka}</text>{/if}
      {/each}
      {#if crtaPuta}
        {#each crtaPuta.koraci as k, i (i)}<circle class="fd-presjek" cx={sx(k.u)} cy={sy(k.w)} r="4" />{/each}
      {/if}
      {#each crtez.tocke as p, i (i)}
        <circle class="fd-tocka {p.klasa}" cx={sx(p.u)} cy={sy(yIn(p.w))} r="4.5" />
        {#if p.oznaka}<text class="fd-slovo" x={sx(p.u) + 7} y={sy(yIn(p.w)) - 6}>{p.oznaka}</text>{/if}
      {/each}
      {#each crtez.oznake as o, i (i)}
        <text class="fd-vrij" x={sx(o.u) + (sx(o.u) > GW * 0.62 ? -7 : 7)} y={sy(yIn(o.w)) + (o.dolje ? 27 : sy(o.w) < GT + 20 ? 14 : -7)} text-anchor={sx(o.u) > GW * 0.62 ? "end" : "start"}>{@render svgTxt(o.z)}</text>
      {/each}
      {#if tockaIstr}
        <circle class="fd-tocka vuci" cx={sx(tockaIstr.u)} cy={sy(tockaIstr.w)} r="6.5" />
      {/if}
    </svg>
    <figcaption class="fd-osx"><i>{M.os.jx === "K" ? "T" : "t"}</i> / {M.os.jx}</figcaption>
  </figure>
{/snippet}

{#if istrazi}
  <div class="fd-tekst"><Md text={s.tekst} /></div>
  <p class="fd-hint">Ovo nije zadatak, samo istražuješ.</p>
{:else}
  <div class="lx-question"><Md text={s.tekst} /></div>
{/if}

<div class="fd">
  {#if M.greska}
    <p class="lx-solution">Dijagram se ne da nacrtati.</p>
  {:else}
    {#if istrazi && tvari && tvari.length > 1}
      <div class="fd-chips" role="radiogroup" aria-label="Tvar">
        {#each tvari as k, i (i)}
          <button type="button" role="radio" aria-checked={odabrana === i} class="fd-chip" class:sel={odabrana === i} onclick={() => odaberi(i)}>{#if DIJAGRAMI[k].tvar === "X"}tvar X ({DIJAGRAMI[k].izvor.match(/\d{4}\./)?.[0] ?? ""}){:else}<Formula f={DIJAGRAMI[k].tvar} />{/if}</button>
        {/each}
      </div>
    {/if}

    <div class="fd-stol">
      {@render graf()}

      {#if istrazi && istr}
        <div class="fd-panel">
          <div class="fd-ocit" aria-live="polite">
            {@render stanjeSlika(istr.stanje)}
            <div class="fd-ocit-t">
              {#if !M.shema}<div class="fd-koord"><span class="fd-nw"><i>{M.os.jx === "K" ? "T" : "t"}</i> = {sJ(zapisU(M, pu), M.os.jx)}</span> · <span class="fd-nw"><i>p</i> = <Formula f={sJ(zapisW(M, pw), M.os.jy)} /></span></div>{/if}
              {#if istr.stanje === "slg"}
                <div class="fd-stanje"><b>trojna točka</b>: sve tri faze su u ravnoteži</div>
              {:else if istr.krivulja}
                <div class="fd-stanje"><b>ravnoteža</b> {FAZA_IME[istr.stanje[0]]} <span class="fd-nw">⇌ {FAZA_IME[istr.stanje[1]]}</span></div>
                <div class="fd-mali">na krivulji {KRIVULJA_GEN[istr.krivulja].replace("krivulja ", "")}</div>
              {:else}
                <div class="fd-stanje"><b>{FAZA_IME[istr.faza]}</b> {@render ell(FAZA_ZNAK[istr.faza])}</div>
                {#if M.wT - pw > 1e-9}<div class="fd-mali">tlak je niži od tlaka trojne točke: tekućine nema</div>{/if}
              {/if}
            </div>
          </div>

          <div class="fd-seg" role="radiogroup" aria-label="Put">
            <button type="button" role="radio" aria-checked={put === "p"} class:sel={put === "p"} onclick={() => odaberiPut("p")}>stalni tlak</button>
            <button type="button" role="radio" aria-checked={put === "t"} class:sel={put === "t"} onclick={() => odaberiPut("t")}>stalna temperatura</button>
          </div>
          {#if crtaPuta}
            <div class="fd-gumbi">
              {#if put === "p"}
                <button type="button" class="btn btn-quiet fd-g" onclick={() => pokreni(-1)} disabled={animira}>◀ Hladi</button>
                <button type="button" class="btn btn-quiet fd-g" onclick={() => pokreni(1)} disabled={animira}>Grij ▶</button>
              {:else}
                <button type="button" class="btn btn-quiet fd-g" onclick={() => pokreni(-1)} disabled={animira}>▼ Smanji tlak</button>
                <button type="button" class="btn btn-quiet fd-g" onclick={() => pokreni(1)} disabled={animira}>Tlači ▲</button>
              {/if}
              {#if animira}<button type="button" class="btn btn-quiet fd-g" onclick={stani}>Stani</button>{/if}
            </div>
            <div class="fd-lista">
              <div class="fd-mali">{put === "p" ? "Grijanje pri ovom tlaku" : "Tlačenje pri ovoj temperaturi"}:</div>
              {#if crtaPuta.koraci.length}
                <ol>
                  {#each crtaPuta.koraci as k, i (i)}
                    <li><b>{PRIJELAZ_IME[k.prijelaz]}</b> <span class="fd-nw">{@render ell(znakPrijelaza(k.prijelaz))}</span> {#if !M.shema}pri <span class="fd-nw"><Formula f={put === "p" ? sJ(zapisU(M, k.u), M.os.jx) : sJ(zapisW(M, k.w), M.os.jy)} /></span>{/if}{#if k.trojna}, kroz trojnu točku{/if}<span class="fd-mali fd-blok">{ENDOTERMNO.includes(k.prijelaz) ? "toplina se troši (endotermno)" : "toplina se oslobađa (egzotermno)"}</span></li>
                  {/each}
                </ol>
              {:else}
                <p class="fd-mali">nema fazne promjene: cijelom crtom {FAZA_IME[crtaPuta.pocetna]}</p>
              {/if}
            </div>
          {/if}
          {#if D.napomena}<p class="fd-napomena">{D.napomena}</p>{/if}
        </div>
      {/if}
    </div>

    {#if nacin === "stanje"}
      <form class="fd-unosi" onsubmit={predaj}>
        {#each tocke as Q, i (i)}
          <div class="fd-kartica" class:ok={okK(i)} class:bad={badK(i)} role="radiogroup" aria-label="Stanje {oznakaTocke(Q, i)}">
            <span class="fd-glava">{@render tx(oznakaTocke(Q, i))}</span>
            <div class="fd-izbor">
              {#each RED1 as st (st)}
                <button type="button" role="radio" aria-checked={stanja[i] === st} class:sel={stanja[i] === st} disabled={!aktivno} onclick={() => (stanja[i] = st)}><b>{@render ell(FAZA_ZNAK[st])}</b><span>{FAZA_IME[st]}</span></button>
              {/each}
              {#if !s.samo_faze}
                {#each RED2 as st (st)}
                  <button type="button" role="radio" aria-checked={stanja[i] === st} class:sel={stanja[i] === st} disabled={!aktivno} onclick={() => (stanja[i] = st)}><b>{@render ell(`${FAZA_ZNAK[st[0]]} ⇌ ${FAZA_ZNAK[st[1]]}`)}</b><span>ravnoteža</span></button>
                {/each}
                <button type="button" role="radio" class="fd-sve" aria-checked={stanja[i] === "slg"} class:sel={stanja[i] === "slg"} disabled={!aktivno} onclick={() => (stanja[i] = "slg")}><b>{@render ell("(s) ⇌ (ℓ) ⇌ (g)")}</b><span>sve tri faze u ravnoteži</span></button>
              {/if}
            </div>
            {#if rijeseno}<div class="fd-rj">{@render stanjeSlika(tocnaStanja[i])}<span>{@render tx(stanjeIme(tocnaStanja[i]))}</span></div>{/if}
          </div>
        {/each}
        <div class="fd-akcija"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpun}>Provjeri</button></div>
      </form>
    {/if}

    {#if nacin === "ocitaj"}
      <form class="fd-unosi" onsubmit={predaj}>
        {#each polja as q, j (j)}
          {@const g = glavaPolja(q)}
          <div class="fd-kartica" class:ok={okK(j)} class:bad={badK(j)}>
            <label class="fd-glava" for="fd-{uid}-o{j}"><span class="fd-sym"><i>{g.sym}</i></span><span class="fd-ime">{@render tx(g.ime)}</span></label>
            <span class="fd-polje">
              <input id="fd-{uid}-o{j}" class="inp fd-inp" class:ok={okK(j)} class:bad={badK(j)} inputmode={M.log && g.sym === "p" ? "text" : "decimal"} autocomplete="off" placeholder="?" disabled={!aktivno} bind:value={unosiO[j]} />
              <span class="lx-unit">{g.jed}</span>
            </span>
          </div>
        {/each}
        <div class="fd-akcija"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpun}>Provjeri</button></div>
      </form>
    {/if}

    {#if nacin === "put" && P && !P.greska}
      <form class="fd-unosi" onsubmit={predaj}>
        <div class="fd-opis">{@render tx(opisPuta(M, P))}</div>
        {#if izravno}
          <div class="fd-kartica" class:ok={okK(0)} class:bad={badK(0)} role="radiogroup" aria-label="Fazna promjena">
            <span class="fd-glava">Koja se fazna promjena odvija?</span>
            <div class="fd-prijelazi">
              {#each SVI as k (k)}
                <button type="button" role="radio" aria-checked={niz[0] === k} class:sel={niz[0] === k} disabled={!aktivno} onclick={() => dodaj(k)}><b>{@render ell(znakPrijelaza(k))}</b><span>{PRIJELAZ_IME[k]}</span></button>
              {/each}
            </div>
          </div>
        {:else}
          <div class="fd-kartica" class:ok={okK(0)} class:bad={badK(0)}>
            <span class="fd-glava">Fazne promjene redom</span>
            {#if niz.length}
              <ol class="fd-niz">
                {#each niz as k, i (i)}
                  <li class:ok={vrijednosti && okK(1 + i)} class:bad={vrijednosti && badK(1 + i)}>
                    <span class="fd-niz-ime"><b>{PRIJELAZ_IME[k]}</b> <span class="fd-nw">{@render ell(znakPrijelaza(k))}</span></span>
                    {#if vrijednosti}
                      <span class="fd-polje">
                        <span class="fd-mali">pri</span>
                        <input class="inp fd-inp fd-inp-s" class:ok={okK(1 + i)} class:bad={badK(1 + i)} inputmode="decimal" autocomplete="off" placeholder="?" aria-label="{P.vrsta === 'izobara' ? 'temperatura' : 'tlak'} za {PRIJELAZ_IME[k]}" disabled={!aktivno} bind:value={vr[i]} />
                        <span class="lx-unit">{jedinicaKoraka(M, P)}</span>
                      </span>
                    {/if}
                    {#if aktivno}<button type="button" class="fd-makni" aria-label="Makni {PRIJELAZ_IME[k]}" onclick={() => makni(i)}>×</button>{/if}
                  </li>
                {/each}
              </ol>
            {:else}
              <p class="fd-mali fd-prazno">Dodaj promjene redom kojim se događaju na putu.</p>
            {/if}
            {#if aktivno}
              <div class="fd-prijelazi">
                {#each SVI as k (k)}
                  <button type="button" disabled={niz.length >= 3} onclick={() => dodaj(k)}><b>{@render ell(znakPrijelaza(k))}</b><span>{PRIJELAZ_IME[k]}</span></button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
        <div class="fd-akcija"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpun}>Provjeri</button></div>
      </form>
    {/if}

    {#if nacin === "uvjeti"}
      <form class="fd-unosi" onsubmit={predaj}>
        <div class="fd-kartica" class:ok={okK(0)} class:bad={badK(0)} role="radiogroup" aria-label="Put">
          <span class="fd-glava"><span>Koji put? ({PRIJELAZ_IME[s.prijelaz]}, <span class="fd-nw">{@render ell(znakPrijelaza(s.prijelaz))}</span>)</span></span>
          <div class="fd-putevi">
            {#each putevi as r, i (i)}
              <button type="button" role="radio" aria-checked={izabran === i} class:sel={izabran === i} disabled={!aktivno} onclick={() => (izabran = i)}><b>{SLOVA[i]}</b><span>{@render tx(r.opis ?? opisPuta(M, r))}</span></button>
            {/each}
          </div>
        </div>
        <div class="fd-akcija"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpun}>Provjeri</button></div>
      </form>
    {/if}
  {/if}
</div>

{#if tocanTekst}
  <p class="fd-tocno">Točan odgovor: {@render tx(tocanTekst)}</p>
{/if}

<style>
  .fd {
    display: grid;
    gap: 12px;
    min-width: 0;
    font-family: var(--font-sans);
  }
  .fd-tekst {
    margin-bottom: 6px;
  }
  .fd-hint {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .fd-nw {
    white-space: nowrap;
  }
  .fd-mali {
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .fd-blok {
    display: block;
  }
  /* ℓ (tekuće) nema u svakom fontu: serifni font da zamjenski znak ne bude razmaknut */
  .fd-ell {
    font-family: "Times New Roman", "STIX Two Text", "Cambria Math", serif;
    font-style: italic;
    font-size: 1.08em;
    padding: 0 0.04em;
  }

  .fd-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .fd-chip {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    color: var(--text);
    font-size: 14px;
    cursor: pointer;
  }
  .fd-chip:hover {
    border-color: var(--border-strong);
    background: var(--bg-hover);
  }
  .fd-chip.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }

  .fd-stol {
    display: grid;
    gap: 12px;
  }
  @media (min-width: 720px) {
    .fd-stol:has(.fd-panel) {
      grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
      align-items: start;
    }
  }
  .fd-graf {
    margin: 0;
    max-width: 480px;
    width: 100%;
  }
  .fd-graf svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    outline: none;
  }
  .fd-graf svg.vuci {
    touch-action: none;
    cursor: crosshair;
  }
  .fd-graf svg.vuci:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
  .fd-osy {
    font-size: 12px;
    color: var(--text-dim);
    margin: 0 0 -2px 6px;
  }
  .fd-osx {
    margin-top: -2px;
    padding-right: 8px;
    text-align: right;
    font-size: 12px;
    color: var(--text-dim);
  }
  .fd-fino {
    stroke: var(--border);
    stroke-width: 0.4;
    opacity: 0.7;
  }
  .fd-mreza {
    stroke: var(--border-strong);
    stroke-width: 0.8;
  }
  .fd-os {
    stroke: var(--text-dim);
    stroke-width: 1;
  }
  .fd-tick {
    fill: var(--text-faint);
    font: 10px var(--font-sans);
  }
  .fd-krivulja {
    fill: none;
    stroke: var(--text);
    stroke-width: 2.2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .fd-trojna {
    fill: var(--text);
  }
  .fd-ime-t {
    fill: var(--text);
    font: 600 12px var(--font-sans);
  }
  .fd-ime-kr {
    fill: var(--text-dim);
    font: italic 10px var(--font-sans);
  }
  /* područja: čvrsto sivo (led), tekuće plavo (voda), plin žuto */
  .fd-pod.s {
    fill: color-mix(in srgb, var(--text-dim) 15%, transparent);
  }
  .fd-pod.l {
    fill: color-mix(in srgb, var(--lx-water) 17%, transparent);
  }
  .fd-pod.g {
    fill: color-mix(in srgb, var(--warn) 11%, transparent);
  }
  .fd-ime-pod {
    font: 600 12px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .fd-ime-pod.s {
    fill: var(--text-dim);
  }
  .fd-ime-pod.l {
    fill: var(--lx-water);
  }
  .fd-ime-pod.g {
    fill: var(--warn);
  }
  .fd-vodic {
    fill: none;
    stroke: var(--primary);
    stroke-width: 1.1;
    stroke-dasharray: 3 3;
  }
  .fd-crta-puta {
    stroke: var(--primary);
    stroke-width: 1.4;
    stroke-dasharray: 5 4;
  }
  .fd-presjek {
    fill: var(--bg-elev);
    stroke: var(--primary);
    stroke-width: 2;
  }
  .fd-put {
    stroke-width: 2.2;
    stroke-linecap: round;
  }
  .fd-put.put {
    stroke: var(--primary);
  }
  .fd-put.drugi {
    stroke: var(--text-faint);
    stroke-dasharray: 4 3;
  }
  .fd-vrh {
    fill: var(--primary);
  }
  .fd-vrh2 {
    fill: var(--text-faint);
  }
  .fd-put-poc {
    fill: var(--bg-elev);
    stroke-width: 2;
  }
  .fd-put-poc.put {
    stroke: var(--primary);
  }
  .fd-put-poc.drugi {
    stroke: var(--text-faint);
  }
  .fd-slovo {
    fill: var(--text);
    font: 700 11px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .fd-slovo.put {
    fill: var(--primary);
  }
  .fd-vrij {
    fill: var(--primary);
    font: 600 10.5px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .fd-tocka {
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .fd-tocka.zadana {
    fill: var(--primary);
  }
  .fd-tocka.ok {
    fill: var(--lx-ok);
  }
  .fd-tocka.vuci {
    fill: var(--primary);
    stroke-width: 2.5;
    cursor: grab;
  }

  /* ploča istraživanja */
  .fd-panel {
    display: grid;
    gap: 10px;
    align-content: start;
    min-width: 0;
  }
  .fd-ocit {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    min-width: 0;
  }
  .fd-ocit-t {
    display: grid;
    gap: 3px;
    min-width: 0;
    font-size: 14px;
    color: var(--text);
  }
  .fd-koord {
    font-size: 13px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .fd-stanje b {
    font-weight: 700;
  }
  .fd-slika {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: none;
  }
  .fd-rav {
    color: var(--text-dim);
    font-size: 13px;
  }
  .fd-cest {
    width: 52px;
    height: 52px;
    display: block;
  }
  .fd-cest.mali {
    width: 34px;
    height: 34px;
  }
  .fd-kutija {
    fill: var(--bg);
    stroke: var(--border-strong);
    stroke-width: 1.2;
  }
  .fd-c.s {
    fill: var(--text-dim);
  }
  .fd-c.l {
    fill: var(--lx-water);
  }
  .fd-c.g {
    fill: var(--warn);
  }
  .fd-seg {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .fd-seg button {
    min-height: 40px;
    padding: 0 6px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text);
    font: 500 13.5px var(--font-sans);
    cursor: pointer;
  }
  .fd-seg button.sel {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 12%, var(--bg-elev));
    font-weight: 600;
  }
  .fd-gumbi {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .fd-g {
    min-height: 40px;
    border: 1px solid var(--border);
    background: var(--bg-elev);
    font-size: 13.5px;
  }
  .fd-lista {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    font-size: 13.5px;
    color: var(--text);
  }
  .fd-lista ol {
    margin: 4px 0 0;
    padding-left: 20px;
    display: grid;
    gap: 4px;
  }
  .fd-lista p {
    margin: 4px 0 0;
  }
  .fd-napomena {
    margin: 0;
    font-size: 12.5px;
    color: var(--text-dim);
  }

  /* unosi */
  .fd-unosi {
    display: grid;
    gap: 8px;
    max-width: 440px;
  }
  .fd-opis {
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    font-size: 13.5px;
    color: var(--text);
    justify-self: start;
  }
  .fd-kartica {
    display: grid;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    min-width: 0;
  }
  .fd-kartica.ok {
    border-color: var(--lx-ok);
  }
  .fd-kartica.bad {
    border-color: var(--lx-bad);
  }
  .fd-glava {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 8px;
    font-size: 14px;
    color: var(--text);
  }
  .fd-sym {
    font-weight: 700;
    font-size: 16px;
    color: var(--text);
  }
  .fd-ime {
    font-size: 12.5px;
    color: var(--text-faint);
  }
  .fd-polje {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .fd-inp {
    width: 100%;
    max-width: 140px;
    min-width: 0;
    height: var(--lx-control);
    padding: 6px 8px;
    text-align: right;
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
  }
  .fd-inp-s {
    max-width: 92px;
  }
  .fd-polje .lx-unit {
    white-space: nowrap;
  }
  .fd-izbor,
  .fd-prijelazi {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
  .fd-prijelazi {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .fd-izbor button,
  .fd-prijelazi button,
  .fd-putevi button {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 1px;
    min-height: 48px;
    padding: 4px 4px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text);
    font: 500 13px var(--font-sans);
    text-align: center;
    cursor: pointer;
    min-width: 0;
  }
  .fd-izbor button b,
  .fd-prijelazi button b {
    font-weight: 600;
    white-space: nowrap;
    font-size: 13px;
  }
  .fd-izbor button span,
  .fd-prijelazi button span {
    font-size: 11.5px;
    color: var(--text-dim);
    line-height: 1.2;
  }
  .fd-izbor .fd-sve {
    grid-column: 1 / -1;
  }
  :is(.fd-izbor, .fd-prijelazi, .fd-putevi) button.sel {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 12%, var(--bg-elev));
  }
  :is(.fd-izbor, .fd-prijelazi, .fd-putevi) button:disabled {
    cursor: default;
  }
  .fd-prijelazi button:disabled:not(.sel) {
    opacity: 0.5;
  }
  .fd-putevi {
    display: grid;
    gap: 6px;
  }
  .fd-putevi button {
    grid-template-columns: 22px minmax(0, 1fr);
    justify-items: start;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    text-align: left;
    font-size: 13.5px;
  }
  .fd-putevi button b {
    font-weight: 700;
  }
  .fd-niz {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 6px;
    counter-reset: korak;
  }
  .fd-niz li {
    counter-increment: korak;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    font-size: 13.5px;
  }
  .fd-niz li::before {
    content: counter(korak) ".";
    color: var(--text-faint);
    font-weight: 600;
  }
  .fd-niz li.ok {
    border-color: var(--lx-ok);
  }
  .fd-niz li.bad {
    border-color: var(--lx-bad);
  }
  .fd-niz-ime {
    flex: 1 1 auto;
    min-width: 0;
  }
  .fd-makni {
    margin-left: auto;
    width: 32px;
    height: 32px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    color: var(--text-dim);
    font-size: 17px;
    line-height: 1;
    cursor: pointer;
  }
  .fd-prazno {
    margin: 0;
  }
  .fd-rj {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13.5px;
    color: var(--text);
  }
  .fd-akcija {
    margin-top: 6px;
  }
  .fd-akcija .btn-primary {
    height: var(--lx-control);
    padding: 0 16px;
    font-size: 14px;
    border-radius: var(--r-md);
  }
  .fd-tocno {
    margin: 10px 0 0;
    font-size: 14px;
    color: var(--text-dim);
  }
</style>
