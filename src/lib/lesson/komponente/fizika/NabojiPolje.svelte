<script>
  // Točkasti naboji u ravnini: polje u sondi (sastavnice i zbroj), sile među nabojima, silnice, vodljiva kugla s grafom
  // E(r); zadaci „smjer“ (okreni strelicu) i „nula“ (postavi točku nultog polja). Dodir kugli crta _ElektrostatikaDodir.
  // Svi brojevi i smjerovi dolaze iz kataloga (_elektrostatika.js), istog koda koji provjerava odgovor.
  import { untrack } from "svelte";
  import Md from "../Md.svelte";
  import Dodir from "./_ElektrostatikaDodir.svelte";
  import {
    naboji_polje,
    SREDSTVA_ZADANA,
    opisSmjera,
  } from "$lib/lesson/katalog/fizika/naboji_polje.js";
  import {
    polje,
    silaNa,
    ciljniVektor,
    kutVektora,
    K,
  } from "$lib/lesson/katalog/fizika/_elektrostatika.js";
  import { formatNumber, formatSci } from "$lib/lesson/core/number.js";
  import {
    svgTocka,
    strelica,
    oznaka,
    oznakaTekst,
    lijepiKorak,
    ogranici,
  } from "./_elektrostatika.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const dodirScena = untrack(
    () => nacin === "dodir" || (nacin === "istrazi" && spec.kugle != null),
  );
  const pitanje = nacin !== "istrazi";

  // ── stanje scene (u istrazi se naboji, kugla i sredstvo mijenjaju) ──
  let naboji = $state(
    untrack(() => (spec.naboji ?? []).map((n) => ({ ...n }))),
  );
  let kugla = $state(untrack(() => (spec.kugla ? { ...spec.kugla } : null)));
  let er = $state(untrack(() => spec.sredstvo?.er ?? 1));
  let nazivSredstva = $state(untrack(() => spec.sredstvo?.naziv ?? "zrak"));
  let scena = $derived({ naboji, kugla, sredstvo: { er } });

  const prikazi = untrack(
    () =>
      spec.prikazi ??
      (nacin === "istrazi"
        ? (spec.naboji ?? []).length >= 2
          ? ["polje", "sastavnice"]
          : ["polje"]
        : ["sastavnice"]),
  );
  const ima = (p) => prikazi.includes(p);
  const imaSondu =
    nacin === "istrazi" &&
    !dodirScena &&
    (ima("polje") || ima("sastavnice") || ima("Er_graf"));
  const kuglaOznaka = untrack(() => spec.kugla?.oznaka ?? "Q");

  // ── okvir: svjetske koordinate (cm, y gore) → viewBox ──
  const W = 360;
  const M = 58;
  const okv = untrack(() => {
    const pts = [];
    for (const n of spec.naboji ?? []) pts.push([n.x, n.y]);
    for (const t of spec.tocke ?? []) pts.push([t.x, t.y]);
    if (spec.kugla)
      pts.push(
        [spec.kugla.x - spec.kugla.R, spec.kugla.y - spec.kugla.R],
        [spec.kugla.x + spec.kugla.R, spec.kugla.y + spec.kugla.R],
      );
    if (nacin === "nula") {
      const z = naboji_polje.nula(spec);
      if (z) pts.push([z.x, z.y]);
    }
    if (!pts.length) pts.push([0, 0]);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const spanX = Math.max(x1 - x0, 6);
    const spanY = y1 - y0;
    let sc = (W - 2 * M) / spanX;
    let H = Math.max(200, spanY * sc + 2 * M);
    if (H > 320) {
      sc = Math.min(sc, (320 - 2 * M) / spanY);
      H = 320;
    }
    return { sc, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, H: Math.round(H) };
  });
  const H = okv.H;
  const X = (x) => W / 2 + (x - okv.cx) * okv.sc;
  const Y = (y) => H / 2 - (y - okv.cy) * okv.sc;
  const wx = (px) => okv.cx + (px - W / 2) / okv.sc;
  const wy = (py) => okv.cy - (py - H / 2) / okv.sc;
  const f1 = (n) => Math.round(n * 10) / 10;

  const mreza = lijepiKorak((W - 16) / okv.sc, 9);
  const crteMreze = (() => {
    const v = [];
    for (let x = Math.ceil(wx(0) / mreza) * mreza; x <= wx(W); x += mreza)
      v.push({ k: "x", p: f1(X(x)) });
    for (let y = Math.ceil(wy(H) / mreza) * mreza; y <= wy(0); y += mreza)
      v.push({ k: "y", p: f1(Y(y)) });
    return v;
  })();

  // ── izgled naboja ──
  const rNaboja = (q) => 11 + 5 * Math.min(1, Math.sqrt(Math.abs(q) / 50));
  const fmtQ = (q) => `${q > 0 ? "+" : ""}${formatNumber(q)} nC`;
  const fmtE = (v) => `${formatSci(v)} N/C`;
  const fmtF = (v) => `${formatSci(v)} N`;
  const fmtCm = (v) => `${formatNumber(Number(v.toPrecision(3)), 1)} cm`;

  // ── sredstvo ──
  const sredstva = untrack(() => {
    const popis = spec.sredstva ?? SREDSTVA_ZADANA;
    const s = spec.sredstvo;
    return s && !popis.some((m) => m.er === s.er) ? [s, ...popis] : popis;
  });
  let tonSredstva = $derived(
    nazivSredstva === "voda"
      ? "var(--lx-water)"
      : er > 1
        ? "var(--warn)"
        : null,
  );

  // ── silnice: od pozitivnih izvora (ili unatrag od negativnih), RK2 po smjeru polja ──
  function smjerPolja(x, y) {
    let ex = 0;
    let ey = 0;
    for (const n of naboji) {
      const dx = x - n.x;
      const dy = y - n.y;
      const r2 = dx * dx + dy * dy;
      if (r2 < 1e-9) return null;
      const r = Math.sqrt(r2);
      ex += (n.q * dx) / (r2 * r);
      ey += (n.q * dy) / (r2 * r);
    }
    if (kugla) {
      const dx = x - kugla.x;
      const dy = y - kugla.y;
      const r2 = dx * dx + dy * dy;
      if (r2 < kugla.R * kugla.R * 0.999) return null;
      const r = Math.sqrt(r2);
      ex += (kugla.q * dx) / (r2 * r);
      ey += (kugla.q * dy) / (r2 * r);
    }
    const L = Math.hypot(ex, ey);
    return L > 0 ? [ex / L, ey / L] : null;
  }
  let silnice = $derived.by(() => {
    if (!ima("silnice") || (pitanje && !otkrij)) return [];
    const izvori = [
      ...naboji.map((n) => ({
        x: n.x,
        y: n.y,
        q: n.q,
        r0: (rNaboja(n.q) + 2) / okv.sc,
      })),
      ...(kugla
        ? [{ x: kugla.x, y: kugla.y, q: kugla.q, r0: kugla.R * 1.001 }]
        : []),
    ];
    const plus = izvori.filter((i) => i.q > 0);
    const smjer = plus.length ? 1 : -1;
    const pocetni = plus.length ? plus : izvori.filter((i) => i.q < 0);
    const qmax = Math.max(...pocetni.map((i) => Math.abs(i.q)), 1e-9);
    const korak = 3.5 / okv.sc;
    const rub = { x0: wx(-20), x1: wx(W + 20), y0: wy(H + 20), y1: wy(-20) };
    const out = [];
    for (const izv of pocetni) {
      const n = Math.max(4, Math.round(14 * Math.sqrt(Math.abs(izv.q) / qmax)));
      for (let k = 0; k < n; k++) {
        const a = (2 * Math.PI * (k + 0.5)) / n;
        let x = izv.x + izv.r0 * Math.cos(a);
        let y = izv.y + izv.r0 * Math.sin(a);
        const tocke = [[X(x), Y(y)]];
        for (let i = 0; i < 420; i++) {
          const d1 = smjerPolja(x, y);
          if (!d1) break;
          const mx = x + (smjer * d1[0] * korak) / 2;
          const my = y + (smjer * d1[1] * korak) / 2;
          const d2 = smjerPolja(mx, my);
          if (!d2) break;
          x += smjer * d2[0] * korak;
          y += smjer * d2[1] * korak;
          if (x < rub.x0 || x > rub.x1 || y < rub.y0 || y > rub.y1) break;
          tocke.push([X(x), Y(y)]);
          if (
            izvori.some(
              (o) => o.q * izv.q < 0 && Math.hypot(x - o.x, y - o.y) < o.r0,
            )
          )
            break;
        }
        if (tocke.length < 3) continue;
        const sredina = Math.floor(tocke.length * 0.45);
        const [ax, ay] = tocke[sredina];
        const [bx, by] = tocke[Math.min(tocke.length - 1, sredina + 1)];
        const glava =
          smjer > 0
            ? strelica(ax, ay, bx + (bx - ax) * 3, by + (by - ay) * 3, 6, 0.6)
                .glava
            : strelica(bx, by, ax - (bx - ax) * 3, ay - (by - ay) * 3, 6, 0.6)
                .glava;
        out.push({
          d: "M" + tocke.map((p) => `${f1(p[0])},${f1(p[1])}`).join(" L"),
          glava,
        });
      }
    }
    return out;
  });

  // ── vektori u točki: duljine razmjerne iznosu, najduži 70 px ──
  // Sastavnice na istom pravcu (točka na spojnici) crtaju se pomaknute ispod zbroja, svaka u svom redu, da se ne
  // preklapaju sa zbrojem i međusobno.
  function vektoriU(px, py, sastavnice, zbroj, maxLen = 70) {
    const najveci = Math.max(
      zbroj.iznos,
      ...sastavnice.map((c) => c.iznos),
      1e-30,
    );
    const sc = maxLen / najveci;
    const smjer = (c) => {
      const n = Math.hypot(c.x, c.y) || 1;
      return [c.x / n, -c.y / n];
    };
    const ref = smjer(sastavnice.find((c) => c.iznos > 0) ?? zbroj);
    const pravac =
      sastavnice.length > 1 &&
      sastavnice.every(
        (c) =>
          c.iznos === 0 ||
          Math.abs(smjer(c)[0] * ref[1] - smjer(c)[1] * ref[0]) < 0.06,
      );
    // okomito na pravac, prema dolje (ili udesno za okomit pravac)
    let okom = [-ref[1], ref[0]];
    if (okom[1] < 0 || (Math.abs(okom[1]) < 1e-9 && okom[0] < 0))
      okom = [-okom[0], -okom[1]];
    const v = (c, k) => {
      const [ux, uy] = smjer(c);
      const L = c.iznos * sc;
      const ox = px + (k ? okom[0] * 13 * k : 0);
      const oy = py + (k ? okom[1] * 13 * k : 0);
      return {
        ...c,
        ...strelica(ox, oy, ox + ux * L, oy + uy * L, 9),
        vrh: [ox + ux * (L + 11), oy + uy * (L + 11)],
      };
    };
    return {
      sastavnice: sastavnice.map((c, i) => v(c, pravac ? i + 1 : 0)),
      zbroj: v(zbroj, 0),
    };
  }
  const bojaIzvora = (o) => {
    const n = naboji.find((m) => m.oznaka === o);
    const q = n ? n.q : kugla?.q;
    return q > 0 ? "var(--np-plus)" : "var(--np-minus)";
  };

  // ── sonda (istrazi) ──
  let sonda = $state(
    untrack(() => {
      const t = spec.tocke?.[0];
      if (t) return { x: t.x, y: t.y, oznaka: t.oznaka };
      if (spec.kugla)
        return {
          x: spec.kugla.x + spec.kugla.R * 1.5,
          y: spec.kugla.y,
          oznaka: "T",
        };
      return { x: wx(W / 2), y: wy(H / 2) + 40 / okv.sc, oznaka: "T" };
    }),
  );
  let poljeSonde = $derived(
    imaSondu ? polje(scena, sonda.x, sonda.y, er) : null,
  );
  let vektoriSonde = $derived.by(() => {
    const p = poljeSonde;
    if (!p || !Number.isFinite(p.E)) return null;
    const sast = p.sastavnice
      .filter((c) => c.E > 0)
      .map((c) => ({ oznaka: c.oznaka, x: c.Ex, y: c.Ey, iznos: c.E }));
    return vektoriU(X(sonda.x), Y(sonda.y), sast, {
      oznaka: "E",
      x: p.Ex,
      y: p.Ey,
      iznos: p.E,
    });
  });
  let rSonde = $derived(
    kugla ? Math.hypot(sonda.x - kugla.x, sonda.y - kugla.y) : null,
  );
  let gdjeSonda = $derived(
    rSonde == null
      ? ""
      : rSonde < (kugla.R_unutra ?? kugla.R) - 1e-9
        ? kugla.R_unutra
          ? "u šupljini"
          : "unutar kugle"
        : rSonde < kugla.R - 1e-9
          ? "u metalu"
          : rSonde < kugla.R + 0.05 * kugla.R
            ? "uz površinu"
            : "izvan kugle",
  );

  // ── sile na nabojima ──
  let sile = $derived.by(() => {
    if (!ima("sile")) return [];
    const sve = naboji.map((n, i) => ({ i, ...silaNa(scena, i, er) }));
    const najveca = Math.max(...sve.map((f) => f.F), 1e-30);
    return sve.map((f) => {
      const n = naboji[f.i];
      const L = 22 + 40 * (f.F / najveca);
      const u = Math.hypot(f.Fx, f.Fy) || 1;
      const r0 = rNaboja(n.q) + 2;
      const x0 = X(n.x) + (f.Fx / u) * r0;
      const y0 = Y(n.y) - (f.Fy / u) * r0;
      return {
        ...f,
        ...strelica(x0, y0, x0 + (f.Fx / u) * L, y0 - (f.Fy / u) * L, 9),
        vrh: [x0 + (f.Fx / u) * (L + 10), y0 - (f.Fy / u) * (L + 10)],
      };
    });
  });
  let privlacna = $derived(
    naboji.length === 2 && naboji[0].q * naboji[1].q < 0,
  );

  // ── smjer ──
  const cilj = untrack(() => (nacin === "smjer" ? ciljniVektor(spec) : null));
  const tocanKut = cilj ? kutVektora(cilj.x, cilj.y) : null;
  const ciljTocka = cilj ? cilj.tocka : null;
  const DULJ = 70;
  let kut = $state(null);
  let poslano = $state(null);

  // ── nula ──
  const nula = untrack(() =>
    nacin === "nula" ? naboji_polje.nula(spec) : null,
  );
  let marker = $state(
    untrack(() => {
      if (nacin !== "nula") return null;
      const [a, b] = spec.naboji;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      return {
        x: (a.x + b.x) / 2 - ((b.y - a.y) / d) * d * 0.3,
        y: (a.y + b.y) / 2 + ((b.x - a.x) / d) * d * 0.3,
      };
    }),
  );

  let otkrij = $derived(pitanje && (pokazi || !!ishod?.tocno));
  let promijenjeno = $derived(
    nacin === "smjer"
      ? kut !== poslano
      : nacin === "nula"
        ? !poslano || poslano.x !== marker.x || poslano.y !== marker.y
        : true,
  );
  let stanje = $derived(
    otkrij
      ? "ok"
      : ishod && !ishod.tocno && !ishod.prazno && !promijenjeno
        ? "bad"
        : "",
  );
  let aktivno = $derived(
    !dodirScena &&
      !locked &&
      (nacin === "istrazi" || nacin === "smjer" || nacin === "nula"),
  );

  $effect(() => {
    if (!pokazi) return;
    untrack(() => {
      if (nacin === "smjer") kut = Math.round(tocanKut);
      if (nacin === "nula" && nula) marker = { x: nula.x, y: nula.y };
    });
  });

  // vektori uz točan odgovor (smjer) ili uz postavljenu točku nakon provjere (nula)
  let vektoriOdgovora = $derived.by(() => {
    if (nacin === "smjer" && otkrij)
      return vektoriU(
        X(ciljTocka.x),
        Y(ciljTocka.y),
        cilj.sastavnice.filter((c) => c.iznos > 0),
        {
          oznaka: cilj.jedinica === "N" ? "F" : "E",
          x: cilj.x,
          y: cilj.y,
          iznos: cilj.iznos,
        },
      );
    if (
      nacin === "nula" &&
      (otkrij || (ishod && !ishod.prazno && !promijenjeno))
    ) {
      const p = polje(scena, marker.x, marker.y, er);
      if (!Number.isFinite(p.E)) return null;
      const sast = p.sastavnice.map((c) => ({
        oznaka: c.oznaka,
        x: c.Ex,
        y: c.Ey,
        iznos: c.E,
      }));
      const v = vektoriU(
        X(marker.x),
        Y(marker.y),
        sast,
        { oznaka: "E", x: p.Ex, y: p.Ey, iznos: otkrij ? 0 : p.E },
        42,
      );
      return v;
    }
    return null;
  });

  // ── povlačenje ──
  let svgEl = $state();
  let vuce = null;

  function svjetska(e) {
    const p = svgTocka(svgEl, e);
    return p && { px: ogranici(p.x, 6, W - 6), py: ogranici(p.y, 6, H - 6) };
  }
  function slobodno(x, y, osim) {
    if (naboji.some((n, j) => j !== osim && Math.hypot(n.x - x, n.y - y) < 1))
      return false;
    if (kugla && Math.hypot(kugla.x - x, kugla.y - y) < kugla.R + 0.5)
      return false;
    return true;
  }
  function primijeni(p) {
    if (!vuce || !p) return;
    if (vuce.vrsta === "naboj") {
      const x = wx(p.px);
      const y = wy(p.py);
      if (slobodno(x, y, vuce.i)) {
        naboji[vuce.i].x = x;
        naboji[vuce.i].y = y;
      }
    } else if (vuce.vrsta === "sonda") {
      sonda.x = wx(p.px);
      sonda.y = wy(p.py);
    } else if (vuce.vrsta === "strelica") {
      const dx = p.px - X(ciljTocka.x);
      const dy = Y(ciljTocka.y) - p.py;
      if (Math.hypot(dx, dy) > 4) kut = Math.round(kutVektora(dx, dy));
    } else if (vuce.vrsta === "marker") {
      postaviMarker(wx(p.px), wy(p.py));
    }
  }
  // točka P: na pravcu kroz naboje se „zalijepi“ (8 px), uzduž pravca korak 0,1 cm
  function postaviMarker(x, y) {
    const [a, b] = naboji;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / d;
    const uy = (b.y - a.y) / d;
    let s = (x - a.x) * ux + (y - a.y) * uy;
    let t = -(x - a.x) * uy + (y - a.y) * ux;
    s = Math.round(s * 10) / 10;
    t = Math.abs(t * okv.sc) < 8 ? 0 : Math.round(t * 10) / 10;
    marker = { x: a.x + s * ux - t * uy, y: a.y + s * uy + t * ux };
  }
  function down(e) {
    if (!aktivno) return;
    const p = svjetska(e);
    if (!p) return;
    if (nacin === "istrazi") {
      let naj = -1;
      let nd = 26;
      naboji.forEach((n, i) => {
        if (n.pomican === false) return;
        const d = Math.hypot(X(n.x) - p.px, Y(n.y) - p.py);
        if (d < nd) {
          nd = d;
          naj = i;
        }
      });
      if (naj >= 0) vuce = { vrsta: "naboj", i: naj };
      else if (imaSondu) vuce = { vrsta: "sonda" };
      else return;
    } else vuce = { vrsta: nacin === "smjer" ? "strelica" : "marker" };
    e.preventDefault();
    svgEl.setPointerCapture?.(e.pointerId);
    primijeni(p);
  }
  function move(e) {
    if (vuce) primijeni(svjetska(e));
  }
  function up() {
    vuce = null;
  }

  // tipkovnica: strelica se okreće po 5° (Shift 15°), sonda i točka P pomiču se po 0,1 koraka mreže
  function keyStrelica(e) {
    if (locked) return;
    const k = e.shiftKey ? 15 : 5;
    const d = { ArrowLeft: k, ArrowUp: k, ArrowRight: -k, ArrowDown: -k }[
      e.key
    ];
    if (!d) return;
    e.preventDefault();
    kut = ((kut ?? 90) + d + 360) % 360;
  }
  function keyPomak(e, sto) {
    if (locked && sto !== "sonda") return;
    const k = (e.shiftKey ? 1 : 0.2) * mreza;
    const d = {
      ArrowLeft: [-k, 0],
      ArrowRight: [k, 0],
      ArrowUp: [0, k],
      ArrowDown: [0, -k],
    }[e.key];
    if (!d) return;
    e.preventDefault();
    if (sto === "sonda") {
      sonda.x = ogranici(sonda.x + d[0], wx(6), wx(W - 6));
      sonda.y = ogranici(sonda.y + d[1], wy(H - 6), wy(6));
    } else postaviMarker(marker.x + d[0], marker.y + d[1]);
  }

  function provjeri() {
    if (locked) return;
    if (nacin === "smjer") {
      poslano = kut;
      onodgovor(kut);
    } else {
      poslano = { ...marker };
      onodgovor({ x: marker.x, y: marker.y });
    }
  }

  // ── kotiranje: kad su naboji i točke na istom vodoravnom pravcu, ispod je udaljenost svakog para ──
  let kote = $derived.by(() => {
    const sve = [
      ...naboji.map((n) => ({ x: n.x, y: n.y })),
      ...(nacin !== "istrazi" ? (spec.tocke ?? []) : imaSondu ? [sonda] : []),
    ];
    if (sve.length < 2 || kugla) return [];
    const y0 = sve[0].y;
    if (!sve.every((p) => Math.abs(p.y - y0) < 1e-6)) return [];
    const xs = [...new Set(sve.map((p) => Math.round(p.x * 1000) / 1000))].sort(
      (a, b) => a - b,
    );
    const out = [];
    for (let i = 0; i + 1 < xs.length; i++)
      if (xs[i + 1] - xs[i] > 0.05)
        out.push({
          a: X(xs[i]),
          b: X(xs[i + 1]),
          y: Y(y0) + 34,
          t: fmtCm(xs[i + 1] - xs[i]),
        });
    return out;
  });

  // ── klizači naboja (istrazi) ──
  const klizaci = untrack(() =>
    nacin === "istrazi" ? (spec.klizaci ?? []) : [],
  );
  function postaviQ(o, v) {
    const q = Number(v);
    if (o === kuglaOznaka && kugla) kugla.q = q;
    else {
      const n = naboji.find((m) => m.oznaka === o);
      if (n) n.q = q;
    }
  }
  const qOd = (o) =>
    o === kuglaOznaka && kugla
      ? kugla.q
      : (naboji.find((m) => m.oznaka === o)?.q ?? 0);

  // ── graf E(r) kugle ──
  const GH = 132;
  const graf = untrack(() => {
    if (!spec.kugla || !(spec.prikazi ?? []).includes("Er_graf")) return null;
    const k = spec.kugla;
    const rMax = Math.max(
      2.6 * k.R,
      ...(spec.tocke ?? []).map((t) => Math.hypot(t.x - k.x, t.y - k.y) * 1.15),
    );
    return { rMax, x0: 46, x1: W - 14, y0: GH - 26, y1: 14 };
  });
  let grafE = $derived.by(() => {
    if (!graf || !kugla) return null;
    const Emax = (K * Math.abs(kugla.q) * 1e-9) / (er * (kugla.R * 0.01) ** 2);
    const GX = (r) => graf.x0 + (r / graf.rMax) * (graf.x1 - graf.x0);
    const GY = (E) => graf.y0 - (E / (Emax * 1.12)) * (graf.y0 - graf.y1);
    const Ef = (r) => (r < kugla.R ? 0 : Emax * (kugla.R / r) ** 2);
    const tocke = [];
    for (let i = 0; i <= 90; i++) {
      const r = kugla.R + ((graf.rMax - kugla.R) * i) / 90;
      tocke.push(`${f1(GX(r))},${f1(GY(Ef(r)))}`);
    }
    const oznake = (spec.tocke ?? []).map((t) => {
      const r = Math.hypot(t.x - kugla.x, t.y - kugla.y);
      return { oznaka: t.oznaka, x: GX(r), y: GY(Ef(r)) };
    });
    const rs = Math.min(rSonde ?? 0, graf.rMax);
    return {
      Emax,
      GX,
      GY,
      put: `M${GX(0)},${GY(0)} L${f1(GX(kugla.R))},${GY(0)} M${tocke.join(" L")}`,
      oznake,
      sonda: { x: GX(rs), y: GY(Ef(rSonde ?? 0)) },
      rTicks: Array.from(
        { length: Math.floor(graf.rMax / lijepiKorak(graf.rMax, 5)) + 1 },
        (_, i) => i * lijepiKorak(graf.rMax, 5),
      ),
    };
  });

  // ── opis za čitače zaslona ──
  let opis = $derived(
    [
      ...naboji.map(
        (n) =>
          `${oznakaTekst(n.oznaka)} = ${fmtQ(n.q)} u (${formatNumber(n.x, 1)}, ${formatNumber(n.y, 1)}) cm`,
      ),
      kugla
        ? `vodljiva kugla polumjera ${formatNumber(kugla.R)} cm, naboj ${fmtQ(kugla.q)}`
        : "",
      ...(spec.tocke ?? []).map(
        (t) =>
          `točka ${t.oznaka} u (${formatNumber(t.x, 1)}, ${formatNumber(t.y, 1)}) cm`,
      ),
      er > 1 ? `sredstvo ${nazivSredstva}, εr = ${formatNumber(er)}` : "",
    ]
      .filter(Boolean)
      .join("; "),
  );

  const ime = (o) => oznaka(o);
</script>

{#if dodirScena}
  <Dodir {spec} {locked} {pokazi} {ishod} {onodgovor} />
{:else}
  {#if pitanje}
    <div class="lx-question"><Md text={spec.tekst} /></div>
  {:else}
    <div class="np-tekst"><Md text={spec.tekst} /></div>
  {/if}

  {#snippet ozn(o, x, y, anchor = "middle", cls = "")}
    {@const d = ime(o)}
    <text class="np-ozn {cls}" x={f1(x)} y={f1(y)} text-anchor={anchor}
      >{d.baza}{#if d.indeks}<tspan class="np-ind" dy="3">{d.indeks}</tspan
        >{/if}</text
    >
  {/snippet}

  {#snippet vektori(v, sastavniceKlasa, zbrojKlasa, prikaziSastavnice = true)}
    {#if prikaziSastavnice}
      {#each v.sastavnice as c (c.oznaka)}
        {@const d = ime(c.oznaka)}
        <g
          class="np-sast {sastavniceKlasa}"
          style:--boja={bojaIzvora(c.oznaka)}
        >
          <path class="np-v-lin" d={c.linija} />
          <path class="np-v-gl" d={c.glava} />
          {#if c.iznos > 0}<text
              class="np-v-ozn"
              x={f1(c.vrh[0])}
              y={f1(c.vrh[1] + 4)}
              text-anchor="middle"
              >{v.zbroj.oznaka}<tspan class="np-ind" dy="3"
                >{d.indeks || d.baza}</tspan
              ></text
            >{/if}
        </g>
      {/each}
    {/if}
    {#if v.zbroj.iznos > 0}
      <g class="np-zbroj {zbrojKlasa}">
        <path class="np-v-lin" d={v.zbroj.linija} />
        <path class="np-v-gl" d={v.zbroj.glava} />
        <text
          class="np-v-ozn"
          x={f1(v.zbroj.vrh[0])}
          y={f1(v.zbroj.vrh[1] + 4)}
          text-anchor="middle">{v.zbroj.oznaka}</text
        >
      </g>
    {/if}
  {/snippet}

  <figure
    class="lx-figure np"
    class:np-ok={stanje === "ok"}
    class:np-bad={stanje === "bad"}
  >
    <svg
      bind:this={svgEl}
      viewBox="0 0 {W} {H}"
      role="img"
      aria-label={opis}
      class:np-aktivno={aktivno}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
    >
      <rect
        class="np-pozadina"
        x="0"
        y="0"
        width={W}
        height={H}
        rx="10"
        style:--ton={tonSredstva}
        class:np-sredstvo={tonSredstva}
      />
      {#each crteMreze as c, i (i)}
        {#if c.k === "x"}<line
            class="np-mreza"
            x1={c.p}
            y1="0"
            x2={c.p}
            y2={H}
          />{:else}<line
            class="np-mreza"
            x1="0"
            y1={c.p}
            x2={W}
            y2={c.p}
          />{/if}
      {/each}
      <text class="lx-label np-mjerilo" x={W - 8} y={H - 8} text-anchor="end"
        >mreža {formatNumber(mreza)} cm</text
      >
      {#if er > 1 || nacin === "istrazi"}<text
          class="lx-label np-mjerilo"
          x="8"
          y="16"
          >{nazivSredstva}, ε<tspan class="np-ind" dy="3">r</tspan><tspan
            dy="-3">&nbsp;= {formatNumber(er)}</tspan
          ></text
        >{/if}

      <!-- silnice -->
      {#each silnice as s, i (i)}
        <path class="np-silnica" d={s.d} />
        <path class="np-silnica-gl" d={s.glava} />
      {/each}

      <!-- kote udaljenosti -->
      {#each kote as k, i (i)}
        <g class="np-kota">
          <line x1={f1(k.a)} y1={f1(k.y)} x2={f1(k.b)} y2={f1(k.y)} />
          <line x1={f1(k.a)} y1={f1(k.y - 5)} x2={f1(k.a)} y2={f1(k.y + 5)} />
          <line x1={f1(k.b)} y1={f1(k.y - 5)} x2={f1(k.b)} y2={f1(k.y + 5)} />
          <text
            class="lx-label"
            x={f1((k.a + k.b) / 2)}
            y={f1(k.y + 15)}
            text-anchor="middle">{k.t}</text
          >
        </g>
      {/each}

      <!-- vodljiva kugla -->
      {#if kugla}
        {@const kx = X(kugla.x)}
        {@const ky = Y(kugla.y)}
        {@const R = kugla.R * okv.sc}
        {@const Ru = (kugla.R_unutra ?? 0) * okv.sc}
        <g class="np-kugla">
          <circle class="np-metal" cx={f1(kx)} cy={f1(ky)} r={f1(R)} />
          {#if Ru > 0}<circle
              class="np-supljina"
              cx={f1(kx)}
              cy={f1(ky)}
              r={f1(Ru)}
            />{/if}
          {#each Array.from({ length: 16 }, (_, i) => i) as i (i)}
            {@const a = (i * Math.PI) / 8}
            <text
              class="np-znak-kugle"
              class:minus={kugla.q < 0}
              x={f1(kx + Math.cos(a) * (R - 7))}
              y={f1(ky + Math.sin(a) * (R - 7) + 4)}
              text-anchor="middle">{kugla.q < 0 ? "−" : "+"}</text
            >
          {/each}
          <text
            class="np-ozn-q"
            x={f1(kx)}
            y={f1(ky + (Ru > 24 ? Ru * 0.55 : R + 16))}
            text-anchor="middle">Q = {fmtQ(kugla.q)}</text
          >
        </g>
      {/if}

      <!-- točke -->
      {#each spec.tocke ?? [] as t (t.oznaka)}
        {@const jeCilj = ciljTocka && cilj.tocka === t}
        <g class="np-tocka" class:np-cilj={jeCilj}>
          {#if jeCilj && !otkrij && kut == null}<circle
              class="np-puls"
              cx={f1(X(t.x))}
              cy={f1(Y(t.y))}
              r="14"
            />{/if}
          <circle cx={f1(X(t.x))} cy={f1(Y(t.y))} r="3.5" />
          {@render ozn(t.oznaka, X(t.x) - 8, Y(t.y) - 9, "end")}
        </g>
      {/each}

      <!-- probni naboj u točki (sila u točki) -->
      {#if nacin === "smjer" && spec.cilj.q != null}
        {@const q = spec.cilj.q}
        <g class="np-proba" class:minus={q < 0}>
          <circle cx={f1(X(ciljTocka.x))} cy={f1(Y(ciljTocka.y))} r="8" />
          <text
            x={f1(X(ciljTocka.x))}
            y={f1(Y(ciljTocka.y) + 4)}
            text-anchor="middle">{q < 0 ? "−" : "+"}</text
          >
          <text
            class="np-ozn-q"
            x={f1(X(ciljTocka.x) - 12)}
            y={f1(Y(ciljTocka.y) + 22)}
            text-anchor="end">{fmtQ(q)}</text
          >
        </g>
      {/if}

      <!-- sile na nabojima -->
      {#each sile as f (f.i)}
        <g class="np-sila">
          <path class="np-v-lin" d={f.linija} />
          <path class="np-v-gl" d={f.glava} />
          {#if naboji.length === 2}<text
              class="np-v-ozn"
              x={f1(f.vrh[0])}
              y={f1(f.vrh[1] + 4)}
              text-anchor="middle">F</text
            >{/if}
        </g>
      {/each}

      <!-- naboji -->
      {#each naboji as n, i (n.oznaka)}
        {@const r = rNaboja(n.q)}
        {@const vuci = nacin === "istrazi" && n.pomican !== false}
        <g
          class="np-naboj"
          class:plus={n.q > 0}
          class:minus={n.q < 0}
          class:lx-handle={vuci && aktivno}
        >
          <circle cx={f1(X(n.x))} cy={f1(Y(n.y))} r={f1(r)} />
          <text
            class="np-znak"
            x={f1(X(n.x))}
            y={f1(Y(n.y) + 5.5)}
            text-anchor="middle">{n.q > 0 ? "+" : n.q < 0 ? "−" : "0"}</text
          >
          <text
            class="np-ozn-q"
            x={f1(X(n.x))}
            y={f1(Y(n.y) - r - 7)}
            text-anchor="middle"
            >{ime(n.oznaka).baza}<tspan class="np-ind" dy="3"
              >{ime(n.oznaka).indeks}</tspan
            ><tspan dy="-3">&nbsp;= {fmtQ(n.q)}</tspan></text
          >
          {#if vuci && i === 0 && aktivno}<title>Povuci naboj</title>{/if}
        </g>
      {/each}

      <!-- sonda -->
      {#if imaSondu && vektoriSonde}
        {@render vektori(
          vektoriSonde,
          "",
          "np-zbroj-istrazi",
          ima("sastavnice"),
        )}
      {/if}
      {#if imaSondu}
        <g
          class="np-sonda lx-handle"
          role="slider"
          tabindex="0"
          aria-label="Sonda {sonda.oznaka}: pomiči strelicama"
          aria-valuetext={poljeSonde ? `E = ${fmtE(poljeSonde.E)}` : ""}
          aria-valuenow={poljeSonde ? Math.round(poljeSonde.E) : 0}
          onkeydown={(e) => keyPomak(e, "sonda")}
        >
          <circle
            class="np-sonda-hit"
            cx={f1(X(sonda.x))}
            cy={f1(Y(sonda.y))}
            r="18"
          />
          <circle
            class="np-sonda-prsten"
            cx={f1(X(sonda.x))}
            cy={f1(Y(sonda.y))}
            r="7"
          />
          <path
            class="np-sonda-kriz"
            d="M{f1(X(sonda.x) - 4)},{f1(Y(sonda.y))} h8 M{f1(X(sonda.x))},{f1(
              Y(sonda.y) - 4,
            )} v8"
          />
          {#if poljeSonde && poljeSonde.E === 0}<text
              class="np-v-ozn np-nula"
              x={f1(X(sonda.x) + 12)}
              y={f1(Y(sonda.y) - 10)}>E = 0</text
            >{/if}
        </g>
      {/if}

      <!-- smjer: strelica učenika -->
      {#if nacin === "smjer"}
        {@const cx = X(ciljTocka.x)}
        {@const cy = Y(ciljTocka.y)}
        {#if vektoriOdgovora}{@render vektori(
            vektoriOdgovora,
            "np-otkriveno",
            "np-zbroj-tocno",
            true,
          )}{/if}
        {#if kut == null}
          <circle class="np-vodilica" cx={f1(cx)} cy={f1(cy)} r={DULJ} />
          <text
            class="lx-label np-uputa"
            x={f1(cx)}
            y={f1(cy - DULJ - 6 < 12 ? cy + DULJ + 16 : cy - DULJ - 6)}
            text-anchor="middle"
            >povuci strelicu iz {nacin === "smjer" && spec.cilj.naboj
              ? oznakaTekst(spec.cilj.naboj)
              : oznakaTekst(spec.cilj.tocka)}</text
          >
        {:else}
          {@const s = strelica(
            cx,
            cy,
            cx + Math.cos((kut * Math.PI) / 180) * DULJ,
            cy - Math.sin((kut * Math.PI) / 180) * DULJ,
            12,
          )}
          <g class="np-moja">
            <path class="np-v-lin" d={s.linija} />
            <path class="np-v-gl" d={s.glava} />
          </g>
        {/if}
        {#if !locked}
          <circle
            class="np-ruka"
            cx={f1(cx)}
            cy={f1(cy)}
            r={DULJ + 12}
            role="slider"
            tabindex="0"
            aria-label="Smjer strelice: okreći strelicama na tipkovnici"
            aria-valuemin="0"
            aria-valuemax="359"
            aria-valuenow={kut ?? 0}
            aria-valuetext={kut == null
              ? "strelica još nije postavljena"
              : `${opisSmjera(kut)}, ${kut}°`}
            onkeydown={keyStrelica}
          />
        {/if}
      {/if}

      <!-- nula: točka P -->
      {#if nacin === "nula"}
        {#if vektoriOdgovora}{@render vektori(
            vektoriOdgovora,
            "np-otkriveno",
            "np-zbroj-istrazi",
            true,
          )}{/if}
        <g
          class="np-marker"
          class:lx-handle={aktivno}
          role="slider"
          tabindex={locked ? -1 : 0}
          aria-label="Točka P: pomiči strelicama"
          aria-valuenow={Math.round(
            Math.hypot(marker.x - naboji[0].x, marker.y - naboji[0].y) * 10,
          ) / 10}
          aria-valuetext={`${formatNumber(Math.hypot(marker.x - naboji[0].x, marker.y - naboji[0].y), 1)} cm od ${oznakaTekst(naboji[0].oznaka)}, ${formatNumber(Math.hypot(marker.x - naboji[1].x, marker.y - naboji[1].y), 1)} cm od ${oznakaTekst(naboji[1].oznaka)}`}
          onkeydown={(e) => keyPomak(e, "marker")}
        >
          <circle
            class="np-sonda-hit"
            cx={f1(X(marker.x))}
            cy={f1(Y(marker.y))}
            r="20"
          />
          <circle
            class="np-marker-krug"
            cx={f1(X(marker.x))}
            cy={f1(Y(marker.y))}
            r="8"
          />
          <circle
            class="np-marker-sredina"
            cx={f1(X(marker.x))}
            cy={f1(Y(marker.y))}
            r="2.5"
          />
          <text class="np-ozn" x={f1(X(marker.x) + 11)} y={f1(Y(marker.y) - 11)}
            >P</text
          >
          {#if otkrij}<text
              class="np-v-ozn np-nula"
              x={f1(X(marker.x) + 11)}
              y={f1(Y(marker.y) + 22)}>E = 0</text
            >{/if}
        </g>
      {/if}
    </svg>
  </figure>

  <!-- očitanja -->
  {#if imaSondu && poljeSonde}
    <div class="np-ocitanje" aria-live="polite">
      <div>
        <b>E = {Number.isFinite(poljeSonde.E) ? fmtE(poljeSonde.E) : "—"}</b
        >{#if gdjeSonda}<span class="np-sivo"
            >&nbsp; · r = {fmtCm(rSonde)} ({gdjeSonda})</span
          >{/if}
      </div>
      {#if ima("sastavnice") && poljeSonde.sastavnice.length > 1}
        <div class="np-sivo">
          {#each poljeSonde.sastavnice as c, i (c.oznaka)}{i ? " · " : ""}E<sub
              >{ime(c.oznaka).indeks || ime(c.oznaka).baza}</sub
            >
            = {fmtE(c.E)}{/each}
        </div>
      {/if}
    </div>
  {/if}
  {#if ima("sile") && naboji.length === 2}
    {@const f = silaNa(scena, 0, er)}
    <div class="np-ocitanje" aria-live="polite">
      <b>F = {fmtF(f.F)}</b>
      <span class="np-sivo"
        >({naboji[0].q * naboji[1].q === 0
          ? "nema sile"
          : privlacna
            ? "privlačna"
            : "odbojna"}) · r = {fmtCm(
          Math.hypot(naboji[1].x - naboji[0].x, naboji[1].y - naboji[0].y),
        )}</span
      >
    </div>
  {/if}
  {#if nacin === "nula"}
    <div class="np-ocitanje">
      P: <b
        >{fmtCm(Math.hypot(marker.x - naboji[0].x, marker.y - naboji[0].y))}</b
      >
      od {oznakaTekst(naboji[0].oznaka)} ·
      <b>{fmtCm(Math.hypot(marker.x - naboji[1].x, marker.y - naboji[1].y))}</b>
      od {oznakaTekst(naboji[1].oznaka)}
    </div>
  {/if}
  {#if nacin === "smjer" && otkrij}
    <div class="np-ocitanje">
      {#each cilj.sastavnice as c, i (c.oznaka)}{i
          ? " + "
          : ""}{cilj.jedinica === "N" ? "F" : "E"}<sub
          >{ime(c.oznaka).indeks || ime(c.oznaka).baza}</sub
        >
        ({formatSci(c.iznos)}){/each}
      →
      <b
        >{cilj.jedinica === "N" ? "F" : "E"} = {formatSci(cilj.iznos)}
        {cilj.jedinica}</b
      >, {opisSmjera(tocanKut)}
    </div>
  {/if}

  {#if graf && grafE}
    <figure class="lx-figure np-graf">
      <svg
        viewBox="0 0 {W} {GH}"
        role="img"
        aria-label="Graf jakosti polja E o udaljenosti r od središta kugle: unutar kugle nula, izvan pada s kvadratom udaljenosti"
      >
        <line
          class="lx-faint"
          x1={graf.x0}
          y1={graf.y0}
          x2={graf.x1}
          y2={graf.y0}
        />
        <line
          class="lx-faint"
          x1={graf.x0}
          y1={graf.y0}
          x2={graf.x0}
          y2={graf.y1 - 4}
        />
        {#each grafE.rTicks as r (r)}
          <text
            class="lx-label np-mala"
            x={f1(grafE.GX(r))}
            y={graf.y0 + 13}
            text-anchor="middle">{formatNumber(r)}</text
          >
        {/each}
        <text
          class="lx-label np-mala"
          x={graf.x1}
          y={graf.y0 + 24}
          text-anchor="end">r (cm)</text
        >
        <text
          class="lx-label np-mala"
          x={graf.x0 - 4}
          y={f1(grafE.GY(grafE.Emax)) + 4}
          text-anchor="end">{formatSci(grafE.Emax)}</text
        >
        <text class="lx-label np-mala" x={graf.x0 + 4} y={graf.y1 - 2}
          >E (N/C)</text
        >
        <line
          class="np-graf-R"
          x1={f1(grafE.GX(kugla.R))}
          y1={graf.y0}
          x2={f1(grafE.GX(kugla.R))}
          y2={graf.y1}
        />
        <text
          class="lx-label np-mala"
          x={f1(grafE.GX(kugla.R)) - 4}
          y={(graf.y0 + graf.y1) / 2}
          text-anchor="end">R</text
        >
        <path class="np-graf-krivulja" d={grafE.put} />
        {#each grafE.oznake as o (o.oznaka)}
          <circle class="np-graf-tocka" cx={f1(o.x)} cy={f1(o.y)} r="3" />
          <text
            class="lx-label np-mala"
            x={f1(o.x)}
            y={f1(o.y) - 6}
            text-anchor="middle">{o.oznaka}</text
          >
        {/each}
        <line
          class="np-graf-vodilica"
          x1={f1(grafE.sonda.x)}
          y1={graf.y0}
          x2={f1(grafE.sonda.x)}
          y2={f1(grafE.sonda.y)}
        />
        <circle
          class="np-graf-sonda"
          cx={f1(grafE.sonda.x)}
          cy={f1(grafE.sonda.y)}
          r="5"
        />
      </svg>
    </figure>
  {/if}

  <!-- kontrole istraživanja -->
  {#if klizaci.length}
    <div class="np-kontrole">
      {#each klizaci.filter((k) => k !== "er") as o (o)}
        {@const q = qOd(o)}
        <label class="np-red">
          <span class="np-red-ime">{oznakaTekst(o)}</span>
          <input
            type="range"
            min="-50"
            max="50"
            step="1"
            value={q}
            oninput={(e) => postaviQ(o, e.currentTarget.value)}
            aria-label="naboj {oznakaTekst(o)} u nC"
          />
          <output class="np-red-v" class:plus={q > 0} class:minus={q < 0}
            >{fmtQ(q)}</output
          >
        </label>
      {/each}
      {#if klizaci.includes("er")}
        <div class="np-sredstva" role="group" aria-label="sredstvo">
          {#each sredstva as m (m.naziv)}
            <button
              type="button"
              class="seg-item"
              class:active={er === m.er && nazivSredstva === m.naziv}
              aria-pressed={er === m.er && nazivSredstva === m.naziv}
              onclick={() => {
                er = m.er;
                nazivSredstva = m.naziv;
              }}
              >{m.naziv}
              <span class="np-sivo">εᵣ = {formatNumber(m.er)}</span></button
            >
          {/each}
        </div>
      {/if}
    </div>
  {/if}
  {#if nacin === "istrazi"}
    <p class="lx-hint np-hint">
      {[
        imaSondu ? "Povuci sondu (križić)." : "",
        naboji.some((n) => n.pomican !== false)
          ? "Povuci naboje da promijeniš razmak."
          : "",
        klizaci.some((k) => k !== "er") ? "Klizačima mijenjaš naboje." : "",
      ]
        .filter(Boolean)
        .join(" ")}
    </p>
  {/if}

  {#if pitanje}
    <div class="lx-actions">
      <button
        type="button"
        class="btn btn-primary"
        onclick={provjeri}
        disabled={locked || (nacin === "smjer" && kut == null)}>Provjeri</button
      >
      {#if nacin === "smjer" && !locked}<span class="lx-hint np-uputa-dolje"
          >Povuci prstom ili mišem oko točke da okreneš strelicu. Ocjenjuje se
          samo smjer.</span
        >{/if}
      {#if nacin === "nula" && !locked}<span class="lx-hint np-uputa-dolje"
          >Povuci točku P. Na pravcu kroz naboje sama se „zalijepi“.</span
        >{/if}
    </div>
  {/if}
{/if}

<style>
  .np,
  .np-ocitanje,
  .np-kontrole,
  .np-graf {
    --np-plus: #f87171;
    --np-minus: #60a5fa;
    --np-sila: var(--warn);
  }
  :global(html[data-theme="light"])
    :is(.np, .np-ocitanje, .np-kontrole, .np-graf) {
    --np-plus: #dc2626;
    --np-minus: #2563eb;
  }
  .np-tekst {
    margin-bottom: 12px;
  }
  .np {
    max-width: 480px;
    margin-bottom: 6px;
  }
  .np svg.np-aktivno {
    touch-action: none;
    cursor: crosshair;
  }
  .np-pozadina {
    fill: var(--bg-elev);
    stroke: var(--border);
  }
  .np-pozadina.np-sredstvo {
    fill: color-mix(in srgb, var(--ton) 7%, var(--bg-elev));
  }
  .np.np-ok .np-pozadina {
    stroke: var(--success);
  }
  .np.np-bad .np-pozadina {
    stroke: var(--danger);
  }
  .np-mreza {
    stroke: var(--border);
    stroke-width: 0.6;
  }
  .np-mjerilo {
    font-size: 11px;
  }
  .np-silnica {
    fill: none;
    stroke: var(--text-faint);
    stroke-width: 1;
    opacity: 0.75;
  }
  .np-silnica-gl {
    fill: var(--text-faint);
  }
  .np-kota line {
    stroke: var(--text-faint);
    stroke-width: 1;
  }
  .np-naboj circle {
    stroke-width: 2;
    fill: var(--bg-elev-2);
    stroke: var(--text-dim);
  }
  .np-naboj.plus circle {
    fill: color-mix(in srgb, var(--np-plus) 22%, var(--bg-elev));
    stroke: var(--np-plus);
  }
  .np-naboj.minus circle {
    fill: color-mix(in srgb, var(--np-minus) 22%, var(--bg-elev));
    stroke: var(--np-minus);
  }
  .np-znak {
    font: 700 17px var(--font-sans);
    fill: var(--text);
    pointer-events: none;
  }
  .np-ozn-q,
  .np-ozn {
    font: 500 12px var(--font-sans);
    fill: var(--text);
  }
  .np-ozn-q {
    font-size: 11.5px;
    fill: var(--text-dim);
  }
  .np-ind {
    font-size: 0.75em;
  }
  .np-tocka circle {
    fill: var(--text);
  }
  .np-tocka .np-puls {
    fill: none;
    stroke: var(--lx-turn);
    stroke-width: 1.5;
    animation: np-puls 1.6s ease-out infinite;
    transform-origin: center;
    transform-box: fill-box;
  }
  @keyframes np-puls {
    from {
      opacity: 0.9;
      transform: scale(0.5);
    }
    to {
      opacity: 0;
      transform: scale(1.4);
    }
  }
  .np-kugla .np-metal {
    fill: color-mix(in srgb, var(--text-faint) 30%, var(--bg-elev));
    stroke: var(--text-dim);
    stroke-width: 1.5;
  }
  .np-kugla .np-supljina {
    fill: var(--bg-elev);
    stroke: var(--text-dim);
    stroke-width: 1;
  }
  .np-znak-kugle {
    font: 700 11px var(--font-sans);
    fill: var(--np-plus);
  }
  .np-znak-kugle.minus {
    fill: var(--np-minus);
  }
  .np-proba circle {
    fill: color-mix(in srgb, var(--np-plus) 25%, var(--bg-elev));
    stroke: var(--np-plus);
    stroke-width: 1.5;
  }
  .np-proba.minus circle {
    fill: color-mix(in srgb, var(--np-minus) 25%, var(--bg-elev));
    stroke: var(--np-minus);
  }
  .np-proba text {
    font: 700 12px var(--font-sans);
    fill: var(--text);
  }
  .np-proba .np-ozn-q {
    font-weight: 500;
    fill: var(--text-dim);
  }
  /* vektori */
  .np-v-lin {
    fill: none;
    stroke-width: 2.4;
    stroke-linecap: round;
  }
  .np-v-ozn {
    font: 600 12px var(--font-sans);
  }
  .np-sast .np-v-lin {
    stroke: var(--boja);
    stroke-dasharray: 5 3;
    stroke-width: 2;
  }
  .np-sast .np-v-gl,
  .np-sast .np-v-ozn {
    fill: var(--boja);
  }
  .np-zbroj .np-v-lin {
    stroke: var(--text);
    stroke-width: 3;
  }
  .np-zbroj .np-v-gl,
  .np-zbroj .np-v-ozn {
    fill: var(--text);
  }
  .np-zbroj-tocno .np-v-lin {
    stroke: var(--success);
  }
  .np-zbroj-tocno .np-v-gl,
  .np-zbroj-tocno .np-v-ozn {
    fill: var(--success);
  }
  .np-sila .np-v-lin {
    stroke: var(--np-sila);
    stroke-width: 3;
  }
  .np-sila .np-v-gl,
  .np-sila .np-v-ozn {
    fill: var(--np-sila);
  }
  .np-moja .np-v-lin {
    stroke: var(--lx-turn);
    stroke-width: 3.5;
  }
  .np-moja .np-v-gl {
    fill: var(--lx-turn);
  }
  .np.np-ok .np-moja .np-v-lin {
    stroke: var(--success);
  }
  .np.np-ok .np-moja .np-v-gl {
    fill: var(--success);
  }
  .np.np-bad .np-moja .np-v-lin {
    stroke: var(--danger);
  }
  .np.np-bad .np-moja .np-v-gl {
    fill: var(--danger);
  }
  .np-otkriveno {
    animation: np-pojavi 0.5s ease-out both;
  }
  @keyframes np-pojavi {
    from {
      opacity: 0;
    }
  }
  .np-nula {
    fill: var(--success);
  }
  .np-vodilica {
    fill: none;
    stroke: var(--lx-turn);
    stroke-width: 1.2;
    stroke-dasharray: 3 5;
    opacity: 0.8;
  }
  .np-uputa {
    fill: var(--lx-turn);
    font-size: 12px;
  }
  .np-ruka {
    fill: transparent;
    stroke: none;
    cursor: grab;
  }
  .np-ruka:focus-visible {
    outline: none;
    stroke: var(--primary);
    stroke-width: 2;
  }
  /* sonda i točka P */
  .np-sonda-hit {
    fill: transparent;
  }
  .np-sonda-prsten {
    fill: color-mix(in srgb, var(--lx-turn) 18%, var(--bg-elev));
    stroke: var(--lx-turn);
    stroke-width: 2;
  }
  .np-sonda-kriz {
    stroke: var(--lx-turn);
    stroke-width: 1.5;
  }
  .np-sonda:focus-visible,
  .np-marker:focus-visible {
    outline: none;
  }
  .np-sonda:focus-visible .np-sonda-prsten,
  .np-marker:focus-visible .np-marker-krug {
    stroke-width: 3.5;
  }
  .np-marker-krug {
    fill: color-mix(in srgb, var(--lx-turn) 20%, var(--bg-elev));
    stroke: var(--lx-turn);
    stroke-width: 2;
  }
  .np.np-ok .np-marker-krug {
    stroke: var(--success);
  }
  .np.np-bad .np-marker-krug {
    stroke: var(--danger);
  }
  .np-marker-sredina {
    fill: var(--lx-turn);
  }
  /* očitanja i kontrole */
  .np-ocitanje {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 2px 0 8px;
    line-height: 1.6;
  }
  .np-ocitanje b {
    color: var(--text);
  }
  .np-sivo {
    color: var(--text-dim);
  }
  .np-kontrole {
    display: grid;
    gap: 6px;
    max-width: 440px;
    margin: 6px auto 0;
  }
  .np-red {
    display: grid;
    grid-template-columns: 34px 1fr 82px;
    align-items: center;
    gap: 10px;
  }
  .np-red-ime {
    font-weight: 600;
  }
  .np-red input[type="range"] {
    width: 100%;
    height: 28px;
    margin: 0;
    accent-color: var(--primary);
  }
  .np-red-v {
    font-family: var(--font-mono);
    font-size: 13.5px;
    text-align: right;
    white-space: nowrap;
  }
  .np-red-v.plus {
    color: var(--np-plus);
  }
  .np-red-v.minus {
    color: var(--np-minus);
  }
  .np-sredstva {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    margin-top: 4px;
  }
  .np-sredstva .seg-item {
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-elev);
    padding: 7px 11px;
    font-size: 13px;
  }
  .np-sredstva .seg-item.active {
    background: var(--primary-dim);
    border-color: var(--primary-border);
    color: var(--text);
  }
  .np-hint {
    text-align: center;
  }
  .np-uputa-dolje {
    margin-top: 0;
  }
  .np-graf {
    max-width: 480px;
    margin-top: 0;
  }
  .np-mala {
    font-size: 10.5px;
  }
  .np-graf-krivulja {
    fill: none;
    stroke: var(--text);
    stroke-width: 2;
  }
  .np-graf-R {
    stroke: var(--text-faint);
    stroke-dasharray: 3 3;
  }
  .np-graf-tocka {
    fill: var(--text-dim);
  }
  .np-graf-vodilica {
    stroke: var(--lx-turn);
    stroke-dasharray: 2 3;
  }
  .np-graf-sonda {
    fill: var(--lx-turn);
  }
</style>
