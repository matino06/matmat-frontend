<script>
  import { Card, CardContent } from "$lib/components/ui/card";
  import { Lightbulb } from "@lucide/svelte/icons";
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  export let intervalMs = 9000;

  const tips = [
    "Bolje je svaki dan po 3 zadatka nego 2 dana u tjednu 15 zadataka – kraće i češće učenje daje bolje rezultate.",
    "Greške su signal, ne neuspjeh – algoritam ih koristi da te nauči bolje.",
    "Jedan dan pauze je OK, dva su već navika – vrati se svaki dan.",
    "Ako ti se ne da puno – riješi barem jedan zadatak.",
  ];

  let currentIndex = 0;
  let intervalId;

  function nextTip() {
    currentIndex = (currentIndex + 1) % tips.length;
  }

  function prevTip() {
    currentIndex = (currentIndex - 1 + tips.length) % tips.length;
  }

  onMount(() => {
    intervalId = setInterval(nextTip, intervalMs);
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });
</script>

<Card class="relative h-full w-full transition-all hover:shadow-md">
  <CardContent class="px-4 py-2">
    <div class="bg-primary/10 absolute top-3 right-3 rounded-full p-2">
      <Lightbulb class="text-primary h-5 w-5" />
    </div>

    <div class="flex h-full min-h-[120px] flex-col">
      <p class="text-muted-foreground text-sm font-medium">Savjet dana</p>
      <div class="relative mt-2 min-h-[48px]">
        {#key currentIndex}
          <p
            in:fade={{ duration: 180 }}
            out:fade={{ duration: 120 }}
            class="absolute inset-0 text-sm lg:text-base"
          >
            {tips[currentIndex]}
          </p>
        {/key}
      </div>

      <div class="mt-3 flex items-center justify-between pt-4">
        <div class="flex gap-1">
          <button
            on:click|preventDefault={prevTip}
            class="hover:text-primary rounded px-1 transition-colors"
            aria-label="Prethodni savjet">◀</button
          >
          <button
            on:click|preventDefault={nextTip}
            class="hover:text-primary rounded px-1 transition-colors"
            aria-label="Sljedeći savjet">▶</button
          >
        </div>
        <div class="text-muted-foreground text-xs">
          {currentIndex + 1} / {tips.length}
        </div>
      </div>
    </div>
  </CardContent>
</Card>
