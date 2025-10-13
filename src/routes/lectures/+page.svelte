<script>
    import { userData } from "$lib/store/user.svelte";

  // import LectureGrid from "$lib/components/lectureGrid/LectureGrid.svelte";

  // let lectures = [
  //   { title: "Brojevi", path: "/lectures/brojevi", unlocked: true },
  //   {
  //     title: "Algebra i funkcije",
  //     path: "/lectures/algebra-i-funkcije",
  //     unlocked: false,
  //   },
  //   {
  //     title: "Oblik i prostor",
  //     path: "/lectures/oblik-i-prostor",
  //     unlocked: false,
  //   },
  //   { title: "Mjerenje", path: "/lectures/mjerenje", unlocked: false },
  //   {
  //     title: "Podatci, statistika i vjerojatnost",
  //     path: "/lectures/podatci-statistika-i-vjerojatnost",
  //     unlocked: false,
  //   },
  // ];
</script>

<!-- <LectureGrid {lectures} /> -->
 {#if userData.user}
<section
  class="bg-background text-foreground flex min-h-[calc(100vh-92px)] flex-col items-center justify-center px-6"
>
  <h1 class="mb-4 text-4xl font-extrabold sm:text-5xl">Stranica u izradi</h1>
  <p class="text-muted-foreground mb-8 max-w-md text-center text-lg sm:text-xl">
    Ova stranica je trenutno u fazi razvoja.
  </p>
  <img
    src="/images/wip_ilustration.jpg"
    alt="Work in progress ilustracija"
    class="w-64 rounded-2xl object-contain sm:w-80"
  />
</section>
{/if}