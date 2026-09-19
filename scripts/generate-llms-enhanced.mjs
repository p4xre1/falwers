#!/usr/bin/env node
/**
 * generate-llms-enhanced.mjs — builds the AI-discovery layer for Rose by Marry:
 *   public/llms.txt        concise index (llms.txt convention)
 *   public/llms-full.txt   full trilingual content: catalog, pricing, policies, FAQ
 *   public/ai.txt          AI-crawler policy + quick facts
 *
 * Every FACT (colors, prices, fees, phone, tiers) is read from the live catalog in
 * public/assets/js/data.js. Every SENTENCE lives in src/content/ai-copy.js. Nothing
 * is hardcoded here, so re-running can never downgrade the published files.
 *
 * Usage: node scripts/generate-llms-enhanced.mjs   (env SITE_URL to override domain)
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, ROOT } from './load-catalog.mjs';
import { SITE, ROUTES, productRoutes } from '../src/routes/routes.js';
import { PAGES } from '../src/pages/index.js';
import { productCard } from '../src/components/product-card.js';
import {
  LLMS_PAGE_ORDER, PAGE_COPY, PRODUCT_BLURBS, POLICIES,
  BUSINESS, FULL_FAQ, SITE_SECTIONS, SHORT_FAQ_AR, AI_POLICY
} from '../src/content/ai-copy.js';

const { S } = loadCatalog();
const site = { ...SITE, url: (process.env.SITE_URL || SITE.url).replace(/\/$/, '') };
const products = S.products.filter(p => p.active);
const prodRoutes = productRoutes(products);
const today = new Date().toISOString().slice(0, 10);
const money = n => `${n} MAD`;

/* ---------------- live facts derived from the real catalog ---------------- */
const tierQtys = S.builderTiers.map(t => t.qty).sort((a, b) => a - b);
const buildableQtys = tierQtys.filter(q => q >= 5);
const prices = products.map(p => p.price).filter(n => Number.isFinite(n)).sort((a, b) => a - b);
const wa = String(S.settings.whatsapp || '');
const F = {
  url: site.url,
  whatsapp: wa,
  /* +212 772-966980 — readable form used in prose */
  waPretty: `+${wa.slice(0, 3)} ${wa.slice(3, 6)}-${wa.slice(6)}`,
  freeShip: S.settings.freeShip,
  unit: S.settings.builderUnit,
  fee: S.zones[0]?.fee ?? 20,
  builderMin: buildableQtys[0] ?? 5,
  builderMax: tierQtys[tierQtys.length - 1] ?? 30,
  minPrice: prices[0],
  maxPrice: prices[prices.length - 1],
  colorCount: S.colors.length,
  colorNames: S.colors.map(c => c.en),
  colorList: S.colors.map(c => c.en).join(', ')
};

const routeByPage = Object.fromEntries(ROUTES.map(r => [r.page, r]));
const pageUrl = r => site.url + (r.path === '/' ? '/' : r.path);
const copyFor = key => {
  const c = PAGE_COPY[key];
  const meta = PAGES[key];
  return {
    label: (c && c.label) || (meta && meta.title.en) || key,
    desc: c ? c.d(F) : (meta ? meta.description.en : '')
  };
};

/* ---------------- llms.txt (concise index) ---------------- */
const L = [];
L.push(`# ${site.name}`);
L.push('');
L.push(`> ${site.tagline.en} — ${site.tagline.fr} — ${site.tagline.ar}`);
L.push('');
L.push(
  `Handmade satin-rose atelier in Tangier, Morocco. Roses in ${F.colorCount} satin colors (${F.colorList}), ` +
  `custom bouquet builder (${F.builderMin}–${F.builderMax} roses at ${F.unit} DH/rose), ready bouquets and velvet boxes, ` +
  `cash-on-delivery WhatsApp checkout. **Delivery inside Tangier only — never nationwide.** ` +
  `Prices ${F.minPrice}–${F.maxPrice} MAD. Languages: Arabic (default), French, English. ` +
  `AI index: ai-sitemap.xml · policies: ai.txt.`
);
L.push('');
L.push('## Pages');
for (const key of LLMS_PAGE_ORDER) {
  const r = routeByPage[key];
  if (!r || !r.public) continue;
  const { label, desc } = copyFor(key);
  L.push(`- [${label}](${pageUrl(r)}): ${desc}`);
}
L.push('');
L.push('## Catalog (each product has its own URL)');
for (const pr of prodRoutes) {
  const blurb = PRODUCT_BLURBS[pr.slug] || `${pr.roses} handmade satin rose${pr.roses === 1 ? '' : 's'}`;
  L.push(`- [${pr.name.en} — ${money(pr.price)}](${site.url}${pr.path}): ${blurb}`);
}
L.push('');
L.push('## Policies');
for (const line of POLICIES(F)) L.push(`- ${line}`);
fs.writeFileSync(path.join(ROOT, 'public/llms.txt'), L.join('\n') + '\n');

/* ---------------- llms-full.txt (complete trilingual content) ---------------- */
const F2 = [];
F2.push(`# ${site.name} — full reference for AI assistants`);
F2.push('');
F2.push(`> ${site.tagline.en}. ${site.tagline.fr}. ${site.tagline.ar}.`);
F2.push(`> URL: ${site.url}/ · Updated: ${today} · Languages: AR (default), FR, EN`);
F2.push('');
F2.push('## What this business is');
F2.push(BUSINESS(F));
F2.push('');
for (const lang of ['en', 'fr', 'ar']) {
  F2.push(`## Catalog (${lang})`);
  F2.push('');
  for (const p of products) {
    const c = productCard(p);
    F2.push(`### ${c.name[lang]} — ${money(c.price.amount)}`);
    F2.push(`- URL: ${site.url}${c.url}`);
    F2.push(`- Roses: ${c.roses}${c.oldPrice ? ` (was ${money(c.oldPrice)})` : ''}${p.badge ? ` · badge: ${p.badge}` : ''}`);
    if (c.description[lang]) F2.push(`- ${c.description[lang]}`);
    F2.push('');
  }
}
F2.push('## Rose colors (editable live by the shop)');
for (const col of S.colors) {
  F2.push(`- ${col.en} / ${col.fr} / ${col.ar} — ${col.hex}${col.available === false ? ' (currently unavailable)' : ''}`);
}
F2.push('');
F2.push('## Custom bouquet builder');
F2.push('Tiers: ' + S.builderTiers.map(t => `${t.qty} roses = ${money(t.price)}`).join(' · '));
F2.push(`Custom quantity: ${money(F.unit)} per rose. Add-ons: ` +
  S.addons.map(a => `${a.en}/${a.fr}/${a.ar} +${money(a.price)}${a.hasText ? ' (optional gift text)' : ''}`).join(' · '));
F2.push('');
F2.push('## Order & delivery policy');
F2.push('- Delivery area: **Tangier city only** (no shipping to other cities).');
F2.push(`- Delivery fee: ${money(F.fee)} · free over ${money(F.freeShip)}.`);
F2.push('- Payment: cash on delivery (COD) — no prepayment.');
F2.push(`- Ordering: checkout opens WhatsApp with a pre-filled order message; customers keep an order ID for tracking at ${site.url}/track.`);
F2.push(`- Store WhatsApp: +${F.whatsapp}`);
F2.push('');
F2.push('## FAQ');
for (const line of FULL_FAQ(F)) F2.push(line);
F2.push('');
F2.push('## Site directory');
for (const r of ROUTES) {
  const m = PAGES[r.page];
  F2.push(`- ${site.url}${r.path} — ${m ? m.title.en : r.page}${r.public ? '' : ' (functional page, not indexed)'}`);
}
F2.push(`- ${site.url}/admin/ — private CMS (closed to crawlers)`);
F2.push('');
F2.push('');
F2.push('## Site sections (beyond the catalog)');
for (const line of SITE_SECTIONS(F)) F2.push(line);
F2.push('');
F2.push('## FAQ (short)');
for (const line of SHORT_FAQ_AR) F2.push(line);
fs.writeFileSync(path.join(ROOT, 'public/llms-full.txt'), F2.join('\n') + '\n');

/* ---------------- ai.txt (crawler policy) ---------------- */
const pol = AI_POLICY(F);
const AI = [];
AI.push(`# AI policy — ${site.name}`);
AI.push(`# ${site.url} · updated ${today}`);
AI.push('');
AI.push(`SUMMARY: ${pol.summary}`);
AI.push(`ALLOWED: ${pol.allowed}`);
AI.push(`NOT-ALLOWED: ${pol.notAllowed}`);
AI.push(`ATTRIBUTION: ${pol.attribution}`);
AI.push(`PRICES: ${pol.prices}`);
AI.push(`CONTACT: ${pol.contact}`);
AI.push('');
AI.push('Machine-readable indexes:');
AI.push('- ' + site.url + '/llms.txt');
AI.push('- ' + site.url + '/llms-full.txt');
AI.push('- ' + site.url + '/ai-sitemap.xml');
AI.push('- ' + site.url + '/sitemap.xml');
fs.writeFileSync(path.join(ROOT, 'public/ai.txt'), AI.join('\n') + '\n');

console.log('llms.txt, llms-full.txt, ai.txt generated —', products.length, 'products,', S.colors.length, 'colors');
