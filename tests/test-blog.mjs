/* Blog: listing, article page SEO, admin editor + live SEO checker */
import fs from 'fs';
import pkg from 'jsdom';
import { fileURLToPath } from 'node:url';
const PUB = fileURLToPath(new URL('../public', import.meta.url));
const { JSDOM, VirtualConsole } = pkg;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const A = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' | ' + n); c ? pass++ : (fail++, process.exitCode = 1); };
const rd = p => fs.readFileSync(PUB + '/' + p, 'utf8');
const mk = async (page, { q = '', ls = {}, admin = false } = {}) => {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { const m = String(e.message || e); if (!/not implemented|Could not load/i.test(m)) { fail++; console.log('PAGE-ERR: ' + m.slice(0, 130)); process.exitCode = 1; } });
  const d = new JSDOM(rd(page), { url: 'http://localhost:8080/' + page + q, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.RBM_WEL_MS = 9e5; w.RBM_SP_MS = 9e5; if (admin) { try { w.sessionStorage.setItem('rbm_admin', '1');w.sessionStorage.setItem('rbm_admin_ts',String(Date.now())); } catch (e) {} } for (const [k, v] of Object.entries(ls)) w.localStorage.setItem(k, v); } });
  await sleep(1900);
  return d;
};
/* static SEO plumbing */
{
  const b = rd('blog.html');
  A('blog.html: indexable + canonical /blog + Blog schema', b.includes('content="index, follow') && b.includes('rel="canonical" href="https://rosebymarry.com/blog"') && b.includes('"@type":"Blog"'));
  A('sitemap + routes include /blog', rd('sitemap.xml').includes('/blog</loc>') && rd('../src/routes/routes.js').includes("path: '/blog'"));
  A('nav + footer wired to blog', rd('assets/js/ui.js').includes("navLink('blog.html', 'nav_blog'") && rd('assets/js/ui.js').includes("'<a href=\"blog.html\">' + t('nav_blog')"));
}
/* listing with real seed */
{
  const d = await mk('blog.html'); const doc = d.window.document;
  const cards = doc.querySelectorAll('.blog-card');
  A('blog listing: 3 seeded articles render', cards.length === 3);
  A('blog listing: Arabic titles + read time', [...cards].some(c => c.textContent.includes('ورد الساتان: ما هو ولماذا لا يذبول؟')) && [...cards].every(c => c.textContent.includes('دقائق قراءة')));
  A('nav shows blog as active on listing', doc.querySelector('.main-nav a[aria-current="page"]') && doc.querySelector('.main-nav a[aria-current="page"]').textContent.includes('المدونة'));
  d.window.close();
}
/* article page + dynamic SEO */
{
  const d = await mk('article.html', { q: '?id=satin-roses-what-why' }); const doc = d.window.document;
  A('article: dynamic <title> = article title', doc.title.includes('ورد الساتان: ما هو ولماذا لا يذبول؟'));
  A('article: meta description updated', (doc.querySelector('meta[name="description"]') || {}).content && doc.querySelector('meta[name="description"]').content.includes('ورد الساتان'));
  A('article: canonical points to article URL', (doc.querySelector('link[rel="canonical"]') || {}).getAttribute && doc.querySelector('link[rel="canonical"]').getAttribute('href').includes('article.html?id=satin-roses-what-why'));
  const ld = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(s2 => { try { return JSON.parse(s2.textContent); } catch (e) { return null; } }).find(x => x && x['@type'] === 'BlogPosting');
  A('article: BlogPosting JSON-LD valid with headline', !!ld && ld.headline.includes('ورد الساتان'));
  const paras = doc.querySelectorAll('.art-body p');
  A('article: body renders 3 paragraphs', paras.length === 3);
  A('article: related articles shown (2)', doc.querySelectorAll('.blog-card').length === 2);
  const st = JSON.parse(d.window.localStorage.getItem('rbm_v2_state'));
  A('article: view counter incremented', (st.articles.find(x => x.slug === 'satin-roses-what-why').views || 0) >= 1);
  d.window.close();
}
/* bad id -> graceful */
{
  const d = await mk('article.html', { q: '?id=does-not-exist' }); const doc = d.window.document;
  A('article: unknown id shows friendly message + back', doc.body.textContent.includes('المقال غير موجود') && !!doc.querySelector('a[href="blog.html"]'));
  d.window.close();
}
/* admin editor + live SEO checker */
{
  const d = await mk('admin/blog.html', { admin: true }); const doc = d.window.document;
  A('admin: editor fields present', !!doc.getElementById('bl_title_ar') && !!doc.getElementById('bl_body') && !!doc.getElementById('seoList'));
  A('admin: seeded list renders 3 rows with views', doc.querySelectorAll('.bl-row').length === 3 && doc.querySelector('.bl-inf span').textContent.includes('مشاهدة'));
  doc.getElementById('bl_title_ar').value = 'قصيرة';
  doc.getElementById('bl_title_ar').dispatchEvent(new d.window.Event('input', { bubbles: true }));
  const badRows = doc.querySelectorAll('#seoList .seo-row.bad').length;
  A('SEO checker: short title flags ≥2 red rules live', badRows >= 2);
  doc.getElementById('bl_title_ar').value = 'دليلك الكامل لاختيار باقة ورد الساتان المثالية في طنجة';
  doc.getElementById('bl_desc').value = 'دليل عملي لاختيار باقة ورد الساتان المناسبة: اللون، الحجم، والإضافات — مع نصائح من ورشتنا في طنجة لتصل هديتك مثالية.';
  doc.getElementById('bl_keyword').value = 'باقة ورد الساتان';
  doc.getElementById('bl_body').value = ('باقة ورد الساتان هي الهدية التي تبقى. '.repeat(18)).trim() + '\n\nفي هذه المقالة نشرح كل تفاصيل اختيار باقة ورد الساتان خطوة بخطوة مع أمثلة حقيقية من ورشتنا. ' + 'اللون والحجم والإضافات تصنع الفرق. '.repeat(10) + '\n\nوفي النهاية، باقة ورد الساتان المختارة بعناية تصلح لكل مناسبة وتترك أثراً لا ينسى.';
  doc.getElementById('bl_body').dispatchEvent(new d.window.Event('input', { bubbles: true }));
  const good = [...doc.querySelectorAll('#seoList .seo-row.ok')].length;
  A('SEO checker: well-formed article scores 6+/7 green', good >= 6);
  const before = JSON.parse(d.window.localStorage.getItem('rbm_v2_state')).articles.length;
  doc.getElementById('blSave').click(); await sleep(250);
  const after = JSON.parse(d.window.localStorage.getItem('rbm_v2_state')).articles.length;
  A('admin: save persists new published article', after === before + 1);
  d.window.close();
}
console.log('--- blog suite done: ' + pass + ' pass / ' + fail + ' fail');
process.exit(process.exitCode || 0);
