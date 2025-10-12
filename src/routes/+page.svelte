<script>
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import Check from "@lucide/svelte/icons/check";

  let email = "";
  let submitted = false;

  function submitEmail() {
    // TODO: poveži s API-jem (npr. /api/newsletter) ili s Forms (Netlify / Vercel)
    submitted = true;
  }
</script>

<main
  class="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900"
>
  <section class="container mx-auto px-6 py-16 lg:px-8">
    <div class="grid items-center gap-12 lg:grid-cols-2">
      <div>
        <Badge class="mb-4">Za maturante</Badge>
        <h1 class="text-4xl leading-tight font-extrabold sm:text-5xl">
          MatMat — priprema za maturu koja stvarno radi
        </h1>
        <p class="mt-6 max-w-prose text-lg">
          Brže učiš, pamtiš bolje i rješavaš zadatke s razumijevanjem. MatMat
          koristi dokazano učinkovite metode — prilagodljivi spaced repetition +
          fokus na razumijevanje — da tvoju pripremu učini pametnijom, a ne
          dužom.
        </p>

        <!-- <div class="mt-8 flex items-center gap-4">
          <div class="flex gap-3">
            <Input
              bind:value={email}
              placeholder="Tvoj email za besplatni demo"
            />
            <Button on:click={submitEmail}
              >{submitted ? "Hvala!" : "Zatraži demo"}</Button
            >
          </div>
        </div> -->

        <div class="mt-6 flex gap-6 text-sm text-slate-600">
          <div class="flex items-center gap-2">
            <Check class="h-4 w-4" />Personalizirani plan učenja
          </div>
          <div class="flex items-center gap-2">
            <Check class="h-4 w-4" />Praćenje napretka i težine zadataka
          </div>
          <div class="flex items-center gap-2">
            <Check class="h-4 w-4" /><Badge>BESPLATNO</Badge>
          </div>
        </div>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Brzi podaci</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-sm">
              <p>
                <strong>Studije:</strong> višestruke meta-analize i pregledni radovi
                potvrđuju korisnost raspoređenog učenja i ponavljanja u različitim
                kontekstima učenja.
              </p>
              <p class="mt-3 text-xs text-slate-500">
                (Navedi izvore u dokumentaciji/FAQ na webu.)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>

  <!-- FEATURES -->
  <section class="border-t bg-white py-12">
    <div class="container mx-auto px-6 lg:px-8">
      <h2 class="text-2xl font-semibold">Što dobivaš s MatMat</h2>
      <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent>
            <h3 class="font-semibold">Personalizirana ponavljanja</h3>
            <p class="mt-2 text-sm text-slate-600">
              Ne radiš sve isto — MatMat uči kako ti učiš i prilagođava raspored
              ponavljanja tako da pamtiš gradivo dugo nakon zadnje vježbe.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 class="font-semibold">Učenje s razumijevanjem</h3>
            <p class="mt-2 text-sm text-slate-600">
              Uz objašnjenja korak-po-korak i konceptualne bilješke, aplikacija
              te vodi da stvarno razumeš matematičke tehnike, ne samo da znaš
              rješenje.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 class="font-semibold">Praćenje napretka</h3>
            <p class="mt-2 text-sm text-slate-600">
              Grafovi, prosjeci, i prijedlozi što ponoviti idući dan — vidi gdje
              gubiš bodove i brzo popravi svoj plan učenja.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 class="font-semibold">Praktični zadaci</h3>
            <p class="mt-2 text-sm text-slate-600">
              Zadaci su usklađeni s ispitnim standardima i dolaze s variantama
              za treniranje.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 class="font-semibold">Kraci modovi za pregled</h3>
            <p class="mt-2 text-sm text-slate-600">
              10-minutne sesije za brz refresh prije sata ili večernjeg
              ponavljanja.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 class="font-semibold">Offline podrška</h3>
            <p class="mt-2 text-sm text-slate-600">
              Preuzmi setove zadataka i vježbaj bez interneta — idealno za
              putovanje ili vrijeme u autobusu.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>

  <!-- HOW IT WORKS / TRUST -->
  <section class="container mx-auto px-6 py-12 lg:px-8">
    <div class="grid items-center gap-8 lg:grid-cols-2">
      <div>
        <h3 class="text-xl font-semibold">Zašto to funkcionira</h3>
        <p class="mt-4 text-slate-700">
          MatMat kombinira dvije provjerene ideje: <strong
            >retrieval practice</strong
          >
          (aktivno prisjećanje) i <strong>spaced repetition</strong> (raspršeno ponavljanje).
          To znači da te sustav tjera da aktivno rješavaš i ponovno preispituješ
          točno u trenutku kad zaboravljanje počinje — takav pristup značajno poboljšava
          dugoročno pamćenje i transfer znanja.
        </p>

        <ul class="mt-6 space-y-3 text-sm text-slate-600">
          <li>
            Dokazi iz obrazovne psihologije pokazuju da je raspoređeno učenje
            učinkovitije od učenja "s jednoć" (cramming).
          </li>
          <li>
            Fokus na razumijevanje smanjuje mehaničko pogađanje rješenja i
            povećava sposobnost rješavanja novih zadataka.
          </li>
        </ul>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Brzi podaci</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-sm">
              <p>
                <strong>Studije:</strong> višestruke meta-analize i pregledni radovi
                potvrđuju korisnost raspoređenog učenja i ponavljanja u različitim
                kontekstima učenja.
              </p>
              <p class="mt-3 text-xs text-slate-500">
                (Navedi izvore u dokumentaciji/FAQ na webu.)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>

  <!-- TESTIMONIALS -->
  <section class="bg-slate-50 py-12">
    <div class="container mx-auto px-6 lg:px-8">
      <h3 class="text-xl font-semibold">Što kažu korisnici</h3>
      <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent>
            <p class="italic">
              "S MatMat-om sam prešao iz 3 na 5 - najviše mi je pomoglo što imam
              plan i ponavljanja."
            </p>
            <p class="mt-3 text-xs text-slate-500">— Ana, Zagreb</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p class="italic">
              "Volim kratke objašnjenja i da aplikacija zna kada da mi ponovi
              zadatak."
            </p>
            <p class="mt-3 text-xs text-slate-500">— Marko, Split</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p class="italic">
              "Jednostavno koristim 10 minuta svaki dan i vidim razliku."
            </p>
            <p class="mt-3 text-xs text-slate-500">— Ivana, Osijek</p>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>

  <!-- FAQ + FOOTER -->
  <section class="container mx-auto px-6 py-12 lg:px-8">
    <h3 class="text-xl font-semibold">Često postavljana pitanja</h3>
    <div class="mt-4 grid gap-4">
      <Card>
        <CardContent>
          <h4 class="font-medium">Je li MatMat samo flashcard app?</h4>
          <p class="mt-2 text-sm text-slate-600">
            Ne. Iako koristi ideje iz flashcard sustava za raspored ponavljanja,
            MatMat je fokusiran na rješavanje zadataka i pažljivo objašnjenje
            koncepata — cilj je razumijevanje, ne samo pamćenje.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h4 class="font-medium">
            Kako aplikacija zna kada sam spreman za ponavljanje?
          </h4>
          <p class="mt-2 text-sm text-slate-600">
            Algoritam bilježi rezultate, vrijeme rješavanja i tvoju ocjenu
            razumijevanja, te na temelju modela pamćenja (SM2 / prilagođeni
            heuristički model) određuje optimalni trenutak za sljedeće
            ponavljanje.
          </p>
        </CardContent>
      </Card>
    </div>

    <footer class="mt-12 text-sm text-slate-500">
      <p>
        © {new Date().getFullYear()} MatMat — Sretno na maturi! •
        <a href="/privacy" class="underline">Privatnost</a>
        • <a href="/terms" class="underline">Uvjeti</a>
      </p>
    </footer>
  </section>
</main>
