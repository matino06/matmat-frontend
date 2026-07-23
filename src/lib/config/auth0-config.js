import { createAuth0Client } from "@auth0/auth0-spa-js";
import { browser } from "$app/environment";

let clientPromise = null;

// Lazily creates a single Auth0 SPA client, memoized across the app.
// Returns null on the server (SSR) since the SDK depends on window/localStorage.
export function getAuth0Client() {
  if (!browser) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = createAuth0Client({
      domain: "auth.matmat.online",
      clientId: "PKvOpvqDyFhEObvwxxXXB2WQo8UlSJA0",
      authorizationParams: {
        audience: "https://api.matmat.online",
        redirect_uri: window.location.origin,
      },
      useRefreshTokens: true,
      cacheLocation: "localstorage",
    });
  }
  return clientPromise;
}
