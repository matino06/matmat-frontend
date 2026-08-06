import { getAuth0Client } from "$lib/config/auth0-config";
import { showErrorAlert } from "$lib/store/errorAlert.svelte";
import { apiClient } from "$lib/api/apiClient";
import {
  isSessionExpiredError,
  setSessionExpiredHandler,
} from "$lib/auth/session";
import { browser } from "$app/environment";

export const userData = $state({
  user: null,
  loading: true,
  isAdmin: false,
  adminChecked: false,
  needsOnboarding: false,
});

export const turnstileData = $state({ isLoaded: false });

export const showNotificationPopup = $state({ value: false });

// Maps the Auth0 user profile onto the field names the UI already reads
// (displayName / photoURL), so Sidebar/ChatWindow/settings stay untouched.
const normalizeUser = (u) =>
  u && { ...u, displayName: u.name ?? u.nickname ?? null, photoURL: u.picture ?? null };

// Auth0 has no persistent auth-state listener like Firebase, so we hydrate the
// store once on startup. Called from the root layout's onMount (browser only).
//
// isAuthenticated() only proves there is a cached profile in localStorage — it
// never checks expiry — so a days-old dead session still reads as logged in.
// getTokenSilently() is the actual proof the session is alive, so we require it
// before showing the app shell.
export const initAuth = async () => {
  if (!browser) return;
  try {
    const client = await getAuth0Client();
    if (await client.isAuthenticated()) {
      await client.getTokenSilently();
      userData.user = normalizeUser(await client.getUser());
      // Not awaited: admin status gates UI (sidebar nav, course switcher) that
      // defaults to the non-admin view anyway, so it can settle a beat later
      // rather than delaying the whole app shell by another round-trip.
      verifyIsAdmin();
    }
  } catch (err) {
    if (isSessionExpiredError(err)) {
      // Stale cache from an expired session — drop it, the user stays on the
      // landing page. No toast: they never saw a logged-in UI to lose.
      await clearSession();
    } else {
      console.error("Auth init error:", err);
    }
  }
  userData.loading = false;
};

// Called whenever a live session turns out to be dead (token refresh failed, or
// the backend answered 401). Clearing userData.user is enough to get the user
// out: the root layout's guard effect redirects to "/" on its own.
let handlingExpiry = false;
export const handleSessionExpired = async () => {
  if (handlingExpiry || !userData.user) return;
  handlingExpiry = true;
  try {
    await clearSession();
    showErrorAlert("Sesija je istekla. Prijavi se ponovo.");
  } finally {
    handlingExpiry = false;
  }
};

setSessionExpiredHandler(handleSessionExpired);

// Re-checks a session that looked valid earlier — used when the tab regains
// focus, since the session can die while the tab sits open in the background.
export const validateSession = async () => {
  if (!browser || !userData.user) return;
  try {
    const client = await getAuth0Client();
    await client.getTokenSilently();
  } catch (err) {
    if (isSessionExpiredError(err)) await handleSessionExpired();
  }
};

// Verifies admin status via the backend endpoint and caches it in the store.
// Needed because login() (which sets isAdmin) only runs during the full
// sign-in flow, not on page reload — admin pages call this on mount.
export const verifyIsAdmin = async () => {
  if (!userData.user) return false;
  try {
    const res = await apiClient("/account/is-admin", { method: "GET" });
    if (res.ok) userData.isAdmin = await res.json();
  } catch {}
  userData.adminChecked = true;
  return userData.isAdmin;
};

export const handleLogIn = async () => {
  userData.loading = true;

  try {
    const client = await getAuth0Client();
    await client.loginWithPopup();
    userData.user = normalizeUser(await client.getUser());
    userData.loading = false;

    turnstileData.isVisible = true;
    loadTurnstile();
  } catch (err) {
    userData.loading = false;

    const msg = err?.message || "";
    if (/popup/i.test(msg) && /unable to open|blocked/i.test(msg)) {
      showErrorAlert(
        "Popup prozor je blokiran. Molimo omogućite popup prozore za ovu stranicu:\n\n" +
          "1. Kliknite ikonu zaključanja u address baru\n" +
          "2. Odaberite 'Site settings' ili 'Permissions'\n" +
          "3. Omogućite 'Pop-ups and redirects'\n" +
          "4. Pokušajte ponovno",
      );
    } else if (err?.error === "cancelled" || /closed|cancel|timeout/i.test(msg)) {
      console.log("Korisnik je zatvorio ili otkazao login popup");
    } else {
      showErrorAlert("Greška pri prijavi: " + (msg || err?.error || err));
    }

    console.error("Login error:", err);
  }
};

const loadTurnstile = () => {
  if (!browser || !window.turnstile) {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v4/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => renderTurnstile();
    document.head.appendChild(script);
  } else {
    renderTurnstile();
  }
};

const login = async () => {
  // A 401 here can mean "no account yet" rather than a dead session, so this
  // bootstrap pair opts out of the global session-expiry handling.
  const noAuthHandling = { handleUnauthorized: false };
  const response = await apiClient("/account/exists", { method: "GET" }, noAuthHandling);
  const textResponse = await response.text();

  if (textResponse == "Account does not exist") {
    await apiClient("/account/create", { method: "POST" }, noAuthHandling);
    userData.needsOnboarding = true;
  }

  const adminRes = await apiClient("/account/is-admin", { method: "GET" });
  if (adminRes.ok) userData.isAdmin = await adminRes.json();
};

// Clears the local Auth0 session (cached tokens + profile) without a full-page
// redirect, and resets everything derived from it. Used on the Turnstile
// failure paths, on an expired session, and by logout().
export const clearSession = async () => {
  // Reset the store first (synchronously) so the layout guard redirects and
  // in-flight callers see a logged-out state right away; purge the Auth0
  // cache after.
  userData.user = null;
  userData.isAdmin = false;
  userData.adminChecked = false;
  userData.needsOnboarding = false;
  try {
    const client = await getAuth0Client();
    await client.logout({ openUrl: false });
  } catch {}
};

const renderTurnstile = () => {
  const container = document.getElementById("turnstile-container");
  if (container) {
    container.innerHTML = "";
  }

  turnstileData.isLoaded = true;
  if (window.turnstile) {
    window.turnstile.render("#turnstile-container", {
      sitekey: "0x4AAAAAABBBBZ3tdroBV8xr",
      callback: async (token) => {
        try {
          const response = await apiClient("/turnstile/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });

          if (response.ok) {
            setTimeout(() => {
              turnstileData.isLoaded = false;
            }, 2500);

            login().catch((loginErr) => {
              showErrorAlert(
                "Greška pri dovršavanju prijave: " +
                  (loginErr.message || loginErr),
              );
              console.error("Post-login account setup error:", loginErr);
            });
          } else {
            // Turnstile verification failed – log out the user
            await clearSession();
            setTimeout(() => {
              turnstileData.isLoaded = false;
            }, 2500);
            showErrorAlert("Verifikacija nije uspjela. Pokušajte ponovo.");
          }
        } catch (err) {
          // Network or other error – log out the user
          await clearSession();
          setTimeout(() => {
            turnstileData.isLoaded = false;
          }, 2500);
          showErrorAlert("Greška prilikom povezivanja sa serverom.");
        }
      },
      "error-callback": async () => {
        // Turnstile widget failed to load or initialize – log out the user
        await clearSession();
        setTimeout(() => {
          turnstileData.isLoaded = false;
        }, 2500);
        showErrorAlert("Cloudflare Turnstile nije uspio učitati.");
      },
    });
  }
};

export const logout = async () => {
  await clearSession();
  const client = await getAuth0Client();
  await client.logout({ logoutParams: { returnTo: window.location.origin } });
};
