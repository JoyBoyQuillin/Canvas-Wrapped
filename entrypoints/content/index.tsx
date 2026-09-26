import ReactDOM from 'react-dom/client';
import ApiTestPanel from './ApiTestPanel';
import styles from './style.css?inline';

export default defineContentScript({
  // Intentionally scoped to one school (FIU) for now. To support more schools,
  // add more domain strings here AND to `host_permissions` in wxt.config.ts.
  matches: ['https://fiu.instructure.com/*'],

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'canvas-wrapped-api-test',
      // Bundle styles with the UI so a failed stylesheet fetch cannot leave it unstyled.
      css: styles,
      position: 'inline',
      anchor: 'body',
      isolateEvents: true,
      onMount(container) {
        const root = ReactDOM.createRoot(container);
        root.render(<ApiTestPanel />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();
  },
});
