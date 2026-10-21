// One-time tips: a small bubble at one element (data-tour) the first time it is useful,
// instead of showing every feature in the walkthrough. Seen tips are kept per device.
const KLJUC = "mm-savjeti";

export const SAVJETI = {
  formule: {
    meta: "nav-formule",
    naslov: "Formule su uvijek pri ruci",
    tekst: "Formule i materijal s ispita otvaraš ovdje ili tipkom F, a zadatak ostaje otvoren.",
  },
  ai: {
    meta: "ai",
    naslov: "Nešto ti nije jasno?",
    tekst: "Pitaj AI asistenta. Zna koji zadatak gledaš, a dok ne otvoriš rješenje daje samo savjete, ne rješenje.",
  },
  kreator: {
    meta: "predmet",
    naslov: "Složi vlastiti predmet",
    tekst: "Od svojih materijala možeš složiti predmet s lekcijama i zadacima: otvori izbornik predmeta pa Novi predmet.",
  },
};

export const savjeti = $state({ aktivan: null });

function vidjeni() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KLJUC) ?? "[]"));
  } catch {
    return new Set();
  }
}

// Shown once, and one at a time: while another tip is open this one waits for the next chance.
export function ponudiSavjet(id) {
  if (typeof localStorage === "undefined" || savjeti.aktivan || vidjeni().has(id)) return;
  savjeti.aktivan = id;
}

export function zatvoriSavjet() {
  const v = vidjeni();
  v.add(savjeti.aktivan);
  try {
    localStorage.setItem(KLJUC, JSON.stringify([...v]));
  } catch {}
  savjeti.aktivan = null;
}

// Its element isn't on screen (e.g. the nav in a closed phone menu): offered again later.
export function odgodiSavjet() {
  savjeti.aktivan = null;
}

export function resetirajSavjete() {
  try {
    localStorage.removeItem(KLJUC);
  } catch {}
}
