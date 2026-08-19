# Contributing

Thanks for considering a contribution. This is an accessibility-first fork, so the bar for anything
touching ARIA, focus or keyboard behaviour is deliberately high — and the parts of the code that look
arbitrary usually are not. The [invariants](#invariants) section below lists the ones you would
otherwise discover by breaking them.

## Setup

Node 22 (see `.nvmrc`) and pnpm — the version is pinned in `packageManager`, so `corepack enable` is
enough to get the right one.

```bash
pnpm install
pnpm dev
```

`pnpm dev` serves `index.html`, an accessibility test bench with a button for every toast type,
position and option. It imports `/src/index.ts` directly, so edits — including `src/style.css` —
show up without a reload. This is where you should be looking while changing anything visual or
interactive.

Keyboard shortcuts to exercise there: <kbd>Alt</kbd>+<kbd>T</kbd> focuses the most recent toast,
<kbd>↑</kbd>/<kbd>↓</kbd> move between toasts, <kbd>Delete</kbd> dismisses, <kbd>Esc</kbd> returns
focus to whatever had it before.

## Checks

| Command              | What it does                                                           |
| -------------------- | ---------------------------------------------------------------------- |
| `pnpm lint`          | oxlint, including type-aware rules                                     |
| `pnpm format`        | oxfmt (`pnpm format:check` in CI)                                      |
| `pnpm typecheck`     | `tsc --noEmit`                                                         |
| `pnpm test`          | unit tests on happy-dom — fast, run these while you work               |
| `pnpm test:browser`  | the accessibility suite, in a real Chromium via Playwright             |
| `pnpm test:coverage` | both suites, with the coverage floors CI enforces                      |
| `pnpm build`         | Vite bundle plus declarations from `tsc`                               |
| `pnpm check:package` | publint, are-the-types-wrong, and a real install of the packed tarball |
| `pnpm size`          | the gzipped budget for the published bundle                            |

CI runs all of them. `pnpm check:package` needs `pnpm build` first; it packs the tarball, installs it
into a throwaway project and type-checks a caller against it, which is what catches declarations
that silently hide part of the API.

Formatting and lint rules are not up for negotiation in a review — run `pnpm format` and
`pnpm lint --fix`. Every rule switched off in `.oxlintrc.json` carries its reason inline; if you hit
a rule that fires on legitimate code, say so in the pull request rather than adding an inline
disable.

## Testing accessibility by hand

No tool replaces this, and it is the part reviewers will ask about:

- **A screen reader.** NVDA with Firefox or Chrome on Windows, VoiceOver with Safari on macOS. Check
  that a toast is announced once, that the severity is read before the title, and that dismissing one
  does not re-read the previous message.
- **Keyboard only.** Unplug the mouse. Every shortcut above, plus <kbd>Tab</kbd> reaching the action
  and close buttons, and <kbd>Enter</kbd>/<kbd>Space</kbd> activating them.
- **Forced colors.** Windows High Contrast, or DevTools → Rendering → _Emulate CSS media
  (forced-colors: active)_. Toasts, borders and the loading spinner must all stay visible.
- **Reduced motion.** DevTools → Rendering → _prefers-reduced-motion: reduce_. Toasts should
  cross-fade without sliding, and the spinner should keep animating — see the invariant below.

## Invariants

These are load-bearing. Each is commented at its site, and each has already been a bug:

- **`[data-sonner-toasters]` gets no CSS at all** — no `transform`, `filter`, `backdrop-filter`,
  `perspective`, `contain` or `will-change`. Any of them makes it the containing block for the
  `position: fixed` toasts and breaks every position. (`src/toaster.ts`)
- **The spinner keeps an animation under `prefers-reduced-motion`**, as an opacity pulse rather than
  `animation: none`. `none` empties `getAnimations()`, which `toast.promise()` reads to carry the
  spinner phase onto the replacing toast. (`src/style.css`)
- **The live region lives in the light DOM**, outside the shadow root, and is the only announcement
  channel — nothing inside the shadow root carries `aria-live` or `role="status"`. The toast list is
  created and destroyed on demand, so a live region in there is not reliably announced.
  (`src/announcer.ts`)
- **`aria-atomic="false"` is set explicitly.** `role="status"` would imply `aria-atomic="true"` and
  re-read the previous message. (`src/announcer.ts`)
- **The announcer's hidden style goes through `cssText`**, i.e. the CSSOM, so a host with a strict
  `style-src` Content Security Policy does not block it. Clip-based hiding only: `display: none`,
  `visibility: hidden` and `[hidden]` all suppress the announcement. (`src/announcer.ts`)
- **The toast title is inserted as plain text.** `titleAsHtml: true` is an explicit opt-in that hands
  sanitising to the caller. (`src/toast.ts`)
- **The 12-spoke loading spinner is not decorative dressing.** Its staggered opacity is what keeps it
  readable in forced-colors mode, where a gradient would not be repainted. (`src/style.css`)

## Pull requests

Every pull request that changes the published package needs a changeset — the flow, and the
`#skip-changeset` escape hatch for docs- and CI-only changes, are documented in the
[Releasing section of the README](README.md#-releasing).

Write the changeset summary for the consumer: what they can now do, in the present tense. It lands
verbatim in `CHANGELOG.md`.

Tell us in the description which accessibility path you verified, and with what. A change to focus,
ARIA or keyboard handling that says nothing about how it was tested will get that question back.
