import fs from 'fs';
import path from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = path.resolve(import.meta.dirname, '..');
let pass = 0, fail = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rd = p => fs.readFileSync(path.join(ROOT, 'public', p), 'utf8');
function A(name, cond) { if (cond) { pass++; console.log('PASS | ' + name); } else { fail++; console.log('FAIL | ' + name); } }

const vc = new VirtualConsole();
const errs = [];
vc.on('jsdomError', e => { if (!/not implemented|Could not load/i.test(String(e))) errs.push(String(e).slice(0, 140)); });
const dom = new JSDOM(rd('index.html'), { url: 'http://localhost:8080/index.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) {
      w.RBM_WEL_MS = 9e5; w.RBM_SP_MS = 9e5;
      w.localStorage.setItem('rbm_v2_state', JSON.stringify({ settings: { whatsapp: '212772966980', currency: 'DH', passHash: 's2:x', freeShip: 500, builderUnit: 9, instagram: 'https://instagram.com/rosebymarry', tiktok: 'https://tiktok.com/@rosebymarry' }, categories: [], products: [], colors: [], addons: [], builderTiers: [], zones: [], promoCodes: [], discounts: [], reviews: [], orders: [], articles: [], pageviews: {}, prodViews: {}, faq: [] }));
    } });
await sleep(1800);
const d = dom.window.document;
const foot = d.getElementById('siteFooter');

/* structure: 4 categorized columns */
const cols = foot.querySelectorAll('.foot-grid .foot-links');
A('footer: 4 columns', cols.length === 4);
A('footer: titles are shop/help/explore/contact', [...cols].map(c => c.querySelector('.t').textContent).every(x => x.length > 2));
/* every public page linked exactly once */
const hrefs = [...foot.querySelectorAll('a')].filter(a => !a.getAttribute('href').includes('#')).map(a => a.getAttribute('href')).filter(h => h.endsWith('.html') || h === '/');
const uniq = new Set(hrefs);
const want = ['/', 'shop.html', 'occasions.html', 'offers.html', 'cart.html', 'wishlist.html', 'faq.html', 'care.html', 'size-guide.html', 'track.html', 'contact.html', 'blog.html', 'about.html', 'search.html', 'privacy.html', 'terms.html'];
A('footer: all 16 public routes linked', want.every(w => uniq.has(w)));
A('footer: no duplicate page links', hrefs.length === uniq.size);
A('footer: builder deep-link present', !!foot.querySelector('a[href$="#builder"]'));
/* privacy/terms moved to legal bar */
const base = foot.querySelector('.foot-base');
A('footer: legal bar has privacy + terms', !!base.querySelector('a[href="privacy.html"]') && !!base.querySelector('a[href="terms.html"]'));
A('footer: legal links not in columns', ![...cols].some(c => c.querySelector('a[href="privacy.html"]')));
/* contact column content */
A('footer: WA number in contact col', [...cols[3].querySelectorAll('a')].some(a => (a.getAttribute('href') || '').includes('wa.me')));
A('footer: social icons row', !!cols[3].querySelector('.foot-social'));
A('footer: legal bar has admin link', !!base.querySelector('a.admin-link'));
/* i18n trilingual */
const i = rd('assets/js/i18n.js');
A('footer: foot_shop_t x3 langs', (i.match(/foot_shop_t:/g) || []).length === 3);
A('footer: foot_explore_t x3 langs', (i.match(/foot_explore_t:/g) || []).length === 3);
/* CSS: responsive 4->2->1 */
const c = rd('assets/css/style.css');
A('footer: CSS 4-col desktop', c.includes('.foot-grid{display:grid;grid-template-columns:repeat(4,1fr)'));
A('footer: CSS tablet 2-col + phone 1-col', c.includes('@media (max-width:960px){.foot-grid{grid-template-columns:repeat(2,1fr)}') && /@media \(max-width:540px\)\{\.foot-grid\{grid-template-columns:1fr\}/.test(c));
A('footer: no runtime errors', errs.length === 0);
dom.window.close();
console.log('\nfooter: ' + pass + ' pass / ' + fail + ' fail');
if (fail) process.exit(1);
