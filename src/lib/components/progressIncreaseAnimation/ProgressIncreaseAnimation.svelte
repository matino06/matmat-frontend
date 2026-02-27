<script>
  import { Tween } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import ProgressRing from "$lib/components/ui/progressRing/ProgressRing.svelte";
  import { fade } from "svelte/transition";

  let {
    show = false,
    initialProgress = 0,
    newProgress = 0,
    onClose = () => {},
  } = $props();

  let progressAnimationValue = new Tween(initialProgress, {
    duration: 400,
    easing: cubicOut,
  });

  $effect(() => {
    if (show) {
      progressAnimationValue.set(initialProgress);

      setTimeout(() => {
        progressAnimationValue.target = newProgress;
      }, 300);
    }
  });

  const progressIncrease = $derived(newProgress - initialProgress);
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === "Escape") show = false;
  }}
/>

{#if show}
  <div
    class="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 p-4 md:items-center"
    role="button"
    tabindex="0"
    transition:fade={{ duration: 300 }}
    onclick={() => (show = false)}
    onkeydown={(e) => e.key === "Enter" && (show = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      role="dialog"
      aria-modal="true"
      tabindex="0"
      class="bg-card relative mx-4 my-auto w-full max-w-md rounded-2xl p-6 shadow-2xl md:my-4 md:p-8"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="text-center">
        <div class="mb-6">
          <h2 class="mb-2 text-3xl font-bold text-[#58CC02]">
            Bravo! Napreduješ! 🎉
          </h2>
          <p class="text-muted-foreground text-lg">
            Tvoja spremnost za ispit se povećala
          </p>
        </div>

        <div class="relative mb-8 flex justify-center">
          <ProgressRing
            size="size-80"
            value={progressAnimationValue.current}
            max={100}
            showLabel
            label={"Tvoje Znanje"}
          />

          <div
            class="absolute -top-2 right-10 animate-bounce rounded-full bg-[#58CC02] px-3 py-1 text-sm font-bold text-white"
            style="animation-delay: 0.2s;"
          >
            +{progressIncrease}%
          </div>
        </div>

        <div class="mb-6 space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Prije zadatka</span>
            <span class="text-foreground text-lg font-bold"
              >{initialProgress}%</span
            >
          </div>
          <div class="bg-muted relative h-2 overflow-hidden rounded-full">
            <div
              class="from-muted-foreground/50 to-muted-foreground/30 absolute h-full rounded-full bg-gradient-to-r"
              style="width: {initialProgress}%"
            ></div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-[#58CC02]">Nakon zadatka</span>
            <span class="text-lg font-bold text-[#58CC02]">{newProgress}%</span>
          </div>
          <div class="bg-muted relative h-2 overflow-hidden rounded-full">
            <div
              class="absolute h-full rounded-full bg-[#58CC02]"
              style="width: {newProgress}%"
            ></div>
          </div>
        </div>

        <div class="rounded-xl bg-[#58CC02]/6 p-4">
          <div class="flex">
            <div class="my-auto mr-3 flex-shrink-0">
              <div
                class="flex h-6 w-6 items-center justify-center rounded-full bg-[#58CC02]"
              >
                <svg
                  class="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <div class="flex-1">
              <p class="text-sm text-gray-700">
                Svaki točno riješen zadatak te dovodi bliže potpunom
                razumijevanju. Nastavi s odličnim radom!
              </p>
            </div>
          </div>
        </div>

        <button
          onclick={() => (show = false)}
          class="text-primary-foreground mt-6 rounded-full bg-[#58CC02] px-8 py-3 font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        >
          Nastavi s učenjem
        </button>
      </div>
    </div>
  </div>
{/if}
