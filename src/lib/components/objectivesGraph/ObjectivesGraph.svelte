<script>
  import { userData } from "$lib/store/user.svelte";
  import cytoscape from "cytoscape";
  import dagre from "cytoscape-dagre";

  cytoscape.use(dagre);

  let container;
  let cyInstance;

  $: if (userData.user && container) {
    if (cyInstance) {
      cyInstance.destroy();
    }
    cyInstance = cytoscape({
      container,
      elements: [
        { data: { id: "a", color: "red", label: "1." } },
        { data: { id: "b", color: "red", label: "1." } },
        { data: { id: "c", color: "green", label: "1." } },
        { data: { id: "d", color: "blue", label: "1." } },
        { data: { source: "a", target: "c" } },
        { data: { source: "b", target: "c" } },
        { data: { source: "c", target: "d" } },
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            label: "data(label)",
            "text-valign": "center",
            color: "#fff",
            "font-size": 14,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#ccc",
            "target-arrow-color": "#ccc",
            "target-arrow-shape": "triangle",
          },
        },
      ],
      layout: { name: "dagre" },
    });
  }
</script>

<div bind:this={container} style="width: 100%; height: 500px;"></div>
