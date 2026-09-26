import ReactDOM from 'react-dom/client';
import ApiTestPanel from './ApiTestPanel';
import './style.css';

export default defineContentScript({
  // Intentionally scoped to one school (FIU) for now. To support more schools,
  // add more domain strings here AND to `host_permissions` in wxt.config.ts.
  matches: ['https://fiu.instructure.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'canvas-wrapped-api-test',
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
