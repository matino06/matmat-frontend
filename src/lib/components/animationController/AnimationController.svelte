<script>
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import { Button } from "$lib/components/ui/button";

  let {animation} = $props();

  let canDo = $state(false);
  let canUndo = $state(false);

  const observer = {
    updateDoUndoState(newCanDo, newCanUndo) {
      canDo = newCanDo;
      canUndo = newCanUndo;
    }
  };

  animation.subscribe(observer);
</script>

<div class="flex w-full items-center justify-between">
  <div class="mt-2 flex w-full items-center justify-between gap-2">
    <Button variant="outline" disabled={!canUndo} onclick={() => animation.undo()} size="icon">
      <ArrowLeft class="h-5 w-5" />
    </Button>
    <Button variant="outline" disabled={!canDo} onclick={() => animation.do()} size="icon">
      <ArrowRight class="h-5 w-5" />
    </Button>
  </div>
</div>
