/* Persona journey: girl buys a gift → checkout → WhatsApp (the money path) */
import fs from 'fs';
import pkg from 'jsdom';
const { JSDOM, VirtualConsole } = pkg;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const A = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n); c ? pass++ : (fail++, process.exitCode = 1); };
const rd = p => fs.readFileSync('/home/user/rose-by-marry/public/' + p, 'utf8');
const SEED = { settings: { whatsapp: '212772966980', currency: 'DH', siteUrl: '', passHash: null, freeShip: 500, builderUnit: 9 }, categories: [{ id: 'bouq', icon: '', ar: 'باقات', fr: 'B', en: 'B' }], products: [{ id: 'amour', cat: 'bouq', type: 'bouquet', qty: 10, ar: 'باقة أمور', fr: 'Bouquet Amour', en: 'Amour Bouquet', price: 90, old: 0, badge: '', featured: true, active: true }], colors: [{ id: 'red', ar: 'أحمر', fr: 'Rouge', en: 'Red', hex: '#C8102E', available: true }, { id: 'pink', ar: 'وردي', fr: 'Rose', en: 'Pink', hex: '#E5699B', available: true }], addons: [{ id: 'crown', icon: '', ar: 'تاج', fr: 'Couronne', en: 'Crown', price: 20, hasText: false, enabled: true }, { id: 'card', icon: '', ar: 'بطاقة', fr: 'Carte', en: 'Card', price: 0, hasText: true, enabled: true }], builderTiers: [{ id: 'b10', qty: 10, price: 90 }], zones: [{ id: 'tanger', ar: 'طنجة', fr: 'Tanger', en: 'Tangier', fee: 20 }], promoCodes: [{ id: 'p1', code: 'ROSE10', type: 'percent', value: 10, minTotal: 0, enabled: true, used: 0 }], discounts: [], reviews: [], orders: [], pageviews: {}, prodViews: {} };
const mk = async (page, q = '', ls = {}) => {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { const m = String(e.message || e); if (!/not implemented|Could not load/i.test(m)) fail++, (console.log('PAGE-ERR: ' + m.slice(0, 120)), (process.exitCode = 1)); });
  const d = new JSDOM(rd(page), { url: 'http://localhost:8080/' + page + q, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.RBM_WEL_MS = 9e5; w.RBM_SP_MS = 9e5; w.localStorage.setItem('rbm_v2_state', JSON.stringify(SEED)); for (const [k, v] of Object.entries(ls)) w.localStorage.setItem(k, v); } });
  await sleep(1800);
  return d;
};
/* THE CRITICAL PATH: order WITH extras must reach WhatsApp */
{
  const d = await mk('checkout.html', '', { rbm_cart_v2: JSON.stringify([{ key: 'k1', pid: 'amour', colorId: 'pink', qty: 2, addons: ['crown', 'card'], note: 'عيد ميلاد سعيد يا غالية' }]) });
  const doc = d.window.document;
  doc.getElementById('co_name').value = 'سلمى العلوي';
  doc.getElementById('co_phone').value = '0612345678';
  doc.getElementById('co_city').value = 'طنجة - المغازنة';
  [...doc.querySelectorAll('button')].find(b => b.textContent.includes('واتساب')).click();
  await sleep(400);
  A('submit WITH extras: success panel renders (was silent crash)', !!doc.querySelector('.ok-panel'));
  const ta = doc.querySelector('.msg-box');
  const msg = ta ? ta.value : '';
  A('WA message includes the chosen COLOR', msg.includes('اللون: وردي'));
  A('WA message includes extras with price', msg.includes('تاج (+20)'));
  A('WA message math correct (2 × 110 = 220)', msg.includes('2 × 110 DH = 220 DH'));
  A('WA message total = 240 (220 + 20 delivery)', msg.includes('*المبلغ الإجمالي:* 240 DH'));
  A('WA message carries name + address', msg.includes('سلمى العلوي') && msg.includes('المغازنة'));
  A('WA link targets the real number', [...doc.querySelectorAll('a')].some(a => (a.getAttribute('href') || '').includes('wa.me/212772966980')));
  A('order saved to admin log with pid+colorId', JSON.parse(d.window.localStorage.getItem('rbm_v2_state')).orders[0].items[0].pid === 'amour');
  A('cart cleared after successful order', JSON.parse(d.window.localStorage.getItem('rbm_cart_v2') || '[]').length === 0);
  d.window.close();
}
/* validation path: empty form must not submit */
{
  const d = await mk('checkout.html', '', { rbm_cart_v2: JSON.stringify([{ key: 'k1', pid: 'amour', colorId: 'red', qty: 1, addons: [], note: '' }]) });
  const doc = d.window.document;
  [...doc.querySelectorAll('button')].find(b => b.textContent.includes('واتساب')).click();
  await sleep(250);
  A('empty form blocked (errors shown, no panel)', !!doc.querySelector('.err.show') && !doc.querySelector('.ok-panel'));
  d.window.close();
}
console.log('--- persona suite done: ' + pass + ' pass / ' + fail + ' fail');
process.exit(process.exitCode || 0);
