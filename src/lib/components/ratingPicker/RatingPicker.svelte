<script module>
  // The FSRS grade 1–4 the backend takes. Also read by /kako-radi, which lists what each rating means.
  // `sub` is the backend's FSRS interval for the first rating of a new objective (Fsrs.first, desired
  // retention 0.9). With a taskId the picker shows the user's real interval instead.
  export const RATINGS = [
    { k: 1, t: "Nisam riješio", desc: "Nisam znao ili sam pogriješio",                 sub: "za 1 dan",  color: "#ef4444" },
    { k: 2, t: "S mukom",       desc: "Riješio sam, ali uz krive pokušaje ili pomoć",  sub: "za 1 dan",  color: "#f59e0b" },
    { k: 3, t: "Dobro",         desc: "Riješio sam uz malo razmišljanja",              sub: "za 2 dana", color: "#22c55e" },
    { k: 4, t: "Lako",          desc: "Riješio sam odmah, bez razmišljanja",           sub: "za 8 dana", color: "#16a34a" },
  ];

  export const ocjena = (k) => RATINGS[k - 1];

  export function formatDays(n) {
    const unit = n % 10 === 1 && n % 100 !== 11 ? "dan" : "dana";
    return `za ${n} ${unit}`;
  }
</script>

<script>
  import { apiClient } from "$lib/api/apiClient";

  // taskId: when set, each button shows the backend's real FSRS interval for this
  // user; without it (marketing demos) the static RATINGS values are shown.
  // najvise: a finished interactive lesson's limit; higher ratings can't be chosen (lowering always can).
  // days: intervals to show instead, indexed by grade - 1 (the walkthrough, which has no backend).
  let { onSelect, taskId = null, najvise = 4, days = null } = $props();

  // Days until the objective returns, indexed by grade - 1; null until loaded.
  let intervals = $state(null);

  $effect(() => {
    intervals = null;
    if (taskId == null) return;
    let cancelled = false;
    apiClient(`/solved-task/next-intervals/${taskId}`, { method: "GET" })
      .then((res) => (res.ok ? res.json() : null))
      .then((days) => { if (!cancelled) intervals = days; })
      .catch(() => {});
    return () => { cancelled = true; };
  });

  function subFor(r) {
    if (days) return formatDays(days[r.k - 1]);
    if (taskId == null) return r.sub;
    return intervals ? formatDays(intervals[r.k - 1]) : null;
  }

  let hovered = $state(null);
  let selected = $state(null);
  let active = $derived(hovered !== null ? hovered : selected);
  let activeR = $derived(active !== null ? ocjena(active) : null);

  function handleClick(r) {
    selected = r.k;
    setTimeout(() => onSelect?.(r), 300);
  }
</script>

<div class="rp-wrap">
  <div class="rp-btns">
    {#each RATINGS as r (r.k)}
      <button
        class="rp-btn {selected === r.k ? 'rp-selected' : ''}"
        style="--rc: {r.color}"
        disabled={r.k > najvise}
        title={r.k > najvise ? "Previsoko za ovako riješenu lekciju" : null}
        onmouseenter={() => hovered = r.k}
        onmouseleave={() => hovered = null}
        onclick={() => handleClick(r)}
      >
        <span class="rp-name">{r.t}</span>
        <span class="rp-when">{subFor(r) ?? " "}</span>
      </button>
    {/each}
  </div>

  <div class="rp-desc rp-desc-visible">
    {#if activeR}
      <span class="rp-desc-name" style="color: {activeR.color}">{activeR.t}</span>
      <span class="rp-desc-text">{activeR.desc}</span>
    {:else}
      <span class="rp-desc-text">Što ti je bolje išlo, to se zadatak vraća kasnije.</span>
    {/if}
  </div>
</div>
