import { apiClient } from "$lib/api/apiClient";

// Vlastiti predmeti kreatora. Učita ih root layout jednom kad postoji korisnik;
// sidebar ih prikazuje u skupini „Moji predmeti“, a /moji-predmeti ih uređuje.
export const ownCourses = $state({
  isCreator: false,
  courses: [],
  loaded: false,
  // materijal „dostupan na ispitu“ trenutnog vlastitog predmeta, za panel Formule
  examMaterials: { courseId: null, list: [] },
});

export const SUBJECTS = [
  { id: "matematika", label: "Matematika" },
  { id: "fizika", label: "Fizika" },
  { id: "kemija", label: "Kemija" },
  { id: "biologija", label: "Biologija" },
  { id: "informatika", label: "Informatika" },
  { id: "ostalo", label: "Ostalo" },
];
export const LEVELS = [
  { id: "os78", label: "7.–8. razred osnovne škole" },
  { id: "ss", label: "Srednja škola" },
];
export const STATUS_LABELS = {
  nov: "Dodaj materijale",
  izrada: "Izrađuje se",
  nacrt: "Plan čeka pregled",
  potvrden: "Izrađuju se zadaci",
  spreman: "Spremno za učenje",
  prevelik: "Gradivo je preopsežno",
};
// Boja točke statusa (.status-dot): u izradi, čeka kreatora, gotovo, zapelo.
export const STATUS_TONES = { izrada: "busy", potvrden: "busy", nacrt: "wait", spreman: "done", prevelik: "bad" };

export const loadOwnCourses = async () => {
  try {
    const res = await apiClient("/account/is-creator", { method: "GET" });
    ownCourses.isCreator = res.ok ? await res.json() : false;
    if (ownCourses.isCreator) {
      const list = await apiClient("/own-courses", { method: "GET" });
      if (list.ok) ownCourses.courses = await list.json();
    }
  } catch {}
  ownCourses.loaded = true;
};

export const findOwnCourse = (courseId) =>
  ownCourses.courses.find((c) => c.courseId === courseId);

// Privremeni linkovi (2 h) na materijal dostupan na ispitu; učitava ih layout kad je vlastiti predmet trenutni.
export const loadExamMaterials = async (courseId) => {
  ownCourses.examMaterials = { courseId, list: [] };
  try {
    const res = await apiClient(`/own-courses/${courseId}/exam-materials`, { method: "GET" });
    if (res.ok && ownCourses.examMaterials.courseId === courseId) {
      ownCourses.examMaterials = { courseId, list: await res.json() };
    }
  } catch {}
};

// Oznaka u izborniku: inicijali naziva, kao kod avatara.
export const courseBadge = (name) =>
  (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

// Boja se izvodi iz naziva, pa isti predmet uvijek ima istu boju.
export const courseHue = (name) => {
  let h = 0;
  for (const ch of name ?? "") h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};
