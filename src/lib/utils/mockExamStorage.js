const KEY_PREFIX = "mm-mock-exam-";

function key(examId) {
  return `${KEY_PREFIX}${examId}`;
}

function readEntry(examId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(examId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeEntry(examId, entry) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(examId), JSON.stringify(entry));
  } catch {}
}

export function loadMockExamAnswers(examId) {
  return readEntry(examId)?.answers ?? {};
}

export function saveMockExamAnswers(examId, answers) {
  const startedAt = readEntry(examId)?.startedAt ?? Date.now();
  writeEntry(examId, { answers, startedAt, updatedAt: Date.now() });
}

// Start time of the current attempt. It survives reloads while the attempt has
// answers; opening an exam without answering anything starts the clock fresh.
export function ensureMockExamStartedAt(examId) {
  const entry = readEntry(examId);
  const hasAnswers = Object.keys(entry?.answers ?? {}).length > 0;
  if (hasAnswers && entry.startedAt) return entry.startedAt;

  const startedAt = Date.now();
  writeEntry(examId, {
    answers: entry?.answers ?? {},
    startedAt,
    updatedAt: startedAt,
  });
  return startedAt;
}

export function clearMockExamAnswers(examId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(examId));
  } catch {}
}
