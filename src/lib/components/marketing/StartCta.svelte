<script>
  import { page } from "$app/state";
  import GoogleButton from "./GoogleButton.svelte";
  import AppStoreBadge from "./AppStoreBadge.svelte";

  // The one way in for this device: a phone with our app in its store gets the
  // store badge, everything else signs in with Google and uses the web app.
  let { placement, onclick } = $props();

  let platform = $derived(page.data.platform);
</script>

<!-- The Google Play badge goes next to this once the Android app is out. -->
{#if platform?.appUrl && platform.os === "ios"}
  <AppStoreBadge height={52} {placement} />
{:else}
  <GoogleButton {onclick} />
{/if}
