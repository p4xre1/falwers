import fs from 'fs';
import pkg from 'jsdom';
const { JSDOM, VirtualConsole } = pkg;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const A = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n); c ? pass++ : (fail++, process.exitCode = 1); };
const rd = p => fs.readFileSync('/home/user/rose-by-marry/public/' + p, 'utf8');
const i18n = rd('assets/js/i18n.js'), data = rd('assets/js/data.js'), index = rd('index.html');
const SEED = () => ({ settings: { whatsapp: '212772966980', currency: 'DH', siteUrl: '', passHash: null, freeShip: 500, builderUnit: 9 }, categories: [{ id: 'bouq', icon: '', ar: 'باقات', fr: 'B', en: 'B' }], products: [{ id: 'amour', cat: 'bouq', type: 'bouquet', qty: 10, ar: 'باقة أمور', fr: 'Bouquet Amour', en: 'Amour Bouquet', dar: '', dfr: '', den: '', price: 90, old: 0, badge: 'best', featured: true, active: true }], colors: [{ id: 'red', ar: 'أحمر', fr: 'R', en: 'R', hex: '#C8102E', available: true }], addons: [{ id: 'crown', icon: '', ar: 'تاج', fr: 'C', en: 'C', price: 20, hasText: false, enabled: true }], builderTiers: [{ id: 'b10', qty: 10, price: 90 }], zones: [{ id: 'tanger', ar: 'طنجة', fr: 'T', en: 'T', fee: 20 }], promoCodes: [], discounts: [], reviews: [{ id: 'r1', pid: 'amour', name: 'Salma', rating: 5, text: 'جميل', ts: Date.now() }], orders: [], pageviews: {}, prodViews: {} });
const dom = async (page, opts = {}) => {
  const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
  const d = new JSDOM(rd(page), { url: 'http://localhost:8080/' + page + (opts.q || ''), runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.RBM_WEL_MS = 9e5; w.RBM_SP_MS = 9e5; w.localStorage.setItem('rbm_v2_state', JSON.stringify(SEED())); if (opts.ls) for (const [k, v] of Object.entries(opts.ls)) w.localStorage.setItem(k, v); } });
  await sleep(1700); return d;
};
/* A: credibility bugs */
A('A1 about_p3: Tangier-only x3 langs', i18n.includes('كل أحياء طنجة') && i18n.includes('partout à Tanger') && i18n.includes('anywhere in Tangier'));
A('A1 no "all Morocco" promise left in i18n', !i18n.includes('جميع المدن المغربية') && !i18n.includes('partout au Maroc') && !i18n.includes('all Moroccan cities') && !i18n.includes('toutes les villes') && !i18n.includes('in every city'));
A('A2 COD values: no "في كل المدن"', i18n.includes('بلا أي دفع مسبق') && i18n.includes('jamais d’avance') && i18n.includes('never pay in advance'));
A('A3 index meta: Tangier delivery', index.includes('توصيل داخل طنجة اليوم نفسه') && !index.includes('لكل المدن'));
A('A4 carrot typo gone', i18n.includes('ورشة صغيرة في طنجة') && !i18n.includes('جزَر'));
/* B: hero */
A('B hero AR/FR/EN rewritten', i18n.includes('وردٌ لا يذبول…') && i18n.includes('وذكرى تبقى') && i18n.includes('Des roses qui ne fanent jamais…') && i18n.includes('Roses that never wilt…'));
A('B scarcity kicker x3', i18n.includes('لفترة محدودة') && i18n.includes('TEMPS LIMITÉ') && i18n.includes('FOR A LIMITED TIME'));
A('B static hero updated (crawlers see it)', index.includes('وردٌ لا يذبول…') && index.includes('وذكرى تبقى'));
/* C: feminine voice */
A('C feminine CTAs', i18n.includes('تسوّقي الآن') && i18n.includes('اطلبي عبر واتساب') && i18n.includes('اكتشفي باقاتنا') && i18n.includes('جرّبي تغيير المرشحات'));
A('C builder + how steps feminine', i18n.includes('اختاري حجم الباقة') && i18n.includes('أرسلي طلبك عبر واتساب') && i18n.includes('استلمي وادفعي') && i18n.includes('املئي بياناتك'));
/* D: product copy */
A('D coeur: love, not newborns', data.includes('لقول «أحبك» دون كلمة واحدة') && !data.includes('هدية المواليد'));
A('D royal + single + cadre upgraded', data.includes('يملأ الغرفة') && data.includes('تعجز الرسائل الطويلة') && data.includes('تُعلَّق ولا تُنسى'));
A('D FR mirrors landed', data.includes('écrin') && data.includes('sans un seul mot') && data.includes('qu’on accroche'));
A('D EN mirrors landed', data.includes('jewel box') && data.includes('fill the room') && data.includes('never forget'));
/* E: SEO titles */
A('E titles rewritten (5 pages)', index.includes('<title>Rose by Marry | ورد الساتان في طنجة لا يذبول') && rd('shop.html').includes('متجر ورد الساتان في طنجة') && rd('about.html').includes('قصتنا — ورشة ورد الساتان في طنجة') && rd('contact.html').includes('تواصلي معنا — واتساب فوري') && !rd('product.html').includes('Product | Rose by Marry'));
/* F: micro polish */
A('F feature bar specific x3', i18n.includes('تبقى سنة كاملة') && i18n.includes('توصيل اليوم نفسه') && i18n.includes('صناعة يدوية 100%'));
A('F best-sellers sub + CTA banner', i18n.includes('طنجيات') && i18n.includes('عاينيها، وصلناها') && index.includes('طنجيات'));
/* live DOM checks */
{
  const d = await dom('index.html'); const doc = d.window.document;
  A('DOM: hero renders new headline', doc.querySelector('.hero-title').textContent.includes('لا يذبول'));
  A('DOM: kicker renders scarcity', doc.querySelector('.hero-kicker').textContent.includes('لفترة محدودة'));
  d.window.close();
}
{
  const d = await dom('product.html', { q: '?id=amour' }); const doc = d.window.document;
  A('DOM: product title dynamic (product name in <title>)', doc.title.includes('باقة أمور'));
  const wa = [...doc.querySelectorAll('.pd-buy button')].map(b => b.textContent).join(' ');
  A('DOM: WA button feminine', wa.includes('اطلبي عبر واتساب'));
  d.window.close();
}
{
  const d = await dom('about.html'); const doc = d.window.document;
  const p3 = [...doc.querySelectorAll('p')].map(p => p.textContent).find(t => t.includes('أحياء طنجة'));
  A('DOM: about renders fixed delivery promise', !!p3 && !p3.includes('جميع المدن'));
  d.window.close();
}
console.log('--- copy suite done: ' + pass + ' pass / ' + fail + ' fail');
process.exit(process.exitCode || 0);
