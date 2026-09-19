/* Regression test for two live bugs on /product?id=bouquet-amour
   1. raw code printed on the page  — starsHTML()/heartSvg were handed to el() as
      strings, so the browser showed `<span class="stars" …>` and `<svg viewBox=…>`
      as literal text next to the price / on the wishlist button.
   2. page could not scroll (PC + phone) — the canonical slug URL resolved to
      nothing on a fresh browser (defaults were never migrated, so products had no
      slug), leaving a one-line page shorter than the viewport; on top of that
      `body{overflow-x:hidden}` turned <body> into a competing scroll container.
   Self-contained: inlines the local JS (no server, no network). */
import fs from 'fs';
import path from 'path';
import pkg from 'jsdom';
import { fileURLToPath } from 'node:url';
const { JSDOM, VirtualConsole } = pkg;
const PUB = fileURLToPath(new URL('../public', import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const A = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n); if (!c) process.exitCode = 1; };

async function boot(page, query, seed) {
  let html = fs.readFileSync(path.join(PUB, page), 'utf8');
  html = html.replace(/<link[^>]+href="https?:[^"]+"[^>]*>/gi, '');
  html = html.replace(/<script[^>]+src="https?:[^"]+"[^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]+src="([^"]+)"[^>]*><\/script>/gi, (m, src) => {
    const local = path.join(PUB, src.split('?')[0]);
    return fs.existsSync(local) ? '<script>' + fs.readFileSync(local, 'utf8') + '</script>' : '';
  });
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { const s = String((e && e.message) || e); if (!/Could not load|not implemented/i.test(s)) errs.push(s); });
  const dom = new JSDOM(html, {
    url: 'https://rose-by-marry.pages.dev/' + page.replace(/\.html$/, '') + (query || ''),
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { if (seed) w.localStorage.setItem('rbm_v2_state', JSON.stringify(seed)); }
  });
  await sleep(600);
  return { w: dom.window, d: dom.window.document, errs };
}

/* text nodes that contain markup = code the visitor can read on screen */
function leaks(d) {
  const out = [];
  const walker = d.createTreeWalker(d.body, 4);
  let n;
  while ((n = walker.nextNode())) {
    const tag = n.parentElement && n.parentElement.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') continue;
    const t = n.nodeValue || '';
    if (/<\/?(svg|span|div|button|path|rect|circle|g|a|p|code)\b/i.test(t) || /viewBox=|stroke-width=|aria-hidden=/.test(t)) out.push(t.trim().slice(0, 120));
  }
  return out;
}

/* ---------- 1. canonical slug URL renders the product for a FIRST-TIME visitor ---------- */
{
  const { d, errs } = await boot('product.html', '?id=bouquet-amour');
  const root = d.getElementById('pdRoot');
  A('fresh browser: no JS errors', errs.length === 0);
  A('fresh browser: /product?id=bouquet-amour renders the product (not "no results")',
    !!root.querySelector('h1') && !/لا توجد نتائج|No matching|Aucun résultat/i.test(root.textContent));
  A('fresh browser: page has real product content (buy row + swatches + tabs)',
    !!root.querySelector('#pdAddCart') && root.querySelectorAll('#pdColors .sw').length > 1 && root.querySelectorAll('.tab-btn').length === 2);
  A('fresh browser: defaults carry slugs', typeof d.defaultView.S.products[0].slug === 'string' && d.defaultView.S.products[0].slug.length > 0);
}

/* ---------- 2. no raw code anywhere on the product page ---------- */
{
  const seed = { reviews: [{ id: 'r1', pid: 'amour', name: 'Salma B.', rating: 5, text: 'Magnifique !', ts: Date.now() - 86400000 }] };
  const { d } = await boot('product.html', '?id=bouquet-amour', seed);
  const L = leaks(d);
  A('no markup leaks as visible text (was: <span class="stars"> + <svg viewBox=…>)', L.length === 0);
  if (L.length) console.log('       leaked: ' + L.join(' || '));
  const stars = d.querySelector('.pd-info .pc-rate span.stars');
  A('rating renders as a real <span class="stars"> element', !!stars && /^[✦✧]{5}$/.test(stars.textContent));
  A('rating text next to stars is clean', !/</.test(d.querySelector('.pc-rate').textContent));
  const hb = d.querySelector('.pd-buy button.icon-heart');
  A('wishlist button holds a real <svg> icon (not printed code)', !!hb && !!hb.querySelector('svg path') && !/</.test(hb.textContent));
  const rev = d.querySelector('#revList .rev .rh');
  A('review stars render as an element', !!rev && !!rev.querySelector('span.stars') && !/</.test(rev.textContent));
  A('review stars reflect the rating', !!rev && rev.querySelector('span.stars').textContent === '✦✦✦✦✦');
}

/* ---------- 3. other pages stay clean (home testimonials use the same widget) ---------- */
{
  for (const [pg, q] of [['index.html', ''], ['shop.html', ''], ['cart.html', ''], ['wishlist.html', '']]) {
    const { d } = await boot(pg, q);
    A('no markup leaks on ' + pg, leaks(d).length === 0);
  }
}

/* ---------- 3b. el() itself refuses to print markup as text (the guard) ---------- */
{
  const { w, d } = await boot('product.html', '?id=bouquet-amour');
  const probe = w.eval("(() => { const n = el('div', {}, '<span class=\"stars\">✦✦✦✦✦</span>', 'plain'); return n.innerHTML + '|' + n.textContent; })()");
  A('el() turns a trusted HTML string child into an element', probe.startsWith('<span class="stars">'));
  A('el() keeps plain text as text', probe.endsWith('|✦✦✦✦✦plain'));
  const xss = w.eval("(() => { const n = el('div', {}, '<img src=x onerror=alert(1)>'); return n.children.length + ':' + n.textContent; })()");
  A('el() does NOT parse non-allow-listed markup (no XSS sink)', xss.startsWith('0:'));
}

/* ---------- 4. slug/id resolution is forgiving ---------- */
{
  const { w } = await boot('product.html', '?id=bouquet-amour');
  A('prodBySlug(slug) resolves', w.prodBySlug('bouquet-amour') && w.prodBySlug('bouquet-amour').id === 'amour');
  A('prodBySlug(id) still resolves', w.prodBySlug('amour') && w.prodBySlug('amour').id === 'amour');
  A('prodBySlug is case-insensitive', !!w.prodBySlug('BOUQUET-AMOUR'));
  A('prodBySlug(unknown) is null', w.prodBySlug('nope-nothing') === null);
  A('LINKS.product uses the canonical slug', w.LINKS.product(w.S.products[0]) === 'product.html?id=bouquet-amour');
}

/* ---------- 5. a missing product is never a dead end (page must stay scrollable) ---------- */
{
  const { d } = await boot('product.html', '?id=does-not-exist');
  const root = d.getElementById('pdRoot');
  A('unknown id: explains + offers a way back to the shop', root.querySelectorAll('.pd-missing-actions a').length >= 2
    && [...root.querySelectorAll('.pd-missing-actions a')].some(a => a.getAttribute('href') === 'shop.html'));
  A('unknown id: fills the page with picks (never a 1-line screen)', root.querySelectorAll('.pcard').length >= 3);
  A('unknown id: picks contain no leaked code', leaks(d).length === 0);
}

/* ---------- 6. CSS: one scroller (the viewport), no input-eating layers ---------- */
{
  const css = fs.readFileSync(path.join(PUB, 'assets/css/style.css'), 'utf8');
  /* tiny scanner: declarations from TOP-LEVEL rules only (so the @supports
     fallback inside a nested block cannot shadow the real rule) */
  const cssClean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const topRules = (() => {
    const out = []; let depth = 0, sel = '', body = '';
    for (let k = 0; k < cssClean.length; k++) {
      const c = cssClean[k];
      if (c === '{') { if (depth === 0) { sel = body.trim(); body = ''; } depth++; continue; }
      if (c === '}') { depth--; if (depth === 0) { out.push({ sel, body }); body = ''; sel = ''; } continue; }
      body += c;
    }
    return out;
  })();
  const decl = (selector, prop) => {
    let v = null;
    for (const r of topRules) {
      if (r.sel.split(',').map(x => x.trim()).indexOf(selector) < 0) continue;
      const hit = r.body.split(';').map(x => x.trim()).find(x => x.startsWith(prop + ':'));
      if (hit) v = hit.slice(prop.length + 1).trim();
    }
    return v;
  };
  /* brace-aware extraction of every @supports fallback block (nested rules inside) */
  const atBlocks = header => {
    const out = [];
    let i = 0;
    while ((i = css.indexOf(header, i)) >= 0) {
      const k = css.indexOf('{', i);
      let depth = 0, end = k;
      for (; end < css.length; end++) { if (css[end] === '{') depth++; else if (css[end] === '}' && --depth === 0) break; }
      out.push(css.slice(k + 1, end));
      i = end + 1;
    }
    return out.join('\n');
  };
  const fallbacks = atBlocks('@supports not (overflow:clip)');
  A('body no longer creates a scroll container (overflow-x:clip, not hidden)', decl('body', 'overflow-x') === 'clip');
  A('body vertical overflow stays visible (no nested scroller)', decl('body', 'overflow-y') === 'visible');
  A('html is the one scroller (overflow-y:auto)', decl('html', 'overflow-y') === 'auto');
  A('html keeps the horizontal-drift guard (overflow-x:clip)', decl('html', 'overflow-x') === 'clip');
  A('legacy fallback keeps the horizontal guard on html + body', /html\{overflow-x:hidden\}/.test(fallbacks) && /body\{overflow-x:hidden\}/.test(fallbacks));
  A('fixed background disabled for touch devices (iOS/Android scroll jank)', /@media \(hover:none\),\(pointer:coarse\)\s*{[\s\S]{0,200}background-attachment:scroll/.test(css));
  A('inactive overlays cannot eat input', /\.mbk:not\(\.open\),\.wel-ovl:not\(\.show\)[^{]*\{[^}]*pointer-events:none/.test(css));
  A('petal layer is click/touch-transparent', /#petals\{[^}]*pointer-events:none/.test(css));
  A('main content never shorter than the viewport', /main\.wrap\{[^}]*min-height:70vh/.test(css));
  const htmlFiles = fs.readdirSync(PUB).filter(f => f.endsWith('.html'))
    .concat(fs.readdirSync(path.join(PUB, 'admin')).filter(f => f.endsWith('.html')).map(f => 'admin/' + f));
  const versions = new Set();
  for (const f of htmlFiles) {
    const s = fs.readFileSync(path.join(PUB, f), 'utf8');
    (s.match(/\?v=(\d+)/g) || []).forEach(v => versions.add(v));
  }
  A('every page cache-busts assets with one version (' + [...versions].join(',') + ')', versions.size === 1);
}
process.exit(process.exitCode || 0);
