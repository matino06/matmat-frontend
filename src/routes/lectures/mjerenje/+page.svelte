<script>
  let lectures = [];
</script>

<h1>Mjerenje</h1>

<ul>
  {#each lectures as lecture}
    <li><a href={lecture.path}>{lecture.title}</a></li>
  {/each}
</ul>
