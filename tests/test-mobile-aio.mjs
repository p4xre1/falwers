import fs from 'fs';
import path from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = path.resolve(import.meta.dirname, '..');
let pass = 0, fail = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rd = p => fs.readFileSync(path.join(ROOT, 'public', p), 'utf8');
function A(name, cond) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name); } }

async function load(page, opts = {}) {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => { if (!/not implemented|Could not load/i.test(String(e))) errs.push(String(e).slice(0, 140)); });
  const dom = new JSDOM(rd(page.split('?')[0]), { url: 'http://localhost:8080/' + page, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.RBM_WEL_MS = 9e5; w.RBM_SP_MS = 9e5; for (const [k, v] of Object.entries(opts.ls || {})) w.localStorage.setItem(k, v); } });
  await sleep(opts.wait || 1700);
  return { w: dom.window, d: dom.window.document, errs };
}

/* 1) mobile CSS layer */
{
  const c = rd('assets/css/style.css');
  A('mobile: 16px inputs (no iOS zoom)', c.includes('input,select,textarea{font-size:16px}'));
  A('mobile: tap-highlight off', c.includes('-webkit-tap-highlight-color:transparent'));
  A('mobile: petals hidden on phones', c.includes('#petals{display:none}'));
  A('mobile: smooth scroll + reduced-motion guard', c.includes('scroll-behavior:smooth') && /@media \(prefers-reduced-motion:reduce\)\{html\{scroll-behavior:auto\}\}/.test(c));
  A('mobile: media queries for grids', /@media \(max-width:640px\)/.test(c) && /@media \(max-width:960px\) and \(min-width:641px\)/.test(c));
  A('mobile: img max-width guard', c.includes('img,svg,video{max-width:100%;height:auto}'));
  A('mobile: overscroll behavior', c.includes('overscroll-behavior-y:none'));
  const cssBraces = c.split('{').length === c.split('}').length;
  A('mobile: CSS braces balanced', cssBraces);
}
/* 2) viewport meta on all 35 pages */
{
  const pages = fs.readdirSync(path.join(ROOT, 'public')).filter(f => f.endsWith('.html'));
  const admin = fs.readdirSync(path.join(ROOT, 'public/admin')).filter(f => f.endsWith('.html'));
  const missing = pages.concat(admin.map(a => 'admin/' + a)).filter(f => !rd(f).includes('name="viewport"'));
  A('viewport: all ' + (pages.length + admin.length) + ' pages have viewport meta', missing.length === 0);
}
/* 3) AI crawler layer */
{
  const rob = rd('robots.txt');
  const bots = (rob.match(/USER-AGENT:/gi) || []).length;
  A('robots: >=20 bot blocks', bots >= 20);
  A('robots: sitemap + ai-sitemap + ai.txt refs', rob.includes('SITEMAP: https://rosebymarry.com/sitemap.xml') && rob.includes('ai-sitemap.xml') && rob.includes('ai.txt'));
  const sm = rd('ai-sitemap.xml');
  A('ai-sitemap: exists, valid, 12 urls, no admin/search', sm.includes('<urlset') && (sm.match(/<url>/g) || []).length === 12 && !sm.includes('/admin') && !sm.includes('/search'));
  A('ai-sitemap: new platform pages included', sm.includes('/occasions<') && sm.includes('/care<') && sm.includes('/size-guide<') && sm.includes('/offers<'));
  const ll = rd('llms.txt');
  A('llms: 5 colors fixed', ll.includes('Tangier Blue') && ll.includes('Tangier Pink') && !ll.includes('Roses in 3 colors'));
  A('llms: new pages + real prices', ll.includes('/occasions') && ll.includes('/care') && ll.includes('/size-guide') && ll.includes('/offers') && ll.includes('15\u2013550 MAD') && ll.includes('9 DH/rose'));
  A('llms: Tangier-only policy stated', ll.includes('inside Tangier only'));
  const lf = rd('llms-full.txt');
  A('llms-full: site sections + FAQ sections', lf.includes('## Site sections') && lf.includes('/size-guide') && lf.includes('## FAQ'));
}
/* 4) FAQ CMS end-to-end */
{
  const { d, errs } = await load('faq.html', { ls: { rbm_v2_state: JSON.stringify({ settings: { whatsapp: '212772966980', currency: 'DH', passHash: 's2:x', freeShip: 500, builderUnit: 9, promoCodes: [] }, categories: [], products: [], colors: [], addons: [], builderTiers: [], zones: [], discounts: [], reviews: [], orders: [], articles: [], pageviews: {}, prodViews: {}, faq: [{ q: { ar: '\u0647\u0644 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0645\u062c\u0627\u0646\u064a\u061f', fr: 'Livraison gratuite ?', en: 'Free delivery?' }, a: { ar: '\u0645\u0646 500 \u062f\u0631\u0647\u0645 \u062f\u0627\u062e\u0644 \u0637\u0646\u062c\u0629', fr: 'D\u00e8s 500 DH', en: 'From 500 DH' } }] }) } });
  A('faq CMS: dynamic item rendered', d.querySelectorAll('#faqList .faq-item').length === 1);
  A('faq CMS: AR text shown', d.querySelector('#faqList summary span').textContent.includes('\u0627\u0644\u062a\u0648\u0635\u064a\u0644'));
  const ld = JSON.parse(d.getElementById('faqLd').textContent);
  A('faq CMS: FAQPage LD overridden', ld.mainEntity.length === 1 && ld.mainEntity[0].name.includes('\u0627\u0644\u062a\u0648\u0635\u064a\u0644'));
  A('faq CMS: no runtime errors', errs.length === 0);
  d.defaultView.close();
}
{
  /* default (no S.faq): static 6 items remain */
  const { d } = await load('faq.html');
  A('faq default: static 6 items untouched', d.querySelectorAll('#faqList .faq-item').length === 6);
  d.defaultView.close();
}
/* 5) offers driven by state */
{
  const seed = { settings: { whatsapp: '212772966980', currency: 'DH', passHash: 's2:x', freeShip: 400, builderUnit: 11 }, categories: [], products: [], colors: [], addons: [], builderTiers: [], zones: [], discounts: [], reviews: [], orders: [], articles: [], pageviews: {}, prodViews: {}, faq: [], promoCodes: [{ id: 'p9', code: 'SALMA20', type: 'percent', value: 20, minTotal: 0, enabled: true, used: 0 }] };
  const { d, errs } = await load('offers.html', { ls: { rbm_v2_state: JSON.stringify(seed) } });
  A('offers CMS: live code from state', d.getElementById('offCode').textContent === 'SALMA20');
  A('offers CMS: live discount badge', d.getElementById('offBadge1').textContent === '-20%');
  A('offers CMS: live free-ship from settings', d.getElementById('offBadge2').textContent === '400 DH');
  A('offers CMS: live builder unit', d.getElementById('offBadge3').textContent === '11 DH');
  A('offers CMS: no runtime errors', errs.length === 0);
  d.defaultView.close();
}
/* 6) product BreadcrumbList */
{
  const { d, errs } = await load('product.html?id=amour');
  const lds = [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch (e) { return null; } });
  const bc = lds.find(x => x && x['@type'] === 'BreadcrumbList');
  A('product: BreadcrumbList 4 levels (home/shop/cat/product)', !!bc && bc.itemListElement.length === 4 && bc.itemListElement[3].name.length > 1);
  A('product: no runtime errors', errs.length === 0);
  d.defaultView.close();
}
/* 7) static BreadcrumbList on new pages */
{
  const bcOk = ['occasions.html', 'care.html', 'size-guide.html', 'offers.html'].every(f => rd(f).includes('"BreadcrumbList"'));
  A('new pages: static BreadcrumbList x4', bcOk);
}
/* 8) admin FAQ page: 15 tabs, add + bulk + save */
{
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => { if (!/not implemented|Could not load/i.test(String(e))) errs.push(String(e).slice(0, 140)); });
  const seed = { settings: { whatsapp: '212772966980', currency: 'DH', passHash: 's2:abc', freeShip: 500, builderUnit: 9, adminUser: 'marry' }, categories: [], products: [], colors: [], addons: [], builderTiers: [], zones: [], promoCodes: [], discounts: [], reviews: [], orders: [], articles: [], pageviews: {}, prodViews: {}, faq: [{ q: { ar: '\u0633 \u0642\u062f\u064a\u0645', fr: '', en: '' }, a: { ar: '\u062c \u0642\u062f\u064a\u0645', fr: '', en: '' } }] };
  const dom = new JSDOM(rd('admin/faq.html'), { url: 'http://localhost:8080/admin/faq.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.localStorage.setItem('rbm_v2_state', JSON.stringify(seed)); w.sessionStorage.setItem('rbm_admin', '1'); w.sessionStorage.setItem('rbm_admin_ts', String(Date.now())); } });
  await sleep(1000);
  const d = dom.window.document;
  A('admin faq: 14 nav tabs', d.querySelectorAll('#adSide .ad-tab').length === 14);
  A('admin faq: seeded row rendered (6 inputs)', d.querySelectorAll('#faqAdmList .faq-adm-row input').length === 6);
  d.getElementById('faqBulk').value = '\u0647\u0644 \u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645\u061f :: \u0646\u0639\u0645 \u0646\u062f\u0641\u0639 \u0646\u0642\u062f\u0627 :: Pay \u00e0 la livraison ? :: Oui en esp\u00e8ces';
  d.getElementById('faqBulkGo').click();
  await sleep(500);
  A('admin faq: bulk adds row (2 total)', d.querySelectorAll('#faqAdmList .faq-adm-row').length === 2);
  d.getElementById('faqSave').click();
  await sleep(500);
  const st = JSON.parse(dom.window.localStorage.getItem('rbm_v2_state'));
  A('admin faq: save persists 2 entries', st.faq.length === 2 && st.faq[1].q.ar.includes('\u0627\u0644\u062f\u0641\u0639') && st.faq[1].a.fr.includes('esp\u00e8ces'));
  d.querySelectorAll('#faqAdmList .faq-adm-row .del-btn')[0].click();
  d.getElementById('faqSave').click();
  await sleep(400);
  const st2 = JSON.parse(dom.window.localStorage.getItem('rbm_v2_state'));
  A('admin faq: delete works', st2.faq.length === 1);
  A('admin faq: no runtime errors', errs.length === 0);
  dom.window.close();
}
/* 9) i18n trilingual faqadm keys */
{
  const i = rd('assets/js/i18n.js');
  A('i18n: faqadm_t x3 langs', (i.match(/faqadm_t:/g) || []).length === 3);
  A('i18n: faqadm_hint x3 langs', (i.match(/faqadm_hint:/g) || []).length === 3);
}
console.log('\nmobile-aio: ' + pass + ' pass / ' + fail + ' fail');
if (fail) process.exit(1);
