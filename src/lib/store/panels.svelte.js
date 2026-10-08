export const panelState = $state({
  aiOpen: false,
  formuleOpen: false,
  pomoOpen: false,
  pomoVisible: false,
});

// The AI chat and the formula sheet share the right-hand side (a column next to
// the page on wide screens), so opening one closes the other. Closing only hides
// a panel — the chat keeps its conversation.
export function toggleAI() { panelState.aiOpen ? closeAI() : openAI(); }
export function openAI() { panelState.formuleOpen = false; panelState.aiOpen = true; }
export function closeAI() { panelState.aiOpen = false; }

export function toggleFormule() { panelState.formuleOpen ? closeFormule() : openFormule(); }
export function openFormule() { panelState.aiOpen = false; panelState.formuleOpen = true; }
export function closeFormule() { panelState.formuleOpen = false; }

export function togglePomo() { panelState.pomoOpen = !panelState.pomoOpen; }
export function openPomo() { panelState.pomoOpen = true; }
export function closePomo() { panelState.pomoOpen = false; }

export function showPomoWidget() { panelState.pomoVisible = true; }
export function hidePomoWidget() { panelState.pomoVisible = false; }
