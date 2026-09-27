import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { CANVAS_MATCHES } from './lib/canvas-hosts';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    // Schools' Canvas sites; shared with the content script's `matches`.
    host_permissions: CANVAS_MATCHES,
    // Caches Wrapped data locally so it opens instantly (lib/wrapped-cache.ts).
    permissions: ['storage'],
  },
});
