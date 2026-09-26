import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { splitShadowRootCss } from 'wxt/utils/split-shadow-root-css';

// Use WXT's Vite version rather than introducing a second build dependency.
const require = createRequire(import.meta.url);
const wxtRequire = createRequire(require.resolve('wxt'));
const { build } = await import(pathToFileURL(wxtRequire.resolve('vite')).href);
const inputPath = fileURLToPath(new URL('../entrypoints/content/style.css', import.meta.url)).replaceAll('\\', '/');
const entryPath = fileURLToPath(new URL('./virtual-style-entry.js', import.meta.url)).replaceAll('\\', '/');
const output = await build({
  configFile: false,
  logLevel: 'error',
  plugins: [tailwindcss(), {
    name: 'check-shadow-css',
    resolveId(id) { if (id.replaceAll('\\', '/') === entryPath) return '\0check-shadow-css'; },
    load(id) {
      if (id === '\0check-shadow-css') {
        return `export { default } from ${JSON.stringify(inputPath + '?inline')};`;
      }
    },
  }],
  build: {
    write: false,
    minify: false,
    lib: { entry: entryPath, formats: ['es'] },
  },
});
const chunk = output[0].output.find(item => item.type === 'chunk');
const { default: css } = await import('data:text/javascript;base64,' + Buffer.from(chunk.code).toString('base64'));
const { shadowCss, documentCss } = splitShadowRootCss(css);

// Regressions here can leave a working React button with no visible styling.
assert.equal((shadowCss.match(/\/\*/g) || []).length, (shadowCss.match(/\*\//g) || []).length);
assert.match(shadowCss, /--primary:\s*#2563eb/);
assert.match(shadowCss, /\.bg-primary\s*\{\s*background-color:\s*var\(--primary\)/);
assert.match(shadowCss, /\.fixed\s*\{\s*position:\s*fixed/);
assert.match(shadowCss, /\.right-4/);
assert.match(shadowCss, /:host/);
assert.match(shadowCss, /--cw-accent/);
assert.ok(!shadowCss.includes('@property'));
assert.match(documentCss, /@property/);
console.log('PASS: Compiled UI styles survive WXT shadow-root processing.');
