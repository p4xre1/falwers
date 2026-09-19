#!/usr/bin/env node
/**
 * optimize-ai-seo.mjs — robots.txt (with AI crawlers), sitemap.xml, ai-sitemap.xml,
 * the /.well-known/ AI manifests, plus idempotent geo/JSON-LD/canonical injection
 * into public/*.html, then an SEO audit.
 * Usage: node scripts/optimize-ai-seo.mjs   (env SITE_URL to override domain)
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, ROOT } from './load-catalog.mjs';
import { SITE, ROUTES, productRoutes } from '../src/routes/routes.js';
import { PAGES } from '../src/pages/index.js';
import { geoBlock, jsonLdBlock, canonicalBlock, MARK, HAS } from '../src/components/seo-head.js';
import { AI_SITEMAP, PAGE_COPY } from '../src/content/ai-copy.js';

const PUB = path.join(ROOT, 'public');
const { S } = loadCatalog();
const site = { ...SITE, url: (process.env.SITE_URL || SITE.url).replace(/\/$/, '') };
const products = S.products.filter(p => p.active);
const prodRoutes = productRoutes(products);
const today = new Date().toISOString().slice(0, 10);
const url = p => site.url + p;

/* ---------- robots.txt (humans + AI crawlers) ---------- */
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Googlebot', 'Bingbot', 'Applebot', 'Applebot-Extended',
  'CCBot', 'Amazonbot', 'meta-externalagent', 'Bytespider', 'Diffbot', 'YouBot'
];
let robots = 'USER-AGENT: *\nALLOW: /\nDISALLOW: /admin/\nDISALLOW: /cart\nDISALLOW: /checkout\n\n';
for (const b of AI_BOTS) robots += `USER-AGENT: ${b}\nALLOW: /\nDISALLOW: /admin/\nDISALLOW: /cart\nDISALLOW: /checkout\n\n`;
robots += `SITEMAP: ${site.url}/sitemap.xml\nSITEMAP: ${site.url}/ai-sitemap.xml\nAI-DIRECTIVES: ${site.url}/ai.txt\nLLMS: ${site.url}/llms.txt\n`;
fs.writeFileSync(path.join(PUB, 'robots.txt'), robots);

/* ---------- /.well-known/ AI manifests ----------
   ChatGPT and several agents probe /.well-known/ first. The files already existed at
   the site root, so we write BOTH locations from one source of truth here (the root
   copies stay for backwards compatibility with links already published). */
const WK = path.join(PUB, '.well-known');
fs.mkdirSync(WK, { recursive: true });

const aiPlugin = {
  schema_version: 'v1',
  name_for_human: site.name,
  name_for_model: 'rose_by_marry',
  description_for_human: 'ورشة ورود ساتان مصنوعة يدوياً في طنجة — الدفع عند الاستلام.',
  description_for_model:
    `${site.name} is a handmade satin-roses atelier in Tangier, Morocco (Arabic-primary site, also French/English). ` +
    'Use this plugin to read the public store guide, product catalog, blog articles, FAQs, shipping and returns policies. ' +
    'Delivery is Tangier-only with cash on delivery; never claim nationwide Morocco delivery. Orders are placed via WhatsApp, not via API.',
  auth: { type: 'none' },
  /* points at the ROOT openapi.json: that copy exists no matter how the host treats
     dot-directories, and /.well-known/openapi.json is served as well for agents
     that probe it directly. */
  api: { type: 'openapi', url: `${site.url}/openapi.json`, is_user_authenticated: false },
  logo_url: `${site.url}/assets/img/favicon.svg`,
  contact_email: 'hello@rosebymarry.com',
  legal_info_url: `${site.url}/terms.html`
};

const ro = (summary, operationId, description) => ({ get: { summary, operationId, responses: { 200: { description } } } });
const openapi = {
  openapi: '3.0.0',
  info: {
    title: `${site.name} — public catalog (read-only)`,
    version: '1.0.0',
    description: 'Static read-only resources for AI assistants. No write endpoints exist.'
  },
  servers: [{ url: site.url }],
  paths: {
    '/llms.txt': ro('Store guide (short)', 'getLlms', 'text/plain guide'),
    '/llms-full.txt': ro('Store guide (full)', 'getLlmsFull', 'text/plain full guide'),
    '/ai.txt': ro('AI usage policies', 'getAiTxt', 'text/plain policies'),
    '/sitemap.xml': ro('Sitemap of public routes', 'getSitemap', 'application/xml'),
    '/ai-sitemap.xml': ro('Short AI reading list', 'getAiSitemap', 'application/xml'),
    '/blog.html': ro('Blog listing (published articles)', 'getBlog', 'text/html, Arabic primary'),
    '/shop.html': ro('Product catalog', 'getShop', 'text/html'),
    '/faq.html': ro('FAQ with FAQPage schema.org markup', 'getFaq', 'text/html')
  }
};

/* Written to BOTH locations, byte-identical. Some hosts (older Wrangler, GitHub
   Pages without a bypass) drop dot-directories on upload, so the root copies are
   the dependable ones and /.well-known/* is the spec-friendly alias. */
const writeJson = (rel, obj) => fs.writeFileSync(path.join(PUB, rel), JSON.stringify(obj, null, 2) + '\n');
for (const dir of ['', '.well-known/']) {
  writeJson(dir + 'ai-plugin.json', aiPlugin);
  writeJson(dir + 'openapi.json', openapi);
}

/* ---------- sitemap.xml ---------- */
const urls = [];
for (const r of ROUTES.filter(r => r.public)) {
  urls.push({ loc: url(r.path), lastmod: today, priority: r.priority, changefreq: r.changefreq });
}
for (const pr of prodRoutes) {
  urls.push({ loc: url(pr.path), lastmod: today, priority: pr.priority, changefreq: 'weekly' });
}
const sx = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
for (const u of urls) {
  sx.push(`  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority.toFixed(1)}</priority></url>`);
}
sx.push('</urlset>');
fs.writeFileSync(path.join(PUB, 'sitemap.xml'), sx.join('\n') + '\n');

/* ---------- ai-sitemap.xml ----------
   Deliberately a SHORT reading list for assistants (content pages only, no product
   permalinks and no functional pages) — the curated order lives in src/content/ai-copy.js. */
const routeByPage = Object.fromEntries(ROUTES.map(r => [r.page, r]));
const ax = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<!-- AI-crawler sitemap: plain public routes for AI assistants (see llms.txt / ai.txt). Excludes admin, cart, checkout, search. -->',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
const aiMissing = [];
for (const entry of AI_SITEMAP) {
  const r = routeByPage[entry.page];
  if (!r || !r.public) { aiMissing.push(entry.page); continue; }
  ax.push(`<url><loc>${url(r.path)}</loc><lastmod>${today}</lastmod>` +
    `<changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`);
}
ax.push('</urlset>');
fs.writeFileSync(path.join(PUB, 'ai-sitemap.xml'), ax.join('\n') + '\n');
if (aiMissing.length) console.log('  WARN ai-sitemap skipped non-public pages:', aiMissing.join(', '));

/* ---------- head injection (idempotent) ----------
   A block is skipped when EITHER our marker is present (previous run) OR the page
   already hand-writes an equivalent tag. Without the second check every hand-authored
   page (care, faq, offers…) got a duplicate canonical/geo/Store JSON-LD on each run. */
const storeFacts = {
  telephone: '+' + String(S.settings.whatsapp || ''),
  priceRange: (() => {
    const ps = products.map(p => p.price).filter(Number.isFinite).sort((a, b) => a - b);
    return ps.length ? `${ps[0]}-${ps[ps.length - 1]} MAD` : '';
  })(),
  hours: 'Mo-Su 09:00-21:00'
};
const inject = (file, canonicalPath) => {
  const fp = path.join(PUB, file);
  let h = fs.readFileSync(fp, 'utf8');
  const headEnd = h.indexOf('</head>');
  if (headEnd < 0) return 'no </head>';
  const before = h;
  const added = [];
  const put = (block) => { const at = h.indexOf('</head>'); h = h.slice(0, at) + block + '\n' + h.slice(at); };
  if (!h.includes(MARK.geo) && !HAS.geo(h)) { put(geoBlock(site)); added.push('geo'); }
  if (!h.includes(MARK.jsonld) && !HAS.jsonld(h)) { put(jsonLdBlock(site, storeFacts)); added.push('jsonld'); }
  if (canonicalPath && !h.includes(MARK.canonical) && !HAS.canonical(h)) { put(canonicalBlock(site.url + canonicalPath)); added.push('canonical'); }
  if (h !== before) fs.writeFileSync(fp, h);
  return added.join('+') || 'ok (already complete)';
};
console.log('--- head injection:');
for (const r of ROUTES) {
  if (r.page === 'product') console.log(' ', r.file, '→', inject(r.file, r.path), '(template: runtime JSON-LD per rose)');
  else if (r.public) console.log(' ', r.file, '→', inject(r.file, r.path));
  else inject(r.file, null);
}

/* ---------- audit ---------- */
console.log('--- SEO audit:');
let warn = 0;
for (const f of fs.readdirSync(PUB).filter(x => x.endsWith('.html'))) {
  const h = fs.readFileSync(path.join(PUB, f), 'utf8');
  const has = (re) => re.test(h);
  const miss = [];
  if (!has(/<title>/i)) miss.push('title');
  if (!has(/name="description"/i)) miss.push('description');
  if (!has(/property="og:/i)) miss.push('og');
  if (!has(/name="robots"/i)) miss.push('robots');
  if (miss.length) { console.log('  WARN', f, 'missing:', miss.join(', ')); warn++; }
}
console.log(warn ? `audit: ${warn} file(s) need attention` : 'audit: all pages pass');
const aiUrlCount = (ax.join('\n').match(/<url>/g) || []).length;
console.log('robots.txt, sitemap.xml (' + urls.length + ' urls), ai-sitemap.xml (' + aiUrlCount + ' urls), .well-known/{ai-plugin,openapi}.json written.');
