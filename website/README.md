# Documentation site

The documentation and live demo for `sonner-a11y`, deployed to GitHub Pages by
[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) on every push to `main`:
<https://hebus.github.io/sonner-a11y/>

It consumes the library through the workspace (`"sonner-a11y": "workspace:*"`), so it resolves to
`../dist` and the library has to be built first:

```bash
pnpm build                      # from the repository root
pnpm --filter website dev       # http://localhost:3000
```

Building it is also a useful check on the published package: it type-checks the library's emitted
declarations the way a real consumer would.

To work on the library itself rather than on this site, use `pnpm dev` at the root — it serves the
accessibility test bench with hot reloading. See [CONTRIBUTING.md](../CONTRIBUTING.md).
