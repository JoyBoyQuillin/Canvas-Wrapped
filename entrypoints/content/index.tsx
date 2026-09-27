import ReactDOM from 'react-dom/client';
import App from './App';
import { prefetchWrapped } from '@/lib/wrapped-cache';
import { CANVAS_MATCHES } from '@/lib/canvas-hosts';
import styles from './style.css?inline';

export default defineContentScript({
  // Schools' Canvas sites; shared with `host_permissions` in wxt.config.ts.
  matches: CANVAS_MATCHES,

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
