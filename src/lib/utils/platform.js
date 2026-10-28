import { APP_STORE_URL, PLAY_STORE_URL, IOS_MIN_VERSION } from "$lib/config/apps";

// What the visitor's device is, read from the user agent on the server so the
// first paint already shows the right button.
// `appUrl` is the store page of an app this phone can install; when it is set,
// the phone uses the app and not the web app. iPads aren't phones: the web app
// works well there, so they keep it (Safari's Smart App Banner offers the app).
export function detectPlatform(ua = "") {
  const ios = /iPhone|iPod|iPad/.test(ua);
  const android = !ios && /Android/i.test(ua);
  const phone = /iPhone|iPod/.test(ua) || (android && /Mobile/i.test(ua));
  const os = ios ? "ios" : android ? "android" : "other";

  // Safari 26 freezes the version it reports at 18_6, which still passes.
  const v = ua.match(/OS (\d+)[_.]\d+.* like Mac OS X/);
  const supported = os !== "ios" || (v ? Number(v[1]) >= IOS_MIN_VERSION : true);

  const store = os === "ios" ? APP_STORE_URL : os === "android" ? PLAY_STORE_URL : null;
  return { os, phone, appUrl: phone && supported ? store : null };
}
