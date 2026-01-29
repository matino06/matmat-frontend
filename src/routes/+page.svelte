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
  import {
    Calendar,
    Bot,
    Puzzle,
    Target,
    Zap,
    TrendingUp,
    BookOpen,
    Clock,
    BarChart3,
    Brain,
    GitGraph,
    CheckCircle,
  } from "@lucide/svelte/icons";

  const features = [
    {
      title: "Personalizirana ponavljanja",
      desc: "Ne radiš sve isto — MatMat uči kako ti učiš i prilagođava raspored ponavljanja tako da pamtiš gradivo dugo nakon zadnje vježbe.",
      icon: Calendar,
      color: "text-blue-500",
    },
    {
      title: "AI asistent",
      desc: "Ugrađeni asistent objašnjava svaki zadatak, pomaže ti razumjeti gdje si pogriješio i daje dodatne primjere kad zapneš.",
      icon: Bot,
      color: "text-green-500",
    },
    {
      title: "Pomno osmišljeni zadaci",
      desc: "Svaki zadatak je pažljivo dizajniran da te nauči specifično gradivo korak po korak, strukturiran od temelja do naprednih koncepata.",
      icon: Puzzle,
      color: "text-purple-500",
    },
    {
      title: "Jasan napredak do 100%",
      desc: "Vidiš svoj napredak u postotcima - kada dosegneš 100%, znaš da si tehnički spreman za svaki zadatak na maturi.",
      icon: Target,
      color: "text-red-500",
    },
    {
      title: "Učinkovito učenje",
      desc: "Spaced repetition algoritam maksimizira tvoje znanje u danom vremenu - bolji rezultati s manje napora.",
      icon: Zap,
      color: "text-yellow-500",
    },
    {
      title: "Opipljivo mjerenje napretka",
      desc: "Pratiš svoj rast kroz vrijeme s jasnim metrikama koje pokazuju stvarno napredovanje.",
      icon: TrendingUp,
      color: "text-indigo-500",
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
  <!-- Hero sekcija -->
  <section class="container mx-auto px-6 pb-16 lg:px-8">
    <div class="grid items-center gap-12 lg:grid-cols-2">
      <div>
        <Badge class="mb-4">Za maturante</Badge>
        <h1 class="text-4xl leading-tight font-extrabold sm:text-5xl">
          <span class="text-primary">MatMat</span> — priprema za maturu koja stvarno
          radi
        </h1>
        <p class="text-muted-foreground mt-6 max-w-prose text-lg">
          Brže učiš, pamtiš bolje. MatMat koristi dokazano učinkovitu metodu —
          Spaced repetition algoritam koji osigurava da se na maturi <span
            class="text-primary">pojaviš 100% spreman</span
          >.
        </p>

        <!-- Naglašeni tekst -->
        <div
          class="border-primary bg-primary/10 mt-6 rounded-r-lg border-l-4 p-4"
        >
          <p class="text-foreground font-medium">
            "Ne razmišljaj što učiti - samo se prijavi i rješavaj zadatke koje
            ti MatMat pripremi."
          </p>
        </div>

        <div class="text-muted-foreground mt-6 flex flex-wrap gap-4 text-sm">
          <div class="flex items-center gap-2">
            <Check class="text-primary h-4 w-4" />Personalizirani plan učenja
          </div>
          <div class="flex items-center gap-2">
            <Check class="text-primary h-4 w-4" />Napredak do 100% znanja
          </div>
          <div class="flex items-center gap-2">
            <Check class="text-primary h-4 w-4" />Bolji rezultati s manje
            vremena
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
    <!-- Prijava sekcija - plava pozadina -->
    <section class="bg-primary text-primary-foreground py-16">
      <div class="container mx-auto px-6 lg:px-8">
        <div class="grid items-center gap-12 lg:grid-cols-2">
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

          <!-- Gumb sa strelicom -->
          <div class="flex items-center justify-center lg:justify-end">
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

    <!-- Sekcija s motivacijskim tekstom -->
    <section class="bg-primary/5 py-12">
      <div class="container mx-auto px-6 lg:px-8">
        <div class="mx-auto max-w-3xl text-center">
          <h3 class="mb-4 text-2xl font-bold">
            Prestani razmišljati o učenju - počni učiti
          </h3>
          <p class="text-muted-foreground text-lg">
            Većina učenika gubi vrijeme pokušavajući odgonetnuti što i kako
            učiti.
            <strong>MatMat to rješava umjesto tebe</strong> - ti se samo prijaviš
            i rješavaš.
          </p>
        </div>
      </div>
    </section>
  {/if}

  <!-- Značajke sekcija -->
  <section class="bg-card text-card-foreground border-t py-12">
    <div class="container mx-auto px-6 lg:px-8">
      <h2 class="text-center text-3xl font-bold sm:text-4xl">
        Što dobivaš s <span class="text-primary">MatMat</span>-om?
      </h2>
      <p
        class="text-muted-foreground mx-auto mt-4 max-w-2xl text-center text-lg"
      >
        Kompletan sustav koji te vodi od početka do potpunog savladavanja
        gradiva
      </p>
      <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {#each features as feature}
          <Card
            class="border-border bg-card text-card-foreground group hover:border-primary/20 transition-all duration-300 hover:shadow-lg"
          >
            <CardContent class="p-6">
              <div class="mb-4 flex items-center justify-between">
                <div
                  class="bg-primary/10 rounded-lg p-3 transition-transform duration-300 group-hover:scale-110"
                >
                  <svelte:component
                    this={feature.icon}
                    class={`h-6 w-6 ${feature.color}`}
                  />
                </div>
              </div>
              <h3
                class="group-hover:text-primary text-lg font-semibold transition-colors"
              >
                {feature.title}
              </h3>
              <p class="text-muted-foreground mt-3 text-sm leading-relaxed">
                {feature.desc}
              </p>
            </CardContent>
          </Card>
        {/each}
      </div>
    </div>
  </section>

  <!-- Proces učenja sekcija -->
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

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {#each processSteps as step (step.number)}
          <div
            class="process-step fade-in-hidden border-border bg-card hover:border-primary/20 rounded-xl border p-6 transition-all duration-300 hover:shadow-md"
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

  <!-- 100% znanja sekcija -->
  <section class="bg-primary/5 py-16">
    <div class="container mx-auto px-6 lg:px-8">
      <div class="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 class="text-3xl font-bold sm:text-4xl">
            Kako doseći <span class="text-primary">100% znanja</span> za maturu?
          </h2>
          <div class="mt-6 space-y-4">
            <div class="flex items-start gap-4">
              <div
                class="bg-primary text-primary-foreground mt-1 rounded-full p-2"
              >
                <Check class="h-4 w-4" />
              </div>
              <div>
                <h3 class="font-semibold">Samo rješavaj</h3>
                <p class="text-muted-foreground mt-1 text-sm">
                  Nema razmišljanja što učiti - sustav automatski odabire
                  zadatke koji te vode do 100% znanja
                </p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div
                class="bg-primary text-primary-foreground mt-1 rounded-full p-2"
              >
                <Check class="h-4 w-4" />
              </div>
              <div>
                <h3 class="font-semibold">Strukturirani put</h3>
                <p class="text-muted-foreground mt-1 text-sm">
                  Gradivo je podijeljeno na logičke cjeline koje se uče korak po
                  korak
                </p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div
                class="bg-primary text-primary-foreground mt-1 rounded-full p-2"
              >
                <Check class="h-4 w-4" />
              </div>
              <div>
                <h3 class="font-semibold">Pametno ponavljanje</h3>
                <p class="text-muted-foreground mt-1 text-sm">
                  Algoritam određuje optimalno vrijeme za ponavljanje - nema
                  gubljenja vremena
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-center">
          <img
            class="w-full max-w-md rounded-2xl object-contain"
            src="/images/progress_ring_100_dark.png"
            alt="Napredak do 100% znanja"
          />
        </div>
      </div>
    </div>
  </section>

  <!-- Zašto funkcionira sekcija -->
  <section class="bg-card text-card-foreground py-12">
    <div class="container mx-auto px-6 lg:px-8">
      <div class="grid items-center gap-8 lg:grid-cols-2">
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
            (aktivno prisjećanje) i <strong>spaced repetition</strong> (raspršeno
            ponavljanje).
          </p>
          <p class="text-muted-foreground mt-4">
            <strong>Spaced repetition maximizira tvoje znanje:</strong> Umjesto da
            gubiš vrijeme na nepotrebna ponavljanja, sustav te vodi kroz gradivo
            točno onda kada ti je potrebno - što rezultira boljim rezultatima s manje
            vremena uloženog.
          </p>
          <p class="text-muted-foreground mt-4">
            <strong>Pratimo tvoj napredak:</strong> Svaki zadatak koji rješavaš doprinosi
            tvojoj ukupnoj pripremljenosti. Kada vidiš 100%, znaš da si spreman.
          </p>
          <ul class="text-muted-foreground mt-6 space-y-3 text-sm">
            <li class="flex items-start gap-2">
              <Check class="text-primary mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>Postigni bolje rezultate nego s tradicionalnim učenjem</span
              >
            </li>
            <li class="flex items-start gap-2">
              <Check class="text-primary mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>Vidi opipljiv napredak svaki dan</span>
            </li>
            <li class="flex items-start gap-2">
              <Check class="text-primary mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>Nema nagađanja - znaš točno gdje stojiš</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ i footer sekcija -->
  <section class="container mx-auto px-6 py-12 lg:px-8">
    <h2 class="text-3xl font-bold sm:text-4xl">Često postavljana pitanja</h2>
    <div class="mt-4 grid gap-4">
      <Card class="border-border bg-card text-card-foreground">
        <CardContent>
          <h4 class="font-medium">Je li MatMat samo flashcard app?</h4>
          <p class="text-muted-foreground mt-2 text-sm">
            Ne. MatMat je fokusiran na rješavanje zadataka i objašnjenje
            koncepata — cilj je razumijevanje, ne samo pamćenje.
          </p>
        </CardContent>
      </Card>

      <Card class="border-border bg-card text-card-foreground">
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

      <Card class="border-border bg-card text-card-foreground">
        <CardContent>
          <h4 class="font-medium">
            Zašto trebam odabrati težinu zadatka nakon rješavanja?
          </h4>
          <p class="text-muted-foreground mt-2 text-sm">
            Ocjena težine pomaže algoritmu da bolje razumije tvoje trenutno
            znanje i prilagodi buduće zadatke. Ako ti je zadatak bio težak,
            sustav će usporiti tempo i ponoviti gradivo dok ga potpuno ne
            svladaš. Na taj način MatMat uči kako ti učiš — i vodi te prema 100%
            znanja bez gubljenja vremena.
          </p>
        </CardContent>
      </Card>
    </div>
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
