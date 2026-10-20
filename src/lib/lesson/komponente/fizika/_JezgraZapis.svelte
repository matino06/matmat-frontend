<script>
  // Zapis ᴬ_Z X u SVG-u: maseni broj gore lijevo, redni dolje lijevo, simbol desno. (x, y) je sredina osnovice.
  // zapis = {gore, dolje, simbol} iz kataloga; skriveno = upitnici umjesto brojeva i simbola.
  let { zapis, x = 0, y = 0, vel = 16, klasa = "", opacity = 1 } = $props();
  const r1 = (n) => Math.round(n * 10) / 10;
  let mali = $derived(vel * 0.58);
  let ws = $derived(zapis.simbol.length * vel * 0.6);
  let wi = $derived(
    Math.max(zapis.gore.length, zapis.dolje.length) * mali * 0.58,
  );
  let x0 = $derived(x - (ws + wi + 1) / 2 + wi);
</script>

<g class="jzz {klasa}" {opacity} aria-hidden="true">
  <text
    class="jzz-i"
    x={r1(x0)}
    y={r1(y - vel * 0.52)}
    text-anchor="end"
    font-size={r1(mali)}>{zapis.gore}</text
  >
  <text
    class="jzz-i"
    x={r1(x0)}
    y={r1(y + mali * 0.32)}
    text-anchor="end"
    font-size={r1(mali)}>{zapis.dolje}</text
  >
  <text class="jzz-s" x={r1(x0 + 1)} y={r1(y)} font-size={r1(vel)}
    >{zapis.simbol}</text
  >
</g>

<style>
  .jzz-i {
    fill: var(--text-dim);
    font-family: var(--font-sans);
    font-weight: 600;
  }
  .jzz-s {
    fill: var(--text);
    font-family: var(--font-sans);
    font-weight: 700;
  }
  .jzz.istaknut .jzz-s {
    fill: var(--success);
  }
</style>
