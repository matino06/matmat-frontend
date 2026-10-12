import { apiClient } from "$lib/api/apiClient";

// Vlastiti predmeti kreatora. Učita ih root layout jednom kad postoji korisnik;
// sidebar ih prikazuje u skupini „Moji predmeti“, a /moji-predmeti ih uređuje.
export const ownCourses = $state({
  isCreator: false,
  courses: [],
  loaded: false,
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
  nov: "Novi · dodaj materijale",
  izrada: "Izrađuje se",
  nacrt: "Plan čeka pregled",
  potvrden: "Spremno",
};

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
