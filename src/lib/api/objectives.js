import { apiClient } from "$lib/api/apiClient";

export async function fetchObjectivesWithStatus() {
    const response = await apiClient(
        "/learning-objective/get-objectives-with-status",
        { method: "GET" }
    );

    if (!response.ok) {
        throw new Error("Objectives fetch failed: " + response.status);
    }

    return response.json();
}
