# Using shadcn/ui in this extension

This is an existing WXT + React + Tailwind 4 project. The initial setup is complete;
you do not need to run `shadcn init` or create another Vite app.

## What was added

- `components.json`: new-york style, TypeScript, client-side React, root-level aliases.
- `assets/styles/globals.css`: shared Tailwind utilities and shadcn theme tokens.
- `lib/utils.ts`: `cn()` merges conditional classes and Tailwind overrides.
- `components/ui/button.tsx`: editable shadcn-style Button using Radix Slot and CVA.
- The floating Canvas Wrapped launcher uses Button as the first example.
- `components/ui/card.tsx` and `carousel.tsx`: shadcn components used by
  `entrypoints/content/WrappedCarousel.tsx` to display the existing Wrapped slides.

The existing Tailwind Vite plugin and WXT `@/` alias remain in use.
The primary color is blue (`--primary: #2563eb`).

## Run it

In Git Bash, from the folder containing `package.json`:

```bash
pnpm install
pnpm dev
```

Open or refresh your school's Canvas (any site listed in `lib/canvas-hosts.ts`) in the browser running the development extension.
Check the blue launcher at the bottom-right, hover and keyboard focus, then open
the panel and check the Wrapped/API tabs. The popup is a separate extension page.

## Add a component

```bash
pnpm dlx shadcn@latest add card
```

The CLI reads `components.json` and writes into `components/ui`. It resolves the `@/`
alias from the root `tsconfig.json`, which repeats WXT's aliases relative to the project
root; without that, it writes components to the folder *above* the repo.
Review the generated diff, including any shared stylesheet changes.
Start with non-portal components such as Card or Badge.

```tsx
import { Button } from '@/components/ui/button';

<Button onClick={run}>Run Wrapped</Button>
<Button variant="outline" onClick={close}>Close</Button>
```

Use `className` for layout/customization, or edit the component source for shared
behavior. Keep Tailwind class names as complete strings so the scanner finds them.

## How CSS reaches Canvas

Both entrypoint stylesheets import `assets/styles/globals.css`.
The content entrypoint imports its stylesheet with `?inline` and passes the compiled
CSS to `createShadowRootUi({ css: styles })`. Theme tokens are declared on both
`:root` (popup) and `:host` (Canvas shadow root).

The content UI is all Tailwind + shadcn; `entrypoints/content/style.css` only imports
the shared theme. Wrapped slide building blocks live in `components/wrapped/`.

Avoid literal CSS at-rule examples in CSS comments: WXT's extraction logic can
misinterpret them. WXT moves actual property registrations into document styles
while keeping UI selectors inside the shadow root.

## Dialogs, dropdowns, and tooltips

Before using a portal-based component in Canvas, adapt its Portal to receive an
HTMLElement inside the same shadow root through its `container` prop. Otherwise
it can render under Canvas's `document.body` without the extension styles.
Button, Card, Carousel, Tabs, Badge, Progress, Table, Skeleton, and Alert are installed; portal components still need that wiring
and keyboard/focus testing when added.

## Checks

```bash
pnpm compile
pnpm test:styles
pnpm build
```

The style check compiles the actual content CSS and runs WXT's shadow-root CSS
processor to catch regressions in theme, positioning, and comment handling.
It does not replace checking the extension in a browser.

References: [manual installation](https://ui.shadcn.com/docs/installation/manual),
[components.json](https://ui.shadcn.com/docs/components-json), and
[Radix portals](https://www.radix-ui.com/primitives/docs/utilities/portal).
