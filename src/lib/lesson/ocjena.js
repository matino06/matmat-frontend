// Rečenica ispod predložene ocjene nakon interaktivne lekcije: odakle je ocjena (sažetak iz LessonRunnera).
// "Iz prve si riješio 1 od 3 dijela, zato je predloženo 2. …"
export function objasnjenjeOcjene(s) {
  let t;
  if (s.nacin === "cijeli") {
    t = s.odmah ? `Cijeli zadatak si riješio sam iz prve, zato je predloženo ${s.q}.` : `Cijeli zadatak si riješio sam, ali ne iz prve, zato je predloženo ${s.q}.`;
  } else if (s.nacin === "koraci") {
    const slican = { odmah: "riješio sam iz prve", uz_pomoc: "riješio tek iz više pokušaja" }[s.slican] ?? "nisi riješio";
    t = `Zadatak si riješio uz korake, a sličan zadatak ${slican}, zato je predloženo ${s.q}.`;
  } else {
    const n = s.dijelova;
    const jedan = n % 10 === 1 && n % 100 !== 11;
    const par = n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14);
    t =
      s.odmah === n
        ? `Sve si riješio iz prve, zato je predloženo ${s.q}.`
        : `Iz prve si riješio ${s.odmah} od ${n} ${jedan || par ? "dijela" : "dijelova"}, zato je predloženo ${s.q}.`;
  }
  if (s.najvise > s.q) t += ` Ako si negdje samo krivo upisao, ocjenu možeš podići do ${s.najvise}.`;
  return t;
}
