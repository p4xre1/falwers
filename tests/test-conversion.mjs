import fs from 'fs';
import pkg from 'jsdom';
const { JSDOM, VirtualConsole } = pkg;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const A = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n); c ? pass++ : (fail++, process.exitCode = 1); };
const mk = (page, seed = {}, url = 'http://localhost:8080/' + page) => {
  const BASE = { settings: { whatsapp: '212772966980', currency: 'DH', siteUrl: '', passHash: null, freeShip: 500, builderUnit: 9 }, categories: [{ id: 'bouq', icon: '', ar: 'باقات', fr: 'B', en: 'B' }], products: [
    { id: 'amour', cat: 'bouq', type: 'bouquet', qty: 10, ar: 'باقة أمور', fr: 'Bouquet Amour', en: 'Amour Bouquet', dar: '', dfr: '', den: '', price: 90, old: 0, badge: 'best', featured: true, active: true, occ: ['birth', 'thanks'] },
    { id: 'valentin', cat: 'occ', type: 'bouquet', qty: 30, ar: 'باقة الحب', fr: 'Pack Saint-Valentin', en: 'Valentine Pack', dar: '', dfr: '', den: '', price: 300, old: 350, badge: 'best', featured: true, active: true, occ: ['anniv'] },
    { id: 'anniv', cat: 'occ', type: 'bouquet', qty: 12, ar: 'هدية عيد الميلاد', fr: 'Cadeau Anniversaire', en: 'Birthday Gift', dar: '', dfr: '', den: '', price: 140, old: 0, badge: '', featured: false, active: true, occ: ['birth'] },
    { id: 'coeur', cat: 'box', type: 'box', qty: 16, ar: 'علبة القلب', fr: 'Coeur Royal', en: 'Royal Heart', dar: '', dfr: '', den: '', price: 190, old: 0, badge: '', featured: false, active: true, occ: ['anniv', 'birth'] },
    { id: 'papillon', cat: 'gift', type: 'gift', qty: 6, ar: 'فراشات ساتان', fr: 'Papillons Satin', en: 'Satin Butterflies', dar: '', dfr: '', den: '', price: 30, old: 0, badge: '', featured: false, active: true, occ: ['birth', 'baby'] },
    { id: 'cadre', cat: 'gift', type: 'gift', qty: 1, ar: 'إطار الإهداء', fr: 'Cadre Cadeau', en: 'Gift Frame', dar: '', dfr: '', den: '', price: 65, old: 80, badge: 'promo', featured: false, active: true, occ: ['thanks', 'grad'] }
  ], colors: [{ id: 'red', ar: 'أحمر', fr: 'R', en: 'R', hex: '#C8102E', available: true }, { id: 'blue', ar: 'أزرق', fr: 'B', en: 'B', hex: '#3A5FA8', available: true }], addons: [{ id: 'crown', icon: '', ar: 'تاج', fr: 'C', en: 'C', price: 20, hasText: false, enabled: true }], builderTiers: [{ id: 'b10', qty: 10, price: 90 }], zones: [{ id: 'tanger', ar: 'طنجة', fr: 'T', en: 'T', fee: 20 }], promoCodes: [{ id: 'p1', code: 'ROSE10', type: 'percent', value: 10, minTotal: 0, enabled: true, used: 0 }], discounts: [], reviews: [], orders: [], pageviews: {}, prodViews: {} };
  const S = Object.assign(BASE, seed);
  const html = fs.readFileSync('/home/user/rose-by-marry/public/' + (url.startsWith('http://localhost:8080/') ? (url.slice(22).split('?')[0]) : page), 'utf8');
  const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
  return new JSDOM(html, { url, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.RBM_WEL_MS = 200; w.RBM_SP_MS = 250; w.localStorage.setItem('rbm_v2_state', JSON.stringify(S)); for (const [k, v] of Object.entries(seed.__ls || {})) w.localStorage.setItem(k, v); } });
};
const QUIET = { __ls: { rbm_wel: '1', rbm_sp_off: String(Date.now()) } };

/* ---- index ---- */
{
  const dom = mk('index.html'); await sleep(1600);
  const d = dom.window.document;
  const proof = d.querySelector('.hero-proof');
  A('index: hero proof line rendered', !!proof && proof.textContent.length > 5);
  const cut = d.querySelector('[data-cutoff="mini"]');
  A('index: cutoff pill filled with live delivery text', !!cut && cut.textContent.trim().length > 4 && !!cut.querySelector('.cut-dot'));
  const chips = [...d.querySelectorAll('.occ-chip')].map(a => a.getAttribute('href'));
  A('index: 6 occasion chips with occ links', chips.length === 6 && chips.every(h => h.startsWith('shop.html?occ=')));
  const wa = d.querySelector('.wa-float');
  A('index: floating WhatsApp with wa.me deep link', !!wa && (wa.getAttribute('href') || '').includes('wa.me/212772966980'));
  const card = [...d.querySelectorAll('.pcard')].find(c => c.querySelector('.op')) || d.querySelector('.pcard');
  A('index: save-% badge on discounted card', !!card && !!card.querySelector('.save-pct') && /\d/.test(card.querySelector('.save-pct').textContent));
  await sleep(900);
  const wel = d.querySelector('.wel-ovl');
  A('welcome offer appears once with ROSE10 code', !!wel && wel.textContent.includes('ROSE10'));
  if (wel) { wel.querySelector('.wel-x').click(); await sleep(80); }
  A('welcome dismiss persists (rbm_wel)', dom.window.localStorage.getItem('rbm_wel') === '1');
  await sleep(700);
  const sp = d.querySelector('.sp-pop');
  A('social-proof popup shows after welcome closes', !!sp && sp.textContent.trim().length > 10);
  if (sp) { sp.querySelector('.sp-x').click(); await sleep(80); }
  A('social-proof dismissal persists (rbm_sp_off)', Number(dom.window.localStorage.getItem('rbm_sp_off')) > 0);
  const cart = JSON.parse(dom.window.localStorage.getItem('rbm_cart_v2') || '[]');
  dom.window.close();
}
/* ---- product ---- */
{
  const dom = mk('product.html', QUIET, 'http://localhost:8080/product.html?id=amour'); await sleep(1600);
  const d = dom.window.document;
  const mbar = d.querySelector('.pd-mbar');
  A('product: sticky mobile order bar exists', !!mbar && !!mbar.querySelector('.pd-mbar-add'));
  A('product: mbar shows live price', !!mbar && /\d/.test(mbar.querySelector('.pd-mbar-p').textContent));
  const tl = d.querySelector('.trust-line');
  A('product: trust + cutoff line under buy row', !!tl && tl.textContent.includes('✦') && tl.textContent.trim().length > 10);
  mbar.querySelector('.pd-mbar-add').click(); await sleep(150);
  const cart = JSON.parse(dom.window.localStorage.getItem('rbm_cart_v2') || '[]');
  A('product: mbar add button really adds to cart', cart.length === 1 && cart[0].pid === 'amour');
  A('product: no floating WA (bar owns the WA action)', !d.querySelector('.wa-float'));
  dom.window.close();
}
/* ---- cart: free-shipping progress ---- */
{
  const ls = { __ls: { rbm_wel: '1', rbm_sp_off: String(Date.now()), rbm_cart_v2: JSON.stringify([{ key: 'k1', pid: 'amour', colorId: 'red', qty: 1, addons: [] }]) } };
  const dom = mk('cart.html', ls); await sleep(1600);
  const d = dom.window.document;
  const fs = d.querySelector('.fs-wrap');
  A('cart: free-shipping progress bar rendered', !!fs && !!fs.querySelector('.fs-bar i'));
  A('cart: nudge shows remaining amount (410 DH)', !!fs && fs.textContent.includes('410'));
  dom.window.close();
}
/* ---- checkout: fs bar, no float/popups ---- */
{
  const dom = mk('checkout.html', QUIET.__ls ? { __ls: Object.assign(QUIET.__ls, { rbm_cart_v2: JSON.stringify([{ key: 'k1', pid: 'amour', colorId: 'red', qty: 1, addons: [] }]) }) } : {}); await sleep(1800);
  const d = dom.window.document;
  A('checkout: free-shipping bar in summary', !!d.querySelector('.fs-wrap'));
  A('checkout: no WA float, no welcome, no social proof', !d.querySelector('.wa-float') && !d.querySelector('.wel-ovl') && !d.querySelector('.sp-pop'));
  dom.window.close();
}
/* ---- shop ?occ=birth filter ---- */
{
  const dom = mk('shop.html', QUIET, 'http://localhost:8080/shop.html?occ=birth'); await sleep(1600);
  const d = dom.window.document;
  const names = [...d.querySelectorAll('#shopGrid .pcard, .grid-prod .pcard')];
  A('shop: occ=birth shows only birthday-tagged products (4)', names.length === 4);
  dom.window.close();
}
console.log('--- conversion suite done: ' + pass + ' pass / ' + fail + ' fail');
process.exit(process.exitCode || 0);
