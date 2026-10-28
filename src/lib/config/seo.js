import { APP_STORE_URL } from "$lib/config/apps";

// What each public page says about itself in search results and in link
// previews (WhatsApp, iMessage, Instagram, Discord…). The root layout writes the
// tags once from here, so a page never ends up with two descriptions.
// `title` is the browser tab and the Google result; `ogTitle` is the bold line
// of a shared link, where the brand name already shows as og:site_name.
// Images are 1200×630 JPEGs under 300 KB (WhatsApp skips bigger ones), drawn by
// scripts/og/render.sh.
export const SITE = "https://matmat.online";

const HOME_IMAGE = { url: "/og/matmat.jpg", alt: "MatMat: priprema za maturu koja pamti umjesto tebe, uz zaslon Zadaci za danas iz aplikacije" };

export const PAGES = {
  "/": {
    title: "MatMat — priprema za maturu iz matematike i fizike",
    ogTitle: "Priprema za maturu koja pamti umjesto tebe",
    description:
      "Svaki dan zadaci iz matematike i fizike s rješenjem korak po korak, a MatMat pamti kad ti što treba ponoviti. Besplatno, na webu i iPhoneu.",
    image: HOME_IMAGE,
  },
  "/kako-radi": {
    title: "Kako radi MatMat — razmaknuto ponavljanje za maturu",
    ogTitle: "Ono što naučiš danas, znat ćeš i na maturi",
    description:
      "MatMat te vraća na gradivo baš kad ga počneš zaboravljati i vodi te redom, od osnova prema složenijem. Evo kako radi razmaknuto ponavljanje i zašto je bolje od bubanja.",
    image: { url: "/og/kako-radi.jpg", alt: "Ono što naučiš danas, znat ćeš i na maturi: popis gradiva i kad se koje vraća, od sutra do za 46 dana" },
  },
  "/privatnost": {
    title: "Pravila privatnosti — MatMat",
    description: "Koje podatke MatMat prikuplja, zašto, s kim ih dijeli, koliko ih čuva i kako ih možeš obrisati.",
    image: HOME_IMAGE,
  },
  "/podrska": {
    title: "Podrška — MatMat",
    description: "Pomoć za MatMat: prijava, AI asistent, podsjetnici, brisanje računa i kontakt.",
    image: HOME_IMAGE,
  },
};

// Every other page needs a sign-in: it gets the home page's preview when shared,
// but stays out of search results.
export const PRIVATE_PAGE = { ...PAGES["/"], title: "MatMat", noindex: true };

// Lets Google show "MatMat" as the site name and know the iPhone app.
export const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      name: "MatMat",
      alternateName: "MatMat – priprema za maturu",
      url: `${SITE}/`,
      inLanguage: "hr",
      publisher: { "@id": `${SITE}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "MatMat",
      url: `${SITE}/`,
      logo: `${SITE}/icon-192.png`,
      email: "info@matmat.online",
      sameAs: [APP_STORE_URL],
    },
    {
      "@type": "MobileApplication",
      name: "MatMat – priprema za maturu",
      operatingSystem: "iOS 18.0 ili noviji",
      applicationCategory: "EducationalApplication",
      inLanguage: "hr",
      url: APP_STORE_URL,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      publisher: { "@id": `${SITE}/#organization` },
    },
  ],
};
