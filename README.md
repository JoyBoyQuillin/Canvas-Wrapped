# Canvas Wrapped

A Wrapped-style recap of your semester on Canvas: study time, submissions, deadlines, grades
and more. It's a browser extension (Chrome and Firefox) built with WXT and React; once
installed, a **Canvas Wrapped** button appears on your school's Canvas pages.

## Development

```bash
pnpm install
pnpm dev            # Chrome, rebuilds and reloads on save
pnpm dev:firefox    # Firefox
```

## Releasing

Bump `version` in `package.json` (both stores reject a version they've already seen), then:

```bash
pnpm zip            # .output/canvas-wrapped-<version>-chrome.zip  -> Chrome Web Store
pnpm zip:firefox    # .output/canvas-wrapped-<version>-firefox.zip -> addons.mozilla.org
                    # .output/canvas-wrapped-<version>-sources.zip -> AMO's "source code" upload
```

For adding UI components and understanding the extension's shadow-root styles,
see the [shadcn setup guide](docs/shadcn-setup.md).

## Data and privacy

Canvas Wrapped reads your Canvas data with your existing login, straight from the Canvas
page. Nothing is sent anywhere else. To open instantly, it caches a trimmed copy of that
data (no assignment text or submission contents) in the extension's local storage on your
computer, refreshed at most every 6 hours. It's keyed to your Canvas user, and removing the
extension deletes it.
