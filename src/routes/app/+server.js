import { redirect } from "@sveltejs/kit";
import { detectPlatform } from "$lib/utils/platform";

// matmat.online/app, the link behind the landing page's QR code: a phone that
// can install the app goes to its store, anything else to the app section.
export function GET({ request }) {
  const { appUrl } = detectPlatform(request.headers.get("user-agent") ?? "");
  redirect(302, appUrl ?? "/#aplikacija");
}
