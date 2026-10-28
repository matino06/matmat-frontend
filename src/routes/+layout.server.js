import { detectPlatform } from "$lib/utils/platform";

export function load({ request }) {
  return { platform: detectPlatform(request.headers.get("user-agent") ?? "") };
}
