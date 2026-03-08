<script>
  import { goto } from "$app/navigation";
  import { userData, handleLogIn } from "$lib/store/user.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Brain,
    TrendingUp,
    PlayCircle,
    Clock,
    RefreshCw,
    Zap,
    BookOpen,
    BarChart2,
    Check,
    Lock,
    ChevronRight,
    Bot,
    Target,
    Ruler,
  } from "@lucide/svelte/icons";

  function goToTasks() {
    goto("/tasks");
  }

  const forgettingCurve = [
    { day: "Dan 1",  without: 100, with: 100 },
    { day: "Dan 2",  without: 58,  with: 95  },
    { day: "Dan 4",  without: 32,  with: 92  },
    { day: "Dan 7",  without: 18,  with: 88  },
    { day: "Dan 14", without: 9,   with: 85  },
    { day: "Dan 30", without: 4,   with: 80  },
  ];

  const steps = [
    { step: "1", text: "Rješavaš zadatak iz nekog koncepta.", icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
    { step: "2", text: "MatMat bilježi je li ti bilo lako ili teško.", icon: BarChart2, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { step: "3", text: "Algoritam izračuna kada ćeš ga najvjerojatnije zaboraviti.", icon: Clock, color: "text-green-500", bg: "bg-green-500/10" },
    { step: "4", text: "Zadatak se vraća točno tada — ponavljanje produžuje pamćenje.", icon: RefreshCw, color: "text-primary", bg: "bg-primary/10" },
  ];

  const features = [
    { icon: BookOpen, title: "Detaljna rješenja", desc: "Svaki zadatak objašnjen korak po korak.", color: "text-primary", bg: "bg-primary/10" },
    { icon: Bot, title: "AI asistent", desc: "Pitaj kad zapneš — odmah dobiješ odgovor.", color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { icon: Target, title: "Točno tvoja razina", desc: "Zadaci prilagođeni onome što trenutno učiš.", color: "text-green-500", bg: "bg-green-500/10" },
    { icon: Ruler, title: "A i B razina", desc: "Odaberi razinu mature koja ti odgovara.", color: "text-primary", bg: "bg-primary/10" },
  ];

  const chain = [
    { label: "Jednadžbe", done: true },
    { label: "Nejednadžbe", done: true },
    { label: "Sustavi jednadžbi", active: true },
    { label: "Kvadratne jednadžbe", locked: true },
  ];
</script>

<main class="bg-background text-foreground min-h-screen">

  <!-- Hero section -->
  <section class="container mx-auto px-4 pt-16 pb-20 text-center space-y-5 max-w-3xl">
    <div class="bg-primary/10 mx-auto w-fit rounded-full p-4">
      <Brain class="text-primary h-12 w-12" />
    </div>
    <h1 class="text-4xl font-extrabold tracking-tight sm:text-5xl leading-tight">
      Zašto MatMat učenje<br />zaista funkcionira?
    </h1>
    <p class="text-muted-foreground mx-auto max-w-xl text-xl leading-relaxed">
      Nije dovoljno samo rješavati zadatke. Važno je <em>kada</em> ih rješavaš — i to je ono što MatMat radi umjesto tebe.
    </p>
  </section>

  <!-- 1. Problem with traditional studying — text left, graphic right -->
  <section class="container mx-auto px-4 py-12 md:py-16 lg:py-20">
    <div class="grid items-center gap-8 md:gap-12 grid-cols-1 lg:grid-cols-2 w-full">

      <!-- Text -->
      <div class="text-center lg:text-left max-w-2xl mx-auto lg:mx-0 space-y-5">
        <div class="flex items-center gap-3 justify-center lg:justify-start">
          <div class="bg-yellow-500/10 rounded-full p-4 shrink-0">
            <Clock class="h-8 w-8 text-yellow-500" />
          </div>
          <h2 class="text-2xl font-extrabold sm:text-3xl">Problem s klasičnim učenjem</h2>
        </div>
        <p class="text-muted-foreground text-lg leading-relaxed">
          Kad učiš tako da pročitaš gradivo ili napraviš zadatke jednom — mozak to brzo zaboravi.
          Istraživanja pokazuju da bez ponavljanja zaboraviš <strong class="text-foreground">više od 50% gradiva već za 24 sata</strong>,
          a za tjedan dana ostaje samo oko 20%.
        </p>
        <p class="text-muted-foreground text-lg leading-relaxed">
          Većina učenika to pokušava riješiti tako da uče dulje i dulje — ali problem nije
          u količini vremena, nego u <strong class="text-foreground">načinu na koji je to vrijeme raspoređeno</strong>.
        </p>
      </div>

      <!-- Graphic: forgetting curve -->
      <div class="flex justify-center">
        <div class="w-full max-w-md space-y-4">
          <p class="text-sm font-bold text-muted-foreground uppercase tracking-wider text-center">Koliko gradiva ostaje u sjećanju</p>
          <div class="space-y-3">
            {#each forgettingCurve as point}
              <div class="grid grid-cols-[70px_1fr] items-center gap-4">
                <span class="text-sm text-muted-foreground font-medium">{point.day}</span>
                <div class="space-y-1.5">
                  <div class="flex items-center gap-2">
                    <div class="h-3 rounded-full bg-muted overflow-hidden flex-1">
                      <div class="h-full rounded-full bg-primary" style="width: {point.without}%"></div>
                    </div>
                    <span class="text-xs text-muted-foreground w-8 text-right">{point.without}%</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="h-3 rounded-full bg-muted overflow-hidden flex-1">
                      <div class="h-full rounded-full bg-chart-2" style="width: {point.with}%"></div>
                    </div>
                    <span class="text-xs text-muted-foreground w-8 text-right">{point.with}%</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
          <div class="flex items-center gap-6 pt-1">
            <div class="flex items-center gap-2">
              <div class="h-3 w-8 rounded-full bg-primary"></div>
              <span class="text-sm text-muted-foreground">Bez ponavljanja</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="h-3 w-8 rounded-full bg-chart-2"></div>
              <span class="text-sm text-muted-foreground">Sa spaced repetition</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>

  <!-- 2. What is spaced repetition — graphic left, text right -->
  <section class="container mx-auto px-4 py-12 md:py-16 lg:py-20">
    <div class="grid items-center gap-8 md:gap-12 grid-cols-1 lg:grid-cols-2 w-full">

      <!-- Text -->
      <div class="text-center lg:text-left max-w-2xl mx-auto lg:mx-0 space-y-5">
        <div class="flex items-center gap-3 justify-center lg:justify-start">
          <div class="bg-primary/10 rounded-full p-4 shrink-0">
            <RefreshCw class="text-primary h-8 w-8" />
          </div>
          <h2 class="text-2xl font-extrabold sm:text-3xl">Što je spaced repetition?</h2>
        </div>
        <p class="text-muted-foreground text-lg leading-relaxed">
          Spaced repetition je metoda učenja koja se temelji na jednom principu:
          <strong class="text-foreground">ponavljaj gradivo točno u trenutku kada ga počinješ zaboravljati</strong> —
          ne ranije, ne kasnije.
        </p>
        <p class="text-muted-foreground text-lg leading-relaxed">
          Svaki put kad uspješno riješiš zadatak, taj zadatak se vraća malo kasnije.
          Svaki put kad pogriješiš, vraća se brže. Na taj način mozak gradi
          dugotrajno pamćenje uz minimalno ponavljanje.
        </p>
        <p class="text-muted-foreground text-lg leading-relaxed">
          Rezultat toga je da <strong class="text-foreground">za isto uloženo vrijeme znaš više</strong> nego da si učio klasično —
          ili obrnuto, možeš postići isti rezultat uz znatno manje sati učenja.
        </p>
      </div>

      <!-- Graphic: steps (left on lg) -->
      <div class="flex justify-center lg:order-first">
        <div class="w-full max-w-md space-y-1">
          {#each steps as item}
            <div class="flex items-start gap-4 py-3 border-b border-border last:border-0">
              <div class="rounded-xl {item.bg} p-4 shrink-0">
                <svelte:component this={item.icon} class="h-8 w-8 {item.color}" />
              </div>
              <div class="flex items-center gap-3 pt-0.5">
                <span class="font-mono text-sm font-bold text-muted-foreground shrink-0">{item.step}.</span>
                <p class="text-base text-foreground leading-relaxed">{item.text}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>

    </div>
  </section>

  <!-- 3. Topics build on each other — text left, graphic right -->
  <section class="container mx-auto px-4 py-12 md:py-16 lg:py-20">
    <div class="grid items-center gap-8 md:gap-12 grid-cols-1 lg:grid-cols-2 w-full">

      <!-- Text -->
      <div class="text-center lg:text-left max-w-2xl mx-auto lg:mx-0 space-y-5">
        <div class="flex items-center gap-3 justify-center lg:justify-start">
          <div class="bg-chart-2/10 rounded-full p-4 shrink-0">
            <TrendingUp class="h-8 w-8 text-chart-2" />
          </div>
          <h2 class="text-2xl font-extrabold sm:text-3xl">Gradivo koje gradi na sebi</h2>
        </div>
        <p class="text-muted-foreground text-lg leading-relaxed">
          Matematika nije skup nepovezanih tema — svaka nova tema ovisi o prethodnoj.
          Zato MatMat ne dopušta preskakanje.
          <strong class="text-foreground">Ne možeš učiti linearne nejednadžbe dok nisi savladao linearne jednadžbe.</strong>
        </p>
        <p class="text-muted-foreground text-lg leading-relaxed">
          To znači da nikad ne gubiš vrijeme na temu za koju još nisi spreman,
          i nikad nema rupa u znanju koje bi te iznenadile na maturi.
        </p>
      </div>

      <!-- Graphic: lock chain -->
      <div class="flex justify-center">
        <div class="w-full max-w-sm space-y-3">
          <p class="text-sm font-bold text-muted-foreground uppercase tracking-wider text-center">Primjer napredovanja</p>
          <div class="space-y-2">
            {#each chain as item, i}
              <div class="flex items-center gap-3">
                {#if i > 0}
                  <div class="ml-4 h-4 w-[1px] bg-primary"></div>
                {/if}
              </div>
              <div class="flex items-center gap-3">
                <div class="h-8 w-8 rounded-full flex items-center justify-center shrink-0
                  {item.done ? 'bg-primary text-white' : ''}
                  {item.active ? 'bg-yellow-500/20 text-yellow-600 border-2 border-yellow-500/40' : ''}
                  {item.locked ? 'bg-muted text-muted-foreground' : ''}
                ">
                  {#if item.done}
                    <Check class="h-4 w-4" />
                  {:else if item.locked}
                    <Lock class="h-4 w-4" />
                  {:else}
                    <ChevronRight class="h-4 w-4" />
                  {/if}
                </div>
                <span class="text-base font-semibold
                  {item.done ? 'text-primary' : ''}
                  {item.active ? 'text-yellow-600' : ''}
                  {item.locked ? 'text-muted-foreground' : ''}
                ">{item.label}</span>
                {#if item.done}
                  <span class="text-xs text-muted-foreground ml-auto">Savladano</span>
                {:else if item.active}
                  <span class="text-xs text-muted-foreground ml-auto">U tijeku</span>
                {:else}
                  <span class="text-xs text-muted-foreground ml-auto">Zaključano</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>

    </div>
  </section>

  <!-- 4. Learning with understanding — graphic left, text right -->
  <section class="container mx-auto px-4 py-12 md:py-16 lg:py-20">
    <div class="grid items-center gap-8 md:gap-12 grid-cols-1 lg:grid-cols-2 w-full">

      <!-- Text -->
      <div class="text-center lg:text-left max-w-2xl mx-auto lg:mx-0 space-y-5">
        <div class="flex items-center gap-3 justify-center lg:justify-start">
          <div class="bg-yellow-500/10 rounded-full p-4 shrink-0">
            <Zap class="h-8 w-8 text-yellow-500" />
          </div>
          <h2 class="text-2xl font-extrabold sm:text-3xl">Učiš s razumijevanjem, ne napamet</h2>
        </div>
        <p class="text-muted-foreground text-lg leading-relaxed">
          Zadaci na MatMatu nisu osmišljeni da provjere znaš li postupak napamet —
          osmišljeni su tako da <strong class="text-foreground">moraš razumjeti što radiš</strong> da bi ih uopće mogao riješiti.
        </p>
        <p class="text-muted-foreground text-lg leading-relaxed">
          Svako objašnjenje je napisano detaljno, korak po korak, i tamo gdje je potrebno
          popraćeno slikama. Kad jednom razumiješ zašto nešto funkcionira,
          <strong class="text-foreground">lakše ti je riješiti i zadatke koje nisi nikad vidio</strong>.
        </p>
      </div>

      <!-- Graphic: features grid (left on lg) -->
      <div class="flex justify-center lg:order-first">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 w-full max-w-xl">
          {#each features as item}
            <div class="flex items-start gap-4">
              <div class="rounded-xl {item.bg} p-4 shrink-0">
                <svelte:component this={item.icon} class="h-8 w-8 {item.color}" />
              </div>
              <div>
                <div class="font-bold text-base">{item.title}</div>
                <div class="text-muted-foreground text-base mt-0.5 leading-relaxed">{item.desc}</div>
              </div>
            </div>
          {/each}
        </div>
      </div>

    </div>
  </section>

  <!-- CTA -->
  <section class="container mx-auto px-4 py-12 md:py-16 lg:py-20 text-center">
    <h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">Spreman za početak?</h2>
    <p class="text-muted-foreground mt-4 text-lg max-w-2xl mx-auto">
      Registracija traje manje od minute. I besplatno je.
    </p>
    <Button
      onclick={userData.user ? goToTasks : handleLogIn}
      size="lg"
      class="mt-8 bg-primary text-white relative rounded-lg px-12 py-6 font-bold shadow-[0_6px_0_0_rgba(255,32,86,0.6)] transition-all duration-150 ease-in-out hover:translate-y-[2px] hover:shadow-[0_3px_0_0_rgba(0,0,0,0.2)] active:translate-y-[4px] active:shadow-[0_1px_0_0_rgba(0,0,0,0.2)]"
    >
      POČNI UČITI
    </Button>
  </section>

</main>