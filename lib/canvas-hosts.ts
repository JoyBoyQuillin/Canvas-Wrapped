// Where the extension runs: used for both `host_permissions` (wxt.config.ts) and the content
// script's `matches` (entrypoints/content/index.tsx), so the two can't drift apart.
// Most schools are on *.instructure.com; some serve Canvas from their own domain and must be
// listed one by one. The browser checks these patterns itself, so a longer list costs nothing.

export const CANVAS_MATCHES = [
  'https://*.instructure.com/*',

  // Florida
  'https://webcourses.ucf.edu/*', // UCF
  'https://canvas.fsu.edu/*',
  'https://canvas.fau.edu/*',

  // Others on custom domains
  'https://canvas.harvard.edu/*',
  'https://canvas.mit.edu/*',
  'https://canvas.stanford.edu/*',
  'https://bcourses.berkeley.edu/*',
  'https://bruinlearn.ucla.edu/*',
  'https://canvas.ucsd.edu/*',
  'https://canvas.uw.edu/*',
  'https://canvas.asu.edu/*',
  'https://canvas.northwestern.edu/*',
  'https://canvas.cmu.edu/*',
  'https://canvas.upenn.edu/*',
  'https://courseworks2.columbia.edu/*',
  'https://canvas.illinois.edu/*',
  'https://canvas.wisc.edu/*',
  'https://canvas.umn.edu/*',
  'https://canvas.vt.edu/*',
];
