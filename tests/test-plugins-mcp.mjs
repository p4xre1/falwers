import fs from 'fs';
import path from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = path.resolve(import.meta.dirname, '..');
let pass = 0, fail = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rd = p => fs.readFileSync(path.join(ROOT, 'public', p), 'utf8');
function A(name, cond) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name); } }

const BASE = {
  settings: { whatsapp: '212772966980', currency: 'DH', siteUrl: '', passHash: 's2:abc', freeShip: 500, builderUnit: 9, adminUser: 'marry', mcpToken: 'rbm_test1234ab', plugins: { welcome: true, proof: true, petals: true, waFloat: true, blog: true } },
  categories: [], products: [], colors: [], addons: [], builderTiers: [], zones: [], promoCodes: [], discounts: [], reviews: [], orders: [], articles: [], pageviews: {}, prodViews: {}
};
function adminDom(page, overrides = {}) {
  const seed = JSON.parse(JSON.stringify(BASE));
  Object.assign(seed, overrides.state || {});
  if (overrides.settings) seed.settings = Object.assign(seed.settings, overrides.settings);
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => { if (!/not implemented|Could not load/i.test(String(e))) errs.push(String(e).slice(0, 150)); });
  const html = rd('admin/' + page);
  const dom = new JSDOM(html, { url: 'http://localhost:8080/admin/' + page, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.localStorage.setItem('rbm_v2_state', JSON.stringify(seed)); w.sessionStorage.setItem('rbm_admin', '1'); w.sessionStorage.setItem('rbm_admin_ts', String(Date.now())); } });
  return { dom, w: dom.window, d: dom.window.document, errs };
}
async function login(w, d) {
  d.getElementById('pcUser').value = 'marry';
  d.getElementById('pcInput').value = '1234';
  await sleep(1300);
  d.getElementById('pcGo').click();
  await sleep(300);
}

/* 1-3: admin 13 tabs across new pages, no errors */
for (const pg of ['plugins.html', 'mcp.html']) {
  const { d, errs } = adminDom(pg);
  await sleep(900);
  A(pg + ': renders unlocked', !d.body.classList.contains('gated'));
  A(pg + ': 15 nav tabs', d.querySelectorAll('#adSide .ad-tab').length === 15);
  A(pg + ': zero inline scripts', !Array.from(d.querySelectorAll('script')).some(s => !s.src && s.textContent.trim()));
  A(pg + ': no runtime errors', errs.length === 0);
}

/* plugins toggle -> persist -> storefront gating */
{
  const { w, d, errs } = adminDom('plugins.html');
  await sleep(900);
  A('plugins: 5 toggles rendered', d.querySelectorAll('#plgList input[type=checkbox]').length === 5);
  d.getElementById('plg_petals').checked = false;
  d.getElementById('plg_welcome').checked = false;
  d.getElementById('plgSave').click();
  await sleep(900);
  const st = JSON.parse(w.localStorage.getItem('rbm_v2_state'));
  A('plugins: persisted petals=false', st.settings.plugins.petals === false);
  A('plugins: persisted welcome=false', st.settings.plugins.welcome === false);
  A('plugins: proof still true', st.settings.plugins.proof === true);
  A('plugins: no runtime errors', errs.length === 0);
  w.close();
  /* storefront honors it */
  const seed = JSON.parse(JSON.stringify(BASE));
  seed.settings.plugins = { welcome: false, proof: true, petals: false, waFloat: false, blog: false };
  const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
  const sdom = new JSDOM(rd('index.html'), { url: 'http://localhost:8080/index.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w2) { w2.localStorage.setItem('rbm_v2_state', JSON.stringify(seed)); } });
  await sleep(1600);
  const sd = sdom.window.document;
  A('plugins: storefront hides petals', !sd.querySelector('#petals .petal'));
  A('plugins: storefront hides welcome modal', !sd.querySelector('#welModal'));
  A('plugins: nav rendered sanity', sd.querySelectorAll('nav a').length > 3);
  A('plugins: storefront hides blog nav link', !sd.querySelector('nav a[href*="blog.html"]'));
  sdom.window.close();
  /* default (all on): petals + blog link present */
  const vc2 = new VirtualConsole(); vc2.on('jsdomError', () => {});
  const sdom2 = new JSDOM(rd('index.html'), { url: 'http://localhost:8080/index.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc2, beforeParse(w3) { w3.localStorage.setItem('rbm_v2_state', JSON.stringify(JSON.parse(JSON.stringify(BASE)))); } });
  await sleep(1600);
  const sd2 = sdom2.window.document;
  A('plugins: default petals on', sd2.querySelectorAll('#petals .petal').length > 0);
  A('plugins: default blog link on', !!sd2.querySelector('nav a[href*="blog.html"]'));
  sdom2.window.close();
}

/* MCP page: token masked, reveal, regen */
{
  const { w, d, errs } = adminDom('mcp.html');
  await sleep(900);
  const tv = d.getElementById('mcpTokenView');
  A('mcp: token masked by default', tv.value.includes('\u2022') && !tv.value.includes('test1234ab'));
  d.getElementById('mcpReveal').click();
  A('mcp: reveal shows full token', tv.value === 'rbm_test1234ab');
  d.getElementById('mcpRegen').click();
  await sleep(600);
  const st = JSON.parse(w.localStorage.getItem('rbm_v2_state'));
  A('mcp: regen persists new token', /^rbm_[a-z0-9]+$/.test(st.settings.mcpToken) && st.settings.mcpToken !== 'rbm_test1234ab');
  A('mcp: 5 endpoints listed', d.querySelectorAll('#mcpEps .seo-row').length === 5);
  A('mcp: no runtime errors', errs.length === 0);
  w.close();
}

/* settings: username + security snapshot */
{
  const { w, d, errs } = adminDom('settings.html', { settings: { lastLogin: 1758000000000, failCount: 2 } });
  await sleep(900);
  A('settings: username prefilled', d.getElementById('set_user').value === 'marry');
  A('settings: failCount shown', d.getElementById('secFails').textContent === '2');
  d.getElementById('set_user').value = 'Salma';
  d.getElementById('setSave').click();
  await sleep(900);
  const st = JSON.parse(w.localStorage.getItem('rbm_v2_state'));
  A('settings: username saved lowercase', st.settings.adminUser === 'salma');
  A('settings: no runtime errors', errs.length === 0);
  w.close();
}

/* article: image + FAQ render + FAQPage schema */
{
  const seed = JSON.parse(JSON.stringify(BASE));
  seed.articles = [{
    id: 'a1', slug: 'rose-care', title: { ar: '\u0627\u0644\u0639\u0646\u0627\u064a\u0629 \u0628\u0627\u0644\u0648\u0631\u0648\u062f', fr: 'Soins', en: 'Care' },
    desc: { ar: '\u062f\u0644\u064a\u0644 \u0627\u0644\u0639\u0646\u0627\u064a\u0629 \u0628\u0627\u0644\u0648\u0631\u0648\u062f \u0627\u0644\u0635\u0646\u0627\u0639\u064a\u0629 \u0641\u064a \u0637\u0646\u062c\u0629 \u062e\u0644\u0627\u0635\u0629 \u0643\u0627\u0641\u064a\u0629 \u0644\u0644\u0648\u0635\u0641 \u0627\u0644\u0633\u064a\u0648 \u0627\u0644\u062e\u0627\u0635 \u0628\u0627\u0644\u0645\u0642\u0627\u0644 \u0627\u0644\u062d\u0635\u0631\u064a \u0641\u064a \u0645\u062a\u062c\u0631 \u0631\u0648\u0632 \u0628\u0627\u064a \u0645\u0627\u0631\u064a \u0627\u0644\u0631\u0627\u0626\u062f', fr: '', en: '' },
    body: { ar: '<p>\u0627\u0644\u0648\u0631\u0648\u062f \u0627\u0644\u0635\u0646\u0627\u0639\u064a\u0629 \u062a\u062d\u062a\u0627\u062c \u0639\u0646\u0627\u064a\u0629 \u0628\u0633\u064a\u0637\u0629 \u0648\u062e\u0627\u0635\u0629 \u0641\u064a \u0645\u062f\u064a\u0646\u0629 \u0637\u0646\u062c\u0629 \u062d\u064a\u062b \u0627\u0644\u0631\u0637\u0648\u0628\u0629 \u0645\u0639\u062a\u062f\u0644\u0629 \u0648\u0627\u0644\u062a\u0641\u0627\u0641 \u0627\u0644\u0648\u0631\u0648\u062f \u064a\u0628\u0642\u0649 \u062c\u0645\u064a\u0644\u0627 \u0633\u0646\u0629 \u0643\u0627\u0645\u0644\u0629 \u0648\u0623\u0643\u062b\u0631 \u0645\u0639 \u062a\u0646\u0638\u064a\u0641 \u0628\u0627\u0644\u0647\u0648\u0627\u0621 \u0648\u062a\u062c\u0646\u0628 \u0627\u0644\u0634\u0645\u0633 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0648\u0627\u0644\u0631\u0637\u0648\u0628\u0629 \u0627\u0644\u0639\u0627\u0644\u064a\u0629</p>', fr: '', en: '' },
    tags: ['\u0639\u0646\u0627\u064a\u0629'], keyword: '\u0639\u0646\u0627\u064a\u0629 \u0627\u0644\u0648\u0631\u0648\u062f', ts: 1758000000000, published: true, views: 0,
    faq: [{ q: '\u0643\u0645 \u062a\u0628\u0642\u0649 \u0627\u0644\u0648\u0631\u062f\u0629\u061f', a: '\u0633\u0646\u0629 \u0643\u0627\u0645\u0644\u0629.' }, { q: '\u0647\u0644 \u062a\u062d\u062a\u0627\u062c \u0645\u0627\u0621\u061f', a: '\u0644\u0627.' }],
    image: { url: 'img/editorial-blush.jpg', alt: '\u0648\u0631\u0648\u062f \u0633\u0627\u062a\u0627\u0646' }
  }];
  const vc = new VirtualConsole(); const errs = [];
  vc.on('jsdomError', e => { if (!/not implemented|Could not load/i.test(String(e))) errs.push(String(e).slice(0, 150)); });
  const dom = new JSDOM(rd('article.html'), { url: 'http://localhost:8080/article.html?id=rose-care', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.localStorage.setItem('rbm_v2_state', JSON.stringify(seed)); } });
  await sleep(1400);
  const d = dom.window.document;
  A('article: figure rendered', !!d.querySelector('.art-fig img'));
  A('article: img has alt + lazy', d.querySelector('.art-fig img').getAttribute('alt') === '\u0648\u0631\u0648\u062f \u0633\u0627\u062a\u0627\u0646' && d.querySelector('.art-fig img').getAttribute('loading') === 'lazy');
  A('article: 2 FAQ details', d.querySelectorAll('details.faq-item').length === 2);
  const lds = Array.from(d.querySelectorAll('script[type="application/ld+json"]')).map(s => { try { return JSON.parse(s.textContent); } catch (e) { return null; } });
  A('article: FAQPage JSON-LD present', lds.some(x => x && x['@type'] === 'FAQPage' && x.mainEntity.length === 2));
  const bp = lds.find(x => x && x['@type'] === 'BlogPosting');
  A('article: BlogPosting has image array', !!bp && Array.isArray(bp.image) && bp.image[0].indexOf('https://') === 0);
  A('article: no runtime errors', errs.length === 0);
  dom.window.close();
}

/* blog admin: bulk import 2 articles */
{
  const { w, d, errs } = adminDom('blog.html');
  await sleep(1600);
  const bulk = 'title: \u0645\u0642\u0627\u0644 \u0623\u0648\u0644 \u0627\u0644\u062a\u062c\u0631\u064a\u064a\ndesc: \u0648\u0635\u0641 \u0643\u0627\u0641\u064a \u0644\u0644\u0645\u0642\u0627\u0644 \u0627\u0644\u0623\u0648\u0644 \u0645\u0646 \u0627\u0644\u0645\u062f\u0648\u0646\u0629 \u0627\u0644\u062e\u0627\u0635\u0629 \u0628\u0648\u0631\u0634\u0629 \u0627\u0644\u0648\u0631\u0648\u062f \u0641\u064a \u0645\u062f\u064a\u0646\u0629 \u0637\u0646\u062c\u0629 \u0627\u0644\u062c\u0645\u064a\u0644\u0629\nkw: \u0648\u0631\u0648\u062f \u0637\u0646\u062c\u0629\nfaq: \u0633 \u0623\u0648\u0644 :: \u062c \u0623\u0648\u0644 ;; \u0633 \u062b\u0627\u0646\u064a :: \u062c \u062b\u0627\u0646\u064a\n\u0641\u0642\u0631\u0629 \u0623\u0648\u0644\u0649 \u062a\u062d\u062a\u0648\u064a \u0639\u0644\u0649 \u0645\u062d\u062a\u0648\u0649 \u0643\u0627\u0641\u064d \u0644\u0644\u0645\u0642\u0627\u0644 \u0648\u064a\u062a\u0643\u0631\u0631 \u0641\u064a\u0647 \u0630\u0643\u0631 \u0648\u0631\u0648\u062f \u0637\u0646\u062c\u0629 \u0627\u0644\u0623\u0635\u064a\u0644\u0629 \u0648\u062d\u0631\u0641\u064a\u0629 \u0627\u0644\u0635\u0646\u0639\n---\ntitle: \u0645\u0642\u0627\u0644 \u062b\u0627\u0646\u064d \u0644\u0644\u062a\u062c\u0631\u0628\u0629\ndesc: \u0648\u0635\u0641 \u0627\u0644\u0645\u0642\u0627\u0644 \u0627\u0644\u062b\u0627\u0646\u064a \u0627\u0644\u0630\u064a \u064a\u062d\u062a\u0648\u064a \u0639\u0644\u0649 \u0648\u0635\u0641 \u0645\u0641\u0635\u0644 \u0644\u0644\u0648\u0631\u0648\u062f \u0627\u0644\u0645\u0635\u0646\u0648\u0639\u0629 \u0641\u064a \u0645\u062f\u064a\u0646\u0629 \u0637\u0646\u062c\u0629 \u0627\u0644\u0634\u0627\u0645\u062e\u0629\n\u0641\u0642\u0631\u0629 \u0627\u0644\u0645\u0642\u0627\u0644 \u0627\u0644\u062b\u0627\u0646\u064a \u0627\u0644\u062a\u064a \u062a\u0634\u0631\u062d \u0639\u0645\u0644\u064a\u0629 \u0635\u0646\u0639 \u0627\u0644\u0648\u0631\u0648\u062f \u0627\u0644\u0633\u0627\u062a\u0627\u0646 \u0628\u0627\u0644\u064a\u062f \u0641\u064a \u0648\u0631\u0634\u062a\u0646\u0627 \u0628\u0637\u0646\u062c\u0629 \u0645\u0639 \u0623\u0641\u0636\u0644 \u0627\u0644\u062e\u0627\u0645\u0627\u062a';
  d.getElementById('bl_bulk').value = bulk;
  d.getElementById('blBulkGo').click();
  await sleep(1400);
  const st = JSON.parse(w.localStorage.getItem('rbm_v2_state'));
  A('bulk: 2 articles created (3 seeded + 2)', (st.articles || []).length === 5);
  const a1 = (st.articles || []).find(x => /6296|61|6199|\u0623\u0648\u0644/.test(x.title.ar)) || st.articles[1];
  const faqArt = (st.articles || []).find(x => x.faq && x.faq.length === 2);
  A('bulk: faq parsed (:: and ;;)', !!faqArt);
  A('bulk: slugs clean (no spaces/punct)', (st.articles || []).every(x => /^[\w\u0600-\u06FF-]+$/.test(x.slug)));
  A('bulk: newest first', /\u062b\u0627\u0646/.test((st.articles || [])[0].title.ar));
  A('bulk: keyword kept', (st.articles || [])[1].keyword === '\u0648\u0631\u0648\u062f \u0637\u0646\u062c\u0629' || (st.articles || [])[0].keyword === '\u0648\u0631\u0648\u062f \u0637\u0646\u062c\u0629');
  A('bulk: no runtime errors', errs.length === 0);
  w.close();
}

/* 13 tabs also on an original page */
{
  const { d } = adminDom('index.html');
  await sleep(900);
  A('index: 15 tabs', d.querySelectorAll('#adSide .ad-tab').length === 15);
}

console.log('\nplugins-mcp: ' + pass + ' pass / ' + fail + ' fail');
if (fail) process.exit(1);
