import { defineBrowserCommand, playwright } from "@vitest/browser-playwright";
import { defaultExclude, defineConfig } from "vitest/config";

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
    coverage: {
      // Floors set just under what the suite reaches today, so a drop fails rather than passing
      // quietly. `toast.promise` is the known gap — it is what keeps index.ts low.
      thresholds: { statements: 75, branches: 60, functions: 85, lines: 78 },
    },
    projects: [
      {
        // Logic that needs no real layout: config merging, timers, live-region bookkeeping.
        test: {
          name: "unit",
          environment: "happy-dom",
          include: ["src/**/*.test.ts"],
          // `*.browser.test.ts` also ends in `.test.ts`, so it has to be excluded by hand
          exclude: [...defaultExclude, "src/**/*.browser.test.ts"],
        },
      },
      {
        // Everything the library actually promises needs a real browser: happy-dom has no layout,
        // no `:focus-visible`, no constructable stylesheets worth trusting and no `getAnimations()`.
        test: {
          name: "browser",
          include: ["src/**/*.browser.test.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
            commands: {
              // reduced motion and forced colors cannot be set from inside the page, so the test
              // asks Playwright to emulate them on the browser context
              emulateMedia: defineBrowserCommand<[Record<string, string | null>]>(
                async ({ page }, options) => {
                  await page.emulateMedia(options);
                },
              ),
            },
          },
        },
      },
    ],
  },
});
