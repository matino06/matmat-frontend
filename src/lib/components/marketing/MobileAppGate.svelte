<script>
  import AppStoreBadge from "./AppStoreBadge.svelte";

  // What an app page shows on a phone that has our app in its store: the app
  // does everything there, so the web app sends the student to it. The marketing
  // pages stay open on phones; only the signed-in part is closed here.
</script>

<div class="gate">
  <main class="gate-inner">
    <a class="gate-brand" href="/" aria-label="MatMat, početna">
      <span class="gate-mark">M</span>
    </a>
    <img class="gate-shot" src="/images/app/01-zadaci.jpg" alt="" width="660" height="1434" />
    <h1>Na mobitelu, MatMat je aplikacija</h1>
    <p>
      Prijavi se istim računom i nastavljaš gdje si stao. Aplikacija te i podsjeti kad današnji zadaci čekaju.
    </p>
    <AppStoreBadge height={52} placement="gate" />
    <p class="gate-note">Na računalu MatMat i dalje otvaraš na matmat.online.</p>
    <a class="gate-back" href="/">Natrag na početnu</a>
  </main>
</div>

<style>
  .gate {
    position: fixed;
    inset: 0;
    z-index: 100;
    overflow-y: auto;
    background: #0a0a0b;
    color: #ededef;
    font-family: var(--font-sans);
  }
  .gate-inner {
    min-height: 100%;
    max-width: 360px;
    margin: 0 auto;
    padding: 40px 24px 48px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .gate-brand { align-self: flex-start; }
  .gate-mark {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: oklch(0.6 0.22 270);
    display: grid;
    place-items: center;
    color: #fff;
    font-weight: 800;
    font-size: 14px;
    font-family: var(--font-mono);
  }
  /* The top of the app's Danas screen, fading into the page. */
  .gate-shot {
    margin-top: 28px;
    width: 220px;
    height: 260px;
    object-fit: cover;
    object-position: top;
    border: 1px solid #2e2e34;
    border-bottom: 0;
    border-radius: 32px 32px 0 0;
    mask-image: linear-gradient(#000 55%, transparent);
  }
  h1 {
    margin: 8px 0 0;
    font-size: 28px;
    font-weight: 600;
    line-height: 1.12;
    letter-spacing: -0.03em;
    text-wrap: balance;
  }
  p { margin: 14px 0 28px; font-size: 16px; line-height: 1.55; color: #a1a1a8; text-wrap: pretty; }
  .gate-note { margin: 28px 0 0; font-size: 14px; color: #6b6b73; }
  .gate-back { margin-top: 12px; font-size: 14px; color: #a1a1a8; text-decoration: underline; text-underline-offset: 3px; }
  .gate :global(:focus-visible) { outline: 2px solid oklch(0.6 0.22 270); outline-offset: 2px; }
</style>
