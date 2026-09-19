import fs from 'fs';
import path from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = path.resolve(import.meta.dirname, '..');
let pass = 0, fail = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rd = p => fs.readFileSync(path.join(ROOT, 'public', p), 'utf8');
function A(name, cond) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name); } }

const BASE = { settings: { whatsapp: '212772966980', currency: 'DH', passHash: 's2:x', freeShip: 500, builderUnit: 9, gaId: '' }, categories: [], products: [], colors: [], addons: [], builderTiers: [], zones: [], promoCodes: [], discounts: [], reviews: [], orders: [], articles: [], pageviews: {}, prodViews: {}, faq: [] };
function withGa(gid) { const s = JSON.parse(JSON.stringify(BASE)); s.settings.gaId = gid; return s; }
async function load(page, state, consent) {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => { if (!/not implemented|Could not load/i.test(String(e))) errs.push(String(e).slice(0, 120)); });
  const dom = new JSDOM(rd(page), { url: 'http://localhost:8080/' + page, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) {
    w.RBM_WEL_MS = 9e5; w.RBM_SP_MS = 9e5;
    w.localStorage.setItem('rbm_v2_state', JSON.stringify(state));
    if (consent !== undefined) w.localStorage.setItem('rbm_consent', consent);
  } });
  await sleep(1700);
  return { w: dom.window, d: dom.window.document, errs };
}

/* 1) GA not configured -> nothing anywhere */
{
  const { d, w } = await load('index.html', JSON.parse(JSON.stringify(BASE)));
  A('off: no consent bar', !d.getElementById('consentBar'));
  A('off: no gtag script', ![...d.querySelectorAll('script[src]')].some(s => s.src.includes('googletagmanager')));
  w.close();
}
/* 2) GA configured, no answer yet -> banner, no script; accept -> loads + persists */
{
  const { d, w, errs } = await load('index.html', withGa('G-TEST12345'));
  const bar = d.getElementById('consentBar');
  A('ask: consent bar appears', !!bar);
  A('ask: banner text localized (AR)', bar && bar.textContent.includes('Google Analytics') && bar.textContent.length > 40);
  A('ask: privacy link present', !!bar.querySelector('a[href="privacy.html"]'));
  A('ask: no gtag yet', ![...d.querySelectorAll('script[src]')].some(s => s.src.includes('googletagmanager')));
  A('ask: no runtime errors', errs.length === 0);
  d.getElementById('cxYes').click();
  await sleep(400);
  A('accept: consent persisted yes', w.localStorage.getItem('rbm_consent') === 'yes');
  A('accept: gtag script injected with ID', [...d.querySelectorAll('script[src]')].some(s => s.src.includes('googletagmanager.com/gtag/js?id=G-TEST12345')));
  A('accept: banner removed', !d.getElementById('consentBar'));
  w.close();
}
/* 3) consent=yes remembered -> immediate load, no banner */
{
  const { d, w } = await load('shop.html', withGa('G-TEST12345'), 'yes');
  A('remembered: gtag loads', [...d.querySelectorAll('script[src]')].some(s => s.src.includes('gtag/js?id=G-TEST12345')));
  A('remembered: no banner', !d.getElementById('consentBar'));
  w.close();
}
/* 4) decline -> never loads, remembered */
{
  const { d, w } = await load('index.html', withGa('G-TEST12345'));
  d.getElementById('cxNo').click();
  await sleep(300);
  A('decline: consent persisted no', w.localStorage.getItem('rbm_consent') === 'no');
  A('decline: no gtag', ![...d.querySelectorAll('script[src]')].some(s => s.src.includes('googletagmanager')));
  w.close();
  const { d: d2, w: w2 } = await load('about.html', withGa('G-TEST12345'), 'no');
  A('declined: stays off on reload', ![...d2.querySelectorAll('script[src]')].some(s => s.src.includes('googletagmanager')) && !d2.getElementById('consentBar'));
  w2.close();
}
/* 5) admin settings: prefill, validation, save */
{
  const vc = new VirtualConsole(); const errs = [];
  vc.on('jsdomError', e => { if (!/not implemented|Could not load/i.test(String(e))) errs.push(String(e).slice(0, 120)); });
  const seed = withGa('G-OLDID0001');
  const dom = new JSDOM(rd('admin/settings.html'), { url: 'http://localhost:8080/admin/settings.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.localStorage.setItem('rbm_v2_state', JSON.stringify(seed)); w.sessionStorage.setItem('rbm_admin', '1'); w.sessionStorage.setItem('rbm_admin_ts', String(Date.now())); } });
  await sleep(1000);
  const d = dom.window.document;
  A('settings: gaId prefilled', d.getElementById('set_ga').value === 'G-OLDID0001');
  d.getElementById('set_ga').value = 'not-valid-id';
  d.getElementById('setSave').click();
  await sleep(500);
  const st1 = JSON.parse(dom.window.localStorage.getItem('rbm_v2_state'));
  A('settings: invalid rejected (unchanged)', st1.settings.gaId === 'G-OLDID0001');
  d.getElementById('set_ga').value = 'g-newid2026';
  d.getElementById('setSave').click();
  await sleep(500);
  const st2 = JSON.parse(dom.window.localStorage.getItem('rbm_v2_state'));
  A('settings: valid saved uppercase', st2.settings.gaId === 'G-NEWID2026');
  d.getElementById('set_ga').value = '';
  d.getElementById('setSave').click();
  await sleep(500);
  const st3 = JSON.parse(dom.window.localStorage.getItem('rbm_v2_state'));
  A('settings: empty disables', st3.settings.gaId === '');
  A('settings: no runtime errors', errs.length === 0);
  dom.window.close();
}
/* 6) gaId sanitize migration */
{
  const s = rd('assets/js/data.js');
  A('data: gaId normalized', s.includes('s.settings.gaId = sanitize(s.settings.gaId, 40);'));
}
/* 7) CSP matrix */
{
  const pages = fs.readdirSync(path.join(ROOT, 'public')).filter(f => f.endsWith('.html'));
  const admin = fs.readdirSync(path.join(ROOT, 'public/admin')).filter(f => f.endsWith('.html'));
  let pubBad = [], admBad = [];
  for (const f of pages) {
    const h = rd(f);
    if (!h.includes('https://www.googletagmanager.com') || !h.includes('connect-src')) pubBad.push(f);
  }
  for (const f of admin) if (rd('admin/' + f).includes('googletagmanager')) admBad.push(f);
  A('csp: all 20 storefront pages allow GA (script+connect)', pubBad.length === 0, pubBad.join(','));
  A('csp: all 14 admin pages stay strict (no GA)', admBad.length === 0, admBad.join(','));
}
/* 8) privacy disclosure */
{
  const i = rd('assets/js/i18n.js');
  A('privacy: pv6 keys x3', (i.match(/pv6_t:/g) || []).length === 3);
  A('privacy: pv6 markup present', rd('privacy.html').includes('data-i18n="pv6_t"'));
  A('privacy: 24-month disclosure in all langs', (i.match(/24 month|24 mois|24 شهراً/g) || []).length >= 3);
}
console.log('\nanalytics: ' + pass + ' pass / ' + fail + ' fail');
if (fail) process.exit(1);
