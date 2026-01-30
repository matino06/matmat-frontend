<script>
  import { fade, fly } from "svelte/transition";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Card, CardContent } from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { userData, handleLogIn } from "$lib/store/user.svelte";
  import { goto } from "$app/navigation";

  function goToTasks() {
    goto("/tasks");
  }
</script>

<main
  class="bg-background text-foreground min-h-screen transition-colors duration-300"
>
  <!-- Hero section -->
  <section class="container mx-auto px-6 py-16 lg:px-8">
    <div class="mx-auto max-w-4xl text-center" in:fade={{ duration: 600 }}>
      <Badge class="bg-primary/10 text-primary border-primary/20 mb-6 border">
        Priča iza uspjeha
      </Badge>
      <h1
        class="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl"
      >
        <span class="text-primary block">Kako je MatMat nastao</span>
        iz osobnog iskustva jednog studenta
      </h1>
      <p class="text-muted-foreground mx-auto mt-6 max-w-3xl text-lg">
        MatMat nije samo aplikacija za učenje matematike. To je priča o tome
        kako se
        <strong class="text-foreground"
          >individualni pristup i moderne metode učenja</strong
        >
        mogu kombinirati kako bi svaki maturant postigao svoj maksimum.
      </p>
    </div>
  </section>

  <!-- The Problem Section -->
  <section class="bg-muted/50 py-16">
    <div class="container mx-auto px-6 lg:px-8">
      <div class="mx-auto max-w-5xl">
        <div class="grid gap-12 md:grid-cols-2">
          <div in:fly={{ x: -30, duration: 600 }}>
            <div class="mb-6">
              <Badge class="mb-3 border-blue-200 bg-blue-100 text-blue-800"
                >Problem</Badge
              >
              <h2 class="text-3xl font-bold">
                Izazov s kojim se suočava svaki maturant
              </h2>
            </div>

            <div class="space-y-4">
              <p class="text-muted-foreground">
                "Kada se suoče s cijelim gradivom odjednom, teško je znati
                odakle krenuti i što ponoviti."
              </p>

              <Card class="border-border bg-card">
                <CardContent class="p-6">
                  <h3 class="mb-3 text-xl font-semibold">
                    Previše materijala, premalo strukture
                  </h3>
                  <p class="text-muted-foreground text-sm leading-relaxed">
                    Većina maturanata ne pati od manjka materijala, nego od
                    manjka jasne strukture učenja. Bez personaliziranog plana,
                    lako se izgubiti u moru zadataka.
                  </p>
                </CardContent>
              </Card>

              <Card class="border-border bg-card">
                <CardContent class="p-6">
                  <h3 class="mb-3 text-xl font-semibold">
                    Jedan pristup ne odgovara svima
                  </h3>
                  <p class="text-muted-foreground text-sm leading-relaxed">
                    "Učenici ne uče svi istom brzinom, nemaju isto predznanje
                    niti im odgovara isti tempo i način rada."
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div in:fly={{ x: 30, duration: 600 }}>
            <div class="mb-6">
              <Badge class="mb-3 border-green-200 bg-green-100 text-green-800"
                >Rješenje</Badge
              >
              <h2 class="text-3xl font-bold">
                MatMat: Personalizirana priprema za maturu
              </h2>
            </div>

            <div class="space-y-4">
              <p class="text-muted-foreground">
                MatMat je nastao iz potrebe za učinkovitim, personaliziranim
                učenjem koje se prilagođava svakom pojedincu.
              </p>

              <div class="bg-primary/5 rounded-lg p-6">
                <p class="text-foreground italic">
                  "MatMat je zamišljen kao alat koji se prilagođava svakom
                  učeniku pojedinačno. Kada se učenik prijavi u aplikaciju,
                  dobiva točno one zadatke koje u tom trenutku treba ponoviti,
                  prema svom znanju i tempu učenja."
                </p>
              </div>

              <p class="text-muted-foreground">
                Umjesto da se učenici gube u ogromnoj količini materijala,
                MatMat im daje jasan put prema 100% znanja.
              </p>

              <div
                class="border-primary bg-primary/5 rounded-lg border-l-4 p-4"
              >
                <p class="text-foreground font-medium">
                  "Nastavnici imaju važnu ulogu, ali realnost je da se u
                  razredima s 20 ili više učenika teško mogu posvetiti svakome
                  pojedinačno. MatMat to rješava."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- The Solution -->
  <section class="py-16">
    <div class="container mx-auto px-6 lg:px-8">
      <div class="mx-auto max-w-4xl text-center">
        <Badge class="mb-4 border-purple-200 bg-purple-100 text-purple-800"
          >Metodologija</Badge
        >
        <h2 class="mb-12 text-3xl font-bold sm:text-4xl">
          Kombinacija dvije dokazane metode učenja
        </h2>

        <div class="grid gap-8 md:grid-cols-2">
          <div in:fade={{ duration: 600, delay: 200 }}>
            <Card
              class="border-border bg-card hover:border-primary/30 h-full transition-all hover:shadow-lg"
            >
              <CardContent class="p-8">
                <div class="mb-6 flex justify-center">
                  <div class="rounded-full bg-blue-100 p-4">
                    <svg
                      class="h-8 w-8 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                  </div>
                </div>
                <h3 class="mb-4 text-xl font-bold">Spaced Repetition</h3>
                <p class="text-muted-foreground mb-4">
                  "Glavni 'motor' aplikacije zapravo nije AI, već algoritam za
                  spaced repetition."
                </p>
                <p class="text-muted-foreground text-sm">
                  Algoritam planira ponavljanje zadataka upravo kad ih počinješ
                  zaboravljati, čime produljuje trajanje znanja i maksimizira
                  rezultate za uloženo vrijeme.
                </p>
              </CardContent>
            </Card>
          </div>

          <div in:fade={{ duration: 600, delay: 400 }}>
            <Card
              class="border-border bg-card hover:border-primary/30 h-full transition-all hover:shadow-lg"
            >
              <CardContent class="p-8">
                <div class="mb-6 flex justify-center">
                  <div class="rounded-full bg-green-100 p-4">
                    <svg
                      class="h-8 w-8 text-green-600"
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
                </div>
                <h3 class="mb-4 text-xl font-bold">Aktivno Prisjećanje</h3>
                <p class="text-muted-foreground mb-4">
                  "Taj napor prisjećanja zapravo jača pamćenje, mozak se
                  'trenira' da kasnije, na ispitu, samostalno izvuče znanje bez
                  pomoći."
                </p>
                <p class="text-muted-foreground text-sm">
                  Umjesto pasivnog čitanja, aktivno rješavanje zadataka jača
                  neuralne veze i osigurava duboko razumijevanje gradiva.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div
          class="bg-primary/5 mt-12 rounded-xl p-8"
          in:fade={{ duration: 600, delay: 600 }}
        >
          <p class="text-foreground text-lg font-medium">
            "U MatMatu se te dvije metode kombiniraju: učenik prvo samostalno
            rješava zadatke (aktivno prisjećanje), a zatim aplikacija pametno
            odlučuje kada će mu se ti zadaci ponovno pojaviti (spaced
            repetition)."
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Mission & Vision -->
  <section class="bg-muted/50 py-16">
    <div class="container mx-auto px-6 lg:px-8">
      <div class="mx-auto max-w-4xl">
        <div class="grid gap-12 md:grid-cols-2">
          <div in:fly={{ y: 30, duration: 600 }}>
            <h2 class="mb-6 text-3xl font-bold">Naša misija</h2>
            <div class="space-y-4">
              <p class="text-muted-foreground">
                Omogućiti svakom maturantu da dođe do 100% znanja bez stresa i
                gubljenja vremena.
              </p>
              <p class="text-muted-foreground">
                Želimo olakšati proces pripreme za maturu i učiniti ga bezbolnim
                i lagodnim iskustvom, bez nepotrebnog stresa.
              </p>
            </div>
          </div>

          <div in:fly={{ y: 30, duration: 600, delay: 200 }}>
            <h2 class="mb-6 text-3xl font-bold">Naša vizija</h2>
            <div class="space-y-4">
              <p class="text-muted-foreground">
                Postati standard u pripremi za državnu maturu iz matematike.
              </p>
              <p class="text-muted-foreground">
                Želimo biti prvi izbor za sve maturante koji žele učinkovito,
                personalizirano i bezbolno pripremiti maturu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Values -->
  <section class="py-16">
    <div class="container mx-auto px-6 lg:px-8">
      <div class="mx-auto max-w-4xl text-center">
        <Badge class="mb-4 border-orange-200 bg-orange-100 text-orange-800"
          >Naše vrijednosti</Badge
        >
        <h2 class="mb-12 text-3xl font-bold">Zašto maturanti biraju MatMat</h2>

        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div class="text-center">
            <div class="bg-primary/10 mb-4 inline-flex rounded-full p-4">
              <span class="text-primary text-xl font-bold">100%</span>
            </div>
            <h3 class="mb-2 font-semibold">Besplatno</h3>
            <p class="text-muted-foreground text-sm">
              Dostupno svima bez ikakvih troškova
            </p>
          </div>

          <div class="text-center">
            <div class="mb-4 inline-flex rounded-full bg-blue-100 p-4">
              <svg
                class="h-6 w-6 text-blue-600"
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
            <h3 class="mb-2 font-semibold">Učinkovito</h3>
            <p class="text-muted-foreground text-sm">
              Bolji rezultati s manje vremena
            </p>
          </div>

          <div class="text-center">
            <div class="mb-4 inline-flex rounded-full bg-green-100 p-4">
              <svg
                class="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <h3 class="mb-2 font-semibold">Znanstveno</h3>
            <p class="text-muted-foreground text-sm">
              Temeljeno na psihologiji učenja
            </p>
          </div>

          <div class="text-center">
            <div class="mb-4 inline-flex rounded-full bg-purple-100 p-4">
              <svg
                class="h-6 w-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                ></path>
              </svg>
            </div>
            <h3 class="mb-2 font-semibold">Pristupačno</h3>
            <p class="text-muted-foreground text-sm">
              Samo se prijavi i počni učiti
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="from-primary/10 to-primary/5 bg-gradient-to-r py-16">
    <div class="container mx-auto px-6 text-center lg:px-8">
      <h2 class="mb-4 text-3xl font-bold">
        Pridruži se maturantima koji uče pametnije
      </h2>
      <p class="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg">
        Probaj besplatno i uvjeri se zašto MatMat mijenja način na koji se
        maturanti pripremaju za budućnost.
      </p>

      {#if userData.user}
        <Button
          onclick={goToTasks}
          size="xl"
          class="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-12 py-6 text-lg font-semibold shadow-lg transition-all"
        >
          <svg
            class="mr-3 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            ></path>
          </svg>
          NASTAVI RJEŠAVATI
        </Button>
        <p class="text-muted-foreground mt-4 text-sm">
          Već koristiš MatMat? Super! Nastavi odakle si stao/la.
        </p>
      {:else}
        <Button
          onclick={handleLogIn}
          size="xl"
          class="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-12 py-6 text-lg font-semibold shadow-lg transition-all"
        >
          <svg
            class="mr-3 h-5 w-5"
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
          PRIJAVI SE I POČNI UČITI
        </Button>
        <p class="text-muted-foreground mt-4 text-sm">
          Bez registracije, samo klik i kreni. Pročitajte cijeli članak na
          <a
            href="https://www.srednja.hr"
            target="_blank"
            class="text-primary underline hover:no-underline">Srednja.hr</a
          >
        </p>
      {/if}
    </div>
  </section>
</main>
