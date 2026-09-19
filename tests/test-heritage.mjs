/* Tangier heritage layer: two-seas divider, history timeline, city colors */
import fs from 'fs';
import pkg from 'jsdom';
const { JSDOM, VirtualConsole } = pkg;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const A = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n); c ? pass++ : (fail++, process.exitCode = 1); };
const rd = p => fs.readFileSync('/home/user/rose-by-marry/public/' + p, 'utf8');
const i18n = rd('assets/js/i18n.js'), data = rd('assets/js/data.js'), css = rd('assets/css/style.css');
/* static checks */
A('i18n: heritage keys in AR + FR + EN', i18n.includes('طنجة حيث يلتقي البحران') && i18n.includes('où se rencontrent les deux mers') && i18n.includes('where the two seas meet'));
A('i18n: 4 milestones x3 (Tingis, 1821, 1925, today)', ['hg1_t','hg2_t','hg3_t','hg4_t'].every(k => (i18n.match(new RegExp(k + ":'", 'g')) || []).length === 3));
A('data: Tangier Blue + Tangier Pink seeded', data.includes("id: 'tblue', ar: 'أزرق طنجة'") && data.includes("id: 'tpink', ar: 'وردي طنجة'") && data.includes('#1E6FA8') && data.includes('#E5699B'));
A('index: two-seas wave divider under hero', rd('index.html').includes('class="two-seas"'));
A('about: heritage timeline with 4 cards', (rd('about.html').match(/herit-card/g) || []).length === 4 && rd('about.html').includes('herit_t'));
A('CSS: two-seas + heritage grid styles', css.includes('.two-seas{color:var(--gold)') && css.includes('.herit-grid{') && css.includes('.hg-n{'));
/* live DOM with the REAL seed (no override) */
{
  const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
  const d = new JSDOM(rd('index.html'), { url: 'http://localhost:8080/', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.RBM_WEL_MS = 9e5; w.RBM_SP_MS = 9e5; w.localStorage.clear(); } });
  await sleep(1900);
  const doc = d.window.document;
  const dots = [...doc.querySelector('.pcard').querySelectorAll('.cdot')].map(x => x.getAttribute('data-cdot'));
  A('DOM: featured card now shows 5 colors incl. city colors', dots.length === 5 && dots.includes('#1E6FA8') && dots.includes('#E5699B'));
  A('DOM: wave divider present in live DOM', !!doc.querySelector('.two-seas svg'));
  d.window.close();
}
{
  const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
  const d = new JSDOM(rd('about.html'), { url: 'http://localhost:8080/about.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.RBM_WEL_MS = 9e5; w.RBM_SP_MS = 9e5; w.localStorage.clear(); } });
  await sleep(1900);
  const doc = d.window.document;
  const cards = [...doc.querySelectorAll('.herit-card')].map(c => c.textContent);
  A('DOM: 4 timeline cards filled in Arabic', cards.length === 4 && cards[0].includes('الفينيقيين') && cards[1].includes('1821') && cards[2].includes('1925') && cards[3].length > 20);
  A('DOM: divider + section title on about', !!doc.querySelector('.two-seas') && doc.querySelector('[data-i18n="herit_t"]').textContent.includes('البحران'));
  d.window.close();
}
console.log('--- heritage suite done: ' + pass + ' pass / ' + fail + ' fail');
process.exit(process.exitCode || 0);
