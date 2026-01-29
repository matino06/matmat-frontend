<script>
  import { fade } from "svelte/transition";
  import { userData, handleLogIn } from "$lib/store/user.svelte";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Card, CardContent } from "$lib/components/ui/card/index.js";

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
    class="flex min-h-[calc(100vh-160px)] items-center justify-center p-6"
  >
    <Card
      class="from-primary/5 to-primary/10 w-full max-w-2xl border-0 bg-gradient-to-br shadow-lg"
    >
      <CardContent class="flex flex-col items-center p-8 text-center md:p-12">
        <div class="bg-primary/20 mb-6 rounded-full p-5">
          <svg
            class="text-primary h-12 w-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            ></path>
          </svg>
        </div>

        <!-- Naslov -->
        <h1
          class="mb-4 text-3xl font-bold tracking-tight text-gray-800 md:text-4xl"
        >
          Prijava je potrebna za pristup
        </h1>

        <!-- Poruka -->
        <div class="mb-8 space-y-4">
          <p class="text-lg text-gray-600">
            Ova stranica je dostupna samo prijavljenim korisnicima kako bismo
            osigurali personalizirano iskustvo učenja.
          </p>

          <div class="bg-primary/5 rounded-lg p-4">
            <p class="text-primary font-medium">
              Prijava je besplatna i traje samo nekoliko sekundi!
            </p>
          </div>
        </div>

        <Button
          onclick={handleLogIn}
          size="xl"
          class="group from-primary to-primary/80 relative overflow-hidden bg-gradient-to-r px-10 py-6 text-lg font-semibold shadow-lg transition-all hover:shadow-xl"
        >
          <span class="relative z-10 flex items-center gap-3">
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              ></path>
            </svg>
            Prijavi se i nastavi s učenjem
          </span>
          <span
            class="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          ></span>
        </Button>

        <div class="mt-10 grid w-full gap-4 sm:grid-cols-2">
          <div class="flex items-start gap-3">
            <div class="rounded-full bg-green-100 p-2">
              <svg
                class="h-4 w-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-800">Personalizirani zadaci</p>
              <p class="text-sm text-gray-500">Prilagođeni tvojoj razini</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="rounded-full bg-blue-100 p-2">
              <svg
                class="h-4 w-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                ></path>
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-800">AI asistent</p>
              <p class="text-sm text-gray-500">Pomoć kad zapneš</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
{/if}
