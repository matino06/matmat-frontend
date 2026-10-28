// MatMat's phone apps. A phone whose store has the app gets the app instead of
// the web app: the landing page points it to the store and the app pages show
// MobileAppGate. Android is still on its way, so Android phones keep the web
// app until PLAY_STORE_URL is filled in.
export const APP_STORE_ID = "6823728873";
export const APP_STORE_URL = "https://apps.apple.com/hr/app/matmat-priprema-za-maturu/id6823728873";
export const PLAY_STORE_URL = null;

// The iOS app needs iOS 18. Older iPhones can't install it, so they keep the web app.
export const IOS_MIN_VERSION = 18;

// One link for the QR code and social bios; /app sends each phone to its store.
export const APP_LINK = "https://matmat.online/app";
