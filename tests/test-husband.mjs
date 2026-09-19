/* Persona journey: husband buys anniversary surprise for his wife */
import fs from 'fs';
import pkg from 'jsdom';
import { fileURLToPath } from 'node:url';
const PUB = fileURLToPath(new URL('../public', import.meta.url));
const { JSDOM, VirtualConsole } = pkg;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const A = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n); c ? pass++ : (fail++, process.exitCode = 1); };
const rd = p => fs.readFileSync(PUB + '/' + p, 'utf8');
const PRODS = [
  { id: 'royal', cat: 'bouq', type: 'bouquet', qty: 20, ar: 'القلب الملكي', fr: 'Coeur Royal', en: 'Royal Heart', price: 180, old: 0, badge: '', featured: true, active: true, occ: ['anniv', 'wed'] },
  { id: 'carre', cat: 'box', type: 'box', qty: 9, ar: 'المربع المخملي', fr: 'Carre Velours', en: 'Velvet Square', price: 150, old: 0, badge: '', featured: false, active: true, occ: ['anniv'] },
  { id: 'coeur', cat: 'box', type: 'box', qty: 16, ar: 'علبة القلب', fr: 'Coeur', en: 'Heart Box', price: 190, old: 0, badge: '', featured: false, active: true, occ: ['anniv', 'birth'] },
  { id: 'valentin', cat: 'occ', type: 'bouquet', qty: 30, ar: 'باقة الحب', fr: 'Valentin', en: 'Valentine', price: 300, old: 350, badge: 'best', featured: false, active: true, occ: ['anniv'] },
  { id: 'mini', cat: 'bouq', type: 'bouquet', qty: 5, ar: 'ميني روز', fr: 'Mini Rose', en: 'Mini Rose', price: 45, old: 0, badge: '', featured: false, active: true, occ: ['baby'] }
];
const SEED = { settings: { whatsapp: '212772966980', currency: 'DH', siteUrl: '', passHash: null, freeShip: 500, builderUnit: 9 }, categories: [{ id: 'bouq', icon: '', ar: 'باقات', fr: 'B', en: 'B' }, { id: 'box', icon: '', ar: 'علب', fr: 'B', en: 'B' }, { id: 'occ', icon: '', ar: 'مناسبات', fr: 'B', en: 'B' }], products: PRODS, colors: [{ id: 'red', ar: 'أحمر', fr: 'Rouge', en: 'Red', hex: '#C8102E', available: true }, { id: 'darkred', ar: 'أحمر داكن', fr: 'Bordeaux', en: 'Dark Red', hex: '#6E1423', available: true }], addons: [{ id: 'card', icon: '', ar: 'بطاقة', fr: 'Carte', en: 'Card', price: 0, hasText: true, enabled: true }], builderTiers: [{ id: 'b10', qty: 10, price: 90 }], zones: [{ id: 'tanger', ar: 'طنجة', fr: 'Tanger', en: 'Tangier', fee: 20 }], promoCodes: [], discounts: [], reviews: [], orders: [], pageviews: {}, prodViews: {} };
const mk = async (page, q = '', ls = {}) => {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { const m = String(e.message || e); if (!/not implemented|Could not load/i.test(m)) { fail++; console.log('PAGE-ERR: ' + m.slice(0, 120)); process.exitCode = 1; } });
  const d = new JSDOM(rd(page), { url: 'http://localhost:8080/' + page + q, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.RBM_WEL_MS = 9e5; w.RBM_SP_MS = 9e5; w.localStorage.setItem('rbm_v2_state', JSON.stringify(SEED)); for (const [k, v] of Object.entries(ls)) w.localStorage.setItem(k, v); } });
  await sleep(1800);
  return d;
};
/* 1) anniversary occasion filter shows exactly his 4 options */
{
  const d = await mk('shop.html', '?occ=anniv'); const doc = d.window.document;
  const cards = doc.querySelectorAll('.pcard');
  const names = [...cards].map(c => c.textContent);
  A('occ=anniv shows his 4 choices (no mini-rose)', cards.length === 4 && !names.join(' ').includes('ميني روز'));
  d.window.close();
}
/* 2) gift checkout: royal heart for the wife, surprise wrap */
{
  const d = await mk('checkout.html', '', { rbm_cart_v2: JSON.stringify([{ key: 'k1', pid: 'royal', colorId: 'darkred', qty: 1, addons: ['card'], note: 'كل سنة وانتي حياتي يا نادية' }]) });
  const doc = d.window.document;
  const gift = doc.getElementById('co_gift');
  A('gift checkbox exists on checkout', !!gift);
  const lbl = doc.querySelector('.chk-gift').textContent;
  A('gift label has NO emoji (v5 rule — only WA message)', lbl.length > 10 && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(lbl));
  gift.checked = true;
  doc.getElementById('co_name').value = 'يوسف بنعمر';
  doc.getElementById('co_phone').value = '0661234567';
  doc.getElementById('co_city').value = 'طنجة - الشرف، الزنقة 12، رقم 8';
  doc.getElementById('co_notes').value = 'مفاجأة الذكرى — الرجاء الاتصال قبلي وصولكم';
  [...doc.querySelectorAll('button')].find(b => b.textContent.includes('واتساب')).click();
  await sleep(400);
  const ta = doc.querySelector('.msg-box');
  const msg = ta ? ta.value : '';
  A('submit with gift: success panel', !!doc.querySelector('.ok-panel'));
  A('WA message has the surprise-gift line', msg.includes('🎁') && msg.includes('بدون فاتورة'));
  A('WA message keeps color + card + total', msg.includes('أحمر داكن') && msg.includes('نادية') && msg.includes('180 DH'));
  const st = JSON.parse(d.window.localStorage.getItem('rbm_v2_state'));
  A('order saved with gift flag (admin can see it)', st.orders[0].gift === true);
  d.window.close();
}
/* 3) without gift: no gift line */
{
  const d = await mk('checkout.html', '', { rbm_cart_v2: JSON.stringify([{ key: 'k1', pid: 'royal', colorId: 'red', qty: 1, addons: [], note: '' }]) });
  const doc = d.window.document;
  doc.getElementById('co_name').value = 'يوسف';
  doc.getElementById('co_phone').value = '0661234567';
  doc.getElementById('co_city').value = 'طنجة';
  [...doc.querySelectorAll('button')].find(b => b.textContent.includes('واتساب')).click();
  await sleep(350);
  const msg = doc.querySelector('.msg-box') ? doc.querySelector('.msg-box').value : '';
  A('no gift checkbox → no gift line in message', !msg.includes('🎁'));
  A('admin.js renders gift-tag chip (static)', rd('admin/assets/admin.js').includes("class: 'gift-tag'"));
  d.window.close();
}
console.log('--- husband suite done: ' + pass + ' pass / ' + fail + ' fail');
process.exit(process.exitCode || 0);
