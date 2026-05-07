<script>
  import { onDestroy } from 'svelte';
  let { onClose } = $props();

  const MODES = [
    { id: "focus", label: "Fokus",      mins: 25, color: "var(--primary)" },
    { id: "short", label: "Pauza",      mins: 5,  color: "var(--success)" },
    { id: "long",  label: "Duga pauza", mins: 15, color: "var(--warn)" },
  ];

  let modeIdx = $state(0);
  let secsLeft = $state(25 * 60);
  let running = $state(false);
  let sessions = $state(0);
  let interval = null;

  $effect(() => {
    const mode = MODES[modeIdx];
    running = false;
    secsLeft = mode.mins * 60;
    clearInterval(interval);
  });

  $effect(() => {
    if (running) {
      interval = setInterval(() => {
        secsLeft--;
        if (secsLeft <= 0) {
          clearInterval(interval);
          running = false;
          if (modeIdx === 0) sessions++;
          secsLeft = 0;
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  });

  onDestroy(() => clearInterval(interval));

  let mode = $derived(MODES[modeIdx]);
  let total = $derived(mode.mins * 60);
  let pct = $derived(1 - secsLeft / total);
  let mins = $derived(String(Math.floor(secsLeft / 60)).padStart(2, '0'));
  let secs = $derived(String(secsLeft % 60).padStart(2, '0'));

  const r = 22, stroke = 3;
  let circ = $derived(2 * Math.PI * r);

  function reset() {
    running = false;
    secsLeft = mode.mins * 60;
    clearInterval(interval);
  }
</script>

<div class="pomo-widget">
  <div class="pomo-ring-wrap">
    <svg width="52" height="52" style="transform:rotate(-90deg)">
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--bg-elev-2)" stroke-width={stroke}/>
      <circle cx="26" cy="26" r={r} fill="none"
        stroke={mode.color} stroke-width={stroke} stroke-linecap="round"
        stroke-dasharray="{circ * pct} {circ * (1 - pct)}"
        style="transition: stroke-dasharray .8s linear"/>
    </svg>
    <div class="pomo-ring-label" style="color: {mode.color}">{mins}:{secs}</div>
  </div>

  <div class="pomo-info">
    <div style="font-size: 13px; font-weight: 500; color: var(--text)">{mode.label}</div>
    <div style="font-size: 11px; color: var(--text-faint); margin-top: 2px">
      {#if sessions > 0}
        <span style="color: {mode.color}; margin-right: 6px">{'●'.repeat(Math.min(sessions % 4 || 4, 4))}</span>
      {/if}
      {sessions} sesija danas
    </div>
    <div style="display: flex; gap: 4px; margin-top: 6px">
      {#each MODES as m, i (m.id)}
        <button
          class="pomo-mode-chip {modeIdx === i ? 'active' : ''}"
          onclick={() => modeIdx = i}
        >{m.mins}m</button>
      {/each}
    </div>
  </div>

  <div class="pomo-controls">
    <button class="pomo-ctrl-btn" onclick={reset} title="Reset">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
      </svg>
    </button>
    <button
      class="pomo-play-btn"
      style="background: {mode.color}; box-shadow: {running ? `0 0 0 4px color-mix(in srgb, ${mode.color} 20%, transparent)` : 'none'}"
      onclick={() => running = !running}
    >
      {#if running}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      {:else}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5,3 19,12 5,21"/>
        </svg>
      {/if}
    </button>
    <button class="pomo-ctrl-btn" onclick={onClose} title="Zatvori">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .pomo-widget {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    margin-bottom: var(--pad-4);
  }
  .pomo-ring-wrap {
    position: relative;
    width: 52px;
    height: 52px;
    flex-shrink: 0;
  }
  .pomo-ring-label {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .pomo-info { flex: 1; min-width: 0; }
  .pomo-mode-chip {
    padding: 2px 8px;
    border-radius: var(--r-pill);
    font-size: 10px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-faint);
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .pomo-mode-chip.active {
    background: var(--bg-hover);
    color: var(--text);
  }
  .pomo-controls {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .pomo-ctrl-btn {
    width: 28px;
    height: 28px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg-elev-2);
    display: grid;
    place-items: center;
    color: var(--text-faint);
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .pomo-ctrl-btn:hover { background: var(--bg-hover); color: var(--text); }
  .pomo-play-btn {
    width: 36px;
    height: 36px;
    border-radius: var(--r-pill);
    border: none;
    color: #fff;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: box-shadow .3s, transform .06s;
  }
  .pomo-play-btn:active { transform: scale(0.95); }
</style>
