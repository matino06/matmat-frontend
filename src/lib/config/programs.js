// Single source of truth for the courses the app offers. `label` is the full
// name shown in the sidebar switcher, `short` the subject alone for breadcrumbs
// and panel subtitles, `pdf` the formula sheet served for that course.
// Programs sharing a `subject` are its levels: a student picks one of them
// (`level` + `hint` describe it in the subject picker).
// `adminOnly` programs are hidden from regular users; `comingSoon` ones (none at the moment) are
// shown in the subject picker as "Uskoro" and only admins can pick them.
export const PROGRAMS = [
  {
    id: 1,
    subject: "matematika",
    label: "Matematika A razina",
    short: "Matematika",
    level: "A",
    hint: "Zahtjevnija, za studije gdje matematika ima veću ulogu (STEM).",
    badge: "MA",
    color: "239",
    sub: "Državna matura",
    pdf: "/pdfs/MAT-FORMULE.pdf",
  },
  {
    id: 2,
    subject: "matematika",
    label: "Matematika B razina",
    short: "Matematika",
    level: "B",
    hint: "Osnovna, za ostale studije.",
    badge: "MB",
    color: "215",
    sub: "Državna matura",
    pdf: "/pdfs/MAT-FORMULE.pdf",
  },
  {
    id: 4,
    subject: "fizika",
    label: "Fizika",
    short: "Fizika",
    badge: "FIZ",
    color: "280",
    sub: "Državna matura",
    pdf: "/pdfs/FIZ-FORMULE.pdf",
  },
  {
    id: 3,
    subject: "ekonomska-matematika",
    label: "Ekonomska Matematika EFZG",
    short: "Ekonomska Matematika",
    badge: "EF",
    color: "160",
    sub: "Ekonomska Matematika na fakultetu EFZG",
    pdf: "/pdfs/MAT-FORMULE.pdf",
    adminOnly: true,
  },
];

export const getProgram = (courseId) => PROGRAMS.find((p) => p.id === courseId);

export const isVisibleProgram = (p, isAdmin) => !p.adminOnly || isAdmin;
export const isSelectableProgram = (p, isAdmin) => isAdmin || (!p.adminOnly && !p.comingSoon);

// Subjects in PROGRAMS order, each with its levels, for the subject picker.
export const subjectsFor = (isAdmin) => {
  const subjects = [];
  for (const p of PROGRAMS) {
    if (!isVisibleProgram(p, isAdmin)) continue;
    const s = subjects.find((s) => s.id === p.subject);
    if (s) s.programs.push(p);
    else subjects.push({ id: p.subject, name: p.short, programs: [p] });
  }
  return subjects;
};

// "Matematika A", "Fizika": a program named as short as it stays unambiguous.
export const shortName = (p) => (p.level ? `${p.short} ${p.level}` : p.short);
