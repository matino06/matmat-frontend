<script>
  let lectures = [
    { title: "Brojevi", path: "/lectures/brojevi" },
    { title: "Algebra i funkcije", path: "/lectures/algebra-i-funkcije" },
    { title: "Oblik i prostor", path: "/lectures/oblik-i-prostor" },
    { title: "Mjerenje", path: "/lectures/mjerenje" },
    {
      title: "Podatci, statistika i vjerojatnost",
      path: "/lectures/podatci-statistika-i-vjerojatnost"
    }
  ];
</script>

<ul>
  {#each lectures as lecture}
    <li><a href={lecture.path}>{lecture.title}</a></li>
  {/each}
</ul>
