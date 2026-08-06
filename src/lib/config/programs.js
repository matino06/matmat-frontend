// Single source of truth for the courses the app offers. `label` is the full
// name shown in the sidebar switcher, `short` the subject alone for breadcrumbs
// and panel subtitles, `pdf` the formula sheet served for that course.
// `adminOnly` programs are hidden from the switcher for regular users.
export const PROGRAMS = [
  {
    id: 1,
    label: "Matematika A razina",
    short: "Matematika",
    badge: "MA",
    color: "239",
    sub: "Državna matura",
    pdf: "/pdfs/MAT-FORMULE.pdf",
  },
  {
    id: 2,
    label: "Matematika B razina",
    short: "Matematika",
    badge: "MB",
    color: "215",
    sub: "Državna matura",
    pdf: "/pdfs/MAT-FORMULE.pdf",
  },
  {
    id: 3,
    label: "Ekonomska Matematika EFZG",
    short: "Ekonomska Matematika",
    badge: "EF",
    color: "160",
    sub: "Ekonomska Matematika na fakultetu EFZG",
    pdf: "/pdfs/MAT-FORMULE.pdf",
    adminOnly: true,
  },
  {
    id: 4,
    label: "Fizika",
    short: "Fizika",
    badge: "FIZ",
    color: "280",
    sub: "Državna matura",
    pdf: "/pdfs/FIZ-FORMULE.pdf",
    adminOnly: true,
  },
];

export const getProgram = (courseId) => PROGRAMS.find((p) => p.id === courseId);
