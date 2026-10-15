// Interaktivna verzija zadatka iz API-ja (task.lessonUi), za stranice koje zadatak prikazuju.
import { VERZIJA } from "./validateLesson.js";

// Lekcija iz task.lessonUi, ili null: nema je, nije JSON ili je format verzije koju ova aplikacija ne zna
// (tada se zadatak prikazuje kao tekst, kao i dosad).
export function interaktivnaLekcija(task) {
  if (!task?.lessonUi) return null;
  try {
    const l = JSON.parse(task.lessonUi);
    return l?.verzija === VERZIJA ? l : null;
  } catch {
    return null;
  }
}
