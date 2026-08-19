# sonner-a11y

## 1.1.0

### Minor Changes

- 2bea2c8: Add a supported theming API: CSS custom properties you can declare from outside the shadow root.

  Toasts render in a shadow root, so class names and application stylesheets could never reach them —
  document rules do not cross the shadow boundary, and the palette was declared internally with bare
  names (`--success-bg`, `--gray4`) that nothing outside could override. Inherited custom properties
  are the one channel that does cross, so the palette is now read through a namespaced public token
  first, falling back to the shipped default:

  ```css
  [data-sonner-toasters] {
    --sonner-success-bg: #0f2e1d;
    --sonner-success-text: #7ee2a8;
    --sonner-border-radius: 4px;
  }
  ```

  Declare a token on the host, or on any ancestor including `:root`, and it wins in both themes;
  everything left undeclared keeps its current value. The full list is in the README's Theming section,
  along with the three caveats: the severity groups need `richColors`, one token covers light and dark
  (so give it a theme-aware value), and `--sonner-width` yields to the full-width mobile layout below
  600px.

  Nothing renders differently out of the box — the defaults are unchanged, and the internal names are
  now prefixed (`--_sonner-*`) so the exposed ones cannot collide with a host application's variables.

## 1.0.0

### Major Changes

- c3913bf: First release of the accessibility-focused fork of [sonner-js](https://github.com/huanfe1/sonner-js).

  The component is now usable with a screen reader and from the keyboard, and it honours the user's
  motion and contrast preferences (WCAG 2.2 AA):

  - toasts are announced through a dedicated live region kept in the light DOM, outside the shadow root
  - `alt+T` moves focus to the most recent toast; arrows navigate, `Delete` dismisses, `Escape` leaves
    and restores focus to where it was
  - auto-dismiss timers pause on hover, while focus is inside a toast, and while the tab is hidden
  - severity is exposed as visually hidden text, so it no longer relies on the icon and the colour alone
  - the action button is a real `<button>`, so Enter and Space work natively
  - the close button has an accessible name, and every label is translatable through `a11y.labels`
  - `prefers-reduced-motion` and `forced-colors` are honoured
  - the four light-theme `richColors` pairs that failed the 4.5:1 contrast ratio were corrected

  Fixed along the way: a stale timer could close a toast whose id had been recycled by `toast.promise`,
  a long hover left a negative remaining time that closed the toast instantly, and a batch of toasts
  created in one synchronous task rendered as a collapsed stack.

  Breaking changes against `sonner-js@1.1.3`:

  - the toast title is inserted as plain text instead of HTML — pass `titleAsHtml: true` to opt back in
  - the package is `sonner-a11y`
  - the Trusted Types policy is named `sonner-a11y`, so a host enforcing
    `require-trusted-types-for 'script'` must update its `trusted-types` directive
  - `toast.config()` merges into the current configuration instead of resetting the options it is not
    given — call `toast.resetConfig()` for the previous behaviour

- c3913bf: Ships as ESM, built with Vite and TypeScript 7

  - `dist/index.js` with type declarations at `dist/index.d.ts`, resolved through the `exports` map.
    ESM only: the library drives `document`, `window` and a shadow root, so it has no use outside a
    browser, and every modern bundler consumes it. A CommonJS consumer needs a dynamic `import()`.
  - `sideEffects: false`, so bundlers can drop the library entirely when nothing imports it.
  - No UMD bundle and no global: for a `<script type="module">` on a page, jsDelivr serves the ESM
    build at `https://cdn.jsdelivr.net/npm/sonner-a11y/+esm`.
  - The stylesheet ships inside the bundle as a string and is injected through `adoptedStyleSheets`,
    so no separate CSS file has to be imported.

### Patch Changes

- c3913bf: Expose each toast as a `listitem`, not just the list as a `list`

  `list-style: none` strips the list semantics on WebKit, which the explicit `role="list"` on the
  container already handled. The items need the same treatment for a second reason: an `<li>` whose
  display is no longer `list-item` — and toasts are `display: flex` — loses its implicit `listitem`
  role, which a role on the parent does not restore. Without it the notification list is announced
  without its items: no count, and no list navigation.
