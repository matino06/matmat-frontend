// Holds the part of a task the student pointed the AI at, so the AI panel (which
// lives in the root layout) can attach it to their next message. Same page-writes /
// panel-reads pattern as currentTask.svelte.js.
//
// quote = {
//   text,     // what the student sees: pinned above the input and in their message
//   context,  // optional full context for the model; falls back to `text`. Lets a
//             // whole exam question be sent without dumping it into the UI.
//   images,   // [{ src, alt }] — attached to the request as real images
//   source,   // "task" | "solution" | "exam"
// }
export const aiQuoteState = $state({
  quote: null,
});

export function setAiQuote(quote) {
  aiQuoteState.quote = quote;
}

export function clearAiQuote() {
  aiQuoteState.quote = null;
}
