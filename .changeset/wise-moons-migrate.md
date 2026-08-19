---
"sonner-a11y": major
---

Ships as ESM, built with Vite and TypeScript 7

- `dist/index.js` with type declarations at `dist/index.d.ts`, resolved through the `exports` map.
  ESM only: the library drives `document`, `window` and a shadow root, so it has no use outside a
  browser, and every modern bundler consumes it. A CommonJS consumer needs a dynamic `import()`.
- `sideEffects: false`, so bundlers can drop the library entirely when nothing imports it.
- No UMD bundle and no global: for a `<script type="module">` on a page, jsDelivr serves the ESM
  build at `https://cdn.jsdelivr.net/npm/sonner-a11y/+esm`.
- The stylesheet ships inside the bundle as a string and is injected through `adoptedStyleSheets`,
  so no separate CSS file has to be imported.
