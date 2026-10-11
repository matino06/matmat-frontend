<script>
  import MarketingNav from "$lib/components/marketingNav/MarketingNav.svelte";

  // Frame of the marketing pages (/ and /kako-radi): always dark whatever theme
  // the app is set to, the nav bar, the page's own sections, the footer.
  let { children } = $props();
</script>

<div class="hm">
  <MarketingNav />
  <main>{@render children?.()}</main>
  <footer class="hm-footer">
    <div class="hm-footer-inner">
      <div class="hm-footer-brand">
        <div class="brand-mark">M</div>
        © {new Date().getFullYear()} MatMat
      </div>
      <nav class="hm-footer-links" aria-label="Podnožje">
        <a href="/">Početna</a>
        <a href="/kako-radi">Kako radi</a>
        <a href="mailto:info@matmat.online">Kontakt</a>
      </nav>
    </div>
  </footer>
</div>

<style>
  /* The dark tokens from app.css, pinned here so the app pieces shown on these
     pages stay dark too. */
  .hm {
    --bg: #0a0a0b;
    --bg-elev: #111113;
    --bg-elev-2: #17171a;
    --bg-hover: #1c1c20;
    --border: #232328;
    --border-strong: #2e2e34;
    --text: #ededef;
    --text-dim: #a1a1a8;
    --text-faint: #6b6b73;
    --shadow-card: 0 1px 0 rgba(255, 255, 255, 0.03) inset;
    --success: #34d399;
    --warn: #fbbf24;
    --danger: #f87171;

    position: fixed;
    inset: 0;
    z-index: 100;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
  }
  .hm :global(:focus-visible) {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  /* Column for text sections, and the wider one of the app preview, which the
     nav bar and the footer share. :where() keeps them weaker than a page's own
     section rules, so a section can still set its margins. */
  .hm :global(:where(.hm-wrap)) { max-width: 1120px; margin-inline: auto; padding-inline: 40px; }
  .hm :global(:where(.hm-wrap-wide)) { max-width: 1240px; margin-inline: auto; }

  .hm-footer { border-top: 1px solid var(--border); font-size: 13px; color: var(--text-faint); }
  .hm-footer-inner {
    max-width: 1240px;
    margin: 0 auto;
    padding: 26px 24px;
    box-sizing: content-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .hm-footer-brand { display: flex; align-items: center; gap: 10px; }
  .hm-footer-brand .brand-mark { width: 20px; height: 20px; font-size: 10px; border-radius: 6px; }
  .hm-footer-links { display: flex; gap: 22px; }
  .hm-footer a:hover { color: var(--text); }

  @media (max-width: 640px) {
    .hm :global(:where(.hm-wrap)) { padding-inline: 20px; }
    .hm-footer-inner { padding-inline: 16px; }
    .hm-footer-links { gap: 16px; }
  }
</style>
