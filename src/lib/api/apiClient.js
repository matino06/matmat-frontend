import { getAuth0Client } from "$lib/config/auth0-config";
import { isSessionExpiredError, notifySessionExpired } from "$lib/auth/session";

// options.handleUnauthorized — set to false for calls where a 401 is part of the
// normal flow (account bootstrap during sign-in) and must not log the user out.
export async function apiClient(path, init = {}, options = {}) {
  const { handleUnauthorized = true } = options;
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
    } catch (err) {
      // A dead refresh token means the session is over: signal it and fail the
      // call instead of firing an unauthenticated request the backend will 401.
      if (isSessionExpiredError(err)) {
        if (handleUnauthorized) notifySessionExpired();
        return new Response(null, { status: 401, statusText: "Session expired" });
      }
      console.error("Token error:", err);
    }
  }

  if (token) {
    fetchInit.headers["Authorization"] = `Bearer ${token}`;
  }

  const isFormData = init.body instanceof FormData;
  if (!isFormData && !fetchInit.headers["Content-Type"]) {
    fetchInit.headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, fetchInit);

  // The token looked valid locally but the backend rejected it.
  if (response.status === 401 && handleUnauthorized) notifySessionExpired();

  return response;
}
