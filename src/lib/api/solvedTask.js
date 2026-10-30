import { apiClient } from "$lib/api/apiClient";

export function deviceType() {
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return "ipad";
  if (/iPhone/.test(ua)) return "iphone";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

// Spremi ocjenu zadatka. Vraća { id, grade, days } (days: dani do ponavljanja za svaku ocjenu, od stanja lekcije
// prije ove ocjene; id null dok backend ne vraća spremljenu ocjenu, pa se ona tada ne može promijeniti) ili baca
// grešku s porukom za učenika.
export async function saveRating({ taskId, grade, startTime, endTime = Date.now() }) {
  let response;
  try {
    response = await apiClient("/solved-task/set-new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        grade,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        device: deviceType(),
      }),
    });
  } catch {
    throw new Error("Nema veze sa serverom. Pokušaj ponovo.");
  }
  if (!response.ok) throw new Error("Spremanje zadatka nije uspjelo. Pokušaj ponovo.");
  return spremljena(await response.json().catch(() => null), grade);
}

// Promijeni upravo spremljenu ocjenu (interaktivna lekcija sprema predloženu čim je gotova).
export async function changeRating(id, grade) {
  let response;
  try {
    response = await apiClient(`/solved-task/${id}/grade`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade }),
    });
  } catch {
    throw new Error("Nema veze sa serverom. Pokušaj ponovo.");
  }
  if (response.status === 409) throw new Error("Ova se ocjena više ne može promijeniti.");
  if (!response.ok) throw new Error("Promjena ocjene nije uspjela. Pokušaj ponovo.");
  return spremljena(await response.json().catch(() => null), grade);
}

const spremljena = (body, grade) => ({
  id: body?.solvedTaskId ?? null,
  grade: body?.grade ?? grade,
  days: Array.isArray(body?.days) ? body.days : null,
});
