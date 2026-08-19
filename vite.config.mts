import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      // ESM only: the library drives `document`, `window` and a shadow root, so it has no use
      // outside a browser, and a dual build cannot hand correct types to both module systems
      // from one declaration file (`attw` reports it as masquerading).
      formats: ["es"],
      fileName: () => "index.js",
    },
    // Matches the previous Rollup output, and beats the default minifier here (8.13 vs 8.80 kB gzip).
    minify: "terser",
    sourcemap: true,
  },
  // The demo bench at the repo root imports `/src/index.ts` directly, so the dev server gives it
  // HMR — including on `style.css`, which is injected as a string through `adoptedStyleSheets`.
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
  },
});
