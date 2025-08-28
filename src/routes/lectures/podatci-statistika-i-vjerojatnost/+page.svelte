<script>
  let lectures = [];
</script>

<h1>Podatci, statistika i vjerojatnost</h1>

<ul>
  {#each lectures as lecture}
    <li><a href={lecture.path}>{lecture.title}</a></li>
  {/each}
</ul>
