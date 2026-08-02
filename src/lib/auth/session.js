// Registry for the "session is dead" signal. Exists so apiClient can tell the
// user store that the Auth0 session expired without a circular import
// (apiClient -> user.svelte.js -> apiClient). This module imports nothing.

let handler = null;

export const setSessionExpiredHandler = (fn) => {
  handler = fn;
};

export const notifySessionExpired = () => handler?.();

// Auth0 errors that mean "the session is over, the user has to sign in again",
// as opposed to a transient network failure.
const AUTH_ERRORS = [
  "login_required",
  "consent_required",
  "invalid_grant",
  "missing_refresh_token",
];

export const isSessionExpiredError = (err) =>
  AUTH_ERRORS.includes(err?.error) || err?.name === "MissingRefreshTokenError";
