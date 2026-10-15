<script>
  // Brojčani odgovor.
  import Md from "./Md.svelte";
  import BrojUnos from "./BrojUnos.svelte";
  import { tocanOdgovor } from "../katalog/index.js";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();
</script>

<div class="lx-question"><Md text={spec.tekst} /></div>
<BrojUnos jedinica={spec.jedinica} {locked} {ishod} {onodgovor} />
{#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}
