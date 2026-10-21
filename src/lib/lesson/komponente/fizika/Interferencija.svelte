<script>
  // Interferencija svjetlosti: Youngov pokus (sonda s razlikom putova i fazom, kaliperi, izračun) i optička rešetka
  // (kutomjer s maksimumima). Fizika, geometrija, provjera i „što je skriveno“ su u katalogu
  // (katalog/fizika/interferencija.js i _interferencija.js); ovdje je samo crtanje i unos.
  import { untrack, onMount } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import BrojUnos from "../BrojUnos.svelte";
  import Young from "./_InterferencijaYoung.svelte";
  import Resetka from "./_InterferencijaResetka.svelte";
  import Faza from "./_InterferencijaFaza.svelte";
  import Klizaci from "./_InterferencijaKlizaci.svelte";
  import {
    vidljivo,
    pitanja,
    izracun,
    tocnaPozicija,
    jedinicaIzmjeri,
    izmjeriStanje,
    najboljaVrijednost,
    vrijednostCilja,
    oznakaCilja,
    oznakeIzracuna,
    skupinaPruga,
    pocetniKaliperi,
    znanstvenoPolje,
    VELICINE,
  } from "$lib/lesson/katalog/fizika/interferencija.js";
  import {
    fizika,
    pocetneVrijednosti,
    klizaciOd,
    rasponYoung,
    sonda,
    lambdaRGB,
    NEUTRALNA,
    bojaIme,
    DULJINA,
    cm,
    fmt,
    fmtSci,
  } from "$lib/lesson/katalog/fizika/_interferencija.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const nacin = untrack(() => spec.nacin);
  const young = untrack(() => spec.vrsta === "young");
  const istrazi = nacin === "istrazi";

  let p = $state(untrack(() => pocetneVrijednosti(spec)));
  let f = $derived(fizika(spec, p));
  let otkriveno = $derived(pokazi || !!ishod?.tocno);
  let vid = $derived(vidljivo(spec, otkriveno));
  let boja = $derived(vid.boja ? lambdaRGB(f.lambdaNm) : NEUTRALNA);
  const Y = untrack(() => (young ? rasponYoung(spec) : 0));

  // ── animacija ──
  let t = $state(0);
  onMount(() => {
    let id;
    let zadnji = 0;
    const petlja = (now) => {
      if (!prefersReducedMotion.current) {
        const dt = Math.min(0.05, (now - (zadnji || now)) / 1000);
        t += dt;
      }
      zadnji = now;
      id = requestAnimationFrame(petlja);
    };
    id = requestAnimationFrame(petlja);
    return () => cancelAnimationFrame(id);
  });
  let animacija = $derived(!prefersReducedMotion.current);

  // ── sonda (istrazi, odaberi) ──
  let sondaY = $state(
    untrack(() => (istrazi && young ? fizika(spec).s : null)),
  );
  let poslanoY = $state(null);
  let sn = $derived(sondaY != null && young ? sonda(f, sondaY) : null);
  // odaberi: valovi u P vide se nakon provjere (za poslanu točku) ili kad je odgovor otkriven
  let provjerenaTocka = $derived(
    nacin === "odaberi" &&
      ishod &&
      !ishod.prazno &&
      poslanoY != null &&
      poslanoY === sondaY,
  );
  let detalji = $derived(
    istrazi || (nacin === "odaberi" && (otkriveno || provjerenaTocka)),
  );
  let vidSonde = $derived(
    nacin === "odaberi" && provjerenaTocka && !otkriveno
      ? { ...vid, delta: true, faza: true }
      : vid,
  );
  $effect(() => {
    if (!pokazi || nacin !== "odaberi") return;
    untrack(() => (sondaY = tocnaPozicija(spec)));
  });
  function provjeriOdaberi() {
    if (locked) return;
    poslanoY = sondaY;
    onodgovor({ y: sondaY });
  }

  // ── izmjeri ──
  let kaliperi = $state(nacin === "izmjeri" ? pocetniKaliperi() : null);
  let unosS = $state("");
  const Jm = untrack(() => (nacin === "izmjeri" ? jedinicaIzmjeri(spec) : ""));
  let mjerenje = $derived(
    kaliperi ? izmjeriStanje(spec, kaliperi.i1, kaliperi.i2) : null,
  );
  $effect(() => {
    if (!pokazi || nacin !== "izmjeri") return;
    untrack(() => {
      const g = skupinaPruga(spec);
      kaliperi = { i1: g.k1, i2: g.k2 };
      unosS = fmt(f.s / DULJINA[Jm]);
    });
  });

  // ── izracunaj ──
  const pit = untrack(() => pitanja(spec));
  let unosi = $state(pit.map(() => ""));
  let oznake = $derived(
    nacin === "izracunaj" ? oznakeIzracuna(spec, otkriveno) : null,
  );
  // polja se označe tek kad je odgovor točan ili otkriven: nakon krivog odgovora pojedino polje ne smije
  // odati je li baš ono krivo (zaključana kopija pitanja ostaje vidljiva iznad koraka pomoći)
  let stanjaPolja = $derived(pit.map(() => (otkriveno ? "ok" : null)));
  $effect(() => {
    if (!pokazi || nacin !== "izracunaj") return;
    untrack(
      () =>
        (unosi = pit.map((q) => {
          const r = izracun(spec, q);
          return Math.abs(r.vrijednost) < 1e-3 || Math.abs(r.vrijednost) >= 1e5
            ? fmtSci(r.vrijednost)
            : fmt(r.vrijednost);
        })),
    );
  });
  function provjeriIzracun(e) {
    e?.preventDefault();
    if (locked) return;
    onodgovor([...unosi]);
  }
  function potencija(i) {
    const v = unosi[i].trim();
    if (!/10\^/.test(v)) unosi[i] = `${v || "1"}·10^`;
  }
  const jedPolja = (q) => {
    const r = izracun(spec, q);
    return r.jedinica === "°" ? "°" : r.jedinica;
  };

  // ── postavi ──
  const klizac = untrack(() => klizaciOd(spec)[0]);
  let poslanaVr = $state(null);
  $effect(() => {
    if (!pokazi || nacin !== "postavi") return;
    untrack(() => (p = { ...p, [klizac.id]: najboljaVrijednost(spec) }));
  });
  let ciljVidljiv = $derived(
    nacin === "postavi" &&
      (otkriveno || (ishod && !ishod.prazno && poslanaVr === p[klizac?.id])),
  );
  function provjeriPostavi() {
    if (locked) return;
    poslanaVr = p[klizac.id];
    onodgovor({ ...p });
  }
  let vidPostavi = $derived(
    nacin === "postavi" && ciljVidljiv && young
      ? { ...vid, ravnalo: true, redovi: true }
      : nacin === "postavi" && ciljVidljiv
        ? { ...vid, stupnjevi: true, kutovi: true }
        : vid,
  );

  // ── očitanja ispod crteža ──
  let ocitanja = $derived.by(() => {
    const out = [];
    if (young) {
      if (istrazi && vid.razmak) out.push(["razmak pruga", `s = ${cm(f.s)}`]);
      if (nacin === "postavi" && ciljVidljiv)
        out.push([
          "razmak pruga",
          `s = ${cm(f.s)}`,
          otkriveno || ishod?.tocno ? "ok" : "bad",
        ]);
      if (nacin === "izmjeri" && mjerenje) {
        out.push(["obuhvaćeno", `${mjerenje.n} pruga`]);
        out.push(["izmjereno", `L = ${cm(mjerenje.L)}`]);
        if (otkriveno)
          out.push([
            "razmak",
            `${mjerenje.n - 1} razmaka · s = ${cm(f.s)}`,
            "ok",
          ]);
      }
      return out;
    }
    if (istrazi) {
      out.push(["konstanta", `d = ${fmt(f.dUm)} µm`]);
      out.push(["gustoća", `${fmt(f.zareza)} zareza/mm`]);
    }
    if (nacin === "postavi" && ciljVidljiv) {
      const a = vrijednostCilja(spec, p);
      out.push([
        "kut",
        `${oznakaCilja(spec)} = ${a == null ? "nema ga" : `${fmt(a)}°`}`,
        otkriveno || ishod?.tocno ? "ok" : "bad",
      ]);
    }
    return out;
  });

  // ── opis za čitače ekrana (ne odaje traženo) ──
  let opis = $derived.by(() => {
    if (young) {
      let o =
        "Youngov pokus: laser obasjava dvije pukotine, a na zastoru su naizmjence svijetle i tamne pruge.";
      if (vid.boja) o += ` Svjetlost je ${bojaIme(f.lambdaNm)}.`;
      if (sn && (vidSonde.delta || vidSonde.faza))
        o += ` Sonda P: razlika putova ${sn.deltaTekst}, razlika u fazi ${sn.faza}, ${sn.opis}.`;
      return o;
    }
    let o =
      "Optička rešetka: laser pada okomito na rešetku, a na kutomjeru su svijetli maksimumi redova 0, ±1, ±2…";
    if (vid.boja) o += ` Svjetlost je ${bojaIme(f.lambdaNm)}.`;
    if (vidPostavi.kutovi)
      o += ` Kutovi: ${f.redovi
        .filter((r) => r.k > 0)
        .slice(0, 6)
        .map((r) => `${r.k}. red ${fmt(r.alpha)}°`)
        .join(", ")}.`;
    return o;
  });

  const uputa = untrack(() => {
    if (nacin === "odaberi")
      return "Dodirni zastor (ili povuci sondu P), pa klikni Provjeri.";
    if (nacin === "izmjeri")
      return `Povuci ručke kalipera na prvu i zadnju od ${spec.pruge.N} svijetlih pruga, pa upiši razmak dviju susjednih pruga.`;
    if (nacin === "postavi")
      return `Pomakni klizač, pa klikni Provjeri. ${spec.cilj.velicina === "s" ? "Razmak pruga" : "Kut"} se vidi tek nakon provjere.`;
    return "";
  });
  const ciljTekst = untrack(() =>
    nacin === "postavi" && !young
      ? `cilj: ${oznakaCilja(spec)} = ${fmt(spec.cilj.vrijednost)}°`
      : null,
  );
</script>

{#if istrazi}
  <div class="if-tekst"><Md text={spec.tekst} /></div>
{:else}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{/if}

<figure class="lx-figure if-fig">
  {#if young}
    <Young
      {f}
      {Y}
      vid={nacin === "postavi" ? vidPostavi : vidSonde}
      {boja}
      {t}
      {animacija}
      bind:sondaY
      sondaAktivna={istrazi || (nacin === "odaberi" && !locked && !pokazi)}
      magnet={istrazi}
      {detalji}
      bind:kaliperi
      kaliperiAktivni={nacin === "izmjeri" && !locked && !pokazi}
      razmaci={nacin === "izmjeri" && otkriveno}
      skupina={nacin === "izracunaj" && spec.pruge ? skupinaPruga(spec) : null}
      {oznake}
      {opis}
    />
  {:else}
    <Resetka
      {f}
      vid={vidPostavi}
      {boja}
      {t}
      {animacija}
      {oznake}
      cilj={ciljTekst}
      {opis}
    />
  {/if}
</figure>

{#if young && sn && (vidSonde.faza || vidSonde.delta) && vid.sonda}
  <Faza {sn} {boja} t={animacija ? t : 0} />
{/if}

{#if ocitanja.length}
  <div class="if-ocitanja" aria-live="polite">
    {#each ocitanja as [naziv, tekst, stanje] (naziv)}
      <span
        class="if-chip"
        class:ok={stanje === "ok"}
        class:bad={stanje === "bad"}
        ><span class="if-chip-n">{naziv}</span> <b>{tekst}</b></span
      >
    {/each}
  </div>
{/if}

{#if uputa && !locked && !pokazi}
  <p class="if-uputa">{uputa}</p>
{/if}

{#if istrazi || nacin === "postavi"}
  <Klizaci
    {spec}
    bind:vrijednosti={p}
    disabled={nacin === "postavi" && (locked || pokazi)}
  />
{/if}

{#if nacin === "odaberi"}
  <div class="lx-actions if-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriOdaberi}
      disabled={locked || sondaY == null}>Provjeri</button
    >
  </div>
{:else if nacin === "postavi"}
  <div class="lx-actions if-akcije">
    <button
      type="button"
      class="btn btn-primary"
      onclick={provjeriPostavi}
      disabled={locked}>Provjeri</button
    >
  </div>
{:else if nacin === "izmjeri"}
  <div class="if-polje">
    <span class="if-oznaka"><b>s</b> = </span>
    <BrojUnos
      jedinica={Jm}
      {locked}
      {ishod}
      bind:vrijednost={unosS}
      oznaka="Razmak susjednih pruga s u {Jm}"
      onodgovor={(v) => onodgovor({ s: v, i1: kaliperi.i1, i2: kaliperi.i2 })}
    />
  </div>
{:else if nacin === "izracunaj"}
  <form class="if-izr" onsubmit={provjeriIzracun}>
    {#each pit as q, i (i)}
      {@const m = VELICINE[spec.vrsta][q.velicina]}
      {@const r = izracun(spec, q)}
      <div class="if-red">
        <label for="if-{i}-{spec.vrsta}" class="if-naziv">{m.naziv}</label>
        <div class="lx-broj">
          <span class="if-oznaka"><b>{r.oznaka}</b> =</span>
          <input
            id="if-{i}-{spec.vrsta}"
            class="inp lx-broj-inp"
            class:ok={stanjaPolja[i] === "ok"}
            class:bad={stanjaPolja[i] === "bad"}
            inputmode="decimal"
            autocomplete="off"
            placeholder="?"
            disabled={locked}
            aria-label="{m.naziv} ({r.oznaka})"
            bind:value={unosi[i]}
          />
          {#if jedPolja(q)}<span class="lx-unit">{jedPolja(q)}</span>{/if}
          {#if m.iza}<span class="lx-unit">{m.iza}</span>{/if}
          {#if !locked && znanstvenoPolje(spec, q)}
            <button
              type="button"
              class="btn btn-quiet if-pot"
              onclick={() => potencija(i)}
              aria-label="Dodaj potenciju broja 10">·10ⁿ</button
            >
          {/if}
        </div>
      </div>
    {/each}
    <div class="lx-actions">
      <button
        class="btn btn-primary"
        type="submit"
        disabled={locked || unosi.some((u) => !u.trim())}>Provjeri</button
      >
    </div>
  </form>
{/if}

<style>
  .if-tekst {
    margin-bottom: 10px;
  }
  .if-fig {
    max-width: 440px;
    margin-bottom: 10px;
  }
  .if-ocitanja {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin: 0 auto 10px;
    max-width: 440px;
  }
  .if-chip {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    font-size: 13px;
    color: var(--text-dim);
  }
  .if-chip b {
    font-family: var(--font-mono);
    color: var(--text);
  }
  .if-chip.ok {
    border-color: var(--lx-ok);
    background: color-mix(in srgb, var(--lx-ok) 10%, transparent);
  }
  .if-chip.bad {
    border-color: var(--lx-bad);
    background: color-mix(in srgb, var(--lx-bad) 8%, transparent);
  }
  .if-chip-n {
    font-size: 12px;
  }
  .if-uputa {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    margin: 0 0 8px;
  }
  .if-akcije {
    justify-content: center;
  }
  .if-polje {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .if-izr {
    display: grid;
    gap: 10px;
  }
  .if-red {
    display: grid;
    gap: 4px;
  }
  .if-oznaka {
    font-size: 14px;
    color: var(--text);
  }
  .if-oznaka b {
    font-family: var(--font-serif, serif);
    font-style: italic;
    font-size: 16px;
  }
  .if-naziv {
    font-size: 13.5px;
    color: var(--text-dim);
  }
  .if-pot {
    min-width: 44px;
    min-height: 36px;
    font-family: var(--font-mono);
  }
  .if-izr .lx-actions {
    margin-top: 2px;
  }
</style>
