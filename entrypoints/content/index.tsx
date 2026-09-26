import ReactDOM from 'react-dom/client';
import App from './App';
import { prefetchWrapped } from '@/lib/wrapped-cache';
import styles from './style.css?inline';

export default defineContentScript({
  // Intentionally scoped to one school (FIU) for now. To support more schools,
  // add more domain strings here AND to `host_permissions` in wxt.config.ts.
  matches: ['https://fiu.instructure.com/*'],

  async main(ctx) {
    // Warm the cache in the background so Wrapped opens instantly.
    void prefetchWrapped();

    const ui = await createShadowRootUi(ctx, {
      name: 'canvas-wrapped',
      // Bundle styles with the UI so a failed stylesheet fetch cannot leave it unstyled.
      css: styles,
      position: 'inline',
      anchor: 'body',
      isolateEvents: true,
      onMount(container) {
        const root = ReactDOM.createRoot(container);
        root.render(<App />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();
  },
});
