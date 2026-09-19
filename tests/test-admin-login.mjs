import fs from 'fs';
import pkg from 'jsdom';
const { JSDOM, VirtualConsole } = pkg;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const A = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n); if (!c) process.exitCode = 1; };
const html = fs.readFileSync('/home/user/rose-by-marry/public/admin/index.html', 'utf8');
const BASE = {
  settings: { whatsapp: '212772966980', currency: 'DH', siteUrl: '', passHash: null, freeShip: 500, builderUnit: 9 },
  categories: [{ id: 'bouq', icon: '', ar: 'باقات', fr: 'Bouquets', en: 'Bouquets' }],
  products: [{ id: 'amour', cat: 'bouq', type: 'bouquet', qty: 10, ar: 'باقة أمور', fr: 'Bouquet Amour', en: 'Amour Bouquet', dar: '', dfr: '', den: '', price: 90, old: 0, badge: 'best', featured: true, active: true }],
  colors: [{ id: 'red', ar: 'أحمر', fr: 'Rouge', en: 'Red', hex: '#C8102E', available: true }],
  addons: [], builderTiers: [{ id: 'b5', qty: 5, price: 45 }], zones: [{ id: 'tanger', ar: 'طنجة', fr: 'T', en: 'T', fee: 20 }],
  promoCodes: [], discounts: [],
  reviews: [{ id: 'r1', pid: 'amour', name: 'Salma', rating: 5, text: 'good', ts: Date.now() }],
  orders: [{ id: 'RBM-A1', ts: Date.now() - 60000, status: 'new', name: 'سارة', phone: '0611', city: 'طنجة', zoneName: 'T', zoneFee: 20, items: [{ pid: 'amour', name: 'Amour', qty: 2, color: 'Rouge', addons: '', note: '', price: 90 }], promo: '', discount: 0, date: '', note: '', total: 200, currency: 'DH' }],
  pageviews: { home: 3 }, prodViews: { amour: 2 }
};
async function loginWith(seedOverrides, code) {
  const seed = JSON.parse(JSON.stringify(BASE));
  Object.assign(seed, seedOverrides || {});
  if (seedOverrides && seedOverrides.settings) seed.settings = Object.assign({}, BASE.settings, seedOverrides.settings);
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => { if (!/not implemented|Could not load/i.test(String(e))) errs.push(String(e).slice(0, 150)); });
  const dom = new JSDOM(html, { url: 'http://localhost:8080/admin/index.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.localStorage.setItem('rbm_v2_state', JSON.stringify(seed)); } });
  await sleep(1100);
  const w = dom.window, d = w.document;
  d.getElementById('pcUser').value = 'marry';
  d.getElementById('pcInput').value = code || '1234';
  await sleep(1350);
  d.getElementById('pcGo').click();
  await sleep(450);
  return { w, d, errs, close: () => w.close() };
}
/* 1: fresh user */
{
  const r = await loginWith(null, '1234');
  A('fresh: unlock + dash renders (4 KPIs)', !r.d.body.classList.contains('gated') && r.d.querySelectorAll('#kpis .kpi').length === 4);
  A('fresh: boot flag set (watchdog silent)', r.w.RBM_BOOT_OK === true);
  A('fresh: cache-busted scripts', [...r.d.querySelectorAll('script[src]')].every(s => s.src.includes('v=')));
  A('fresh: no runtime errors', r.errs.length === 0);
  r.close();
}
/* 2: returning user with legacy-format passHash → auto-heal then login works */
{
  const r = await loginWith({ settings: { passHash: 'legacy:abc123' } }, '1234');
  const st = JSON.parse(r.w.localStorage.getItem('rbm_v2_state'));
  A('legacy hash: auto-healed to s2:/fb: format', /^(s2|fb):/.test(st.settings.passHash));
  A('legacy hash: 1234 unlocks + dash renders', !r.d.body.classList.contains('gated') && r.d.querySelectorAll('#kpis .kpi').length === 4);
  r.close();
}
/* 3: wrong code still rejected */
{
  const r = await loginWith(null, '9999');
  A('wrong code: stays gated', r.d.body.classList.contains('gated'));
  r.close();
}
/* 4: controller crash → visible error card, never blank */
{
  const seed = JSON.parse(JSON.stringify(BASE));
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, { url: 'http://localhost:8080/admin/index.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) {
    w.localStorage.setItem('rbm_v2_state', JSON.stringify(seed));
  } });
  await sleep(1100);
  const w = dom.window, d = w.document;
  w.eval('PAGE_INIT.index = function () { throw new Error("boom-test"); }');
  d.getElementById('pcUser').value = 'marry';
  d.getElementById('pcInput').value = '1234';
  await sleep(1350);
  d.getElementById('pcGo').click();
  await sleep(400);
  const pane = d.querySelector('.pane.act');
  A('crash: visible error card (not blank)', pane.textContent.includes('Render error') && pane.textContent.includes('boom-test'));
  A('crash: reload button present', !!pane.querySelector('button'));
  w.close();
}
console.log('--- admin-login suite done');
process.exit(process.exitCode || 0);
