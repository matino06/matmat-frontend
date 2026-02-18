<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { browser } from '$app/environment';

  export let intervalHours = 2; // cooldown in hours
  export let tips = [
    "Bolje je svaki dan po 3 zadatka nego 2 dana u tjednu 15 zadataka – kraće i češće učenje daje drastično bolje rezultate.",
    "Greške su signal, ne neuspjeh – algoritam ih koristi da te nauči bolje.",
    "Jedan dan pauze je OK, dva su već navika – vrati se svaki dan.",
    "Ako ti se ne da puno – riješi barem jedan zadatak.",
  ];

  let show = false;
  let currentTip = '';

  onMount(() => {
    if (!browser) return;

    const STORAGE_KEY = 'taskTip';
    const now = Date.now();

    // Load last tip data
    const stored = localStorage.getItem(STORAGE_KEY);
    let lastIndex = -1;
    let lastTime = 0;

    if (stored) {
      try {
        const data = JSON.parse(stored);
        lastIndex = data.index || -1;
        lastTime = data.time || 0;
      } catch (e) {
        console.warn('Failed to parse tip storage', e);
      }
    }

    // Check if cooldown has passed
    const hoursSinceLast = (now - lastTime) / (1000 * 60 * 60);
    if (lastTime === 0 || hoursSinceLast >= intervalHours) {
      // Determine next tip index
      const nextIndex = (lastIndex + 1) % tips.length;

      // Save new index and time
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ index: nextIndex, time: now })
      );

      currentTip = tips[nextIndex];
      show = true;
    }
    // else: do nothing, tip won't show
  });

  function close() {
    show = false;
  }
</script>

{#if show}
  <div
    transition:fade={{ duration: 200 }}
    class="fixed inset-0 flex items-center justify-center z-50"
  >
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" on:click={close}></div>

    <div
      transition:fly={{ y: 20, duration: 300 }}
      class="bg-background border border-border shadow-lg rounded-lg p-4 relative max-w-sm z-10"
    >
      <button
        on:click={close}
        class="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        aria-label="Zatvori"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div class="flex items-start gap-3">
        <div class="text-primary text-2xl">💡</div>
        <p class="text-sm text-foreground leading-relaxed">{currentTip}</p>
      </div>
    </div>
  </div>
{/if}