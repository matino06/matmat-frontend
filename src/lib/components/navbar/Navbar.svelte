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
  <!-- Hamburger Menu (mobile only) -->
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
        </div>
      </SheetContent>
    </Sheet>
  </div>

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

  <!-- Controls (right side) -->
  <div class="flex items-center gap-4">
    <!-- Theme Toggle Button (always visible) -->
    <Button onclick={toggleMode} variant="outline" size="icon">
      <SunIcon class="h-5 w-5 dark:hidden" />
      <MoonIcon class="hidden h-5 w-5 dark:block" />
    </Button>

    <!-- Desktop Login/Logout -->
    <div class="hidden md:block">
      {#if userData.loading}
        <p>Učitavanje...</p>
      {:else if userData.user}
        <Button onclick={logout}>LogOut</Button>
      {:else}
        <Button onclick={handleLogIn}>Google LogIn</Button>
      {/if}
    </div>
  </div>
</nav>
