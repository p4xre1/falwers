#!/usr/bin/env node
/**
 * optimize-ai-seo.mjs — robots.txt (with AI crawlers), sitemap.xml, ai-sitemap.xml,
 * plus idempotent geo/JSON-LD/canonical injection into public/*.html, then an SEO audit.
 * Usage: node scripts/optimize-ai-seo.mjs   (env SITE_URL to override domain)
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, ROOT } from './load-catalog.mjs';
import { SITE, ROUTES, productRoutes } from '../src/routes/routes.js';
import { PAGES } from '../src/pages/index.js';
import { geoBlock, jsonLdBlock, canonicalBlock, MARK } from '../src/components/seo-head.js';

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

/* ---------- ai-sitemap.xml ---------- */
const ax = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:ai="https://rosebymarry.com/ns/ai">'];
const pageTopics = { home: 'boutique, handmade satin roses', shop: 'catalog', about: 'brand story', contact: 'contact, WhatsApp', track: 'order tracking', wishlist: 'user feature', product: 'product' };
for (const r of ROUTES.filter(r => r.public)) {
  const m = PAGES[r.page];
  ax.push(`  <url><loc>${url(r.path)}</loc><lastmod>${today}</lastmod>` +
    `<ai:topic>${pageTopics[r.page] || 'page'}</ai:topic>` +
    `<ai:summary lang="en">${m.description.en.replace(/[<>&]/g, '')}</ai:summary>` +
    `<ai:languages>ar,fr,en</ai:languages></url>`);
}
for (const pr of prodRoutes) {
  ax.push(`  <url><loc>${url(pr.path)}</loc><lastmod>${today}</lastmod>` +
    `<ai:topic>product</ai:topic>` +
    `<ai:summary lang="en">${(pr.name.en || '')} — ${pr.roses} handmade satin roses, ${(pr.price ?? 0)} MAD</ai:summary>` +
    `<ai:price currency="MAD" amount="${pr.price ?? 0}"/>` +
    `<ai:languages>ar,fr,en</ai:languages></url>`);
}
ax.push('</urlset>');
fs.writeFileSync(path.join(PUB, 'ai-sitemap.xml'), ax.join('\n') + '\n');

/* ---------- head injection (idempotent) ---------- */
const inject = (file, canonicalPath, pageKey) => {
  const fp = path.join(PUB, file);
  let h = fs.readFileSync(fp, 'utf8');
  const headEnd = h.indexOf('</head>');
  if (headEnd < 0) return 'no </head>';
  let added = [];
  if (!h.includes(MARK.geo)) { h = h.slice(0, headEnd) + geoBlock(site) + '\n' + h.slice(headEnd); added.push('geo'); }
  if (!h.includes(MARK.jsonld)) { h = h.slice(0, headEnd) + jsonLdBlock(site) + '\n' + h.slice(headEnd); added.push('jsonld'); }
  if (!h.includes(MARK.canonical) && canonicalPath) { h = h.slice(0, headEnd) + canonicalBlock(site.url + canonicalPath) + '\n' + h.slice(headEnd); added.push('canonical'); }
  fs.writeFileSync(fp, h);
  return added.join('+') || 'ok';
};
console.log('--- head injection:');
for (const r of ROUTES) {
  if (r.page === 'product') console.log(' ', r.file, '→', inject(r.file, r.path, r.page), '(template: runtime JSON-LD per rose)');
  else if (r.public) console.log(' ', r.file, '→', inject(r.file, r.path, r.page));
  else inject(r.file, null, r.page);
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
console.log('robots.txt, sitemap.xml (' + urls.length + ' urls), ai-sitemap.xml (' + (ROUTES.filter(r => r.public).length + prodRoutes.length) + ' urls) written.');
