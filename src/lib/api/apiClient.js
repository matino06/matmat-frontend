import { getAuth0Client } from "$lib/config/auth0-config";

export async function apiClient(path, init = {}) {
  const url = "https://api.matmat.online/api" + path;
  const fetchInit = {
    ...init,
    headers: {
      ...(init.headers || {}),
    },
  };

  let token = null;
  const client = await getAuth0Client();
  if (client) {
    try {
      token = await client.getTokenSilently();
    } catch {}
  }

  if (token) {
    fetchInit.headers["Authorization"] = `Bearer ${token}`;
    const isFormData = init.body instanceof FormData;
    if (!isFormData && !fetchInit.headers["Content-Type"]) {
      fetchInit.headers["Content-Type"] = "application/json";
    }
  }

  return fetch(url, fetchInit);
}
