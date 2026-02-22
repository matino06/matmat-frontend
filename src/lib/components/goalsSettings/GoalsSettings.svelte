<script>
  import { apiClient } from "$lib/api/apiClient";
  import { fade, slide } from "svelte/transition";
  import { Button } from "$lib/components/ui/button";
  import { Settings } from "@lucide/svelte/icons";
  import { userData } from "$lib/store/user.svelte";
  import { onMount } from "svelte";

  let showPopup = $state(false);
  let goals = $state([]);
  let isLoading = $state(true);
  let isSubmitting = $state(false);

  async function fetchGoals() {
    if (!userData.user) return;
    try {
      const response = await apiClient("/account/goals", { method: "GET" });
      const data = await response.json();

      goals = data;
    } catch (e) {
      console.error("Failed to fetch goals", e);
      showPopup = false;
    } finally {
      isLoading = false;
    }
  }

  async function submitGoals() {
    isSubmitting = true;
    try {
      const response = await apiClient("/account/goals", {
        method: "POST",
        body: JSON.stringify({
          userCourseGoalsNew: goals,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        showPopup = false;
        location.reload();
      } else {
        console.error("Failed to save preferences");
      }
    } catch (e) {
      console.error("Error saving preferences", e);
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    fetchGoals();
  })
</script>

<button
  class="text-foreground hover:text-primary flex items-center gap-3 py-2 text-left text-lg font-xl transition-colors"
  onclick={() => {
    showPopup = true;
  }}
>
  <Settings class="text-muted-foreground w-10"/>
</button>

{#if showPopup}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" transition:fade>
    <div class="bg-background rounded-lg shadow-xl p-6 max-w-md w-full mx-4" transition:slide>
      <h2 class="text-xl font-bold mb-4">Postavke ciljeva</h2>
      <p class="text-muted-foreground mb-6">
        Odaberi koliko zadataka dnevno želiš riješiti za svaki predmet.
      </p>

      <div class="space-y-4  mb-6">
        {#each goals as goal}
          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-sm font-medium">
              {goal.course.courseName}
            </span>

            <select
              class="border rounded-lg px-2 py-1 text-sm"
              bind:value={goal.dailyGoal}
            >
              <option value="" disabled selected>Ocjena</option>
              {#each [1,2,3,4,5] as number}
                <option value={number}>{number}</option>
              {/each}
            </select>

          </label>
        {/each}
      </div>

      <div class="flex justify-end gap-2">
        <Button variant="outline" onclick={() => {
          showPopup = false;
        }}>Preskoči</Button>
        <Button onclick={submitGoals} disabled={isSubmitting}>
          {isSubmitting ? "Spremanje..." : "Spremi"}
        </Button>
      </div>
    </div>
  </div>
{/if}