export const panelState = $state({
  aiOpen: false,
  formuleOpen: false,
  pomoOpen: false,
  pomoVisible: false,
});

export function toggleAI() { panelState.aiOpen = !panelState.aiOpen; }
export function openAI() { panelState.aiOpen = true; }
export function closeAI() { panelState.aiOpen = false; }

export function toggleFormule() { panelState.formuleOpen = !panelState.formuleOpen; }
export function openFormule() { panelState.formuleOpen = true; }
export function closeFormule() { panelState.formuleOpen = false; }

export function togglePomo() { panelState.pomoOpen = !panelState.pomoOpen; }
export function openPomo() { panelState.pomoOpen = true; }
export function closePomo() { panelState.pomoOpen = false; }

export function showPomoWidget() { panelState.pomoVisible = true; }
export function hidePomoWidget() { panelState.pomoVisible = false; }
