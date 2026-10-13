// PROTOTIP (ticket „SVG skice u zadacima“): renderer skica iz JSON opisa. LLM bi pisao samo JSON;
// koordinate računa ovaj kod, a provjere uspoređuju opis s brojevima u tekstu zadatka.
// Ne ide u produkciju: pravi renderer bit će Svelte komponenta s testovima.

const W = 380;
const H = 260;
const PAD = 34;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (n) => Math.round(n * 10) / 10;

const line = (a, b, cls = "ln") => `<line class="${cls}" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"/>`;
const label = (p, t, cls = "lbl", anchor = "middle") =>
  `<text class="${cls}" x="${f(p[0])}" y="${f(p[1])}" text-anchor="${anchor}" dominant-baseline="middle">${esc(t)}</text>`;
const dot = (p, cls = "pt") => `<circle class="${cls}" cx="${f(p[0])}" cy="${f(p[1])}" r="3.5"/>`;
const arrow = (a, b, cls) =>
  `<line class="arr ${cls}" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" marker-end="url(#head-${cls})"/>`;

const defs = `<defs>${["acc", "c1", "c2", "c3", "c4"]
  .map((c) => `<marker id="head-${c}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="head ${c}" d="M0,0 L10,5 L0,10 z"/></marker>`)
  .join("")}</defs>`;

const svg = (body) => `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">${defs}${body}</svg>`;

// Model koordinate → SVG, s jednakim mjerilom po osima (proporcije ostaju točne).
function fit(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min((W - 2 * PAD) / (x1 - x0 || 1), (H - 2 * PAD) / (y1 - y0 || 1));
  const ox = (W - s * (x1 - x0)) / 2;
  const oy = (H - s * (y1 - y0)) / 2;
  return (p) => [ox + (p[0] - x0) * s, H - (oy + (p[1] - y0) * s)];
}

// Oznaka pomaknuta od točke prema van (od središta lika).
const away = (p, c, d = 16) => {
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  const l = Math.hypot(dx, dy) || 1;
  return [p[0] + (dx / l) * d, p[1] + (dy / l) * d];
};
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// Oznaka stranice: od polovišta okomito prema van, poravnata tako da ne prelazi preko stranice.
function sideLabel(p, q, g, t, cls) {
  const m = mid(p, q);
  let n = [-(q[1] - p[1]), q[0] - p[0]];
  const l = Math.hypot(...n) || 1;
  n = [n[0] / l, n[1] / l];
  if (n[0] * (m[0] - g[0]) + n[1] * (m[1] - g[1]) < 0) n = [-n[0], -n[1]];
  const anchor = n[0] > 0.35 ? "start" : n[0] < -0.35 ? "end" : "middle";
  return label([m[0] + n[0] * 16, m[1] + n[1] * 18], t, cls, anchor);
}

// Brojevi iz oznaka moraju postojati u tekstu zadatka (inače je model nešto izmislio).
function numbersInText(labels, text) {
  const norm = text.replace(/\\[,;]/g, "").replace(/\{,\}/g, ",").replace(/(\d)\.(\d)/g, "$1,$2");
  const out = [];
  for (const l of labels) {
    for (const n of String(l).match(/\d+(?:[.,]\d+)?/g) ?? []) {
      const ok = new RegExp(`(^|[^\\d,])${n.replace(".", ",")}(?![\\d])`).test(norm);
      out.push({ ok, text: `broj ${n} iz oznake „${l}“ ${ok ? "postoji" : "NE postoji"} u tekstu zadatka` });
    }
  }
  return out;
}

// --- tipovi skica ---

function triangle(s, task) {
  const { a, b, c } = s.stranice;
  const checks = [];
  const ok3 = a + b > c && a + c > b && b + c > a;
  checks.push({ ok: ok3, text: `stranice ${a}, ${b} i ${c} ${ok3 ? "čine" : "NE čine"} trokut (nejednakost trokuta)` });
  if (s.pravi_kut) {
    const [p, q, h] = s.pravi_kut === "C" ? [a, b, c] : s.pravi_kut === "B" ? [a, c, b] : [b, c, a];
    const ok = Math.abs(p * p + q * q - h * h) < 0.02 * h * h;
    checks.push({ ok, text: `pravi kut u ${s.pravi_kut}: ${p}² + ${q}² ${ok ? "=" : "≠"} ${h}²` });
  }
  checks.push(...numbersInText(Object.values(s.oznake ?? {}), task));
  if (checks.some((x) => !x.ok)) return { checks };

  const A = [0, 0];
  const B = [c, 0];
  const cx = (b * b + c * c - a * a) / (2 * c);
  const C = [cx, Math.sqrt(Math.max(0, b * b - cx * cx))];
  const T = fit([A, B, C]);
  const [pA, pB, pC] = [T(A), T(B), T(C)];
  const g = [(pA[0] + pB[0] + pC[0]) / 3, (pA[1] + pB[1] + pC[1]) / 3];
  let body = `<polygon class="shape" points="${[pA, pB, pC].map((p) => p.map(f).join(",")).join(" ")}"/>`;
  if (s.pravi_kut === "C") {
    const u = (p) => { const d = [p[0] - pC[0], p[1] - pC[1]]; const l = Math.hypot(...d); return [d[0] / l * 14, d[1] / l * 14]; };
    const [ua, ub] = [u(pA), u(pB)];
    body += `<path class="ln thin" d="M${f(pC[0] + ua[0])},${f(pC[1] + ua[1])} L${f(pC[0] + ua[0] + ub[0])},${f(pC[1] + ua[1] + ub[1])} L${f(pC[0] + ub[0])},${f(pC[1] + ub[1])}"/>`;
  }
  if (s.kutovi?.["α"]) {
    const r = 26;
    const t1 = 0;
    const t2 = Math.atan2(-(pC[1] - pA[1]), pC[0] - pA[0]);
    body += `<path class="ln thin acc" d="M${f(pA[0] + r)},${f(pA[1])} A${r},${r} 0 0 0 ${f(pA[0] + r * Math.cos(t2))},${f(pA[1] - r * Math.sin(t2))}"/>`;
    body += label([pA[0] + r + 6, pA[1] - 9], `α = ${s.kutovi["α"]}`, "lbl small acc-t", "start");
  }
  body += label(away(pA, g), "A") + label(away(pB, g), "B") + label(away(pC, g), "C");
  const side = (p, q, key) => (s.oznake?.[key] ? sideLabel(p, q, g, `${key} = ${s.oznake[key]}`, "lbl dim-t") : "");
  body += side(pB, pC, "a") + side(pA, pC, "b") + side(pA, pB, "c");
  return { svg: svg(body), checks };
}

function circle(s, task) {
  const { r } = s;
  const L = s.tetiva?.duljina;
  const checks = [];
  if (L) checks.push({ ok: L <= 2 * r, text: `tetiva ${L} ${L <= 2 * r ? "≤" : ">"} promjer ${2 * r}` });
  checks.push(...numbersInText(Object.values(s.oznake ?? {}), task));
  if (checks.some((x) => !x.ok)) return { checks };
  const d = Math.sqrt(r * r - (L / 2) ** 2);
  const S = [0, 0];
  const A = [-L / 2, -d];
  const B = [L / 2, -d];
  const M = [0, -d];
  const T = fit([[-r, -r], [r, r]]);
  const sc = T([1, 0])[0] - T([0, 0])[0];
  const [pS, pA, pB, pM] = [T(S), T(A), T(B), T(M)];
  let body = `<circle class="shape" cx="${f(pS[0])}" cy="${f(pS[1])}" r="${f(r * sc)}"/>`;
  body += line(pA, pB, "ln acc") + line(pS, pA) + line(pS, pM, "ln dash");
  body += dot(pS) + dot(pA) + dot(pB);
  body += label([pS[0], pS[1] - 14], "S") + label(away(pA, pS), "A") + label(away(pB, pS), "B");
  body += sideLabel(pS, pA, [pS[0] + 40, pS[1] + 40], `r = ${s.oznake.r}`, "lbl dim-t");
  body += label([pM[0], pM[1] + 16], `${s.oznake.tetiva}`, "lbl acc-t");
  body += label([pS[0] + 8, (pS[1] + pM[1]) / 2], `d = ${s.oznake.d}`, "lbl dim-t", "start");
  return { svg: svg(body), checks };
}

// Prototip: izraz se pretvara u JS (u produkciji parser ili function-plot, nikad eval).
function compile(expr) {
  const js = expr.replace(/\^/g, "**").replace(/(\d)\s*([a-z(])/g, "$1*$2").replace(/\)\s*\(/g, ")*(");
  if (!/^[0-9x+\-*/().\s]*$/.test(js.replace(/\b(sqrt|sin|cos|abs)\b/g, ""))) throw new Error("izraz");
  return new Function("x", `with (Math) { return ${js}; }`);
}

function axes(T, [x0, x1], [y0, y1]) {
  let body = "";
  for (let x = Math.ceil(x0); x <= x1; x++) body += line(T([x, y0]), T([x, y1]), "grid");
  for (let y = Math.ceil(y0); y <= y1; y++) body += line(T([x0, y]), T([x1, y]), "grid");
  body += line(T([x0, 0]), T([x1, 0]), "axis") + line(T([0, y0]), T([0, y1]), "axis");
  for (let x = Math.ceil(x0); x <= x1; x++) if (x) body += label([T([x, 0])[0], T([x, 0])[1] + 12], x, "tick");
  for (let y = Math.ceil(y0); y <= y1; y++) if (y) body += label([T([0, y])[0] - 10, T([0, y])[1]], y, "tick");
  body += label([T([x1, 0])[0] - 4, T([x1, 0])[1] - 10], "x", "tick") + label([T([0, y1])[0] + 10, T([0, y1])[1] + 6], "y", "tick");
  return body;
}

function graph(s, task) {
  const fns = s.funkcije.map((fn) => ({ ...fn, f: compile(fn.izraz) }));
  const checks = s.tocke.map((p) => {
    const fn = fns.find((q) => q.oznaka === p.na) ?? fns[0];
    const ok = Math.abs(fn.f(p.x) - p.y) < 1e-6;
    return { ok, text: `točka (${p.x}, ${p.y}) ${ok ? "leži" : "NE leži"} na ${fn.oznaka}(x) = ${fn.izraz}` };
  });
  if (checks.some((x) => !x.ok)) return { checks };
  const T = fit([[s.x[0], s.y[0]], [s.x[1], s.y[1]]]);
  let body = axes(T, s.x, s.y);
  fns.forEach((fn, i) => {
    const pts = [];
    for (let k = 0; k <= 240; k++) {
      const x = s.x[0] + ((s.x[1] - s.x[0]) * k) / 240;
      const y = fn.f(x);
      if (y >= s.y[0] - 0.5 && y <= s.y[1] + 0.5) pts.push(T([x, Math.max(s.y[0], Math.min(s.y[1], y))]));
    }
    body += `<polyline class="curve c${i + 1}" points="${pts.map((p) => p.map(f).join(",")).join(" ")}"/>`;
    const end = pts[pts.length - 1];
    body += label([end[0] - 6, end[1] + (end[1] < 30 ? 14 : -10)], `${fn.oznaka}`, `lbl c${i + 1}-t`, "end");
  });
  for (const p of s.tocke) {
    const q = T([p.x, p.y]);
    body += dot(q, "pt acc-f") + label([q[0] + 8, q[1] + (p.y >= 0 ? -12 : 12)], p.oznaka, "lbl small", "start");
  }
  return { svg: svg(body), checks };
}

function coords(s, task) {
  const P = Object.fromEntries(s.tocke.map((p) => [p.oznaka, p]));
  const checks = [];
  for (const m of s.polovista ?? []) {
    const [a, b] = m.od.map((k) => P[k]);
    const ok = P[m.tocka].x === (a.x + b.x) / 2 && P[m.tocka].y === (a.y + b.y) / 2;
    checks.push({ ok, text: `${m.tocka} ${ok ? "jest" : "NIJE"} polovište dužine ${m.od.join("")}` });
  }
  checks.push(...numbersInText(s.tocke.filter((p) => p.zadana).map((p) => `${p.x} ${p.y}`), task));
  if (checks.some((x) => !x.ok)) return { checks };
  const T = fit([[s.x[0], s.y[0]], [s.x[1], s.y[1]]]);
  let body = axes(T, s.x, s.y);
  for (const [a, b] of s.duzine) body += line(T([P[a].x, P[a].y]), T([P[b].x, P[b].y]), "ln acc");
  for (const p of s.tocke) {
    const q = T([p.x, p.y]);
    body += dot(q, p.zadana ? "pt" : "pt acc-f");
    body += label([q[0] + 6, q[1] - 13], `${p.oznaka}(${p.zadana ? `${p.x}, ${p.y}` : "?"})`, "lbl small", "start");
  }
  return { svg: svg(body), checks };
}

function forces(s, task) {
  const th = (s.podloga.kut * Math.PI) / 180;
  const G = s.sile.find((x) => x.smjer === "dolje");
  const N = s.sile.find((x) => x.smjer === "okomito_od_podloge");
  const checks = [];
  if (G && N) {
    const exp = G.iznos * Math.cos(th);
    const ok = Math.abs(N.iznos - exp) <= 0.03 * exp;
    checks.push({ ok, text: `N = G·cos ${s.podloga.kut}° = ${exp.toFixed(1)} N ${ok ? "slaže se s" : "NE slaže se s"} ${N.iznos} N` });
  }
  checks.push(...numbersInText([`${s.podloga.kut}`, ...s.sile.filter((x) => x.zadana).map((x) => `${x.iznos}`)], task));
  if (checks.some((x) => !x.ok)) return { checks };

  const L = 300;
  const base = [40, 225];
  const top = [base[0] + L * Math.cos(th), base[1] - L * Math.sin(th)];
  const corner = [top[0], base[1]];
  let body = `<polygon class="shape fill" points="${[base, top, corner].map((p) => p.map(f).join(",")).join(" ")}"/>`;
  body += `<path class="ln thin" d="M${base[0] + 34},${base[1]} A34,34 0 0 0 ${f(base[0] + 34 * Math.cos(th))},${f(base[1] - 34 * Math.sin(th))}"/>`;
  body += label([base[0] + 50, base[1] - 10], `${s.podloga.kut}°`, "lbl small", "start");
  const along = [Math.cos(th), -Math.sin(th)];
  const normal = [-Math.sin(th), -Math.cos(th)];
  const at = [base[0] + along[0] * L * 0.48, base[1] + along[1] * L * 0.48];
  const bw = 46;
  const bh = 32;
  const corners = [[0, 0], [bw, 0], [bw, bh], [0, bh]].map(([u, v]) => [
    at[0] + along[0] * (u - bw / 2) + normal[0] * v,
    at[1] + along[1] * (u - bw / 2) + normal[1] * v,
  ]);
  body += `<polygon class="box" points="${corners.map((p) => p.map(f).join(",")).join(" ")}"/>`;
  const c = [at[0] + normal[0] * (bh / 2), at[1] + normal[1] * (bh / 2)];
  const max = Math.max(...s.sile.map((x) => x.iznos));
  const len = (v) => 30 + (v / max) * 70;
  const dir = { dolje: [0, 1], okomito_od_podloge: normal, uz_kosinu: along, niz_kosinu: [-along[0], -along[1]] };
  s.sile.forEach((x, i) => {
    const d = dir[x.smjer];
    const end = [c[0] + d[0] * len(x.iznos), c[1] + d[1] * len(x.iznos)];
    body += arrow(c, end, `c${i + 1}`);
    body += label([end[0] + d[0] * 14 + (d === dir.dolje ? 14 : 0), end[1] + d[1] * 14], x.oznaka, `lbl c${i + 1}-t`);
  });
  if (s.rastav && G) {
    const gp = G.iznos * Math.sin(th);
    const gn = G.iznos * Math.cos(th);
    const e1 = [c[0] - along[0] * len(gp), c[1] - along[1] * len(gp)];
    const e2 = [c[0] - normal[0] * len(gn), c[1] - normal[1] * len(gn)];
    body += arrow(c, e1, "acc").replace('class="arr', 'class="arr dash') + label([e1[0] - along[0] * 16, e1[1] - along[1] * 16 - 6], "G∥", "lbl small acc-t");
    body += arrow(c, e2, "acc").replace('class="arr', 'class="arr dash') + label([e2[0] - normal[0] * 16 + 4, e2[1] - normal[1] * 16], "G⊥", "lbl small acc-t", "start");
  }
  return { svg: svg(body), checks };
}

const resistorH = (x, y, lbl) =>
  `<rect class="box" x="${x - 22}" y="${y - 9}" width="44" height="18"/>` + label([x, y - 20], lbl, "lbl small");
const resistorV = (x, y, lbl, left = false) =>
  `<rect class="box" x="${x - 9}" y="${y - 22}" width="18" height="44"/>` +
  label([x + (left ? -14 : 14), y], lbl, "lbl small", left ? "end" : "start");

function circuit(s, task) {
  const series = s.spoj.serijski.filter((e) => e.R);
  const par = s.spoj.serijski.find((e) => e.paralelno)?.paralelno ?? [];
  const labels = [s.izvor.oznaka, ...series.map((e) => e.R), ...par.map((e) => e.R)];
  const checks = numbersInText(labels, task);
  checks.push({ ok: par.length <= 3, text: `paralelnih grana: ${par.length} (najviše 3 u ovom predlošku)` });
  if (checks.some((x) => !x.ok)) return { checks };
  const [x0, x1, y0, y1] = [70, par.length ? 225 : 320, 55, 215];
  let body = "";
  const wire = (a, b) => line(a, b, "ln");
  // izvor na lijevoj strani
  const ym = (y0 + y1) / 2;
  body += wire([x0, y0], [x0, ym - 8]) + wire([x0, ym + 8], [x0, y1]);
  body += line([x0 - 16, ym - 8], [x0 + 16, ym - 8], "ln thick") + line([x0 - 8, ym + 8], [x0 + 8, ym + 8], "ln thick");
  body += label([x0 + 24, ym], s.izvor.oznaka, "lbl small", "start");
  // serijski otpornici na gornjoj žici
  const step = (x1 - x0) / (series.length + 1);
  let x = x0;
  series.forEach((e, i) => {
    const cx = x0 + step * (i + 1);
    body += wire([x, y0], [cx - 22, y0]) + resistorH(cx, y0, e.R);
    x = cx + 22;
  });
  body += wire([x, y0], [x1, y0]);
  // paralelne grane desno
  if (par.length) {
    const gap = 75;
    par.forEach((e, i) => {
      const bx = x1 + i * gap;
      if (i) body += wire([x1 + (i - 1) * gap, y0], [bx, y0]) + wire([x1 + (i - 1) * gap, y1], [bx, y1]);
      body += wire([bx, y0], [bx, ym - 22]) + resistorV(bx, ym, e.R, i === 0 && par.length > 1) + wire([bx, ym + 22], [bx, y1]);
      body += dot([bx, y0], "pt") + dot([bx, y1], "pt");
    });
  } else body += wire([x1, y0], [x1, y1]);
  // ampermetar na donjoj žici
  const am = s.instrumenti?.find((i) => i.vrsta === "A");
  const ax = (x0 + x1) / 2;
  if (am) {
    body += wire([x0, y1], [ax - 13, y1]) + wire([ax + 13, y1], [x1, y1]);
    body += `<circle class="meter" cx="${ax}" cy="${y1}" r="13"/>` + label([ax, y1 + 1], "A", "lbl small");
  } else body += wire([x0, y1], [x1, y1]);
  return { svg: svg(body), checks };
}

const RENDERERS = { trokut: triangle, kruznica: circle, graf: graph, koordinatni: coords, sile: forces, strujni_krug: circuit };

// { svg } ako je skica ispravna; inače { svg: null, reason } i zadatak ide bez skice.
export function renderSketch(spec, task) {
  const r = RENDERERS[spec.tip];
  if (!r) return { svg: null, checks: [{ ok: false, text: `nepoznat tip skice „${spec.tip}“` }] };
  try {
    const out = r(spec, task);
    return { svg: out.checks.every((c) => c.ok) ? out.svg : null, checks: out.checks };
  } catch (e) {
    return { svg: null, checks: [{ ok: false, text: `opis se ne može nacrtati: ${e.message}` }] };
  }
}
