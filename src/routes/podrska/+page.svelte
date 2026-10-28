<script>
  import LegalPage from "$lib/components/marketing/LegalPage.svelte";

  // Support page for the web and the iOS app (App Store Support URL); linked from Profil and the footer.
  const FAQ = [
    {
      q: "Ne mogu se prijaviti.",
      a: "Na webu provjeri da preglednik ne blokira skočne prozore za matmat.online. Ako si se prije prijavljivao/la Googleom, prijavi se istim Google računom; prijava s Appleom s drugom adresom napravi novi račun. Ako ni to ne pomaže, piši nam i navedi adresu računa.",
    },
    {
      q: "Kako uključiti ili isključiti AI?",
      a: "U aplikaciji: Profil → AI → Dozvola za AI. Na webu: Postavke → AI. Bez dozvole sve radi osim AI asistenta i AI ocjenjivanja probne mature.",
    },
    {
      q: "Kako isključiti podsjetnike?",
      a: "E-mail podsjetnike isključuješ u Postavkama na webu ili u Profilu u aplikaciji, ili linkom na dnu svakog podsjetnika. Podsjetnik na mobitelu isključuješ u Profilu → Dnevni podsjetnik.",
    },
    {
      q: "AI je napisao nešto netočno.",
      a: "U aplikaciji pod odgovorom AI asistenta ili uz AI ocjenu na probnoj maturi odaberi „Prijavi odgovor” i napiši što ne valja. Na webu ocijeni odgovor palcem dolje ili nam piši. Prijave pregledavamo i po njima popravljamo upute AI-ju.",
    },
    {
      q: "Kako obrisati račun?",
      a: "U aplikaciji: Profil → Obriši račun. Na webu: Postavke → Račun → Obriši račun. Brišu se svi tvoji podaci, odmah i zauvijek, a na e-mail stiže potvrda.",
    },
    {
      q: "Pronašao/la sam grešku u zadatku.",
      a: "Piši nam na info@matmat.online i navedi predmet, zadatak (najbolje sa slikom zaslona) i što misliš da je krivo.",
    },
  ];
</script>

<LegalPage title="Podrška" lead="Nešto ne radi ili imaš pitanje? Javi nam se, odgovaramo na hrvatskom.">
  <h2>Kontakt</h2>
  <p>Piši na <a href="mailto:info@matmat.online"><strong>info@matmat.online</strong></a>. Napiši s koje adrese se prijavljuješ, koristiš li web ili aplikaciju i, ako možeš, dodaj sliku zaslona.</p>

  <h2>Česta pitanja</h2>
  {#each FAQ as f (f.q)}
    <h3>{f.q}</h3>
    <p>{f.a}</p>
  {/each}

  <h2>Privatnost</h2>
  <p>Koje podatke prikupljamo i kako ih obrisati piše u <a href="/privatnost">pravilima privatnosti</a>.</p>
</LegalPage>
