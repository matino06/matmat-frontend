<script>
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";

  import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js";
  import { cn } from "$lib/utils";
  import { toggleMode } from "mode-watcher";
  import { Button } from "$lib/components/ui/button/index.js";

  const links = [
      { name: "Početna", href: "/" },
      { name: "Lekcije", href: "/lectures" },
      { name: "Zadaci", href: "/tasks" },
      { name: "Plan", href: "/plan" },
      { name: "Napredak", href: "/progress" }
    ];
</script>
 
<NavigationMenu.Root>
  <div class="w-screen flex items-center justify-between pb-4">
  <NavigationMenu.List class="gap-4">
    {#each links as link}
      <NavigationMenu.Item>
        <NavigationMenu.Link href={link.href} class="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          {link.name}
        </NavigationMenu.Link>
      </NavigationMenu.Item>
    {/each}
    </NavigationMenu.List>
    <Button onclick={toggleMode} variant="outline" size="icon">
      <SunIcon
        class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 !transition-all dark:-rotate-90 dark:scale-0"
      />
      <MoonIcon
        class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 !transition-all dark:rotate-0 dark:scale-100"
      />
      <span class="sr-only">Toggle theme</span>
    </Button>
  </div>
</NavigationMenu.Root>