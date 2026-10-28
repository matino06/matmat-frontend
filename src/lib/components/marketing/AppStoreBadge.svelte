<script>
  import { APP_STORE_URL } from "$lib/config/apps";

  // Apple's own Croatian badge, unchanged (their rules: no redrawing, at least
  // 40 px tall, and keep a quarter of its height clear around it, which the
  // spot it sits in has to leave).
  // `placement` names the spot in the analytics event, so we see which one works.
  let { height = 48, placement } = $props();

  function track() {
    window.gtag?.("event", "app_store_click", { placement });
  }
</script>

<a class="asb" href={APP_STORE_URL} onclick={track} style:--h="{height}px">
  <img src="/badges/app-store-hr.svg" alt="Preuzmi u App Storeu" width={Math.round(height * 3.174)} {height} />
</a>

<style>
  .asb { display: inline-flex; border-radius: calc(var(--h) / 5); }
  .asb img { display: block; height: var(--h); width: auto; }
  .asb:active { transform: translateY(1px); }
</style>
