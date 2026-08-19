# Security Policy

## Reporting a vulnerability

Report it privately through
[GitHub Security Advisories](https://github.com/hebus/sonner-a11y/security/advisories/new) — not as a
public issue. You should get an initial response within a week.

## Supported versions

The latest minor of the current major receives security fixes. Older majors do not.

## What this library touches

It renders into a shadow root in the page it is loaded on, so its attack surface is small but not
empty. Worth knowing before you report, and before you deploy:

- **`titleAsHtml: true` inserts the title as HTML.** It is off by default, and the title is otherwise
  inserted as plain text. Turning it on hands sanitising to the caller: passing user-controlled
  strings with it enabled is an XSS vector in your application, not a vulnerability in this library.
  The same applies to the `description` option.
- **The Trusted Types policy is named `sonner-a11y`.** A host enforcing
  `require-trusted-types-for 'script'` must allow that name in its `trusted-types` directive. The
  policy is created lazily and only passes values through — it does not sanitise, and it is not a
  security boundary on its own.
- **Styles are written through the CSSOM**, via `adoptedStyleSheets` and one `cssText` assignment, so
  a strict `style-src` Content Security Policy does not need `'unsafe-inline'`. No `<style>` element
  is injected and no external resource is fetched.
- **No network access, no storage, no runtime dependencies.** The library never fetches anything,
  reads no cookies and writes to neither `localStorage` nor `sessionStorage`. It has zero production
  dependencies, so its supply chain is its own source plus the build toolchain.

An accessibility defect — a missing announcement, a focus trap, an unreachable control — is a bug,
not a security issue. Please open a regular issue for those.
