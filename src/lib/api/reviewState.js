import { apiClient } from "$lib/api/apiClient";

// Is the task's lesson already rated (a review) or new for this user? An interactive lesson suggests a stricter
// rating on a review, where needing the steps means the student forgot. Unknown (old backend, no network) → new.
export async function fetchIsReview(taskId) {
  try {
    const response = await apiClient(`/solved-task/review-state/${taskId}`, { method: "GET" });
    if (!response.ok) return false;
    const data = await response.json();
    return data.review === true;
  } catch {
    return false;
  }
}
