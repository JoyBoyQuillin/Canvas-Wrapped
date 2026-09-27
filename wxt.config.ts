import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { CANVAS_MATCHES } from './lib/canvas-hosts';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  zip: {
    // The sources zip (for Firefox review) ignores .gitignore; keep real Canvas dumps out of it.
    excludeSources: ['fixtures/**', 'test_data/**', '**/canvas-dump-*.json'],
  },
  manifest: ({ browser }) => ({
    // Store listing name; the description and version come from package.json.
    name: 'Canvas Wrapped',
    // Schools' Canvas sites; shared with the content script's `matches`.
    host_permissions: CANVAS_MATCHES,
    // Caches Wrapped data locally so it opens instantly (lib/wrapped-cache.ts).
    permissions: ['storage'],
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          // Permanent once published on addons.mozilla.org: updates must keep this ID.
          id: 'canvas-wrapped@shellhacks-2026',
          // Canvas data is only read from the school's own site and cached in local storage;
          // nothing is sent anywhere else.
          data_collection_permissions: { required: ['none'] },
        },
      },
    }),
  }),
});
