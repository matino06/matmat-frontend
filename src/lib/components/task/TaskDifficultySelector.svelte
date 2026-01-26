<script>
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Button } from "$lib/components/ui/button";
  import { apiClient } from "$lib/api/apiClient";

  let { task, handleTaskSubmit } = $props();
  let q = $state(null);
  let isSubmitting = $state(false);

  const difficultyLevels = [
    {
      label: "Potpuni zaborav",
      value: 0,
      color: "#ff9800",
      shortLabel: "Zaborav",
    },
    {
      label: "Netočno riješeno, rješenje shvaćeno",
      value: 1,
      color: "#ffc107",
      shortLabel: "Netočno",
    },
    {
      label: "Netočno riješeno, iako se rješenje čini lagan",
      value: 2,
      color: "#ffeb3b",
      shortLabel: "Lako netočno",
    },
    {
      label: "Točno riješeno, ali s velikim naporom",
      value: 3,
      color: "#cddc39",
      shortLabel: "Napor",
    },
    {
      label: "Točno riješeno nakon malo razmišljanja",
      value: 4,
      color: "#8bc34a",
      shortLabel: "Lako točno",
    },
    {
      label: "Savršen odgovor",
      value: 5,
      color: "#399918",
      shortLabel: "Savršeno",
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
    <div class="relative mb-8">
      <div
        class="absolute top-0 right-0 left-0 text-center text-sm text-gray-600"
      >
        <div class="mb-1 flex justify-between">
          <span class="text-xs">Teže</span>
          <span class="text-xs">Lakše</span>
        </div>
      </div>
      <div class="pt-5">
        <div
          class="h-2 w-full rounded-full bg-gradient-to-r from-[#C40C0C] to-[#399918]"
        ></div>
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
                  <div class="flex items-center justify-center">
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
                <p class="max-w-xs text-sm">{difficulty.label}</p>
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
        {/each}
      </RadioGroup.Root>
    </Tooltip.Provider>
  </div>

  <div class="mt-6 flex justify-center">
    <Button
      onclick={submit}
      disabled={isSubmitting || q === null}
      class="w-full min-w-[120px] sm:w-auto"
    >
      {isSubmitting ? "Šaljem..." : "Sljedeći"}
    </Button>
  </div>

  <div class="mt-3 text-center text-xs text-gray-500">
    <div class="gapx-4 mb-1 flex flex-wrap justify-center">
      <span>0 = Ni nakon pročitanog rješenja mi nije jasno</span>
      <span>5 = Riješio samostalno bez problema</span>
    </div>
    <p class="text-xs">
      Brojevi predstavljaju razinu težine: manji broj = teže, veći broj = lakše
    </p>
  </div>
</div>

<style>
  @media (max-width: 640px) {
    .peer {
      height: 24px;
      width: 24px;
    }
  }
</style>
