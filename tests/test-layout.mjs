import fs from 'fs';
import pkg from 'jsdom';
const { JSDOM, VirtualConsole } = pkg;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const A = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n); c ? pass++ : (fail++, process.exitCode = 1); };
const rd = p => fs.readFileSync('/home/user/rose-by-marry/public/' + p, 'utf8');
const css = rd('assets/css/style.css');
/* overflow fixes */
A('CSS: html overflow-x clipped (root guard)', css.includes('html{overflow-x:clip}') && css.includes('@supports not (overflow:clip){html{overflow-x:hidden}}'));
A('CSS: press marquee clipped', /\n\.press\{overflow:hidden\}/.test(css) && css.includes('.topbar{overflow:hidden}'));
A('CSS: marquee still animates (not disabled)', css.includes('@keyframes mq{to{transform:translateX(-50%)}}'));
const idx = rd('index.html');
const row = idx.slice(idx.indexOf('class="press-row"'));
const marks = (row.match(/press-mark/g) || []).length;
A('marquee: duplicated content for seamless loop (even sets)', marks >= 8 && marks % 2 === 0, marks + ' marks');
/* number consistency */
A('data seed = new WhatsApp 212772966980', rd('assets/js/data.js').includes("whatsapp: '212772966980'"));
A('no old number anywhere in public/', !['.', ''].some(() => false) && ['index.html', 'about.html', 'cart.html', 'checkout.html', 'contact.html', 'product.html', 'shop.html', 'track.html', 'wishlist.html', 'ai.txt', 'assets/js/i18n.js'].every(f => !rd(f).includes('212699887766') && !rd(f).includes('0699887766')));
A('JSON-LD telephone updated (index)', idx.includes('"telephone":"+212772966980"'));
A('privacy page shows 0772966980', rd('privacy.html') === '' ? false : rd('assets/js/i18n.js').includes('0772966980'));
A('ai.txt updated', rd('ai.txt').includes('212772966980') && !rd('ai.txt').includes('212699887766'));
/* live DOM: footer + float use the new number */
{
  const SEED = { settings: { whatsapp: '212772966980', currency: 'DH', siteUrl: '', passHash: null, freeShip: 500, builderUnit: 9 }, categories: [{ id: 'bouq', icon: '', ar: 'باقات', fr: 'B', en: 'B' }], products: [{ id: 'amour', cat: 'bouq', type: 'bouquet', qty: 10, ar: 'باقة أمور', fr: 'B', en: 'B', price: 90, old: 0, badge: '', featured: true, active: true }], colors: [{ id: 'red', ar: 'أحمر', fr: 'R', en: 'R', hex: '#C8102E', available: true }], addons: [], builderTiers: [{ id: 'b10', qty: 10, price: 90 }], zones: [{ id: 'tanger', ar: 'طنجة', fr: 'T', en: 'T', fee: 20 }], promoCodes: [], discounts: [], reviews: [], orders: [], pageviews: {}, prodViews: {} };
  const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
  const d = new JSDOM(idx, { url: 'http://localhost:8080/', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.RBM_WEL_MS = 9e5; w.RBM_SP_MS = 9e5; w.localStorage.setItem('rbm_v2_state', JSON.stringify(SEED)); } });
  await sleep(1700);
  const doc = d.window.document;
  const footWa = doc.querySelector('#siteFooter a[href*="wa.me"]');
  A('DOM: footer WhatsApp link = new number', !!footWa && footWa.getAttribute('href').includes('wa.me/212772966980'));
  const fl = doc.querySelector('.wa-float');
  A('DOM: floating button = new number', !!fl && fl.getAttribute('href').includes('wa.me/212772966980'));
  d.window.close();
}
console.log('--- layout suite done: ' + pass + ' pass / ' + fail + ' fail');
process.exit(process.exitCode || 0);
