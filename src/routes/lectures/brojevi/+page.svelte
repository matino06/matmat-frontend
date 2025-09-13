<script>
  import LectureGrid from "$lib/components/lectureGrid/LectureGrid.svelte";

  let lectures = [
    {
      title: "Skupovi brojeva",
      path: "/lectures/brojevi/skupovi-brojeva",
      unlocked: true,
    },
    {
      title: "Test 1",
      path: "/lectures/brojevi/test1-lekcija",
      unlocked: true,
    },
    {
      title: "Test 2",
      path: "/lectures/brojevi/test2-lekcija",
      unlocked: false,
    },
  ];
</script>

<LectureGrid {lectures} />
