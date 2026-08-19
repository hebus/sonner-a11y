---
"sonner-a11y": minor
---

Add a supported theming API: CSS custom properties you can declare from outside the shadow root.

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
