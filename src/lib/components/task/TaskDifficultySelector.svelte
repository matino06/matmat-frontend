<script>
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Button } from "$lib/components/ui/button";

  const difficultyLevels = [
    { label: "Potpuni zaborav", value: 0, color: "#ff9800" },
    {
      label: "Netočno riješeno, rješenje shvaćeno",
      value: 1,
      color: "#ffc107",
    },
    {
      label: "Netočno riješeno, iako se rješenje čini lagan",
      value: 2,
      color: "#ffeb3b",
    },
    {
      label: "Točno riješeno, ali s velikim naporom",
      value: 3,
      color: "#cddc39",
    },
    {
      label: "Točno riješeno nakon malo razmišljanja",
      value: 4,
      color: "#8bc34a",
    },
    { label: "Savršen odgovor", value: 5, color: "#399918" },
  ];
</script>

<div class="">
  <Tooltip.Provider>
    <RadioGroup.Root class="flex w-full justify-between">
      {#each difficultyLevels as difficulty}
        <Tooltip.Root>
          <Tooltip.Trigger>
            <div class="flex items-center space-x-2">
              <RadioGroup.Item
                value={difficulty.value}
                style={`accent-color: ${difficulty.color};`}
                class="peer"
              />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>{difficulty.label}</p>
          </Tooltip.Content>
        </Tooltip.Root>
      {/each}
      <Button>Sljedeći</Button>
    </RadioGroup.Root>
  </Tooltip.Provider>
</div>
