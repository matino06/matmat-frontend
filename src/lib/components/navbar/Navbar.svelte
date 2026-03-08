<script>
  import { Sheet, SheetContent, SheetTrigger } from "$lib/components/ui/sheet";
  import { Button } from "$lib/components/ui/button";
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
  } from "$lib/components/ui/dropdown-menu";
  import { MenuIcon, Settings } from "@lucide/svelte/icons";
  import UserIcon from "@lucide/svelte/icons/user";
  import { userData, handleLogIn, logout, showNotificationPopup } from "$lib/store/user.svelte";
  import { toggleMode } from "mode-watcher";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";

  let isOpen = false;

  const links = [
    { name: "Početna", href: "/" },
    { name: "Ciljevi", href: "/goals" },
    { name: "Zadaci", href: "/tasks" },
    { name: "Napredak", href: "/progress" },
    { name: "Naša metoda", href: "/how-it-works" },
  ];

  function openNotificationPreferences() {
    showNotificationPopup.value = true;
    if (isOpen) isOpen = false;
  }
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
    <SheetContent side="left" class="flex flex-col gap-6 p-6">
      <div class="flex flex-col gap-4">
        {#each links as link}
          <a
            href={link.href}
            class="text-foreground hover:text-primary py-2 text-lg font-medium transition-colors"
            onclick={() => (isOpen = false)}
          >
            {link.name}
          </a>
        {/each}
      </div>

      <div class="border-t border-border my-2"></div>

      <div class="flex flex-col gap-3">
        {#if userData.loading}
          <p class="text-muted-foreground py-2">Učitavanje...</p>
        {:else if userData.user}
          <button
            class="text-foreground hover:text-primary flex items-center gap-3 py-2 text-left text-lg font-medium transition-colors"
            onclick={() => {
              openNotificationPreferences();
              isOpen = false;
            }}
          >
            <Settings class="text-muted-foreground w-5"/>
            Postavke obavijesti
          </button>
          <button
            class="text-foreground hover:text-primary flex items-center gap-3 py-2 text-left text-lg font-medium transition-colors"
            onclick={() => {
              logout();
              isOpen = false;
            }}
          >
            <span class="text-muted-foreground w-5">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </span>
            Odjava
          </button>
        {:else}
          <button
            class="text-foreground hover:text-primary flex items-center gap-3 py-2 text-left text-lg font-medium transition-colors"
            onclick={() => {
              handleLogIn();
              isOpen = false;
            }}
          >
            <span class="text-muted-foreground w-5">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </span>
            Google Prijava
          </button>
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

    <!-- Desktop Profile / Login -->
    <div class="hidden md:block">
      {#if userData.loading}
        <p>Učitavanje...</p>
      {:else if userData.user}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" class="rounded-full">
              <UserIcon class="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onclick={openNotificationPreferences}>
              Postavke obavijesti
            </DropdownMenuItem>
            <DropdownMenuItem onclick={logout}>
              Odjava
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      {:else}
        <Button onclick={handleLogIn}>Google Prijava</Button>
      {/if}
    </div>
  </div>
</nav>