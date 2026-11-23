---
"sonner-a11y": patch
---

fix: make the close button 24x24 CSS px on the element itself instead of enlarging its hit area with a pseudo-element, so it meets WCAG 2.5.8 (target size) for automated checkers too. The close button is 4px larger.
