import "katex/dist/katex.min.css";
import "$lib/sketch/sketch.css"; // skice unutar objašnjenja (blok ```skica)

// Rendering logic lives in markdownCore.js (Node-safe, no CSS import) so it can be
// exercised by the CLI test harness. This module keeps the KaTeX stylesheet
// side-effect for the app and re-exports the same API, so existing imports
// (`renderMd`, `renderMdInline`, `normalizeMathDelims`, `md`) keep working.
export * from "./markdownCore.js";
