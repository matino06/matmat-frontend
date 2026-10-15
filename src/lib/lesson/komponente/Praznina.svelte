<script>
  // Tekst s prazninama [[1]], [[2]] …: markdown se iscrta cijeli (formule ostaju netaknute), a polja se umetnu
  // na mjesta oznaka. Praznina s ponuđenim odgovorima je padajući izbor, ostale su polja za broj.
  import { untrack } from "svelte";
  import { renderMd } from "$lib/utils/markdownRenderer.js";
  import { tocanOdgovor } from "../katalog/index.js";
  import Md from "./Md.svelte";

  let { spec, locked = false, pokazi = false, ishod = null, onodgovor = () => {} } = $props();

  // svelte-ignore state_referenced_locally (korak se za novi spec iscrtava iznova)
  let values = $state(spec.praznine.map(() => ""));
  let box;
  let html = $derived(renderMd(spec.tekst.replace(/\[\[(\d+)\]\]/g, (_, n) => `<span class="lx-slot" data-slot="${Number(n) - 1}"></span>`)));
  let complete = $derived(values.every((v) => String(v).trim()));

  // polja se stvaraju jednom po iscrtanom tekstu; stanje (zaključano, točno/krivo) osvježava se zasebno
  $effect(() => {
    html;
    for (const slot of box.querySelectorAll(".lx-slot")) {
      const i = Number(slot.dataset.slot);
      const p = spec.praznine[i];
      let el;
      if (p.opcije) {
        el = document.createElement("select");
        el.innerHTML = `<option value="">…</option>` + p.opcije.map((o) => `<option>${o.replace(/</g, "&lt;")}</option>`).join("");
      } else {
        el = document.createElement("input");
        el.inputMode = "decimal";
        el.autocomplete = "off";
        el.placeholder = "?";
      }
      el.className = "inp lx-slot-inp";
      el.setAttribute("aria-label", `${i + 1}. praznina`);
      el.value = untrack(() => values[i]); // bez praćenja: inače bi svaki znak iznova stvorio polja i maknuo fokus
      el.addEventListener("input", () => (values[i] = el.value));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && untrack(() => complete && !locked)) onodgovor($state.snapshot(values));
      });
      slot.replaceChildren(el);
      if (p.jedinica) slot.append(` ${p.jedinica}`);
    }
  });

  $effect(() => {
    box.querySelectorAll(".lx-slot-inp").forEach((el, i) => {
      el.disabled = locked;
      el.classList.toggle("ok", !!ishod?.tocno || (ishod && ishod.praznina > i));
      el.classList.toggle("bad", !!ishod && !ishod.tocno && ishod.praznina === i && !ishod.prazno);
    });
  });
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- markdown iz vlastitog renderera, kao kod zadataka -->
<div class="lx-question lx-praznina" bind:this={box}>{@html html}</div>
<div class="lx-actions">
  <button class="btn btn-primary" disabled={locked || !complete} onclick={() => onodgovor($state.snapshot(values))}>Provjeri</button>
</div>
{#if pokazi}<p class="lx-solution">Točan odgovor: <Md text={tocanOdgovor(spec)} inline /></p>{/if}

<style>
  .lx-praznina :global(.lx-slot) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .lx-praznina :global(.lx-slot-inp) {
    display: inline-block;
    width: 92px;
    padding: 4px 8px;
    text-align: right;
    font-family: var(--font-mono);
    font-size: 16px;
  }
  .lx-praznina :global(select.lx-slot-inp) {
    width: auto;
    text-align: left;
    font-family: inherit;
  }
</style>
