# Canvas Wrapped

A Wrapped-style recap of your semester on Canvas: study time, submissions, deadlines, grades
and more. Once installed, a **Canvas Wrapped** button appears on your school's Canvas pages.

## Install

### Chrome (also Edge, Brave and other Chromium browsers)

1. Download [canvas-wrapped-chrome.zip](https://github.com/JoyBoyQuillin/Canvas-Wrapped/releases/download/v1.0.0/canvas-wrapped-1.0.0-chrome.zip) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the unzipped folder.

Keep the folder where it is: Chrome loads the extension from it. To update, replace the
folder's contents with a newer download and click the reload icon on the extension's card.

### Firefox

1. Download [canvas-wrapped-firefox.xpi](release/canvas-wrapped-firefox.xpi).
2. Open `about:addons`, click the gear icon, choose **Install Add-on From File…**, and select
   the downloaded file.

The `.xpi` is signed by Mozilla, so it stays installed after Firefox restarts.

## Development

For Firefox:

```bash
pnpm dev:firefox
```

If pnpm is not installed, install it with `npm install -g pnpm`, then reopen your terminal. These commands work in Git Bash, PowerShell, and typical macOS/Linux shells.

### Load a production build locally

```bash
pnpm build
```

In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `.output/chrome-mv3`.

For a Firefox build, run `pnpm build:firefox`. Use Firefox's temporary add-on loader at `about:debugging#/runtime/this-firefox` and select the generated manifest from the Firefox output directory under `.output`.

End users installing a packaged extension do not need Node.js, pnpm, or the development setup.

## Using Canvas Wrapped

1. Visit a supported Canvas site while signed in.
2. Click **Canvas Wrapped** at the bottom-right of the page.
3. Choose a timeframe and explore the slides with the navigation buttons, Left/Right arrow keys, or swipe gestures.
4. Use **Shrink to window** for the smaller panel, or the fullscreen controls for presentation mode. Shrinking exits browser fullscreen so Canvas remains visible behind the panel.
5. On the final slide, click **What's Next** to view the learning-plan and resource prompt. Review the sharing notice, copy the prompt, and paste it into the AI chat of your choice. You can edit it there before sending.
6. Right-click a slide and choose **Stats for nerds** to inspect its underlying data.

Timeframe buttons are keyboard-accessible with Tab and Enter/Space. Escape dismisses an open secondary view or closes Wrapped. Reduced-motion preferences are respected by supported animations.

The primary interface is injected into the Canvas page. The browser-toolbar popup explains how to open your recap from Canvas.

## What the statistics mean

| Metric or view | Interpretation |
| --- | --- |
| Week / Month | Rolling activity windows. Available grades reflect graded work in that period, rather than overall course grades. |
| Semester | The latest complete term identified by the project's term-selection logic. |
| All time | Available historical data, including potentially incomplete or locked terms. |
| Time in Canvas | Canvas-reported lifetime activity for the included courses. It is unavailable as a precise weekly/monthly total. |
| Grades | Current course grades for Semester/All time; averages of available graded work for recent windows. These are not necessarily final grades. |
| Deadline timing | Submission time relative to the recorded deadline; it does not establish why a student submitted early or late. |
| Activity and archetypes | Descriptive summaries of available Canvas records, not measurements of total study effort or diagnoses of procrastination. |

Some endpoints can be unavailable, and requests are capped at ten pages per endpoint. Recaps may therefore omit data. Missing values should not be interpreted as zero performance or inactivity.

## Data and privacy

Canvas Wrapped makes requests to your Canvas site's API using your existing signed-in session and computes the recap in your browser. The current implementation has no separate analytics backend or automatic AI submission.

To speed up loading, it stores a trimmed copy of fetched data in the extension's **local browser storage**, keyed by Canvas host and user ID. This can include profile information, course names, grades, submission metadata, activity counts, and conversation metadata. Assignment descriptions and submission bodies are excluded from that cache.

The cache is considered stale after six hours and refreshed when needed. The refresh control can request newer data sooner; six hours is a freshness interval, not an automatic deletion deadline.

**Sharing the AI prompt is your choice.** It contains course names, grades, and study statistics. Copying does not automatically send it to an AI provider, but submitting it in an external chat shares it under that provider's policies and settings. Review the prompt and remove anything you do not want to share before sending.

Diagnostic exports can contain sensitive educational information. Keep real Canvas dumps, grades, and student records out of commits, issues, and screenshots.

## Development commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Chrome development build. |
| `pnpm dev:firefox` | Start Firefox development. |
| `pnpm compile` | Run TypeScript checks. |
| `pnpm test:styles` | Check compiled CSS through WXT's shadow-root processing. |
| `node --test lib/wrapped.test.ts` | Run statistics regression tests. |
| `node scripts/check-learning-prompt.mjs` | Verify prompt data, missing-value handling, and resource instructions. |
| `pnpm build` | Build the Chrome extension. |
| `pnpm build:firefox` | Build the Firefox extension. |
| `pnpm zip` | Build and package the Chrome extension. |
| `pnpm zip:firefox` | Build and package the Firefox extension. |

Generated builds and archives are placed under `.output` and are not committed; only the install downloads in `release/` are.

To inspect a local diagnostic export without opening the UI:

```bash
node scripts/wrapped-demo.ts path/to/canvas-dump.json --range=month
```

## Releasing

Update the version in `package.json` before publishing a new release, then create the browser-specific packages:

```bash
pnpm zip
pnpm zip:firefox
```

To update the downloads in the Install section, copy the Chrome archive to
`release/canvas-wrapped-chrome.zip`, and replace `release/canvas-wrapped-firefox.xpi` with the
signed `.xpi` that addons.mozilla.org produces for the self-distributed (unlisted) version.

Use the Chrome extension archive for the Chrome Web Store and the Firefox extension archive for addons.mozilla.org. The Firefox packaging command also creates a sources archive for source-code review. Generated archives are under `.output` and use the package name, version, and target in their filenames.

Keep the Firefox extension ID in `wxt.config.ts` stable across releases. The source archive configuration excludes `fixtures/`, `test_data/`, and Canvas diagnostic dumps; inspect release archives before uploading to ensure no student data is included.

## Project structure

```text
components/
  ui/                     Reusable shadcn components
  wrapped/                Slide layouts, artwork, and What's Next UI
entrypoints/
  content/                Canvas launcher, overlay, carousel, and diagnostics
  popup/                  Browser-toolbar instructions
lib/
  canvas-hosts.ts          Supported Canvas URL patterns
  canvas.ts               Canvas API client and pagination
  wrapped-fetch.ts        Fetching and trimming Canvas data
  wrapped-cache.ts        Local cache and background prefetch
  wrapped.ts              Statistics and timeframe calculations
  wrapped-copy.ts         Slide selection and descriptive copy
  learning-plan-prompt.ts Learning-plan and resource prompt generation
assets/styles/globals.css Shared Tailwind theme
scripts/                  Verification scripts and text recap utility
docs/                     UI setup and archetype documentation
wxt.config.ts             Build configuration and extension permissions
```

### Styling and components

The content interface lives inside a shadow root to isolate it from Canvas styles. Its compiled CSS is bundled through a `?inline` import and passed to `createShadowRootUi`. Shared theme variables support both extension pages and the shadow-root interface.

Add a shadcn component from the repository root:

```bash
pnpm dlx shadcn@latest add <component>
```

Review generated changes before committing. Portal-based components require extra care to render inside the extension's shadow root. Avoid literal CSS at-rule examples inside stylesheet comments: WXT's CSS extraction can misinterpret them.

See the [shadcn setup guide](docs/shadcn-setup.md) and [archetype guide](docs/archetypes.md) for implementation details.

## Troubleshooting

| Issue | What to check |
| --- | --- |
| Launcher is missing | Confirm the Canvas hostname is supported, the extension is enabled, and the page has been refreshed after loading the extension. |
| Changes are not visible | Keep `pnpm dev` running and refresh the Canvas tab. Confirm the browser is using the intended development extension or rebuild/reload a production installation. |
| Data looks incomplete | Check the selected timeframe, refresh the data, and inspect Stats for nerds. Locked courses and restricted endpoints can limit results. |
| Prompt copying fails | The prompt is selected automatically; use Ctrl+C or Command+C to copy it manually. |
| `node`, `npm`, or `pnpm` is not found | Check installation and PATH, then restart the terminal or editor. |

## Contributing

Keep changes focused and run the relevant checks before submitting them. For UI changes, verify both the smaller panel and immersive view, including keyboard navigation, dense slide content, and fullscreen transitions. Use synthetic or redacted data when reporting bugs or adding fixtures.
