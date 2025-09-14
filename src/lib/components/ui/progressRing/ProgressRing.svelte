<script>
  import * as progress from "@zag-js/progress";
  import { normalizeProps, useMachine } from "@zag-js/svelte";

  const {
    label,
    showLabel = false,
    strokeWidth = "10px",
    strokeLinecap = "round",
    // Root
    base = "relative",
    size = "size-32",
    classes = "",
    // Slot
    childrenBase = "absolute top-0 left-0 z-[1] flex justify-center items-center",
    childrenClasses = "",
    // SVG
    svgBase = "absolute top-0 left-0 size-full rounded-full",
    svgClasses = "",
    // Track
    trackBase = "fill-none",
    trackStroke = "stroke-[color:var(--border)]",
    trackClasses = "",
    // Meter
    meterBase = "fill-none",
    meterStroke = "stroke-[color:var(--primary)]",
    meterTransition = "transition-[stroke-dashoffset] transition-[stroke-dashoffset]",
    meterAnimate = "animate-ring-indeterminate",
    meterDuration = "duration-200",
    meterClasses = "",
    // Label
    labelBase = "",
    labelFill = "fill-[color:var(--foreground)]",
    labelFontSize = 24, // px
    labelFontWeight = "bold",
    labelClasses = "",
    // Snippets
    children,
    // Zag
    ...zagProps
  } = $props();

  // Zag
  const id = $props.id();
  const service = useMachine(progress.machine, () => ({
    id: id,
    ...zagProps,
  }));
  const api = $derived(progress.connect(service, normalizeProps));
  console.log(size);
  // Reactive Classes
  const rxAnimCircle = $derived(api.indeterminate ? "animate-spin" : "");
  const rxAnimMeter = $derived(api.indeterminate ? meterAnimate : "");
</script>

<!-- @component A circular progress bar. -->

<figure
  {...api.getRootProps()}
  class="{base} {size} {classes}"
  data-testid="progress-ring"
>
  <!-- Children -->
  <div
    {...api.getLabelProps()}
    class="{childrenBase} {size} {childrenClasses}"
    data-testid="progress-ring-children"
  >
    {@render children?.()}
  </div>
  <!-- SVG -->
  <svg
    {...api.getCircleProps()}
    viewBox="0 0 100 100"
    class="{svgBase} {svgClasses} {rxAnimCircle}"
    style="--size:100px;--thickness:{strokeWidth};"
    data-testid="progress-ring-svg"
  >
    <!-- Track -->
    <circle
      {...api.getCircleTrackProps()}
      class="{trackBase} {trackStroke} {trackClasses}"
      data-testid="progress-ring-track"
    />
    <!-- Meter -->
    <circle
      {...api.getCircleRangeProps()}
      class="{meterBase} {meterStroke} {meterTransition} {meterDuration} {meterClasses} {rxAnimMeter}"
      stroke-linecap={strokeLinecap}
      data-testid="progress-ring-meter"
    />
    <!-- Label -->
    {#if api.value !== null && !children && showLabel}
      <text
        class="{labelBase} {labelFill} {labelClasses}"
        x="50%"
        y="45%"
        font-size={labelFontSize}
        font-weight={labelFontWeight}
        text-anchor="middle"
        dominant-baseline="central"
        data-testid="progress-label"
      >
        {Math.round(api.value)}%
      </text>
      <text
        class="{labelBase} {labelFill} {labelClasses}"
        x="50%"
        y="62%"
        font-size={10}
        font-weight={labelFontWeight}
        text-anchor="middle"
        dominant-baseline="central"
        data-testid="progress-label"
      >
        {label}
      </text>
    {/if}
  </svg>
</figure>
