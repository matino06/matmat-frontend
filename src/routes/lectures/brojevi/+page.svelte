<script>
  let lectures = [
    { title: "Test 1", path: "/lectures/brojevi/test1-lekcija" },
    { title: "Test 2", path: "/lectures/brojevi/test2-lekcija" }
  ];
</script>

<h1>Brojevi</h1>

<ul>
  {#each lectures as lecture}
    <li><a href={lecture.path}>{lecture.title}</a></li>
  {/each}
</ul>
