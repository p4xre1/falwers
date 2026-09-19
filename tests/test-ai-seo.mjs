/* AI/SEO discovery layer — files, generators and the two UIs that index them.
   Guards the bugs found in this area: crashing generators, duplicated head tags,
   stale facts baked into llms-full.txt / JSON-LD, and dead manifest links. */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = path.resolve(import.meta.dirname, '..');
const P = path.join(ROOT, 'public');
let pass = 0, fail = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rd = p => fs.readFileSync(path.join(P, p), 'utf8');
function A(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' -> ' + extra : '')); } }

/* ---------- 1) every advertised file exists and is well-formed ---------- */
const FILES = ['llms.txt', 'llms-full.txt', 'ai.txt', 'robots.txt', 'sitemap.xml', 'ai-sitemap.xml',
  'mcp.json', 'ai-plugin.json', 'openapi.json', '.well-known/ai-plugin.json', '.well-known/openapi.json', 'ai.html'];
for (const f of FILES) A('exists: /' + f, fs.existsSync(path.join(P, f)));
for (const f of FILES.filter(x => x.endsWith('.json'))) {
  let ok = true; try { JSON.parse(rd(f)); } catch (e) { ok = false; }
  A('valid JSON: /' + f, ok);
}
for (const f of ['sitemap.xml', 'ai-sitemap.xml']) {
  const s = rd(f);
  A('valid XML shape: /' + f, s.startsWith('<?xml') && s.includes('<urlset') && s.trim().endsWith('</urlset>'));
}

/* ---------- 2) .well-known mirrors the root copies ---------- */
{
  /* byte-identical copies: hosts that drop dot-directories still serve the root ones */
  A('ai-plugin copies byte-identical', rd('ai-plugin.json') === rd('.well-known/ai-plugin.json'));
  A('openapi copies byte-identical', rd('openapi.json') === rd('.well-known/openapi.json'));
  const root = JSON.parse(rd('ai-plugin.json'));
  A('ai-plugin points at a copy that always exists (root openapi.json)', root.api.url.endsWith('/openapi.json') && !root.api.url.includes('/.well-known/'));
  A('_redirects keeps /.well-known/* alive if dotfiles are dropped',
    rd('_redirects').includes('/.well-known/ai-plugin.json /ai-plugin.json 200') && rd('_redirects').includes('/.well-known/openapi.json /openapi.json 200'));
}

/* ---------- 3) no manifest/robots/llms link is dead ---------- */
{
  const broken = [];
  for (const f of ['mcp.json', 'ai-plugin.json', 'openapi.json', '.well-known/ai-plugin.json', '.well-known/openapi.json', 'robots.txt', 'llms.txt', 'llms-full.txt', 'ai.txt']) {
    for (const m of rd(f).matchAll(/https:\/\/rosebymarry\.com\/([A-Za-z0-9._/-]+\.(?:html|xml|txt|json))/g)) {
      if (!fs.existsSync(path.join(P, m[1]))) broken.push(f + ' -> /' + m[1]);
    }
  }
  A('no dead links in AI manifests', broken.length === 0, broken.join(' | '));
}

/* ---------- 4) published facts match the live catalog ---------- */
{
  const { loadCatalog } = await import('../scripts/load-catalog.mjs');
  const { S } = loadCatalog();
  const data = rd('assets/js/data.js');
  const wa = String(S.settings.whatsapp);
  const colors = S.colors.map(c => c.en);
  const full = rd('llms-full.txt'), llms = rd('llms.txt'), ai = rd('ai.txt');
  A('llms-full: real WhatsApp number', full.includes('+' + wa) && !full.includes('212612345678'));
  A('ai.txt: real WhatsApp number', ai.includes('+' + wa));
  A('llms-full: every catalog color listed (' + colors.length + ')', colors.every(c => full.includes(c)), colors.filter(c => !full.includes(c)).join(','));
  A('llms.txt: color count matches catalog', llms.includes(colors.length + ' satin colors'));
  A('llms.txt: Tangier-only rule stated', /inside Tangier only/.test(llms) && /never nationwide/i.test(llms));
  /* price range must bracket the real catalog */
  const prices = S.products.filter(p => p.active).map(p => p.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  A('llms.txt: price range matches catalog', llms.includes(`Prices ${lo}\u2013${hi} MAD`), `${lo}-${hi}`);
}

/* ---------- 5) generators are runnable + idempotent (no silent drift) ---------- */
{
  /* key by full relative path — '.well-known/openapi.json' must not collide with 'openapi.json' */
  const snap = () => FILES.filter(f => !f.endsWith('.html')).map(f => f + '\u0000' + rd(f)).join('\u0001');
  const before = snap();
  let crashed = '';
  try {
    execFileSync('node', [path.join(ROOT, 'scripts/generate-llms-enhanced.mjs')], { encoding: 'utf8' });
    execFileSync('node', [path.join(ROOT, 'scripts/optimize-ai-seo.mjs')], { encoding: 'utf8' });
  } catch (e) { crashed = String(e.message || e).slice(0, 200); }
  A('generators run without crashing', !crashed, crashed);
  A('generators are idempotent (no drift on re-run)', snap() === before);
  /* head injection must not duplicate blocks in hand-authored pages */
  const dup = [];
  for (const f of fs.readdirSync(P).filter(x => x.endsWith('.html'))) {
    const h = rd(f);
    if ((h.match(/rel="canonical"/g) || []).length > 1) dup.push(f + ':canonical');
    if ((h.match(/name="geo\.region"/g) || []).length > 1) dup.push(f + ':geo');
    if ((h.match(/"@type":\s*"Store"/g) || []).length > 1) dup.push(f + ':store-ld');
  }
  A('no duplicated SEO head blocks after regeneration', dup.length === 0, dup.join(' | '));
  /* injected JSON-LD must carry live facts, not the old placeholder number */
  const stale = fs.readdirSync(P).filter(x => x.endsWith('.html')).filter(f => rd(f).includes('212612345678'));
  A('no stale phone number in injected JSON-LD', stale.length === 0, stale.join(','));
}

/* ---------- 6) ai-sitemap stays a curated short list ---------- */
{
  const sm = rd('ai-sitemap.xml');
  const n = (sm.match(/<url>/g) || []).length;
  A('ai-sitemap: 12 curated urls', n === 12, String(n));
  A('ai-sitemap: excludes admin/cart/checkout/search/product permalinks',
    !/\/admin|\/cart|\/checkout|\/search|product\?id=/.test(sm));
  A('sitemap.xml: includes /ai but ai-sitemap does not', rd('sitemap.xml').includes('/ai</loc>') && !sm.includes('/ai</loc>'));
}

/* ---------- 7) public /ai page renders the whole layer ---------- */
{
  const vc = new VirtualConsole(); const errs = [];
  vc.on('jsdomError', e => { if (!/not implemented|Could not load/i.test(String(e))) errs.push(String(e).slice(0, 160)); });
  const dom = new JSDOM(rd('ai.html'), { url: 'http://localhost:8080/ai.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
  await sleep(1800);
  const d = dom.window.document;
  const cards = d.querySelectorAll('#aiFiles .care-card');
  A('/ai: 9 file cards in 4 groups', cards.length === 9 && d.querySelectorAll('#aiFiles h2').length === 4, cards.length + '/' + d.querySelectorAll('#aiFiles h2').length);
  A('/ai: no raw i18n keys leaked', !/aip_[a-z]/.test(d.body.textContent));
  A('/ai: chrome mounted', !!d.querySelector('#siteHeader .main-nav') && !!d.querySelector('#siteFooter .foot-grid'));
  A('/ai: footer links to itself', !!d.querySelector('#siteFooter a[href="ai.html"]'));
  const hrefs = [...d.querySelectorAll('#aiFiles a')].map(a => a.getAttribute('href').replace(/^\.\//, ''));
  A('/ai: every listed file resolves on disk', hrefs.every(h => fs.existsSync(path.join(P, h))), hrefs.filter(h => !fs.existsSync(path.join(P, h))).join(','));
  A('/ai: no runtime errors', errs.length === 0, errs.join('|'));
  dom.window.close();
}

/* ---------- 8) admin AI & SEO tab ---------- */
{
  const seed = { settings: { whatsapp: '212772966980', currency: 'DH', siteUrl: 'https://rosebymarry.com', passHash: 's2:abc', freeShip: 500, builderUnit: 9, adminUser: 'marry', mcpToken: 'rbm_t', plugins: {} }, categories: [], products: [], colors: [], addons: [], builderTiers: [], zones: [], promoCodes: [], discounts: [], reviews: [], orders: [], articles: [], pageviews: {}, prodViews: {} };
  const vc = new VirtualConsole(); const errs = [];
  vc.on('jsdomError', e => { if (!/not implemented|Could not load/i.test(String(e))) errs.push(String(e).slice(0, 160)); });
  const dom = new JSDOM(rd('admin/ai-seo.html'), { url: 'http://localhost:8080/admin/ai-seo.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.localStorage.setItem('rbm_v2_state', JSON.stringify(seed)); w.sessionStorage.setItem('rbm_admin', '1'); w.sessionStorage.setItem('rbm_admin_ts', String(Date.now())); } });
  await sleep(1500);
  const d = dom.window.document;
  A('admin ai-seo: unlocked', !d.body.classList.contains('gated'));
  A('admin ai-seo: 15 nav tabs', d.querySelectorAll('#adSide .ad-tab').length === 15);
  A('admin ai-seo: tab is active', (d.querySelector('#adSide .ad-tab.act') || {}).dataset?.nav === 'aiseo');
  A('admin ai-seo: 10 rows listed', d.querySelectorAll('#aiSeoList .seo-row').length === 10);
  const hrefs = [...d.querySelectorAll('#aiSeoList a')].map(a => a.getAttribute('href').replace(/^\.\.\//, ''));
  A('admin ai-seo: every row resolves on disk', hrefs.every(h => fs.existsSync(path.join(P, h))), hrefs.filter(h => !fs.existsSync(path.join(P, h))).join(','));
  A('admin ai-seo: no raw i18n keys', !/aiadm_[a-z]|aip_[a-z]/.test(d.body.textContent));
  A('admin ai-seo: no runtime errors', errs.length === 0, errs.join('|'));
  dom.window.close();
}

/* ---------- 9) page metadata registry covers every route ---------- */
{
  const { ROUTES } = await import('../src/routes/routes.js');
  const { PAGES } = await import('../src/pages/index.js');
  const missing = [...new Set(ROUTES.map(r => r.page))].filter(p => !PAGES[p]);
  A('every route has page metadata (generators cannot crash)', missing.length === 0, missing.join(','));
  const incomplete = Object.entries(PAGES).filter(([, m]) => !m.title?.ar || !m.title?.fr || !m.title?.en || !m.description?.en).map(([k]) => k);
  A('every page metadata is trilingual', incomplete.length === 0, incomplete.join(','));
}

console.log('\nai-seo: ' + pass + ' pass / ' + fail + ' fail');
if (fail) process.exit(1);
