import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// L'app est servie sous https://lepetitperchoir.fr/budget/ (Worker « famille-budget »).
export default defineConfig({
  base: '/budget/',
  server: { port: 5178, strictPort: true },
  // Firebase (Auth + Firestore) pèse l'essentiel du bundle, comme dans les autres apps du portail.
  build: { chunkSizeWarningLimit: 900 },
  preview: { port: 5178, strictPort: true },
  plugins: [
    svelte(),
    VitePWA({
      // Seul le portail est installable : pas de manifeste ici, mise à jour sur demande.
      registerType: 'prompt',
      manifest: false,
      workbox: {
        navigateFallback: '/budget/index.html',
        navigateFallbackAllowlist: [/^\/budget\/(index\.html)?$/],
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg}'],
      },
    }),
  ],
});
