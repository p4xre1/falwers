# src/components

Canonical shared component models consumed by the generators in `scripts/`:

- `site-chrome.js` — navigation, footer, press and contact data model
- `product-card.js` — product card contract (mirrors the runtime card in `public/assets/js/ui.js`)
- `seo-head.js` — idempotent `<head>` partial builders (geo meta, JSON-LD, canonical)

The live DOM renderers remain vanilla JS in `public/assets/js/` (no build step required);
these modules are the shared source of truth so scripts and runtime never drift.
