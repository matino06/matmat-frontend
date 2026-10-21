<script>
  // Sudar na pruzi: animacija, strelice brzina, količine gibanja prije/poslije (zbrajanje strelica na brojevnom
  // pravcu), stupci kinetičke energije s gubitkom u toplinu i impuls sile F–t. Sve vrijednosti dolaze iz kataloga
  // (sudarIshod), pa crtež i provjera uvijek kažu isto. Pozitivan smjer je udesno.
  import { untrack } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import Md from "../Md.svelte";
  import {
    sudarIshod,
    sudarProblem,
    sudarSaKlizacima,
    klizacPocetak,
    sudarTijeloPitanja,
    sudarOdgovor,
    SUDAR_VELICINE,
    JEDINICE_MASE,
  } from "$lib/lesson/katalog/fizika/sudar.js";
  import { formatNumber, formatSci } from "$lib/lesson/core/number.js";

  let {
    spec,
    locked = false,
    pokazi = false,
    ishod = null,
    onodgovor = () => {},
  } = $props();

  const uid = Math.random().toString(36).slice(2, 8);

  // vremenska crta animacije (s): prilazak, dodir (usporeno), nakon sudara
  const TB = 1.1;
  const TC = 0.4;
  const TA = 1.6;
  const TOTAL = TB + TC + TA;
  // scena u koordinatama viewBoxa; širina 360 da na mobitelu crtež bude ≈ 1:1
  const W = 360;
  const TLO = 102;
  const ZID = 334;
  const VMAX_PX = 150; // najbrže tijelo prijeđe najviše toliko piksela u sekundi

  const OBLIK = {
    vagon: { w: 76, h: 40 },
    kolica: { w: 62, h: 32 },
    kutija: { w: 46, h: 40 },
    auto: { w: 70, h: 34 },
    kugla: { w: 34, h: 34 },
    lopta: { w: 34, h: 34 },
    puska: { w: 96, h: 20 },
    metak: { w: 18, h: 8 },
  };
  const VRSTA_NAZIV = {
    elasticni: "elastični",
    neelasticni: "neelastični",
    savrseno_neelasticni: "spoje se",
  };
  const KLIZ = {
    m1: (s) => ({
      oznaka: `masa ${ime(s, 0)}`,
      jedinica: s.tijela[0]?.jedinica ?? "kg",
    }),
    m2: (s) => ({
      oznaka: `masa ${ime(s, 1)}`,
      jedinica: s.tijela[1]?.jedinica ?? "kg",
    }),
    v1: (s) => ({ oznaka: `brzina ${ime(s, 0)}`, jedinica: "m/s" }),
    v2: (s) => ({ oznaka: `brzina ${ime(s, 1)}`, jedinica: "m/s" }),
    vp: (s) => ({
      oznaka: `brzina poslije: ${ime(
        s,
        s.tijela.findIndex((b) => b.v_poslije != null),
      )}`,
      jedinica: "m/s",
    }),
    e: () => ({ oznaka: "koeficijent sudara e", jedinica: "" }),
  };
  const ime = (s, i) => s.tijela[i]?.oznaka ?? `tijelo ${i + 1}`;

  let nacin = $derived(spec.nacin);
  let pitanje = $derived(nacin === "predvidi");
  let zid = $derived(!!spec.zid);
  let prikazi = $derived(
    spec.prikazi ?? ["p", "Ek", ...(spec.trajanje != null ? ["F"] : [])],
  );

  // ── klizači (istraživanje) i trajanje udara ──
  let klizaci = $derived(
    nacin === "istrazi"
      ? (spec.klizaci ?? []).filter((k) => k.id !== "dt")
      : [],
  );
  let vals = $state(
    untrack(() =>
      Object.fromEntries(
        (spec.klizaci ?? [])
          .filter((k) => k.id !== "dt")
          .map((k) => [k.id, klizacPocetak(spec, k.id)]),
      ),
    ),
  );
  let vrstaSel = $state(untrack(() => spec.vrsta));
  let dtVal = $state(untrack(() => spec.trajanje ?? null));
  let dtRaspon = $derived.by(() => {
    const k = (spec.klizaci ?? []).find((x) => x.id === "dt");
    if (k) return { min: k.min, max: k.max, korak: k.korak };
    const t = spec.trajanje ?? 1;
    return { min: t / 4, max: t * 10, korak: t / 4 };
  });

  let eff = $derived(
    sudarSaKlizacima(spec, { ...vals, dt: dtVal ?? undefined }, vrstaSel),
  );
  let problem = $derived(sudarProblem(eff));
  let R = $derived(problem ? null : sudarIshod(eff));
  let tijela = $derived(eff.tijela);

  // ── animacija ──
  let t = $state(0);
  let igra = $state(false);
  let raf = 0;
  function pusti() {
    if (!R) return;
    cancelAnimationFrame(raf);
    if (prefersReducedMotion.current) {
      t = TOTAL;
      igra = false;
      return;
    }
    t = 0;
    igra = true;
    let last = performance.now();
    const korak = (now) => {
      t = Math.min(TOTAL, t + (now - last) / 1000);
      last = now;
      if (t < TOTAL) raf = requestAnimationFrame(korak);
      else igra = false;
    };
    raf = requestAnimationFrame(korak);
  }
  function natrag() {
    cancelAnimationFrame(raf);
    igra = false;
    t = 0;
  }
  $effect(() => () => cancelAnimationFrame(raf));

  // ── predviđanje ──
  let velicina = $derived(
    pitanje ? SUDAR_VELICINE[spec.pitaj?.velicina] : null,
  );
  let qTijelo = $derived(pitanje ? sudarTijeloPitanja(spec) : null);
  let otkriveno = $derived(!pitanje || pokazi || !!ishod?.tocno);
  let unos = $state("");
  let poslano = $state(null);
  $effect(() => {
    if (!pitanje || !(pokazi || ishod?.tocno)) return;
    untrack(() => {
      if (pokazi) unos = formatNumber(sudarOdgovor(spec));
      pusti();
    });
  });
  function predznak() {
    if (locked) return;
    const u = unos.trim();
    unos = /^[-−–]/.test(u) ? u.replace(/^[-−–]\s*/, "") : `−${u}`;
  }
  function submit(e) {
    e.preventDefault();
    if (locked || !unos.trim()) return;
    poslano = unos;
    onodgovor(unos);
  }
  let neprom = $derived(poslano != null && poslano === unos);
  // polje se označi tek uz točan odgovor (ili „pokaži“); krivi odgovor javlja samo poruka
  let status = $derived(pokazi || (ishod?.tocno && neprom) ? "ok" : "");
  let kome = $derived.by(() => {
    if (!pitanje) return "";
    if (zid) return "";
    if (spec.pitaj.velicina === "gubitak") return "";
    if (qTijelo == null) return " (ukupno)";
    if (
      spec.pitaj.velicina === "v_poslije" &&
      spec.vrsta === "savrseno_neelasticni" &&
      spec.pitaj.tijelo == null
    )
      return " (zajedno)";
    return ` (${ime(spec, qTijelo)})`;
  });

  // ── geometrija scene ──
  const slikaOf = (b) => b.slika ?? (zid ? "lopta" : "kolica");
  let dims = $derived.by(() => {
    const ms = tijela.map((b) => b.m);
    const isti = tijela.every((b) => slikaOf(b) === slikaOf(tijela[0]));
    const lo = Math.min(...ms);
    const hi = Math.max(...ms);
    return tijela.map((b) => {
      const o = OBLIK[slikaOf(b)] ?? OBLIK.kolica;
      // isti oblik: veća masa → veće tijelo (logaritamski, da vagon od 12 t ne pojede scenu)
      const s =
        isti && hi > lo * 1.0001
          ? 0.78 + (0.22 * Math.log(b.m / lo)) / Math.log(hi / lo)
          : isti
            ? 0.92
            : 1;
      return { w: o.w * s, h: o.h * s, slika: slikaOf(b) };
    });
  });

  let kin = $derived.by(() => {
    const n = tijela.length;
    const v = tijela.map((b, i) => (R ? R.tijela[i].v : (b.v ?? 0)));
    const vp = tijela.map((b, i) => (R ? R.tijela[i].vp : v[i]));
    const sve = [...v, ...vp].map(Math.abs).filter((x) => x > 1e-9);
    const vmax = sve.length ? Math.max(...sve) : 1;
    const vmin = sve.length ? Math.min(...sve) : 1;
    // brzine koje se razlikuju stotinu puta (metak i puška) crtaju se logaritamski; brojevi su uvijek pravi
    const log = vmax / vmin > 12;
    const phi = (x) => (log ? Math.log1p(x / vmin) : x);
    const f = (x) =>
      Math.abs(x) < 1e-12 ? 0 : (Math.sign(x) * phi(Math.abs(x))) / phi(vmax);
    const c = zid ? [-dims[0].w / 2] : [-dims[0].w / 2, dims[1].w / 2];
    const lim = (i) => [8 + dims[i].w / 2, (zid ? ZID : W - 8) - dims[i].w / 2];
    function interval(K) {
      let lo = -Infinity;
      let hi = Infinity;
      for (let i = 0; i < n; i++) {
        for (const d of [-K * f(v[i]) * TB, K * f(vp[i]) * TA]) {
          const [a, b] = lim(i);
          lo = Math.max(lo, a - c[i] - d);
          hi = Math.min(hi, b - c[i] - d);
        }
      }
      return [lo, hi];
    }
    const moze = (K) => {
      const [lo, hi] = interval(K);
      return zid ? lo <= ZID + 1e-9 && ZID <= hi + 1e-9 : lo <= hi;
    };
    let a = 0;
    let b = VMAX_PX;
    if (moze(b)) a = b;
    else
      for (let k = 0; k < 30; k++) {
        const m = (a + b) / 2;
        if (moze(m)) a = m;
        else b = m;
      }
    const K = a * 0.94;
    const [lo, hi] = interval(K);
    const xc = zid ? ZID : Math.min(Math.max(W / 2 + 10, lo), hi);
    return { v, vp, f, K, xc, c, log };
  });

  const xOf = (i, tt) => {
    const base = kin.xc + kin.c[i];
    if (tt < TB) return base + kin.K * kin.f(kin.v[i]) * (tt - TB);
    if (tt < TB + TC) return base;
    return base + kin.K * kin.f(kin.vp[i]) * (tt - TB - TC);
  };
  let faza = $derived(t < TB ? "prije" : t < TB + TC ? "dodir" : "poslije");
  let u = $derived(faza === "dodir" ? (t - TB) / TC : 0); // 0…1 tijekom dodira
  let vidiPoslije = $derived(otkriveno && R && t >= TB + TC * 0.5);
  let xs = $derived(tijela.map((_, i) => xOf(i, t)));

  // stisak u dodiru: tijelo se spljošti prema mjestu dodira
  const stisak = (i) => {
    if (faza !== "dodir" || R?.razdvajanje) return { sx: 1, sy: 1, o: 0 };
    const q = Math.sin(Math.PI * u) * (zid ? 0.22 : 0.12);
    return {
      sx: 1 - q,
      sy: 1 + q * 0.5,
      o: i === 0 ? dims[i].w / 2 : -dims[i].w / 2,
    };
  };

  const fmt = (n) => formatSci(n, 4);
  const masa = (b) =>
    `${fmt(b.m / (JEDINICE_MASE[b.jedinica] ?? 1))} ${b.jedinica ?? "kg"}`;
  const strelica = (fv) =>
    fv === 0 ? 0 : Math.sign(fv) * (10 + 40 * Math.abs(fv));
  const boja = (i) => (i === 0 ? "var(--sd-a)" : "var(--sd-b)");

  // strelice brzina iznad tijela
  let strelice = $derived.by(() => {
    if (faza === "dodir") return [];
    const po = faza === "poslije" && vidiPoslije;
    const vv = po ? kin.vp : kin.v;
    if (po && R?.spojeni) {
      const x = (xs[0] + dims[0].w / 2 + (xs[1] - dims[1].w / 2)) / 2;
      const y = TLO - Math.max(dims[0].h, dims[1].h) - 14;
      return [
        {
          x,
          y,
          len: strelica(kin.f(vv[0])),
          tekst: `zajedno ${fmt(vv[0])} m/s`,
          boja: "var(--text)",
        },
      ];
    }
    if (faza === "poslije" && !vidiPoslije) return [];
    return tijela
      .map((b, i) => {
        const y = TLO - dims[i].h - 14 - (dims[i].slika === "metak" ? 8 : 0);
        if (R?.razdvajanje && !po)
          return i === 0
            ? {
                x: (xs[0] + xs[1]) / 2,
                y: TLO - Math.max(dims[0].h, dims[1].h) - 14,
                len: strelica(kin.f(vv[0])),
                tekst: vv[0] === 0 ? "miruju" : `zajedno ${fmt(vv[0])} m/s`,
                boja: "var(--text)",
              }
            : null;
        return {
          x: xs[i],
          y,
          len: strelica(kin.f(vv[i])),
          tekst: vv[i] === 0 ? "miruje" : `${fmt(vv[i])} m/s`,
          boja: boja(i),
        };
      })
      .filter(Boolean);
  });

  // zadane brzine poslije (prije otkrivanja): isprekidane strelice kao podatak, i „?“ na traženoj
  let duhovi = $derived.by(() => {
    if (!pitanje || otkriveno || t > 0 || spec.pitaj?.velicina !== "v_poslije")
      return [];
    const i = qTijelo ?? 0;
    const zajedno = R?.spojeni && spec.pitaj.tijelo == null;
    const x = zajedno ? (xs[0] + xs[1]) / 2 : xs[i];
    const h = zajedno ? Math.max(...dims.map((d) => d.h)) : dims[i].h;
    return [
      {
        x,
        y: TLO - h - 40,
        len: 0,
        tekst: "v′ = ?",
        boja: "var(--lx-turn)",
        upit: true,
      },
    ];
  });
  // zadane brzine poslije (podatak iz teksta), prije otkrivanja
  let zadanoPoslije = $derived(
    pitanje && !otkriveno
      ? tijela
          .map((b) =>
            b.v_poslije != null ? `${b.oznaka}: ${fmt(b.v_poslije)} m/s` : null,
          )
          .filter(Boolean)
      : [],
  );

  // natpisi ispod tla: oznaka i masa; drugi se spusti red niže ako bi se preklopili
  let natpisi = $derived.by(() => {
    const out = tijela.map((b, i) => ({
      x: xs[i],
      y: TLO + 15,
      tekst: `${b.oznaka} · ${masa(b)}`,
    }));
    if (out.length === 2) {
      const sir = (s) => s.length * 6.2;
      if (
        out[0].x + sir(out[0].tekst) / 2 + 6 >
        out[1].x - sir(out[1].tekst) / 2
      )
        out[1].y += 13;
    }
    return out.map((o) => ({
      ...o,
      x: Math.min(
        W - 4 - (o.tekst.length * 6.2) / 2,
        Math.max(4 + (o.tekst.length * 6.2) / 2, o.x),
      ),
    }));
  });

  // bljesak na mjestu dodira (razdvajanje: pucanj/eksplozija; sudar: udarac)
  let bljesak = $derived(
    faza === "dodir"
      ? {
          x: zid ? ZID : kin.xc,
          r:
            (R?.razdvajanje ? 22 : 12) *
            Math.sin(Math.PI * Math.min(1, u * 1.4)),
          o: 1 - u,
        }
      : null,
  );

  // ── ploča: količina gibanja ──
  const P_X0 = 58;
  const P_X1 = 350;
  let pPlot = $derived.by(() => {
    if (!R) return null;
    const T = R.tijela;
    const tocke = [0];
    if (zid) tocke.push(T[0].p, T[0].pp);
    else {
      tocke.push(T[0].p, R.P, T[0].pp, R.Pp);
    }
    let lo = Math.min(...tocke);
    let hi = Math.max(...tocke);
    if (lo < 0) {
      // nula u sredini: suprotne količine gibanja vide se jednako duge
      const m = Math.max(-lo, hi);
      lo = -m;
      hi = m;
    }
    if (hi - lo < 1e-12) hi = lo + 1;
    const pad = (hi - lo) * 0.04;
    lo -= lo < 0 ? pad : 0;
    hi += pad;
    const X = (p) => P_X0 + ((p - lo) / (hi - lo)) * (P_X1 - P_X0);
    let redovi;
    if (zid) {
      redovi = [
        {
          oznaka: "prije",
          poslije: false,
          strelice: [
            { od: 0, do: T[0].p, boja: boja(0), tekst: `p = ${fmt(T[0].p)}` },
          ],
        },
        {
          oznaka: "poslije",
          poslije: true,
          strelice: [
            {
              od: 0,
              do: T[0].pp,
              boja: boja(0),
              tekst: `p′ = ${fmt(T[0].pp)}`,
            },
          ],
        },
        {
          oznaka: "Δp",
          poslije: true,
          strelice: [
            {
              od: T[0].p,
              do: T[0].pp,
              boja: "var(--sd-dp)",
              tekst: `Δp = p′ − p = ${fmt(T[0].dp)}`,
              debela: true,
            },
          ],
        },
      ];
    } else {
      const red = (oznaka, poslije) => {
        const p0 = poslije ? T[0].pp : T[0].p;
        const p1 = poslije ? T[1].pp : T[1].p;
        return {
          oznaka,
          poslije,
          strelice: [
            {
              od: 0,
              do: p0,
              boja: boja(0),
              tekst: `${ime(eff, 0)}: ${fmt(p0)}`,
            },
            {
              od: p0,
              do: p0 + p1,
              boja: boja(1),
              tekst: `${ime(eff, 1)}: ${fmt(p1)}`,
            },
            {
              od: 0,
              do: p0 + p1,
              boja: "var(--text)",
              tekst: `Σp = ${fmt(poslije ? R.Pp : R.P)}`,
              debela: true,
            },
          ],
        };
      };
      redovi = [red("prije", false), red("poslije", true)];
    }
    const visina = (r) => r.strelice.length * 21 + 8;
    let y = 4;
    redovi = redovi.map((r) => {
      const o = { ...r, y };
      y += visina(r);
      return o;
    });
    return { X, redovi, h: y + 2, nula: X(0) };
  });

  // ── ploča: kinetička energija ──
  let ekRedovi = $derived.by(() => {
    if (!R) return null;
    const T = R.tijela;
    const seg = (poslije) =>
      T.map((tj, i) => ({
        v: poslije ? tj.Ekp : tj.Ek,
        boja: boja(i),
        tekst: `${ime(eff, i)} ${fmt(poslije ? tj.Ekp : tj.Ek)} J`,
      }));
    const prije = seg(false);
    const poslije = seg(true);
    if (R.gubitak > 1e-9 * Math.max(1, R.Ek))
      poslije.push({
        v: R.gubitak,
        boja: "var(--sd-q)",
        tekst: `toplina, zvuk, deformacija ${fmt(R.gubitak)} J`,
        crtice: true,
      });
    if (R.gubitak < -1e-9 * Math.max(1, R.Ekp))
      prije.push({
        v: -R.gubitak,
        boja: "var(--sd-z)",
        tekst: `${tijela.some((b) => slikaOf(b) === "puska") ? "kemijska energija baruta" : "pohranjena energija (eksplozija, opruga)"} ${fmt(-R.gubitak)} J`,
        crtice: true,
      });
    const max = Math.max(
      1e-12,
      ...[prije, poslije].map((r) => r.reduce((a, g) => a + g.v, 0)),
    );
    const red = (oznaka, segs, ek, po) => ({
      oznaka,
      po,
      ek,
      segs: segs
        .map((g) => ({ ...g, pct: (100 * g.v) / max }))
        .filter((g) => g.v > 0 || !g.crtice),
    });
    return [
      red("prije", prije, R.Ek, false),
      red("poslije", poslije, R.Ekp, true),
    ];
  });

  // ── ploča: impuls sile F–t ──
  const F_X0 = 46;
  const F_X1 = 346;
  const F_Y0 = 104;
  const F_Y1 = 18;
  let silaI = $derived(
    zid
      ? 0
      : pitanje && Number.isInteger(spec.pitaj?.tijelo)
        ? spec.pitaj.tijelo
        : 0,
  );
  let fPlot = $derived.by(() => {
    if (!R || dtVal == null) return null;
    const dp = R.tijela[silaI].dp;
    const tmax = dtRaspon.max;
    const Fmax = Math.abs(dp) / dtRaspon.min || 1;
    const X = (tt) => F_X0 + (tt / tmax) * (F_X1 - F_X0);
    const Y = (F) => F_Y0 - (Math.abs(F) / Fmax) * (F_Y0 - F_Y1);
    const F = dp / dtVal;
    return { dp, F, X, Y, ref: spec.trajanje };
  });
  let fNaziv = $derived(
    zid
      ? `sila zida na tijelo „${ime(eff, 0)}“`
      : `sila na tijelo „${ime(eff, silaI)}“`,
  );

  // ── tablica ──
  let tablica = $derived.by(() => {
    if (!R) return [];
    const T = R.tijela;
    const rows = T.map((tj, i) => ({
      oznaka: `v (${ime(eff, i)})`,
      a: `${fmt(tj.v)} m/s`,
      b: `${fmt(tj.vp)} m/s`,
    }));
    T.forEach((tj, i) =>
      rows.push({ oznaka: `p (${ime(eff, i)})`, a: fmt(tj.p), b: fmt(tj.pp) }),
    );
    if (!zid)
      rows.push({
        oznaka: "Σp (kg·m/s)",
        a: fmt(R.P),
        b: fmt(R.Pp),
        jako: true,
      });
    rows.push({ oznaka: "ΣEₖ (J)", a: fmt(R.Ek), b: fmt(R.Ekp), jako: true });
    return rows;
  });

  let opis = $derived.by(() => {
    const d = tijela
      .map(
        (b) =>
          `${b.oznaka}, ${masa(b)}, ${R?.razdvajanje ? "" : (b.v ?? 0) === 0 ? "miruje" : `brzina ${fmt(b.v)} m/s`}`,
      )
      .join("; ");
    const po =
      vidiPoslije && R
        ? ` Poslije: ${R.tijela.map((tj, i) => `${ime(eff, i)} ${fmt(tj.vp)} m/s`).join(", ")}.`
        : "";
    return `Sudar na pruzi${zid ? " sa zidom" : ""}, pozitivan smjer udesno. ${d}.${po}`;
  });

  function promjenaKlizaca() {
    natrag();
  }
  function pustenKlizac() {
    if (R) pusti();
  }
  function odaberiVrstu(v) {
    vrstaSel = v;
    natrag();
    if (!problem) pusti();
  }
  let poruka = $derived.by(() => {
    if (!problem) return "";
    if (zid) return "Tijelo mora ići prema zidu (udesno).";
    if (eff.vrsta === "razdvajanje")
      return "Uz ove vrijednosti tijela se ne razdvoje.";
    if (!(tijela[0].v > (tijela[1].v ?? 0)))
      return `${ime(eff, 0)} ne sustiže ${ime(eff, 1)}: tijela se ne sudaraju. Neka ${ime(eff, 0)} ide udesno brže od ${ime(eff, 1)}.`;
    return "Uz ove vrijednosti sudar nije moguć.";
  });
</script>

{#if pitanje}
  <div class="lx-question"><Md text={spec.tekst} /></div>
{:else}
  <div class="sd-tekst"><Md text={spec.tekst} /></div>
{/if}

<div class="sd">
  {#if nacin === "istrazi" && spec.vrste}
    <div class="seg sd-vrste" role="group" aria-label="Vrsta sudara">
      {#each spec.vrste as v (v)}
        <button
          type="button"
          class="seg-item"
          class:active={vrstaSel === v}
          aria-pressed={vrstaSel === v}
          onclick={() => odaberiVrstu(v)}>{VRSTA_NAZIV[v]}</button
        >
      {/each}
    </div>
  {/if}

  <figure class="lx-figure sd-fig">
    <svg viewBox="0 0 {W} 134" role="img" aria-label={opis}>
      <defs>
        <pattern
          id="sd-{uid}-zid"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="7" class="sd-srafura" />
        </pattern>
        <marker
          id="sd-{uid}-vrh"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 Z" fill="context-stroke" />
        </marker>
      </defs>

      <!-- pozitivan smjer -->
      <g class="sd-smjer" aria-hidden="true">
        <line x1="8" y1="12" x2="40" y2="12" marker-end="url(#sd-{uid}-vrh)" />
        <text x="46" y="16">+ smjer</text>
      </g>

      <!-- pruga -->
      <line
        class="lx-stroke sd-tlo"
        x1="4"
        y1={TLO}
        x2={zid ? ZID : W - 4}
        y2={TLO}
      />
      {#each Array.from({ length: 22 }, (_, k) => 8 + k * 16) as px (px)}
        {#if !zid || px < ZID}<line
            class="sd-prag"
            x1={px}
            y1={TLO + 1}
            x2={px - 5}
            y2={TLO + 5}
          />{/if}
      {/each}
      {#if zid}
        <rect
          x={ZID}
          y="34"
          width="14"
          height={TLO - 34 + 6}
          fill="url(#sd-{uid}-zid)"
          class="sd-zid"
        />
        <line class="lx-stroke" x1={ZID} y1="34" x2={ZID} y2={TLO + 6} />
      {/if}

      <!-- tijela -->
      {#each dims as d, i (i)}
        {@const q = stisak(i)}
        <g
          transform="translate({xs[i].toFixed(
            2,
          )} {TLO}) translate({q.o} 0) scale({q.sx} {q.sy}) translate({-q.o} 0)"
          style:--c={boja(i)}
        >
          {#if d.slika === "kugla" || d.slika === "lopta"}
            <circle class="sd-tijelo" cx="0" cy={-d.h / 2} r={d.h / 2} />
            {#if d.slika === "lopta"}
              <path
                class="sd-detalj"
                d="M{-d.h / 2},{-d.h / 2} Q0,{-d.h * 0.2} {d.h / 2},{-d.h /
                  2} M0,{-d.h} Q{-d.h * 0.28},{-d.h / 2} 0,0"
              />
            {/if}
          {:else if d.slika === "puska"}
            <path
              class="sd-tijelo"
              d="M{-d.w / 2},{-d.h * 0.1} L{-d.w / 2},{-d.h} L{-d.w *
                0.22},{-d.h * 0.78} L{d.w * 0.12},{-d.h * 0.78} L{d.w *
                0.12},{-d.h * 0.62} L{d.w / 2},{-d.h * 0.62} L{d.w / 2},{-d.h *
                0.46} L{d.w * 0.05},{-d.h * 0.46} L{-d.w * 0.05},{-d.h *
                0.12} L{-d.w * 0.22},{-d.h * 0.38} Z"
            />
          {:else if d.slika === "metak"}
            <path
              class="sd-tijelo"
              d="M{-d.w / 2},{-d.h - 8} H{d.w * 0.1} Q{d.w / 2},{-d.h -
                8} {d.w / 2},{-d.h / 2 - 8} Q{d.w / 2},-8 {d.w *
                0.1},-8 H{-d.w / 2} Z"
            />
          {:else if d.slika === "auto"}
            <path
              class="sd-tijelo"
              d="M{-d.w / 2},-6 V{-d.h * 0.55} L{-d.w * 0.28},{-d.h *
                0.62} L{-d.w * 0.16},{-d.h} H{d.w * 0.18} L{d.w * 0.32},{-d.h *
                0.6} L{d.w / 2},{-d.h * 0.5} V-6 Z"
            />
            <circle class="sd-kotac" cx={-d.w * 0.28} cy="-5" r="5" />
            <circle class="sd-kotac" cx={d.w * 0.28} cy="-5" r="5" />
          {:else}
            {@const kot =
              d.slika === "kutija" ? 0 : d.slika === "vagon" ? 5 : 4}
            <rect
              class="sd-tijelo"
              x={-d.w / 2}
              y={-d.h}
              width={d.w}
              height={d.h - kot * 1.6}
              rx="3"
            />
            {#if d.slika === "vagon"}
              <line
                class="sd-detalj"
                x1={-d.w / 6}
                y1={-d.h + 5}
                x2={-d.w / 6}
                y2={-kot * 1.6 - 4}
              />
              <line
                class="sd-detalj"
                x1={d.w / 6}
                y1={-d.h + 5}
                x2={d.w / 6}
                y2={-kot * 1.6 - 4}
              />
              <rect
                class="sd-odbojnik"
                x={-d.w / 2 - 4}
                y={-d.h * 0.55}
                width="4"
                height="5"
              />
              <rect
                class="sd-odbojnik"
                x={d.w / 2}
                y={-d.h * 0.55}
                width="4"
                height="5"
              />
            {/if}
            {#if kot}
              <circle class="sd-kotac" cx={-d.w / 3} cy={-kot} r={kot} />
              <circle class="sd-kotac" cx={d.w / 3} cy={-kot} r={kot} />
            {/if}
          {/if}
        </g>
      {/each}

      {#if R?.spojeni && faza === "poslije" && vidiPoslije}
        <line
          class="sd-spojka"
          x1={xs[0] + dims[0].w / 2 - 6}
          y1={TLO - Math.min(dims[0].h, dims[1].h) * 0.5}
          x2={xs[1] - dims[1].w / 2 + 6}
          y2={TLO - Math.min(dims[0].h, dims[1].h) * 0.5}
        />
      {/if}

      {#if bljesak && bljesak.r > 0.5}
        <g
          class="sd-bljesak"
          style:opacity={bljesak.o}
          transform="translate({bljesak.x} {TLO -
            Math.min(...dims.map((d) => d.h)) / 2})"
        >
          {#each [0, 45, 90, 135, 180, 225, 270, 315] as a (a)}
            <line
              x1={Math.cos((a * Math.PI) / 180) * bljesak.r * 0.45}
              y1={Math.sin((a * Math.PI) / 180) * bljesak.r * 0.45}
              x2={Math.cos((a * Math.PI) / 180) * bljesak.r}
              y2={Math.sin((a * Math.PI) / 180) * bljesak.r}
            />
          {/each}
        </g>
      {/if}

      <!-- strelice brzina -->
      {#each strelice as s, k (k)}
        <g style:--c={s.boja} class="sd-v">
          {#if s.len !== 0}
            <line
              x1={s.x}
              y1={s.y}
              x2={s.x + s.len}
              y2={s.y}
              marker-end="url(#sd-{uid}-vrh)"
            />
          {/if}
          <text
            x={Math.min(W - 6, Math.max(6, s.x + s.len / 2))}
            y={s.y - 6}
            text-anchor={s.x + s.len / 2 < 40
              ? "start"
              : s.x + s.len / 2 > W - 40
                ? "end"
                : "middle"}>{s.tekst}</text
          >
        </g>
      {/each}
      {#each duhovi as s, k (k)}
        <g style:--c={s.boja} class="sd-v sd-duh" class:sd-upit={s.upit}>
          {#if s.len !== 0}
            <line
              x1={s.x}
              y1={s.y}
              x2={s.x + s.len}
              y2={s.y}
              marker-end="url(#sd-{uid}-vrh)"
            />
          {/if}
          <text
            x={Math.min(W - 6, Math.max(6, s.x + s.len / 2))}
            y={s.y - 6}
            text-anchor={s.x + s.len / 2 < 50
              ? "start"
              : s.x + s.len / 2 > W - 50
                ? "end"
                : "middle"}>{s.tekst}</text
          >
        </g>
      {/each}

      {#each natpisi as n, k (k)}
        <text class="sd-natpis" x={n.x} y={n.y} text-anchor="middle"
          >{n.tekst}</text
        >
      {/each}
    </svg>
    {#if kin.log && R}
      <figcaption class="sd-mala">
        Brzine se jako razlikuju, pa duljine strelica i gibanje nisu u mjerilu;
        brojevi jesu.
      </figcaption>
    {/if}
  </figure>

  {#if zadanoPoslije.length}
    <p class="sd-zadano">Poslije (zadano): {zadanoPoslije.join(" · ")}</p>
  {/if}

  {#if problem}
    <p class="sd-upozorenje" role="status">{poruka}</p>
  {/if}

  {#if klizaci.length}
    <div class="sd-klizaci">
      {#each klizaci as k (k.id)}
        {@const o = KLIZ[k.id](spec)}
        <div class="sd-klizac">
          <div class="sd-kl-glava">
            <label for="sd-{uid}-{k.id}">{o.oznaka}</label>
            <output for="sd-{uid}-{k.id}"
              >{formatNumber(vals[k.id])}{o.jedinica
                ? ` ${o.jedinica}`
                : ""}</output
            >
          </div>
          <input
            id="sd-{uid}-{k.id}"
            type="range"
            min={k.min}
            max={k.max}
            step={k.korak}
            bind:value={vals[k.id]}
            oninput={promjenaKlizaca}
            onchange={pustenKlizac}
          />
        </div>
      {/each}
    </div>
  {/if}

  {#if pitanje}
    <form class="sd-unos" onsubmit={submit}>
      <label class="sd-unos-oznaka" for="sd-{uid}-unos"
        >{velicina.oznaka}{kome} =</label
      >
      <span class="sd-unos-polje">
        <button
          type="button"
          class="btn btn-ghost sd-pm"
          onclick={predznak}
          disabled={locked}
          aria-label="Promijeni predznak">±</button
        >
        <input
          id="sd-{uid}-unos"
          class="inp lx-broj-inp"
          class:ok={status === "ok"}
          inputmode="decimal"
          autocomplete="off"
          placeholder="?"
          disabled={locked}
          bind:value={unos}
        />
        <span class="lx-unit">{velicina.jedinica}</span>
      </span>
      <button
        class="btn btn-primary"
        type="submit"
        disabled={locked || !unos.trim()}>Provjeri</button
      >
    </form>
    {#if !otkriveno}
      <p class="sd-mala sd-uputa">
        Upiši s predznakom: + udesno (→), − ulijevo (←). Nakon točnog odgovora
        vidjet ćeš sudar.
      </p>
    {/if}
  {/if}

  {#if otkriveno}
    <div class="lx-actions sd-akcije">
      <button
        type="button"
        class="btn {pitanje ? 'btn-ghost' : 'btn-primary'}"
        onclick={pusti}
        disabled={!R || igra}
      >
        {t > 0
          ? "↺ Ponovi"
          : R?.razdvajanje
            ? "▶ Pusti razdvajanje"
            : "▶ Pusti sudar"}
      </button>
    </div>
  {/if}

  {#if otkriveno && R}
    <div class="sd-ploce" aria-live="polite">
      {#if prikazi.includes("p") && pPlot}
        <section class="sd-ploca">
          <h4 class="sd-naslov">
            Količina gibanja <i>p</i>
            <span class="sd-mala">(kg·m/s, + udesno)</span>
          </h4>
          <svg
            viewBox="0 0 {W} {pPlot.h}"
            role="img"
            aria-label={`Količina gibanja: ${pPlot.redovi.map((r) => `${r.oznaka}: ${r.poslije && !vidiPoslije ? "?" : r.strelice.map((s) => s.tekst).join(", ")}`).join("; ")}`}
          >
            <line
              class="sd-nula"
              x1={pPlot.nula}
              y1="0"
              x2={pPlot.nula}
              y2={pPlot.h}
            />
            {#each pPlot.redovi as r (r.oznaka)}
              <text class="sd-red-oznaka" x="4" y={r.y + 19}>{r.oznaka}</text>
              {#if r.poslije && !vidiPoslije}
                <text
                  class="sd-mala-svg"
                  x={(P_X0 + P_X1) / 2}
                  y={r.y + 13}
                  text-anchor="middle">? (pusti sudar)</text
                >
              {:else}
                {#each r.strelice as s, k (k)}
                  {@const y = r.y + 18 + k * 21}
                  {@const x1 = pPlot.X(s.od)}
                  {@const x2 = pPlot.X(s.do)}
                  {@const sir = s.tekst.length * 6.4}
                  {@const tx = Math.min(
                    W - 2 - sir / 2,
                    Math.max(P_X0 + sir / 2, (x1 + x2) / 2),
                  )}
                  <g style:--c={s.boja} class="sd-p" class:debela={s.debela}>
                    {#if Math.abs(x2 - x1) > 1.5}
                      <line
                        {x1}
                        y1={y}
                        {x2}
                        y2={y}
                        marker-end="url(#sd-{uid}-vrh)"
                      />
                    {:else}
                      <circle cx={x1} cy={y} r="2.5" />
                    {/if}
                    <text x={tx} y={y - 5} text-anchor="middle">{s.tekst}</text>
                  </g>
                {/each}
              {/if}
            {/each}
          </svg>
          {#if !zid && vidiPoslije}
            <p class="sd-zakljucak">
              Ukupna količina gibanja je ista prije i poslije: <b
                >{fmt(R.P)} kg·m/s</b
              >.
            </p>
          {/if}
        </section>
      {/if}

      {#if prikazi.includes("Ek") && ekRedovi}
        <section class="sd-ploca">
          <h4 class="sd-naslov">
            Kinetička energija <i>E</i><sub>k</sub>
            <span class="sd-mala">(J)</span>
          </h4>
          {#each ekRedovi as r (r.oznaka)}
            <div class="sd-ek-red">
              <span class="sd-red-oznaka">{r.oznaka}</span>
              <div class="sd-ek-traka">
                {#if !r.po || vidiPoslije}
                  {#each r.segs as g, k (k)}
                    <span
                      class="sd-ek-seg"
                      class:crtice={g.crtice}
                      style:width="{g.pct}%"
                      style:--c={g.boja}
                      title={g.tekst}
                    ></span>
                  {/each}
                {/if}
              </div>
              <span class="sd-ek-iznos"
                >{r.po ? "Eₖ′" : "Eₖ"} = {!r.po || vidiPoslije
                  ? `${fmt(r.ek)} J`
                  : "?"}</span
              >
            </div>
            {#if !r.po || vidiPoslije}
              <div class="sd-legenda">
                {#each r.segs as g, k (k)}
                  <span class="sd-leg"
                    ><i class:crtice={g.crtice} style:--c={g.boja}
                    ></i>{g.tekst}</span
                  >
                {/each}
              </div>
            {/if}
          {/each}
          {#if vidiPoslije && R.vrsta === "elasticni"}
            <p class="sd-zakljucak">
              Elastični sudar: ukupna kinetička energija je ista.
            </p>
          {:else if vidiPoslije && R.gubitak > 0}
            <p class="sd-zakljucak">
              Nestalo je <b>{fmt(R.gubitak)} J</b> kinetičke energije: prešlo je u
              toplinu, zvuk i deformaciju.
            </p>
          {:else if vidiPoslije && R.gubitak < 0}
            <p class="sd-zakljucak">
              Kinetička energija je porasla za <b>{fmt(-R.gubitak)} J</b>: dala
              ju je pohranjena energija.
            </p>
          {/if}
        </section>
      {/if}

      {#if prikazi.includes("F") && fPlot}
        <section class="sd-ploca">
          <h4 class="sd-naslov">Impuls sile · {fNaziv}</h4>
          <svg
            viewBox="0 0 {W} 124"
            role="img"
            aria-label={`Prosječna sila ${fmt(fPlot.F)} N tijekom ${formatNumber(dtVal)} s; površina je Δp = ${fmt(fPlot.dp)} kg·m/s`}
          >
            <line
              class="sd-os"
              x1={F_X0}
              y1={F_Y0}
              x2={F_X1 + 4}
              y2={F_Y0}
              marker-end="url(#sd-{uid}-vrh)"
            />
            <line
              class="sd-os"
              x1={F_X0}
              y1={F_Y0}
              x2={F_X0}
              y2={F_Y1 - 10}
              marker-end="url(#sd-{uid}-vrh)"
            />
            <text class="sd-os-t" x={F_X1} y={F_Y0 + 16} text-anchor="end"
              >t (s)</text
            >
            <text class="sd-os-t" x={F_X0 - 6} y={F_Y1 - 2} text-anchor="end"
              >|F|</text
            >
            {#if fPlot.ref && Math.abs(fPlot.ref - dtVal) > 1e-9}
              <rect
                class="sd-impuls-ref"
                x={F_X0}
                y={fPlot.Y(fPlot.dp / fPlot.ref)}
                width={fPlot.X(fPlot.ref) - F_X0}
                height={F_Y0 - fPlot.Y(fPlot.dp / fPlot.ref)}
              />
            {/if}
            <rect
              class="sd-impuls"
              x={F_X0}
              y={fPlot.Y(fPlot.F)}
              width={Math.max(1, fPlot.X(dtVal) - F_X0)}
              height={Math.max(1, F_Y0 - fPlot.Y(fPlot.F))}
            />
            <line
              class="sd-crtica"
              x1={fPlot.X(dtVal)}
              y1={F_Y0}
              x2={fPlot.X(dtVal)}
              y2={F_Y0 + 4}
            />
            <text
              class="sd-os-t"
              x={fPlot.X(dtVal)}
              y={F_Y0 + 16}
              text-anchor={fPlot.X(dtVal) > F_X1 - 40 ? "end" : "middle"}
              >{formatNumber(dtVal)}</text
            >
            <text
              class="sd-f-tekst"
              x={Math.min(F_X1 - 4, fPlot.X(dtVal) + 8)}
              y={Math.max(F_Y1 + 10, fPlot.Y(fPlot.F) + 4)}
              text-anchor={fPlot.X(dtVal) + 8 > F_X1 - 120 ? "end" : "start"}
              >F = {fmt(fPlot.F)} N</text
            >
          </svg>
          <div class="sd-klizac">
            <div class="sd-kl-glava">
              <label for="sd-{uid}-dt">trajanje udara Δt</label>
              <output for="sd-{uid}-dt">{formatNumber(dtVal)} s</output>
            </div>
            <input
              id="sd-{uid}-dt"
              type="range"
              min={dtRaspon.min}
              max={dtRaspon.max}
              step={dtRaspon.korak}
              bind:value={dtVal}
            />
          </div>
          <p class="sd-zakljucak">
            Površina pravokutnika je uvijek Δp = <b>{fmt(fPlot.dp)} kg·m/s</b>:
            dulji udar znači manju silu.
          </p>
        </section>
      {/if}

      {#if prikazi.includes("tablica")}
        <table class="sd-tablica">
          <thead><tr><th></th><th>prije</th><th>poslije</th></tr></thead>
          <tbody>
            {#each tablica as r (r.oznaka)}
              <tr class:jako={r.jako}
                ><th scope="row">{r.oznaka}</th><td>{r.a}</td><td
                  >{vidiPoslije ? r.b : "?"}</td
                ></tr
              >
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}
</div>

<style>
  .sd {
    --sd-a: var(--primary);
    --sd-b: #2dd4bf;
    --sd-q: var(--warn);
    --sd-z: #f472b6;
    --sd-dp: var(--danger);
  }
  :global(html[data-theme="light"]) .sd {
    --sd-b: #0d9488;
    --sd-z: #db2777;
  }
  .sd-tekst {
    margin-bottom: 10px;
  }
  .sd-vrste {
    display: flex;
    justify-content: center;
    margin: 0 auto 8px;
    width: fit-content;
  }
  .sd-vrste .seg-item {
    font-size: 13px;
    padding: 7px 12px;
  }
  .sd-fig {
    margin-bottom: 6px;
  }
  .sd-smjer line {
    stroke: var(--text-faint);
    stroke-width: 1.5;
  }
  .sd-smjer text {
    fill: var(--text-faint);
    font: 500 10.5px var(--font-sans);
  }
  .sd-fig .sd-tlo {
    stroke-width: 2;
  }
  .sd-prag {
    stroke: var(--border-strong);
    stroke-width: 1;
  }
  .sd-srafura {
    stroke: var(--text-faint);
    stroke-width: 2;
  }
  .sd-zid {
    stroke: none;
  }
  .sd-tijelo {
    fill: color-mix(in srgb, var(--c) 24%, var(--bg-elev));
    stroke: var(--c);
    stroke-width: 1.8;
    stroke-linejoin: round;
  }
  .sd-detalj {
    fill: none;
    stroke: color-mix(in srgb, var(--c) 70%, transparent);
    stroke-width: 1.2;
  }
  .sd-odbojnik {
    fill: var(--c);
  }
  .sd-kotac {
    fill: var(--bg-elev);
    stroke: var(--text-dim);
    stroke-width: 1.6;
  }
  .sd-spojka {
    stroke: var(--text);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .sd-bljesak line {
    stroke: var(--sd-q);
    stroke-width: 2.4;
    stroke-linecap: round;
  }
  .sd-v line {
    stroke: var(--c);
    stroke-width: 2.6;
    stroke-linecap: round;
  }
  .sd-v text {
    fill: var(--c);
    font: 600 11.5px var(--font-mono);
  }
  .sd-duh line {
    stroke-dasharray: 4 3;
    stroke-width: 2;
    opacity: 0.75;
  }
  .sd-duh text {
    font-weight: 500;
    opacity: 0.85;
  }
  .sd-upit text {
    font-weight: 700;
    opacity: 1;
  }
  .sd-natpis {
    fill: var(--text-dim);
    font: 500 11px var(--font-sans);
  }
  .sd-mala {
    color: var(--text-faint);
    font-size: 12px;
    font-weight: 400;
  }
  figcaption.sd-mala {
    text-align: center;
  }
  .sd-upozorenje {
    margin: 0 0 10px;
    padding: 8px 12px;
    border-radius: var(--r-md);
    background: color-mix(in srgb, var(--warn) 12%, transparent);
    font-size: 13.5px;
  }
  .sd-klizaci {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 10px 18px;
    margin: 4px 0 6px;
  }
  .sd-kl-glava {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    font-size: 13px;
  }
  .sd-kl-glava label {
    color: var(--text-dim);
  }
  .sd-kl-glava output {
    font-family: var(--font-mono);
    color: var(--text);
    white-space: nowrap;
  }
  .sd-klizac input[type="range"] {
    width: 100%;
    margin: 0;
    height: 28px;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .sd-unos {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
  }
  .sd-unos-oznaka {
    font-family: var(--font-sans);
    font-weight: 600;
    font-size: 15px;
    color: var(--text);
  }
  .sd-unos-polje {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .sd-pm {
    height: var(--lx-control);
    min-width: 40px;
    padding: 0 10px;
    font-size: 17px;
    border-radius: var(--r-md);
  }
  .sd-unos > .btn-primary {
    height: var(--lx-control);
    padding: 0 16px;
    font-size: 14px;
    border-radius: var(--r-md);
  }
  .sd-uputa {
    margin: 6px 0 0;
  }
  .sd-akcije {
    justify-content: center;
    margin-top: 8px;
  }
  .sd-ploce {
    display: grid;
    gap: 12px;
    margin-top: 12px;
  }
  .sd-ploca {
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--bg-elev);
  }
  .sd-ploca svg {
    width: 100%;
    height: auto;
    display: block;
    user-select: none;
    -webkit-user-select: none;
  }
  .sd-naslov {
    margin: 0 0 6px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text);
  }
  .sd-nula {
    stroke: var(--border-strong);
    stroke-dasharray: 3 3;
  }
  .sd-red-oznaka {
    fill: var(--text-dim);
    color: var(--text-dim);
    font: 500 11.5px var(--font-sans);
  }
  .sd-mala-svg {
    fill: var(--text-faint);
    font: 400 11px var(--font-sans);
  }
  .sd-p line {
    stroke: var(--c);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .sd-p.debela line {
    stroke-width: 2;
  }
  .sd-p circle {
    fill: var(--c);
  }
  .sd-p text {
    fill: var(--c);
    font: 600 10.5px var(--font-mono);
  }
  .sd-zakljucak {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--text-dim);
  }
  .sd-zakljucak b {
    color: var(--text);
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .sd-ek-red {
    display: grid;
    grid-template-columns: 52px 1fr auto;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }
  .sd-ek-traka {
    display: flex;
    height: 16px;
    border-radius: 4px;
    background: var(--bg-elev-2, var(--bg-hover));
    overflow: hidden;
  }
  .sd-ek-seg {
    display: block;
    min-width: 2px;
    height: 100%;
    background: var(--c);
    transition: width 0.35s ease;
  }
  .sd-ek-seg.crtice,
  .sd-leg i.crtice {
    background: repeating-linear-gradient(
      -45deg,
      var(--c) 0 4px,
      color-mix(in srgb, var(--c) 35%, transparent) 4px 7px
    );
  }
  .sd-ek-iznos {
    font: 600 12.5px var(--font-mono);
    color: var(--text);
    white-space: nowrap;
    min-width: 64px;
    text-align: right;
  }
  .sd-legenda {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
    margin: 3px 0 0 60px;
    font-size: 11.5px;
    color: var(--text-dim);
  }
  .sd-leg {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .sd-leg i {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    background: var(--c);
  }
  .sd-os {
    stroke: var(--text-dim);
    stroke-width: 1.5;
  }
  .sd-os-t {
    fill: var(--text-dim);
    font: 400 11px var(--font-sans);
  }
  .sd-zadano {
    margin: 0 0 8px;
    text-align: center;
    font: 500 13px var(--font-mono);
    color: var(--text-dim);
  }
  .sd-impuls {
    fill: color-mix(in srgb, var(--sd-dp) 30%, transparent);
    stroke: var(--sd-dp);
    stroke-width: 1.5;
  }
  .sd-impuls-ref {
    fill: none;
    stroke: var(--text-faint);
    stroke-dasharray: 4 3;
  }
  .sd-crtica {
    stroke: var(--text);
  }
  .sd-f-tekst {
    fill: var(--text);
    font: 600 12px var(--font-mono);
  }
  .sd-tablica {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .sd-tablica th,
  .sd-tablica td {
    padding: 5px 8px;
    border-bottom: 1px solid var(--border);
    text-align: right;
    font-family: var(--font-mono);
  }
  .sd-tablica th[scope="row"],
  .sd-tablica thead th {
    font-family: var(--font-sans);
    color: var(--text-dim);
    font-weight: 500;
  }
  .sd-tablica th[scope="row"] {
    text-align: left;
  }
  .sd-tablica tr.jako td {
    font-weight: 600;
  }
  @media (max-width: 420px) {
    .sd-legenda {
      margin-left: 0;
    }
  }
</style>
