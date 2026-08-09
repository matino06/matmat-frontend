// Holds the part of a task the student highlighted, so the AI panel (which lives
// in the root layout) can attach it to their next message. Same page-writes /
// panel-reads pattern as currentTask.svelte.js.
//
// quote = { text: string, images: [{ src, alt }], source: "task" | "solution" }
export const aiQuoteState = $state({
  quote: null,
});

export function setAiQuote(quote) {
  aiQuoteState.quote = quote;
}

export function clearAiQuote() {
  aiQuoteState.quote = null;
}
