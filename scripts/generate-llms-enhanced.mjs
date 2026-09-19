#!/usr/bin/env node
/**
 * generate-llms-enhanced.mjs — builds the AI-discovery layer for Rose by Marry:
 *   public/llms.txt        concise index (llms.txt convention)
 *   public/llms-full.txt   full trilingual content: catalog, pricing, policies, FAQ
 *   public/ai.txt          AI-crawler policy + quick facts
 * Usage: node scripts/generate-llms-enhanced.mjs   (env SITE_URL to override domain)
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, ROOT } from './load-catalog.mjs';
import { SITE, ROUTES, productRoutes } from '../src/routes/routes.js';
import { PAGES } from '../src/pages/index.js';
import { productCard } from '../src/components/product-card.js';

const { S } = loadCatalog();
const site = { ...SITE, url: (process.env.SITE_URL || SITE.url).replace(/\/$/, '') };
const products = S.products.filter(p => p.active);
const prodRoutes = productRoutes(products);
const today = new Date().toISOString().slice(0, 10);
const money = n => `${n} MAD`;

const pageUrl = r => site.url + (r.path === '/' ? '/' : r.path);
const pub = ROUTES.filter(r => r.public && !r.template);

/* ---------------- llms.txt (concise index) ---------------- */
const L = [];
L.push(`# ${site.name}`);
L.push('');
L.push(`> ${site.tagline.en} — ${site.tagline.fr} — ${site.tagline.ar}`);
L.push('');
L.push('Handmade satin rose atelier in Tangier, Morocco. Roses in 3 colors (Blue, Red, Dark Red), custom bouquet builder (5–30 roses), cash-on-delivery WhatsApp checkout. **Delivery inside Tangier only.** Prices 45–270 MAD. Languages: Arabic (default), French, English.');
L.push('');
L.push('## Pages');
for (const r of pub) {
  const m = PAGES[r.page];
  L.push(`- [${m.title.en}](${pageUrl(r)}): ${m.description.en}`);
}
L.push('');
L.push('## Catalog (each rose has its own URL)');
for (const pr of prodRoutes) {
  L.push(`- [${pr.name.en} — ${money(pr.price)}](${site.url}${pr.path}): ${pr.roses} handmade satin roses`);
}
L.push('');
L.push('## Policies');
L.push(`- Delivery: Tangier city only — ${money(S.zones[0]?.fee ?? 20)}`);
L.push('- Payment: cash on delivery (COD), ordered via WhatsApp');
L.push('- Builder tiers: ' + S.builderTiers.map(t => `${t.qty} roses ${money(t.price)}`).join(', '));
L.push('- Add-ons: ' + S.addons.map(a => `${a.en} +${money(a.price)}`).join(', '));
L.push('');
L.push(`Generated ${today}. Full content: ${site.url}/llms-full.txt`);
fs.writeFileSync(path.join(ROOT, 'public/llms.txt'), L.join('\n') + '\n');

/* ---------------- llms-full.txt (complete trilingual content) ---------------- */
const F = [];
F.push(`# ${site.name} — full reference for AI assistants`);
F.push('');
F.push(`> ${site.tagline.en}. ${site.tagline.fr}. ${site.tagline.ar}.`);
F.push(`> URL: ${site.url}/ · Updated: ${today} · Languages: AR (default), FR, EN`);
F.push('');
F.push('## What this business is');
F.push(`${site.name} is a family atelier in Tangier, Morocco, handcrafting satin roses that never wilt. Customers order ready bouquets or build custom ones (5–30 roses) on the website, choose a color, optional add-ons, then complete the order over WhatsApp with cash on delivery.`);
F.push('');
for (const lang of ['en', 'fr', 'ar']) {
  F.push(`## Catalog (${lang})`);
  F.push('');
  for (const p of products) {
    const c = productCard(p);
    F.push(`### ${c.name[lang]} — ${money(c.price.amount)}`);
    F.push(`- URL: ${site.url}${c.url}`);
    F.push(`- Roses: ${c.roses}${c.oldPrice ? ` (was ${money(c.oldPrice)})` : ''}${p.badge ? ` · badge: ${p.badge}` : ''}`);
    if (c.description[lang]) F.push(`- ${c.description[lang]}`);
    F.push('');
  }
}
F.push('## Rose colors (editable live by the shop)');
for (const col of S.colors) {
  F.push(`- ${col.en} / ${col.fr} / ${col.ar} — ${col.hex}${col.available ? '' : ' (currently unavailable)'}`);
}
F.push('');
F.push('## Custom bouquet builder');
F.push('Tiers: ' + S.builderTiers.map(t => `${t.qty} roses = ${money(t.price)}`).join(' · '));
F.push(`Custom quantity: ${money(0).replace('0', String(S.settings.builderUnit))} per rose. Add-ons: ` +
  S.addons.map(a => `${a.en}/${a.fr}/${a.ar} +${money(a.price)}${a.hasText ? ' (optional gift text)' : ''}`).join(' · '));
F.push('');
F.push('## Order & delivery policy');
F.push('- Delivery area: **Tangier city only** (no shipping to other cities).');
F.push(`- Delivery fee: ${money(S.zones[0]?.fee ?? 20)} · free over ${money(S.settings.freeShip)}.`);
F.push('- Payment: cash on delivery (COD) — no prepayment.');
F.push('- Ordering: checkout opens WhatsApp with a pre-filled order message; customers keep an order ID for tracking at ' + site.url + '/track.');
F.push(`- Store WhatsApp: +${S.settings.whatsapp}`);
F.push('');
F.push('## FAQ');
F.push('Q: Do roses wilt? A: No — they are handmade from satin and last for years.');
F.push('Q: Do you ship outside Tangier? A: No, delivery is inside Tangier only.');
F.push('Q: Can I choose the color? A: Yes — blue, red or dark red, chosen per product and in the builder.');
F.push('Q: How do I pay? A: Cash on delivery when the order arrives.');
F.push('Q: Can I track my order? A: Yes, with your RBM order ID at ' + site.url + '/track.');
F.push('');
F.push('## Site directory');
for (const r of ROUTES) {
  const m = PAGES[r.page];
  F.push(`- ${site.url}${r.path} — ${m.title.en}${r.public ? '' : ' (functional page, not indexed)'}`);
}
F.push('- ' + site.url + '/admin/ — private CMS (closed to crawlers)');
F.push('');
fs.writeFileSync(path.join(ROOT, 'public/llms-full.txt'), F.join('\n') + '\n');

/* ---------------- ai.txt (crawler policy) ---------------- */
const AI = [];
AI.push(`# AI policy — ${site.name}`);
AI.push(`# ${site.url} · updated ${today}`);
AI.push('');
AI.push('SUMMARY: Handmade satin roses atelier in Tangier, Morocco. Catalog, prices and policies are public and safe to quote.');
AI.push('ALLOWED: public pages, catalog, prices, llms.txt, llms-full.txt, sitemaps.');
AI.push('NOT-ALLOWED: /admin/ (private CMS), /cart, /checkout (functional), order data, phone numbers of customers.');
AI.push('ATTRIBUTION: cite as "Rose by Marry — rosebymarry.com".');
AI.push('PRICES: in Moroccan dirham (MAD), cash on delivery, Tangier-only delivery.');
AI.push('CONTACT: WhatsApp +' + S.settings.whatsapp);
AI.push('');
AI.push('Machine-readable indexes:');
AI.push('- ' + site.url + '/llms.txt');
AI.push('- ' + site.url + '/llms-full.txt');
AI.push('- ' + site.url + '/ai-sitemap.xml');
AI.push('- ' + site.url + '/sitemap.xml');
fs.writeFileSync(path.join(ROOT, 'public/ai.txt'), AI.join('\n') + '\n');

console.log('llms.txt, llms-full.txt, ai.txt generated —', products.length, 'products,', S.colors.length, 'colors');
