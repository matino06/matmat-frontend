// PROTOTIP (ticket „Prikaz napretka izrade kreatoru“): simulirana izrada vlastitog predmeta, samo u memoriji.
// Scenariji pokrivaju odluke iz „Gdje se izvršava obrada materijala i generiranje“ (#10)
// i „Trošak po predmetu i ograničenja uploada“ (#13).

export const SCENARIJI = {
  mali: { naziv: "Mali predmet (40 lekcija)", stranice: 80, lekcije: 40 },
  veliki: { naziv: "Veliki predmet (135 lekcija, batch)", stranice: 252, lekcije: 135 },
  kvota: { naziv: "Kvota se potroši usred izrade", stranice: 252, lekcije: 135, kvotaPocetak: 85 },
  greska: { naziv: "Korak ne uspije ni nakon 3 pokušaja", stranice: 80, lekcije: 40, greska: true },
  globalno: { naziv: "Globalni limit (admin)", stranice: 80, lekcije: 40, globalno: true },
};

export const KORACI_PLANA = ["Opseg gradiva", "Stavke znanja", "Preduvjeti", "Lekcije", "Provjera plana"];
export const FAZE = [
  { id: "citanje", naziv: "Čitanje materijala" },
  { id: "plan", naziv: "Izrada plana" },
  { id: "nacrt", naziv: "Pregled i potvrda plana" },
  { id: "zadaci", naziv: "Izrada prvih zadataka" },
  { id: "gotovo", naziv: "Spremno za učenje" },
];

function fresh(sc = "mali") {
  const s = SCENARIJI[sc];
  return {
    scenarij: sc,
    predmet: sc === "mali" || sc === "greska" || sc === "globalno" ? "Kemija — test iz kiselina i baza" : "Fizika — državna matura",
    stranice: s.stranice,
    lekcijeUkupno: s.lekcije,
    faza: "citanje",
    status: "radi", // radi | ceka-kvotu | neuspjelo | pauzirano | ceka-kreatora | gotovo | odustao
    procitano: 0,
    korakPlana: 0,
    pokusaj: 0,
    zadaciGotovi: 0,
    batch: false,
    kvota: s.kvotaPocetak ?? 20,
    procjenaKvote: s.stranice > 100 ? 40 : 15,
    log: [{ t: "14:02", tekst: `Uploadano ${s.stranice} stranica materijala.` }],
    email: null,
    sat: 14 * 60 + 2,
  };
}

export const sim = $state(fresh());

function vrijeme() {
  sim.sat += 1;
  return `${String(Math.floor(sim.sat / 60) % 24).padStart(2, "0")}:${String(sim.sat % 60).padStart(2, "0")}`;
}
const log = (tekst, vrsta = "") => (sim.log = [{ t: vrijeme(), tekst, vrsta }, ...sim.log]);

export function reset(sc = sim.scenarij) {
  Object.assign(sim, fresh(sc));
}

// jedan korak simulacije
export function korak() {
  const sc = SCENARIJI[sim.scenarij];
  if (sim.status !== "radi") return;
  if (sim.faza === "citanje") {
    sim.procitano = Math.min(sim.stranice, sim.procitano + Math.ceil(sim.stranice / 4));
    sim.kvota = Math.min(100, sim.kvota + 2);
    if (sim.procitano >= sim.stranice) {
      log(`Pročitano svih ${sim.stranice} stranica.`);
      sim.faza = "plan";
    }
    return;
  }
  if (sim.faza === "plan") {
    if (sc.globalno && sim.korakPlana === 1 && !sim._g) {
      sim._g = true;
      sim.status = "pauzirano";
      log("Izrada je privremeno zaustavljena zbog velikog opterećenja.", "warn");
      return;
    }
    if (sc.greska && sim.korakPlana === 4 && sim.pokusaj < 3) {
      sim.pokusaj += 1;
      if (sim.pokusaj < 3) {
        log(`Provjera plana nije uspjela, pokušavam ponovno (${sim.pokusaj}/3).`, "warn");
        return;
      }
      sim.status = "neuspjelo";
      log("Provjera plana nije uspjela ni nakon 3 pokušaja.", "err");
      return;
    }
    sim.kvota = Math.min(100, sim.kvota + (sc.kvotaPocetak ? 6 : 4));
    if (sc.kvotaPocetak && sim.kvota >= 100 && sim.korakPlana >= 1) {
      sim.status = "ceka-kvotu";
      log(`Mjesečna kvota je potrošena. Gotovi koraci su spremljeni; izrada se nastavlja 1. studenoga.`, "warn");
      return;
    }
    log(`${KORACI_PLANA[sim.korakPlana]}: gotovo.`);
    sim.korakPlana += 1;
    if (sim.korakPlana >= KORACI_PLANA.length) {
      sim.faza = "nacrt";
      sim.status = "ceka-kreatora";
      log(`Plan je spreman: ${sim.lekcijeUkupno} lekcija. Pregledaj ga i potvrdi.`, "ok");
      sim.email = "Tvoj plan je spreman za pregled";
    }
    return;
  }
  if (sim.faza === "zadaci") {
    if (!sim.batch) {
      sim.zadaciGotovi = Math.min(sim.lekcijeUkupno, sim.zadaciGotovi + (sim.lekcijeUkupno > 50 ? 5 : 10));
      if (sim.lekcijeUkupno > 50 && sim.zadaciGotovi >= 5) {
        sim.batch = true;
        log("Prvih 5 lekcija je spremno, možeš početi učiti. Ostale se izrađuju do 24 h.", "ok");
        return;
      }
    } else {
      sim.zadaciGotovi = sim.lekcijeUkupno;
      sim.sat += 60 * 9;
    }
    if (sim.zadaciGotovi >= sim.lekcijeUkupno) {
      sim.faza = "gotovo";
      sim.status = "gotovo";
      log(`Zadaci za svih ${sim.lekcijeUkupno} lekcija su spremni.`, "ok");
      sim.email = "Tvoj predmet je spreman za učenje";
    }
  }
}

export function potvrdiPlan() {
  sim.faza = "zadaci";
  sim.status = "radi";
  log("Plan je potvrđen. Kreće izrada zadataka.");
}
export function pokusajPonovno() {
  sim.status = "radi";
  sim.pokusaj = 0;
  sim.korakPlana = 4;
  log("Ručni ponovni pokušaj provjere plana.");
  sim.scenarij = "mali"; // u simulaciji drugi pokušaj uspije
}
export function nastavi() {
  // simulira 1. u mjesecu (obnova kvote) ili nastavak nakon globalne pauze
  if (sim.status === "ceka-kvotu") {
    sim.kvota = 0;
    sim.sat += 60 * 24 * 12;
    log("Kvota je obnovljena. Izrada se nastavlja.", "ok");
    sim.scenarij = "veliki";
  } else log("Izrada se nastavlja.", "ok");
  sim.status = "radi";
}
export function odustani() {
  sim.status = "odustao";
  log("Izrada je otkazana, nedovršeni predmet je obrisan.", "err");
}

export function opisStatusa() {
  switch (sim.status) {
    case "radi": return "Radi";
    case "ceka-kvotu": return "Čeka obnovu kvote";
    case "neuspjelo": return "Neuspjelo";
    case "pauzirano": return "Pauzirano";
    case "ceka-kreatora": return "Čeka tebe";
    case "gotovo": return "Spremno";
    case "odustao": return "Otkazano";
  }
}

export function postotak() {
  const w = { citanje: [0, 25], plan: [25, 70], nacrt: [70, 72], zadaci: [72, 100], gotovo: [100, 100] }[sim.faza];
  const unutar =
    sim.faza === "citanje" ? sim.procitano / sim.stranice
    : sim.faza === "plan" ? sim.korakPlana / KORACI_PLANA.length
    : sim.faza === "zadaci" ? sim.zadaciGotovi / sim.lekcijeUkupno : 1;
  return Math.round(w[0] + (w[1] - w[0]) * unutar);
}

export function opisFaze() {
  if (sim.faza === "citanje") return `Čitam materijal: ${sim.procitano} od ${sim.stranice} stranica`;
  if (sim.faza === "plan") return `Izrađujem plan: ${KORACI_PLANA[Math.min(sim.korakPlana, 4)]} (${Math.min(sim.korakPlana + 1, 5)}/5)`;
  if (sim.faza === "nacrt") return `Plan je spreman: ${sim.lekcijeUkupno} lekcija čeka tvoj pregled`;
  if (sim.faza === "zadaci")
    return sim.batch
      ? `Prvih 5 lekcija spremno; ostalih ${sim.lekcijeUkupno - 5} izrađuje se do 24 h`
      : `Izrađujem zadatke: ${sim.zadaciGotovi} od ${sim.lekcijeUkupno} lekcija`;
  return `Spremno: ${sim.lekcijeUkupno} lekcija`;
}
