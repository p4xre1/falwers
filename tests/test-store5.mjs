import fs from 'fs';
import pkg from 'jsdom';
import { fileURLToPath } from 'node:url';
const PUB = fileURLToPath(new URL('../public', import.meta.url));
const { JSDOM, VirtualConsole } = pkg;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const A = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n); if (!c) process.exitCode = 1; };
const EMO = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{2725}\u{2728}-\u{27BF}\u{2B00}-\u{2BFF}]/gu; // ✦(2726)/✧ ornaments allowed
const load = async (page, seedFn, url) => {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => { const m = String(e.message || e); if (!/not implemented|Could not load/i.test(m)) errs.push(m.slice(0, 160)); });
  const html = fs.readFileSync(PUB + '/' + page.split('?')[0], 'utf8');
  const dom = new JSDOM(html, { url: url || ('http://localhost:8080/' + page), runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { if (seedFn) seedFn(w); } });
  await sleep(950);
  return { w: dom.window, d: dom.window.document, errs };
};
const SEED = {
  settings: { whatsapp: '212772966980', currency: 'DH', siteUrl: '', passHash: null, freeShip: 500, builderUnit: 9 },
  categories: [{ id: 'bouq', icon: '', ar: 'باقات', fr: 'Bouquets', en: 'Bouquets' }],
  products: [{ id: 'amour', cat: 'bouq', type: 'bouquet', qty: 10, ar: 'باقة أمور', fr: 'Bouquet Amour', en: 'Amour Bouquet', dar: '', dfr: '', den: '', price: 90, old: 0, badge: '', featured: true, active: true }],
  colors: [{ id: 'red', ar: 'أحمر', fr: 'Rouge', en: 'Red', hex: '#C8102E', available: true }],
  addons: [], builderTiers: [{ id: 'b5', qty: 5, price: 45 }],
  zones: [{ id: 'tanger', ar: 'طنجة', fr: 'Tanger', en: 'Tangier', fee: 20 },
          { id: 'casa', ar: 'الدار البيضاء', fr: 'Casablanca', en: 'Casablanca', fee: 35 }],
  promoCodes: [], discounts: [{ id: 'd1', type: 'percent', value: 10, minTotal: 0, enabled: true }],
  reviews: [], orders: [], pageviews: {}, prodViews: {}
};
const seed = w => w.localStorage.setItem('rbm_v2_state', JSON.stringify(SEED));
const seedCart = w => {
  seed(w);
  w.localStorage.setItem('rbm_cart_v2', JSON.stringify([{ key: 'amour|red|', pid: 'amour', qty: 1, colorId: 'red', addons: [], note: '' }]));
};
/* 1) home: tangier enforcement + fonts + motion + emoji-free UI */
{
  const { w, d, errs } = await load('index.html', seed);
  A('home: zones migrated to Tangier-only', w.S.zones.length === 1 && w.S.zones[0].id === 'tanger');
  A('home: ship_tanger hint rendered', (d.querySelector('[data-i18n="ship_tanger"]') || {}).textContent?.length > 3);
  A('home: Playfair+Outfit fonts linked', !!d.querySelector('link[href*="Playfair+Display"]') && !!d.querySelector('link[href*="Outfit"]'));
  A('home: press-row duplicated for marquee', d.querySelectorAll('.press-row .press-mark').length >= 8);
  A('home: tracking recorded pageview', (w.S.pageviews.home || 0) >= 1);
  A('home: hero content present', !!d.querySelector('.hero-title') && d.querySelector('.hero-title').textContent.length > 2);
  const bodyTxt = d.body.textContent;
  A('home: UI emoji-free', !EMO.test(bodyTxt));
  A('home: no runtime errors', errs.length === 0); if (errs.length) console.log(errs.join('\n'));
  w.close();
}
/* 2) product by slug + copy button + prodViews bump */
{
  const slug = 'bouquet-amour';
  const { w, d, errs } = await load('product.html?id=' + slug, seed, 'http://localhost:8080/product.html?id=' + slug);
  A('product: resolves by slug', !!d.querySelector('#pdColors'));
  A('product: copy-link button exists', !!d.querySelector('#pdCopy'));
  A('product: prodViews incremented', (w.S.prodViews.amour || 0) >= 1);
  A('product: pageview recorded', Object.keys(w.S.pageviews).some(k => k.startsWith('product:')));
  A('product: no runtime errors', errs.length === 0); if (errs.length) console.log(errs.join('\n'));
  w.close();
}
/* 3) cart: manual discount line + total math (90 - 9 + 20 ship = 101) */
{
  const { w, d, errs } = await load('cart.html', seedCart);
  const rows = [...d.querySelectorAll('.sumline')].map(r => r.textContent);
  A('cart: shop-discount row shown', rows.some(r => r.includes('خصم إداري') || r.includes('Remise boutique') || r.includes('Shop discount')));
  const total = d.querySelector('.sum-total2') ? d.querySelector('.sum-total2').textContent : '';
  A('cart: total 101 DH (90 -10% +20 ship)', total.includes('101'));
  A('cart: no runtime errors', errs.length === 0); if (errs.length) console.log(errs.join('\n'));
  w.close();
}
/* 4) WA template integrity + manual line */
{
  const { w, d, errs } = await load('index.html', seed);
  const msg = w.buildOrderMessage({ id: 'RBM-X', ts: Date.now(), status: 'new', name: 'س', phone: '0600', city: 'طنجة', zoneName: 'طنجة', zoneFee: 20, items: [{ pid: 'amour', name: 'Amour', qty: 1, color: 'أحمر', addons: '', note: '', price: 90 }], promo: 'ROSE10', manual: 9, discount: 9, date: '', note: '', total: 101, currency: 'DH' });
  A('WA: classic header preserved verbatim', msg.includes('🌹 *طلب جديد من المتجر - Rose by Marry*'));
  A('WA: promo line preserved', msg.includes('🎟 *كود الخصم:* ROSE10'));
  A('WA: manual discount line added', msg.includes('خصم إداري') && msg.includes('−9'));
  A('WA: total line preserved', msg.includes('💰 *المبلغ الإجمالي:*'));
  w.close();
}
/* 5) checkout: single zone + hint; loads clean */
{
  const { w, d, errs } = await load('checkout.html', seedCart);
  A('checkout: zone select reduced to Tangier only', d.querySelectorAll('#co_zone option').length === 1);
  A('checkout: tangier hint present', (d.querySelector('.hintline') ? d.body.textContent.includes('طنجة فقط') || d.body.textContent.includes('Tangier uniquement') || d.body.textContent.includes('Tangier only') : false));
  A('checkout: no runtime errors', errs.length === 0); if (errs.length) console.log(errs.join('\n'));
  w.close();
}
/* 6) about: count-up stats, star removed */
{
  const { w, d, errs } = await load('about.html', seed);
  A('about: count-up present', d.querySelectorAll('.count-up').length >= 2);
  A('about: star glyph removed', !d.body.textContent.includes('★'));
  w.close();
}
console.log('--- store5 done');
process.exit(process.exitCode || 0);
