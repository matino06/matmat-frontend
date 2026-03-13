<script>
  import { BookOpen, X, ExternalLink } from "@lucide/svelte/icons";
  import { slide } from "svelte/transition";

  let open = $state(false);
</script>

<!-- Floating toggle button -->
<button
  onclick={() => (open = !open)}
  class="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg transition hover:bg-primary/90 active:scale-95"
  aria-label="Formule"
>
  <BookOpen class="h-4 w-4 shrink-0" />
  <span class="hidden sm:inline">Formule</span>
</button>

<!-- Panel -->
{#if open}
  <div
    transition:slide={{ axis: "x", duration: 300 }}
    class="fixed left-0 top-0 z-40 flex h-full w-full flex-col bg-background shadow-2xl sm:w-[480px] md:w-[560px]"
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b px-4 py-3 shrink-0">
      <div class="flex items-center gap-2">
        <BookOpen class="text-primary h-4 w-4" />
        <span class="font-semibold text-sm">Tablice i formule — matura</span>
      </div>
      <div class="flex items-center gap-1">
        <a
          href="/pdfs/MAT-FORMULE.pdf"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Otvori u novom prozoru"
        >
          <ExternalLink class="h-4 w-4" />
        </a>
        <button
          onclick={() => (open = false)}
          class="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Zatvori"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- PDF embed -->
    <iframe
      src="/pdfs/MAT-FORMULE.pdf"
      class="h-full w-full"
      title="Tablice i formule"
    ></iframe>
  </div>

  <!-- Backdrop (mobile) -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-30 bg-black/40 sm:hidden"
    onclick={() => (open = false)}
  ></div>
{/if}
