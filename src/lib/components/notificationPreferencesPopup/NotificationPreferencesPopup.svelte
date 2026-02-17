<script>
  import { apiClient } from "$lib/api/apiClient";
  import { fade, slide } from "svelte/transition";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";

  let {user} = $props();

  let showPopup = $state(false);
  let learningReminders = $state(false);
  let featureAnnouncements = $state(false);
  let isLoading = $state(true);
  let isSubmitting = $state(false);

  async function fetchPreferences() {
    if (!user) return;
    try {
      const response = await apiClient("/account/notification-settings", { method: "GET" });
      if (response.ok) {
        const data = await response.json();

        if (data.learningRemindersEnabled === null && data.featureAnnouncementsEnabled === null) {
          showPopup = true;
          learningReminders = false;
          featureAnnouncements = false;
        } else {
          showPopup = false;
        }
      } else {
        showPopup = false;
      }
    } catch (e) {
      console.error("Failed to fetch notification preferences", e);
      showPopup = false;
    } finally {
      isLoading = false;
    }
  }

  async function submitPreferences() {
    isSubmitting = true;
    try {
      const response = await apiClient("/account/notification-settings", {
        method: "POST",
        body: JSON.stringify({
          learningRemindersEnabled: learningReminders,
          featureAnnouncementsEnabled: featureAnnouncements,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        showPopup = false;
      } else {
        console.error("Failed to save preferences");
      }
    } catch (e) {
      console.error("Error saving preferences", e);
    } finally {
      isSubmitting = false;
    }
  }

  $effect(() => {
    if (user) {
      fetchPreferences();
    } else {
      showPopup = false;
    }
  });
</script>

{#if showPopup}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" transition:fade>
    <div class="bg-background rounded-lg shadow-xl p-6 max-w-md w-full mx-4" transition:slide>
      <h2 class="text-xl font-bold mb-4">Postavke obavijesti</h2>
      <p class="text-muted-foreground mb-6">
        Želite li primati podsjetnike za učenje i obavijesti o novim značajkama? Možete ih isključiti u bilo kojem trenutku.
      </p>

      <div class="space-y-4 mb-6">
        <label class="flex items-center gap-3 cursor-pointer">
          <Checkbox bind:checked={learningReminders} />
          <span class="text-sm font-medium">Podsjetnici za učenje (svakodnevni podsjetnici ako niste aktivni)</span>
        </label>

        <label class="flex items-center gap-3 cursor-pointer">
          <Checkbox bind:checked={featureAnnouncements} />
          <span class="text-sm font-medium">Obavijesti o novim značajkama i predmetima</span>
        </label>
      </div>

      <div class="flex justify-end gap-2">
        <Button variant="outline" onclick={() => showPopup = false}>Preskoči</Button>
        <Button onclick={submitPreferences} disabled={isSubmitting}>
          {isSubmitting ? "Spremanje..." : "Spremi"}
        </Button>
      </div>
    </div>
  </div>
{/if}