<div align="center">
  <h1>🍞 Sonner-a11y</h1>
  <p>An accessible toast component designed for Pure JavaScript</p>

[![npm version](https://img.shields.io/npm/v/sonner-a11y.svg?style=flat-square)](https://www.npmjs.com/package/sonner-a11y)
[![npm downloads](https://img.shields.io/npm/dm/sonner-a11y.svg?style=flat-square)](https://www.npmjs.com/package/sonner-a11y)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

  <p><em>An accessibility-focused fork of <a href="https://github.com/huanfe1/sonner-js">sonner-js</a> by huanfei,
  itself built on <a href="https://sonner.emilkowal.ski/">Sonner</a></em></p>
</div>

---

## ✨ Features

- 🚀 **Zero Dependencies** - Pure JavaScript implementation, no frameworks required
- 📱 **Responsive Design** - Perfect adaptation for mobile and desktop
- 🎨 **Multiple Styles** - Support for success, error, warning, info and more types
- ⚡ **Lightweight** - Small bundle size with excellent performance
- 🔧 **Highly Customizable** - Rich configuration options
- 🌙 **Theme Support** - Built-in light and dark themes
- 📦 **Dual-format Support** - ESM and CommonJS
- ♿ **Accessible** - Screen reader announcements, full keyboard operation, WCAG 2.2 AA

## 🚀 Quick Start

### Installation

```bash
npm install sonner-a11y
```

### Basic Usage

```javascript
import toast from "sonner-a11y";

// Simple toast
toast("Hello World!");

// Toast with description
toast("Operation successful", {
  description: "Your data has been saved",
});
```

## 📖 Usage Guide

### Different Toast Types

```javascript
// Success toast
toast.success("Operation successful");

// Error toast
toast.error("Operation failed");

// Info toast
toast.info("This is an information");

// Warning toast
toast.warning("Please note");
```

### Toast with Action Buttons

```javascript
toast("Confirm action", {
  action: {
    label: "Confirm",
    onClick: () => console.log("User clicked confirm"),
  },
});

// With cancel button
toast("Confirm deletion", {
  action: {
    label: "Cancel",
    onClick: () => console.log("User cancelled operation"),
    cancel: true,
  },
});
```

### Promise Handling

```javascript
const fetchData = () => fetch("/api/data");

toast.promise(fetchData, {
  loading: "Loading...",
  success: "Data loaded successfully",
  error: "Failed to load data",
});
```

### Update and Dismiss Toasts

```javascript
// Create toast and get ID
const toastId = toast("Processing...");

// Update toast
toast.success("Processing complete", { id: toastId });

// Dismiss specific toast
toast.dismiss(toastId);

// Dismiss all toasts
toast.dismiss();
```

### Permanent Toasts

```javascript
toast("Important notice", {
  duration: 0, // Set to 0 for permanent display
});
```

## 🌐 CDN Usage

```html
<script type="module">
  import toast from "https://cdn.jsdelivr.net/npm/sonner-a11y/+esm";

  toast("Hello from ESM!");
</script>
```

## ⚙️ Configuration Options

```javascript
import toast from "sonner-a11y";

// Global configuration
toast.config({
  theme: "dark", // 'light' | 'dark'
  expand: true, // Expand animation
  visibleToasts: 3, // Number of visible toasts
  gap: 8, // Toast spacing
  offset: 16, // Margin
  mobileOffset: 16, // Mobile margin
  dir: "ltr", // Text direction
  toastOptions: {
    position: "top-right", // Position
    duration: 4000, // Duration in milliseconds
    closeButton: true, // Show close button
    richColors: true, // Rich colors
    invert: false, // Invert the colours of the toast
    important: "auto", // Screen-reader politeness, see Accessibility
    titleAsHtml: false, // Interpret `title` as HTML
  },
});
```

> `toast.config()` merges into the current configuration, so you can call it more than once and only
> pass what changes. Use `toast.resetConfig()` to go back to the shipped defaults.

## ♿ Accessibility

Toasts are announced to screen readers, fully operable from the keyboard, and honour the user's
motion and contrast preferences.

### Keyboard

| Key                                                   | Effect                                                         |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| <kbd>Alt</kbd>+<kbd>T</kbd>                           | Move focus to the most recent toast and expand the stack       |
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd>      | Walk through the toasts and their buttons                      |
| <kbd>↓</kbd> <kbd>→</kbd> / <kbd>↑</kbd> <kbd>←</kbd> | Next / previous toast                                          |
| <kbd>Home</kbd> / <kbd>End</kbd>                      | First / last toast                                             |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd>              | Dismiss the focused toast (the keyboard equivalent of swiping) |
| <kbd>Esc</kbd>                                        | Collapse the stack and return focus to where it was            |

Auto-dismiss timers pause while the pointer is over the toasts, while focus is inside them, and
while the tab is hidden. Use `duration: 0` for a toast that never closes on its own.

### Screen reader announcements

Announcements go through a dedicated live region kept in the light DOM, outside the shadow root.
Errors interrupt (`aria-live="assertive"`), everything else is announced politely. Override it per
toast with `important`:

```javascript
toast.error("Payment failed", { important: false }); // announce politely
toast("Build finished", { important: true }); // interrupt
```

The severity is also carried as text for screen readers, since an icon and a colour alone are not
perceivable (“_Error. Payment failed. Card declined._”).

### Translating the labels

Defaults are in English. Everything a screen reader reads can be replaced:

```javascript
toast.config({
  a11y: {
    hotkey: ["altKey", "KeyN"], // modifier properties and/or KeyboardEvent.code values
    labels: {
      region: "Notifications", // `{hotkey}` is substituted, otherwise appended in parentheses
      close: "Fermer la notification",
      action: "Action",
      types: {
        success: "Succès",
        error: "Erreur",
        info: "Information",
        warning: "Avertissement",
        loading: "Chargement",
      },
    },
  },
});
```

Per toast, `typeLabel` overrides the severity label:

```javascript
toast.error("HTTP 502", { typeLabel: "Erreur serveur" });
```

### Other `a11y` options

| Option                  | Default                   | Effect                                                           |
| ----------------------- | ------------------------- | ---------------------------------------------------------------- |
| `announce`              | `true`                    | Announce toasts through the live region                          |
| `announceClearDelay`    | `1000`                    | How long the announced text stays in the region, in ms           |
| `hotkey`                | `['altKey', 'KeyT']`      | Key combination that focuses the most recent toast               |
| `pauseOnHover`          | `true`                    | Pause the timers while the pointer is over the toasts            |
| `pauseOnFocus`          | `true`                    | Pause the timers while focus is inside a toast                   |
| `pauseOnDocumentHidden` | `true`                    | Pause the timers while the tab is hidden                         |
| `dismissOnEscape`       | `false`                   | Make <kbd>Esc</kbd> dismiss the focused toast instead of leaving |
| `dismissKeys`           | `['Delete', 'Backspace']` | Keys that dismiss the focused toast (`[]` disables it)           |

### Differences from Sonner (React)

- Toasts carry no `aria-live` or `role="status"`: since this port renders into a shadow root whose
  container is created and destroyed on demand, a live region there is not reliably announced. A
  single dedicated region in the light DOM is used instead, which also rules out double announcements.
- `toast.error` interrupts by default; Sonner only looks at `important`.
- The hotkey focuses the most recent toast rather than the list, so the message is read straight away.
- <kbd>Esc</kbd> also restores focus to the element that had it before.

### Notes

- The toast title is inserted as **plain text**. Pass `titleAsHtml: true` to opt back into HTML —
  the caller is then responsible for sanitising it.
- A fixed-position toast can cover the element that currently has focus (WCAG 2.4.11). If that
  matters for your layout, raise `offset` or use a `top-*` position.

## 🚀 Releasing

Version numbers are managed by [Changesets](https://github.com/changesets/changesets) — never edit the
`version` field by hand.

Every pull request that changes the published package must ship a changeset describing its intent:

```bash
pnpm changeset          # pick patch / minor / major, write the summary
pnpm changeset:status   # what is pending
```

The summary lands verbatim in `CHANGELOG.md`, so write it for the consumer: what they can now do, in
the present tense. For a docs- or CI-only pull request, add `#skip-changeset` to the **title** instead.

Once merged into `main`, a `chore: version packages` pull request is opened (or updated) with the
version bump and the changelog entry. Merging it releases nothing on its own.

**CI never publishes.** Publishing runs from a real machine, so the tarball that reaches npmjs is the
one that was verified locally, and no long-lived npm token has to live in CI:

```bash
pnpm release:dry        # run every check, publish nothing
pnpm release            # publish to npmjs, then tag <name>@<version>
```

The script refuses to publish a dirty tree, a branch other than `main`, a `main` out of sync with the
remote, or a version whose sources changed after Changesets set it — otherwise npm, the changelog and
git would describe different trees. A version already on npm is a no-op, not an error, and the tag is
only pushed once the publish succeeded.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
