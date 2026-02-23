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

  let personalizedLearningImage = $state();
  let progressPageImage = $state();
  let goalsPageImage = $state();

  onMount(() => {
    const isDark = document.documentElement.classList.contains('dark');

    if (isDark) {
      personalizedLearningImage = "/images/personalized_learn.png";
      progressPageImage = "/images/progress_page_dark.png";
      goalsPageImage = "/images/goals_page_dark.png";
    } else {
      personalizedLearningImage = "/images/personalized_learn_light.png";
      progressPageImage = "/images/progress_page_light.png";
      goalsPageImage = "/images/goals_page.png";
    }

    // pratimo promjene dark moda
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      if (dark) {
        personalizedLearningImage = "/images/personalized_learn.png";
        progressPageImage = "/images/progress_page_dark.png";
        goalsPageImage = "/images/goals_page_dark.png";
      } else {
        personalizedLearningImage = "/images/personalized_learn_light.png";
        progressPageImage = "/images/progress_page_light.png";
        goalsPageImage = "/images/goals_page.png";
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  });

  // Function to navigate to tasks page
  function goToTasks() {
    goto("/tasks");
  }
</script>

<main
  class="bg-background text-foreground min-h-screen transition-colors duration-300"
>
  <!-- Hero Section -->
  <section class="container mx-auto px-4 py-12 md:py-16 lg:py-20 flex items-center">
    <div class="grid items-center gap-8 md:gap-12 grid-cols-1 lg:grid-cols-2 w-full">
      <div class="text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
          Najefikasnija Priprema Mature<br />iz Matematike
        </h1>
        <p class="text-muted-foreground mt-4 md:mt-6 text-base sm:text-lg md:text-xl max-w-prose mx-auto lg:mx-0">
          Brže učiš, pamtiš bolje. MatMat koristi dokazano učinkoviti algoritam
          <span class="text-primary"> koji</span> osigurava da se na maturi <span class="text-primary">pojaviš 100% spreman</span>.
        </p>

        <Button
          onclick={userData.user ? goToTasks : handleLogIn}
          size="lg"
          class="mt-6 md:mt-8 bg-primary text-white relative rounded-lg px-8 sm:px-12 md:px-16 py-4 md:py-6 font-bold shadow-[0_6px_0_0_rgba(255,32,86,0.6)] transition-all duration-150 ease-in-out hover:translate-y-[2px] hover:shadow-[0_3px_0_0_rgba(0,0,0,0.2)] active:translate-y-[4px] active:shadow-[0_1px_0_0_rgba(0,0,0,0.2)] w-full sm:w-auto"
        >
          ZAPOČNI UČENJE
        </Button>
      </div>

      <div class="flex justify-center order-first lg:order-last">
        <img class="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl rounded-2xl object-contain" src="/images/ilustration.jpg" alt="MatMat ilustracija" />
      </div>
    </div>
  </section>

  <!-- Ticker (staticki, bez animacije) -->
  <div class="w-full bg-muted py-3">
    <div class="flex flex-wrap items-center justify-center gap-2 text-sm sm:text-base md:text-lg">
      <span class="font-semibold text-muted-foreground">Dodana podrška za:</span>
      <span class="font-semibold text-muted-foreground">Matematika A razina</span>
      <span class="text-muted-foreground/40">·</span>
      <span class="font-semibold text-muted-foreground">Matematika B razina</span>
    </div>
  </div>

  <!-- Koncepti koji kliknu -->
  <section class="container mx-auto px-4 py-12 md:py-16 lg:py-20 flex items-center">
    <div class="grid items-center gap-8 md:gap-12 grid-cols-1 lg:grid-cols-2 w-full">
      <div class="flex justify-center order-first">
        <img 
          src="/images/3d_tasks_photo.png"
          alt="MatMat ilustracija"
          class="w-full max-w-sm sm:max-w-md md:max-w-lg rounded-2xl object-contain"
          style="filter: drop-shadow(0 0 1px rgb(9,9,11)) drop-shadow(0 0 1px rgb(9,9,11))"
        />      
      </div>
      <div class="text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
          Koncepti koji kliknu
        </h2>
        <p class="text-muted-foreground mt-4 md:mt-6 text-base sm:text-lg md:text-xl max-w-prose">
          Svaki zadatak te uči nešto novo, a objašnjenja korak po korak čine čak i 
          najsloženije ideje intuitivnima.
        </p>
      </div>
    </div>
  </section>

  <!-- Personalizirano učenje -->
  <section class="container mx-auto px-4 py-12 md:py-16 lg:py-20 flex items-center">
    <div class="grid items-center gap-8 md:gap-12 grid-cols-1 lg:grid-cols-2 w-full">
      <div class="text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
          Personalizirano učenje
        </h2>
        <p class="text-muted-foreground mt-4 md:mt-6 text-base sm:text-lg md:text-xl max-w-prose">
          MatMat prati koncepte koje si savladao, temeljem tvog 
          napretka nudi ti zadatke i prilagođava se tvom tempu.
        </p>
      </div>
      <div class="flex justify-center order-first lg:order-last">
        <img 
          src={personalizedLearningImage}
          alt="MatMat ilustracija"
          class="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-3xl rounded-2xl object-contain"
        />      
      </div>
    </div>
  </section>

  <!-- Prati svoj napredak -->
  <section class="container mx-auto px-4 py-12 md:py-16 lg:py-20 flex items-center">
    <div class="grid items-center gap-8 md:gap-12 grid-cols-1 lg:grid-cols-2 w-full">
      <div class="flex justify-center order-first">
        <img 
          src={progressPageImage}
          alt="MatMat ilustracija"
          class="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-3xl rounded-2xl object-contain"
        />      
      </div>
      <div class="text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
          Prati svoj napredak
        </h2>
        <p class="text-muted-foreground mt-4 md:mt-6 text-base sm:text-lg md:text-xl max-w-prose">
          U svakom trenutku znaš gdje si jer vidiš koliko si trenutno spreman za maturu i
          vidiš lekcije koje si savladao, kao i one na kojima još radiš.
        </p>
      </div>
    </div>
  </section>

  <!-- Ostani motiviran -->
  <section class="container mx-auto px-4 py-12 md:py-16 lg:py-20 flex items-center">
    <div class="grid items-center gap-8 md:gap-12 grid-cols-1 lg:grid-cols-2 w-full">
      <div class="text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
          Ostani motiviran
        </h2>
        <p class="text-muted-foreground mt-4 md:mt-6 text-base sm:text-lg md:text-xl max-w-prose">
          Olakšavamo ti stvaranje navike učenja za maturu, uz izazove i podsjetnike.
        </p>
      </div>
      <div class="flex justify-center order-first lg:order-last">
        <img 
          src={goalsPageImage}
          alt="MatMat ilustracija"
          class="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-3xl rounded-2xl object-contain"
        />      
      </div>
    </div>
  </section>

  <!-- Potkrijepljeno znanošću -->
  <section class="container mx-auto px-4 py-12 md:py-16 lg:py-20 flex items-center">
    <div class="grid items-center gap-8 md:gap-12 grid-cols-1 lg:grid-cols-2 w-full">
      <div class="flex justify-center order-first">
        <img 
          src="/images/ilustration3.jpg"
          alt="MatMat ilustracija"
          class="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl rounded-2xl object-contain"
        />      
      </div>
      <div class="text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
          Potkrijepljeno znanošću
        </h2>
        <p class="text-muted-foreground mt-4 md:mt-6 text-base sm:text-lg md:text-xl max-w-prose">
          Koristimo kombinaciju pedagoških metoda utemeljenih na istraživanjima i zanimljivog 
          sadržaja kako bismo kreirali tečajeve koji učinkovito razvijaju vještine rješavanja 
          zadataka, razumijevanja koncepata i logičkog zaključivanja.
        </p>
      </div>
    </div>
  </section>

</main>