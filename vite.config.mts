import { defineConfig } from 'vitest/config';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            // Explicit: the default is ['es', 'umd'], and UMD was dropped in 2.0.0.
            formats: ['es', 'cjs'],
            // `.mjs`/`.cjs` rather than a `type: module` flag plus bare `.js`: the extension alone
            // tells Node how to parse each bundle, and the package stays CJS-flavoured so the
            // extensionless relative imports inside the emitted `.d.ts` files keep resolving.
            fileName: format => (format === 'cjs' ? 'index.cjs' : 'index.mjs'),
        },
        // Matches the previous Rollup output, and beats the default minifier here (8.13 vs 8.80 kB gzip).
        minify: 'terser',
        sourcemap: true,
    },
    // The demo bench at the repo root imports `/src/index.ts` directly, so the dev server gives it
    // HMR — including on `style.css`, which is injected as a string through `adoptedStyleSheets`.
    test: {
        environment: 'happy-dom',
        include: ['src/**/*.test.ts'],
    },
});
