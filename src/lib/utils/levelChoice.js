// What a visitor picked on the landing page before signing in: maths level "A"
// or "B", "F" for Fizika or "K" for Kemija, so the onboarding can start on it instead of asking
// again. Kept for the tab's session only; the onboarding clears it once the
// course is saved.
const KEY = "mm-level";

export function rememberLevel(level) {
  try {
    sessionStorage.setItem(KEY, level);
  } catch {}
}

export function readRememberedLevel() {
  try {
    const level = sessionStorage.getItem(KEY);
    return ["A", "B", "F", "K"].includes(level) ? level : null;
  } catch {
    return null;
  }
}

export function clearRememberedLevel() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
