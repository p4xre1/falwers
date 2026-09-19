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
  const dom = new JSDOM(rd(page.split('?')[0]), { url: 'http://localhost:8080/' + page + (opts.q || ''), runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.RBM_WEL_MS = 9e5; w.RBM_SP_MS = 9e5; for (const [k, v] of Object.entries(opts.ls || {})) w.localStorage.setItem(k, v); } });
  await sleep(opts.wait || 1700);
  return { w: dom.window, d: dom.window.document, errs };
}

/* 1) occasions page */
{
  const { d, errs } = await load('occasions.html');
  A('occasions: 6 occasion cards', d.querySelectorAll('.occ-grid:not(.occ-budget) .occ-card').length === 6);
  A('occasions: links to shop?occ=wed', !!d.querySelector('a[href="shop.html?occ=wed"]'));
  A('occasions: 3 budget tiers', d.querySelectorAll('.occ-budget .occ-card').length === 3);
  A('occasions: budget max=99 link', !!d.querySelector('a[href="shop.html?max=99"]'));
  A('occasions: titles i18n-filled', d.querySelector('.occ-grid .occ-card h3').textContent.length > 2);
  A('occasions: no runtime errors', errs.length === 0);
  d.defaultView.close();
}
/* 2) shop budget + occasion deep-links */
{
  const { d, errs } = await load('shop.html', { q: '?max=99' });
  const cnt = d.getElementById('shopCount').textContent;
  A('shop: max=99 filters to cheap items', cnt.trim().startsWith('5'));
  const prices = [...d.querySelectorAll('#shopGrid .pcard, #shopGrid [data-pid]')];
  A('shop: max=99 renders 5 cards', d.querySelectorAll('#shopGrid > *').length === 5);
  A('shop: no runtime errors', errs.length === 0);
  d.defaultView.close();
}
{
  const { d } = await load('shop.html', { q: '?occ=wed' });
  A('shop: occ=wed filters (4 wedding items)', d.querySelectorAll('#shopGrid > *').length === 4);
  d.defaultView.close();
}
/* 3) search page */
{
  const { d, errs } = await load('search.html');
  A('search: page + input render', !!d.getElementById('qSearch'));
  A('search: sections hidden before query', d.getElementById('qSecProd').style.display === 'none');
  const inp = d.getElementById('qSearch');
  inp.value = '\u0623\u0645\u0648\u0631';
  inp.dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
  await sleep(600);
  A('search: product hit for أمور', d.querySelectorAll('#qProd > *').length >= 1);
  inp.value = '\u0633\u0627\u062a\u0627\u0646';
  inp.dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
  await sleep(600);
  A('search: article hits for ساتان', d.querySelectorAll('#qArt .occ-card').length >= 1);
  A('search: FAQ hits for ساتان', d.querySelectorAll('#qFaq .faq-item').length >= 1);
  A('search: results count line', d.getElementById('qCount').textContent.includes('«'));
  A('search: no runtime errors', errs.length === 0);
  d.defaultView.close();
}
/* 4) care page */
{
  const { d, errs } = await load('care.html');
  A('care: 6 rule cards', d.querySelectorAll('.care-card').length === 6);
  const lds = [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch (e) { return null; } });
  A('care: HowTo JSON-LD with 6 steps', lds.some(x => x && x['@type'] === 'HowTo' && x.step.length === 6));
  A('care: i18n filled', d.querySelector('.care-card em').textContent.length > 2);
  A('care: no runtime errors', errs.length === 0);
  d.defaultView.close();
}
/* 5) size guide */
{
  const { d, errs } = await load('size-guide.html');
  A('size: 2 tables (bouquets + boxes)', d.querySelectorAll('.size-tbl').length === 2);
  A('size: 3 rows each', [...d.querySelectorAll('.size-tbl tbody')].every(tb => tb.querySelectorAll('tr').length === 3));
  A('size: no runtime errors', errs.length === 0);
  d.defaultView.close();
}
/* 6) offers */
{
  const { d, errs } = await load('offers.html');
  A('offers: code ROSE10 displayed', d.getElementById('offCode').textContent === 'ROSE10');
  A('offers: 3 offer cards', d.querySelectorAll('.off-card').length === 3);
  d.getElementById('offCopyBtn').click();
  await sleep(300);
  const toastEl = d.querySelector('.toast, #toast, [class*="toast"]');
  A('offers: copy fires toast', !!toastEl && toastEl.textContent.length > 0);
  A('offers: no runtime errors', errs.length === 0);
  d.defaultView.close();
}
/* 7) product page: specs + share */
{
  const { d, errs } = await load('product.html?id=amour');
  A('product: specs block', d.querySelectorAll('#pdSpecs li').length === 3);
  A('product: specs roses count real (10)', d.querySelector('#pdSpecs li').textContent.includes('10'));
  A('product: spec link to size-guide', d.querySelector('#pdSpecs .spec-link').getAttribute('href') === 'size-guide.html');
  A('product: share button', !!d.getElementById('pdShare'));
  A('product: WA share anchor', !!d.querySelector('.pd-share a[href*="api.whatsapp.com"]'));
  A('product: no runtime errors', errs.length === 0);
  d.defaultView.close();
}
/* 8) chrome: header search + nav occasions + footer expansion */
{
  const { d } = await load('index.html');
  A('chrome: header search icon', !!d.querySelector('.head-icons a.icon-btn[href="search.html"]'));
  A('chrome: nav occasions link', !!d.querySelector('.main-nav a[href="occasions.html"]'));
  A('chrome: footer lists offers/care/size-guide', !!d.querySelector('#siteFooter a[href="offers.html"]') && !!d.querySelector('#siteFooter a[href="care.html"]') && !!d.querySelector('#siteFooter a[href="size-guide.html"]'));
  d.defaultView.close();
}
/* 9) plumbing: routes, sitemap, robots-aware head */
{
  const routes = rd('../src/routes/routes.js');
  A('routes: 4 new public entries + search', routes.includes("path: '/occasions'") && routes.includes("path: '/care'") && routes.includes("path: '/size-guide'") && routes.includes("path: '/offers'") && routes.includes("path: '/search'"));
  const sm = rd('sitemap.xml');
  A('sitemap: 4 new urls, no /search', sm.includes('/occasions</loc>') && sm.includes('/care</loc>') && sm.includes('/size-guide</loc>') && sm.includes('/offers</loc>') && !sm.includes('/search</loc>'));
  const sh = rd('search.html');
  A('search page: noindex + canonical', sh.includes('noindex, follow') && sh.includes('rel="canonical" href="https://rosebymarry.com/search"'));
  const occ = rd('occasions.html');
  A('occasions: hreflang x4 + canonical', (occ.match(/hreflang="/g) || []).length === 4 && occ.includes('rel="canonical" href="https://rosebymarry.com/occasions"'));
}
/* 10) i18n trilingual key spot-check */
{
  const i = rd('assets/js/i18n.js');
  const langs = i.split('const STR').length;
  A('i18n: nav_occ present in all 3 langs', (i.match(/nav_occ:/g) || []).length === 3);
  A('i18n: off_copied present in all 3 langs', (i.match(/off_copied:/g) || []).length === 3);
}
function t0(k) { return k; }
console.log('\nplatform: ' + pass + ' pass / ' + fail + ' fail');
if (fail) process.exit(1);
