<script>
  import MarketingShell from "./MarketingShell.svelte";

  // Text pages under the marketing frame (/privatnost, /podrska): a heading, a date or lead, the sections.
  let { title, lead = "", children } = $props();
</script>

<MarketingShell>
  <article class="legal hm-wrap">
    <h1>{title}</h1>
    {#if lead}<p class="legal-lead">{lead}</p>{/if}
    {@render children?.()}
  </article>
</MarketingShell>

<style>
  .legal {
    max-width: 760px;
    padding-top: 56px;
    padding-bottom: 72px;
  }
  h1 {
    font-size: clamp(30px, 4vw, 40px);
    letter-spacing: -0.8px;
    line-height: 1.15;
    margin: 0 0 12px;
    font-weight: 600;
  }
  .legal-lead { color: var(--text-dim); margin: 0 0 32px; font-size: 15px; }
  .legal :global(h2) { font-size: 20px; font-weight: 600; margin: 40px 0 10px; letter-spacing: -0.3px; }
  .legal :global(h3) { font-size: 16px; font-weight: 600; margin: 22px 0 6px; }
  .legal :global(p),
  .legal :global(li) { color: var(--text-dim); font-size: 15px; line-height: 1.7; }
  .legal :global(p) { margin: 0 0 12px; }
  .legal :global(ul) { margin: 0 0 12px; padding-left: 20px; list-style: disc; }
  .legal :global(li::marker) { color: var(--text-faint); }
  .legal :global(li) { margin-bottom: 4px; }
  .legal :global(strong) { color: var(--text); font-weight: 600; }
  .legal :global(a) { color: var(--primary); }
  .legal :global(.table-wrap) { overflow-x: auto; margin: 8px 0 16px; }
  .legal :global(table) { border-collapse: collapse; width: 100%; font-size: 14px; }
  .legal :global(th),
  .legal :global(td) { text-align: left; vertical-align: top; padding: 10px 12px; border-bottom: 1px solid var(--border); color: var(--text-dim); line-height: 1.55; }
  .legal :global(th) { color: var(--text); font-weight: 600; white-space: nowrap; }
</style>
