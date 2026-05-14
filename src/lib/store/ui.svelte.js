export const uiState = $state({ sidebarOpen: false });

export function openSidebar() { uiState.sidebarOpen = true; }
export function closeSidebar() { uiState.sidebarOpen = false; }
export function toggleSidebar() { uiState.sidebarOpen = !uiState.sidebarOpen; }
