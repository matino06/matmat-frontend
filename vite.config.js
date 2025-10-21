import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: 'public',
  plugins: [tailwindcss(), sveltekit()],
  optimizeDeps: {
    force: false, // sprječava Vite da sam „re-optimizira” ovisnosti
  },
  server: {
    watch: {
      usePolling: false,
    },
  },
});
