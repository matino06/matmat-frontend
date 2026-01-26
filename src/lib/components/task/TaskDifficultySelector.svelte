<script>
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Button } from "$lib/components/ui/button";

  let { task, handleTaskSubmit } = $props();
  let q = $state(null);
  let isSubmitting = $state(false);

  const difficultyLevels = [
    {
      label: "Ni nakon pročitanog rješenja mi nije jasno",
      value: 0,
      color: "#ff9800",
      shortLabel: "Zaborav",
      category: "neuspjeh",
    },
    {
      label: "Netočno riješeno, rješenje shvaćeno",
      value: 1,
      color: "#ffc107",
      shortLabel: "Netočno",
      category: "neuspjeh",
    },
    {
      label: "Netočno riješeno, iako se rješenje čini lagan",
      value: 2,
      color: "#ffeb3b",
      shortLabel: "Lako netočno",
      category: "neuspjeh",
    },
    {
      label: "Točno riješeno, ali s velikim naporom",
      value: 3,
      color: "#cddc39",
      shortLabel: "Napor",
      category: "uspjeh",
    },
    {
      label: "Točno riješeno nakon malo razmišljanja",
      value: 4,
      color: "#8bc34a",
      shortLabel: "Lako točno",
      category: "uspjeh",
    },
    {
      label: "Riješio samostalno bez problema",
      value: 5,
      color: "#399918",
      shortLabel: "Savršeno",
      category: "uspjeh",
    },
  ];

  async function submit() {
    if (isSubmitting || q === null) return;

    isSubmitting = true;

    try {
      await handleTaskSubmit(q);
      q = null;
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="w-full">
  <div class="mb-4">
    <div class="relative mb-3">
      <div class="mb-1 flex justify-between text-sm text-gray-600">
        <div class="flex flex-col items-center">
          <span class="text-xs font-medium text-red-600 sm:text-sm"
            >Nisam uspio samostalno</span
          >
        </div>
        <div class="flex flex-col items-center">
          <span class="text-xs font-medium text-green-600 sm:text-sm"
            >Uspio sam samostalno</span
          >
        </div>
      </div>

      <div class="relative pt-1">
        <div
          class="absolute top-0 bottom-0 left-1/2 z-10 w-0.5 bg-gray-400"
          style="transform: translateX(-50%);"
        ></div>

        <div class="relative h-2 w-full overflow-hidden rounded-full">
          <div
            class="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-[#C40C0C] via-[#ffc107] to-[#ffeb3b]"
          ></div>
          <div
            class="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-r from-[#ffeb3b] via-[#8bc34a] to-[#399918]"
          ></div>
        </div>

        <div class="mt-1 flex justify-between">
          <span class="text-xs text-gray-500">0-2</span>
          <span class="text-xs text-gray-500">3-5</span>
        </div>
      </div>
    </div>

    <Tooltip.Provider>
      <RadioGroup.Root
        bind:value={q}
        class="flex w-full items-start justify-between"
      >
        {#each difficultyLevels as difficulty}
          <div class="flex flex-1 flex-col items-center">
            <Tooltip.Root>
              <Tooltip.Trigger class="w-full">
                <div class="flex w-full flex-col items-center space-y-1 px-1">
                  <div class="relative flex items-center justify-center">
                    <RadioGroup.Item
                      value={difficulty.value}
                      style={`accent-color: ${difficulty.color};`}
                      class="peer h-5 w-5"
                    />
                  </div>
                  <div class="text-center text-xs font-medium text-gray-700">
                    {difficulty.value}
                  </div>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p class="max-w-xs text-sm">
                  <span class="font-medium">
                    {difficulty.category === "neuspjeh"
                      ? "✗ Nisam uspio:"
                      : "✓ Uspio sam:"}
                  </span><br />
                  {difficulty.label}
                </p>
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
        {/each}
      </RadioGroup.Root>
    </Tooltip.Provider>
  </div>

  <!-- Gumb ispod radio buttona -->
  <div class="mt-2 flex justify-center">
    <Button
      onclick={submit}
      disabled={isSubmitting || q === null}
      class="w-full min-w-[120px] sm:w-auto"
    >
      {isSubmitting ? "Šaljem..." : "Sljedeći"}
    </Button>
  </div>

  <!-- Legenda s objašnjenjem -->
  <div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
    <div
      class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
    >
      <!-- Lijeva kategorija -->
      <div class="flex-1">
        <div class="mb-1 flex items-center gap-2">
          <div
            class="h-3 w-3 rounded-sm bg-gradient-to-r from-[#ff9800] to-[#ffeb3b]"
          ></div>
          <span class="text-sm font-medium text-red-600"
            >Nisam uspio samostalno (0-2)</span
          >
        </div>
        <ul class="space-y-1 pl-5 text-xs text-gray-600">
          <li class="list-disc">
            Ni nakon pročitanog rješenja mi nije jasno (0)
          </li>
          <li class="list-disc">Netočno riješeno, rješenje shvaćeno (1)</li>
          <li class="list-disc">
            Netočno riješeno, iako se rješenje čini lagan (2)
          </li>
        </ul>
      </div>

      <!-- Desna kategorija -->
      <div class="flex-1">
        <div class="mb-1 flex items-center gap-2">
          <div
            class="h-3 w-3 rounded-sm bg-gradient-to-r from-[#cddc39] to-[#399918]"
          ></div>
          <span class="text-sm font-medium text-green-600"
            >Uspio sam samostalno (3-5)</span
          >
        </div>
        <ul class="space-y-1 pl-5 text-xs text-gray-600">
          <li class="list-disc">Točno riješeno, ali s velikim naporom (3)</li>
          <li class="list-disc">Točno riješeno nakon malo razmišljanja (4)</li>
          <li class="list-disc">Riješio samostalno bez problema (5)</li>
        </ul>
      </div>
    </div>

    <!-- Kratki savjet -->
    <div class="mt-3 border-t border-gray-200 pt-3">
      <p class="text-center text-xs text-gray-500">
        Odaberite razinu koja najbolje opisuje vaše iskustvo s rješavanjem
        zadatka.
      </p>
    </div>
  </div>
</div>

<style>
  /* Poboljšanja za bolju vidljivost na mobilnim uređajima */
  @media (max-width: 640px) {
    .peer {
      height: 24px;
      width: 24px;
    }
  }
</style>
