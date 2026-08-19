---
"sonner-a11y": major
---

Ships as ESM and CommonJS, built with Vite and TypeScript 7

- `dist/index.mjs` (ESM) and `dist/index.cjs` (CommonJS), resolved through the `exports` map, plus
  type declarations at `dist/index.d.ts`. The explicit extensions let Node parse each bundle without
  having to infer its module type.
- No UMD bundle and no global: for a `<script type="module">` on a page, jsDelivr serves the ESM
  build at `https://cdn.jsdelivr.net/npm/sonner-a11y/+esm`.
- The stylesheet ships inside the bundle as a string and is injected through `adoptedStyleSheets`,
  so no separate CSS file has to be imported.
