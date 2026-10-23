<script>
  // Kemijska formula s pravim indeksima i nabojem: „SO₄²⁻“ ili „SO4^2-“ → S O <sub>4</sub><sup>2−</sup>. Zajednička
  // za sve kemijske widgete (Unicode indeksi u monospace fontu se loše vide).
  let { f = "" } = $props();

  const SUB = "₀₁₂₃₄₅₆₇₈₉";
  const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "−" };
  function dijelovi(x) {
    const out = [];
    for (const ch of String(x)) {
      const v = SUB.includes(ch) ? "sub" : ch in SUP ? "sup" : "t";
      const z = v === "sub" ? String(SUB.indexOf(ch)) : v === "sup" ? SUP[ch] : ch;
      const zadnji = out[out.length - 1];
      if (zadnji?.v === v) zadnji.z += z;
      else out.push({ v, z });
    }
    return out;
  }
  const d = $derived(dijelovi(f));
</script>

<span class="kf">{#each d as x, k (k)}{#if x.v === "sub"}<sub>{x.z}</sub>{:else if x.v === "sup"}<sup>{x.z}</sup>{:else}{x.z}{/if}{/each}</span>

<style>
  .kf {
    white-space: nowrap;
  }
  .kf sub {
    font-size: 0.68em;
    vertical-align: -0.3em;
    line-height: 0;
  }
  .kf sup {
    font-size: 0.68em;
    vertical-align: 0.55em;
    line-height: 0;
  }
</style>
