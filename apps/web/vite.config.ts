import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import { ruskyContent } from './content-plugin.ts';

// Where /api, /mcp and the OAuth discovery documents go in dev; RUSKY_API points a second
// dev server at another API, e.g. a throwaway one for tests.
const API = process.env.RUSKY_API ?? 'http://127.0.0.1:1390';

export default defineConfig({
  plugins: [
    ruskyContent(path.resolve(import.meta.dirname, '../../content')),
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      kit: { adapterFallback: 'index.html', spa: true },
      manifest: {
        name: 'Rusky',
        short_name: 'Rusky',
        description: 'Flash cards and grammar for the languages you are learning',
        theme_color: '#f1f3f6',
        background_color: '#f1f3f6',
        display: 'standalone',
        id: '/',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The whole app is small and has to work on the metro, so everything is precached.
        globPatterns: ['client/**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
        // Progress and sign-in live behind /api and must never come from a cache.
        navigateFallbackDenylist: [/^\/api\//, /^\/mcp/, /^\/\.well-known\//],
      },
    }),
  ],
  server: {
    // 1389/1390 keep clear of Holocron's 1977 and the usual 5173/3000 defaults.
    port: 1389,
    strictPort: true,
    proxy: {
      '/api': API,
      '/mcp': API,
      '/.well-known/oauth-': API,
    },
  },
});
