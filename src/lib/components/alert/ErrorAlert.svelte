<script>
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { fly } from "svelte/transition";
  import { errorData } from "$lib/store/errorAlert.svelte";
</script>

{#if errorData.showError}
  <div
    class="fixed bottom-4 left-4 z-50"
    transition:fly={{ x: -200, duration: 300 }}
  >
    <Alert.Root variant="destructive">
      <Alert.Title>Došlo je do pogreške!</Alert.Title>
      <Alert.Description>{errorData.errorMessage}</Alert.Description>
    </Alert.Root>
  </div>
{/if}
