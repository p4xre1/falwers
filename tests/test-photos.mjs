import { JSDOM } from 'jsdom';
import fs from 'node:fs';

const B = 'http://localhost:8080';
let pass = 0, fail = 0;
const A = (n, c) => { if (c) { pass++; console.log('PASS |', n); } else { fail++; console.log('FAIL |', n); } };

// A 1x1 png we pretend was uploaded.
const PNG  = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
// distinct urls: prodGallery() de-duplicates by url on purpose.
// (sanitizeUrl deliberately rejects a fragment on a data: URL, so use https
// URLs here — these are what a real Supabase upload produces anyway.)
const PNG2 = 'https://demo.supabase.co/storage/v1/object/public/media/products/amour/tpink-1.webp';
const PNG3 = 'https://demo.supabase.co/storage/v1/object/public/media/products/amour/general-2.webp';

async function boot(path, seed) {
  const dom = await JSDOM.fromURL(B + path, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) {
      if (seed) {
        const ls = {};
        Object.defineProperty(w, 'localStorage', {
          value: {
            getItem: k => (k in ls ? ls[k] : null),
            setItem: (k, v) => { ls[k] = String(v); },
            removeItem: k => { delete ls[k]; }, clear: () => {}
          }, configurable: true
        });
        ls['rbm_v2_state'] = JSON.stringify(seed);
      }
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    }
  });
  await new Promise(r => {
    if (dom.window.document.readyState === 'complete') return r();
    dom.window.addEventListener('load', r);
  });
  await new Promise(r => setTimeout(r, 700));
  return dom;
}

// Build a seed state: product "amour" has a general photo + a Tangier-Pink photo,
// colour tpink has a swatch photo. Everything else stays mockup-only.
function seedState() {
  const raw = fs.readFileSync('public/assets/js/data.js', 'utf8');
  const ctx = { window: {}, localStorage: null };
  return {
    version: 2,
    settings: { whatsapp: '212772966980', currency: 'DH', supabase: { url: '', anonKey: '', bucket: 'media' } },
    products: [{
      id: 'amour', cat: 'bouq', type: 'bouquet', qty: 10, ar: 'باقة أمور', fr: 'Bouquet Amour', en: 'Amour Bouquet',
      dar: 'وصف', dfr: 'desc', den: 'desc', price: 90, old: 110, badge: 'best', featured: true, active: true,
      imgs: [
        { id: 'i1', url: PNG, colorId: '', alt: 'general shot', primary: true },
        { id: 'i2', url: PNG2, colorId: 'tpink', alt: 'pink shot', primary: true },
        { id: 'i3', url: PNG3, colorId: '', alt: 'second general', primary: false }
      ]
    }],
    colors: [
      { id: 'tpink', ar: 'وردي طنجة', fr: 'Rose Tanger', en: 'Tangier Pink', hex: '#E5699B', available: true, img: PNG },
      { id: 'red', ar: 'أحمر', fr: 'Rouge', en: 'Red', hex: '#C8102E', available: true }
    ]
  };
}

console.log('--- 1. shop page: photo replaces mockup ---');
{
  const dom = await boot('/shop.html', seedState());
  const w = dom.window, d = w.document;
  const card = d.querySelector('.pcard');
  A('a product card rendered', !!card);
  if (card) {
    A('card art is a real <img>, not an svg', !!card.querySelector('.pc-art img.art-photo'));
    const dots = card.querySelectorAll('.cdot');
    A('colour dots carry data-cid', dots.length > 0 && !!dots[0].getAttribute('data-cid'));
    const pinkDot = Array.from(dots).find(b => b.getAttribute('data-cid') === 'tpink');
    A('tpink dot shows the colour photo as background', !!pinkDot && /url\(/.test(pinkDot.getAttribute('style') || ''));
  }
  // helper-level checks inside the page context
  A('prodImg() picks the colour-specific shot', w.prodImg(w.S.products[0], 'tpink').alt === 'pink shot');
  A('prodImg() falls back to general for a colour with no shot', w.prodImg(w.S.products[0], 'red').alt === 'general shot');
  A('prodGallery(tpink) = pink first then generals', w.prodGallery(w.S.products[0], 'tpink').length === 3);
  A('hasProdImg true for photographed pack', w.hasProdImg(w.S.products[0]) === true);
  dom.window.close();
}

console.log('--- 2. product page: gallery + colour swap ---');
{
  const dom = await boot('/product.html?id=amour', seedState());
  const w = dom.window, d = w.document;
  const art = d.querySelector('#pdArt');
  A('product page rendered', !!art);
  A('main art is a photo', !!(art && art.querySelector('img.art-photo')));
  const th = d.querySelector('#pdThumbs');
  A('thumb strip exists', !!th);
  A('thumb strip is on (3 shots)', !!th && th.classList.contains('on'));
  A('3 thumbnails rendered', !!th && th.querySelectorAll('.pd-th').length === 3);
  const sw = d.querySelectorAll('#pdColors .sw .dot');
  A('swatch dots rendered', sw.length === 2);
  A('tpink swatch uses its photo', Array.from(sw).some(x => /url\(/.test(x.getAttribute('style') || '')));
  // click the red swatch -> should fall back to the general photo, not break
  const btns = d.querySelectorAll('#pdColors .sw');
  const redBtn = Array.from(btns).find(b => (b.textContent || '').includes('أحمر') || (b.textContent || '').includes('Rouge') || (b.textContent || '').includes('Red'));
  if (redBtn) {
    redBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    A('after choosing a photo-less colour, art still shows a photo', !!d.querySelector('#pdArt img.art-photo'));
  }
  dom.window.close();
}

console.log('--- 3. no photos at all => mockups, unchanged behaviour ---');
{
  const dom = await boot('/shop.html', null); // default catalogue, no imgs
  const d = dom.window.document;
  const card = d.querySelector('.pcard');
  A('cards still render with default catalogue', !!card);
  A('art falls back to inline SVG mockup', !!card.querySelector('.pc-art svg'));
  A('no stray <img> in mockup mode', !card.querySelector('.pc-art img'));
  const th = d.querySelector('#pdThumbs');
  A('thumb strip absent on shop page', th === null);
  dom.window.close();
}

console.log('--- 4. XSS: hostile photo url/alt cannot execute ---');
{
  const bad = JSON.parse(JSON.stringify(seedState()));
  bad.products[0].imgs = [
    { id: 'x1', url: 'javascript:alert(1)', colorId: '', alt: 'x', primary: true },
    { id: 'x2', url: PNG2, colorId: '', alt: '"><img src=x onerror=alert(1)>', primary: false }
  ];
  const dom = await boot('/shop.html', bad);
  const w = dom.window, d = w.document;
  const imgs = w.S.products[0].imgs;
  A('javascript: url stripped by migrate()', !imgs.some(i => /javascript:/i.test(i.url)));
  A('surviving image kept', imgs.length === 1);
  A('no injected onerror img in DOM', !d.querySelector('img[onerror]'));
  const html = d.querySelector('.pc-art') ? d.querySelector('.pc-art').innerHTML : '';
  A('alt is escaped in markup', !/"><img/.test(html));
  dom.window.close();
}

const APNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function admin(page, seed) {
  const errs = [];
  const dom = await JSDOM.fromURL(B + page, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) {
      const ls = { rbm_admin_kb: '1' };
      if (seed) ls['rbm_v2_state'] = JSON.stringify(seed);
      Object.defineProperty(w, 'localStorage', {
        value: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; }, clear: () => {} },
        configurable: true
      });
      Object.defineProperty(w, 'sessionStorage', {
        value: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} }, configurable: true
      });
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.addEventListener('error', e => errs.push(String(e.error && e.error.stack || e.message).slice(0, 300)));
    }
  });
  await new Promise(r => { if (dom.window.document.readyState === 'complete') return r(); dom.window.addEventListener('load', r); });
  await new Promise(r => setTimeout(r, 800));
  const w = dom.window;
  return { dom, w, d: w.document, errs };
}

const aseed = {
  version: 2,
  settings: { whatsapp: '212772966980', currency: 'DH', supabase: { url: '', anonKey: '', bucket: 'media' } },
  products: [{
    id: 'amour', cat: 'bouq', type: 'bouquet', qty: 10, ar: 'باقة أمور', fr: 'Bouquet Amour', en: 'Amour',
    dar: 'd', dfr: 'd', den: 'd', price: 90, old: 110, badge: 'best', featured: true, active: true,
    imgs: [{ id: 'i1', url: APNG, colorId: '', alt: 'shot', primary: true }]
  }],
  colors: [{ id: 'tpink', ar: 'وردي طنجة', fr: 'Rose Tanger', en: 'Tangier Pink', hex: '#E5699B', available: true, img: APNG }]
};

console.log('--- colours admin ---');
{
  const { dom, d, errs } = await admin('/admin/colors.html', aseed);
  A('page unlocked', !d.querySelector('#pcModal.on'));
  A('colour photo preview shown', !!d.querySelector('.ph-item img'));
  A('add/replace button present', !!Array.from(d.querySelectorAll('button')).find(b => /استبدال|Remplacer|Replace/.test(b.textContent)));
  A('storage-mode hint rendered', !!Array.from(d.querySelectorAll('.hintline')).find(x => x.textContent.trim().length > 10));
  A('no raw i18n keys leaked', !/\bph_(add|del|main|mode_local)\b/.test(d.body.textContent));
  A('no runtime errors', errs.length === 0 || (console.log(errs), false));
  dom.window.close();
}

console.log('--- products admin ---');
{
  const { dom, d, w, errs } = await admin('/admin/products.html', aseed);
  A('photo box rendered for the pack', !!d.querySelector('.ph-wrap'));
  A('existing photo listed', !!d.querySelector('.ph-wrap .ph-item img'));
  A('marked as main', !!d.querySelector('.ph-item.is-primary'));
  const sel = d.querySelector('.ph-wrap select');
  A('colour slot selector present', !!sel);
  A('selector lists general + each colour', !!sel && sel.options.length === 1 + w.S.colors.length);
  // switch to the tpink slot: it has no photo yet
  if (sel) {
    sel.value = 'tpink';
    sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    A('empty state shown for a colour with no photo', !!d.querySelector('.ph-wrap .ph-empty'));
  }
  A('no raw i18n keys leaked', !/\bph_(add|slot_all|none_prod)\b/.test(d.body.textContent));
  A('no runtime errors', errs.length === 0 || (console.log(errs), false));
  dom.window.close();
}

console.log('--- settings: supabase panel ---');
{
  const { dom, d, w, errs } = await admin('/admin/settings.html', aseed);
  A('supabase card present', !!d.querySelector('#sb_url'));
  A('status chip says "not configured"', /غير مضبوط|Non configuré|Not configured/.test((d.querySelector('#sbStatus') || {}).textContent || ''));
  // fill it in and save
  d.querySelector('#sb_url').value = 'https://demo.supabase.co/';
  d.querySelector('#sb_key').value = 'anon-key-123';
  d.querySelector('#sbSave').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 300));
  A('settings persisted to state', w.S.settings.supabase.anonKey === 'anon-key-123');
  A('trailing slash stripped from url', w.S.settings.supabase.url === 'https://demo.supabase.co');
  A('status now shows connected / read-only', /متصل|Connecté|Connected/.test(d.querySelector('#sbStatus').textContent));
  A('SB.on() true once configured', w.SB.on() === true);
  A('publicUrl builds a storage path', w.SB.publicUrl('products/a.webp') === 'https://demo.supabase.co/storage/v1/object/public/media/products/a.webp');
  A('no raw i18n keys leaked', !/\bsb_(url|key|login|hint)\b/.test(d.body.textContent));
  A('no runtime errors', errs.length === 0 || (console.log(errs), false));
  dom.window.close();
}


console.log(`\nphotos: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
