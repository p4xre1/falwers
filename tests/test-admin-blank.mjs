import fs from 'fs';
import pkg from 'jsdom';
const { JSDOM, VirtualConsole } = pkg;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const A = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n); if (!c) process.exitCode = 1; };
const html = fs.readFileSync('/home/user/rose-by-marry/public/admin/index.html', 'utf8');
const SEED = {
  settings: { whatsapp: '212772966980', currency: 'DH', siteUrl: '', passHash: null, freeShip: 500, builderUnit: 9 },
  categories: [{ id: 'bouq', icon: '', ar: 'باقات', fr: 'Bouquets', en: 'Bouquets' }],
  products: [{ id: 'amour', cat: 'bouq', type: 'bouquet', qty: 10, ar: 'باقة أمور', fr: 'Bouquet Amour', en: 'Amour Bouquet', dar: '', dfr: '', den: '', price: 90, old: 0, badge: 'best', featured: true, active: true }],
  colors: [{ id: 'red', ar: 'أحمر', fr: 'Rouge', en: 'Red', hex: '#C8102E', available: true }],
  addons: [], builderTiers: [{ id: 'b5', qty: 5, price: 45 }], zones: [{ id: 'tanger', ar: 'طنجة', fr: 'T', en: 'T', fee: 20 }],
  promoCodes: [], discounts: [],
  reviews: [{ id: 'r1', pid: 'amour', name: 'Salma', rating: 5, text: 'good', ts: Date.now() }],
  orders: [{ id: 'RBM-A1', ts: Date.now(), status: 'new', name: 'سارة', phone: '0611', city: 'طنجة', zoneName: 'T', zoneFee: 20, items: [{ pid: 'amour', name: 'Amour', qty: 2, color: 'R', addons: '', note: '', price: 90 }], promo: '', discount: 0, date: '', note: '', total: 200, currency: 'DH' }],
  pageviews: { home: 3 }, prodViews: { amour: 2 }
};
async function fresh() {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => { if (!/not implemented|Could not load/i.test(String(e))) errs.push(String(e).slice(0, 150)); });
  const dom = new JSDOM(html, { url: 'http://localhost:8080/admin/index.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.localStorage.setItem('rbm_v2_state', JSON.stringify(SEED)); } });
  await sleep(1100);
  return { w: dom.window, d: dom.window.document, errs, dom };
}
/* THE BUG: content shows <1s then blank → guardian must restore */
{
  const r = await fresh();
  r.d.getElementById('pcUser').value = 'marry';
  r.d.getElementById('pcInput').value = '1234';
  await sleep(1350);
  r.d.getElementById('pcGo').click();
  await sleep(300);
  A('bug-repro: content visible right after login', r.d.querySelectorAll('#kpis .kpi').length === 4);
  /* simulate whatever re-gates/wipes at ~300ms */
  r.d.body.classList.add('gated');
  r.d.querySelector('.pane.act').textContent = '';
  await sleep(2600);
  A('bug-repro: guardian removed re-gate', !r.d.body.classList.contains('gated'));
  A('bug-repro: guardian re-rendered the pane', r.d.querySelectorAll('#kpis .kpi').length === 4);
  A('bug-repro: no runtime errors', r.errs.length === 0);
  r.w.close();
}
/* unlock persistence across reload */
{
  const r = await fresh();
  r.d.getElementById('pcUser').value = 'marry';
  r.d.getElementById('pcInput').value = '1234';
  await sleep(1350);
  r.d.getElementById('pcGo').click();
  await sleep(300);
  const ls = r.w.localStorage.getItem('rbm_admin_kb');
  A('persistence: unlock saved to localStorage', ls === '1');
  /* simulate reload: same storage into a new JSDOM */
  const lsState = r.w.localStorage.getItem('rbm_v2_state');
  const vc2 = new VirtualConsole();
  const dom2 = new JSDOM(html, { url: 'http://localhost:8080/admin/index.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc2, beforeParse(w) { w.localStorage.setItem('rbm_v2_state', lsState); w.localStorage.setItem('rbm_admin_kb', '1'); } });
  await sleep(1600);
  const d2 = dom2.window.document;
  A('persistence: reload stays unlocked (no gate)', !d2.body.classList.contains('gated'));
  A('persistence: dash auto-rendered after reload', d2.querySelectorAll('#kpis .kpi').length === 4);
  dom2.window.close();
  r.w.close();
}
/* lock clears persistence */
{
  const r = await fresh();
  r.d.getElementById('pcUser').value = 'marry';
  r.d.getElementById('pcInput').value = '1234';
  await sleep(1350);
  r.d.getElementById('pcGo').click();
  await sleep(300);
  const lockBtn = r.d.getElementById('adLock');
  A('lock button exists', !!lockBtn);
  lockBtn.click();
  await sleep(900);
  const dom3w = r.w;
  const cleared = dom3w.localStorage.getItem('rbm_admin_kb');
  A('lock: localStorage unlock cleared', cleared !== '1');
  r.w.close();
}
/* error bar surfaces JS errors visibly */
{
  const r = await fresh();
  r.w.dispatchEvent(new r.w.ErrorEvent('error', { message: 'Simulated crash XYZ', bubbles: true, cancelable: true }));
  await sleep(150);
  A('error bar: shows the actual error text', r.d.getElementById('rbmErrBar') && r.d.getElementById('rbmErrBar').textContent.includes('Simulated crash XYZ'));
  r.w.close();
}
console.log('--- admin-blank suite done');
process.exit(process.exitCode || 0);
