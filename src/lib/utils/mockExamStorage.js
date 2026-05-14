const KEY_PREFIX = "mm-mock-exam-";

function key(examId) {
  return `${KEY_PREFIX}${examId}`;
}

export function loadMockExamAnswers(examId) {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key(examId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed?.answers ?? {};
  } catch {
    return {};
  }
}

export function saveMockExamAnswers(examId, answers) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      key(examId),
      JSON.stringify({ answers, updatedAt: Date.now() }),
    );
  } catch {}
}

export function clearMockExamAnswers(examId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(examId));
  } catch {}
}
