<script>
  import { AI_CONSENT_SECTIONS } from "$lib/store/aiConsent.svelte";
</script>

<div class="consent-details">
  {#each AI_CONSENT_SECTIONS as section (section.heading)}
    <div>
      <h3>{section.heading}</h3>
      <p>{section.text}</p>
    </div>
  {/each}
</div>

<style>
  .consent-details { display: grid; gap: 14px; }
  h3 { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: var(--text); }
  p { margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text-dim); }
</style>
