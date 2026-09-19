/* Rose by Marry — pre-deploy verification (zero dependencies)
   Usage: node scripts/verify.mjs   (exit 1 on any failure) */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const PUB = path.join(ROOT, 'public');
let fail = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' — ' + extra : '')); if (!cond) fail = 1; };
const walk = (d, out = []) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p, out); else out.push(p); } return out; };
const pages = walk(PUB).filter(f => f.endsWith('.html'));
const STORE = pages.filter(f => !f.includes(path.join('admin') + path.sep) && !f.endsWith('404.html'));
console.log('— verify: ' + pages.length + ' pages —');

/* 1) every page: favicon, CSP, no stray '>>>', v-consistent assets */
for (const p of pages) {
  const s = fs.readFileSync(p, 'utf8');
  const rel = path.relative(PUB, p);
  ok(rel + ': favicon', s.includes('favicon.svg'));
  ok(rel + ': CSP', /Content-Security-Policy/.test(s) && s.includes("form-action 'none'"));
  ok(rel + ': no stray ">>>"', !s.includes('display=swap">>>') && !s.includes('webmanifest"">'));
  const vs = [...s.matchAll(/\?v=(\d+)/g)].map(m => m[1]);
  ok(rel + ': single cache version', vs.length && vs.every(v => v === vs[0]), 'v=' + (vs[0] || '?'));
}

/* 2) storefront: absolute og:image + twitter card (+ JSON-LD sane) */
for (const p of STORE) {
  const s = fs.readFileSync(p, 'utf8');
  ok(path.basename(p) + ': og:image absolute', s.includes('property="og:image" content="https://'));
  ok(path.basename(p) + ': twitter:card', s.includes('twitter:card'));
  const ld = [...s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let good = true;
  for (const m of ld) { try { JSON.parse(m[1]); } catch (e) { good = false; } }
  ok(path.basename(p) + ': JSON-LD parses', good);
}

/* 3) CSS braces balanced */
const css = fs.readFileSync(path.join(PUB, 'assets/css/style.css'), 'utf8');
ok('style.css braces balanced', (css.match(/{/g) || []).length === (css.match(/}/g) || []).length);

/* 4) JS syntax via node --check */
const jsdirs = ['assets/js', 'admin/assets/js'].map(d => path.join(PUB, d)).filter(d => fs.existsSync(d));
let jsfiles = [];
for (const d of jsdirs) jsfiles = jsfiles.concat(walk(d));
for (const j of jsfiles) {
  const r = spawnSync(process.execPath, ['--check', j], { encoding: 'utf8' });
  ok(path.relative(PUB, j) + ': syntax', r.status === 0, (r.stderr || '').split('\n')[0]);
}

/* 5) infra files exist */
for (const f of ['_headers', '_redirects', 'robots.txt', 'sitemap.xml', '404.html', 'sw.js', 'assets/manifest.webmanifest', 'assets/img/favicon.ico', 'assets/img/favicon.svg', 'assets/img/apple-touch-icon.png']) {
  ok(f, fs.existsSync(path.join(PUB, f)));
}

/* 6) sitemap URLs map to real files */
const sm = fs.readFileSync(path.join(PUB, 'sitemap.xml'), 'utf8');
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
let smOk = true;
for (const u of urls) {
  const p = u.replace('https://rosebymarry.com', '').split('?')[0];
  const file = p === '/' ? 'index.html' : p.replace(/^\//, '') + '.html';
  if (!fs.existsSync(path.join(PUB, file))) { smOk = false; console.log('   sitemap orphan: ' + u); }
}
ok('sitemap: all URLs resolve', smOk, urls.length + ' urls');

/* 7) sitemap must not list noindex pages */
ok('sitemap: no cart/checkout/wishlist', !urls.some(u => /cart|checkout|wishlist|track/.test(u)));

console.log('— verify ' + (fail ? 'FAILED' : 'PASSED') + ' —');
process.exit(fail);
