import fs from 'fs';
import pkg from 'jsdom';
import { fileURLToPath } from 'node:url';
const PUB = fileURLToPath(new URL('../public', import.meta.url));
const { JSDOM, VirtualConsole } = pkg;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const A = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n); if (!c) process.exitCode = 1; };
const SEED = {
  settings: { whatsapp: '212772966980', currency: 'DH', siteUrl: '', passHash: null, freeShip: 500, builderUnit: 9 },
  categories: [{ id: 'bouq', icon: '', ar: 'باقات', fr: 'Bouquets', en: 'Bouquets' }],
  products: [{ id: 'amour', cat: 'bouq', type: 'bouquet', qty: 10, ar: 'باقة أمور', fr: 'Bouquet Amour', en: 'Amour Bouquet', dar: '', dfr: '', den: '', price: 90, old: 0, badge: '', featured: true, active: true }],
  colors: [
    { id: 'blue', ar: 'أزرق', fr: 'Bleu', en: 'Blue', hex: '#3A5FA8', available: true },
    { id: 'red', ar: 'أحمر', fr: 'Rouge', en: 'Red', hex: '#C8102E', available: true },
    { id: 'darkred', ar: 'أحمر داكن', fr: 'Rouge foncé', en: 'Dark Red', hex: '#6E1423', available: true }],
  addons: [], builderTiers: [],
  zones: [{ id: 'tanger', ar: 'طنجة', fr: 'Tanger', en: 'Tangier', fee: 20 }],
  promoCodes: [], discounts: [], reviews: [], orders: [], pageviews: { home: 7, shop: 3 }, prodViews: { amour: 5 }
};
const seed = w => w.localStorage.setItem('rbm_v2_state', JSON.stringify(SEED));
const seedA = w => { seed(w); try { w.sessionStorage.setItem('rbm_admin', '1');w.sessionStorage.setItem('rbm_admin_ts',String(Date.now())); } catch (e) {} };
async function loadAdmin(page, seedFn) {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => { if (!/not implemented|Could not load/i.test(String(e))) errs.push(String(e).slice(0, 200)); });
  const html = fs.readFileSync(PUB + '/admin/' + page + '.html', 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost:8080/admin/' + page + '.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { if (seedFn) seedFn(w); } });
  await sleep(850);
  return { w: dom.window, d: dom.window.document, errs };
}
/* gate + tabs (10) */
{
  const { w, d, errs } = await loadAdmin('index', seed);
  d.getElementById('pcUser').value = 'marry'; d.getElementById('pcInput').value = '1234'; await sleep(1350); d.getElementById('pcGo').click(); await sleep(150);
  A('gate: unlocks', !d.body.classList.contains('gated'));
  A('tabs: 14 pages (faq added)', d.querySelectorAll('#adSide .ad-tab').length === 14);
  A('tabs: label-only, no emoji', !/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(d.querySelector('#adSide').textContent));
  A('gate/dash: no runtime errors', errs.length === 0); if (errs.length) console.log(errs.join('\n'));
  w.close();
}
/* discounts CRUD + cart math via totals function */
{
  const { w, d, errs } = await loadAdmin('discounts', seedA);
  await sleep(100);
  d.getElementById('addDisc').click(); await sleep(500);
  A('discounts: add row -> 1', d.querySelectorAll('#discList .arow').length === 1);
  const st = JSON.parse(w.localStorage.getItem('rbm_v2_state'));
  A('discounts: persisted enabled 10%', st.discounts.length === 1 && st.discounts[0].enabled && st.discounts[0].value === 10);
  /* delete */
  d.querySelector('#discList .del-btn').click(); await sleep(40);
  d.getElementById('cfOk').click(); await sleep(100);
  const st2 = JSON.parse(w.localStorage.getItem('rbm_v2_state'));
  A('discounts: delete works', st2.discounts.length === 0);
  A('discounts: no runtime errors', errs.length === 0); if (errs.length) console.log(errs.join('\n'));
  w.close();
}
/* interests */
{
  const { w, d, errs } = await loadAdmin('interests', seedA);
  await sleep(100);
  const kpis = [...d.querySelectorAll('#intTotals .kv')].map(x => x.textContent);
  A('interests: totals (10 pageviews / 5 product views)', kpis[0] === '10' && kpis[1] === '5');
  A('interests: pages rows sorted', d.querySelectorAll('#pagesInt .arow').length === 2 && d.querySelector('#pagesInt .arow').textContent.includes('7'));
  A('interests: product row with name + view link', d.querySelector('#prodsInt .arow').textContent.includes('أمور') && !!d.querySelector('#prodsInt a.ad-btn'));
  d.getElementById('intReset').click(); await sleep(40);
  d.getElementById('cfOk').click(); await sleep(100);
  const st = JSON.parse(w.localStorage.getItem('rbm_v2_state'));
  A('interests: reset clears', Object.keys(st.pageviews).length === 0 && Object.keys(st.prodViews).length === 0);
  A('interests: no runtime errors', errs.length === 0); if (errs.length) console.log(errs.join('\n'));
  w.close();
}
/* colors regression (3 defaults still fine) */
{
  const { w, d, errs } = await loadAdmin('colors', seedA);
  await sleep(100);
  A('colors: 3 rows', d.querySelectorAll('#colorsList .arow').length === 3);
  A('colors: no emoji in hint', !/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(d.querySelector('.hintline').textContent));
  w.close();
}
console.log('--- cms5 done');
process.exit(process.exitCode || 0);
