export const uiState = $state({ sidebarOpen: false, sidebarCollapsed: false });

export function openSidebar() { uiState.sidebarOpen = true; }
export function closeSidebar() { uiState.sidebarOpen = false; }
export function toggleSidebar() { uiState.sidebarOpen = !uiState.sidebarOpen; }

// Desktop icon-rail mode. The CSS keys off <html data-sidebar="collapsed">, which
// app.html sets from localStorage before first paint (no flash of the wide sidebar),
// so the state is read back from there once the app has mounted.
export function initSidebarCollapsed() {
  uiState.sidebarCollapsed = document.documentElement.dataset.sidebar === "collapsed";
}
export function setSidebarCollapsed(collapsed) {
  uiState.sidebarCollapsed = collapsed;
  if (collapsed) document.documentElement.dataset.sidebar = "collapsed";
  else delete document.documentElement.dataset.sidebar;
  try {
    localStorage.setItem("mm-sidebar", collapsed ? "collapsed" : "expanded");
  } catch {
    // Storage blocked (private mode): the choice just won't survive a reload.
  }
}
export function toggleSidebarCollapsed() { setSidebarCollapsed(!uiState.sidebarCollapsed); }
