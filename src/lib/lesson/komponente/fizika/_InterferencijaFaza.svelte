<script>
  // Ploča faze (Youngov pokus): dva vala kako stižu u sondu P i njihov zbroj, uz razliku putova i razliku u fazi.
  // Sve vrijednosti dolaze iz sonda() u katalogu; ovdje se samo crtaju sinusoide (t je vrijeme u s).
  let { sn, boja = [226, 226, 234], t = 0 } = $props();

  const X0 = 64;
  const X1 = 236;
  const LP = 43; // valna duljina na ploči (px)
  const rgb = $derived(`rgb(${boja.join(" ")})`);
  function val(y0, A, faza) {
    const pts = [];
    for (let x = X0; x <= X1; x += 2) {
      const y =
        y0 -
        A *
          Math.sin(
            (2 * Math.PI * (x - X0)) / LP - 2 * Math.PI * 0.6 * t + faza,
          );
      pts.push(`${x},${Math.round(y * 10) / 10}`);
    }
    return pts.join(" ");
  }
  let v1 = $derived(val(18, 8, 0));
  let v2 = $derived(val(44, 8, -sn.fazaRad));
  // zbroj: sin θ + sin(θ − φ) = 2cos(φ/2)·sin(θ − φ/2)
  let vz = $derived(val(80, 16 * Math.cos(sn.fazaRad / 2), -sn.fazaRad / 2));
  const boje = {
    svijetla: "#86efac",
    tamna: "#fca5a5",
    djelomicno: "#fde68a",
  };
</script>

<svg
  class="iff"
  viewBox="0 0 360 104"
  role="img"
  aria-label="Valovi u točki P: razlika putova {sn.deltaTekst}, razlika u fazi {sn.faza}, {sn.opis}."
>
  <rect x="0" y="0" width="360" height="104" rx="10" class="iff-bg" />
  <text x="10" y="22" class="iff-t">iz S₁</text>
  <text x="10" y="48" class="iff-t">iz S₂</text>
  <text x="10" y="84" class="iff-t">zbroj</text>
  <line x1={X0} x2={X1} y1="18" y2="18" class="iff-os" />
  <line x1={X0} x2={X1} y1="44" y2="44" class="iff-os" />
  <line x1={X0} x2={X1} y1="80" y2="80" class="iff-os" />
  <polyline
    points={v1}
    fill="none"
    stroke={rgb}
    stroke-width="1.6"
    opacity="0.8"
  />
  <polyline
    points={v2}
    fill="none"
    stroke={rgb}
    stroke-width="1.6"
    opacity="0.8"
    stroke-dasharray="5 3"
  />
  <polyline points={vz} fill="none" stroke={rgb} stroke-width="2.6" />
  <line x1="248" x2="248" y1="10" y2="94" class="iff-os" />
  <text x="258" y="26" class="iff-v">Δ = {sn.deltaTekst}</text>
  <text x="258" y="48" class="iff-v">Δφ = {sn.faza}</text>
  <text x="258" y="70" class="iff-o" fill={boje[sn.vrsta]}
    >{sn.vrsta === "svijetla"
      ? "u fazi"
      : sn.vrsta === "tamna"
        ? "u protufazi"
        : "djelomično"}</text
  >
  <text x="258" y="88" class="iff-o" fill={boje[sn.vrsta]}
    >{sn.vrsta === "svijetla"
      ? "→ svijetlo"
      : sn.vrsta === "tamna"
        ? "→ tamno"
        : "→ polutama"}</text
  >
</svg>

<style>
  .iff {
    display: block;
    width: 100%;
    max-width: 440px;
    height: auto;
    margin: -4px auto 12px;
    user-select: none;
    -webkit-user-select: none;
  }
  .iff-bg {
    fill: #0e1117;
    stroke: var(--border);
  }
  .iff-t {
    fill: #94a3b8;
    font: 500 11px var(--font-sans);
  }
  .iff-os {
    stroke: #2b3343;
    stroke-width: 1;
  }
  .iff-v {
    fill: #e2e8f0;
    font: 600 12px var(--font-mono);
  }
  .iff-o {
    font: 600 11.5px var(--font-sans);
  }
</style>
