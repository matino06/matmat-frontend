import { apiClient } from "$lib/api/apiClient";

// The study map (GET /field-of-study/map): fields, each with its lessons and whether they are mastered.
export async function fetchStudyMap() {
  const response = await apiClient("/field-of-study/map", { method: "GET" });

  if (!response.ok) {
    throw new Error("Study map fetch failed: " + response.status);
  }

  return response.json();
}

// Tells whether a rating just mastered its lesson. Backend rule: a lesson is mastered iff its last grade is 3 or 4 (Dobro,
// Lako), so the map loaded once is kept up to date locally after each rating, and refetched only for a new mastery
// (for the field's fresh count). Without a map (load failed) nothing is reported.
export function createMasteryTracker() {
  let map = null;

  const find = (objectiveId) => {
    for (const field of map ?? []) {
      const lesson = field.objectives?.find((o) => o.objectiveId === objectiveId);
      if (lesson) return { field, lesson };
    }
    return null;
  };

  const counts = (field) => ({
    mastered: field.objectives.filter((o) => o.isMastered).length,
    total: field.objectives.length,
  });

  return {
    async load() {
      try {
        map = await fetchStudyMap();
      } catch {
        map = null;
      }
    },

    // After a saved rating: { lessonName, fieldName, mastered, total } when it newly mastered the lesson, else null.
    async rated(objective, grade) {
      const hit = find(objective?.objectiveId);
      if (!hit) return null;
      const wasMastered = hit.lesson.isMastered;
      hit.lesson.isMastered = grade >= 3;
      if (wasMastered || grade < 3) return null;

      // the local update above already counts this lesson, so a failed refetch falls back to old count + 1
      let field = hit.field;
      try {
        map = await fetchStudyMap();
        field = find(objective.objectiveId)?.field ?? hit.field;
      } catch {}
      return { lessonName: objective.objectiveName ?? hit.lesson.objectiveName, fieldName: field.fieldName, ...counts(field) };
    },
  };
}
