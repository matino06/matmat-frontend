import { apiClient } from "$lib/api/apiClient";

// Exam readiness (0–100) for the current course. The backend weights each field
// by its share of exam points from the course's exam catalogue.
export async function fetchReadiness() {
  const response = await apiClient("/progress/readiness", { method: "GET" });

  if (!response.ok) {
    throw new Error("Readiness fetch failed: " + response.status);
  }

  const data = await response.json();
  return data.readiness ?? 0;
}
