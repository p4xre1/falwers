# 🌹 Rose by Marry — Full E-Commerce Boutique (v2)

A luxury, fully responsive **multi-page e-commerce website** in an editorial "atelier" aesthetic (deep burgundy · cream · thin serif letterspaced caps, moody editorial photography, press strip, renaissance triptych) — for a handmade satin rose boutique. 100% client-side — **no backend, no external services**. Deploy any static host.

> v5 "Atelier Noor" update: emoji-free luxury typography (Italiana + Cormorant Garamond + Jost; Amiri + Aref Ruqaa + Tajawal for Arabic), high-motion layer (scroll reveals with stagger, hero ken-burns, press marquee, tilt cards, sheen buttons, count-up stats, gold-rule headings, admin micro-interactions — all respecting `prefers-reduced-motion`), regenerated unbranded photography, **Tangier-only delivery**, **manual shop discounts**, **per-flower URLs (slugs) with page/rose interest analytics**, and a 10-page admin CMS (adds Discounts + Interest tabs).

> v3 redesign: dark-luxe "eternity rose maison" look with generated editorial photography in `img/`. Previous builders-rose style is retained in code history; the rose art engine now complements photographic imagery. + analytics admin dashboard** for a handmade satin rose boutique. 100% client-side — **no backend, no external services**. Deploy any static host.

## 📁 Project structure

```
rose-by-marry/
wrangler.toml       Cloudflare Pages config (deploys public/)
├── package.json        Script shortcuts (start / llms / seo / optimize / deploy) — zero deps
├── public/             ⬅ THE DEPLOYABLE SITE (static, no build step)
│   ├── index.html          Home (hero, editorials, builder, triptych…)
│   ├── shop.html           Catalog with color filters
│   ├── product.html        Rose template — unique URL per rose (?id=<slug>)
│   ├── cart.html           Cart, promo + shop discounts, Tangier zone
│   ├── checkout.html       WhatsApp checkout (COD) — Tangier only
│   ├── track.html          Order tracking timeline
│   ├── about.html / contact.html / wishlist.html
│   ├── og-image.jpg        Social thumbnail
│   ├── robots.txt          Allows humans + AI crawlers (GPTBot, ClaudeBot, PerplexityBot…)
│   ├── llms.txt / llms-full.txt / ai.txt      AI-discovery layer (generated)
│   ├── sitemap.xml / ai-sitemap.xml           Standard + curated AI sitemap (generated)
│   ├── .well-known/{ai-plugin,openapi}.json   ChatGPT manifests (generated; mirrored at root)
│   ├── ai.html                                Public /ai index of every AI/SEO file
│   ├── _headers            Cloudflare security/robots headers
│   ├── _redirects          /index.html → /  (canonical home URL)
│   ├── img/                Photography (unbranded)
│   ├── assets/             css/style.css + js/{i18n,data,ui,shop}.js
│   └── admin/              10-page CMS (analytics, orders, discounts, ratings, colors,
│                           products, marketing, customers, interest, settings)
├── tests/              jsdom end-to-end suites (node tests/test-store5.mjs, test-cms5.mjs)
├── src/                Source of truth consumed by the generators
│   ├── routes/routes.js    Route table (SITE, ROUTES, productRoutes)
│   ├── pages/              Trilingual SEO metadata per page
│   └── components/         site-chrome, product-card, seo-head builders
├── scripts/                Node generators (no dependencies)
│   ├── generate-llms-enhanced.mjs   llms.txt + llms-full.txt + ai.txt
│   ├── optimize-ai-seo.mjs          robots + sitemaps + geo/JSON-LD injection + audit
│   └── load-catalog.mjs             vm-loads the live catalog from data.js
├── supabase/           OPTIONAL future backend (config, schema, docs)
└── .vscode/            Editor settings + recommended extensions```

## 🤖 AI / SEO tooling (no dependencies)

```bash
node scripts/generate-llms-enhanced.mjs   # rebuilds llms.txt, llms-full.txt, ai.txt from the live catalog
node scripts/optimize-ai-seo.mjs          # rebuilds robots.txt + sitemaps + .well-known manifests, injects geo/JSON-LD, audits pages
npm run optimize                          # both
```

### Published files

| File | Purpose |
|---|---|
| `/llms.txt` | Concise index: every page + the whole catalog with prices |
| `/llms-full.txt` | Full reference: trilingual catalog, colors, builder, policies, FAQ |
| `/ai.txt` | What may be quoted, what is off-limits, attribution |
| `/robots.txt` | 20+ AI crawlers explicitly allowed + sitemap/llms pointers |
| `/sitemap.xml` | Every public route incl. one URL per rose |
| `/ai-sitemap.xml` | **Curated** short reading list — content pages only, priority-ordered |
| `/.well-known/ai-plugin.json` · `/openapi.json` | ChatGPT manifests (mirrored at the site root for older links) |
| `/mcp.json` | MCP discovery catalog |
| **`/ai`** | Human-readable page listing all of the above (linked in the footer) |
| Admin → **ملفات AI و SEO** | Same list inside the CMS, one click to open each file |

- **Facts vs. wording:** every number (colors, prices, fees, phone, tiers) is read from the live catalog in `public/assets/js/data.js`; only editorial sentences live in `src/content/ai-copy.js`. This is why re-running the generators can no longer downgrade the published files.
- Every route needs an entry in `src/pages/` — a missing one used to crash both generators. `tests/test-ai-seo.mjs` now asserts the registry is complete.
- Head injection is idempotent: a block is skipped when our `RBM-SEO:*` marker **or** an equivalent hand-written tag is already present (previously it duplicated canonicals/JSON-LD on hand-authored pages).
- `_headers` serves the AI layer as `text/plain`/`application/json` with `Access-Control-Allow-Origin: *` so assistants can fetch it cross-origin.
- `SITE_URL=https://your-domain.com npm run optimize` overrides the domain (default `https://rosebymarry.com`).
- Home resolves at `/` (nav + brand + breadcrumbs link to `/`; `_redirects` 301s `/index.html`).
- All runtime URLs live in one registry: `LINKS` in `public/assets/js/ui.js`.
- Product pages emit runtime `Product` JSON-LD (name, price MAD, availability, URL).
- Geo: `geo.region MA-TNG`, ICBM coordinates, Tangier `areaServed` in schema.org data.

> After changing products or prices, run `npm run optimize` so the AI layer matches the storefront, then redeploy.

## 🚀 Deploy

1. Upload **everything** (all `.html` files + `assets/` + `og-image.jpg`) to any static host (Netlify, Vercel, GitHub Pages, cPanel…).
2. Open `/admin/` (index) → passcode **`1234`** → **Settings**:
   - Set the real **WhatsApp number** (international format, e.g. `212612345678`).
   - Set your **site URL** (drives `robots.txt` / `sitemap.xml` generation).
   - **Change the passcode**.
3. From **Data & SEO**, copy `robots.txt` / `sitemap.xml` into your host root.
4. Share promo codes with customers (e.g. `ROSE10` = −10%, `WELCOME50` = −50 DH on 300+).

> The admin shares the **same LocalStorage database** as the store (same domain): products edited in the dashboard appear in the shop on next load, and every WhatsApp order is logged for the dashboard.

## 🛍 Customer features

- **Trilingual** — Arabic (RTL), French, English with one-tap switching, everywhere.
- **Catalog** — 13 seeded products in 4 categories (bouquets, boxes, occasions, gifts), search, filters, sorting, ratings.
- **Product pages** — color swatches that recolor the procedural SVG art, quantity stepper, add-ons, gift note, reviews (write & read), related products, wishlist.
- **Bouquet builder** (home) — size tiers or custom rose count, live total, add to cart or order directly via WhatsApp.
- **Cart** — merge duplicate lines, promo codes (percent/fixed with minimum), delivery zones with fees, **free delivery threshold**.
- **Checkout** — validated form → formatted Arabic WhatsApp order (`wa.me`) with order ID; COD.
- **Order tracking** — status timeline (New → Confirmed → Delivered) by order ID.
- Wishlist, testimonials from real reviews, floating petals, scroll reveals, fully responsive.

## 🔐 Admin dashboard

| Tab | Features |
|---|---|
| 📊 Analytics | KPIs (revenue, orders, avg basket, customers), 14-day orders line chart, revenue-by-category bars, status donut, top products — pure SVG, no libraries |
| 🌹 Products | Full CRUD: category, art type, 3 names, description, price, old price, badge, featured, active + live art preview; categories manager; builder sizes |
| 🎨 Colors & Add-ons | Colors (hex, availability), add-ons (price, icon, text field, enable) |
| 🎟 Promos & Zones | Promo codes (type, value, minimum, usage counter) and delivery zones (names, fees) |
| 🧾 Orders | Status management (New/Confirmed/Delivered/Cancelled), full item breakdown, delete |
| 👥 Customers | Auto-aggregated from orders: spend, order count, last order |
| ⭐ Reviews | Moderate/delete customer reviews |
| ⚙️ Settings | WhatsApp number, currency, custom-rose price, free-shipping threshold, site URL, passcode |
| 💾 Data & SEO | JSON export/import, reset, generated robots.txt (admin disallowed) + sitemap.xml |

## 🗄 Storage & privacy

- **LocalStorage** primary + **IndexedDB** mirror + in-memory fallback (never breaks).
- Cart & wishlist are per-browser and never included in backups.
- One-time migration from the v1 single-file store (WhatsApp number, currency, passcode carry over).
- No accounts, no tracking, no external services — orders are sent via the customer's own WhatsApp.

## 🛡 Security & SEO

- CSP meta (`default-src 'none'`), `referrer: no-referrer`, all input sanitized, dynamic DOM built with `textContent` only → XSS-safe.
- SHA-256 hashed passcode, brute-force lockout (3 tries → 30 s), per-tab session.
- `index, follow, max-image-preview:large` on public pages; `noindex` on cart/checkout/admin; Open Graph tags; generated `robots.txt` + `sitemap.xml`.

**Verified:** v2 (72) + v3 (38) suites + v5 suites — 15 CMS checks (10-tab gate, discounts CRUD, interest analytics, colors), 25 storefront checks (manual-discount math 90→−10%→+20 = 101 DH, Tangier-only migration, slug URLs, per-page/per-rose tracking, WA template integrity incl. shop-discount line, emoji-free UI), 17 offline checks on the self-contained preview (now retired — use the real site) — all passing at retirement (jsdom, real page loads).

Made with 🌹 for Rose by Marry — Tanger, Maroc.
