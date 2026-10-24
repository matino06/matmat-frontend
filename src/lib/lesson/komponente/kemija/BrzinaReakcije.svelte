<script>
  // brzina_reakcije: graf c–t s intervalom (sekanta, tangenta), jednadžba iz grafa, model sudara s raspodjelom energije
  // čestica i pokus 17 (tiosulfat + kiselina, znak X nestaje). Sav račun je u katalog/kemija/brzina_reakcije.js; ovdje je
  // samo prikaz. U „Tvoj red“ graf ne ispisuje vrijednosti s krivulja, formule na strelicama lanca vide se samo uz
  // operacije: true ili nakon provjere, a uloge tvari nemaju boje dok učenik ne provjeri. Boje krivulja idu redom tvari,
  // ne po ulozi. Animacije (čestice, zaporni sat) uz prefers-reduced-motion odmah pokazuju stanje.
  import { untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import Formula from "./Formula.svelte";
  import { formatNumber } from "$lib/lesson/core/number.js";
  import {
    brzina_reakcije,
    modelOf,
    modelZaLanac,
    lanacOf,
    lanacOmjera,
    prekoOd,
    izGrafaOf,
    pitaStrelicu,
    zapisBroja,
    zapisBrzine,
    zapisT,
    jedinicaBrzine,
    vOznaka,
    prikazOf,
    klizaciSudara,
    PROMJENE,
    RAZLOZI,
    SMJER_NAZIV,
    razloziOd,
    pitaUtjecaj,
    pokusOf,
    grafPokusaOf,
    omjerOf,
    zapisUvjeta,
    TEMPERATURE_POKUSA,
    udioUspjesnih,
    relativnaBrzina,
    raspodjela,
    kTslike,
    EA_SLIKA,
    lijepKorak,
  } from "$lib/lesson/katalog/kemija/brzina_reakcije.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  const s = untrack(() => spec);
  const nacin = s.nacin;
  const prikaz = prikazOf(s);
  const istrazi = nacin === "istrazi";
  const uid = Math.random().toString(36).slice(2, 8);
  const aktivno = $derived(!locked && !pokazi);
  const rijeseno = $derived(!!ishod?.tocno || pokazi);
  const tocanTekst = $derived(pokazi ? brzina_reakcije.tocanOdgovor(s) : "");

  // ── zajedničko: graf ──
  const GW = 340;
  const GH = 226;
  const GL = 42;
  const GR = 44;
  const GT = 12;
  const GB = 28;
  const PALETA = ["var(--primary)", "var(--lx-water)", "var(--warn)", "var(--text)", "var(--text-dim)"];
  const CRTE = ["", "7 4", "2 3", "9 3 2 3", "4 2"];
  const broj = (v) => formatNumber(Number(Number(v).toPrecision(6)));
  function mjerilo(G) {
    const sx = (x) => GL + ((x - G.x[0]) / (G.x[1] - G.x[0])) * (GW - GL - GR);
    const sy = (y) => GT + ((G.y[1] - y) / (G.y[1] - G.y[0])) * (GH - GT - GB);
    return { sx, sy };
  }
  function crtice(od, doo, korak) {
    const n = Math.floor((doo - od) / korak + 1e-6);
    const out = [];
    for (let i = 0; i <= n && i <= 40; i++) out.push(Number((od + i * korak).toPrecision(8)));
    return out;
  }
  // formula u SVG-u: indeksi i naboji kao tspan s pomakom (Unicode indeksi se loše vide)
  const SUBS = "₀₁₂₃₄₅₆₇₈₉";
  const SUPS = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "−" };
  function svgDijelovi(f) {
    const out = [];
    let pom = 0;
    for (const ch of String(f)) {
      const v = SUBS.includes(ch) ? 1 : ch in SUPS ? -1 : 0;
      const z = v === 1 ? String(SUBS.indexOf(ch)) : v === -1 ? SUPS[ch] : ch;
      const zad = out[out.length - 1];
      if (zad && zad.v === v) {
        zad.z += z;
        continue;
      }
      const cilj = v === 1 ? 3 : v === -1 ? -4 : 0;
      out.push({ v, z, dy: cilj - pom });
      pom = cilj;
    }
    return out;
  }
  // oznake na desnom kraju krivulja, razmaknute da se ne preklapaju
  function oznakeDesno(G, M) {
    const L = G.krivulje.filter((k) => k.oznaka && k.tocke.length).map((k) => ({ k, y: M.sy(k.tocke[k.tocke.length - 1][1]) }));
    L.sort((a, b) => a.y - b.y);
    for (let i = 1; i < L.length; i++) if (L[i].y - L[i - 1].y < 12) L[i].y = L[i - 1].y + 12;
    const dno = GH - GB - 2;
    for (let i = L.length - 1; i >= 0; i--) {
      if (L[i].y > dno - (L.length - 1 - i) * 12) L[i].y = dno - (L.length - 1 - i) * 12;
      if (i > 0 && L[i].y - L[i - 1].y < 12) L[i - 1].y = L[i].y - 12;
    }
    return L;
  }
  const uzorak = (x0, x1, f, n = 140) => Array.from({ length: n + 1 }, (_, i) => x0 + ((x1 - x0) * i) / n).map((x) => [x, f(x)]);
  const crta = (M, pts) => pts.filter(([, y]) => Number.isFinite(y)).map(([x, y]) => `${M.sx(x).toFixed(1)},${M.sy(y).toFixed(1)}`).join(" ");

  // ── graf c–t (istrazi graf, prosjecna, iz_grafa) ──
  const imaGrafCT = (prikaz === "graf" && istrazi) || nacin === "iz_grafa" || (nacin === "prosjecna" && !s.zadana_brzina);
  const m = imaGrafCT || (nacin === "prosjecna" && s.zadana_brzina) ? (s.zadana_brzina ? null : modelOf(s)) : null;
  const vrsteGrafa = m ? m.prikazane.map((f, i) => ({ f, boja: PALETA[i % PALETA.length], crta: CRTE[i % CRTE.length] })) : [];
  const bojaOd = (f) => vrsteGrafa.find((v) => v.f === f)?.boja ?? "var(--text)";
  const naslovY = m ? `${m.vel.simbol} / ${m.vel.jed}` : "";
  const naslovX = m ? `t / ${m.jt}` : "";
  function krivuljeCT(istaknuta = null) {
    return vrsteGrafa.map((v) => ({
      id: v.f,
      oznaka: v.f,
      boja: v.boja,
      crta: v.crta,
      debela: istaknuta === v.f,
      tanka: istaknuta != null && istaknuta !== v.f,
      tocke: m.tablica ? m.tablica.t.map((t, i) => [t, m.tablica.vrijednosti[v.f][i]]) : uzorak(m.os.x[0], m.os.x[1], (t) => m.c(v.f, t)),
      markeri: !!m.tablica,
    }));
  }

  // istraživanje grafa: interval, odabrana krivulja, tangenta
  const pocetniInterval = Array.isArray(s.interval) ? s.interval : m ? [m.os.x[0], m.os.x[0] + (m.os.x[1] - m.os.x[0]) / 3] : [0, 1];
  let t1 = $state(pocetniInterval[0]);
  let t2 = $state(pocetniInterval[1]);
  let odabrana = $state(m ? (m.prikazane.find((f) => m.nuOd(f) !== 0) ?? m.prikazane[0]) : null);
  let tangenta = $state(false);
  const korakT = m ? (m.tablica ? null : lijepKorak(m.os.x[1] - m.os.x[0], 60)) : 1;
  const tockeT = m?.tablica ? m.tablica.t : null;
  function postaviT(koji, v) {
    let x = Number(v);
    if (tockeT) x = tockeT.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
    if (koji === 1) {
      t1 = x;
      if (t2 <= t1) t2 = tockeT ? (tockeT.find((t) => t > t1) ?? t1) : Math.min(m.os.x[1], t1 + korakT);
      if (t2 <= t1) t1 = tockeT ? tockeT[tockeT.length - 2] : t2 - korakT;
    } else {
      t2 = x;
      if (t1 >= t2) t1 = tockeT ? ([...tockeT].reverse().find((t) => t < t2) ?? t2) : Math.max(m.os.x[0], t2 - korakT);
      if (t1 >= t2) t2 = tockeT ? tockeT[1] : t1 + korakT;
    }
  }
  const istr = $derived.by(() => {
    if (!(istrazi && m)) return null;
    const X = odabrana;
    const c1 = m.c(X, t1);
    const c2 = m.c(X, t2);
    const dcv = c2 - c1;
    const dt = t2 - t1;
    const nu = m.nuOd(X);
    const vX = nu === 0 ? 0 : (Math.sign(nu) * dcv) / dt;
    const v = nu === 0 ? 0 : vX / Math.abs(nu);
    const nagib = m.tablica ? null : m.dc(X, t1);
    return { X, c1, c2, dcv, dt, nu, vX, v, nagib };
  });
  const grafIstrazi = $derived.by(() => {
    if (!(istrazi && m)) return null;
    const G = { x: m.os.x, y: m.os.y, mreza: m.mreza, krivulje: krivuljeCT(odabrana), okomite: [{ x: t1 }, { x: t2 }], segmenti: [], tocke: [] };
    const X = istr.X;
    G.segmenti.push({ x1: t1, y1: istr.c1, x2: t2, y2: istr.c2, klasa: "sekanta" });
    G.tocke.push({ x: t1, y: istr.c1, boja: bojaOd(X) }, { x: t2, y: istr.c2, boja: bojaOd(X) });
    if (tangenta && istr.nagib != null) {
      const w = (m.os.x[1] - m.os.x[0]) / 4;
      G.segmenti.push({ x1: t1 - w, y1: istr.c1 - istr.nagib * w, x2: t1 + w, y2: istr.c1 + istr.nagib * w, klasa: "tangenta" });
    }
    G.oznakeX = [
      { x: t1, t: "t₁" },
      { x: t2, t: "t₂" },
    ];
    return G;
  });

  // ── prosječna brzina: lanac ──
  const mLanca = nacin === "prosjecna" ? modelZaLanac(s) : null;
  const lanacP = nacin === "prosjecna" ? lanacOf(s, mLanca) : [];
  const Xp = nacin === "prosjecna" && m ? prekoOd(s, m) : null;
  const grafProsjecne = $derived.by(() => {
    if (nacin !== "prosjecna" || !m || m.tablica) return null;
    const [a, b] = s.interval;
    const G = { x: m.os.x, y: m.os.y, mreza: m.mreza, krivulje: krivuljeCT(), okomite: [{ x: a }, { x: b }], segmenti: [], tocke: [] };
    G.oznakeX = [
      { x: a, t: "t₁" },
      { x: b, t: "t₂" },
    ];
    if (rijeseno) {
      G.tocke.push({ x: a, y: m.c(Xp, a), boja: bojaOd(Xp), oznaka: zapisBroja(m.c(Xp, a)) }, { x: b, y: m.c(Xp, b), boja: bojaOd(Xp), oznaka: zapisBroja(m.c(Xp, b)) });
      G.segmenti.push({ x1: a, y1: m.c(Xp, a), x2: b, y2: m.c(Xp, b), klasa: "sekanta" });
    }
    return G;
  });

  // ── iz grafa ──
  const ig = nacin === "iz_grafa" && m ? izGrafaOf(s, m) : null;
  let uloge = $state(ig ? ig.vrste.map(() => null) : []);
  let koefU = $state(ig ? ig.vrste.map(() => "") : []);
  let promjeneU = $state(ig ? ig.vrste.map(() => "") : []);
  let strelica = $state(null);
  const pitaS = nacin === "iz_grafa" && pitaStrelicu(s);
  const potpunIG = $derived(ig ? uloge.every((u) => u) && (!s.promjene || promjeneU.every((x) => String(x).trim())) && (!pitaS || strelica) : false);
  const jednadzbaUcenika = $derived.by(() => {
    if (!ig) return null;
    const v = ig.vrste.map((x, i) => ({ f: x.f, u: uloge[i], k: String(koefU[i] ?? "").trim() }));
    const L = v.filter((x) => x.u === "reaktant");
    const D = v.filter((x) => x.u === "produkt");
    if (!L.length && !D.length) return null;
    return { L, D };
  });
  const grafIG = $derived.by(() => {
    if (!ig) return null;
    return { x: m.os.x, y: m.os.y, mreza: m.mreza, krivulje: krivuljeCT(), okomite: [], segmenti: [], tocke: [] };
  });
  $effect(() => {
    if (!pokazi || !ig) return;
    untrack(() => {
      uloge = ig.vrste.map((v) => v.uloga);
      koefU = ig.vrste.map((v) => (v.uloga === "ne" ? "" : String(v.koef)));
      promjeneU = ig.vrste.map((v) => zapisBroja(v.dc));
      strelica = ig.strelica;
    });
  });
  const losePolje = (i, sto) => ishod && !ishod.tocno && !ishod.prazno && ishod.polje && ishod.polje.sto === sto && (ishod.polje.vrsta == null || ishod.polje.vrsta === i);
  function predajIG(e) {
    e.preventDefault();
    if (!aktivno || !potpunIG) return;
    onodgovor({ promjene: $state.snapshot(promjeneU), uloge: $state.snapshot(uloge), koef: $state.snapshot(koefU), strelica });
  }

  // ── lanac (prosjecna, omjer) ──
  const pm = prikaz === "pokus" || nacin === "omjer" ? pokusOf(s) : null;
  const om = nacin === "omjer" ? omjerOf(s, pm) : null;
  const lanacO = nacin === "omjer" ? lanacOmjera(s, pm) : [];
  const koraci = nacin === "prosjecna" ? lanacP : lanacO;
  let unosi = $state(koraci.map(() => ""));
  const potpun = $derived(unosi.every((v) => String(v).trim()));
  const okKorak = (i) => !!ishod?.tocno || (ishod != null && ishod.praznina != null && ishod.praznina > i);
  const badKorak = (i) => ishod != null && !ishod.tocno && ishod.praznina === i && !ishod.prazno;
  const jePotencija = (k) => /⁻¹$/.test(k.jed) || (k.citanje && Math.abs(k.vrijednost) < 0.01);
  function potencija(i) {
    const v = String(unosi[i]).trim();
    if (!/10\^/.test(v)) unosi[i] = `${v || "1"}·10^-`;
    document.getElementById(`br-${uid}-${i}`)?.focus();
  }
  function predajLanac(e) {
    e.preventDefault();
    if (aktivno && potpun) onodgovor({ koraci: $state.snapshot(unosi) });
  }
  $effect(() => {
    if (!pokazi || !koraci.length) return;
    untrack(() => {
      const L = nacin === "prosjecna" ? lanacOf(s, mLanca) : lanacOmjera(s, pm);
      unosi = L.map((k) => (k.id === "puta" ? formatNumber(Number(k.vrijednost.toPrecision(3))) : /⁻¹$/.test(k.jed) ? zapisBrzine(k.vrijednost).replace(/·10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/, (_, e) => `·10^${[...e].map((c) => ({ "⁻": "-" })[c] ?? "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)).join("")}`) : zapisBroja(k.vrijednost)));
    });
  });
  const primjerN = "2,5·10^-4";
  let sirinaLanca = $state(0);
  const vodoravno = $derived(sirinaLanca >= 200 * koraci.length);
  const prikaziOperacije = $derived(s.operacije === true || rijeseno);

  // ── utjecaj ──
  const P = nacin === "utjecaj" ? PROMJENE[s.promjena] : null;
  const pitajU = nacin === "utjecaj" ? pitaUtjecaj(s) : null;
  const razlozi = nacin === "utjecaj" ? razloziOd(s) : [];
  let smjerU = $state(null);
  let razlogU = $state(null);
  const potpunU = $derived(nacin === "utjecaj" && (pitajU === "razlog" || smjerU) && (pitajU === "smjer" || razlogU));
  $effect(() => {
    if (!pokazi || !P) return;
    untrack(() => {
      smjerU = P.smjer;
      razlogU = P.razlog;
    });
  });
  const energijska = P && ["temperatura_gore", "temperatura_dolje", "katalizator", "inhibitor"].includes(s.promjena);

  // ── omjer: graf t–ϑ ili t–c ──
  const grafOmjera = $derived.by(() => {
    if (nacin !== "omjer" || prikaz !== "graf") return null;
    const Gp = grafPokusaOf(s, pm);
    const G = { x: Gp.x, y: Gp.y, mreza: Gp.mreza, krivulje: [{ id: "t", boja: "var(--text)", crta: "", tocke: uzorak(Math.max(Gp.x[0], Gp.temp ? Gp.x[0] : (Gp.x[1] - Gp.x[0]) / 200 + Gp.x[0]), Gp.x[1], (x) => pm.t(x), 160) }], okomite: s.usporedi.map((x) => ({ x })), segmenti: [], tocke: [] };
    if (rijeseno) for (const x of s.usporedi) G.tocke.push({ x, y: pm.t(x), boja: "var(--primary)", oznaka: `${zapisBroja(pm.t(x))} s` });
    return G;
  });
  const naslovXP = pm ? (pm.mijenja === "temperatura" ? "ϑ / °C" : "c(Na₂S₂O₃) / mol/dm³") : "";

  // ── pokus 17 ──
  const temp = pm?.mijenja === "temperatura";
  const maxV = pm ? Math.max(1, Math.floor(pm.ot.ukupno - pm.ot.kiselina)) : 5;
  const volumeni = Array.from({ length: maxV }, (_, i) => i + 1);
  let izborT = $state(pm?.sobna ?? 20);
  let izborV = $state(1);
  const temperature = pm ? [pm.sobna, ...TEMPERATURE_POKUSA.filter((x) => x > pm.sobna)] : [];
  // epruvete: istraživanje ima jednu (uvjeti se biraju), omjer s pokusom dvije zadane
  function uvjetiZa(x) {
    if (temp) return { theta: x, V: 1, c: pm.cIzV(1) };
    const V = (x * pm.ot.ukupno) / pm.ot.c;
    return { theta: pm.sobna, V, c: x };
  }
  const pocetneEpruvete = pm ? (nacin === "omjer" ? s.usporedi.map((x) => ({ x, ...uvjetiZa(x) })) : [{ x: null }]) : [];
  let epruvete = $state(pocetneEpruvete.map((e) => ({ ...e, napredak: 0, radi: false, sat: 0, t: null })));
  let mjerenja = $state([]); // istraživanje: [{x, theta, V, c, t}]
  let prikazi1t = $state(false);
  const rafovi = []; // id-ovi requestAnimationFrame, za čišćenje
  function izaberi(koje, v) {
    if (epruvete[0].radi) return;
    if (koje === "T") izborT = v;
    else izborV = v;
    Object.assign(epruvete[0], { napredak: 0, sat: 0, t: null });
  }
  function pomijesaj(i) {
    if (!pm) return;
    const e = epruvete[i];
    if (e.radi) return;
    const u = nacin === "omjer" ? uvjetiZa(e.x) : temp ? uvjetiZa(izborT) : (() => {
      const c = pm.cIzV(izborV);
      return { theta: pm.sobna, V: izborV, c };
    })();
    const t = pm.vrijeme(u.theta, u.c);
    Object.assign(epruvete[i], { ...u, x: nacin === "omjer" ? e.x : temp ? izborT : u.c, t, napredak: 0, sat: 0, radi: true });
    const gotovo = () => {
      Object.assign(epruvete[i], { napredak: 1, sat: t, radi: false });
      if (istrazi) {
        const x = temp ? u.theta : u.c;
        mjerenja = [...mjerenja.filter((r) => Math.abs(r.x - x) > 1e-9), { x, theta: u.theta, V: u.V, c: u.c, t }].sort((a, b) => a.x - b.x);
      }
    };
    if (prefersReducedMotion.current) return gotovo();
    const trajanje = Math.max(1200, Math.min(4500, (t / 40) * 1000));
    const pocetak = performance.now();
    const korak = (sad) => {
      const p = Math.min(1, (sad - pocetak) / trajanje);
      epruvete[i].napredak = p;
      epruvete[i].sat = p * t;
      if (p < 1) {
        const id = requestAnimationFrame(korak);
        rafovi.push(id);
      } else gotovo();
    };
    rafovi.push(requestAnimationFrame(korak));
  }
  $effect(() => () => rafovi.forEach((id) => cancelAnimationFrame(id)));
  $effect(() => {
    if (!pokazi || nacin !== "omjer" || prikaz !== "pokus") return;
    untrack(() => epruvete.forEach((e, i) => !e.t && !e.radi && pomijesaj(i)));
  });
  const grafPokusa = $derived.by(() => {
    if (!(istrazi && prikaz === "pokus")) return null;
    const xk = temp ? 10 : lijepKorak(pm.cIzV(maxV) * 1.15, 6);
    const x = temp ? [10, 70] : [0, Math.ceil((pm.cIzV(maxV) * 1.1) / xk) * xk];
    const tmax = Math.max(pm.vrijeme(pm.sobna, pm.cIzV(1)), 10);
    const vrijednost = (r) => (prikazi1t ? 1000 / r.t : r.t);
    const najbrze = temp ? pm.vrijeme(Math.max(...temperature), pm.cIzV(1)) : pm.vrijeme(pm.sobna, pm.cIzV(maxV));
    const ymax = prikazi1t ? 1000 / najbrze : tmax;
    const yk = lijepKorak(ymax * 1.1, 5);
    const y = [0, Math.ceil((ymax * 1.08) / yk) * yk];
    const G = { x, y, mreza: [xk, yk], krivulje: [], okomite: [], segmenti: [], tocke: [] };
    if (mjerenja.length > 1) G.krivulje.push({ id: "m", boja: "var(--text-dim)", crta: "3 3", tocke: mjerenja.map((r) => [r.x, vrijednost(r)]) });
    for (const r of mjerenja) G.tocke.push({ x: r.x, y: vrijednost(r), boja: "var(--primary)" });
    return G;
  });

  // ── model sudara ──
  const klizaci = prikaz === "sudari" ? klizaciSudara(s) : [];
  const cvrsto = !!s.sudari?.cvrsto;
  let T = $state(20);
  let konc = $state(2);
  let kat = $state(false);
  let prah = $state(false);
  const udio = $derived(udioUspjesnih(T, kat));
  const relBrzina = $derived(relativnaBrzina({ T, c: konc / 2, kat, povrsina: cvrsto ? (prah ? 2.2 : 1) : 1 }));
  const SW = 300;
  const SH = 180;
  const RC = 6;
  let cesticeA = $state.raw([]);
  let cesticeB = $state.raw([]);
  let blijeskovi = $state([]);
  let brojSudara = $state(0);
  let brojUspjesnih = $state(0);
  const elA = [];
  const elB = [];
  function registriraj(node, [skup, i]) {
    (skup === "A" ? elA : elB)[i] = node;
    return { destroy: () => ((skup === "A" ? elA : elB)[i] = null) };
  }
  const brzinaOd = (Tc) => 95 * Math.sqrt((Tc + 273.15) / 293.15);
  function noviA(n, Tc) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const fi = Math.random() * Math.PI * 2;
      const v = brzinaOd(Tc) * (0.55 + Math.random() * 0.9);
      out.push({ x: 12 + Math.random() * (cvrsto ? SW * 0.3 : SW - 24), y: 12 + Math.random() * (SH - 24), vx: Math.cos(fi) * v, vy: Math.sin(fi) * v });
    }
    return out;
  }
  function noviB(Tc) {
    if (!cvrsto) return noviA(8, Tc).map((p) => ({ ...p, x: SW - 12 - Math.random() * (SW - 24) }));
    const out = [];
    const d = RC * 2 + 0.6;
    const blok = (cx, cy, n) => {
      for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) out.push({ x: cx + (k - (n - 1) / 2) * d, y: cy + (r - (n - 1) / 2) * d, vx: 0, vy: 0, fiks: true });
    };
    if (prah) {
      blok(170, 45, 2);
      blok(250, 50, 2);
      blok(190, 135, 2);
      blok(262, 130, 2);
    } else blok(225, 90, 4);
    return out;
  }
  // nove čestice kad se promijeni koncentracija ili oblik; brzine kad se promijeni temperatura
  $effect(() => {
    if (prikaz !== "sudari") return;
    const n = 4 * konc;
    const Tc = untrack(() => T);
    prah;
    untrack(() => {
      cesticeA = noviA(n, Tc);
      cesticeB = noviB(Tc);
    });
  });
  let zadnjiT = 20;
  $effect(() => {
    if (prikaz !== "sudari") return;
    const f = brzinaOd(T) / brzinaOd(zadnjiT);
    zadnjiT = T;
    untrack(() => {
      for (const p of [...cesticeA, ...cesticeB]) {
        p.vx *= f;
        p.vy *= f;
      }
    });
  });
  let povijest = [];
  function korakSudara(dt, sad) {
    const A = cesticeA;
    const B = cesticeB;
    const sve = [...A, ...B];
    for (const p of sve) {
      if (p.fiks) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < RC) (p.x = RC), (p.vx = Math.abs(p.vx));
      if (p.x > SW - RC) (p.x = SW - RC), (p.vx = -Math.abs(p.vx));
      if (p.y < RC) (p.y = RC), (p.vy = Math.abs(p.vy));
      if (p.y > SH - RC) (p.y = SH - RC), (p.vy = -Math.abs(p.vy));
    }
    const dmin = 2 * RC;
    for (let i = 0; i < sve.length; i++) {
      for (let j = i + 1; j < sve.length; j++) {
        const a = sve[i];
        const b = sve[j];
        if (a.fiks && b.fiks) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d >= dmin) continue;
        const nx = dx / d;
        const ny = dy / d;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (a.fiks || b.fiks) {
          const p = a.fiks ? b : a;
          const sgn = a.fiks ? 1 : -1;
          p.x += sgn * nx * (dmin - d);
          p.y += sgn * ny * (dmin - d);
          const vn = p.vx * nx + p.vy * ny;
          if (sgn * vn < 0) {
            p.vx -= 2 * vn * nx;
            p.vy -= 2 * vn * ny;
          }
        } else {
          const push = (dmin - d) / 2;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
          if (rel < 0) {
            a.vx += rel * nx;
            a.vy += rel * ny;
            b.vx -= rel * nx;
            b.vy -= rel * ny;
          }
        }
        // sudar reaktanata A i B (i < A.length ≤ j)
        if (i < A.length && j >= A.length && (rel < 0 || a.fiks || b.fiks)) {
          const uspjeh = Math.random() < udio;
          povijest.push({ t: sad, uspjeh });
          // svaki sudar kratko zatitra (blijedo), uspješni bljesne
          const id = `${sad}-${i}-${j}`;
          blijeskovi = [...blijeskovi.slice(-8), { id, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, uspjeh }];
          setTimeout(() => (blijeskovi = blijeskovi.filter((x) => x.id !== id)), uspjeh ? 800 : 400);
        }
      }
    }
  }
  function nacrtajSudare() {
    cesticeA.forEach((p, i) => elA[i]?.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`));
    cesticeB.forEach((p, i) => elB[i]?.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`));
  }
  $effect(() => {
    if (prikaz !== "sudari") return;
    cesticeA;
    cesticeB;
    if (prefersReducedMotion.current) {
      queueMicrotask(nacrtajSudare);
      return;
    }
    let id;
    let prije = performance.now();
    let zadnjeBrojanje = prije;
    const petlja = (sad) => {
      const dt = Math.min(0.05, (sad - prije) / 1000);
      prije = sad;
      korakSudara(dt, sad);
      nacrtajSudare();
      if (sad - zadnjeBrojanje > 500) {
        zadnjeBrojanje = sad;
        povijest = povijest.filter((x) => sad - x.t < 5000);
        brojSudara = povijest.length / 5;
        brojUspjesnih = povijest.filter((x) => x.uspjeh).length / 5;
      }
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  const zapisPosto = (x) => `${formatNumber(Number((x * 100).toPrecision(x < 0.1 ? 2 : 3)))} %`;

  // raspodjela energije (sudari i utjecaj)
  const RW = 300;
  const RH = 124;
  const RL = 10;
  const RB = 22;
  const EMAX = 1.9;
  const yRasp = raspodjela(kTslike(0) / 2, 0) * 1.08;
  const ex = (E) => RL + (E / EMAX) * (RW - RL - 10);
  const ey = (f) => RH - RB - (f / yRasp) * (RH - RB - 8);
  function putRaspodjele(Tc) {
    return Array.from({ length: 121 }, (_, i) => (EMAX * i) / 120)
      .map((E) => `${ex(E).toFixed(1)},${ey(raspodjela(E, Tc)).toFixed(1)}`)
      .join(" ");
  }
  function repRaspodjele(Tc, Ea) {
    const pts = Array.from({ length: 61 }, (_, i) => Ea + ((EMAX - Ea) * i) / 60);
    return `M${ex(Ea).toFixed(1)},${ey(0).toFixed(1)} ${pts.map((E) => `L${ex(E).toFixed(1)},${ey(raspodjela(E, Tc)).toFixed(1)}`).join(" ")} L${ex(EMAX).toFixed(1)},${ey(0).toFixed(1)} Z`;
  }
  // utjecaj: prije / poslije
  const utjecajE = P && energijska ? { T1: 20, T2: s.promjena === "temperatura_gore" ? 40 : s.promjena === "temperatura_dolje" ? 0 : 20, Ea1: 1, Ea2: s.promjena === "katalizator" ? EA_SLIKA.kat : s.promjena === "inhibitor" ? 1.2 : 1 } : null;

  let sirina = $state(0);
  const siroko = $derived(sirina >= 600);
</script>

{#snippet tekst(t)}{#each String(t).split(" ") as w, k (k)}{k ? " " : ""}{#if w.startsWith("v̄")}<span class="br-vbar">v</span><Formula f={w.slice(2)} />{:else}<Formula f={w} />{/if}{/each}{/snippet}

{#snippet oznaka(t)}{#if t.startsWith("v̄")}<span class="br-vbar">v</span><Formula f={t.slice(2)} />{:else}<Formula f={t} />{/if}{/snippet}

{#snippet svgFormula(f)}{#each svgDijelovi(f) as d, k (k)}<tspan dy={d.dy || null} font-size={d.v ? "0.72em" : null}>{d.z}</tspan>{/each}{/snippet}

{#snippet graf(G, naslovY, naslovX, opis)}
  {@const M = mjerilo(G)}
  {@const xs = crtice(G.x[0], G.x[1], G.mreza[0])}
  {@const ys = crtice(G.y[0], G.y[1], G.mreza[1])}
  {@const svakiX = xs.length > 9 ? 2 : 1}
  {@const svakiY = ys.length > 9 ? 2 : 1}
  <figure class="br-graf">
    <div class="br-osy"><Formula f={naslovY} /></div>
    <svg viewBox="0 0 {GW} {GH}" role="img" aria-label={opis}>
      <defs><clipPath id="br-{uid}-k"><rect x={GL} y={GT - 2} width={GW - GL - GR + 2} height={GH - GT - GB + 2} /></clipPath></defs>
      {#each xs as x, i (i)}
        <line class="br-mreza" x1={M.sx(x)} y1={GT} x2={M.sx(x)} y2={GH - GB} />
        {#if i % svakiX === 0}<text class="br-tick" x={M.sx(x)} y={GH - GB + 14} text-anchor="middle">{broj(x)}</text>{/if}
      {/each}
      {#each ys as y, i (i)}
        <line class="br-mreza" x1={GL} y1={M.sy(y)} x2={GW - GR} y2={M.sy(y)} />
        {#if i % svakiY === 0}<text class="br-tick" x={GL - 5} y={M.sy(y) + 3.5} text-anchor="end">{broj(y)}</text>{/if}
      {/each}
      <line class="br-os" x1={GL} y1={GT - 4} x2={GL} y2={GH - GB} />
      <line class="br-os" x1={GL} y1={GH - GB} x2={GW - GR + 4} y2={GH - GB} />
      {#each G.okomite as o, i (i)}
        <line class="br-vodic" x1={M.sx(o.x)} y1={GT} x2={M.sx(o.x)} y2={GH - GB} />
      {/each}
      {#each G.oznakeX ?? [] as o, i (i)}
        <text class="br-oznakaX" x={M.sx(o.x) + 3} y={GT + 9}>{@render svgFormula(o.t)}</text>
      {/each}
      <g clip-path="url(#br-{uid}-k)">
        {#each G.krivulje as k (k.id)}
          <polyline class="br-krivulja" class:debela={k.debela} class:tanka={k.tanka} points={crta(M, k.tocke)} style="stroke: {k.boja}" stroke-dasharray={k.crta || null} />
          {#if k.markeri}
            {#each k.tocke as [x, y], i (i)}<circle class="br-marker" cx={M.sx(x)} cy={M.sy(y)} r="3" style="fill: {k.boja}" />{/each}
          {/if}
        {/each}
        {#each G.segmenti as g, i (i)}
          <line class="br-crta {g.klasa}" x1={M.sx(g.x1)} y1={M.sy(g.y1)} x2={M.sx(g.x2)} y2={M.sy(g.y2)} />
        {/each}
      </g>
      {#each G.tocke as p, i (i)}
        <circle class="br-tocka" cx={M.sx(p.x)} cy={M.sy(p.y)} r="4.2" style="fill: {p.boja}" />
        {#if p.oznaka}<text class="br-lbl" x={M.sx(p.x) + 7} y={M.sy(p.y) - 7}>{p.oznaka}</text>{/if}
      {/each}
      {#each oznakeDesno(G, M) as o (o.k.id)}
        <text class="br-ime" x={GW - GR + 6} y={o.y + 4} style="fill: {o.k.boja}">{@render svgFormula(o.k.oznaka)}</text>
      {/each}
    </svg>
    <figcaption class="br-osx"><Formula f={naslovX} /></figcaption>
  </figure>
{/snippet}

{#snippet jednadzba(vrste, str)}
  <div class="br-eq" aria-label="Jednadžba reakcije">
    {#each vrste.filter((v) => v.strana === "L") as v, k (v.f)}
      <span class="br-par">{#if k}<span class="br-plus">+</span>{/if}{#if v.koef > 1}<span class="br-k">{v.koef}</span>{/if}<Formula f={v.f} /></span>
    {/each}
    {#each vrste.filter((v) => v.strana === "D") as v, k (v.f)}
      <span class="br-par"><span class={k ? "br-plus" : "br-str"}>{k ? "+" : str}</span>{#if v.koef > 1}<span class="br-k">{v.koef}</span>{/if}<Formula f={v.f} /></span>
    {/each}
  </div>
{/snippet}

{#snippet raspodjelaSlika(Tc, Ea, prije)}
  <figure class="br-rasp">
    <svg viewBox="0 0 {RW} {RH}" role="img" aria-label="Raspodjela energije čestica; osjenčani su sudari s energijom barem Ea">
      <path class="br-rep" d={repRaspodjele(Tc, Ea)} />
      {#if prije}<polyline class="br-rasp-prije" points={putRaspodjele(prije.T)} />{/if}
      <polyline class="br-rasp-k" points={putRaspodjele(Tc)} />
      <line class="br-os" x1={RL} y1={RH - RB} x2={RW - 4} y2={RH - RB} />
      <line class="br-os" x1={RL} y1={6} x2={RL} y2={RH - RB} />
      {#if prije && Math.abs(prije.Ea - Ea) > 1e-9}
        <line class="br-ea-prije" x1={ex(prije.Ea)} y1={14} x2={ex(prije.Ea)} y2={RH - RB} />
      {/if}
      <line class="br-ea" x1={ex(Ea)} y1={10} x2={ex(Ea)} y2={RH - RB} />
      <text class="br-ea-t" x={ex(Ea) + 4} y={20}>E<tspan dy="3" font-size="0.72em">a</tspan></text>
      <text class="br-tick" x={RW - 6} y={RH - 7} text-anchor="end">energija čestica →</text>
    </svg>
  </figure>
{/snippet}

{#snippet epruveta(e, naslov)}
  {@const zam = Math.min(1, Math.pow(e.napredak, 1.6))}
  <figure class="br-ep">
    <svg viewBox="0 0 170 120" role="img" aria-label="Epruveta i znak X gledan odozgo kroz otopinu{e.napredak >= 1 ? ': znak X se više ne vidi' : ''}">
      <defs>
        <clipPath id="br-{uid}-ep{naslov ?? ''}"><path d="M20 22 V96 a12 12 0 0 0 24 0 V22 Z" /></clipPath>
        <clipPath id="br-{uid}-ok{naslov ?? ''}"><circle cx="118" cy="62" r="36" /></clipPath>
      </defs>
      <!-- epruveta sa strane -->
      <g clip-path="url(#br-{uid}-ep{naslov ?? ''})">
        <rect class="br-otopina" x="18" y="40" width="30" height="80" />
        <rect class="br-sumpor" x="18" y="40" width="30" height="80" style="opacity: {0.92 * zam}" />
      </g>
      <path class="br-staklo" d="M16 16 H20 V96 a12 12 0 0 0 24 0 V16 H48" />
      <!-- pogled odozgo -->
      <circle class="br-papir" cx="118" cy="62" r="36" />
      <g clip-path="url(#br-{uid}-ok{naslov ?? ''})">
        <path class="br-x" d="M100 44 L136 80 M136 44 L100 80" />
        <circle class="br-sumpor" cx="118" cy="62" r="36" style="opacity: {0.97 * zam}" />
      </g>
      <circle class="br-rub" cx="118" cy="62" r="36" />
      <text class="br-tick" x="118" y="114" text-anchor="middle">odozgo kroz otopinu</text>
    </svg>
    <div class="br-sat" aria-live="polite"><span class="br-sat-n">zaporni sat</span> <b>{e.t != null ? `${Math.round(e.sat)} s` : "0 s"}</b>{#if e.napredak >= 1}<span class="br-sat-k">X se ne vidi</span>{/if}</div>
  </figure>
{/snippet}

{#snippet lanac(koraci)}
  <form onsubmit={predajLanac} bind:clientWidth={sirinaLanca}>
    <div class="br-lanac" class:vodoravno>
      {#each koraci as k, i (k.id)}
        {#if i > 0}
          <div class="br-strelica" aria-hidden="true">
            <span class="br-str-r">→</span><span class="br-str-d">↓</span>
            {#if prikaziOperacije && k.formula && !k.citanje}<span class="br-op">{@render tekst(k.formula)}</span>{/if}
          </div>
        {/if}
        <div class="br-kartica" class:ok={okKorak(i)} class:bad={badKorak(i)}>
          <div class="br-glava">
            {#if k.id === "puta"}
              <span class="br-sym">Koliko puta?</span>
            {:else}
              <span class="br-sym">{@render oznaka(k.oznaka)}</span>
              {#if k.citanje}<span class="br-pri">pri <Formula f={nacin === "omjer" ? zapisUvjeta(pm, k.pri) : `t = ${zapisT(k.pri)} ${m.jt}`} /></span>{/if}
            {/if}
          </div>
          <div class="br-unos">
            <input
              id="br-{uid}-{i}"
              class="inp br-inp"
              class:ok={okKorak(i)}
              class:bad={badKorak(i)}
              inputmode="decimal"
              autocomplete="off"
              aria-label={k.id === "puta" ? "Koliko puta" : `${k.oznaka}${k.citanje ? ` pri ${k.pri}` : ""} u ${k.jed}`}
              placeholder="?"
              disabled={!aktivno}
              bind:value={unosi[i]}
            />
            <span class="lx-unit br-jed">{#if k.id === "puta"}puta{:else}<Formula f={k.jed} />{/if}</span>
          </div>
          {#if jePotencija(k) && aktivno}
            <div class="br-pot">
              <button type="button" class="btn btn-quiet" onclick={() => potencija(i)} aria-label="Dodaj potenciju broja 10">·10ⁿ</button>
              <span>npr. {primjerN}</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>
    <div class="lx-actions"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpun}>Provjeri</button></div>
  </form>
{/snippet}

{#if s.tekst}
  {#if istrazi}<div class="br-tekst"><Md text={s.tekst} /></div>{:else}<div class="lx-question"><Md text={s.tekst} /></div>{/if}
{/if}
{#if istrazi}<p class="br-hint">{#if prikaz === "pokus"}Pomiješaj i mjeri{:else if prikaz === "sudari"}Mijenjaj uvjete{:else}Pomiči <Formula f="t₁" /> i <Formula f="t₂" />{/if} – ovo nije zadatak, samo istražuješ.</p>{/if}

<div class="br" bind:clientWidth={sirina}>
  <!-- ── istraživanje grafa ── -->
  {#if istrazi && prikaz === "graf" && m}
    {@render jednadzba(m.R.vrste, m.povratna ? "⇌" : "→")}
    <div class="br-cipovi" role="group" aria-label="Krivulja za računanje">
      {#each vrsteGrafa as v (v.f)}
        <button type="button" class="br-cip" class:sel={odabrana === v.f} aria-pressed={odabrana === v.f} onclick={() => (odabrana = v.f)}>
          <span class="br-crtica" style="border-color: {v.boja}; border-top-style: {v.crta ? 'dashed' : 'solid'}"></span><Formula f={v.f} />
        </button>
      {/each}
    </div>
    <div class="br-stol" class:siroko>
      {@render graf(grafIstrazi, naslovY, naslovX, `Graf ${m.vel.naziv} o vremenu za ${m.prikazane.join(", ")}`)}
      <div class="br-panel">
        <label class="br-kl">
          <span class="br-kl-n"><Formula f="t₁" /> = <b>{zapisT(t1)} {m.jt}</b></span>
          <input type="range" min={m.os.x[0]} max={m.os.x[1]} step={korakT ?? "any"} value={t1} oninput={(e) => postaviT(1, e.currentTarget.value)} aria-label="Početak intervala t₁" />
        </label>
        <label class="br-kl">
          <span class="br-kl-n"><Formula f="t₂" /> = <b>{zapisT(t2)} {m.jt}</b></span>
          <input type="range" min={m.os.x[0]} max={m.os.x[1]} step={korakT ?? "any"} value={t2} oninput={(e) => postaviT(2, e.currentTarget.value)} aria-label="Kraj intervala t₂" />
        </label>
        <div class="br-ocit" aria-live="polite">
          <div><Formula f={`${m.vel.simbol}₁ = ${zapisBroja(istr.c1)} ${m.vel.jed}`} />, <Formula f={`${m.vel.simbol}₂ = ${zapisBroja(istr.c2)} ${m.vel.jed}`} /></div>
          <div><Formula f={`Δ${m.vel.simbol}(${istr.X}) = ${istr.dcv > 0 ? "+" : ""}${zapisBroja(istr.dcv)} ${m.vel.jed}`} />, Δt = {zapisT(istr.dt)} {m.jt}</div>
          {#if istr.nu === 0}
            <div class="br-napomena"><Formula f={istr.X} /> ne sudjeluje u reakciji: krivulja je vodoravna.</div>
          {:else}
            <div class="br-v">
              <span class="br-vbar">v</span>(<Formula f={istr.X} />) = {istr.nu < 0 ? "−" : ""}Δ{m.vel.simbol} : Δt = <b><Formula f={`${zapisBrzine(istr.vX)} ${jedinicaBrzine(m)}`} /></b>
            </div>
            <div class="br-v">
              <span class="br-vbar">v</span> = <span class="br-vbar">v</span>(<Formula f={istr.X} />) : {Math.abs(istr.nu)} = <b><Formula f={`${zapisBrzine(istr.v)} ${jedinicaBrzine(m)}`} /></b>
            </div>
          {/if}
          {#if tangenta && istr.nagib != null && istr.nu !== 0}
            <div class="br-v br-tang">trenutna brzina u <Formula f="t₁" /> (tangenta): <b><Formula f={`${zapisBrzine(Math.abs(istr.nagib))} ${jedinicaBrzine(m)}`} /></b></div>
          {/if}
        </div>
        {#if s.tangenta && !m.tablica}
          <button type="button" class="btn btn-quiet br-g" aria-pressed={tangenta} onclick={() => (tangenta = !tangenta)}>{#if tangenta}Sakrij tangentu{:else}Tangenta u <Formula f="t₁" />{/if}</button>
        {/if}
        <p class="br-napomena">Što je krivulja na intervalu strmija, to je prosječna brzina veća.</p>
      </div>
    </div>
  {/if}

  <!-- ── model sudara ── -->
  {#if prikaz === "sudari"}
    <div class="br-stol" class:siroko>
      <figure class="br-posuda">
        <svg viewBox="0 0 {SW} {SH}" role="img" aria-label="Čestice reaktanata u posudi; bljesak označava uspješan sudar">
          <rect class="br-posuda-r" x="0.5" y="0.5" width={SW - 1} height={SH - 1} rx="8" />
          {#each cesticeB as p, i (i)}
            <g use:registriraj={["B", i]} transform="translate({p.x} {p.y})">
              {#if p.fiks}<rect class="br-cB cvrsto" x={-RC} y={-RC} width={RC * 2} height={RC * 2} rx="1.5" />{:else}<circle class="br-cB" r={RC} />{/if}
            </g>
          {/each}
          {#each cesticeA as p, i (i)}
            <g use:registriraj={["A", i]} transform="translate({p.x} {p.y})"><circle class="br-cA" r={RC} /></g>
          {/each}
          {#each blijeskovi as b (b.id)}
            <circle class="br-blijesak" class:slab={!b.uspjeh} cx={b.x} cy={b.y} r={b.uspjeh ? 10 : 7} />
          {/each}
          {#if kat}<rect class="br-kat" x="8" y={SH - 18} width="44" height="10" rx="3" /><text class="br-tick" x="56" y={SH - 10}>katalizator</text>{/if}
        </svg>
        <figcaption class="br-legenda">
          <span><span class="br-l br-lA"></span> reaktant A</span>
          <span><span class="br-l br-lB" class:cvrsto></span> reaktant B{cvrsto ? " (čvrsti)" : ""}</span>
          <span><span class="br-l br-lS"></span> sudar</span>
          <span><span class="br-l br-lX"></span> uspješan sudar</span>
        </figcaption>
      </figure>
      <div class="br-panel">
        {#if klizaci.includes("temperatura")}
          <label class="br-kl">
            <span class="br-kl-n">temperatura <b>{T} °C</b></span>
            <input type="range" min="0" max="80" step="10" bind:value={T} aria-label="Temperatura" aria-valuetext="{T} °C" />
          </label>
        {/if}
        {#if klizaci.includes("koncentracija")}
          <label class="br-kl">
            <span class="br-kl-n">koncentracija A <b>{["", "mala", "srednja", "velika"][konc]}</b></span>
            <input type="range" min="1" max="3" step="1" bind:value={konc} aria-label="Koncentracija reaktanta A" aria-valuetext={["", "mala", "srednja", "velika"][konc]} />
          </label>
        {/if}
        <div class="br-prekidaci">
          {#if klizaci.includes("povrsina") && cvrsto}
            <div class="br-seg" role="group" aria-label="Oblik čvrstog reaktanta">
              <button type="button" class:sel={!prah} aria-pressed={!prah} onclick={() => (prah = false)}>komad</button>
              <button type="button" class:sel={prah} aria-pressed={prah} onclick={() => (prah = true)}>prah</button>
            </div>
          {/if}
          {#if klizaci.includes("katalizator")}
            <button type="button" class="btn btn-quiet br-g" aria-pressed={kat} onclick={() => (kat = !kat)}>{kat ? "Ukloni katalizator" : "Dodaj katalizator"}</button>
          {/if}
        </div>
        <div class="br-ocit" aria-live="polite">
          {#if !prefersReducedMotion.current}<div>sudara A–B u sekundi: <b>{formatNumber(Number(brojSudara.toFixed(1)))}</b>, uspješnih: <b>{formatNumber(Number(brojUspjesnih.toFixed(1)))}</b></div>{/if}
          <div>sudara s energijom barem E<sub>a</sub>: <b>{zapisPosto(udio)}</b></div>
          <div>brzina reakcije: <b>{formatNumber(Number(relBrzina.toPrecision(2)))} ×</b> <span class="br-napomena">(prema 20 °C{klizaci.includes("koncentracija") ? ", srednjoj koncentraciji" : ""}{cvrsto ? ", komadu" : ""}, bez katalizatora)</span></div>
        </div>
        {#if klizaci.includes("temperatura") || klizaci.includes("katalizator")}
          {@render raspodjelaSlika(T, kat ? EA_SLIKA.kat : EA_SLIKA.bez, kat ? { T, Ea: EA_SLIKA.bez } : null)}
          <p class="br-napomena">Osjenčani su sudari s dovoljno energije (barem E<sub>a</sub>). Zagrijavanje pomiče cijelu raspodjelu udesno; katalizator pomiče E<sub>a</sub> ulijevo.</p>
        {/if}
        <p class="br-napomena">Čestice koje uspješno reagiraju zamjenjuju se novima, da koncentracija ostane ista.</p>
      </div>
    </div>
  {/if}

  <!-- ── pokus 17 (istraživanje) ── -->
  {#if istrazi && prikaz === "pokus"}
    <div class="br-stol" class:siroko>
      <div class="br-panel">
        {#if temp}
          <div class="br-kl-n">temperatura otopina</div>
          <div class="br-izbor" role="group" aria-label="Temperatura">
            {#each temperature as x (x)}<button type="button" class="br-cip" class:sel={izborT === x} aria-pressed={izborT === x} disabled={epruvete[0].radi} onclick={() => izaberi("T", x)}>{x} °C{x === pm.sobna ? " (sobna)" : ""}</button>{/each}
          </div>
          <p class="br-sastav"><Formula f="1 mL Na₂S₂O₃" /> + {formatNumber(pm.voda(1))} mL vode + {formatNumber(pm.ot.kiselina)} mL <Formula f="H₂SO₄" /></p>
        {:else}
          <div class="br-kl-n">volumen otopine tiosulfata, <Formula f={`c = ${zapisBroja(pm.ot.c)} mol/dm³`} /></div>
          <div class="br-izbor" role="group" aria-label="Volumen tiosulfata">
            {#each volumeni as V (V)}<button type="button" class="br-cip" class:sel={izborV === V} aria-pressed={izborV === V} disabled={epruvete[0].radi} onclick={() => izaberi("V", V)}>{V} mL</button>{/each}
          </div>
          <p class="br-sastav"><Formula f={`${izborV} mL Na₂S₂O₃`} /> + {formatNumber(pm.voda(izborV))} mL vode + {formatNumber(pm.ot.kiselina)} mL <Formula f="H₂SO₄" /> = {formatNumber(pm.ot.ukupno)} mL; <Formula f={`c(Na₂S₂O₃) = ${zapisBroja(pm.cIzV(izborV))} mol/dm³`} /></p>
        {/if}
        <button type="button" class="btn btn-primary br-g" disabled={epruvete[0].radi} onclick={() => pomijesaj(0)}>Dodaj kiselinu i pokreni sat</button>
      </div>
      {@render epruveta(epruvete[0], null)}
    </div>
    {#if mjerenja.length}
      <table class="br-tablica">
        <thead>
          <tr>
            {#if temp}<th>ϑ / °C</th>{:else}<th>V / mL</th><th><Formula f="c / mol dm⁻³" /></th>{/if}
            <th>t / s</th>
            <th><Formula f="1/t / s⁻¹" /></th>
          </tr>
        </thead>
        <tbody>
          {#each mjerenja as r (r.x)}
            <tr>
              {#if temp}<td>{zapisT(r.theta)}</td>{:else}<td>{formatNumber(r.V)}</td><td>{zapisBroja(r.c)}</td>{/if}
              <td>{Math.round(r.t)}</td>
              <td>{zapisBroja(1 / Math.round(r.t))}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="br-seg" role="group" aria-label="Što prikazuje graf">
        <button type="button" class:sel={!prikazi1t} aria-pressed={!prikazi1t} onclick={() => (prikazi1t = false)}>vrijeme t</button>
        <button type="button" class:sel={prikazi1t} aria-pressed={prikazi1t} onclick={() => (prikazi1t = true)}>1/t (brzina)</button>
      </div>
      {@render graf(grafPokusa, prikazi1t ? "1/t / 10⁻³ s⁻¹" : "t / s", naslovXP, prikazi1t ? "Recipročno vrijeme zamućenja (mjera brzine) za izmjerene epruvete" : "Vrijeme zamućenja za izmjerene epruvete")}
      <p class="br-napomena">U svakoj epruveti mora nastati jednako sumpora da X nestane, pa je 1/t mjera brzine: kraće vrijeme znači bržu reakciju.</p>
    {/if}
  {/if}

  <!-- ── prosječna brzina ── -->
  {#if nacin === "prosjecna"}
    {@const R = s.zadana_brzina ? null : m.R}
    {#if R}{@render jednadzba(R.vrste, m.povratna ? "⇌" : "→")}{/if}
    {#if s.zadana_brzina}
      <div class="br-cipovi"><span class="br-chip">{@render oznaka(vOznaka(s.zadana_brzina.za ?? "reakcija"))} = <Formula f={`${s.zadana_brzina.zapis ?? zapisBrzine(s.zadana_brzina.v)} ${lanacP[0].jed}`} /></span></div>
    {:else}
      <div class="br-cipovi">
        <span class="br-chip"><Formula f="t₁" /> = {zapisT(s.interval[0])} {m.jt}</span>
        <span class="br-chip"><Formula f="t₂" /> = {zapisT(s.interval[1])} {m.jt}</span>
      </div>
      {#if m.tablica}
        <table class="br-tablica">
          <thead><tr><th>t / {m.jt}</th>{#each m.prikazane as f (f)}<th><Formula f={`${m.vel.simbol}(${f}) / ${m.vel.jed}`} /></th>{/each}</tr></thead>
          <tbody>
            {#each m.tablica.t as t, i (i)}
              <tr class:istaknut={s.interval.includes(t)}><td>{zapisT(t)}</td>{#each m.prikazane as f (f)}<td><Formula f={m.tablica.zapisi?.[f]?.[i] ?? zapisBroja(m.tablica.vrijednosti[f][i])} /></td>{/each}</tr>
            {/each}
          </tbody>
        </table>
      {:else}
        {@render graf(grafProsjecne, naslovY, naslovX, `Graf ${m.vel.naziv} o vremenu za ${m.prikazane.join(", ")}`)}
      {/if}
    {/if}
    {@render lanac(koraci)}
  {/if}

  <!-- ── jednadžba iz grafa ── -->
  {#if nacin === "iz_grafa" && ig}
    {@render graf(grafIG, naslovY, naslovX, `Graf ${m.vel.naziv} o vremenu za ${m.prikazane.join(", ")}`)}
    <form onsubmit={predajIG} class="br-ig">
      {#each ig.vrste as v, i (v.f)}
        <div class="br-ig-red">
          <span class="br-ig-ime"><span class="br-crtica" style="border-color: {vrsteGrafa[i].boja}; border-top-style: {vrsteGrafa[i].crta ? 'dashed' : 'solid'}"></span><Formula f={v.f} /></span>
          <div class="br-seg br-uloge" role="radiogroup" aria-label="Uloga tvari {v.f}">
            {#each [["reaktant", "reaktant"], ["produkt", "produkt"], ["ne", "ne sudjeluje"]] as [u, naziv] (u)}
              <button type="button" role="radio" aria-checked={uloge[i] === u} class:sel={uloge[i] === u} class:bad={losePolje(i, "uloga") && uloge[i] === u} class:ok={rijeseno && v.uloga === u} disabled={!aktivno} onclick={() => (uloge[i] = u)}>{naziv}</button>
            {/each}
          </div>
          <div class="br-ig-polja">
            {#if s.promjene}
              <label class="br-ig-p">
                <span>Δ{m.vel.simbol} =</span>
                <input class="inp br-inp sm" class:bad={losePolje(i, "promjena")} inputmode="decimal" autocomplete="off" placeholder="?" aria-label="Promjena {m.vel.naziv} tvari {v.f}" disabled={!aktivno} bind:value={promjeneU[i]} />
                <span class="lx-unit"><Formula f={m.vel.jed} /></span>
              </label>
            {/if}
            {#if uloge[i] && uloge[i] !== "ne"}
              <label class="br-ig-p">
                <span>koeficijent</span>
                <input class="inp br-inp xs" class:bad={losePolje(i, "koef")} inputmode="numeric" autocomplete="off" placeholder="1" aria-label="Koeficijent tvari {v.f}" disabled={!aktivno} bind:value={koefU[i]} />
              </label>
            {/if}
          </div>
        </div>
      {/each}
      {#if pitaS}
        <div class="br-ig-str">
          <span class="br-kl-n">strelica</span>
          <div class="br-seg" role="radiogroup" aria-label="Strelica u jednadžbi">
            {#each ["→", "⇌"] as x (x)}<button type="button" role="radio" aria-checked={strelica === x} class:sel={strelica === x} class:bad={ishod && !ishod.tocno && ishod.polje?.sto === "strelica" && strelica === x} class:ok={rijeseno && ig.strelica === x} disabled={!aktivno} onclick={() => (strelica = x)}><span class="br-strel">{x}</span></button>{/each}
          </div>
        </div>
      {/if}
      {#if jednadzbaUcenika}
        <div class="br-eq br-eq-u" aria-label="Tvoja jednadžba">
          <span class="br-kl-n">tvoja jednadžba:</span>
          {#each jednadzbaUcenika.L as x, k (x.f)}<span class="br-par">{#if k}<span class="br-plus">+</span>{/if}{#if x.k && x.k !== "1"}<span class="br-k">{x.k}</span>{/if}<Formula f={x.f} /></span>{/each}
          {#each jednadzbaUcenika.D as x, k (x.f)}<span class="br-par"><span class={k ? "br-plus" : "br-str"}>{k ? "+" : (pitaS ? (strelica ?? "?") : "→")}</span>{#if x.k && x.k !== "1"}<span class="br-k">{x.k}</span>{/if}<Formula f={x.f} /></span>{/each}
        </div>
      {/if}
      <p class="br-napomena">Prazno polje koeficijenta znači 1.</p>
      <div class="lx-actions"><button class="btn btn-primary" type="submit" disabled={!aktivno || !potpunIG}>Provjeri</button></div>
    </form>
  {/if}

  <!-- ── utjecaj ── -->
  {#if nacin === "utjecaj" && P}
    {#if pitajU !== "razlog"}
      <div class="br-kl-n">brzina reakcije</div>
      <div class="br-seg br-smjer" role="radiogroup" aria-label="Kako se mijenja brzina reakcije">
        {#each ["brza", "sporija", "isto"] as x (x)}
          <button type="button" role="radio" aria-checked={smjerU === x} class:sel={smjerU === x} class:bad={ishod && !ishod.tocno && ishod.krivo === "smjer" && smjerU === x} class:ok={rijeseno && P.smjer === x} disabled={!aktivno} onclick={() => (smjerU = x)}>{SMJER_NAZIV[x]}</button>
        {/each}
      </div>
    {/if}
    {#if pitajU !== "smjer"}
      <div class="br-kl-n">zašto?</div>
      <div class="br-razlozi" role="radiogroup" aria-label="Razlog">
        {#each razlozi as r (r)}
          <button type="button" role="radio" aria-checked={razlogU === r} class="br-razlog" class:sel={razlogU === r} class:bad={ishod && !ishod.tocno && ishod.krivo === "razlog" && razlogU === r} class:ok={rijeseno && P.razlog === r} disabled={!aktivno} onclick={() => (razlogU = r)}>
            <span class="br-radio" aria-hidden="true"></span><span>{RAZLOZI[r]}</span>
          </button>
        {/each}
      </div>
    {/if}
    <div class="lx-actions"><button class="btn btn-primary" type="button" disabled={!aktivno || !potpunU} onclick={() => onodgovor({ smjer: smjerU, razlog: razlogU })}>Provjeri</button></div>
    {#if rijeseno && utjecajE}
      {@render raspodjelaSlika(utjecajE.T2, utjecajE.Ea2, { T: utjecajE.T1, Ea: utjecajE.Ea1 })}
      <p class="br-napomena">{#if s.promjena.startsWith("temperatura")}Isprekidano: prije, puna crta: poslije. E<sub>a</sub> je ista, a osjenčano je koliko sudara ima barem E<sub>a</sub>.{:else}Raspodjela energije čestica je ista (ista temperatura); {s.promjena === "katalizator" ? "niža" : "viša"} E<sub>a</sub> (puna crta) mijenja koliko sudara ima dovoljno energije.{/if}</p>
    {/if}
  {/if}

  <!-- ── omjer (pokus 17) ── -->
  {#if nacin === "omjer" && om}
    {#if prikaz === "graf"}
      {@render graf(grafOmjera, "t / s", naslovXP, `Vrijeme do nestanka znaka X ovisno o ${temp ? "temperaturi" : "koncentraciji tiosulfata"}`)}
    {:else}
      <div class="br-epruvete">
        {#each epruvete as e, i (i)}
          <div class="br-ep-k">
            <div class="br-ep-uvjet">
              <b>{i + 1}.</b>
              {#if temp}<span class="br-nw">ϑ = {zapisT(e.theta ?? e.x)} °C</span>{:else}<Formula f={`${formatNumber(Number(((e.x * pm.ot.ukupno) / pm.ot.c).toPrecision(3)))} mL Na₂S₂O₃`} /> <span class="br-nw">+ {formatNumber(Number(pm.voda((e.x * pm.ot.ukupno) / pm.ot.c).toPrecision(3)))} mL vode</span>{/if}
            </div>
            {@render epruveta(e, `${i + 1}`)}
            <button type="button" class="btn btn-quiet br-g" disabled={e.radi || e.napredak >= 1 || !aktivno} onclick={() => pomijesaj(i)}>{e.napredak >= 1 ? "Izmjereno" : "Dodaj kiselinu"}</button>
          </div>
        {/each}
      </div>
    {/if}
    {@render lanac(koraci)}
  {/if}
</div>

{#if tocanTekst}
  <p class="lx-solution">Točan odgovor: <b class="br-tocno">{@render tekst(tocanTekst)}</b></p>
{/if}

<style>
  .br {
    display: grid;
    gap: 12px;
    min-width: 0;
    font-family: var(--font-sans);
  }
  .br-tekst {
    margin-bottom: 6px;
  }
  .br-hint {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .br :global(sub) {
    font-size: 0.68em;
    vertical-align: -0.3em;
    line-height: 0;
  }
  .br-vbar {
    text-decoration: overline;
    font-style: italic;
  }
  .br-napomena {
    margin: 0;
    font-size: 12.5px;
    color: var(--text-faint);
  }

  /* jednadžba: „+“ i strelica ostaju uz pojam iza sebe */
  .br-eq {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 0;
    font-size: 16px;
    color: var(--text);
  }
  .br-eq-u {
    font-size: 15px;
    gap: 2px 0;
  }
  .br-eq-u .br-kl-n {
    margin-right: 8px;
  }
  .br-par {
    white-space: nowrap;
  }
  .br-plus,
  .br-str {
    margin: 0 7px;
    color: var(--text-dim);
  }
  .br-k {
    margin-right: 2px;
  }

  /* čipovi */
  .br-cipovi,
  .br-izbor {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .br-chip {
    display: inline-block;
    padding: 3px 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    font-size: 13.5px;
    color: var(--text);
    white-space: nowrap;
  }
  .br-cip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--bg-elev);
    color: var(--text);
    font-size: 14px;
    white-space: nowrap;
  }
  .br-cip:hover:not(:disabled) {
    border-color: var(--border-strong);
    background: var(--bg-hover);
  }
  .br-cip.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }
  .br-crtica {
    display: inline-block;
    width: 18px;
    border-top: 2.5px solid;
  }

  /* graf + ploča */
  .br-stol {
    display: grid;
    gap: 12px;
  }
  .br-stol.siroko {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    align-items: start;
  }
  .br-graf {
    margin: 0;
    max-width: 480px;
    width: 100%;
  }
  .br-graf svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .br-osy {
    font-size: 12px;
    color: var(--text-dim);
    margin: 0 0 -2px 4px;
  }
  .br-osx {
    margin-top: -2px;
    padding-right: 40px;
    text-align: right;
    font-size: 12px;
    color: var(--text-dim);
  }
  .br-mreza {
    stroke: var(--border);
    stroke-width: 0.7;
  }
  .br-os {
    stroke: var(--text-dim);
    stroke-width: 1;
  }
  .br-tick {
    fill: var(--text-faint);
    font: 10px var(--font-sans);
  }
  .br-vodic {
    stroke: var(--text-faint);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  .br-oznakaX {
    fill: var(--text-dim);
    font: 600 10.5px var(--font-sans);
  }
  .br-krivulja {
    fill: none;
    stroke-width: 2.2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .br-krivulja.debela {
    stroke-width: 3;
  }
  .br-krivulja.tanka {
    opacity: 0.5;
  }
  .br-marker {
    stroke: var(--bg-elev);
    stroke-width: 1.5;
  }
  .br-crta.sekanta {
    stroke: var(--text);
    stroke-width: 1.6;
    stroke-dasharray: 5 3;
  }
  .br-crta.tangenta {
    stroke: var(--primary);
    stroke-width: 1.6;
  }
  .br-tocka {
    stroke: var(--bg-elev);
    stroke-width: 2;
  }
  .br-lbl {
    fill: var(--text);
    font: 600 10.5px var(--font-sans);
    paint-order: stroke;
    stroke: var(--bg-elev);
    stroke-width: 3px;
  }
  .br-ime {
    font: 600 11.5px var(--font-sans);
  }
  .br-panel {
    display: grid;
    gap: 10px;
    align-content: start;
    min-width: 0;
  }
  .br-kl {
    display: grid;
    gap: 2px;
  }
  .br-kl input[type="range"] {
    width: 100%;
    height: 36px;
    margin: 0;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .br-kl-n {
    font-size: 13px;
    color: var(--text-dim);
  }
  .br-kl-n b {
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .br-ocit {
    display: grid;
    gap: 4px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    font-size: 14px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .br-v b {
    white-space: nowrap;
  }
  .br-tang {
    color: var(--primary);
  }
  .br-g {
    justify-self: start;
    min-height: 40px;
    border: 1px solid var(--border);
    background: var(--bg-elev);
  }
  .br-g.btn-primary {
    border-color: transparent;
    background: var(--primary);
  }

  /* segmentirani izbor */
  .br-seg {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    overflow: hidden;
    justify-self: start;
    background: var(--bg-elev);
  }
  .br-seg button {
    min-height: 38px;
    padding: 0 12px;
    border: 0;
    border-right: 1px solid var(--border);
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 14px;
    white-space: nowrap;
  }
  .br-seg button:last-child {
    border-right: 0;
  }
  .br-seg button:hover:not(:disabled) {
    background: var(--bg-hover);
  }
  .br-seg button.sel {
    background: var(--primary-dim);
    color: var(--text);
    box-shadow: inset 0 0 0 1.5px var(--lx-turn);
  }
  .br-seg button.ok {
    box-shadow: inset 0 0 0 2px var(--lx-ok);
  }
  .br-seg button.bad {
    box-shadow: inset 0 0 0 2px var(--lx-bad);
  }
  .br-strel {
    font-size: 18px;
    padding: 0 6px;
  }

  /* lanac */
  .br-lanac {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    max-width: 400px;
  }
  .br-kartica {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    min-width: 0;
  }
  .br-kartica.ok {
    border-color: var(--lx-ok);
  }
  .br-kartica.bad {
    border-color: var(--lx-bad);
  }
  .br-glava {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 8px;
  }
  .br-sym {
    font-weight: 700;
    font-size: 16px;
    color: var(--text);
  }
  .br-pri {
    font-size: 13px;
    color: var(--text-dim);
    white-space: nowrap;
  }
  .br-unos {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .br-inp {
    width: 100%;
    max-width: 150px;
    min-width: 0;
    height: var(--lx-control);
    padding: 6px 8px;
    text-align: right;
    font-family: var(--font-mono);
    font-size: 16px; /* manje od 16 px na iOS-u zumira stranicu */
  }
  .br-inp.sm {
    max-width: 92px;
  }
  .br-inp.xs {
    max-width: 56px;
    text-align: center;
  }
  .br-jed {
    white-space: nowrap;
  }
  .br-pot {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-faint);
  }
  .br-pot .btn {
    min-width: 44px;
    min-height: 36px;
    font-family: var(--font-mono);
  }
  .br-strelica {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0 2px 18px;
    color: var(--text-faint);
  }
  .br-str-r {
    display: none;
  }
  .br-str-d,
  .br-str-r {
    font-size: 18px;
    line-height: 1;
  }
  .br-op {
    font-size: 13px;
    color: var(--primary);
    font-weight: 600;
  }
  .br-lanac.vodoravno {
    flex-direction: row;
    max-width: none;
  }
  .vodoravno .br-kartica {
    flex: 1 1 0;
  }
  .vodoravno .br-strelica {
    flex-direction: column;
    justify-content: center;
    align-self: center;
    gap: 2px;
    padding: 0 2px;
  }
  .vodoravno .br-str-r {
    display: inline;
  }
  .vodoravno .br-str-d {
    display: none;
  }

  /* tablica */
  .br-tablica {
    border-collapse: collapse;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    justify-self: start;
  }
  .br-tablica th,
  .br-tablica td {
    padding: 5px 10px;
    border: 1px solid var(--border);
    text-align: right;
    white-space: nowrap;
  }
  .br-tablica th {
    font-weight: 600;
    font-size: 12.5px;
    color: var(--text-dim);
    background: var(--bg-elev-2);
  }
  .br-tablica tr.istaknut td {
    background: var(--primary-dim);
  }

  /* iz grafa */
  .br-ig {
    display: grid;
    gap: 10px;
  }
  .br-ig-red {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 6px 10px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .br-ig-ime {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-width: 44px;
    font-weight: 700;
    font-size: 16px;
  }
  .br-uloge {
    display: flex;
    flex-wrap: nowrap;
    min-width: 0;
  }
  .br-uloge button {
    flex: 1 1 auto;
    padding: 0 7px;
    font-size: 13px;
  }
  .br-ig-polja {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
  }
  .br-ig-polja:empty {
    display: none;
  }
  .br-ig-p {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13.5px;
    color: var(--text-dim);
  }
  .br-ig-str {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* utjecaj */
  .br-razlozi {
    display: grid;
    gap: 6px;
  }
  .br-razlog {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
    color: var(--text);
    font: inherit;
    font-size: 14.5px;
    text-align: left;
  }
  .br-razlog:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }
  .br-razlog.sel {
    border-color: var(--lx-turn);
    background: var(--primary-dim);
  }
  .br-razlog.ok {
    border-color: var(--lx-ok);
  }
  .br-razlog.bad {
    border-color: var(--lx-bad);
  }
  .br-radio {
    flex: 0 0 18px;
    height: 18px;
    border-radius: 999px;
    border: 1.5px solid var(--border-strong);
  }
  .br-razlog.sel .br-radio {
    border: 5px solid var(--primary);
  }

  /* sudari */
  .br-posuda {
    margin: 0;
    max-width: 480px;
    width: 100%;
  }
  .br-posuda svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .br-posuda-r {
    fill: color-mix(in srgb, var(--lx-water) 6%, transparent);
    stroke: var(--text-dim);
    stroke-width: 1.4;
  }
  .br-cA {
    fill: var(--primary);
  }
  .br-cB {
    fill: var(--lx-water);
  }
  .br-cB.cvrsto {
    fill: var(--text-dim);
  }
  .br-blijesak {
    fill: none;
    stroke: var(--warn);
    stroke-width: 3;
    animation: br-blijesak 0.7s ease-out forwards;
    transform-box: fill-box;
    transform-origin: center;
  }
  .br-blijesak.slab {
    stroke: var(--text-faint);
    stroke-width: 1.5;
    animation-duration: 0.4s;
  }
  @keyframes br-blijesak {
    from {
      opacity: 1;
      transform: scale(0.5);
    }
    to {
      opacity: 0;
      transform: scale(1.8);
    }
  }
  .br-kat {
    fill: var(--warn);
    opacity: 0.6;
  }
  .br-legenda {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin-top: 4px;
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .br-l {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 999px;
    vertical-align: -1px;
  }
  .br-lA {
    background: var(--primary);
  }
  .br-lB {
    background: var(--lx-water);
  }
  .br-lB.cvrsto {
    background: var(--text-dim);
    border-radius: 2px;
  }
  .br-lS {
    border: 2px solid var(--text-faint);
    background: transparent;
  }
  .br-lX {
    border: 2.5px solid var(--warn);
    background: transparent;
  }
  .br-prekidaci {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .br-rasp {
    margin: 0;
    max-width: 360px;
  }
  .br-rasp svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .br-rep {
    fill: color-mix(in srgb, var(--primary) 30%, transparent);
  }
  .br-rasp-k {
    fill: none;
    stroke: var(--text);
    stroke-width: 2;
  }
  .br-rasp-prije {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1.6;
    stroke-dasharray: 4 3;
  }
  .br-ea {
    stroke: var(--primary);
    stroke-width: 1.8;
  }
  .br-ea-prije {
    stroke: var(--text-faint);
    stroke-width: 1.4;
    stroke-dasharray: 3 3;
  }
  .br-ea-t {
    fill: var(--primary);
    font: italic 600 12px var(--font-sans);
  }

  /* pokus */
  .br-ep {
    margin: 0;
    display: grid;
    justify-items: center;
    gap: 4px;
  }
  .br-ep svg {
    display: block;
    width: 100%;
    max-width: 230px;
    height: auto;
  }
  .br-otopina {
    fill: color-mix(in srgb, var(--lx-water) 16%, transparent);
  }
  /* koloidni sumpor: blijedožut, boja je kemijski podatak */
  .br-sumpor {
    fill: #efe6b4;
  }
  .br-staklo {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.6;
    stroke-linejoin: round;
  }
  .br-papir {
    fill: #fbfbf8;
  }
  .br-rub {
    fill: none;
    stroke: var(--text-dim);
    stroke-width: 1.6;
  }
  .br-x {
    stroke: #1f2937;
    stroke-width: 5;
    stroke-linecap: round;
  }
  .br-nw {
    white-space: nowrap;
  }
  .br-sat {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: baseline;
    gap: 0 8px;
    text-align: center;
    font-size: 13px;
    color: var(--text-dim);
  }
  .br-sat b {
    font-size: 22px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    min-width: 2.6em;
  }
  .br-sat-n,
  .br-sat-k {
    white-space: nowrap;
  }
  .br-sat-k {
    flex-basis: 100%;
    color: var(--text);
  }
  .br-sastav {
    margin: 0;
    font-size: 13.5px;
    color: var(--text-dim);
  }
  .br-epruvete {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    justify-content: center;
  }
  .br-ep-k {
    display: grid;
    justify-items: center;
    gap: 6px;
    flex: 1 1 130px;
    max-width: 240px;
    min-width: 0;
  }
  .br-ep-uvjet {
    font-size: 13.5px;
    color: var(--text);
    text-align: center;
  }

  .br-tocno {
    color: var(--success);
    font-weight: 600;
  }

  @media (prefers-reduced-motion: reduce) {
    .br-blijesak {
      animation: none;
      opacity: 0;
    }
  }
</style>
