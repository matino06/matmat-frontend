import { apiClient } from "$lib/api/apiClient";

// AI consent (GET/POST /account/ai-consent): whether the student allows their data to be sent to the AI. The same
// text and version as the iOS app; the backend stores the decision with the version, time and source.
export const AI_CONSENT_VERSION = "2026-10-15";

export const AI_CONSENT_TITLE = "AI asistent i tvoji podaci";

export const AI_CONSENT_SECTIONS = [
  {
    heading: "Što se šalje",
    text: "Pitanje koje postaviš AI asistentu, zadatak i rješenje uz koje pitaš te dijelovi teksta i slike koje sam dodaš. Na probnoj maturi i odgovori i fotografije rješenja koje AI ocjenjuje, a kreatorima i materijali vlastitih predmeta od kojih AI izrađuje lekcije i zadatke.",
  },
  {
    heading: "Kome",
    text: "MatMat to šalje preko usluge OpenRouter modelima tvrtki Anthropic, OpenAI, Google i Xiaomi, i to samo pružateljima koji podatke ne čuvaju i ne uče na njima.",
  },
  { heading: "Što se ne šalje", text: "Tvoje ime i e-mail adresa ne šalju se nikad." },
  {
    heading: "Ako ne pristaneš",
    text: "I dalje rješavaš zadatke, mapu, ponavljanje i višestruki izbor na probnoj maturi. AI asistent i AI ocjenjivanje bit će isključeni.",
  },
];

// granted: true / false once decided, null while undecided; loaded: the answer arrived (an error leaves it unknown,
// so nobody is asked twice because of a bad connection).
export const aiConsent = $state({ granted: null, loaded: false });

export const loadAiConsent = async () => {
  try {
    const r = await apiClient("/account/ai-consent", { method: "GET" });
    if (!r.ok) return;
    const body = await r.json();
    aiConsent.granted = body.granted ?? null;
    aiConsent.loaded = true;
  } catch {}
};

export const resetAiConsent = () => {
  aiConsent.granted = null;
  aiConsent.loaded = false;
};

// Records the decision; throws if it wasn't saved.
export const decideAiConsent = async (granted) => {
  const r = await apiClient("/account/ai-consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ granted, version: AI_CONSENT_VERSION, source: "web" }),
  });
  if (!r.ok) throw new Error(String(r.status));
  const body = await r.json();
  aiConsent.granted = body.granted ?? granted;
  aiConsent.loaded = true;
};
