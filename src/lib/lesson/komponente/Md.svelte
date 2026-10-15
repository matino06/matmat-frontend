<script>
  // Tekst iz speca (markdown + KaTeX), istim rendererom kao zadaci i objašnjenja.
  import { renderMd, renderMdInline } from "$lib/utils/markdownRenderer.js";

  let { text = "", inline = false } = $props();
</script>

{#if inline}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- markdown iz vlastitog renderera, kao kod zadataka -->
  <span class="lx-md-inline">{@html renderMdInline(text)}</span>
{:else}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- markdown iz vlastitog renderera, kao kod zadataka -->
  <div class="lx-md">{@html renderMd(text)}</div>
{/if}
