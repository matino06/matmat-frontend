<script>
  // import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  // import { page } from "$app/stores";

  // const lecturesDict = {
  //   lectures: "Lekcije",
  //   brojevi: "Brojevi",
  //   "algebra-i-funkcije": "Algebra i funkcije",
  //   "oblik-i-prostor": "Oblik i prostor",
  //   mjerenje: "Mjerenje",
  //   "podatci-statistika-i-vjerojatnost": "Podatci, statistika i vjerojatnost"
  // };

  // let crumbs = $state([]);

  // $effect(() => {
  //   const urlPath = $page.url.pathname;
  //   const pathComponents = urlPath.split("/").slice(1);
  //   let currentPath = "";
  //   crumbs = [];

  //   setTimeout(() => {
  //     pathComponents.forEach((component) => {
  //       currentPath += "/" + component;
  //       crumbs.push({ path: currentPath, title: lecturesDict[component] });
  //     });
  //   }, 0);
  // });

  let { children } = $props();
</script>

<!-- 
<Breadcrumb.Root>
  <Breadcrumb.List>
    {#each crumbs as crumb, index}
      <Breadcrumb.Item>
        <Breadcrumb.Link href={crumb.path}>{crumb.title}</Breadcrumb.Link>
      </Breadcrumb.Item>
      {#if index < crumbs.length - 1}
        <Breadcrumb.Separator />
      {/if}
    {/each}
  </Breadcrumb.List>
</Breadcrumb.Root> -->

{@render children?.()}
