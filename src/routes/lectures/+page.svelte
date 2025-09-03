<script>
  import LectureGrid from "$lib/components/lectureGrid/LectureGrid.svelte";

  let lectures = [
    { title: "Brojevi", path: "/lectures/brojevi", unlocked: true },
    {
      title: "Algebra i funkcije",
      path: "/lectures/algebra-i-funkcije",
      unlocked: false
    },
    {
      title: "Oblik i prostor",
      path: "/lectures/oblik-i-prostor",
      unlocked: false
    },
    { title: "Mjerenje", path: "/lectures/mjerenje", unlocked: false },
    {
      title: "Podatci, statistika i vjerojatnost",
      path: "/lectures/podatci-statistika-i-vjerojatnost",
      unlocked: false
    }
  ];
</script>

<LectureGrid {lectures} />
