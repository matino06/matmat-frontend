// FSRS-6, the same as the backend's Fsrs.java (default parameters, desired retention 0.9, whole days, no fuzz).
// Only for the /kako-radi simulation: a student's real intervals always come from the backend.
// grade: 1 nisam riješio, 2 s mukom, 3 dobro, 4 lako.

const W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629,
  1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
];
const DECAY = -W[20];
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;
const clampD = (d) => Math.min(Math.max(d, 1), 10);
const initialD = (g) => W[4] - Math.exp(W[5] * (g - 1)) + 1;

// Probability of still knowing a lesson `days` after solving it.
export const retrievability = (days, s) => Math.pow(1 + (FACTOR * days) / s, DECAY);

// Days until the probability falls to 90 %: the next review.
export const interval = (s) => Math.min(Math.max(Math.round(s), 1), 3650);

// State { s, d } after rating `grade`, `days` after the previous rating (null state: the first rating).
export function next(state, grade, days) {
  if (!state) return { s: W[grade - 1], d: clampD(initialD(grade)) };
  const { s, d } = state;
  let s2;
  if (days < 1) {
    const inc = Math.exp(W[17] * (grade - 3 + W[18])) * Math.pow(s, -W[19]);
    s2 = s * (grade >= 2 ? Math.max(inc, 1) : inc);
  } else {
    const r = retrievability(days, s);
    if (grade === 1) {
      s2 = Math.min(
        W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]),
        s / Math.exp(W[17] * W[18]),
      );
    } else {
      const bonus = grade === 2 ? W[15] : grade === 4 ? W[16] : 1;
      s2 = s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * bonus);
    }
  }
  const damped = d + ((10 - d) * -W[6] * (grade - 3)) / 9;
  return { s: Math.max(s2, 0.001), d: clampD(W[7] * initialD(4) + (1 - W[7]) * damped) };
}
