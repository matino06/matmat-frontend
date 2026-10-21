<script>
  // The walkthrough's spotlight: dims the app except the elements the current step
  // marks (data-tour), and a bubble beside them says what to look at or do. Steps
  // that wait for an action leave the spotlit element clickable; the rest of the
  // page can't be clicked until the walkthrough ends.
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { userData } from "$lib/store/user.svelte";
  import { uiState } from "$lib/store/ui.svelte";
  import { courseState, courseLabel } from "$lib/store/course.svelte";
  import { uvod, sljedeciKorak, uvodDogadaj, zavrsiUvod, pokreniUvod } from "$lib/store/uvod.svelte";
  import { KORACI } from "$lib/uvod/koraci";
  import { DANA_DO_ISPITA, lekcijeNakon } from "$lib/uvod/scenarij";

  const PAD = 6;
  const GAP = 12;

  let korak = $derived(KORACI[uvod.korak]);
  let path = $derived(page.url.pathname);

  const ispit = new Date(Date.now() + DANA_DO_ISPITA * 86400000);
  const datum = ispit.toLocaleDateString("hr-HR", { weekday: "long", day: "numeric", month: "numeric" });
  let tekst = $derived(korak?.tekst({ datum, lekcije: lekcijeNakon(uvod.ocjene) }) ?? "");
  let cilj = $derived(userData.user ? (courseLabel(courseState.courseId) ?? "svoj predmet") : null);

  $effect(() => {
    if (korak?.ceka?.startsWith("put:")) uvodDogadaj(`put:${path}`);
  });

  let vw = $state(1024);
  let vh = $state(768);
  // On a phone the nav sits in the closed slide-over, so its step points at the menu button first.
  let selektor = $derived(
    korak?.meta.startsWith("nav-") && vw < 768 && !uiState.sidebarOpen
      ? '[data-tour="izbornik"]'
      : `[data-tour="${korak?.meta}"]`
  );

  // The spotlit area: all marked elements together, followed every frame (pages scroll and grow).
  let rect = $state(null);
  $effect(() => {
    const sel = selektor;
    let raf;
    let skrolano = false;
    const prati = () => {
      const els = [...document.querySelectorAll(sel)];
      const rs = els.map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.height);
      if (!rs.length) {
        rect = null;
      } else {
        const r = {
          top: Math.min(...rs.map((x) => x.top)) - PAD,
          left: Math.min(...rs.map((x) => x.left)) - PAD,
          bottom: Math.max(...rs.map((x) => x.bottom)) + PAD,
          right: Math.max(...rs.map((x) => x.right)) + PAD,
        };
        if (!skrolano) {
          skrolano = true;
          if (r.top < 0 || r.bottom > window.innerHeight) els[0].scrollIntoView({ block: "center", behavior: "smooth" });
        }
        if (!rect || ["top", "left", "bottom", "right"].some((k) => Math.abs(rect[k] - r[k]) > 0.5)) rect = r;
      }
      raf = requestAnimationFrame(prati);
    };
    raf = requestAnimationFrame(prati);
    return () => cancelAnimationFrame(raf);
  });

  let visina = $state(0);
  let poz = $derived.by(() => {
    if (!rect) return null;
    const w = Math.min(340, vw - 24);
    const h = visina || 160;
    const stane = (top) => top >= 12 && top + h <= vh - 12;
    // Beside the sidebar on a wide screen, so the nav stays visible.
    if (korak.meta.startsWith("nav-") && rect.right + GAP + w <= vw - 12) {
      const top = Math.min(Math.max(12, (rect.top + rect.bottom) / 2 - h / 2), vh - h - 12);
      return { top, left: rect.right + GAP, w };
    }
    const left = Math.min(Math.max(12, (rect.left + rect.right) / 2 - w / 2), vw - w - 12);
    const ispod = rect.bottom + GAP;
    const iznad = rect.top - GAP - h;
    const redom = korak.strana === "iznad" ? [iznad, ispod] : [ispod, iznad];
    const top = redom.find(stane);
    // No room beside a tall element (an interactive lesson on a phone): over its bottom edge.
    return top == null ? { top: vh - h - 12, left, w, prekriva: true } : { top, left, w };
  });

  // A bubble over the element it points at steps aside once the student starts on it
  // (the lesson grows under it); "Uputa" brings it back.
  let zapoceo = $state(false);
  let vracen = $state(false);
  $effect(() => {
    uvod.korak;
    zapoceo = vracen = false;
  });
  let sklonjen = $derived(zapoceo && !vracen && !!poz?.prekriva);
  function onPointerDown(e) {
    if (!korak?.ceka || e.target.closest(".uv-oblak, .uv-uputa")) return;
    if ([...document.querySelectorAll(selektor)].some((el) => el.contains(e.target))) {
      zapoceo = true;
      vracen = false;
    }
  }

  function preskoci() {
    zavrsiUvod(true);
    goto(userData.user ? "/tasks" : "/");
  }

  function kreni() {
    zavrsiUvod(false);
    goto(userData.user ? "/tasks" : "/");
  }

  function ponovi() {
    pokreniUvod();
  }
</script>

<svelte:window bind:innerWidth={vw} bind:innerHeight={vh} onpointerdowncapture={onPointerDown} />

{#if korak}
  {#if rect}
    <div
      class="uv-rupa"
      style="top:{rect.top}px;left:{rect.left}px;width:{rect.right - rect.left}px;height:{rect.bottom - rect.top}px"
    ></div>
    <!-- clicks only reach the spotlit element, and only when the step waits for them -->
    <div class="uv-blok" style="top:0;left:0;right:0;height:{Math.max(0, rect.top)}px"></div>
    <div class="uv-blok" style="top:{rect.bottom}px;left:0;right:0;bottom:0"></div>
    <div class="uv-blok" style="top:{rect.top}px;left:0;width:{Math.max(0, rect.left)}px;height:{rect.bottom - rect.top}px"></div>
    <div class="uv-blok" style="top:{rect.top}px;left:{rect.right}px;right:0;height:{rect.bottom - rect.top}px"></div>
    {#if !korak.ceka}
      <div class="uv-blok" style="top:{rect.top}px;left:{rect.left}px;width:{rect.right - rect.left}px;height:{rect.bottom - rect.top}px"></div>
    {/if}
  {:else}
    <div class="uv-blok uv-tamno"></div>
  {/if}

  {#if poz && sklonjen}
    <button class="btn btn-ghost uv-uputa" onclick={() => (vracen = true)}>Uputa</button>
  {:else if poz}
    {#key uvod.korak}
      <div
        class="uv-oblak"
        role="dialog"
        aria-label={korak.naslov}
        style="top:{poz.top}px;left:{poz.left}px;width:{poz.w}px"
        bind:offsetHeight={visina}
      >
        <div class="uv-top">
          <span class="uv-tocke" aria-label="Korak {uvod.korak + 1} od {KORACI.length}">
            {#each KORACI as _, i (i)}<span class:gotov={i <= uvod.korak}></span>{/each}
          </span>
          {#if !korak.zadnji}<button class="uv-preskoci" onclick={preskoci}>Preskoči uvod</button>{/if}
        </div>
        <h3>{korak.naslov}</h3>
        <p>{tekst}</p>
        {#if korak.zadnji}
          <div class="uv-gumbi">
            <button class="btn btn-ghost" onclick={ponovi}>Ponovi</button>
            <!-- svelte-ignore a11y_autofocus -->
            <button class="btn btn-primary" onclick={kreni} autofocus>
              {cilj ? `Kreni na ${cilj} →` : "Prijavi se i kreni →"}
            </button>
          </div>
        {:else if !korak.ceka}
          <div class="uv-gumbi">
            <!-- svelte-ignore a11y_autofocus -->
            <button class="btn btn-primary" onclick={sljedeciKorak} autofocus>Dalje</button>
          </div>
        {/if}
      </div>
    {/key}
  {/if}
{/if}

<style>
  .uv-rupa {
    position: fixed;
    z-index: 1100;
    border-radius: 12px;
    box-shadow: 0 0 0 2px var(--primary), 0 0 0 200vmax rgba(0, 0, 0, 0.55);
    pointer-events: none;
    transition: top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease;
  }
  .uv-blok {
    position: fixed;
    z-index: 1101;
  }
  .uv-tamno {
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
  }
  .uv-uputa {
    position: fixed;
    z-index: 1102;
    right: 12px;
    bottom: 12px;
    background: var(--bg-elev);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  }
  .uv-oblak {
    position: fixed;
    z-index: 1102;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px 16px 16px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
    animation: uv-in 0.2s ease;
  }
  @keyframes uv-in {
    from { opacity: 0; transform: translateY(6px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .uv-oblak { animation: none; }
    .uv-rupa { transition: none; }
  }
  .uv-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .uv-tocke {
    display: flex;
    gap: 4px;
  }
  .uv-tocke span {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--border-strong);
  }
  .uv-tocke span.gotov { background: var(--primary); }
  .uv-preskoci {
    font-size: 12px;
    color: var(--text-faint);
    background: none;
    border: 0;
    cursor: pointer;
    padding: 2px 0;
  }
  .uv-preskoci:hover { color: var(--text); }
  h3 {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 600;
  }
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-dim);
  }
  .uv-gumbi {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 14px;
  }
</style>
