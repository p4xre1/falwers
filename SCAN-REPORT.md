# Project Scan Report — 2026-09-19
Scope: 20 storefront pages · 14 admin pages · 7 JS/CSS core files · AI catalogs · sitemaps · i18n ×3

## Found & Fixed (9 real issues)
| # | Issue | Fix |
|---|-------|-----|
| 1 | `mcp.json` pointed AI assistants to `/shipping.html` — page does not exist | → `/faq.html` (delivery answers live there) |
| 2 | `ai-plugin.json` `legal_info_url` → `/returns.html` — does not exist | → `/faq.html` (48h replacement policy) |
| 3 | i18n collision: occasions-page keys (`occ_t`, `occ_wed`…) overwrote the homepage heritage texts (last-definition-wins in same dict) | renamed page keys to `occp_*` ×3 langs + occasions.html |
| 4 | i18n collision: `search_ph` overwrote the shop-search placeholder | renamed to `q_ph` ×3 + search.html |
| 5 | Pre-existing duplicate key `promo_t` ('تخفيض' badge vs 'كود الخصم' cart label — badge text was broken site-wide) | cart label → `promo_code_t` ×3, badge restored |
| 6 | Blog editor labels (`ab_img`, `ab_alt`, `ab_faq`, `ab_bulk`, `ab_bulk_go`) missing from i18n → raw key names shown | added ×3 langs |
| 7 | `tab_colors` missing → admin sidebar + colors pane literally displayed "tab_colors" | added ×3 langs |
| 8 | `admin/blog.html` missing shared `errbar.js` reference (inconsistent with 13 other admin pages) | added |
| 9 | `#toasts` mount missing on faq/privacy/terms/404 → `toast()` silently dead there | added to all 4 |

## Verified Clean (false alarms ruled out)
- **34/34 pages boot with zero runtime errors** (jsdom, scripts over HTTP)
- **Zero dead buttons**: every `<button id>` in 34 pages has a live handler (pcGo/cfOk/cfCancel shell-bound)
- Sitemap product slugs == runtime `slugify(fr)` over catalog (13/13 match)
- All local links/anchors/assets resolve across 34 pages (incl. `#builder`, manifest icons, og-image)
- robots.txt (20+ bot blocks) refs all resolve; `ai-sitemap.xml` valid, 12 URLs, no admin/search
- Every used i18n key exists exactly ×3 (AR/FR/EN) — now permanently asserted

## Open (known, by design / backlog)
- Wishlist share button + per-product photos (persona backlog, BUYER-JOURNEY.md)
- Search page is noindex by design; admin noindex enforced via headers + meta

Guard: `tests/test-scan.mjs` (10 checks) re-runs the whole audit on every regression.
**Status: 369/369 checks green across 21 suites.**

---

# Scan Round 2 — deeper audit (same day)

New angles: duplicate DOM ids · undefined function calls (cross-file) · data referential integrity · CSS coverage of used classes · SEO head matrix (20 pages) · admin CRUD completeness · package.json scripts · helper-load dependencies.

## Found & Fixed (6)
| # | Issue | Fix |
|---|-------|-----|
| 1 | `track.html` had `meta robots: index, follow` — **conflicting** with the noindex X-Robots-Tag header (standing rule: track = noindex) | meta → `noindex, nofollow` |
| 2 | `search.html` carried hreflang ×4 although noindex (pointless/contradictory signals) | removed |
| 3 | `privacy.html` + `terms.html` indexable but no hreflang ×4 | added |
| 4 | 7 utility classes used in markup/JS but **never styled**: `.pgrid` (search results grid!), `.set-sub` (admin hints), `.art-fig` (blog figure), `.bl-del`, `.promo-sec`, `.rows-colors`, `.q-hero` | styled (style.css v20 + admin.css v5) |
| 5 | `.count-up` numbers had no tabular-nums (layout shift risk on animation) | `font-variant-numeric: tabular-nums` (fallback text already present — no CLS) |
| 6 | Guard did not assert SEO matrix / dup-ids / helper-load deps | test-scan.mjs extended 10 → 22 checks |

## Verified Clean
- **Zero undefined function calls** at runtime: admin pages load ui.js+data.js (el/toast/saveState/sanitize/slugify all resolve) — asserted as permanent guard now
- **Zero duplicate DOM ids** across 34 pages
- **Data referential integrity**: 13 products → all categories valid (bouq/box/occ/gift/butterfly/crown/lace/card), 5 colors, zones/promos consistent
- **Admin CRUD complete**: every pane has add + delete + edit paths (products, colors, discounts, promos/zones, reviews, articles, FAQ, customers, orders status)
- **package.json scripts**: all targets exist (llms/seo/optimize/verify generators)
- SEO matrix now fully consistent: 14 indexable pages = canonical+OG+twitter+hreflang×4 (product/article dynamic templates exempt by design); 6 noindex pages (cart/checkout/wishlist/track/search/404) clean

**Status: 381/381 checks green across 21 suites · cache v81 · 34 pages boot clean**
