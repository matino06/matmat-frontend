<script>
  import { Sheet, SheetContent, SheetTrigger } from "$lib/components/ui/sheet";
  import { Button } from "$lib/components/ui/button";
  import MenuIcon from "@lucide/svelte/icons/menu";
  import { userData, handleLogIn, logout } from "$lib/store/user.svelte";
  import { toggleMode } from "mode-watcher";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";

  let isOpen = false;

  const links = [
    { name: "Početna", href: "/" },
    { name: "Ciljevi", href: "/goals" },
    { name: "Zadaci", href: "/tasks" },
    // { name: "Plan", href: "/plan" },
    { name: "Napredak", href: "/progress" },
    { name: "O nama", href: "/about" },
  ];
</script>

<nav class="flex w-full items-center justify-between py-2 md:pb-4">
  <!-- Desktop Links -->
  <div class="hidden gap-4 md:flex">
    {#each links as link}
      <a
        href={link.href}
        class="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
      >
        {link.name}
      </a>
    {/each}
  </div>

  <!-- Desktop Controls -->
  <div class="hidden items-center gap-4 md:flex">
    {#if userData.loading}
      <p>Učitavanje...</p>
    {:else if userData.user}
      <Button onclick={logout}>LogOut</Button>
    {:else}
      <Button onclick={handleLogIn}>Google LogIn</Button>
    {/if}
    <Button onclick={toggleMode} variant="outline" size="icon">
      <SunIcon class="h-5 w-5 dark:hidden" />
      <MoonIcon class="hidden h-5 w-5 dark:block" />
    </Button>
  </div>

  <!-- Mobile Hamburger Menu -->
  <div class="md:hidden">
    <Sheet bind:open={isOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <MenuIcon class="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" class="flex flex-col gap-4 p-4">
        {#each links as link}
          <a
            href={link.href}
            class="text-muted-foreground hover:text-primary text-sm font-medium"
            onclick={() => (isOpen = false)}
          >
            {link.name}
          </a>
        {/each}

        <div class="mt-4 flex flex-col gap-2">
          {#if userData.loading}
            <p>Učitavanje...</p>
          {:else if userData.user}
            <Button
              onclick={() => {
                logout();
                isOpen = false;
              }}>LogOut</Button
            >
          {:else}
            <Button
              onclick={() => {
                handleLogIn();
                isOpen = false;
              }}>Google LogIn</Button
            >
          {/if}

          <Button
            onclick={() => {
              toggleMode();
              isOpen = false;
            }}
            variant="outline"
            size="icon"
          >
            <SunIcon class="h-5 w-5 dark:hidden" />
            <MoonIcon class="hidden h-5 w-5 dark:block" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  </div>
</nav>
