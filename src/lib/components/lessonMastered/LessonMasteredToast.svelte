<script>
  // "Lekcija svladana": a rating just mastered its lesson. Shows the lesson and its field's progress for a few
  // seconds with the milestone sound; a click closes it.
  import { onMount } from "svelte";
  import { BadgeCheck } from "@lucide/svelte/icons";
  import { playSound } from "$lib/sound.svelte.js";

  let { lessonName, fieldName, mastered, total, onclose = () => {} } = $props();

  let pct = $derived(total ? Math.min((mastered / total) * 100, 100) : 0);

  onMount(() => {
    playSound("milestone");
    const t = setTimeout(onclose, 4000);
    return () => clearTimeout(t);
  });
</script>

<button class="mastered-toast" onclick={onclose}>
  <BadgeCheck class="mastered-ico" size={28} strokeWidth={1.8} aria-hidden="true" />
  <span class="mastered-body">
    <span class="mastered-title">Lekcija svladana</span>
    <span class="mastered-name">{lessonName}</span>
    {#if total}
      <span class="mastered-bar"><span class="mastered-fill" style="width:{pct}%"></span></span>
      <span class="mastered-count">{fieldName}: {mastered} od {total}</span>
    {/if}
  </span>
</button>

<style>
  .mastered-toast {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    width: min(380px, calc(100vw - 32px));
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 18px;
    text-align: left;
    color: var(--text);
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    animation: masteredIn 0.3s cubic-bezier(0.34, 1.4, 0.64, 1);
  }
  .mastered-toast :global(.mastered-ico) {
    flex-shrink: 0;
    color: var(--success);
  }
  .mastered-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .mastered-title {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--success);
  }
  .mastered-name {
    display: block;
    font-size: 13px;
    font-weight: 500;
  }
  .mastered-bar {
    display: block;
    height: 4px;
    margin-top: 8px;
    border-radius: 99px;
    background: var(--border);
    overflow: hidden;
  }
  .mastered-fill {
    display: block;
    height: 100%;
    border-radius: 99px;
    background: var(--success);
  }
  .mastered-count {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-faint);
  }
  @keyframes masteredIn {
    from { opacity: 0; transform: translateX(-50%) translateY(-16px) scale(0.96); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .mastered-toast { animation: none; }
  }
</style>
