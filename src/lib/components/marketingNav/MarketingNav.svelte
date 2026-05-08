<script>
  import { userData, handleLogIn } from "$lib/store/user.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";

  function start() {
    if (userData.user) goto("/tasks");
    else handleLogIn();
  }

  let path = $derived(page.url.pathname);
</script>

<nav class="mn-nav">
  <a class="mn-brand" href="/">
    <div class="mn-mark">M</div>
    <div class="mn-name">MatMat</div>
  </a>
  <div class="mn-links">
    <a class="mn-link" class:active={path === '/kako-radi'} href="/kako-radi">Kako radi</a>
    <button class="mn-btn-outline" onclick={start}>Prijava</button>
    <button class="mn-btn-primary" onclick={start}>Počni besplatno</button>
  </div>
</nav>

<style>
  .mn-nav {
    position: sticky; top: 0; z-index: 50;
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 0 5%;
    height: 64px;
    background: rgba(13,13,16,0.88);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .mn-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .mn-mark {
    width: 32px; height: 32px; border-radius: 10px;
    background: oklch(0.6 0.22 270);
    display: grid; place-items: center;
    color: #fff; font-weight: 800; font-size: 14px;
    font-family: var(--font-mono);
  }
  .mn-name { font-weight: 700; font-size: 17px; letter-spacing: -0.02em; color: #fff; }
  .mn-links { display: flex; gap: 4px; align-items: center; }
  .mn-link {
    font-size: 14px; color: rgba(255,255,255,0.45);
    padding: 7px 14px; border-radius: 8px;
    text-decoration: none; transition: color .15s; white-space: nowrap;
  }
  .mn-link:hover, .mn-link.active { color: #fff; }
  .mn-btn-outline {
    padding: 8px 18px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.15);
    font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.7);
    background: none; cursor: pointer;
    transition: border-color .15s, color .15s;
    font-family: var(--font-sans);
    white-space: nowrap;
    margin-right: 6px;
  }
  .mn-btn-outline:hover { color: #fff; border-color: rgba(255,255,255,0.35); }
  .mn-btn-primary {
    padding: 8px 18px; border-radius: 10px;
    background: oklch(0.6 0.22 270); color: #fff;
    font-size: 14px; font-weight: 600;
    border: none; cursor: pointer;
    transition: background .15s;
    font-family: var(--font-sans);
    white-space: nowrap;
  }
  .mn-btn-primary:hover { background: oklch(0.64 0.22 270); }

  @media (max-width: 800px) {
    .mn-nav { padding: 0 20px; }
    .mn-link { display: none; }
  }
</style>
