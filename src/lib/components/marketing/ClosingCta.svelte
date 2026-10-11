<script>
  import GoogleButton from "./GoogleButton.svelte";

  // The last section of a marketing page: one line, one sentence, sign in or a
  // second way in (`secondary`: { label, href, onclick? }).
  let { title, text, secondary } = $props();
</script>

<section class="cc hm-wrap">
  <h2>{title}</h2>
  <p>{text}</p>
  <div class="cc-actions">
    <GoogleButton />
    {#if secondary}
      <a class="cc-ghost" href={secondary.href} onclick={secondary.onclick}>{secondary.label}</a>
    {/if}
  </div>
</section>

<style>
  /* Centred, with a faint glow rising from the footer edge. */
  .cc {
    position: relative;
    padding-top: 128px;
    padding-bottom: 136px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .cc::after {
    content: "";
    position: absolute;
    left: 50%;
    bottom: 0;
    width: min(100vw, 1100px);
    height: 160px;
    transform: translateX(-50%);
    background: radial-gradient(ellipse 50% 100% at 50% 100%, hsl(var(--primary-h) 70% 55% / 0.12), transparent 70%);
    pointer-events: none;
  }
  h2 {
    margin: 0;
    font-size: clamp(36px, 5.6vw, 68px);
    font-weight: 600;
    letter-spacing: -0.045em;
    line-height: 1.02;
    color: var(--text);
    text-wrap: balance;
  }
  p { margin: 20px 0 36px; font-size: 18px; line-height: 1.6; color: var(--text-dim); max-width: 31em; text-wrap: pretty; }
  .cc-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .cc-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 13px 22px;
    border-radius: var(--r-lg);
    border: 1px solid var(--border-strong);
    color: var(--text-dim);
    font-size: 15px;
    font-weight: 500;
    transition: color 0.12s, background 0.12s, border-color 0.12s;
  }
  .cc-ghost:hover { color: var(--text); background: var(--bg-elev); border-color: var(--text-faint); }

  @media (max-width: 640px) {
    .cc { padding-top: 80px; padding-bottom: 96px; }
    p { font-size: 16px; }
    .cc-actions { flex-direction: column; align-items: stretch; width: 100%; max-width: 320px; }
  }
</style>
