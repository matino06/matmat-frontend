// Račun u ℂ za izraze s kompleksnim brojevima (core/expr.js: compileKompleksno). Broj je { re, im }.
// Glavne vrijednosti: arg u ⟨−π, π] (ili [0, 2π⟩ uz argOdNule), √ i potencije preko glavnog logaritma.

export const C = (re, im = 0) => ({ re, im });
const NAN = C(NaN, NaN);

// Ostatak računa (1,2·10⁻¹⁶ i umjesto 0) ne smije prebaciti broj preko reza (−1 − 0i ima arg −π, a −1 arg π).
function sredi(z) {
  const m = Math.hypot(z.re, z.im);
  const malo = 1e-13 * Math.max(1, m);
  return C(Math.abs(z.re) < malo ? 0 : z.re, Math.abs(z.im) < malo ? 0 : z.im);
}

export const dodaj = (a, b) => C(a.re + b.re, a.im + b.im);
export const oduzmi = (a, b) => C(a.re - b.re, a.im - b.im);
export const pomnozi = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export function podijeli(a, b) {
  const d = b.re * b.re + b.im * b.im;
  if (d === 0) return NAN;
  return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
}
export const modul = (z) => Math.hypot(z.re, z.im);
export function argument(z, odNule = false) {
  const s = sredi(z);
  if (s.re === 0 && s.im === 0) return NaN;
  const a = Math.atan2(s.im, s.re);
  return odNule && a < 0 ? a + 2 * Math.PI : a;
}
const cexp = (z) => C(Math.exp(z.re) * Math.cos(z.im), Math.exp(z.re) * Math.sin(z.im));
function cln(z) {
  const s = sredi(z);
  if (s.re === 0 && s.im === 0) return NAN;
  return C(Math.log(modul(s)), Math.atan2(s.im, s.re));
}
function csqrt(z) {
  const s = sredi(z);
  const m = modul(s);
  const re = Math.sqrt((m + s.re) / 2);
  const im = Math.sqrt(Math.max(0, (m - s.re) / 2));
  return C(re, s.im < 0 ? -im : im);
}
export function potencija(a, b) {
  const b0 = sredi(b);
  // cijeli eksponent: uzastopno množenje (točno i za negativnu bazu)
  if (b0.im === 0 && Number.isInteger(b0.re) && Math.abs(b0.re) <= 1024) {
    let n = Math.abs(b0.re);
    let r = C(1);
    let x = a;
    while (n) {
      if (n & 1) r = pomnozi(r, x);
      x = pomnozi(x, x);
      n >>= 1;
    }
    return b0.re < 0 ? podijeli(C(1), r) : r;
  }
  const a0 = sredi(a);
  if (a0.re === 0 && a0.im === 0) return b0.re > 0 ? C(0) : NAN;
  // pozitivna realna baza s realnim eksponentom: isto kao realni račun
  if (a0.im === 0 && a0.re > 0 && b0.im === 0) return C(a0.re ** b0.re);
  return cexp(pomnozi(b0, cln(a0)));
}

const csin = (z) => C(Math.sin(z.re) * Math.cosh(z.im), Math.cos(z.re) * Math.sinh(z.im));
const ccos = (z) => C(Math.cos(z.re) * Math.cosh(z.im), -Math.sin(z.re) * Math.sinh(z.im));
const csinh = (z) => C(Math.sinh(z.re) * Math.cos(z.im), Math.cosh(z.re) * Math.sin(z.im));
const ccosh = (z) => C(Math.cosh(z.re) * Math.cos(z.im), Math.sinh(z.re) * Math.sin(z.im));

// Funkcije koje u ℂ imaju svoj račun; ostale (arkus, area, fact…) rade samo za realan argument.
export const FUNKCIJE_C = {
  re: (z) => C(z.re),
  im: (z) => C(z.im),
  Re: (z) => C(z.re),
  Im: (z) => C(z.im),
  conj: (z) => C(z.re, -z.im),
  abs: (z) => C(modul(z)),
  arg: (z, o) => C(argument(z, o?.argOdNule)),
  sqrt: csqrt,
  exp: cexp,
  ln: cln,
  log: (z) => {
    const l = cln(z);
    return C(l.re / Math.LN10, l.im / Math.LN10);
  },
  sin: csin,
  cos: ccos,
  tan: (z) => podijeli(csin(z), ccos(z)),
  ctg: (z) => podijeli(ccos(z), csin(z)),
  cot: (z) => podijeli(ccos(z), csin(z)),
  sh: csinh,
  sinh: csinh,
  ch: ccosh,
  cosh: ccosh,
  th: (z) => podijeli(csinh(z), ccosh(z)),
  tanh: (z) => podijeli(csinh(z), ccosh(z)),
  cth: (z) => podijeli(ccosh(z), csinh(z)),
  coth: (z) => podijeli(ccosh(z), csinh(z)),
};

// Realna funkcija u ℂ: samo za realan argument i realan rezultat (arcsin 2 nema vrijednost).
export function realnaUC(f) {
  return (z) => {
    const s = sredi(z);
    if (s.im !== 0) return NAN;
    const v = f(s.re);
    return Number.isFinite(v) ? C(v) : NAN;
  };
}

// Imena koja postoje samo u kompleksnom načinu (u realnom bi „re“ ili „im“ promijenili čitanje postojećih unosa).
export const SAMO_KOMPLEKSNE = ["re", "im", "Re", "Im", "conj", "arg"];
