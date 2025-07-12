<script>
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";

  import Navbar from "$lib/components/navbar/Navbar.svelte";

  let { children } = $props();
</script>

<ModeWatcher />
<div class="p-4">
  <Navbar />
  {@render children?.()}
</div>
