export default defineContentScript({
  matches: ['https://fiu.instructure.com/*'],
  main() {
    console.log('Canvas Wrapped content script loaded');
  },
});
