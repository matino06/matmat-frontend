<script>
  import { onMount } from "svelte";
  import { userData, handleLogIn } from "$lib/store/user.svelte";

  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Carousel from "$lib/components/ui/carousel/index.js";
  import Check from "@lucide/svelte/icons/check";

  let email = "";
  let submitted = false;

  const features = [
    {
      title: "Personalizirana ponavljanja",
      desc: "Ne radiš sve isto — MatMat uči kako ti učiš i prilagođava raspored ponavljanja tako da pamtiš gradivo dugo nakon zadnje vježbe.",
    },
    {
      title: "AI asistent",
      desc: "Ugrađeni asistent objašnjava svaki zadatak, pomaže ti razumjeti gdje si pogriješio i daje dodatne primjere kad zapneš.",
    },
    {
      title: "Praktični zadaci",
      desc: "Zadaci su usklađeni s ispitnim standardima i dolaze s varijantama za treniranje.",
    },
    {
      title: "Praćenje napretka",
      desc: "Na stranici s napretkom vidiš koliko si spreman za maturu u postotku i koja su poglavlja još zaključana — jasno znaš koliko si napredovao.",
    },
    {
      title: "Učenje s razumijevanjem",
      desc: "Uz objašnjenja korak-po-korak, aplikacija te vodi da stvarno razumiješ matematičke tehnike, ne samo da znaš rješenje.",
    },
    {
      title: "Strukturirani napredak",
      desc: "Zadaci su raspoređeni tako da prvo svladaš temeljne pojmove.",
    },
  ];

  function submitEmail() {
    submitted = true;
  }
</script>

<main
  class="bg-background text-foreground min-h-screen transition-colors duration-300"
>
  <section class="container mx-auto px-6 pb-16 lg:px-8">
    <div class="grid items-center gap-12 lg:grid-cols-2">
      <div>
        <Badge class=" mb-4">Za maturante</Badge>
        <h1 class="text-4xl leading-tight font-extrabold sm:text-5xl">
          MatMat — priprema za maturu koja stvarno radi
        </h1>
        <p class="text-muted-foreground mt-6 max-w-prose text-lg">
          Brže učiš, pamtiš bolje i rješavaš zadatke s razumijevanjem. MatMat
          koristi dokazano učinkovite metode — prilagodljivi spaced repetition +
          fokus na razumijevanje — da tvoju pripremu učini pametnijom, a ne
          dužom.
        </p>

        <div class="text-muted-foreground mt-6 flex flex-wrap gap-4 text-sm">
          <div class="flex items-center gap-2">
            <Check class="text-primary h-4 w-4" />Personalizirani plan učenja
          </div>
          <div class="flex items-center gap-2">
            <Check class="text-primary h-4 w-4" />Praćenje napretka
          </div>
          <div class="flex items-center gap-2">
            <Check class="text-primary h-4 w-4" />
            <Badge class="bg-primary text-primary-foreground"
              >100% BESPLATNO</Badge
            >
          </div>
        </div>
      </div>

      <div class="flex justify-center">
        <img
          class="w-full max-w-md rounded-2xl object-contain lg:max-w-lg"
          src="/images/ilustration.jpg"
          alt="MatMat ilustracija"
        />
      </div>
    </div>
  </section>

  {#if !userData.user}
    <section class="bg-primary text-primary-foreground py-16">
      <div class="container mx-auto px-6 lg:px-8">
        <div class="grid items-center gap-12 lg:grid-cols-2">
          <!-- Lijeva strana: tekst -->
          <div>
            <h2 class="mb-4 text-3xl font-extrabold sm:text-4xl">
              Samo se prijavi i odmah počni s učenjem
            </h2>
            <p class="text-primary-foreground/90 text-lg sm:text-xl">
              MatMat je jednostavan, učinkovit i <strong
                class="text-secondary font-[900]">besplatan</strong
              > način da ostvariš rezultat na maturi i upišeš željeni fakultet. Nema
              registracija – samo klik i kreni!
            </p>
          </div>

          <!-- Desna strana: gumb sa strelicom -->
          <div class="flex items-center justify-center lg:justify-end">
            <!-- Strelica tik uz gumb -->
            <div class="mr-8 lg:block">
              <div class="animate-bounce">
                <svg
                  class="text-secondary-foreground h-15 w-15"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="3"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  ></path>
                </svg>
              </div>
            </div>

            <Button
              onclick={handleLogIn}
              size="lg"
              class="bg-secondary text-secondary-foreground relative rounded-lg px-8 py-6 font-bold shadow-[0_6px_0_0_rgba(0,0,0,0.2)] transition-all duration-150 ease-in-out hover:translate-y-[2px] hover:shadow-[0_3px_0_0_rgba(0,0,0,0.2)] active:translate-y-[4px] active:shadow-[0_1px_0_0_rgba(0,0,0,0.2)]"
            >
              PRIJAVI SE!
            </Button>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <section class="bg-card text-card-foreground border-t py-12">
    <div class="container mx-auto px-6 lg:px-8">
      <h2 class="text-2xl font-semibold">Što dobivaš s MatMat</h2>
      <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {#each features as feature}
          <Card class="bg-card text-card-foreground border-border">
            <CardContent>
              <h3 class="font-semibold">{feature.title}</h3>
              <p class="text-muted-foreground mt-2 text-sm">{feature.desc}</p>
            </CardContent>
          </Card>
        {/each}
      </div>
    </div>
  </section>

  <section class="container mx-auto py-12">
    <div class="container mx-auto px-6 lg:px-8">
      <h2 class="mb-4 text-2xl font-semibold">Kako učiš s MatMat-om?</h2>
      <Carousel.Root class="relative">
        <Carousel.Content class="flex items-center">
          <Carousel.Item>
            <div class="mb-4 text-center">
              <p class="text-sm font-medium sm:text-base">
                Dobiješ zadatak i pokušaš ga riješiti
              </p>
            </div>
            <div
              class="border-border bg-card m-auto max-w-2xl rounded-2xl border p-3 shadow-sm"
            >
              <img
                class="h-auto w-full rounded-lg object-contain"
                src="/images/task_dark.png"
                alt="Zadatak prikaz"
              />
            </div>
          </Carousel.Item>

          <Carousel.Item>
            <div class="mb-4 text-center">
              <p class="text-sm font-medium sm:text-base">
                Ako ti ne ide, pročitaš detaljno napisan postupak rješenja
              </p>
            </div>
            <div
              class="border-border bg-card m-auto max-w-2xl rounded-2xl border p-3 shadow-sm"
            >
              <img
                class="m-auto h-auto w-full max-w-2xl rounded-2xl object-contain"
                src="/images/task_solution_dark.png"
                alt="Rješenje zadatka"
              />
            </div>
          </Carousel.Item>

          <Carousel.Item>
            <div class="mb-4 text-center">
              <p class="text-sm font-medium sm:text-base">
                Ako i dalje imaš problema, upitaš AI asistenta za pomoć
              </p>
            </div>
            <div
              class="border-border bg-card m-auto max-w-2xl rounded-2xl border p-3 shadow-sm"
            >
              <img
                class="m-auto h-auto w-full max-w-2xl rounded-2xl object-contain"
                src="/images/task_ai_dark.jpg"
                alt="AI asistent prikaz"
              />
            </div>
          </Carousel.Item>

          <Carousel.Item>
            <div class="mb-4 text-center">
              <p class="text-sm font-medium sm:text-base">
                Ocijeni koliko ti je bio težak zadatak i pritisni gumb
                "Sljedeće"
              </p>
            </div>
            <div
              class="border-border bg-card m-auto max-w-2xl rounded-2xl border p-3 shadow-sm"
            >
              <img
                class="m-auto h-auto w-full max-w-2xl rounded-2xl object-contain"
                src="/images/task_dificulty_dark.png"
                alt="Težina zadatka prikaz"
              />
            </div>
          </Carousel.Item>

          <Carousel.Item>
            <div class="mb-4 text-center">
              <p class="text-sm font-medium sm:text-base">
                Dobit ćeš novi zadatak prema svojim prethodnim odgovorima
              </p>
            </div>
            <div
              class="border-border bg-card m-auto max-w-2xl rounded-2xl border p-3 shadow-sm"
            >
              <img
                class="m-auto h-auto w-full max-w-2xl rounded-2xl object-contain"
                src="/images/new_task_dark.png"
                alt="Novi zadatak"
              />
            </div></Carousel.Item
          >

          <Carousel.Item>
            <div class="mb-4 text-center">
              <p class="text-sm font-medium sm:text-base">
                Provjeri svoj napredak
              </p>
            </div>
            <div
              class="border-border bg-card m-auto max-w-2xl rounded-2xl border p-3 shadow-sm"
            >
              <img
                class="m-auto h-auto w-full max-w-2xl rounded-2xl object-contain"
                src="/images/progress_dark.png"
                alt="Praćenje napretka prikaz"
              />
            </div>
          </Carousel.Item>
        </Carousel.Content>
        <Carousel.Previous class="absolute top-1/2 left-2 -translate-y-1/2" />
        <Carousel.Next class="absolute top-1/2 right-2 -translate-y-1/2" />
      </Carousel.Root>
    </div>
  </section>

  <section class="bg-card mx-auto px-6 py-12">
    <div class="grid items-center gap-8 lg:grid-cols-[1fr_1.3fr]">
      <div class="flex justify-center">
        <img
          class="m-auto max-h-75 w-auto rounded-2xl object-contain"
          src="/images/ilustration3.jpg"
          alt="ilustration"
        />
      </div>

      <div>
        <h3 class="text-xl font-semibold">Zašto to funkcionira</h3>
        <p class=" mt-4">
          MatMat kombinira dvije provjerene ideje: <strong
            >retrieval practice</strong
          >
          (aktivno prisjećanje) i <strong>spaced repetition</strong> (raspršeno ponavljanje).
          Sustav te vodi da aktivno rješavaš i ponavljaš točno kada zaboravljanje
          počinje — takav pristup značajno poboljšava dugoročno pamćenje i razumijevanje.
        </p>
        <ul class=" mt-6 space-y-3 text-sm">
          <li>
            Dokazi pokazuju da je raspoređeno učenje učinkovitije od učenja "s
            jednoć" (cramming).
          </li>
          <li>
            Fokus na razumijevanje smanjuje mehaničko pogađanje rješenja i
            povećava sposobnost rješavanja novih zadataka.
          </li>
        </ul>
      </div>
    </div>
  </section>

  <section class="container mx-auto px-6 py-12 lg:px-8">
    <h3 class="text-xl font-semibold">Često postavljana pitanja</h3>
    <div class="mt-4 grid gap-4">
      <Card class="bg-card text-card-foreground border-border">
        <CardContent>
          <h4 class="font-medium">Je li MatMat samo flashcard app?</h4>
          <p class="text-muted-foreground mt-2 text-sm">
            Ne. MatMat je fokusiran na rješavanje zadataka i objašnjenje
            koncepata — cilj je razumijevanje, ne samo pamćenje.
          </p>
        </CardContent>
      </Card>
      <Card class="bg-card text-card-foreground border-border">
        <CardContent>
          <h4 class="font-medium">
            Kako aplikacija zna kada sam spreman za ponavljanje?
          </h4>
          <p class="text-muted-foreground mt-2 text-sm">
            Algoritam bilježi rezultate i ponašanje te procjenjuje optimalni
            trenutak za sljedeće ponavljanje pomoću modela pamćenja.
          </p>
        </CardContent>
      </Card>
    </div>

    <footer class="text-muted-foreground mt-12 border-t pt-8 text-sm">
      <p>
        © {new Date().getFullYear()} MatMat — Sretno na maturi!
      </p>
    </footer>
  </section>
</main>

<style>
  .animate-bounce {
    animation: bounce 2s infinite;
  }

  @keyframes bounce {
    0%,
    20%,
    50%,
    80%,
    100% {
      transform: translateX(0);
    }
    40% {
      transform: translateX(25px);
    }
    60% {
      transform: translateX(5px);
    }
  }
</style>
