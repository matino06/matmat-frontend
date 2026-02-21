<script>
  import { apiClient } from "$lib/api/apiClient";
  import { onMount } from "svelte";

  const allTempoOptions = [
    {
      value: 1,
      tempoName: "Ubrzani",
    },
    {
      value: 2,
      tempoName: "Temeljiti",
    },
  ];

  let { fetchNewTask } = $props();

  let selectedTempo = $state(null);
  let isLoading = $state(false);

  onMount(async () => {
    const response = await apiClient("/account/tempo", { method: "GET" });
    if (response.ok) {
      selectedTempo = await response.json();
    }
  });

  async function handleTempoChange(event) {
    const value = parseInt(event.target.value);
    if (selectedTempo === value || isLoading) return;

    isLoading = true;
    try {
      const response = await apiClient("/account/tempo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });

      if (response.ok) {
        selectedTempo = value;
        await fetchNewTask();
      } else {
        console.error("Greška pri promjeni tempa");
      }
    } catch (error) {
      console.error("Greška pri promjeni tempa:", error);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="flex items-center gap-2">
  <select
    class="bg-popover border-border text-foreground focus:border-primary focus:ring-primary rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
    onchange={handleTempoChange}
    disabled={isLoading}
  >
    <option value="" disabled selected={selectedTempo === null}>
      {allTempoOptions.find((t) => t.value === selectedTempo)?.tempoName || "Odaberi tempo"}
    </option>
    {#each allTempoOptions as option}
      <option value={option.value} selected={option.value === selectedTempo}>
        {option.tempoName}
      </option>
    {/each}
  </select>

  {#if isLoading}
    <span class="text-muted-foreground text-sm">Učitavanje...</span>
  {/if}
</div>