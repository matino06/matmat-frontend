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
  import Check from "@lucide/svelte/icons/check";

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

  const processSteps = [
    {
      number: 1,
      title: "Dobiješ zadatak i pokušaš ga riješiti",
      description:
        "Svaki zadatak je prilagođen tvojoj razini znanja i ciljevima učenja.",
      image: "/images/task_dark.png",
      icon: "pencil-alt",
    },
    {
      number: 2,
      title: "Pročitaš detaljno rješenje",
      description:
        "Ako ti ne ide, imaš pristup korak-po-korak objašnjenju s primjerima.",
      image: "/images/task_solution_dark.png",
      icon: "book-open",
    },
    {
      number: 3,
      title: "Upitaš AI asistenta",
      description: "Ako i dalje imaš problema, naš AI asistent će ti pomoći.",
      image: "/images/task_ai_dark.jpg",
      icon: "robot",
    },
    {
      number: 4,
      title: "Ocijeni težinu zadatka",
      description:
        "Tvoj feedback pomaže našem sustavu da odabere optimalne zadatke za tebe.",
      image: "/images/task_dificulty_dark.png",
      icon: "star",
    },
    {
      number: 5,
      title: "Dobiješ novi zadatak",
      description:
        "Naš algoritam prilagođava težinu i temu zadataka na temelju tvojih rezultata.",
      image: "/images/new_task_dark.png",
      icon: "forward",
    },
    {
      number: 6,
      title: "Provjeri svoj napredak",
      description:
        "Prati svoje rezultate kroz vrijeme i vidi kako se tvoje znanje poboljšava.",
      image: "/images/progress_dark.png",
      icon: "chart-bar",
    },
  ];

  let visibleSteps = [];

  onMount(() => {
    // Intersection Observer za fade-in animacije
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const stepNumber = parseInt(entry.target.dataset.step);
            if (!visibleSteps.includes(stepNumber)) {
              setTimeout(() => {
                visibleSteps = [...visibleSteps, stepNumber];
              }, stepNumber * 100); // svaka kartica kasni 150ms više
            }
          }
        });
      },
      { threshold: 0.1 },
    );

    // Observaj sve procesne kartice
    document.querySelectorAll(".process-step").forEach((el) => {
      observer.observe(el);
    });

    // Fallback za slike
    document.querySelectorAll(".process-image").forEach((img) => {
      img.onerror = function () {
        this.src =
          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMyMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjFGNUY5Ii8+CjxwYXRoIGQ9Ik0xNjAgODBDMTQzLjQgODAgMTMwIDkzLjQgMTMwIDExMEMxMzAgMTI2LjYgMTQzLjQgMTQwIDE2MCAxNDBDMTc2LjYgMTQwIDE5MCAxMjYuNiAxOTAgMTEwQzE5MCA5My40IDE3Ni42IDgwIDE2MCA4MFoiIGZpbGw9IiM5Q0EwQjEiLz4KPHBhdGggZD0iTTE0MCAxNjBIMTgwVjE4MEgxNDBWMTYwWiIgZmlsbD0iIzlDQTBCMSIvPgo8L3N2Zz4K";
        this.alt = "Slika nije dostupna";
        this.parentElement.classList.add("bg-muted");
      };
    });
  });
</script>

<main
  class="bg-background text-foreground min-h-screen transition-colors duration-300"
>
  <section class="container mx-auto px-6 pb-16 lg:px-8">
    <div class="grid items-center gap-12 lg:grid-cols-2">
      <div>
        <Badge class=" mb-4">Za maturante</Badge>
        <h1 class="text-4xl leading-tight font-extrabold sm:text-5xl">
          <span class="text-primary">MatMat</span> — priprema za maturu koja stvarno
          radi
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
              registracije – samo klik i kreni!
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
      <h2 class="text-center text-3xl font-bold sm:text-4xl">
        Što dobivaš s <span class="text-primary">MatMat</span>-om?
      </h2>
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

  <section class="bg-background py-16">
    <div class="container mx-auto px-6 lg:px-8">
      <div class="mx-auto mb-12 max-w-3xl text-center">
        <h2 class="text-3xl font-bold sm:text-4xl">
          Kako učiš s <span class="text-primary">MatMat</span>-om?
        </h2>
        <p class="text-muted-foreground mt-4 text-lg">
          Jednostavan i učinkovit proces koji se prilagođava tvojim potrebama
        </p>
      </div>

      <div
        class="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {#each processSteps as step (step.number)}
          <div
            class="process-step bg-card border-border hover:border-primary/20 fade-in-hidden rounded-xl border p-6 transition-all duration-300 hover:shadow-md"
            class:fade-in-visible={visibleSteps.includes(step.number)}
            data-step={step.number}
          >
            <div class="mb-4 flex items-start justify-between">
              <div
                class="bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold"
              >
                {step.number}
              </div>
              <div class="text-primary text-lg">
                {#if step.icon === "pencil-alt"}
                  <i class="fas fa-pencil-alt"></i>
                {:else if step.icon === "book-open"}
                  <i class="fas fa-book-open"></i>
                {:else if step.icon === "robot"}
                  <i class="fas fa-robot"></i>
                {:else if step.icon === "star"}
                  <i class="fas fa-star"></i>
                {:else if step.icon === "forward"}
                  <i class="fas fa-forward"></i>
                {:else if step.icon === "chart-bar"}
                  <i class="fas fa-chart-bar"></i>
                {/if}
              </div>
            </div>

            <h3 class="text-card-foreground mb-3 text-xl font-semibold">
              {step.title}
            </h3>
            <p class="text-muted-foreground mb-4">
              {step.description}
            </p>

            <div
              class="bg-muted mt-auto flex h-40 items-center justify-center overflow-hidden rounded-lg"
            >
              <img
                src={step.image}
                alt={step.title}
                class="process-image h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
          </div>
        {/each}
      </div>
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
        <h2 class="text-3xl font-bold sm:text-4xl">Zašto to funkcionira</h2>
        <p class="text-muted-foreground mt-4">
          MatMat kombinira dvije provjerene ideje: <strong
            >retrieval practice</strong
          >
          (aktivno prisjećanje) i <strong>spaced repetition</strong> (raspršeno ponavljanje).
          Sustav te vodi da aktivno rješavaš i ponavljaš točno kada zaboravljanje
          počinje — takav pristup značajno poboljšava dugoročno pamćenje i razumijevanje.
        </p>
        <ul class="text-muted-foreground mt-6 space-y-3 text-sm">
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
    <h2 class="text-3xl font-bold sm:text-4xl">Često postavljana pitanja</h2>
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
  .process-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  .fade-in-hidden {
    opacity: 0;
    transform: translateY(20px);
    transition:
      opacity 0.6s ease,
      transform 0.6s ease;
  }

  .fade-in-visible {
    opacity: 1;
    transform: translateY(0);
    transition:
      opacity 0.6s ease,
      transform 0.6s ease;
  }

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
