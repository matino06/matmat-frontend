import { auth } from "$lib/config/firebase-config";

export async function apiClient(path, init = {}) {
  const url = "https://matmat-backend-production.up.railway.app/" + path;
  const user = auth.currentUser;
  const fetchInit = {
    ...init,
    headers: {
      ...(init.headers || {}),
    },
  };

  if (user) {
    const token = await user.getIdToken();
    fetchInit.headers["Authorization"] = `Bearer ${token}`;
    if (!fetchInit.headers["Content-Type"]) {
      fetchInit.headers["Content-Type"] = "application/json";
    }
  }

  return fetch(url, fetchInit);
}
