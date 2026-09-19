import fs from 'fs';
import pkg from 'jsdom';
import { fileURLToPath } from 'node:url';
const PUB = fileURLToPath(new URL('../public', import.meta.url));
const { JSDOM, VirtualConsole } = pkg;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const A = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n); if (!c) process.exitCode = 1; };
const load = async (page, seedFn) => {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => { const m = String(e.message || e); if (!/not implemented|Could not load/i.test(m)) errs.push(m.slice(0, 160)); });
  const html = fs.readFileSync(PUB + '/' + page.split('?')[0], 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost:8080/' + page, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { if (seedFn) seedFn(w); } });
  await sleep(900);
  return { w: dom.window, d: dom.window.document, errs };
};

/* 1) home: builder swatches from live S.colors */
{
  const { w, d, errs } = await load('index.html');
  const sw = [...d.querySelectorAll('#bColors .sw')];
  A('home: 5 builder swatches (tblue/tpink added)', sw.length === 5);
  A('home: swatch names order', sw.map(s => s.querySelector('.nm').textContent.trim()).join('|') === 'أزرق|أحمر|أحمر داكن|أزرق طنجة|وردي طنجة');
  const hx2rgb = h => { const n = parseInt(h.slice(1), 16); return 'rgb(' + (n >> 16) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ')'; };
  const hexes = ['#3A5FA8', '#C8102E', '#6E1423', '#1E6FA8', '#E5699B'];
  const dotHas = (sw, h) => { const dot = sw.querySelector('.dot'); if (!dot) return false; const st = (dot.getAttribute('style') || '').toLowerCase(); return st.includes(h.toLowerCase()) || st.includes(hx2rgb(h)); };
  A('home: swatch dots use the 5 default hexes', hexes.every((h, i) => dotHas(sw[i], h)));
  A('home: admin link → admin/index.html', d.querySelector('#adminBtn').getAttribute('href') === 'admin/index.html');
  A('home: no runtime errors', errs.length === 0); if (errs.length) console.log(errs.join('\n'));
  w.close();
}
/* 2) shop: 13 products + color filter chips */
{
  const { w, d, errs } = await load('shop.html');
  const cards = d.querySelectorAll('.pcard').length || d.querySelectorAll('[data-pid]').length;
  A('shop: products render (>=10)', cards >= 10);
  const chips = [...d.querySelectorAll('#colorFilter .sw')].map(b => b.getAttribute('title'));
  A('shop: 5 color filter chips', chips.length === 5 && chips[0].includes('أزرق') && chips[1].includes('أحمر') && chips[2].includes('داكن') && chips[3].includes('طنجة') && chips[4].includes('طنجة'));
  A('shop: no runtime errors', errs.length === 0); if (errs.length) console.log(errs.join('\n'));
  w.close();
}
/* 3) product page: color picker 3 options + add to cart */
{
  const { w, d, errs } = await load('product.html?id=amour');
  const opts = d.querySelectorAll('#pdColors .sw');
  A('product: 5 color options', opts.length === 5);
  const btn = d.querySelector('#pdAddCart');
  if (btn) { btn.click(); await sleep(120); }
  const cart = JSON.parse(w.localStorage.getItem('rbm_cart_v2') || '[]');
  A('product: add-to-cart works', cart.length >= 1);
  A('product: no runtime errors', errs.length === 0); if (errs.length) console.log(errs.join('\n'));
  w.close();
}
/* 4) cart: legacy colorId 'pink' must not crash */
{
  const seed = w => {
    w.localStorage.setItem('rbm_cart_v2', JSON.stringify([{ key: 'amour|pink|', pid: 'amour', qty: 2, colorId: 'pink', addons: [], note: '' }]));
  };
  const { w, d, errs } = await load('cart.html', seed);
  A('cart: renders with legacy pink colorId (no crash)', d.querySelectorAll('#cartRoot .cartline').length === 1 && d.querySelector('#cartRoot').textContent.length > 20);
  A('cart: no runtime errors', errs.length === 0); if (errs.length) console.log(errs.join('\n'));
  w.close();
}
/* 5) checkout + track load clean */
{
  const a = await load('checkout.html');
  A('checkout: loads, no runtime errors', a.errs.length === 0); if (a.errs.length) console.log(a.errs.join('\n'));
  a.w.close();
  const b = await load('track.html');
  A('track: loads, no runtime errors', b.errs.length === 0); if (b.errs.length) console.log(b.errs.join('\n'));
  b.w.close();
}
console.log('--- v4 storefront regression done');
process.exit(process.exitCode || 0);
