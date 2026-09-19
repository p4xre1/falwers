import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const P = path.join(ROOT, 'public');
let pass = 0, fail = 0;
function A(name, cond, extra) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name + (extra ? ' -> ' + extra : '')); } }
const pages = fs.readdirSync(P).filter(f => f.endsWith('.html'));
const adminPages = fs.readdirSync(path.join(P, 'admin')).filter(f => f.endsWith('.html'));
const idsOf = html => new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));

/* 1) every local href/src in every page resolves (relative to its own dir) */
let broken = [];
const idCache = new Map();
const idsOfFile = f => { if (!idCache.has(f)) { try { idCache.set(f, idsOf(fs.readFileSync(path.join(P, f), 'utf8'))); } catch (e) { idCache.set(f, new Set()); } } return idCache.get(f); };
for (const f of [...pages, ...adminPages.map(a => 'admin/' + a)]) {
  const html = fs.readFileSync(path.join(P, f), 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const r = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(r)) continue;
    const [target, anchor] = r.split('#');
    if (!target && anchor) { if (!idsOf(html).has(anchor)) broken.push(f + ' #' + anchor); continue; }
    const clean = target.split('?')[0];
    if (!clean) continue;
    const resolved = path.normalize(path.join(P, path.dirname(f), clean));
    if (!fs.existsSync(resolved)) broken.push(f + ' -> ' + r);
    else if (anchor) {
      const relTarget = path.relative(P, resolved);
      if (!idsOfFile(relTarget).has(anchor)) broken.push(f + ' -> ' + r + ' (no #' + anchor + ')');
    }
  }
}
A('scan: zero broken local links/anchors in ' + (pages.length + adminPages.length) + ' pages', broken.length === 0, broken.slice(0, 4).join(' | '));

/* 2) AI catalog + robots + llms refs resolve */
let aiBroken = [];
for (const f of ['mcp.json', 'ai-plugin.json', 'openapi.json', 'robots.txt', 'llms.txt', 'llms-full.txt', 'ai.txt']) {
  const src = fs.readFileSync(path.join(P, f), 'utf8');
  for (const m of src.matchAll(/https:\/\/rosebymarry\.com\/([a-z0-9.-]+\.(?:html|xml|txt|json))/g)) {
    if (!fs.existsSync(path.join(P, m[1]))) aiBroken.push(f + ' -> /' + m[1]);
  }
}
A('scan: AI catalogs/robots/llms refs all resolve', aiBroken.length === 0, aiBroken.join(' | '));

/* 3) i18n: every used key exists exactly 3 times (AR/FR/EN) */
const i18n = fs.readFileSync(path.join(P, 'assets/js/i18n.js'), 'utf8');
const keyCounts = {};
for (const m of i18n.matchAll(/[{,\n]\s*([a-z0-9_]+)\s*:/g)) keyCounts[m[1]] = (keyCounts[m[1]] || 0) + 1;
const bad = [];
for (const f of [...pages, ...adminPages.map(a => 'admin/' + a)]) {
  const html = fs.readFileSync(path.join(P, f), 'utf8');
  for (const m of html.matchAll(/data-i18n(?:-ph)?="([a-z0-9_]+)"/g)) if ((keyCounts[m[1]] || 0) !== 3) bad.push(f + ':' + m[1]);
}
for (const jf of ['assets/js/ui.js', 'assets/js/shop.js', 'assets/js/data.js', 'admin/assets/admin.js']) {
  const src = fs.readFileSync(path.join(P, jf), 'utf8');
  for (const m of src.matchAll(/\bt\('([a-z0-9_]+)'/g)) if ((keyCounts[m[1]] || 0) !== 3) bad.push(jf + ':' + m[1]);
}
A('scan: every used i18n key present x3', bad.length === 0, [...new Set(bad)].slice(0, 5).join(' | '));

/* 4) no duplicate-key collisions on names that changed meaning */
A('scan: promo badge vs promo code keys separate', (keyCounts.promo_t || 0) === 3 && (keyCounts.promo_code_t || 0) === 3);
A('scan: homepage occ_t x3 + occasions page occp keys x3', (keyCounts.occ_t || 0) === 3 && (keyCounts.occp_t || 0) === 3 && (keyCounts.occp_wed || 0) === 3);
A('scan: homepage heritage text intact', i18n.includes("occ_t:'تسوّقي حسب المناسبة'") && i18n.includes("occp_t:'هدايا حسب المناسبة'"));

/* 5) admin pages integrity */
const adminJs = fs.readFileSync(path.join(P, 'admin/assets/admin.js'), 'utf8');
const initIds = [...adminJs.matchAll(/^\s{2}([a-z]+): page[A-Za-z]+,?$/gm)].map(m => m[1]);
let adminBad = [];
for (const a of adminPages) {
  const html = fs.readFileSync(path.join(P, 'admin/' + a), 'utf8');
  const dp = (html.match(/data-admin-page="([a-z]+)"/) || [])[1];
  if (!dp || !initIds.includes(dp)) adminBad.push(a + ' (controller:' + dp + ')');
  if (!html.includes('id="pcModal"') || !html.includes('id="cfModal"')) adminBad.push(a + ' (modals)');
  if (!html.includes('assets/errbar.js')) adminBad.push(a + ' (errbar)');
  const inlines = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].filter(m => m[1].trim() && !m[1].includes('localStorage.getItem'));
  if (inlines.length) adminBad.push(a + ' (inline script!)');
}
A('scan: all 14 admin pages wired (controller+modals+errbar, zero inline scripts)', adminBad.length === 0, adminBad.join(' | '));

/* 6) storefront chrome mounts */
let chromeBad = [];
for (const f of pages) {
  const html = fs.readFileSync(path.join(P, f), 'utf8');
  if (!html.includes('id="siteHeader"') || !html.includes('id="siteFooter"') || !html.includes('id="toasts"')) chromeBad.push(f);
}
A('scan: header/footer/toasts mounts on all ' + pages.length + ' storefront pages', chromeBad.length === 0, chromeBad.join(','));

/* 7) sitemap product slugs == runtime slugify(fr) over catalog */
const dataJs = fs.readFileSync(path.join(P, 'assets/js/data.js'), 'utf8');
const sanitizeFn = dataJs.match(/function sanitize\([\s\S]*?\n\}/)[0];
const slugifyFn = dataJs.match(/function slugify\(t\) \{[\s\S]*?\n\}/)[0];
const slugify = new Function(sanitizeFn + slugifyFn + '; return slugify;')();
const frNames = dataJs.split('\n').filter(l => l.includes("cat: '") && l.includes("type: '")).map(l => (l.match(/fr: '([^']+)'/) || [])[1]).filter(Boolean);
const sm = fs.readFileSync(path.join(P, 'sitemap.xml'), 'utf8');
const smSlugs = [...sm.matchAll(/product\?id=([^<]+)/g)].map(m => m[1]);
const gen = frNames.map(n => slugify(n));
A('scan: sitemap product slugs == runtime slugify (' + gen.length + ' products)', gen.join() === smSlugs.join(), 'gen=' + gen.slice(0, 3).join() + ' sm=' + smSlugs.slice(0, 3).join());

/* 8) sitemap/ai-sitemap entries resolve + search excluded */
const asm = fs.readFileSync(path.join(P, 'ai-sitemap.xml'), 'utf8');
A('scan: sitemaps resolve, search/admin excluded', !sm.includes('/search') && !sm.includes('/admin') && !asm.includes('/admin') && !asm.includes('/search') && sm.includes('/occasions') && asm.includes('/offers'));

/* ---- round-2 guards ---- */
/* duplicate DOM ids per page */
let dupBad = [];
for (const f of [...pages, ...adminPages.map(a => 'admin/' + a)]) {
  const html = fs.readFileSync(path.join(P, f), 'utf8');
  const seen = new Set(); let d = false;
  for (const m of html.matchAll(/ id="([^"]+)"/g)) { if (seen.has(m[1])) d = true; seen.add(m[1]); }
  if (d) dupBad.push(f);
}
A('scan2: no duplicate DOM ids in 34 pages', dupBad.length === 0, dupBad.join(','));

/* SEO head matrix: noindex pages need no canonical/hreflang; indexable need canon+og+tw (+hreflang except dynamic templates) */
const NOINDEX = ['cart.html', 'checkout.html', 'wishlist.html', 'track.html', 'search.html', '404.html'];
const DYNAMIC = ['product.html', 'article.html'];
let seoBad = [];
for (const f of pages) {
  const html = fs.readFileSync(path.join(P, f), 'utf8');
  const ni = NOINDEX.includes(f);
  if (ni && !html.includes('noindex')) seoBad.push(f + ':noindex-missing');
  if (ni && html.includes('hreflang=')) seoBad.push(f + ':hreflang-on-noindex');
  if (!ni) {
    if (!/content="index, follow/.test(html)) seoBad.push(f + ':robots');
    if (!html.includes('rel="canonical"')) seoBad.push(f + ':canonical');
    if (!html.includes('og:title') || !html.includes('twitter:card')) seoBad.push(f + ':og/tw');
    if (!DYNAMIC.includes(f) && (html.match(/hreflang="/g) || []).length < 4) seoBad.push(f + ':hreflang');
  }
}
A('scan2: SEO head matrix correct on all 20 storefront pages', seoBad.length === 0, seoBad.join(' | '));

/* utility classes used by pages/JS must exist in CSS */
const cssAll = fs.readFileSync(path.join(P, 'assets/css/style.css'), 'utf8') + fs.readFileSync(path.join(P, 'admin/assets/admin.css'), 'utf8');
for (const must of ['pgrid', 'set-sub', 'art-fig', 'bl-del', 'promo-sec', 'rows-colors', 'q-hero', 'count-up']) {
  A('scan2: .' + must + ' styled', cssAll.includes('.' + must + '{') || cssAll.includes('.' + must + ' '));
}

/* admin.js relies on helpers from ui.js/data.js — both must be loaded by every admin page */
let loadBad = [];
for (const a of adminPages) {
  const html = fs.readFileSync(path.join(P, 'admin/' + a), 'utf8');
  if (!html.includes('assets/js/ui.js') || !html.includes('assets/js/data.js')) loadBad.push(a);
}
A('scan2: admin pages load ui.js + data.js (helper deps)', loadBad.length === 0, loadBad.join(','));

/* track page must be noindex (standing rule) */
A('scan2: track noindex meta', fs.readFileSync(path.join(P, 'track.html'), 'utf8').includes('content="noindex, nofollow"'));


/* ---- scroll-trap guards (round 3) ---- */
const admCss = fs.readFileSync(path.join(P, 'admin/assets/admin.css'), 'utf8');
A('scan3: admin panes reset min-height so overflow:auto engages', admCss.includes('.ad-body > *{min-height:0') && admCss.includes('.ad-main{min-height:0'));
A('scan3: narrow layout gives main pane the leftover row', admCss.includes('grid-template-rows:auto 1fr'));
const stCss = fs.readFileSync(path.join(P, 'assets/css/style.css'), 'utf8');
A('scan3: hidden welcome overlay cannot trap input', stCss.includes('.wel-ovl:not(.show){visibility:hidden;pointer-events:none}'));
A('scan3: no overflow:hidden on html/body', !/(^|})\s*(html|body)[^{]*\{[^}]*overflow:\s*hidden/.test(stCss));

console.log('\nscan: ' + pass + ' pass / ' + fail + ' fail');
if (fail) process.exit(1);
