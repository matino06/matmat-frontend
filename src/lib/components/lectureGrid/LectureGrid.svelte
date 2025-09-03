<script>
  import * as Card from "$lib/components/ui/card/index.js";
  import LockKeyhole from "@lucide/svelte/icons/lock-keyhole";
  import LockKeyholeOpen from "@lucide/svelte/icons/lock-keyhole-open";

  let { lectures } = $props();
</script>

<div class="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
  {#each lectures as lecture}
    <Card.Root class="w-full rounded-2xl shadow-md transition hover:shadow-lg">
      <Card.Content>
        <div class="flex items-center justify-between">
          <a
            href={lecture.path}
            class="{lecture.unlocked
              ? 'text-primary-foreground hover:text-chart-2'
              : 'text-muted-foreground pointer-events-none cursor-not-allowed'} 
              text-l block font-semibold"
          >
            {lecture.title}
          </a>
          {#if lecture.unlocked}
            <LockKeyholeOpen class="text-chart-2" />
          {:else}
            <LockKeyhole class="text-primary" />
          {/if}
        </div>
      </Card.Content>
    </Card.Root>
  {/each}
</div>
