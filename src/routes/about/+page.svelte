<script>
  import { fly, fade } from "svelte/transition";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Card, CardContent } from "$lib/components/ui/card/index.js";
</script>

<main
  class="from-background via-background/95 to-accent/5 text-foreground min-h-screen bg-gradient-to-b transition-colors duration-300"
>
  <section
    class="container mx-auto px-6 py-20 text-center lg:px-8"
    in:fade={{ duration: 600 }}
  >
    <Badge
      class="bg-primary/10 text-primary border-primary/20 mb-5 border text-sm tracking-wide"
    >
      O nama
    </Badge>
    <h1
      class="text-primary bg-gradient-to-r text-5xl font-extrabold sm:text-6xl"
    >
      MatMat — priprema za maturu koja stvarno radi
    </h1>
    <p
      class="text-muted-foreground mx-auto mt-6 max-w-3xl text-xl leading-relaxed"
    >
      MatMat je nastao iz jednostavne ideje: <strong
        >učiti pametnije, ne duže.</strong
      ><br />
      Umjesto beskrajnih zadataka i nasumičnih ponavljanja, MatMat koristi
      <em>spaced repetition</em> i objašnjenja korak-po-korak kako bi ti pomogao
      stvarno razumjeti gradivo i zadržati znanje do mature.
    </p>
  </section>

  <section
    class="bg-primary/5 text-card-foreground border-border border-t py-20 backdrop-blur-sm"
  >
    <div
      class="container mx-auto px-6 text-center lg:px-8"
      in:fly={{ y: 40, duration: 600 }}
    >
      <h2 class="text-primary mb-6 bg-gradient-to-r text-4xl font-bold">
        Naša misija
      </h2>
      <p
        class="text-muted-foreground mx-auto max-w-4xl text-lg leading-relaxed"
      >
        Naša misija je jednostavna — <strong
          >omogućiti svakom maturantu da dođe do 100% znanja</strong
        >
        bez stresa i gubljenja vremena. Svaki zadatak u MatMatu pomno je osmišljen
        kako bi te naučio nešto konkretno, a ne samo testirao tvoje znanje.
        <br />
        Vjerujemo da uz pravi sustav i motivaciju — to može svatko.
      </p>
    </div>
  </section>

  <section
    class="container mx-auto px-6 py-20 lg:px-8"
    in:fade={{ duration: 600 }}
  >
    <div class="mb-12 text-center">
      <h2 class="text-primary bg-gradient-to-r text-4xl font-bold">
        Kako MatMat funkcionira
      </h2>
      <p class="text-muted-foreground mt-4 text-lg">
        Sustav koji se prilagođava tebi — ne obrnuto.
      </p>
    </div>

    <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      <Card
        class="bg-card/80 text-card-foreground border-border hover:border-primary/20 border shadow-lg transition-all duration-300"
      >
        <CardContent>
          <h3 class="mb-2 text-xl font-semibold">Personalizirano učenje</h3>
          <p class="text-muted-foreground text-sm leading-relaxed">
            Nakon svakog zadatka ocijeniš težinu. Na temelju toga algoritam
            razumije tvoju razinu i bira sljedeće zadatke koji ti najviše pomažu
            da napreduješ.
          </p>
        </CardContent>
      </Card>

      <Card
        class="bg-card/80 text-card-foreground border-border hover:border-primary/20 border shadow-lg transition-all duration-300"
      >
        <CardContent>
          <h3 class="mb-2 text-xl font-semibold">Spaced repetition</h3>
          <p class="text-muted-foreground text-sm leading-relaxed">
            Algoritam planira ponavljanje zadataka upravo kad ih počinješ
            zaboravljati, čime produljuje trajanje znanja i maksimizira
            rezultate za uloženo vrijeme.
          </p>
        </CardContent>
      </Card>

      <Card
        class="bg-card/80 text-card-foreground border-border hover:border-primary/20 border shadow-lg transition-all duration-300"
      >
        <CardContent>
          <h3 class="mb-2 text-xl font-semibold">AI asistent</h3>
          <p class="text-muted-foreground text-sm leading-relaxed">
            Kad zapneš, ugrađeni AI asistent objašnjava zadatak korak-po-korak i
            daje dodatne primjere — kao osobni mentor koji je dostupan 24/7.
          </p>
        </CardContent>
      </Card>
    </div>
  </section>

  <section
    class="container mx-auto px-6 pb-20 lg:px-8"
    in:fade={{ duration: 600 }}
  >
    <footer class="text-muted-foreground mt-3 border-t pt-8 text-sm">
      <p>© {new Date().getFullYear()} MatMat — Uči pametnije, ne duže.</p>
    </footer>
  </section>
</main>
