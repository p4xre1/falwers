/**
 * Curated editorial copy for the AI-discovery layer.
 *
 * WHY THIS FILE EXISTS
 * The generators (scripts/generate-llms-enhanced.mjs) used to hardcode marketing
 * prose that drifted from the real catalog ("3 colors", "45–270 MAD") while the
 * shipped llms.txt had been hand-corrected. Regenerating therefore *downgraded*
 * the published files. Everything factual is now derived from the live catalog
 * (public/assets/js/data.js); only genuinely editorial wording lives here.
 *
 * Rule of thumb: numbers/prices/colors/phone => derived. Sentences => here.
 */

/** Pages advertised in llms.txt, in deliberate order (legal pages are omitted). */
export const LLMS_PAGE_ORDER = ['home', 'shop', 'occasions', 'offers', 'blog', 'care', 'sizeguide', 'faq', 'about', 'contact'];

/** Short human label + one-line summary per page. `d` may be a function of live facts. */
export const PAGE_COPY = {
  home: { label: 'Home', d: f => `Boutique + custom bouquet builder (${f.builderMin}–${f.builderMax} roses, live price).` },
  shop: { label: 'Shop', d: () => 'Full collection with occasion, color, price and sort filters (supports ?occ= and ?max= deep links).' },
  occasions: { label: 'Gifts by occasion', d: () => 'Curated gifts for weddings, birthdays, anniversaries, graduation, new baby, thank-you + budget tiers (under 100 / 100–250 / above 250 DH).' },
  offers: { label: 'Offers', d: f => `Current offers — 10% welcome code ROSE10, free delivery from ${f.freeShip} DH, builder from ${f.unit} DH/rose.` },
  blog: { label: 'Blog', d: () => 'Care guides and gift advice articles (Arabic-first).' },
  care: { label: 'Care guide', d: () => 'The 6 rules to make satin roses last a year+ (no water, weekly air-dust, no direct sun, avoid humidity, reshape petals, proper storage).' },
  sizeguide: { label: 'Size guide', d: () => 'Dimensions of bouquets and boxes (roses count, height, diameter).' },
  faq: { label: 'FAQ', d: () => 'Delivery time (same day if ordered before 16:00), COD, 48h replacement, custom orders.' },
  about: { label: 'Our story', d: () => 'Family atelier in Tangier handcrafting every rose from luxurious satin.' },
  contact: { label: 'Contact', d: f => `WhatsApp +${f.whatsapp} — Arabic, French or English.` },
  privacy: { label: 'Privacy', d: () => 'How order data is handled (Moroccan law 09-08).' },
  terms: { label: 'Terms', d: () => 'Order, delivery and replacement terms.' },
  product: { label: 'Product', d: () => 'Single rose or arrangement page — price, colors and add-ons.' },
  track: { label: 'Order tracking', d: () => 'Status timeline by order ID.' },
  wishlist: { label: 'Wishlist', d: () => 'Saved roses (browser-local).' },
  search: { label: 'Search', d: () => 'Search products, articles and FAQ.' },
  cart: { label: 'Cart', d: () => 'Basket (functional page).' },
  checkout: { label: 'Checkout', d: () => 'WhatsApp checkout, cash on delivery.' },
  admin: { label: 'Admin', d: () => 'Private CMS.' }
};

/** Product one-liners for llms.txt, keyed by slug (falls back to a derived line). */
export const PRODUCT_BLURBS = {
  'bouquet-amour': '10 handmade satin roses',
  'coeur-royal': '20 handmade satin roses',
  'etoile-de-casa': '15 handmade satin roses',
  'mini-rose': '5 handmade satin roses',
  'boite-carree': '9 satin roses in velvet box',
  'boite-coeur': '12 heart-shaped satin roses',
  'coffret-luxe': '25 satin roses coffret',
  'pack-saint-valentin': '30 satin roses',
  'ensemble-maries': '50 satin roses',
  'cadeau-anniversaire': '12 satin roses',
  'rose-unique': '1 handmade satin rose',
  'papillons-satin-6': '6 satin butterflies',
  'cadre-cadeau': 'framed satin rose'
};

/** Store-policy block for llms.txt — the Tangier-only rule is load-bearing for AI answers. */
export const POLICIES = f => [
  'Payment: cash on delivery (COD) only. No online payment.',
  `Delivery: inside Tangier only, same day if ordered before 16:00, otherwise next day. Free from ${f.freeShip} DH. Never claim nationwide Morocco delivery.`,
  'Replacement: within 48h if defective or not as ordered.',
  `Orders: completed over WhatsApp (${f.waPretty}). No accounts, no order database.`
];

/** "What this business is" paragraph for llms-full.txt. */
export const BUSINESS = f =>
  `Rose by Marry is a family atelier in Tangier, Morocco, handcrafting satin roses that never wilt. Customers order ready bouquets or build custom ones (${f.builderMin}–${f.builderMax} roses) on the website, choose a color, optional add-ons, then complete the order over WhatsApp with cash on delivery.`;

/** Long-form English FAQ for llms-full.txt. */
export const FULL_FAQ = f => [
  'Q: Do roses wilt? A: No — they are handmade from satin and last for years.',
  'Q: Do you ship outside Tangier? A: No, delivery is inside Tangier only.',
  `Q: Can I choose the color? A: Yes — ${f.colorList} — chosen per product and in the builder.`,
  'Q: How do I pay? A: Cash on delivery when the order arrives.',
  `Q: Can I track my order? A: Yes, with your RBM order ID at ${f.url}/track.`
];

/** Non-catalog site sections, described for assistants. */
export const SITE_SECTIONS = f => [
  '- /occasions — gift finder by occasion (wedding, birthday, anniversary, graduation, baby, thanks) with shop filters ?occ= and budget tiers ?max=99 / ?max=250.',
  `- /offers — live offers: welcome code ROSE10 (-10% first order), free Tangier delivery from ${f.freeShip} DH, custom builder from ${f.unit} DH per rose.`,
  "- /care — the atelier's 6 care rules: no water ever; weekly gentle air-dusting; no direct sunlight; avoid humid rooms; fluff petals after unwrapping; store in cardboard/paper, never tight plastic. With HowTo structured data.",
  '- /size-guide — approximate dimensions: bouquets S 5–9 roses (25cm high, 15cm Ø) / M 10–15 (35cm, 22cm) / L 16–25 (45cm, 30cm); boxes S 9 roses 15×15cm velvet / M 12–15 roses 20×20cm / L 20–25 roses 25×25cm.',
  '- /blog — Arabic-first articles with BlogPosting + speakable structured data; each article may embed an FAQ (FAQPage schema).',
  '- /faq — same-day Tangier delivery before 16:00, COD, 48h free replacement, custom/wedding orders via WhatsApp. FAQPage structured data.',
  '- /ai — human-readable index of every AI/SEO file published by this site.'
];

/** Arabic quick-answer FAQ (what Moroccan shoppers actually ask an assistant). */
export const SHORT_FAQ_AR = [
  'Q: متى يوصل طلبي؟ A: داخل طنجة — اليوم نفسه قبل 16:00، وإلا اليوم الموالي.',
  'Q: كيف أدفع؟ A: الدفع عند الاستلام نقداً — بلا دفع مسبق.',
  'Q: كم تبقى ورود الساتان؟ A: سنة كاملة وأكثر مع العناية — بلا ماء ولا ضوء.',
  'Q: هل يمكن استبدال الباقة؟ A: خلال 48 ساعة إذا كان المنتج معيباً أو مخالفاً.'
];

/** ai.txt crawler-policy body. */
export const AI_POLICY = f => ({
  summary: 'Handmade satin roses atelier in Tangier, Morocco. Catalog, prices and policies are public and safe to quote.',
  allowed: 'public pages, catalog, prices, llms.txt, llms-full.txt, sitemaps.',
  notAllowed: '/admin/ (private CMS), /cart, /checkout (functional), order data, phone numbers of customers.',
  attribution: 'cite as "Rose by Marry — rosebymarry.com".',
  prices: 'in Moroccan dirham (MAD), cash on delivery, Tangier-only delivery.',
  contact: `WhatsApp +${f.whatsapp}`
});

/**
 * ai-sitemap.xml is deliberately NOT the full sitemap: it is the short reading list
 * we want an assistant to crawl first — content pages only, no product permalinks
 * (those live in sitemap.xml + llms.txt) and no functional pages. Order matters:
 * it signals priority. Keep in sync with tests/test-mobile-aio.mjs (expects 12).
 */
export const AI_SITEMAP = [
  { page: 'home', changefreq: 'daily', priority: '1.0' },
  { page: 'shop', changefreq: 'daily', priority: '0.9' },
  { page: 'occasions', changefreq: 'weekly', priority: '0.7' },
  { page: 'offers', changefreq: 'weekly', priority: '0.7' },
  { page: 'blog', changefreq: 'weekly', priority: '0.7' },
  { page: 'faq', changefreq: 'monthly', priority: '0.6' },
  { page: 'about', changefreq: 'monthly', priority: '0.6' },
  { page: 'contact', changefreq: 'monthly', priority: '0.6' },
  { page: 'care', changefreq: 'monthly', priority: '0.5' },
  { page: 'sizeguide', changefreq: 'monthly', priority: '0.5' },
  { page: 'privacy', changefreq: 'yearly', priority: '0.3' },
  { page: 'terms', changefreq: 'yearly', priority: '0.3' }
];

/**
 * Catalogue of the published AI/SEO files, rendered by /ai and the admin panel.
 * `records`/`routes` are filled in at generation time from the real files.
 */
export const AI_FILE_MANIFEST = [
  { path: '/llms.txt', kind: 'llms', title: { ar: 'llms.txt', fr: 'llms.txt', en: 'llms.txt' },
    d: { ar: 'لـ ChatGPT و Perplexity و Claude — كل الصفحات + المنتجات', fr: 'Pour ChatGPT, Perplexity, Claude — toutes les pages + produits', en: 'For ChatGPT, Perplexity, Claude — all pages + products' } },
  { path: '/llms-full.txt', kind: 'llms', title: { ar: 'llms-full.txt', fr: 'llms-full.txt', en: 'llms-full.txt' },
    d: { ar: 'نسخة كاملة مفصلة للذكاء الاصطناعي (كتالوج ثلاثي اللغات)', fr: 'Version complète détaillée pour l’IA (catalogue trilingue)', en: 'Full detailed reference for AI (trilingual catalog)' } },
  { path: '/ai.txt', kind: 'policy', title: { ar: 'ai.txt', fr: 'ai.txt', en: 'ai.txt' },
    d: { ar: 'توجيه وسياسة استخدام للذكاء الاصطناعي', fr: 'Directives et politique d’usage IA', en: 'AI usage directives and policy' } },
  { path: '/ai-sitemap.xml', kind: 'sitemap', title: { ar: 'ai-sitemap.xml', fr: 'ai-sitemap.xml', en: 'ai-sitemap.xml' },
    d: { ar: 'خريطة مختصرة للذكاء الاصطناعي — صفحات المحتوى فقط', fr: 'Plan de site IA — pages de contenu uniquement', en: 'AI sitemap — content pages only' } },
  { path: '/sitemap.xml', kind: 'sitemap', title: { ar: 'sitemap.xml', fr: 'sitemap.xml', en: 'sitemap.xml' },
    d: { ar: 'خريطة الموقع القياسية لمحركات البحث', fr: 'Plan de site standard pour les moteurs', en: 'Standard search-engine sitemap' } },
  { path: '/robots.txt', kind: 'policy', title: { ar: 'robots.txt', fr: 'robots.txt', en: 'robots.txt' },
    d: { ar: 'سماح للزواحف + روابط sitemap و llms.txt', fr: 'Autorisations crawlers + liens sitemap et llms.txt', en: 'Crawler allowances + sitemap and llms.txt links' } },
  { path: '/.well-known/ai-plugin.json', kind: 'manifest', title: { ar: 'ai-plugin.json', fr: 'ai-plugin.json', en: 'ai-plugin.json' },
    d: { ar: 'مانيفست إضافات ChatGPT', fr: 'Manifeste de plugin ChatGPT', en: 'ChatGPT plugin manifest' } },
  { path: '/.well-known/openapi.json', kind: 'manifest', title: { ar: 'openapi.json', fr: 'openapi.json', en: 'openapi.json' },
    d: { ar: 'واجهة OpenAPI للقراءة فقط', fr: 'Description OpenAPI en lecture seule', en: 'Read-only OpenAPI description' } },
  { path: '/mcp.json', kind: 'manifest', title: { ar: 'mcp.json', fr: 'mcp.json', en: 'mcp.json' },
    d: { ar: 'كتالوج MCP لمساعدات الذكاء الاصطناعي', fr: 'Catalogue MCP pour assistants IA', en: 'MCP discovery catalog for AI assistants' } }
];

export default { LLMS_PAGE_ORDER, PAGE_COPY, PRODUCT_BLURBS, POLICIES, BUSINESS, FULL_FAQ, SITE_SECTIONS, SHORT_FAQ_AR, AI_POLICY, AI_FILE_MANIFEST };
