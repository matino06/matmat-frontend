<script>
  // The box to tick before AI can be turned on (the consent screen and the chat panel).
  import { AI_CONSENT_AGE } from "$lib/store/aiConsent.svelte";

  let { confirmed = $bindable(false) } = $props();
</script>

<label class="age">
  <input type="checkbox" bind:checked={confirmed} />
  <span>{AI_CONSENT_AGE}</span>
</label>

<style>
  .age { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; line-height: 1.5; color: var(--text); cursor: pointer; }
  .age input { width: 18px; height: 18px; margin: 2px 0 0; flex: none; accent-color: var(--primary); cursor: pointer; }
</style>
