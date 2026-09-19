import fs from 'fs';
import pkg from 'jsdom';
const { JSDOM, VirtualConsole } = pkg;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const A = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n); c ? pass++ : (fail++, process.exitCode = 1); };
const rd = p => fs.readFileSync('/home/user/rose-by-marry/public/' + p, 'utf8');
const PRODS = [
  { id: 'amour', cat: 'bouq', type: 'bouquet', qty: 10, ar: 'باقة أمور', fr: 'Bouquet Amour', en: 'Amour Bouquet', price: 90, old: 0, badge: 'best', featured: true, active: true },
  { id: 'single', cat: 'gift', type: 'single', qty: 1, ar: 'وردة مفردة', fr: 'Rose Unique', en: 'Single Rose', price: 15, old: 0, badge: '', featured: false, active: true },
  { id: 'cadre', cat: 'gift', type: 'gift', qty: 1, ar: 'إطار الإهداء', fr: 'Cadre', en: 'Gift Frame', price: 65, old: 80, badge: 'promo', featured: false, active: true },
  { id: 'papillon', cat: 'gift', type: 'gift', qty: 6, ar: 'فراشات ساتان', fr: 'Papillons', en: 'Butterflies', price: 30, old: 0, badge: '', featured: false, active: true }
];
const SEED = (extra = {}) => Object.assign({ settings: { whatsapp: '212772966980', currency: 'DH', siteUrl: '', passHash: null, freeShip: 500, builderUnit: 9, instagram: 'https://instagram.com/rosebymarry', tiktok: '' }, categories: [{ id: 'bouq', icon: '', ar: 'باقات', fr: 'B', en: 'B' }], products: PRODS, colors: [{ id: 'red', ar: 'أحمر', fr: 'R', en: 'R', hex: '#C8102E', available: true }], addons: [], builderTiers: [{ id: 'b10', qty: 10, price: 90 }], zones: [{ id: 'tanger', ar: 'طنجة', fr: 'T', en: 'T', fee: 20 }], promoCodes: [], discounts: [], reviews: [], orders: [], pageviews: {}, prodViews: {} }, extra);
const mk = async (page, { q = '', ls = {}, seed = {} } = {}) => {
  const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
  const d = new JSDOM(rd(page), { url: 'http://localhost:8080/' + page + q, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.RBM_WEL_MS = 9e5; w.RBM_SP_MS = 9e5; w.localStorage.setItem('rbm_v2_state', JSON.stringify(SEED(seed))); for (const [k, v] of Object.entries(ls)) w.localStorage.setItem(k, v); } });
  await sleep(1700);
  return d;
};
/* FAQ page */
{
  const s = rd('faq.html');
  const ld = [...s.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => { try { return JSON.parse(m[1]); } catch (e) { return null; } });
  A('faq: 6 accordions in HTML', (s.match(/<details class="faq-item">/g) || []).length === 6);
  A('faq: FAQPage JSON-LD parses with 5 Q&A', !!ld.find(x => x && x['@type'] === 'FAQPage' && x.mainEntity.length === 5));
  A('faq: indexable + canonical + OG', s.includes('rel="canonical" href="https://rosebymarry.com/faq"') && s.includes('content="index, follow'));
  const d = await mk('faq.html'); const doc = d.window.document;
  A('faq: renders chrome + filled accordion text', !!doc.querySelector('#siteHeader .masthead') && doc.querySelector('.faq-a').textContent.length > 20);
  A('faq: cutoff pill filled', doc.querySelector('[data-cutoff]').textContent.length > 4);
  d.window.close();
}
/* footer links + socials */
{
  const d = await mk('index.html'); const doc = d.window.document;
  const f = doc.querySelector('#siteFooter').textContent;
  A('footer: faq/privacy/terms links', !!doc.querySelector('#siteFooter a[href="faq.html"]') && !!doc.querySelector('#siteFooter a[href="privacy.html"]') && !!doc.querySelector('#siteFooter a[href="terms.html"]'));
  A('footer: instagram icon rendered when set', !!doc.querySelector('#siteFooter .foot-social a[aria-label="Instagram"]'));
  d.window.close();
  const d2 = await mk('index.html', { seed: { settings: { whatsapp: '212772966980', currency: 'DH', siteUrl: '', passHash: null, freeShip: 500, builderUnit: 9, instagram: '', tiktok: '' } } });
  A('footer: social row hidden when unset', !d2.window.document.querySelector('.foot-social'));
  d2.window.close();
}
/* cart cross-sell */
{
  const d = await mk('cart.html', { ls: { rbm_cart_v2: JSON.stringify([{ key: 'k1', pid: 'amour', colorId: 'red', qty: 1, addons: [] }]) } });
  const doc = d.window.document;
  const chips = [...doc.querySelectorAll('.xs-chip')];
  A('cart: cross-sell strip with 3 chips (in-cart excluded)', chips.length === 3 && !chips.some(c => c.textContent.includes('أمور')));
  const before = JSON.parse(d.window.localStorage.getItem('rbm_cart_v2')).length;
  chips[0].querySelector('.xs-add').click(); await sleep(160);
  const after = JSON.parse(d.window.localStorage.getItem('rbm_cart_v2')).length;
  A('cart: cross-sell + button adds product', after === before + 1);
  d.window.close();
}
/* recently viewed */
{
  const d = await mk('product.html', { q: '?id=amour', ls: { rbm_recent: JSON.stringify(['single', 'cadre']) } }); const doc = d.window.document;
  const rec = JSON.parse(d.window.localStorage.getItem('rbm_recent') || '[]');
  A('recent: product visit recorded (front of list)', rec[0] === 'amour' && rec.includes('single'));
  A('recent: product page strip rendered (self-excluded)', !!doc.querySelector('#recentSec .grid-prod') && !doc.querySelector('#recentSec').textContent.includes('أمور'));
  d.window.close();
  const d2 = await mk('shop.html', { ls: { rbm_recent: JSON.stringify(['amour', 'single']) } }); const doc2 = d2.window.document;
  A('recent: shop strip shows viewed products', !!doc2.querySelector('#recentWrap .pcard'));
  d2.window.close();
}
/* abandoned-cart nudge */
{
  const old = String(Date.now() - 5 * 3600000);
  const d = await mk('index.html', { ls: { rbm_cart_ts: old, rbm_cart_v2: JSON.stringify([{ key: 'k1', pid: 'amour', colorId: 'red', qty: 1, addons: [] }]) } });
  const doc = d.window.document;
  const nudge = doc.querySelector('.cart-nudge');
  A('nudge: appears for stale cart', !!nudge && nudge.textContent.includes('بانتظارك'));
  if (nudge) nudge.querySelector('.sp-x').click();
  await sleep(80);
  A('nudge: dismiss re-arms timestamp', Number(d.window.localStorage.getItem('rbm_cart_ts')) > Date.now() - 60000);
  d.window.close();
  const d2 = await mk('index.html', { ls: { rbm_cart_ts: String(Date.now() - 60000), rbm_cart_v2: JSON.stringify([{ key: 'k1', pid: 'amour', colorId: 'red', qty: 1, addons: [] }]) } });
  A('nudge: silent for fresh cart', !d2.window.document.querySelector('.cart-nudge'));
  d2.window.close();
}
/* sw + admin fields */
{
  A('sw.js exists and registers only on storefront', fs.existsSync('/home/user/rose-by-marry/public/sw.js') && rd('assets/js/ui.js').includes("navigator.serviceWorker.register('sw.js')"));
  const s = rd('admin/settings.html');
  A('admin: instagram/tiktok settings fields', s.includes('id="set_ig"') && s.includes('id="set_tt"'));
  A('seed: real WhatsApp in defaults', rd('assets/js/data.js').includes("whatsapp: '212772966980'"));
}
console.log('--- commerce2 done: ' + pass + ' pass / ' + fail + ' fail');
process.exit(process.exitCode || 0);
