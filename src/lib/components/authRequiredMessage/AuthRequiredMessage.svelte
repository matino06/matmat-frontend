<script>
  import { fade } from "svelte/transition";
  import { userData } from "$lib/store/user.svelte";
  import { onMount } from "svelte";

  let canShowText = $state(false);

  onMount(() => {
    setTimeout(() => {
      canShowText = true;
    }, 300);
  });
</script>

{#if canShowText && !userData.user}
  <div
    transition:fade
    class="flex min-h-[calc(100vh-92px)] scroll-m-20 items-center justify-items-start"
  >
    <h1 class="text-4xl font-extrabold tracking-tight lg:text-5xl">
      🔒 Ova stranica je dostupna samo prijavljenim korisnicima. <br />
      Molimo, prijavite se kako biste nastavili.
    </h1>
  </div>
{/if}
