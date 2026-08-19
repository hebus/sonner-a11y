---
"sonner-a11y": patch
---

Expose each toast as a `listitem`, not just the list as a `list`

`list-style: none` strips the list semantics on WebKit, which the explicit `role="list"` on the
container already handled. The items need the same treatment for a second reason: an `<li>` whose
display is no longer `list-item` — and toasts are `display: flex` — loses its implicit `listitem`
role, which a role on the parent does not restore. Without it the notification list is announced
without its items: no count, and no list navigation.
