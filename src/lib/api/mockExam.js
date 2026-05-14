import { apiClient } from "$lib/api/apiClient";
import { dataUrlToBlob, extensionForMime } from "$lib/utils/dataUrl";

const MAX_TOTAL_BYTES = 14 * 1024 * 1024;

function normalizeStatus(s) {
  if (!s) return s;
  const u = s.toUpperCase();
  if (u === "ERROR") return "FAILED";
  if (u === "GRADED") return "DONE";
  return u;
}

function normalizeAttempt(a) {
  if (!a) return a;
  return {
    ...a,
    gradingStatus: normalizeStatus(a.gradingStatus),
    answers: a.answers?.map((ans) => ({
      ...ans,
      aiGradingStatus: normalizeStatus(ans.aiGradingStatus),
    })),
  };
}

function normalizeAttemptList(list) {
  if (!Array.isArray(list)) return list;
  return list.map(normalizeAttempt);
}

export async function fetchAvailableMockExams() {
  const response = await apiClient("/mock-exam/available", { method: "GET" });
  if (!response.ok) throw new Error(`mock-exam/available: ${response.status}`);
  return response.json();
}

export async function fetchMockExam(examId) {
  const response = await apiClient(`/mock-exam/${examId}`, { method: "GET" });
  if (!response.ok) throw new Error(`mock-exam/${examId}: ${response.status}`);
  return response.json();
}

export async function fetchMockExamAttempt(attemptId) {
  const response = await apiClient(`/mock-exam/attempts/${attemptId}`, {
    method: "GET",
  });
  if (!response.ok) throw new Error(`mock-exam/attempts/${attemptId}: ${response.status}`);
  return normalizeAttempt(await response.json());
}

export async function fetchMockExamAttempts() {
  const response = await apiClient("/mock-exam/attempts", { method: "GET" });
  if (!response.ok) throw new Error(`mock-exam/attempts: ${response.status}`);
  return normalizeAttemptList(await response.json());
}

export async function retryGrading(attemptId) {
  const response = await apiClient(`/mock-exam/attempts/${attemptId}/retry`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(`retry grading: ${response.status}`);
}

export async function submitMockExam(examId, exam, answers) {
  const payload = buildAnswersPayload(exam, answers);
  if (payload.length === 0) {
    throw new Error("Nema odgovora za predaju.");
  }

  const blobsByPart = {};
  let totalBytes = 0;
  for (const a of payload) {
    if (!a.imagePartName) continue;
    const dataUrl = answers[a.questionId]?.value;
    const blob = dataUrlToBlob(dataUrl);
    if (!blob) throw new Error(`Slika za pitanje ${a.questionId} nije valjana.`);
    blobsByPart[a.imagePartName] = blob;
    totalBytes += blob.size;
  }

  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new Error(
      "Slike su prevelike za predaju. Pokušaj smanjiti broj fotografija ili ih ponovo snimi.",
    );
  }

  const fd = new FormData();
  fd.append("data", JSON.stringify({ answers: payload }));
  for (const [partName, blob] of Object.entries(blobsByPart)) {
    const ext = extensionForMime(blob.type);
    fd.append(partName, blob, `${partName}.${ext}`);
  }

  const response = await apiClient(`/mock-exam/${examId}/submit`, {
    method: "POST",
    body: fd,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`submit: ${response.status} ${text}`);
  }
  return response.json();
}

export function buildAnswersPayload(exam, answers) {
  const out = [];
  function visit(question) {
    if (!question.questionType) {
      question.subQuestions?.forEach(visit);
      return;
    }
    const a = answers[question.questionId];
    const value = a?.value;
    if (value === null || value === undefined || value === "") return;

    const entry = { questionId: question.questionId };
    if (question.questionType === "multiple_choice") {
      entry.selectedOption = String(value).toUpperCase();
    } else if (question.questionType === "short_answer") {
      entry.answerText = String(value);
    } else if (
      question.questionType === "short_answer_graph" ||
      question.questionType === "extended_answer"
    ) {
      entry.imagePartName = `q-${question.questionId}`;
    }
    out.push(entry);
  }
  for (const q of exam?.questions ?? []) visit(q);
  return out;
}
