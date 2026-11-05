// ravnina: (Gaussova) ravnina s točkama, kružnicama, zrakama, pravcima i skupom S zadanim uvjetima
// („abs(z-1-i)<=2“, „re(z)>1“, „arg(z^3)==pi/2“). Načini: prikaz (Pogledaj), postavi (učenik dodirom postavlja točke,
// npr. n-te korijene na kružnici) i pripada (učenik označi koje zadane točke pripadaju S).
// Sve računa kod: pripadnost točaka, osjenčani S, rubove (puna crta: rub pripada S; isprekidana: ne pripada),
// sjecišta jednakosti i poruke za krive odgovore. Kompleksni izrazi: ravnina_kompleksno.js.
import {
  POGLEDAJ,
  ODGOVOR,
  problems,
  noAnswerFields,
  isText,
} from "../zajednicko.js";
import { okvirCrteza } from "../matematika.js";
import {
  C,
  kompleksniIli,
  realni,
  uvjet,
  vrijedi,
  razlika,
  strana,
  tex,
  texOp,
  texBroja,
  texKompleksnog,
} from "./ravnina_kompleksno.js";

const NACINI = ["prikaz", "postavi", "pripada"];
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// ── točke iz speca: "1+i", "2*exp(i*pi/3)", [x, y] (brojevi ili izrazi), {z} ili {x, y} ──
export function tocka(t) {
  if (t == null) return null;
  if (typeof t === "string" || typeof t === "number") {
    const v = typeof t === "number" ? C(t) : kompleksniIli(t);
    return v ? [v.re, v.im] : null;
  }
  if (Array.isArray(t)) {
    if (t.length !== 2) return null;
    const v = t.map((c) =>
      isNum(c) ? c : typeof c === "string" ? realni(c) : null,
    );
    return v.every((c) => c != null) ? v : null;
  }
  if (typeof t === "object")
    return t.z != null ? tocka(t.z) : tocka([t.x, t.y]);
  return null;
}
const broj = (v) => (isNum(v) ? v : typeof v === "string" ? realni(v) : null);
const korakOf = (s) => broj(s.korak ?? 1);

// unicode indeksi u oznaci („z₁“) → LaTeX („z_{1}“); oznaka u $…$ ostaje kakva jest
const SUB = "₀₁₂₃₄₅₆₇₈₉";
export const texOznake = (o) =>
  String(o ?? "")
    .replace(/\$/g, "")
    .replace(
      /[₀-₉]+/g,
      (m) => `_{${[...m].map((c) => SUB.indexOf(c)).join("")}}`,
    );

// zapis točke: a + bi (kompleksno) ili (x, y)
export function texTocke(s, p) {
  if (s.kompleksno) return texKompleksnog(C(p[0], p[1]));
  const sep = [texBroja(p[0]), texBroja(p[1])].some((t) => t.includes("{,}"))
    ? ";\\ "
    : ",\\ ";
  return `\\left(${texBroja(p[0])}${sep}${texBroja(p[1])}\\right)`;
}
// „z₁ = 1 + 3i“ ili samo „1 + 3i“ (bez $)
function imeTocke(s, t, p) {
  const v = texTocke(s, p);
  return t?.oznaka ? `${texOznake(t.oznaka)} = ${v}` : v;
}

// ── okvir crteža (isti kao graf_funkcije: jednako mjerilo na osima) ──
export function okvir(s) {
  const o = okvirCrteza({ x: s.x, y: s.y, korak_y: korakOf(s) ?? 1 });
  const [x0, x1, y0, y1] = [s.x[0], s.x[1], s.y[0], s.y[1]];
  const sirina = o.W - o.L - o.R;
  const visina = o.H - o.T - o.B;
  return {
    ...o,
    X: (x) => o.L + ((x - x0) / (x1 - x0)) * sirina,
    Y: (y) => o.H - o.B - ((y - y0) / (y1 - y0)) * visina,
    iX: (px) => x0 + ((px - o.L) / sirina) * (x1 - x0),
    iY: (py) => y0 + ((o.H - o.B - py) / visina) * (y1 - y0),
    mjerilo: sirina / (x1 - x0),
  };
}
const unutra = (s, p, rub = 1e-9) =>
  p[0] >= s.x[0] - rub &&
  p[0] <= s.x[1] + rub &&
  p[1] >= s.y[0] - rub &&
  p[1] <= s.y[1] + rub;

// ── skup S ──
export function pripremiSkup(s) {
  const usporedbe = [];
  (s.skup ?? []).forEach((src, k) =>
    uvjet(src).forEach((u) => usporedbe.push({ ...u, k })),
  );
  const odNule = !!s.arg_od_nule;
  // osim: indeks usporedbe koja se preskače; zatvoreno: strogo < čita se kao ≤ (zatvarač, za rubove)
  const clan = (z, osim = -1, zatvoreno = false) =>
    usporedbe.every((u, j) => j === osim || vrijedi(u, z, odNule, zatvoreno));
  return { usporedbe, odNule, clan };
}
const zaokruzi = (z) =>
  C(Math.round(z.re * 1e9) / 1e9, Math.round(z.im * 1e9) / 1e9);

// Područje S (bez jednakosti) kao vodoravne trake visine 2 px s točno izračunatim krajevima.
function podrucje(o, S) {
  const [lijevo, desno, gore, dolje] = [o.L, o.W - o.R, o.T, o.H - o.B];
  const r1 = (v) => Math.round(v * 100) / 100;
  let d = "";
  let ima = false;
  const n = Math.ceil((desno - lijevo) / 2);
  for (let ya = gore; ya < dolje - 1e-9; ya += 2) {
    const yb = Math.min(dolje, ya + 2);
    const y = o.iY((ya + yb) / 2);
    const u = (px) => S.clan(C(o.iX(px), y));
    let [prije, pxPrije, pocetak] = [null, lijevo, null];
    for (let i = 0; i <= n; i++) {
      const px = lijevo + ((desno - lijevo) * i) / n;
      const v = u(px);
      if (prije === null) {
        if (v) pocetak = lijevo;
      } else if (v !== prije) {
        let [a, b] = [pxPrije, px];
        for (let k = 0; k < 22; k++) {
          const m = (a + b) / 2;
          if (u(m) === prije) a = m;
          else b = m;
        }
        const xr = (a + b) / 2;
        if (v) pocetak = xr;
        else {
          d += `M${r1(pocetak)} ${r1(ya)}H${r1(xr)}V${r1(yb)}H${r1(pocetak)}Z`;
          pocetak = null;
        }
      }
      prije = v;
      pxPrije = px;
    }
    if (pocetak !== null)
      d += `M${r1(pocetak)} ${r1(ya)}H${r1(desno)}V${r1(yb)}H${r1(pocetak)}Z`;
    ima ||= d.length > 0;
  }
  return ima ? d : "";
}

// Krivulje h = 0 (marching squares na mreži 3 px, nultočke na bridovima bisekcijom), spojene u izlomljene crte.
// samoNeprekidno: preskače skokove funkcije (npr. rez arg-a), inače su i oni rub (nejednakost tamo mijenja istinitost).
function konture(o, h, samoNeprekidno) {
  const [lijevo, gore] = [o.L, o.T];
  const [sir, vis] = [o.W - o.R - o.L, o.H - o.B - o.T];
  const [nx, ny] = [Math.ceil(sir / 3), Math.ceil(vis / 3)];
  const px = (i) => lijevo + (sir * i) / nx;
  const py = (j) => gore + (vis * j) / ny;
  const hp = (x, y) => h(C(o.iX(x), o.iY(y)));
  const vr = new Float64Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) vr[j * (nx + 1) + i] = hp(px(i), py(j));
  const V = (i, j) => vr[j * (nx + 1) + i];
  const poz = (v) => v >= 0;
  const korijeni = new Map();
  // nultočka na bridu od (i,j) vodoravno (smjer "h") ili okomito ("v")
  function korijen(smjer, i, j) {
    const kljuc = `${smjer}${i},${j}`;
    if (korijeni.has(kljuc)) return kljuc;
    const [ax, ay] = [px(i), py(j)];
    const [bx, by] = smjer === "h" ? [px(i + 1), ay] : [ax, py(j + 1)];
    const ha = V(i, j);
    let [a, b] = [0, 1];
    for (let k = 0; k < 40; k++) {
      const m = (a + b) / 2;
      const hm = hp(ax + (bx - ax) * m, ay + (by - ay) * m);
      if (poz(hm) === poz(ha)) a = m;
      else b = m;
    }
    const t = (a + b) / 2;
    const [x, y] = [ax + (bx - ax) * t, ay + (by - ay) * t];
    const hb = smjer === "h" ? V(i + 1, j) : V(i, j + 1);
    const hk = hp(x, y);
    const neprekidno =
      Number.isFinite(hk) &&
      Math.abs(hk) < 1e-6 * (1 + Math.min(Math.abs(ha), Math.abs(hb)));
    // točke pola px s obiju strana nultočke (za provjeru razlikuje li se S s dviju strana crte)
    const [ux, uy] = smjer === "h" ? [0.5, 0] : [0, 0.5];
    korijeni.set(kljuc, {
      px: x,
      py: y,
      z: C(o.iX(x), o.iY(y)),
      neprekidno,
      krajevi: [C(o.iX(x - ux), o.iY(y - uy)), C(o.iX(x + ux), o.iY(y + uy))],
    });
    return kljuc;
  }
  const dijelovi = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const [a, b, c, d] = [V(i, j), V(i + 1, j), V(i + 1, j + 1), V(i, j + 1)];
      if (![a, b, c, d].every(Number.isFinite)) continue;
      const [sa, sb, sc, sd] = [a, b, c, d].map(poz);
      const bridovi = [];
      if (sa !== sb) bridovi.push(["gore", korijen("h", i, j)]);
      if (sb !== sc) bridovi.push(["desno", korijen("v", i + 1, j)]);
      if (sd !== sc) bridovi.push(["dolje", korijen("h", i, j + 1)]);
      if (sa !== sd) bridovi.push(["lijevo", korijen("v", i, j)]);
      if (bridovi.length === 2) dijelovi.push([bridovi[0][1], bridovi[1][1]]);
      else if (bridovi.length === 4) {
        const k = Object.fromEntries(bridovi);
        const sredina = poz(
          hp((px(i) + px(i + 1)) / 2, (py(j) + py(j + 1)) / 2),
        );
        if (sredina === sa)
          dijelovi.push([k.gore, k.desno], [k.dolje, k.lijevo]);
        else dijelovi.push([k.gore, k.lijevo], [k.desno, k.dolje]);
      }
    }
  }
  const segmenti = samoNeprekidno
    ? dijelovi.filter(
        ([p, q]) => korijeni.get(p).neprekidno && korijeni.get(q).neprekidno,
      )
    : dijelovi;
  // spajanje u izlomljene crte
  const kraj = new Map();
  segmenti.forEach(([p, q], k) => {
    for (const x of [p, q]) {
      if (!kraj.has(x)) kraj.set(x, []);
      kraj.get(x).push(k);
    }
  });
  const iskoristen = new Uint8Array(segmenti.length);
  const hodaj = (seg, od) => {
    const kljucevi = [od];
    let tren = od;
    while (seg != null) {
      iskoristen[seg] = 1;
      const [p, q] = segmenti[seg];
      tren = p === tren ? q : p;
      kljucevi.push(tren);
      seg = kraj.get(tren).find((t) => !iskoristen[t]);
    }
    return kljucevi;
  };
  const linije = [];
  for (const [kljuc, popis] of kraj)
    if (popis.length === 1 && !iskoristen[popis[0]])
      linije.push(hodaj(popis[0], kljuc));
  segmenti.forEach((sg, k) => {
    if (!iskoristen[k]) linije.push(hodaj(k, sg[0]));
  });
  return linije.map((l) => l.map((k) => korijeni.get(k)));
}

// Dijelovi crte na kojima vrijedi uvjet (ok po vrhovima), s krajevima dotjeranim bisekcijom po tetivi.
function dijeloviCrte(o, linija, ok, uvjetTocke) {
  const out = [];
  const tockaNa = (p, q, t) => {
    const [x, y] = [p.px + (q.px - p.px) * t, p.py + (q.py - p.py) * t];
    return { px: x, py: y, z: C(o.iX(x), o.iY(y)) };
  };
  const rub = (p, q) => {
    // p ne vrijedi, q vrijedi
    let [a, b] = [0, 1];
    for (let k = 0; k < 32; k++) {
      const m = (a + b) / 2;
      if (uvjetTocke(tockaNa(p, q, m).z)) b = m;
      else a = m;
    }
    return tockaNa(p, q, b);
  };
  let i = 0;
  while (i < linija.length) {
    if (!ok[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < linija.length && ok[j + 1]) j++;
    const dio = linija.slice(i, j + 1);
    const pocetak = i > 0 ? rub(linija[i - 1], linija[i]) : null;
    const zavrsetak =
      j < linija.length - 1 ? rub(linija[j + 1], linija[j]) : null;
    if (pocetak) dio.unshift(pocetak);
    if (zavrsetak) dio.push(zavrsetak);
    if (dio.length >= 2)
      out.push({ tocke: dio, krajevi: [pocetak, zavrsetak].filter(Boolean) });
    i = j + 1;
  }
  return out;
}

// Newton (Gauss–Newton s prigušenjem) za presjek dviju jednakosti h1 = h2 = 0, od početne točke z.
function presjek(h1, h2, z, korak) {
  let [x, y] = [z.re, z.im];
  const F = (a, b) => [h1(C(a, b)), h2(C(a, b))];
  for (let it = 0; it < 80; it++) {
    const [f1, f2] = F(x, y);
    if (![f1, f2].every(Number.isFinite)) return null;
    if (Math.abs(f1) < 1e-12 && Math.abs(f2) < 1e-12) break;
    const d = korak * 1e-5;
    const [ax, ay] = F(x + d, y);
    const [bx, by] = F(x, y + d);
    const J = [
      [(ax - f1) / d, (bx - f1) / d],
      [(ay - f2) / d, (by - f2) / d],
    ];
    // (JᵀJ + λI) δ = −Jᵀf
    const l = 1e-12;
    const A = J[0][0] ** 2 + J[1][0] ** 2 + l;
    const B = J[0][0] * J[0][1] + J[1][0] * J[1][1];
    const D = J[0][1] ** 2 + J[1][1] ** 2 + l;
    const g1 = J[0][0] * f1 + J[1][0] * f2;
    const g2 = J[0][1] * f1 + J[1][1] * f2;
    const det = A * D - B * B;
    if (!det) return null;
    let [dx, dy] = [-(D * g1 - B * g2) / det, -(A * g2 - B * g1) / det];
    const duljina = Math.hypot(dx, dy);
    if (duljina > korak * 3)
      [dx, dy] = [(dx / duljina) * korak * 3, (dy / duljina) * korak * 3];
    x += dx;
    y += dy;
  }
  const [f1, f2] = F(x, y);
  return Math.abs(f1) < 1e-7 && Math.abs(f2) < 1e-7 ? C(x, y) : null;
}

// Cijeli crtež skupa S u px: područje (bez jednakosti), rubovi (puna/isprekidana), krivulje (jedna jednakost) s
// krajnjim točkama, ili točke (dvije jednakosti ili više).
export function crtezSkupa(s, o = okvir(s)) {
  if (!Array.isArray(s.skup) || !s.skup.length) return null;
  const S = pripremiSkup(s);
  const jednakosti = S.usporedbe
    .map((u, k) => [u, k])
    .filter(([u]) => u.op === "==");
  const out = {
    podrucje: "",
    rubovi: [],
    krivulje: [],
    krajevi: [],
    tocke: [],
  };
  const crta = (tocke) =>
    tocke
      .map((p) => `${Math.round(p.px * 10) / 10},${Math.round(p.py * 10) / 10}`)
      .join(" ");
  if (!jednakosti.length) {
    out.podrucje = podrucje(o, S);
    S.usporedbe.forEach((u, k) => {
      for (const linija of konture(o, (z) => razlika(u, z, S.odNule), false)) {
        // rub S: ostali uvjeti vrijede (zatvarač) i S se razlikuje s dviju strana crte (krajevi brida mreže)
        const ok = linija.map(
          (p) =>
            S.clan(zaokruzi(p.z), k, true) &&
            (!p.krajevi || S.clan(p.krajevi[0]) !== S.clan(p.krajevi[1])),
        );
        for (const dio of dijeloviCrte(o, linija, ok, (z) =>
          S.clan(z, k, true),
        )) {
          const unutarnji = dio.tocke.slice(
            dio.krajevi.length ? 1 : 0,
            dio.tocke.length - (dio.krajevi.length ? 1 : 0),
          );
          const glasovi = (unutarnji.length ? unutarnji : dio.tocke).map((p) =>
            S.clan(zaokruzi(p.z)),
          );
          const puna = glasovi.filter(Boolean).length * 2 >= glasovi.length;
          out.rubovi.push({ tocke: crta(dio.tocke), puna });
        }
      }
    });
    return out;
  }
  const [[u1, k1]] = jednakosti;
  const h1 = (z) => razlika(u1, z, S.odNule);
  const linije = konture(o, h1, true);
  if (jednakosti.length === 1) {
    for (const linija of linije) {
      const ok = linija.map((p) => S.clan(zaokruzi(p.z), k1));
      for (const dio of dijeloviCrte(o, linija, ok, (z) =>
        S.clan(z, k1, true),
      )) {
        out.krivulje.push(crta(dio.tocke));
        for (const p of dio.krajevi)
          out.krajevi.push({ px: p.px, py: p.py, puna: S.clan(p.z, k1) });
      }
    }
    return out;
  }
  // presjeci: na crtama prve jednakosti traži promjenu predznaka ili lokalni minimum |h2|, pa Newton
  const [u2] = jednakosti[1];
  const h2 = (z) => razlika(u2, z, S.odNule);
  const korak = 3 / o.mjerilo;
  const nadene = [];
  for (const linija of linije) {
    const v = linija.map((p) => h2(p.z));
    for (let i = 0; i < linija.length; i++) {
      const kandidat =
        (i + 1 < linija.length &&
          Number.isFinite(v[i]) &&
          Number.isFinite(v[i + 1]) &&
          Math.sign(v[i]) !== Math.sign(v[i + 1]) &&
          Math.abs(v[i] - v[i + 1]) < 1) ||
        (i > 0 &&
          i + 1 < linija.length &&
          Math.abs(v[i]) <= Math.abs(v[i - 1]) &&
          Math.abs(v[i]) <= Math.abs(v[i + 1]) &&
          Math.abs(v[i]) < 0.05);
      if (!kandidat) continue;
      let z = presjek(h1, h2, linija[i].z, korak);
      if (!z) continue;
      // „lijepa“ točka (npr. 2i umjesto 1,2·10⁻⁵ + 2i kod dodira) ako i ona pripada skupu
      const lijepa = C(
        Math.round(z.re * 1e4) / 1e4,
        Math.round(z.im * 1e4) / 1e4,
      );
      if (S.clan(lijepa)) z = lijepa;
      if (!unutra(s, [z.re, z.im])) continue;
      // nejednakosti moraju vrijediti, a ostale jednakosti (treća i dalje) biti zadovoljene
      if (!S.usporedbe.every((u) => u.op === "==" || vrijedi(u, z, S.odNule)))
        continue;
      if (
        jednakosti
          .slice(2)
          .some(([u]) => !(Math.abs(razlika(u, z, S.odNule)) < 1e-6))
      )
        continue;
      if (nadene.some((w) => Math.hypot(w.re - z.re, w.im - z.im) < korak / 10))
        continue;
      nadene.push(z);
    }
  }
  out.tocke = nadene.map((z) => ({ px: o.X(z.re), py: o.Y(z.im), z }));
  return out;
}

// ── čvorovi za „postavi“: mreža (korak) ili sjecišta kružnica i zraka (polarno) ──
export function cvorovi(s) {
  const out = [];
  if (s.polarno) {
    const c = tocka(s.polarno.sredina ?? 0) ?? [0, 0];
    const kk = broj(s.polarno.kut_korak);
    const k0 = broj(s.polarno.kut_od ?? 0) ?? 0;
    if (!(kk > 0)) return out;
    const n = Math.min(72, Math.floor((2 * Math.PI) / kk + 1e-9));
    const rs = (s.polarno.r ?? []).map((r) => ({ r: broj(r), izvor: r }));
    rs.forEach(({ r }, ri) => {
      if (!(r >= 0)) return;
      if (r === 0) return out.push({ x: c[0], y: c[1], ri, m: 0, r, kut: 0 });
      for (let m = 0; m < n; m++) {
        const kut = k0 + m * kk;
        out.push({
          x: c[0] + r * Math.cos(kut),
          y: c[1] + r * Math.sin(kut),
          ri,
          m,
          r,
          kut,
        });
      }
    });
  } else {
    const k = korakOf(s);
    if (!(k > 0)) return out;
    const red = (a, b) => {
      const v = [];
      for (
        let i = Math.ceil(a / k - 1e-9);
        i * k <= b + 1e-9 && v.length < 80;
        i++
      )
        v.push(Number((i * k).toPrecision(12)));
      return v;
    };
    const ys = red(s.y[0], s.y[1]);
    red(s.x[0], s.x[1]).forEach((x, i) =>
      ys.forEach((y, j) => out.push({ x, y, i, j })),
    );
  }
  return out.filter((c) => unutra(s, [c.x, c.y]));
}
// zapis čvora: u polarnom načinu r·e^{iφ} (ili r, φ), inače a + bi / (x, y)
export function texCvora(s, c) {
  if (!s.polarno) return texTocke(s, [c.x, c.y]);
  const alg = texTocke(s, [c.x, c.y]);
  if (!alg.includes("{,}") && !alg.includes("\\frac{\\sqrt")) return alg;
  const [r, f] = [texBroja(c.r), texBroja(c.kut)];
  if (!s.kompleksno) return `r = ${r},\\ \\varphi = ${f}`;
  return `${r === "1" ? "" : r}e^{i${f.startsWith("-") ? `\\left(${f}\\right)` : f}}`;
}
const blizu = (s, p, q) =>
  Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6 * Math.max(1, s.x[1] - s.x[0]);
const odgovorTocke = (s) => (s.odgovor ?? []).map(tocka);
const brojOd = (n, jedan, dva, pet) =>
  `${n} ${n % 10 === 1 && n % 100 !== 11 ? jedan : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? dva : pet}`;

// pripadnost zadanih točaka skupu S (indeksi), za „pripada“
export function pripadaju(s) {
  const S = pripremiSkup(s);
  return (s.tocke ?? [])
    .map((t, i) => [i, tocka(t)])
    .filter(([, p]) => p && S.clan(C(p[0], p[1])))
    .map(([i]) => i);
}

// Zašto točka p (ne)pripada S: rečenica s vrijednostima uvjeta.
function zasto(s, S, t, p) {
  const z = C(p[0], p[1]);
  const ime = `$${imeTocke(s, t, p)}$`;
  const vr = (n) => strana(n, z, S.odNule);
  const kriva = S.usporedbe.find((u) => !vrijedi(u, z, S.odNule));
  if (kriva) {
    const [a, b] = [vr(kriva.a), vr(kriva.b)];
    if (
      typeof a !== "number" ||
      typeof b !== "number" ||
      Number.isNaN(a) ||
      Number.isNaN(b)
    )
      return `${ime} ne pripada skupu: u njoj $${texUsporedbeKratko(kriva)}$ nema vrijednost (npr. $\\arg 0$ nije definiran).`;
    const [lijevo, desno] =
      kriva.saZ[0] || !kriva.saZ[1] ? [kriva.a, a] : [kriva.b, b];
    const drugo = kriva.saZ[0] || !kriva.saZ[1] ? b : a;
    const rel =
      Math.abs(desno - drugo) <= 1e-9 * Math.max(1, Math.abs(desno))
        ? "="
        : desno < drugo
          ? "<"
          : ">";
    if (rel === "=" && kriva.op !== "==")
      return `${ime} leži na rubu: $${tex(lijevo)} = ${texBroja(desno)}$, a uvjet $${texUsporedbeKratko(kriva)}$ je strog, pa rub ne pripada skupu.`;
    const vrijednost =
      kriva.saZ[0] && kriva.saZ[1]
        ? `$${tex(kriva.a)} = ${texBroja(a)}$ i $${tex(kriva.b)} = ${texBroja(b)}$`
        : `$${tex(lijevo)} = ${texBroja(desno)} ${kriva.op === "==" ? "\\neq" : rel} ${texBroja(drugo)}$`;
    return `${ime} ne pripada skupu: ${vrijednost}, a uvjet je $${texUsporedbeKratko(kriva)}$.`;
  }
  const naRubu = S.usporedbe.find(
    (u) =>
      u.op !== "==" &&
      Math.abs(vr(u.a) - vr(u.b)) <= 1e-9 * Math.max(1, Math.abs(vr(u.a))),
  );
  if (naRubu)
    return `${ime} pripada skupu: leži na rubu $${tex(naRubu.saZ[0] || !naRubu.saZ[1] ? naRubu.a : naRubu.b)} = ${texBroja(vr(naRubu.saZ[0] || !naRubu.saZ[1] ? naRubu.a : naRubu.b))}$, a uvjet $${texUsporedbeKratko(naRubu)}$ dopušta jednakost.`;
  const vrijednosti = [
    ...new Set(
      S.usporedbe
        .filter((u) => u.saZ[0] !== u.saZ[1])
        .map((u) => {
          const n = u.saZ[0] ? u.a : u.b;
          return `$${tex(n)} = ${texBroja(vr(n))}$`;
        }),
    ),
  ];
  return `${ime} pripada skupu: vrijede svi uvjeti${vrijednosti.length ? ` (${vrijednosti.join(", ")})` : ""}.`;
}
const texUsporedbeKratko = (u) => `${tex(u.a)} ${texOp(u.op)} ${tex(u.b)}`;

// Objašnjenje krive točke u „postavi“.
function zastoKriva(s, u, fale, sve) {
  const ime = `$${texTocke(s, u)}$`;
  const kompl = !!s.kompleksno;
  const ima = (q) =>
    fale.some((a) => blizu(s, a, q)) || sve.some((a) => blizu(s, a, q));
  if (Math.abs(u[1]) > 1e-9 && ima([u[0], -u[1]]))
    return kompl
      ? `Točka ${ime} je konjugat tražene (zrcalna preko realne osi): pazi na predznak imaginarnog dijela.`
      : `Točka ${ime} je zrcalna slika tražene preko osi $x$: pazi na predznak koordinate $y$.`;
  if (Math.abs(u[0]) > 1e-9 && ima([-u[0], u[1]]))
    return kompl
      ? `Točka ${ime} je zrcalna slika tražene preko imaginarne osi: pazi na predznak realnog dijela.`
      : `Točka ${ime} je zrcalna slika tražene preko osi $y$: pazi na predznak koordinate $x$.`;
  if ((Math.abs(u[0]) > 1e-9 || Math.abs(u[1]) > 1e-9) && ima([-u[0], -u[1]]))
    return `Točka ${ime} je simetrična traženoj s obzirom na ishodište${kompl ? " ($-z$ umjesto $z$)" : ""}: pazi na predznake.`;
  if (Math.abs(u[0] - u[1]) > 1e-9 && ima([u[1], u[0]]))
    return kompl
      ? `Kod točke ${ime} zamijenjeni su realni i imaginarni dio.`
      : `Kod točke ${ime} zamijenjene su koordinate $x$ i $y$.`;
  const c = tocka(s.polarno?.sredina ?? 0) ?? [0, 0];
  const r = (p) => Math.hypot(p[0] - c[0], p[1] - c[1]);
  const kut = (p) => Math.atan2(p[1] - c[1], p[0] - c[0]);
  const ciljevi = fale.length ? fale : sve;
  const mod = c[0] || c[1] ? `|z - (${texKompleksnog(C(c[0], c[1]))})|` : "|z|";
  if (r(u) > 1e-9 && ciljevi.some((a) => Math.abs(r(a) - r(u)) < 1e-6))
    return kompl
      ? `Točka ${ime} je na dobroj kružnici ($${mod} = ${texBroja(r(u))}$), ali kut (argument) nije dobar.`
      : `Točka ${ime} je na dobroj udaljenosti od središta, ali kut nije dobar.`;
  if (
    r(u) > 1e-9 &&
    ciljevi.some(
      (a) =>
        r(a) > 1e-9 &&
        Math.abs(Math.sin(kut(a) - kut(u))) < 1e-6 &&
        Math.cos(kut(a) - kut(u)) > 0,
    )
  )
    return kompl
      ? `Točka ${ime} ima dobar kut (argument), ali modul nije dobar: $${mod} = ${texBroja(r(u))}$.`
      : `Točka ${ime} je u dobrom smjeru, ali na krivoj udaljenosti od središta.`;
  return `Točka ${ime} nije rješenje.`;
}

export const ravnina = {
  tip: "ravnina",
  samoRucno: true,
  uloga: (s) => (s.nacin === "prikaz" ? POGLEDAJ : ODGOVOR),
  istrazi: () => false,
  opis: `Ravnina (Gaussova uz kompleksno: true) s točkama, crtama i skupom S zadanim uvjetima. Polja: tekst, nacin, x: [od, do], y: [od, do]
(raspon čuva omjer jer se crtaju kružnice), korak? (mreža i oznake na osima, zadano 1), kompleksno? (osi „Re“ i „Im“, točke u
zapisu a + bi), os_x?/os_y? (imena osi), arg_od_nule? (arg u [0, 2π⟩ umjesto ⟨−π, π]).
Točka je kompleksni izraz ("1+i", "2*exp(i*pi/3)", "sqrt(2)*(cos(pi/4)+i*sin(pi/4))", "3i") ili [x, y] (brojevi ili izrazi).
Izrazi: + − * / ^, zagrade, |…|, i, pi, e, funkcije re, im, abs, arg, conj, exp, ln, sqrt, sin, cos, tan, cis; „3i“ i „2pi“ bez *.
Crtež: kruznice?: [{sredina, r, isprekidano?}], zrake?: [{od? (zadano 0), kut (radijani, izraz), isprekidano?}],
pravci?: [{x} | {y} | {kroz: [A, B]}, isprekidano?], tocke?: [{z ili x, y, oznaka?, prazna?}] (oznaka kratka: "z₁", "$z_1$", "T").
skup?: popis uvjeta u z (x = Re z, y = Im z), svi moraju vrijediti: "abs(z-1-i)<=2", "re(z)>1", "1<abs(z-3-3i)<=2" (lanac),
"arg(z^3)==pi/2", "abs(z-1)<abs(z+1)". Usporedbe < <= > >= ==; obje strane realne (Re, Im, |·|, arg). Kod sam osjenča S,
rub crta punom crtom kad pripada S (≤, ≥) i isprekidano kad ne pripada (<, >); jednakost daje krivulju (npr. zrake), dvije
jednakosti daju točke (sjecišta).
- "prikaz": crtež i osjenčani S (Pogledaj).
- "postavi": učenik dodirom postavlja točke (ponovni dodir uklanja). Točke se lijepe na čvorove mreže (korak) ili, uz
  polarno: {r: [1, 2, 4], kut_korak: "pi/4", kut_od?, sredina?}, na sjecišta kružnica i zraka (n-ti korijeni; ponudi i krive
  polumjere, da modul nije zadan). odgovor: popis točaka (provjera kao skup, redoslijed nije bitan; svaka mora biti čvor);
  n? (koliko točaka, zadano duljina odgovora, prikazuje se kao „2 / 4“; n: false skriva broj). Kod piše poruke: konjugat ili
  zrcalno, dobra kružnica a krivi kut, dobar kut a krivi modul, fali ili višak točaka.
- "pripada": tocke (2–6, s oznakama) i skup; učenik označi koje točke pripadaju S. Točan odgovor računa kod; odgovor?
  (popis oznaka ili indeksa) samo kao provjera autora. Poruka kaže koji uvjet ne vrijedi („|z−1−i| = √5 > 2“) ili da je
  točka na rubu sa strogim uvjetom. S se osjenča tek nakon provjere.`,
  primjer: {
    tip: "ravnina",
    nacin: "pripada",
    kompleksno: true,
    tekst:
      "Skup $S$ zadan je uvjetima $1 < |z - 3 - 3i| \\le 2$ i $\\operatorname{Re} z < 3$. Označi točke koje pripadaju skupu $S$.",
    x: [-1, 7],
    y: [-0.5, 6.5],
    skup: ["1<abs(z-3-3i)<=2", "re(z)<3"],
    tocke: [
      { z: "1+3i", oznaka: "z₁" },
      { z: "2+3i", oznaka: "z₂" },
      { z: "3+5i", oznaka: "z₃" },
      { z: "2+2i", oznaka: "z₄" },
    ],
  },
  primjeri: [
    {
      tip: "ravnina",
      nacin: "prikaz",
      kompleksno: true,
      tekst:
        "Skup $1 < |z - 3 - 3i| \\le 2$, $\\operatorname{Re} z < 3$: lijeva polovina vijenca. Vanjska kružnica pripada skupu (puna crta), unutarnja i pravac $\\operatorname{Re} z = 3$ ne pripadaju (isprekidano).",
      x: [-1, 7],
      y: [-0.5, 6.5],
      skup: ["1<abs(z-3-3i)", "abs(z-3-3i)<=2", "re(z)<3"],
      tocke: [{ z: "3+3i", oznaka: "T" }],
    },
    {
      tip: "ravnina",
      nacin: "postavi",
      kompleksno: true,
      tekst: "Postavi u Gaussovu ravninu sva rješenja jednadžbe $z^4 = -16$.",
      x: [-4.7, 4.7],
      y: [-4.5, 4.5],
      polarno: { r: [1, 2, 4], kut_korak: "pi/4" },
      odgovor: [
        "2*exp(i*pi/4)",
        "2*exp(3*i*pi/4)",
        "2*exp(5*i*pi/4)",
        "2*exp(7*i*pi/4)",
      ],
    },
    {
      tip: "ravnina",
      nacin: "postavi",
      kompleksno: true,
      tekst:
        "Zadan je $z = 2 + 3i$ (na crtežu). Postavi točke $\\bar z$ i $-z$.",
      x: [-4.5, 4.5],
      y: [-4, 4],
      tocke: [{ z: "2+3i", oznaka: "z" }],
      odgovor: ["2-3i", "-2-3i"],
    },
    {
      tip: "ravnina",
      nacin: "prikaz",
      kompleksno: true,
      tekst:
        "Uvjet $\\arg(z^2) = \\frac{\\pi}{2}$ zadovoljavaju točke na dvjema zrakama iz ishodišta (bez samog ishodišta). Rješenja jednadžbe $z^4 = -16$ leže na kružnici $|z| = 2$.",
      x: [-3.2, 3.2],
      y: [-3, 3],
      skup: ["arg(z^2)==pi/2"],
      kruznice: [{ sredina: "0", r: 2, isprekidano: true }],
      tocke: [
        { z: "0", prazna: true },
        { z: "2*exp(i*pi/4)", oznaka: "z₀" },
        { z: "2*exp(3*i*pi/4)", oznaka: "z₁" },
        { z: "2*exp(5*i*pi/4)", oznaka: "z₂" },
        { z: "2*exp(7*i*pi/4)", oznaka: "z₃" },
      ],
    },
    {
      tip: "ravnina",
      nacin: "pripada",
      kompleksno: true,
      arg_od_nule: true,
      tekst:
        "Koje točke zadovoljavaju oba uvjeta $|z - 1 - 2i| = 1$ i $\\arg(z^3) = \\frac{3\\pi}{2}$ (argument u $[0, 2\\pi\\rangle$)?",
      x: [-2.6, 2.8],
      y: [-1.4, 3.6],
      skup: ["abs(z-1-2i)==1", "arg(z^3)==3*pi/2"],
      kruznice: [{ sredina: "1+2i", r: 1 }],
      tocke: [
        { z: "2i", oznaka: "A" },
        { z: "1+i", oznaka: "B" },
        { z: "-i", oznaka: "C" },
      ],
    },
  ],

  validate(s) {
    const { list, need } = problems();
    need(
      NACINI.includes(s.nacin),
      `ravnina.nacin mora biti ${NACINI.join(", ")}`,
    );
    need(isText(s.tekst), "ravnina treba „tekst“");
    const osi = need(
      Array.isArray(s.x) &&
        Array.isArray(s.y) &&
        s.x.length === 2 &&
        s.y.length === 2 &&
        [...s.x, ...s.y].every(isNum) &&
        s.x[1] > s.x[0] &&
        s.y[1] > s.y[0],
      "x i y su [od, do] (brojevi) uz od < do",
    );
    const k = korakOf(s);
    if (need(k > 0, "korak mora biti pozitivan broj") && osi) {
      need(
        (s.x[1] - s.x[0]) / k <= 40 && (s.y[1] - s.y[0]) / k <= 40,
        "mreža ima previše crta (najviše 40 po osi): povećaj korak",
      );
    }
    if (osi && k > 0) {
      const o = okvirCrteza({ x: s.x, y: s.y, korak_y: k });
      if (!o.jednako) {
        const omjer = (s.y[1] - s.y[0]) / (s.x[1] - s.x[0]);
        need(
          false,
          `raspon x i y ne čuva omjer (y/x = ${omjer.toFixed(2)}), pa bi se kružnica izobličila: ${o.H >= 380 ? "proširi x ili smanji y" : "proširi y ili smanji x"}`,
        );
      }
    }
    for (const p of ["os_x", "os_y"])
      if (s[p] != null) need(isText(s[p]), `${p} mora biti tekst`);
    const uCrtezu = (p, gdje) =>
      need(
        !osi || unutra(s, p),
        `${gdje} je izvan crteža (x ${s.x?.join(" do ")}, y ${s.y?.join(" do ")})`,
      );
    const tockaOk = (t, gdje) => {
      const p = tocka(t);
      if (
        need(
          p != null,
          `${gdje} mora biti točka: kompleksni izraz ("1+i") ili [x, y]`,
        )
      )
        uCrtezu(p, gdje);
      return p;
    };
    for (const [i, kr] of (s.kruznice ?? []).entries()) {
      tockaOk(kr?.sredina, `kruznice[${i}].sredina`);
      need(broj(kr?.r) > 0, `kruznice[${i}].r mora biti pozitivan broj`);
    }
    for (const [i, z] of (s.zrake ?? []).entries()) {
      tockaOk(z?.od ?? 0, `zrake[${i}].od`);
      need(
        broj(z?.kut) != null,
        `zrake[${i}].kut mora biti broj ili izraz (radijani, npr. "pi/3")`,
      );
    }
    for (const [i, pr] of (s.pravci ?? []).entries()) {
      const vrste = ["x", "y", "kroz"].filter((p) => pr?.[p] != null);
      if (
        !need(
          vrste.length === 1,
          `pravci[${i}] treba točno jedno od: x, y, kroz`,
        )
      )
        continue;
      if (vrste[0] === "kroz") {
        const [A, B] =
          Array.isArray(pr.kroz) && pr.kroz.length === 2
            ? pr.kroz.map(tocka)
            : [null, null];
        need(
          A && B && !blizu(s, A, B),
          `pravci[${i}].kroz treba dvije različite točke`,
        );
      } else
        need(
          broj(pr[vrste[0]]) != null,
          `pravci[${i}].${vrste[0]} mora biti broj`,
        );
    }
    const tocke = (s.tocke ?? []).map((t, i) => tockaOk(t, `tocke[${i}]`));
    // skup
    let S = null;
    if (
      s.skup != null &&
      need(
        Array.isArray(s.skup) && s.skup.length >= 1 && s.skup.length <= 6,
        'skup je popis 1–6 uvjeta (tekst), npr. ["abs(z-1-i)<=2", "re(z)>1"]',
      )
    ) {
      let dobri = true;
      s.skup.forEach((src, i) => {
        try {
          for (const u of uvjet(src)) {
            const uzorci = [];
            if (osi)
              for (let a = 0; a <= 8; a++)
                for (let b = 0; b <= 8; b++)
                  uzorci.push(
                    C(
                      s.x[0] + ((s.x[1] - s.x[0]) * (a + 0.37)) / 9,
                      s.y[0] + ((s.y[1] - s.y[0]) * (b + 0.61)) / 9,
                    ),
                  );
            const nijeRealno = uzorci.some((z) =>
              [u.a, u.b].some(
                (n) => typeof strana(n, z, s.arg_od_nule) === "object",
              ),
            );
            if (
              !need(
                !nijeRealno,
                `skup[${i}] „${src}“: obje strane usporedbe moraju biti realni brojevi (Re, Im, |·|, arg); kompleksne brojeve ne možemo uspoređivati`,
              )
            )
              dobri = false;
            need(u.saZ[0] || u.saZ[1], `skup[${i}] „${src}“ ne ovisi o z`);
            // arg(…) = c: c mora biti u rasponu arg-a
            for (const [n, m] of [
              [u.a, u.b],
              [u.b, u.a],
            ]) {
              if (n.fn !== "arg" || u.op !== "==") continue;
              const c = konstanta(m);
              if (c == null) continue;
              if (s.arg_od_nule)
                need(
                  c >= -1e-12 && c < 2 * Math.PI - 1e-12,
                  `skup[${i}] „${src}“: uz arg_od_nule arg je u [0, 2π⟩, pa vrijednost ${texBroja(c)} nije moguća`,
                );
              else
                need(
                  c > -Math.PI + 1e-12 && c <= Math.PI + 1e-12,
                  `skup[${i}] „${src}“: arg je u ⟨−π, π], pa ${texBroja(c)} nije moguće; dodaj arg_od_nule: true (arg u [0, 2π⟩) ili piši ${texBroja(c - 2 * Math.PI)}`,
                );
            }
          }
        } catch (e) {
          dobri = false;
          need(false, `skup[${i}] „${src}“: ${e.message}`);
        }
      });
      if (dobri && osi && !list.length) {
        S = pripremiSkup(s);
        const c = crtezSkupa(s);
        need(
          c && (c.podrucje || c.krivulje.length || c.tocke.length),
          "skup S nema nijednu točku unutar crteža: provjeri uvjete ili proširi x i y",
        );
      }
    }
    if (s.nacin !== "postavi")
      need(
        s.polarno == null && s.n == null,
        "polarno i n su samo za „postavi“",
      );
    if (s.nacin === "prikaz") noAnswerFields(s, need);
    if (s.nacin === "postavi") {
      const c = osi ? cvorovi(s) : [];
      if (s.polarno != null) {
        const pol = s.polarno;
        need(
          Array.isArray(pol.r) &&
            pol.r.length >= 1 &&
            pol.r.length <= 6 &&
            pol.r.every((r) => broj(r) >= 0),
          "polarno.r je popis 1–6 polumjera (brojevi ili izrazi)",
        );
        const kk = broj(pol.kut_korak);
        if (
          need(
            kk > 0,
            'polarno.kut_korak mora biti pozitivan kut u radijanima, npr. "pi/6"',
          )
        )
          need(
            (2 * Math.PI) / kk <= 72,
            "polarno.kut_korak je premalen (najviše 72 zrake)",
          );
        if (pol.kut_od != null)
          need(
            broj(pol.kut_od) != null,
            "polarno.kut_od mora biti kut (izraz)",
          );
        if (pol.sredina != null) tockaOk(pol.sredina, "polarno.sredina");
        need(c.length > 0, "polarno: nijedno sjecište nije unutar crteža");
      }
      if (
        need(
          Array.isArray(s.odgovor) &&
            s.odgovor.length >= 1 &&
            s.odgovor.length <= 12,
          "„postavi“ treba odgovor: popis 1–12 točaka",
        )
      ) {
        const odg = s.odgovor.map((t, i) => tockaOk(t, `odgovor[${i}]`));
        odg.forEach((p, i) => {
          if (!p) return;
          if (osi && c.length)
            need(
              c.some((q) => blizu(s, p, [q.x, q.y])),
              s.polarno
                ? `odgovor[${i}] nije sjecište kružnice i zrake iz polarno, pa ga učenik ne može postaviti`
                : `odgovor[${i}] nije čvor mreže (korak ${k}), pa ga učenik ne može postaviti`,
            );
          need(
            !odg.some((q, j) => j < i && q && blizu(s, p, q)),
            `odgovor[${i}] se ponavlja`,
          );
          need(
            !tocke.some((q) => q && blizu(s, p, q)),
            `odgovor[${i}] je već nacrtan u tocke, pa bi ga učenik samo dodirnuo`,
          );
        });
      }
      if (s.n != null && s.n !== false)
        need(
          Number.isInteger(s.n) && s.n === s.odgovor?.length,
          "n mora biti broj točaka u odgovoru (ili false da se broj ne prikazuje)",
        );
    }
    if (s.nacin === "pripada") {
      need(
        Array.isArray(s.skup) && s.skup.length > 0,
        "„pripada“ treba skup (uvjete)",
      );
      if (
        need(
          (s.tocke ?? []).length >= 2 && s.tocke.length <= 6,
          "„pripada“ treba 2–6 točaka (tocke)",
        )
      ) {
        tocke.forEach((p, i) =>
          need(
            !p || !tocke.some((q, j) => j < i && q && blizu(s, p, q)),
            `tocke[${i}] se ponavlja`,
          ),
        );
      }
      if (S && s.odgovor != null) {
        const kod = pripadaju(s);
        const autor = Array.isArray(s.odgovor)
          ? s.odgovor.map((o) =>
              typeof o === "number"
                ? o
                : (s.tocke ?? []).findIndex((t) => t?.oznaka === o),
            )
          : null;
        if (
          need(
            autor && autor.every((i) => i >= 0 && i < (s.tocke ?? []).length),
            "odgovor je popis oznaka ili indeksa točaka koje pripadaju S",
          )
        ) {
          (s.tocke ?? []).forEach((t, i) => {
            if (kod.includes(i) === autor.includes(i)) return;
            need(
              false,
              `odgovor se ne slaže s uvjetima: ${zasto(s, S, t, tocka(t)).replace(/\$/g, "")}`,
            );
          });
        }
      }
    }
    return list;
  },

  check(s, odgovor) {
    if (s.nacin === "pripada") {
      const tocno = pripadaju(s);
      const ozn = Array.isArray(odgovor)
        ? odgovor.filter((i) => Number.isInteger(i))
        : [];
      const krive = (s.tocke ?? [])
        .map((t, i) => i)
        .filter((i) => tocno.includes(i) !== ozn.includes(i));
      if (!krive.length) return { tocno: true };
      const S = pripremiSkup(s);
      const prva = krive[0];
      const uvod =
        krive.length > 1
          ? `Krivo je označeno: ${brojOd(krive.length, "točka", "točke", "točaka")}. `
          : "";
      return {
        tocno: false,
        poruka: uvod + zasto(s, S, s.tocke[prva], tocka(s.tocke[prva])),
        krive,
      };
    }
    if (s.nacin === "postavi") {
      const sve = odgovorTocke(s);
      const ucenik = [];
      for (const p of Array.isArray(odgovor) ? odgovor : [])
        if (
          Array.isArray(p) &&
          p.length === 2 &&
          p.every(isNum) &&
          !ucenik.some((q) => blizu(s, p, q))
        )
          ucenik.push(p);
      if (!ucenik.length)
        return {
          tocno: false,
          poruka: "Postavi točke: dodirni mjesto na crtežu.",
          prazno: true,
        };
      const visak = ucenik.filter((p) => !sve.some((a) => blizu(s, a, p)));
      const fale = sve.filter((a) => !ucenik.some((p) => blizu(s, a, p)));
      if (!visak.length && !fale.length) return { tocno: true };
      if (visak.length) {
        const obj = zastoKriva(s, visak[0], fale, sve);
        const uvod = !fale.length
          ? "Imaš točku viška. "
          : visak.length > 1
            ? `Nije dobro: ${brojOd(visak.length, "točka", "točke", "točaka")}. `
            : "";
        return { tocno: false, poruka: uvod + obj };
      }
      return {
        tocno: false,
        poruka: `Sve postavljene točke su dobre, ali fali još ${brojOd(fale.length, "točka", "točke", "točaka")}.`,
      };
    }
    return { tocno: false, poruka: "Ovaj korak nema provjeru." };
  },

  tocanOdgovor(s) {
    if (s.nacin === "pripada") {
      const p = pripadaju(s);
      if (!p.length) return "Nijedna točka ne pripada skupu.";
      return `Skupu pripadaju: ${p.map((i) => `$${imeTocke(s, s.tocke[i], tocka(s.tocke[i]))}$`).join(", ")}`;
    }
    if (s.nacin === "postavi") {
      const c = s.polarno ? cvorovi(s) : [];
      return odgovorTocke(s)
        .map((p) => {
          const cv = c.find((q) => p && blizu(s, p, [q.x, q.y]));
          return `$${cv ? texCvora(s, cv) : texTocke(s, p)}$`;
        })
        .join(", ");
    }
    return "";
  },

  kljucOdgovora(s) {
    const r = (p) => p.map((v) => Math.round(v * 1e6) / 1e6).join(";");
    if (s.nacin === "postavi")
      return odgovorTocke(s).filter(Boolean).map(r).sort().join("|");
    if (s.nacin === "pripada")
      return (
        pripadaju(s)
          .map((i) => r(tocka(s.tocke[i])))
          .sort()
          .join("|") || "prazno"
      );
    return null;
  },
};

// konstantna strana usporedbe (bez z) → broj
function konstanta(n) {
  try {
    const v = strana(n, null, false);
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}
