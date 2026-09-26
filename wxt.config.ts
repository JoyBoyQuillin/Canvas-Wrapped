import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    // Intentionally scoped to one school (FIU) for now. To support more schools,
    // add more domain strings here AND to the `matches` array in entrypoints/content.ts.
    host_permissions: ['https://fiu.instructure.com/*'],
  },
});
