<script>
  import { onMount } from "svelte";
  import { userData, handleLogIn } from "$lib/store/user.svelte";
  import { goto } from "$app/navigation";
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
      description: "Ako i dalje imaš problemi, naš AI asistent će ti pomoći.",
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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const stepNumber = parseInt(entry.target.dataset.step);
            if (!visibleSteps.includes(stepNumber)) {
              setTimeout(() => {
                visibleSteps = [...visibleSteps, stepNumber];
              }, stepNumber * 100);
            }
          }
        });
      },
      { threshold: 0.1 },
    );

    document.querySelectorAll(".process-step").forEach((el) => {
      observer.observe(el);
    });

    document.querySelectorAll(".process-image").forEach((img) => {
      img.onerror = function () {
        this.src =
          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMyMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjFGNUY5Ii8+CjxwYXRoIGQ9Ik0xNjAgODBDMTQzLjQgODAgMTMwIDkzLjQgMTMwIDExMEMxMzAgMTI2LjYgMTQzLjQgMTQwIDE2MCAxNDBDMTc2LjYgMTQwIDE5MCAxMjYuNiAxOTAgMTEwQzE5MCA5My40IDE3Ni42IDgwIDE2MCA4MFoiIGZpbGw9IiM5Q0EwQjEiLz4KPHBhdGggZD0iTTE0MCAxNjBIMTgwVjE4MEgxNDBWMTYwWiIgZmlsbD0iIzlDQTBCMSIvPgo8L3N2Zz4K";
        this.alt = "Slika nije dostupna";
        this.parentElement.classList.add("bg-muted");
      };
    });
  });

  // Function to navigate to tasks page
  function goToTasks() {
    goto("/tasks");
  }
</script>

<main
  class="bg-background text-foreground min-h-screen transition-colors duration-300"
>
  <!-- Hero section -->
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

  <!-- Na homepage, iza hero sekcije -->
  <section class="bg-gradient-to-r from-blue-50 to-indigo-50 py-16">
    <div class="container mx-auto px-6 lg:px-8">
      <div class="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <Badge class="mb-4 border-none bg-blue-100 text-blue-800"
            >U medijima</Badge
          >
          <h2 class="mb-4 text-3xl font-bold text-gray-800">
            Pročitajte našu priču na Srednja.hr
          </h2>
          <p class="mb-6 text-lg text-gray-600">
            "U srednjoj nije imao fiziku, ali ju je 'rasturio' na maturi i
            upisao FER: Sad aplikacijom pomaže maturantima"
          </p>
          <div class="space-y-3">
            <p class="text-gray-500">
              <strong>Ključni uvidi iz članka:</strong>
            </p>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-start gap-2">
                <svg
                  class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                <span
                  >Personalizirano učenje temeljeno na spaced repetition</span
                >
              </li>
              <li class="flex items-start gap-2">
                <svg
                  class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                <span>AI asistent dostupan 24/7</span>
              </li>
              <li class="flex items-start gap-2">
                <svg
                  class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                <span>Potpuno besplatno za sve maturante</span>
              </li>
            </ul>
          </div>
          <div class="mt-8 flex gap-4">
            <Button
              as="a"
              href="https://www.srednja.hr/matura/u-srednjoj-nije-imao-fiziku-ali-ju-je-rasturio-na-maturi-i-upisao-fer-sad-aplikacijom-pomaze-maturantima/"
              class="bg-blue-600 hover:bg-blue-700"
            >
              Pročitaj članak
            </Button>
            <Button class="text-black" as="a" href="/about" variant="outline"
              >O nama</Button
            >
          </div>
        </div>
        <div class="flex justify-center">
          <div class="relative">
            <img
              src="/images/srednja-hr-feature.png"
              alt="Srednja.hr članak o MatMatu"
              class="rounded-2xl shadow-2xl"
            />
            <div
              class="absolute -right-4 -bottom-4 rounded-lg bg-white p-3 shadow-lg"
            >
              <p class="text-sm font-semibold text-gray-800">Srednja.hr</p>
              <p class="text-xs text-gray-500">24. siječnja 2026.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  {#if !userData.user}
    <!-- SignUp section (only for logged out users) -->
    <section class="bg-primary text-primary-foreground py-16">
      <div class="container mx-auto px-6 lg:px-8">
        <div class="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 class="mb-4 text-3xl font-extrabold sm:text-4xl">
              Samo se prijavi i odmah počni s učenjem
            </h2>
            <p class="text-primary-foreground/90 text-lg sm:text-xl">
              MatMat mijenja način na koji se maturanti pripremaju za maturu. Ne
              radi se samo o učenju – radi se o <strong
                class="text-secondary font-[900]"
                >pametnijem, učinkovitijem i bezbolnijem</strong
              > putu do 100% znanja.
            </p>
          </div>

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

    <!-- Motivation section (only for logged out users) -->
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
  {:else}
    <!-- Start Solving section (only for logged in users) -->
    <section class="from-primary/20 to-primary/5 bg-gradient-to-r py-16">
      <div class="container mx-auto px-6 lg:px-8">
        <div class="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 class="mb-4 text-3xl font-extrabold sm:text-4xl">
              Počni rješavati zadatke!
            </h2>
            <p class="text-lg sm:text-xl">
              Dobrodošli natrag! Tvoj personalizirani plan učenja te čeka.
              Nastavi svoje učenje i napreduj prema 100% znanja.
            </p>
            <div class="mt-8">
              <Button
                onclick={goToTasks}
                size="xl"
                class="bg-primary hover:bg-primary/90 text-primary-foreground relative rounded-lg px-12 py-7 text-lg font-bold shadow-lg transition-all duration-150 ease-in-out hover:shadow-xl"
              >
                <svg
                  class="mr-3 h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
                POČNI RJEŠAVATI
              </Button>
            </div>
          </div>

          <div class="flex justify-center">
            <img
              class="w-full max-w-md rounded-2xl object-contain shadow-lg"
              src="/images/ilustration2.jpg"
              alt="Rješavanje zadataka"
            />
          </div>
        </div>
      </div>
    </section>
  {/if}

  <!-- Features section -->
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

  <section class="bg-secondary py-16">
    <div class="container mx-auto px-6 lg:px-8">
      <div class="mb-12 text-center">
        <h2 class="mb-4 text-3xl font-bold text-gray-800">
          MatMat mijenja način pripreme za maturu
        </h2>
        <p class="mx-auto max-w-2xl text-lg text-gray-600">
          Pokretač revolucije u učenju maturanta
        </p>
      </div>

      <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div class="text-center">
          <div
            class="bg-primary/10 mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full"
          >
            <svg
              class="text-primary h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              ></path>
            </svg>
          </div>
          <h3 class="mb-2 text-xl font-bold text-gray-700">5x učinkovitije</h3>
          <p class="text-gray-600">Ne uči duže, uči pametnije</p>
        </div>

        <div class="text-center">
          <div
            class="bg-primary/10 mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full"
          >
            <div class="text-primary text-xl font-bold">250+</div>
          </div>
          <h3 class="mb-2 text-xl font-bold text-gray-700">
            Maturanata već se prijavilo
          </h3>
          <p class="text-gray-600">Pridruži se rastućoj zajednici</p>
        </div>

        <div class="text-center">
          <div
            class="bg-primary/10 mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full"
          >
            <svg
              class="text-primary h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              ></path>
            </svg>
          </div>
          <h3 class="mb-2 text-xl font-bold text-gray-700">
            Znanstveno dokazano
          </h3>
          <p class="text-gray-600">Temeljeno na psihologiji učenja</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Learning process section -->
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

  <!-- 100% knowledge section -->
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

  <!-- Why it works section -->
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

  {#if !userData.user}
    <section class="from-primary/5 bg-gradient-to-br to-blue-50 py-16">
      <div class="container mx-auto px-6 lg:px-8">
        <div class="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge class="bg-primary/10 text-primary mb-4 border-none"
              >Budućnost učenja</Badge
            >
            <h2 class="mb-4 text-3xl font-bold text-gray-800">
              Želiš biti dio promjene?
            </h2>
            <p class="mb-6 text-lg text-gray-600">
              MatMat nije samo aplikacija za učenje. To je <strong
                >revolucija u pripremi za maturu</strong
              > koja mijenja način na koji generacije maturanata uče.
            </p>

            <div class="space-y-4">
              <div class="flex items-start gap-3">
                <svg
                  class="mt-1 h-5 w-5 flex-shrink-0 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                <div>
                  <p class="font-medium text-gray-800">
                    Prvi korak ka modernoj edukaciji
                  </p>
                  <p class="text-sm text-gray-600">
                    Budi dio nečeg novog od samog početka
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <svg
                  class="mt-1 h-5 w-5 flex-shrink-0 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                <div>
                  <p class="font-medium text-gray-800">
                    250+ maturanata već je odabralo MatMat
                  </p>
                  <p class="text-sm text-gray-600">
                    Pridruži se rastućoj zajednici
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <svg
                  class="mt-1 h-5 w-5 flex-shrink-0 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                <div>
                  <p class="font-medium text-gray-800">
                    Oblikuj budućnost pripreme za maturu
                  </p>
                  <p class="text-sm text-gray-600">
                    Tvoj feedback pomaže nam da budemo još bolji
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-8">
              <Button
                onclick={handleLogIn}
                class="bg-primary hover:bg-primary/90 px-8 py-4 text-white"
              >
                <svg
                  class="mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  ></path>
                </svg>
                Pridruži se revoluciji
              </Button>
            </div>
          </div>

          <div class="flex justify-center">
            <div class="relative">
              <img
                src="/images/ilustration2.jpg"
                alt="Budućnost učenja"
                class="rounded-2xl shadow-xl"
              />
              <div
                class="absolute -right-4 -bottom-4 rounded-lg bg-white p-4 shadow-lg"
              >
                <p class="text-sm font-semibold text-gray-800">
                  Revolucija u učenju
                </p>
                <p class="text-xs text-gray-500">Budi dio promjene</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <!-- FAQ and footer section -->
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
