<script>
  // Illustration for /kako-radi: how much of a topic you still know over 30 days,
  // once without reviewing and once with reviews spaced like MatMat's FSRS for an
  // outcome rated "Dobro" each time (2 and 11 days after the previous one).
  // Exponential forgetting where each review brings it back to 100% and makes the
  // next drop slower. Not measured data.

  const DAYS = 30;
  const REVIEWS = [2, 13];
  // How slowly it fades (days) before the first review and after each one.
  const STABILITY = [3, 10, 30];

  function withReviews(t) {
    let i = 0;
    while (i < REVIEWS.length && REVIEWS[i] <= t) i++;
    const last = i === 0 ? 0 : REVIEWS[i - 1];
    return Math.exp(-(t - last) / STABILITY[i]);
  }
  const without = (t) => Math.exp(-t / STABILITY[0]);

  const SERIES = [
    { id: "mm", label: "S MatMatom", color: "#7c80f5", fn: withReviews },
    { id: "none", label: "Bez ponavljanja", color: "#d4742e", fn: without },
  ];

  // Drawn at the plot's real width, so the axis text stays its set size on a
  // phone instead of shrinking with a scaled-down SVG.
  let cw = $state(720);
  let W = $derived(Math.max(300, Math.round(cw)));
  let H = $derived(W < 520 ? 240 : 300);
  const PAD = { l: 44, r: 16, t: 34, b: 34 };
  const x = (d) => PAD.l + (d / DAYS) * (W - PAD.l - PAD.r);
  const y = (r) => PAD.t + (1 - r) * (H - PAD.t - PAD.b);

  // Sampled finely, with the instant before each review so the jump back up is vertical.
  const samples = [];
  for (let d = 0; d <= DAYS; d += 0.1) samples.push(+d.toFixed(1));
  for (const r of REVIEWS) samples.push(r - 0.001);
  samples.sort((a, b) => a - b);

  function path(fn) {
    return samples.map((d, i) => `${i ? "L" : "M"}${x(d).toFixed(1)} ${y(fn(d)).toFixed(1)}`).join(" ");
  }
  let lines = $derived(SERIES.map((s) => ({ ...s, d: path(s.fn) })));
  let area = $derived(`${lines[0].d} L${x(DAYS)} ${y(0)} L${x(0)} ${y(0)} Z`);
  // On a narrow plot every other day label would collide.
  let ticks = $derived(W < 520 ? [0, 10, 20, 30] : [0, 5, 10, 15, 20, 25, 30]);

  const pct = (r) => `${Math.round(r * 100)}%`;
  const GAPS = REVIEWS.map((r, i) => r - (i ? REVIEWS[i - 1] : 0));

  // Hover: a crosshair at the nearest half day with both values.
  let hover = $state(null);
  let svgEl = $state();
  function onMove(e) {
    const box = svgEl.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const day = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * DAYS * 2) / 2;
    hover = day < 0 || day > DAYS ? null : { day, left: (x(day) / W) * 100 };
  }
</script>

<figure class="fc">
  <div class="fc-legend">
    {#each SERIES as s (s.id)}
      <span class="fc-key"><span class="fc-swatch" style="background:{s.color}"></span>{s.label}</span>
    {/each}
  </div>

  <div class="fc-plot" bind:clientWidth={cw}>
    <svg
      bind:this={svgEl}
      viewBox="0 0 {W} {H}"
      role="img"
      aria-label="Koliko gradiva pamtiš kroz 30 dana: bez ponavljanja pada gotovo na nulu u desetak dana, s ponavljanjima u danima 2 i 13 ostaje iznad pola."
      onpointermove={onMove}
      onpointerleave={() => (hover = null)}
    >
      {#each [0, 0.5, 1] as g (g)}
        <line class="fc-grid" x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} />
        <text class="fc-tick" x={PAD.l - 8} y={y(g) + 4} text-anchor="end">{pct(g)}</text>
      {/each}
      {#each ticks as d (d)}
        <text class="fc-tick" x={x(d)} y={H - 10} text-anchor="middle">{d === 0 ? "dan 0" : d}</text>
      {/each}

      <path d={area} fill="#7c80f5" opacity="0.1" />
      {#each lines as l (l.id)}
        <path d={l.d} fill="none" stroke={l.color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      {/each}

      {#each REVIEWS as r, i (r)}
        <circle cx={x(r)} cy={y(1)} r="4.5" fill="#7c80f5" stroke="var(--bg)" stroke-width="2" />
        <text class="fc-note" x={x(r)} y={y(1) - 12} text-anchor="middle">+{GAPS[i]}{W < 520 ? "" : GAPS[i] === 1 ? " dan" : " dana"}</text>
      {/each}

      <text class="fc-label" x={x(6.2)} y={y(0.2)}>Bez ponavljanja</text>

      {#if hover}
        <line class="fc-cross" x1={x(hover.day)} x2={x(hover.day)} y1={PAD.t} y2={y(0)} />
        {#each lines as l (l.id)}
          <circle cx={x(hover.day)} cy={y(l.fn(hover.day))} r="4.5" fill={l.color} stroke="var(--bg)" stroke-width="2" />
        {/each}
      {/if}
    </svg>

    {#if hover}
      <div class="fc-tip" style="left:{hover.left}%" class:flip={hover.left > 70}>
        <div class="fc-tip-day">Dan {String(hover.day).replace(".", ",")}</div>
        {#each SERIES as s (s.id)}
          <div class="fc-tip-row"><span class="fc-swatch" style="background:{s.color}"></span>{s.label}<b>{pct(s.fn(hover.day))}</b></div>
        {/each}
      </div>
    {/if}
  </div>

  <figcaption>Ilustracija, ne izmjereni podaci. Svako ponavljanje vraća gradivo i usporava sljedeći pad, pa razmak do idućeg ponavljanja može biti dulji.</figcaption>

  <table class="sr-only">
    <caption>Koliko gradiva pamtiš, po danima</caption>
    <thead><tr><th>Dan</th><th>S MatMatom</th><th>Bez ponavljanja</th></tr></thead>
    <tbody>
      {#each [0, 1, 7, 15, 22, 30] as d (d)}
        <tr><td>{d}</td><td>{pct(withReviews(d))}</td><td>{pct(without(d))}</td></tr>
      {/each}
    </tbody>
  </table>
</figure>

<style>
  .fc { margin: 0; }
  .fc-legend { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 14px; font-size: 13px; color: var(--text-dim); }
  .fc-key { display: inline-flex; align-items: center; gap: 8px; }
  .fc-swatch { width: 14px; height: 3px; border-radius: 2px; flex-shrink: 0; }
  .fc-plot { position: relative; }
  svg { display: block; width: 100%; height: auto; overflow: visible; touch-action: pan-y; }
  .fc-grid { stroke: var(--border); stroke-width: 1; }
  .fc-cross { stroke: var(--border-strong); stroke-width: 1; }
  .fc-tick { fill: var(--text-faint); font-size: 11px; font-family: var(--font-mono); }
  .fc-note { fill: var(--text-dim); font-size: 11px; font-family: var(--font-mono); }
  .fc-label { fill: var(--text-dim); font-size: 12px; }
  .fc-tip {
    position: absolute;
    top: 8px;
    transform: translateX(12px);
    min-width: 170px;
    padding: 10px 12px;
    border-radius: var(--r-md);
    border: 1px solid var(--border-strong);
    background: var(--bg-elev-2);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
    font-size: 12.5px;
    color: var(--text-dim);
    pointer-events: none;
  }
  .fc-tip.flip { transform: translateX(calc(-100% - 12px)); }
  .fc-tip-day { color: var(--text); font-weight: 500; margin-bottom: 6px; }
  .fc-tip-row { display: flex; align-items: center; gap: 8px; }
  .fc-tip-row b { margin-left: auto; padding-left: 12px; color: var(--text); font-family: var(--font-mono); font-weight: 500; }
  figcaption { margin-top: 12px; font-size: 13px; color: var(--text-faint); line-height: 1.5; }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
</style>
