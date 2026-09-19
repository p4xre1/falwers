'use strict';
/* ============================================================
   Rose by Marry v2 — shared UI kit (art, chrome, widgets)
   ============================================================ */

/* ---------- DOM helpers ---------- */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.from((r || document).querySelectorAll(s)); }
/* Parse a trusted HTML string (widget markup, procedural art, icons) into nodes.
   Never feed it user input — everything user-supplied goes through sanitize(). */
function htmlFrag(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html == null ? '' : html);
  return tpl.content;
}
/* Widget markup the UI kit generates itself. Kept as a narrow allow-list so a
   stray user string can never be re-parsed as HTML. */
var TRUSTED_MARKUP = /^\s*<(svg|span|code|b|i|em|strong|br)\b/i;
function el(tag, attrs) {
  const n = document.createElement(tag);
  if (attrs) for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (let i = 2; i < arguments.length; i++) {
    const kid = arguments[i];
    if (kid == null || kid === false) continue;
    if (kid.nodeType) n.append(kid);
    /* guard: an HTML string child must become markup, never literal on-screen code */
    else if (typeof kid === 'string' && TRUSTED_MARKUP.test(kid)) n.append(htmlFrag(kid));
    else n.append(document.createTextNode(String(kid)));
  }
  return n;
}

/* ---------- toasts / modals ---------- */
function toast(msg, kind) {
  const box = $('#toasts');
  if (!box) return;
  const tt = el('div', { class: 'toast' + (kind ? ' ' + kind : '') }, msg);
  box.append(tt);
  setTimeout(() => { tt.style.opacity = '0'; tt.style.transition = 'opacity .4s'; setTimeout(() => tt.remove(), 420); }, 2600);
}
function openModal(id) { $('#' + id).classList.add('open'); const f = $('#' + id).querySelector('input,textarea,select,button:not(.m-close)'); if (f) setTimeout(() => f.focus(), 60); }
function closeModal(id) { $('#' + id).classList.remove('open'); }
function confirmDlg(msg) {
  return new Promise(res => {
    $('#cfMsg').textContent = msg;
    openModal('cfModal');
    const ok = $('#cfOk'), cancel = $('#cfCancel'), bk = $('#cfModal');
    function done(v) { ok.onclick = null; cancel.onclick = null; bk.onclick = null; closeModal('cfModal'); res(v); }
    ok.onclick = () => done(true);
    cancel.onclick = () => done(false);
    bk.onclick = e => { if (e.target === bk) done(false); };
  });
}
async function copyText(txt) {
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(txt); toast(t('toast_copy_ok'), 'ok'); return; } } catch (e) {}
  try {
    const ta = el('textarea', { style: { position: 'fixed', opacity: '0' } });
    ta.value = txt; document.body.append(ta); ta.select();
    const okR = document.execCommand('copy'); ta.remove();
    toast(okR ? t('toast_copy_ok') : t('toast_copy_err'), okR ? 'ok' : 'err');
  } catch (e) { toast(t('toast_copy_err'), 'err'); }
}

/* ---------- procedural rose art ---------- */
function petalPath(L) {
  return 'M0 5 C ' + (-L * .46).toFixed(2) + ' ' + (-L * .22).toFixed(2) + ', ' + (-L * .42).toFixed(2) + ' ' + (-L * .88).toFixed(2) + ', 0 ' + (-L).toFixed(2) +
         ' C ' + (L * .42).toFixed(2) + ' ' + (-L * .88).toFixed(2) + ', ' + (L * .46).toFixed(2) + ' ' + (-L * .22).toFixed(2) + ', 0 5 Z';
}
function ring(n, L, off, g, gid) {
  let s = '';
  for (let i = 0; i < n; i++) s += '<path d="' + petalPath(L) + '" transform="rotate(' + (off + i * 360 / n).toFixed(1) + ')" fill="url(#' + g + gid + ')" stroke="rgba(70,8,22,.18)" stroke-width=".7"/>';
  return s;
}
let ART_SEQ = 0;
/* self-contained rose with its own gradients (safe to reuse many times per page) */
function roseArt(hex, sizeClass) {
  const k = 'a' + (++ART_SEQ);
  const o1 = lighten(hex, .42), o2 = hex, m1 = lighten(hex, .16), m2 = darken(hex, .18),
        i1 = darken(hex, .10), i2 = darken(hex, .36), c1 = darken(hex, .32), c2 = darken(hex, .50);
  return '<svg viewBox="-60 -60 120 120" class="' + (sizeClass || '') + '" aria-hidden="true">'
    + '<defs>'
    + '<radialGradient id="o' + k + '" cx="35%" cy="30%" r="85%"><stop offset="0" stop-color="' + o1 + '"/><stop offset="1" stop-color="' + o2 + '"/></radialGradient>'
    + '<radialGradient id="m' + k + '" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="' + m1 + '"/><stop offset="1" stop-color="' + m2 + '"/></radialGradient>'
    + '<radialGradient id="i' + k + '" cx="45%" cy="40%" r="75%"><stop offset="0" stop-color="' + i1 + '"/><stop offset="1" stop-color="' + i2 + '"/></radialGradient>'
    + '<radialGradient id="c' + k + '" cx="45%" cy="40%" r="75%"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></radialGradient>'
    + '<radialGradient id="h' + k + '" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
    + '</defs>'
    + ring(8, 54, 0, 'o', k)
    + '<circle r="30" fill="url(#h' + k + ')" opacity=".28"/>'
    + ring(6, 38, 25, 'm', k)
    + '<circle r="21" fill="url(#h' + k + ')" opacity=".22"/>'
    + ring(5, 24, 12, 'i', k)
    + '<circle r="8.5" fill="url(#c' + k + ')"/>'
    + '<path d="M0 -5 A5 5 0 1 1 -5 0 A7 7 0 1 0 7 0" fill="none" stroke="rgba(255,255,255,.30)" stroke-width="2" stroke-linecap="round"/>'
    + '</svg>';
}
function brandRoseSVG(size) {
  return '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '" aria-hidden="true">'
    + '<g transform="translate(32 30)">'
    + ring(8, 26, 8, 'o', 'BR').replace(/stroke="rgba\(70,8,22,\.18\)" stroke-width="\.7"/g, 'stroke="rgba(70,8,22,.25)" stroke-width="1"')
    + ring(6, 18, 30, 'm', 'BR').replace(/stroke="rgba\(70,8,22,\.18\)" stroke-width="\.7"/g, 'stroke="rgba(70,8,22,.25)" stroke-width="1"')
    + ring(5, 11, 14, 'i', 'BR').replace(/stroke="rgba\(70,8,22,\.18\)" stroke-width="\.7"/g, 'stroke="rgba(70,8,22,.25)" stroke-width="1"')
    + '<circle r="4.5" fill="url(#cBR)"/>'
    + '</g>'
    + '<path d="M32 40 C 30 50 26 56 20 60" stroke="#5F8F72" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + '<path d="M31 50 C 24 46 20 47 15 52 C 21 55 27 54 31 50 Z" fill="#7FA98B"/>'
    + '</svg>';
}
/* fixed brand gradient defs injected once per page */
function injectBrandDefs() {
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML = '<svg width="0" height="0" aria-hidden="true"><defs>'
    + '<radialGradient id="oBR" cx="35%" cy="30%" r="85%"><stop offset="0" stop-color="#F291A2"/><stop offset="1" stop-color="#C8102E"/></radialGradient>'
    + '<radialGradient id="mBR" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="#D9556C"/><stop offset="1" stop-color="#A50D26"/></radialGradient>'
    + '<radialGradient id="iBR" cx="45%" cy="40%" r="75%"><stop offset="0" stop-color="#B01028"/><stop offset="1" stop-color="#7A0A1D"/></radialGradient>'
    + '<radialGradient id="cBR" cx="45%" cy="40%" r="75%"><stop offset="0" stop-color="#8E0C21"/><stop offset="1" stop-color="#5E0816"/></radialGradient>'
    + '</defs></svg>';
  document.body.prepend(d);
}
function bouquetLayout(n) {
  const pts = [{ x: 0, y: 0 }];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 1; i < n; i++) { const r = 100 * Math.sqrt(i / n), a = i * golden; pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r }); }
  return pts;
}
function bouquetArt(hex, count, withPaper) {
  const N = clampNum(Math.round(count), 1, 36);
  const pts = bouquetLayout(N);
  const spread = N === 1 ? 0 : Math.min(88, 32 + Math.sqrt(N) * 11);
  const scale = N === 1 ? 1.22 : Math.max(.235, 1.0 / Math.sqrt(N / 1.6));
  const roseMini = roseArt(hex).replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
  let leaves = '';
  const la = [-155, -118, -64, -26, 12, 55];
  for (let i = 0; i < la.length; i++) leaves += '<path d="M0 0 C 16 -11 40 -13 56 -3 C 40 9 16 9 0 0 Z" transform="translate(150 126) rotate(' + (la[i] + (i % 2 ? 7 : -5)) + ')" fill="' + (i % 2 ? '#7FA98B' : '#5F8F72') + '" opacity=".92"/>';
  let roses = '';
  for (let i = 0; i < pts.length; i++) {
    const x = (150 + pts[i].x * spread).toFixed(1), y = (118 + pts[i].y * spread * .82).toFixed(1);
    roses += '<g transform="translate(' + x + ' ' + y + ') scale(' + scale.toFixed(3) + ')">' + roseMini + '</g>';
  }
  const paper = withPaper === false ? '' :
    '<ellipse cx="150" cy="262" rx="78" ry="9" fill="rgba(128,0,32,.10)"/>'
    + '<path d="M150 262 L54 134 Q150 66 246 134 Z" fill="#F9D9E0"/>'
    + '<path d="M150 262 L78 146 L150 204 L222 146 Z" fill="#F3BFCD"/>'
    + '<path d="M150 262 L98 156 L150 212 L202 156 Z" fill="#FBDCE4" opacity=".9"/>'
    + '<path d="M116 194 Q150 213 184 194 L189 209 Q150 230 111 209 Z" fill="#800020"/>'
    + '<ellipse cx="138" cy="205" rx="11" ry="7" fill="#A9203E" transform="rotate(-18 138 205)"/>'
    + '<ellipse cx="162" cy="205" rx="11" ry="7" fill="#A9203E" transform="rotate(18 162 205)"/>'
    + '<circle cx="150" cy="206" r="5.5" fill="#6d001b"/>';
  return '<svg viewBox="0 0 300 278" style="width:100%;height:auto;display:block" aria-hidden="true">' + paper + leaves + roses + '</svg>';
}
function boxArt(hex, n) {
  const N = clampNum(Math.round(n) || 9, 1, 36);
  const cols = Math.ceil(Math.sqrt(N)), rows = Math.ceil(N / cols);
  const roseMini = roseArt(hex).replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
  let roses = '';
  const cx = 150, cy = 138, cw = 168, ch = 118;
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    const x = cx - cw / 2 + (c + .5) * (cw / cols);
    const y = cy - ch / 2 + (r + .5) * (ch / rows);
    const sc = Math.min(cw / cols, ch / rows) / 118;
    roses += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + sc.toFixed(3) + ')">' + roseMini + '</g>';
  }
  return '<svg viewBox="0 0 300 278" style="width:100%;height:auto;display:block" aria-hidden="true">'
    + '<ellipse cx="150" cy="256" rx="100" ry="10" fill="rgba(128,0,32,.10)"/>'
    + '<rect x="42" y="76" rx="18" width="216" height="172" fill="#F3BFCD"/>'
    + '<rect x="42" y="76" rx="18" width="216" height="34" fill="#EBAFC0"/>'
    + '<rect x="52" y="86" rx="14" width="196" height="118" fill="#800020"/>'
    + roses
    + '<path d="M150 194 L128 216 L150 236 L172 216 Z" fill="#F9D9E0"/>'
    + '<circle cx="150" cy="216" r="7" fill="#fff"/>'
    + '<path d="M42 150 Q26 158 20 172 M258 150 Q274 158 280 172" stroke="#EBAFC0" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + '</svg>';
}
function singleArt(hex) {
  const roseMini = roseArt(hex, '');
  return '<svg viewBox="0 0 300 278" style="width:100%;height:auto;display:block" aria-hidden="true">'
    + '<path d="M150 150 C 148 190 142 226 128 258" stroke="#5F8F72" stroke-width="6" fill="none" stroke-linecap="round"/>'
    + '<path d="M148 200 C 118 186 96 190 78 210 C 102 222 132 216 148 200 Z" fill="#7FA98B"/>'
    + '<path d="M149 226 C 176 212 198 216 214 234 C 192 246 164 242 149 226 Z" fill="#5F8F72"/>'
    + '<g transform="translate(150 92) scale(1.25)">' + roseMini.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '') + '</g>'
    + '<ellipse cx="150" cy="262" rx="66" ry="8" fill="rgba(128,0,32,.10)"/>'
    + '</svg>';
}
function giftArt(hex) {
  const roseMini = roseArt(hex).replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
  return '<svg viewBox="0 0 300 278" style="width:100%;height:auto;display:block" aria-hidden="true">'
    + '<ellipse cx="150" cy="254" rx="96" ry="10" fill="rgba(128,0,32,.10)"/>'
    + '<rect x="56" y="120" width="188" height="124" rx="14" fill="#F3BFCD"/>'
    + '<rect x="56" y="120" width="188" height="30" rx="14" fill="#EBAFC0"/>'
    + '<rect x="138" y="120" width="24" height="124" fill="#800020"/>'
    + '<rect x="56" y="168" width="188" height="22" fill="#A9203E"/>'
    + '<path d="M150 118 C 120 96 96 100 90 116 C 104 128 132 128 150 118 Z" fill="#F9D9E0"/>'
    + '<path d="M150 118 C 180 96 204 100 210 116 C 196 128 168 128 150 118 Z" fill="#F9D9E0"/>'
    + '<g transform="translate(150 76) scale(.62)">' + roseMini + '</g>'
    + '</svg>';
}
function productArt(p, hex) {
  const c = hex || '#C8102E';
  if (p.type === 'box') return boxArt(c, p.qty);
  if (p.type === 'single') return singleArt(c);
  if (p.type === 'gift') return giftArt(c);
  return bouquetArt(c, p.qty || 9, true);
}

/* ---------- widgets ---------- */
function starsHTML(avg) {
  const full = Math.round(avg);
  let s = '';
  for (let i = 1; i <= 5; i++) s += i <= full ? '✦' : '✧';
  return '<span class="stars" aria-hidden="true">' + s + '</span>';
}
/* DOM twin of starsHTML() — use this with el()/append() so the star row is real
   markup instead of printed source code. */
function starsEl(avg) {
  const w = document.createElement('div');
  w.innerHTML = starsHTML(Number(avg) || 0);
  return w.firstElementChild;
}
/* DOM twin of heartSvg. */
function heartEl() {
  const w = document.createElement('div');
  w.innerHTML = heartSvg;
  return w.firstElementChild;
}
var heartSvg = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5C7 16.5 3.5 13.2 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.9 4 2.2C12.9 5.9 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.6-3.5 6.9-8.5 10.9Z"/></svg>';
var LINKS = {
  home: '/',
  shop: 'shop.html',
  product: function (p) {
    if (!p) return 'product.html?id=';
    /* canonical URL = slug (falls back to a freshly computed one for state saved
       before slugs existed, then to the raw id) */
    const key = p.slug || slugify(p.fr || p.en || p.ar || p.id) || p.id;
    return 'product.html?id=' + encodeURIComponent(key);
  },
  cart: 'cart.html',
  checkout: 'checkout.html',
  wishlist: 'wishlist.html',
  track: 'track.html',
  about: 'about.html',
  contact: 'contact.html',
  admin: 'admin/index.html'
};
function productUrl(p) { return LINKS.product(p); }
function themeIconSvg() {
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  return light
    ? '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>'
    : '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"/></svg>';
}
function applyTheme(t) {
  if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  try { store.set('rbm_theme', t); } catch (e) {}
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', t === 'light' ? '#FFFFFF' : '#141014');
  const tb = $('#themeBtn');
  if (tb) { tb.innerHTML = themeIconSvg(); tb.title = t('theme_t'); tb.setAttribute('aria-label', t('theme_t')); }
}
function toggleTheme() {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
}
var _tsv = (typeof debounce === 'function') ? debounce(saveState, 900) : saveState;
function trackVisit() {
  try {
    const pg = document.body.dataset.page || '';
    if (!pg || pg.indexOf('admin') === 0) return;
    let q = '';
    if (pg === 'product') { try { q = sanitize(new URL(location.href).searchParams.get('id') || '', 60); } catch (e) {} }
    S.pageviews = S.pageviews || {};
    S.pageviews[pg === 'product' ? 'product:' + q : pg] = (S.pageviews[pg === 'product' ? 'product:' + q : pg] || 0) + 1;
    if (pg === 'product') {
      const p = prodBySlug(q);
      if (p) { S.prodViews = S.prodViews || {}; S.prodViews[p.id] = (S.prodViews[p.id] || 0) + 1; }
    }
    _tsv();
  } catch (e) {}
}
function badgeHTML(p) {
  if (!p.badge) return '';
  const key = p.badge === 'new' ? 'badge_new' : p.badge === 'best' ? 'badge_best' : 'badge_promo';
  return '<span class="badge-f ' + p.badge + '">' + t(key) + '</span>';
}
function wishBtnHTML(pid) {
  const on = WISH.has(pid);
  return '<button class="icon-heart' + (on ? ' on' : '') + '" data-wish="' + pid + '" aria-label="wishlist" title="wishlist">' + heartSvg + '</button>';
}
function productCard(p) {
  const rating = prodRating(p.id);
  const card = el('div', { class: 'pcard' });
  const availColors = S.colors.filter(c => c.available);
  card.innerHTML =
    badgeHTML(p)
    + '<a class="pc-art" href="' + productUrl(p) + '" aria-label="' + prodName(p) + '">' + productArt(p, (availColors[0] || S.colors[0] || { hex: '#C8102E' }).hex).replace('<svg ', '<svg data-art="1" ') + '</a>'
    + (availColors.length > 1
      ? '<div class="pc-dots">' + availColors.map((c, i) =>
          '<button type="button" class="cdot' + (i === 0 ? ' on' : '') + '" data-cdot="' + c.hex + '" data-pid="' + p.id + '" aria-label="' + colorName(c) + '" title="' + colorName(c) + '" style="background:linear-gradient(145deg,' + lighten(c.hex, .32) + ',' + c.hex + ' 62%,' + darken(c.hex, .16) + ')"></button>'
        ).join('') + '</div>'
      : '')
    + '<div class="pc-body">'
    + '<span class="pc-cat">' + catName(S.categories.find(c => c.id === p.cat) || { ar: '' }) + '</span>'
    + '<a class="pc-name" href="' + productUrl(p) + '">' + prodName(p) + '</a>'
    + '<span class="pc-rate">' + starsHTML(rating.avg) + '<span>' + (rating.n ? rating.avg.toFixed(1) : '—') + '</span></span>'
    + '<span class="pc-price"><span class="np">' + money(p.price) + '</span>' + (p.old > p.price ? '<span class="op">' + money(p.old) + '</span><span class="save-pct">' + tf('save_pct', { n: String(Math.round((1 - p.price / p.old) * 100)) }) + '</span>' : '') + '</span>'
    + '<div class="pc-actions">'
    + '<button class="btn btn-primary" data-add="' + p.id + '">' + t('add_cart_s') + '</button>'
    + wishBtnHTML(p.id)
    + '</div></div>';
  return card;
}
/* delegate: add-to-cart quick button + wishlist hearts (event delegation, XSS-safe) */
function bindCardActions(container, colorResolver) {
  if (container.__cardBound) return;
  container.__cardBound = true;
  container.addEventListener('click', async e => {
    const dot = e.target.closest('[data-cdot]');
    if (dot) {
      const card = dot.closest('.pcard');
      const p = prodById(dot.getAttribute('data-pid'));
      if (card && p) {
        const art = card.querySelector('.pc-art');
        if (art) art.innerHTML = productArt(p, dot.getAttribute('data-cdot')).replace('<svg ', '<svg data-art="1" ');
        $$('.cdot', card).forEach(b => b.classList.toggle('on', b === dot));
      }
      return;
    }
    const heart = e.target.closest('[data-wish]');
    if (heart) {
      const pid = heart.getAttribute('data-wish');
      const on = WISH.toggle(pid);
      $$('[data-wish="' + pid + '"]').forEach(b => b.classList.toggle('on', on));
      toast(on ? t('wishlist_added') : t('wishlist_removed'));
      updateBadges();
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add) {
      const pid = add.getAttribute('data-add');
      const p = prodById(pid);
      if (!p) return;
      let c = colorResolver ? colorResolver(p) : null;
      if (!c) {
        const card2 = add.closest('.pcard');
        const on = card2 ? card2.querySelector('.cdot.on') : null;
        if (on) c = S.colors.find(x => x.available && x.hex === on.getAttribute('data-cdot'));
      }
      if (!c) c = S.colors.find(x => x.available) || S.colors[0];
      CART.add({ key: uid(), pid: p.id, colorId: c ? c.id : null, qty: 1, addons: [], note: '' });
      updateBadges();
      toast(t('added_to_cart'), 'ok');
    }
  });
}

/* ---------- analytics (GA4, consent-gated, CMS-configured) ---------- */
function gaLoad(gid) {
  if (window.__rbmGaLoaded) return;
  window.__rbmGaLoaded = true;
  try {
    const sc = document.createElement('script');
    sc.async = true;
    sc.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gid);
    document.head.append(sc);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gid, {});
  } catch (e) {}
}
function consentBarShow(gid) {
  if ($('#consentBar')) return;
  const bar = el('div', { class: 'consent-bar', id: 'consentBar', role: 'dialog', 'aria-label': 'cookies' },
    el('span', { class: 'cx-t' }, t('cx_text')),
    el('span', { class: 'cx-actions' },
      el('a', { class: 'cx-link', href: 'privacy.html' }, t('foot_priv')),
      el('button', { class: 'btn btn-sm', id: 'cxNo', type: 'button' }, t('cx_no')),
      el('button', { class: 'btn btn-primary btn-sm', id: 'cxYes', type: 'button' }, t('cx_yes'))));
  document.body.append(bar);
  $('#cxYes').addEventListener('click', () => { try { localStorage.setItem('rbm_consent', 'yes'); } catch (e) {} bar.remove(); gaLoad(gid); });
  $('#cxNo').addEventListener('click', () => { try { localStorage.setItem('rbm_consent', 'no'); } catch (e) {} bar.remove(); });
}
function initAnalytics() {
  try {
    if (document.body.dataset.adminPage) return;
    const gid = String(S.settings.gaId || '').trim().toUpperCase();
    if (!/^G-[A-Z0-9]{6,12}$/.test(gid)) return;
    let consent = null;
    try { consent = localStorage.getItem('rbm_consent'); } catch (e) {}
    if (consent === 'yes') gaLoad(gid);
    else if (consent !== 'no') consentBarShow(gid);
  } catch (e) {}
}

/* ---------- chrome: topbar / masthead / footer ---------- */
function navLink(href, key, active) {
  return '<a href="' + href + '"' + (active ? ' class="act" aria-current="page"' : '') + '>' + t(key) + '</a>';
}
const CAT_TILE_IMG = { bouq: 'img/tile-bouq.jpg', box: 'img/tile-box.jpg', occ: 'img/tile-occ.jpg', gift: 'img/tile-gift.jpg' };
function catTileImg(c) { return CAT_TILE_IMG[c.id] || ''; }
function renderChrome(active) {
  try { applyTheme(store.get('rbm_theme') || 'dark'); } catch (e) {}
  const head = $('#siteHeader');
  if (head) {
    const lockSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    const searchSvg = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/></svg>';
    const bagSvg = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.2 12.2a1.8 1.8 0 0 1-1.8 1.6H8a1.8 1.8 0 0 1-1.8-1.6L5 8Z"/><path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10"/></svg>';
    head.innerHTML =
      '<div class="topbar"><div class="wrap topbar-in"><span>' + t('ann_bar') + '</span><span class="tb-side">' + t('ann_cod') + '</span></div></div>'
      + '<div class="masthead"><div class="wrap mast-in">'
      + '<button class="burger" id="burger" type="button" aria-label="Menu"><span></span><span></span><span></span></button>'
      + '<nav class="main-nav" id="mainNav" aria-label="Main">'
      + navLink(LINKS.home, 'nav_home', active === 'home')
      + navLink('shop.html', 'nav_shop', active === 'shop')
      + navLink('occasions.html', 'nav_occ', active === 'occasions')
      + (plg('blog') ? navLink('blog.html', 'nav_blog', active === 'blog' || active === 'article') : '')
      + navLink('track.html', 'nav_track', active === 'track')
      + navLink('about.html', 'nav_about', active === 'about')
      + navLink('contact.html', 'nav_contact', active === 'contact')
      + '</nav>'
      + '<a class="brand" href="' + LINKS.home + '" aria-label="Rose by Marry"><span class="brand-name">Rose by Marry</span><span class="brand-tag">' + t('tagline') + '</span></a>'
      + '<div class="head-icons">'
      + '<a class="icon-btn" href="search.html" aria-label="' + t('search_t') + '" title="' + t('search_t') + '">' + searchSvg + '</a>'
      + '<button class="icon-btn" id="themeBtn" type="button" aria-label="' + t('theme_t') + '" title="' + t('theme_t') + '">' + themeIconSvg() + '</button>'
      + '<span class="lang-wrap">'
      + '<button class="lang-btn" id="langBtn" type="button" aria-haspopup="true" aria-label="Language">' + lang.toUpperCase() + '</button>'
      + '<span class="lang-menu" id="langMenu">'
      + '<button type="button" data-lang="ar" class="' + (lang === 'ar' ? 'act' : '') + '">العربية</button>'
      + '<button type="button" data-lang="fr" class="' + (lang === 'fr' ? 'act' : '') + '">Français</button>'
      + '<button type="button" data-lang="en" class="' + (lang === 'en' ? 'act' : '') + '">English</button>'
      + '</span></span>'
      + '<a class="icon-btn nav-ico" href="' + LINKS.wishlist + '" aria-label="' + t('wishlist_t') + '" title="' + t('wishlist_t') + '">' + heartSvg + '<span class="bcount" id="wishCount">0</span></a>'
      + '<a class="icon-btn nav-ico" href="' + LINKS.cart + '" aria-label="' + t('cart_t') + '" title="' + t('cart_t') + '">' + bagSvg + '<span class="bcount" id="cartCount">0</span></a>'
      + '<a class="icon-btn" id="adminBtn" href="' + LINKS.admin + '" title="' + t('admin_t') + '" aria-label="' + t('admin_t') + '">' + lockSvg + '</a>'
      + '</div></div></div>';
    const tb = $('#themeBtn');
    if (tb) tb.addEventListener('click', toggleTheme);
    $('#langBtn').addEventListener('click', e => { e.stopPropagation(); $('#langMenu').classList.toggle('open'); });
    $$('#langMenu button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
    $('#burger').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    if (!window.__rbmLangDocBound) {
      window.__rbmLangDocBound = true;
      document.addEventListener('click', e => {
        const lw = $('.lang-wrap');
        if (lw && !lw.contains(e.target)) { const m = $('#langMenu'); if (m) m.classList.remove('open'); }
      });
    }
  }
  const foot = $('#siteFooter');
  if (foot) {
    foot.innerHTML =
      '<div class="wrap">'
      + '<div class="mono"><span class="fmark"></span></div>'
      + '<div class="foot-grid">'
      + '<div class="foot-links"><span class="t">' + t('foot_shop_t') + '</span>'
      + '<a href="' + LINKS.home + '">' + t('nav_home') + '</a>'
      + '<a href="' + LINKS.shop + '">' + t('nav_shop') + '</a>'
      + '<a href="occasions.html">' + t('nav_occ') + '</a>'
      + '<a href="offers.html">' + t('off_t') + '</a>'
      + '<a href="' + LINKS.home + '#builder">' + t('cta_custom') + '</a>'
      + '<a href="' + LINKS.cart + '">' + t('cart_t') + '</a>'
      + '<a href="' + LINKS.wishlist + '">' + t('wishlist_t') + '</a>'
      + '</div>'
      + '<div class="foot-links"><span class="t">' + t('foot_help_t') + '</span>'
      + '<a href="faq.html">' + t('foot_faq') + '</a>'
      + '<a href="care.html">' + t('care_t') + '</a>'
      + '<a href="size-guide.html">' + t('size_t') + '</a>'
      + '<a href="' + LINKS.track + '">' + t('nav_track') + '</a>'
      + '<a href="' + LINKS.contact + '">' + t('nav_contact') + '</a>'
      + '</div>'
      + '<div class="foot-links"><span class="t">' + t('foot_explore_t') + '</span>'
      + '<a href="blog.html">' + t('nav_blog') + '</a>'
      + '<a href="' + LINKS.about + '">' + t('nav_about') + '</a>'
      + '<a href="search.html">' + t('search_t') + '</a>'
      + '</div>'
      + '<div class="foot-links"><span class="t">' + t('foot_contact_t') + '</span>'
      + '<a href="https://wa.me/' + sanitizeDigits(S.settings.whatsapp, 16) + '" target="_blank" rel="noopener noreferrer" style="direction:ltr">+' + sanitizeDigits(S.settings.whatsapp, 16) + '</a>'
      + '<span>' + t('c_hours_d') + '</span>'
      + '<span>' + t('ann_cod') + '</span>'
      + '<span>Tanger · Maroc</span>'
      + ((S.settings.instagram || S.settings.tiktok) ? '<div class="foot-social">'
        + (S.settings.instagram ? '<a href="' + S.settings.instagram + '" target="_blank" rel="noopener noreferrer" aria-label="Instagram">' + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>' + '</a>' : '')
        + (S.settings.tiktok ? '<a href="' + S.settings.tiktok + '" target="_blank" rel="noopener noreferrer" aria-label="TikTok">' + '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.4 2.1 1.8 3.6 4 3.9v3c-1.6 0-3-.5-4-1.3v6.1c0 3.4-2.3 5.8-5.6 5.8-3.2 0-5.4-2.2-5.4-5.2 0-3 2.3-5.3 5.4-5.3.4 0 .8 0 1.1.1v3.1c-.3-.1-.7-.2-1.1-.2-1.4 0-2.4 1-2.4 2.4 0 1.3 1 2.3 2.4 2.3 1.5 0 2.6-1.1 2.6-2.9V3h3Z"/></svg>' + '</a>' : '')
        + '</div>' : '')
      + '</div>'
      + '</div>'
      + '<div class="foot-base"><span>© 2026 Rose by Marry — ' + t('foot_note') + '</span>'
      + '<span class="foot-legal"><a href="privacy.html">' + t('foot_priv') + '</a> · <a href="terms.html">' + t('foot_terms') + '</a></span>'
      + '<a class="admin-link" href="' + LINKS.admin + '">' + t('l_admin') + '</a></div>'
      + '</div>';
    const fm = foot.querySelector('.fmark');
    if (fm) fm.innerHTML = brandRoseSVG(46);
  }
  updateBadges();
}
function updateBadges() {
  const c = $('#cartCount'), w = $('#wishCount');
  if (c) { const n = CART.count(); c.textContent = String(n); c.style.display = n ? 'grid' : 'none'; }
  if (w) { w.textContent = String(WISH.ids.length); w.style.display = WISH.ids.length ? 'grid' : 'none'; }
}

/* ---------- motion ---------- */
function initReveal() {
  try {
    const io = new IntersectionObserver(entries => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }, { threshold: .08 });
    $$('.reveal').forEach(e => io.observe(e));
    /* stagger children */
    $$('[data-stagger]').forEach(w => Array.from(w.children).forEach((c, i) => { c.classList.add('reveal'); c.style.setProperty('--d', Math.min(i * 90, 720) + 'ms'); io.observe(c); }));
    /* count-up numbers */
    const co = new IntersectionObserver(ents => {
      for (const en of ents) if (en.isIntersecting) {
        co.unobserve(en.target);
        const el2 = en.target, target = parseFloat(el2.dataset.count || el2.textContent.replace(/[^0-9.]/g, '')) || 0, suf = el2.dataset.suffix || '', t0 = performance.now();
        (function tick(t) { const k = Math.min((t - t0) / 1400, 1), e2 = 1 - Math.pow(1 - k, 3); el2.textContent = String(Math.round(target * e2)) + suf; if (k < 1) requestAnimationFrame(tick); })(t0);
      }
    }, { threshold: .5 });
    $$('.count-up').forEach(e => co.observe(e));
    /* parallax layers */
    let plx = [];
    try { if (!matchMedia('(prefers-reduced-motion: reduce)').matches) plx = $$('[data-plx]'); } catch (e) {}
    if (plx.length) {
      let raf = false;
      const onScr = () => {
        if (raf) return; raf = true;
        requestAnimationFrame(() => {
          raf = false;
          const vh = innerHeight;
          for (const p of plx) {
            const r = p.getBoundingClientRect(), sp = parseFloat(p.dataset.plx) || .12;
            if (r.bottom > 0 && r.top < vh) p.style.transform = 'translate3d(0,' + (((r.top + r.height / 2) - vh / 2) * -sp).toFixed(1) + 'px,0)';
          }
        });
      };
      addEventListener('scroll', onScr, { passive: true }); onScr();
    }
    /* tilt cards */
    try {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(pointer:fine)').matches) {
        $$('.tilt').forEach(c => {
          c.addEventListener('mousemove', ev => {
            const r = c.getBoundingClientRect();
            const rx = ((ev.clientY - r.top) / r.height - .5) * -5, ry = ((ev.clientX - r.left) / r.width - .5) * 5;
            c.style.setProperty('--rx', rx.toFixed(2) + 'deg'); c.style.setProperty('--ry', ry.toFixed(2) + 'deg');
          });
          c.addEventListener('mouseleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
        });
      }
    } catch (e) {}
    /* shimmer sweep triggers */
    $$('.btn-primary, .btn-wine').forEach(b => b.classList.add('sheen'));
  } catch (e) { $$('.reveal').forEach(x => x.classList.add('in')); }
}
function startPetals() {
  try { if (!plg('petals')) return; } catch (e) {}
  try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
  const layer = $('#petals');
  if (!layer) return;
  const colors = ['#F2A0B5', '#E85A71', '#F7C2CE', '#E78095'];
  setInterval(() => {
    if (layer.children.length > 9) return;
    const size = 12 + Math.random() * 10;
    const c = colors[Math.floor(Math.random() * colors.length)];
    const d = el('div', { class: 'petal', style: { left: (3 + Math.random() * 94) + 'vw', opacity: String(.45 + Math.random() * .4), animationDuration: (9 + Math.random() * 8) + 's' } });
    d.innerHTML = '<svg width="' + size.toFixed(0) + '" height="' + (size * 1.35).toFixed(0) + '" viewBox="0 0 24 32"><path d="M12 0 C20 8 22 20 12 32 C2 20 4 8 12 0 Z" fill="' + c + '"/></svg>';
    d.addEventListener('animationend', () => d.remove());
    layer.append(d);
  }, 1400);
}
function fmtDate(ts) {
  try { return new Date(ts).toLocaleDateString(lang === 'fr' ? 'fr-MA' : lang === 'en' ? 'en-GB' : 'ar-MA'); } catch (e) { return ''; }
}
function waLink(msg) { return 'https://wa.me/' + sanitizeDigits(S.settings.whatsapp, 16) + '?text=' + encodeURIComponent(msg); }
function openWa(msg) {
  if (sanitizeDigits(S.settings.whatsapp, 16).length < 8) { toast(t('toast_wa_err'), 'err'); return; }
  const w = window.open(waLink(msg), '_blank', 'noopener');
  if (!w) toast(t('toast_wa_err'), 'err');
}

/* ---------- v9 conversion pack (sales layer) ---------- */
function plg(k) { try { return !(S.settings && S.settings.plugins && S.settings.plugins[k] === false); } catch (e) { return true; } }
function tf(k, map) { return t(k).replace(/\{(\w+)\}/g, (__, m) => (map && map[m] != null ? map[m] : '')); }
function cutoffState() { const d = new Date(); const mins = d.getHours() * 60 + d.getMinutes(); return { open: mins < 960, left: Math.max(0, 960 - mins) }; }
function cutoffText() { const c = cutoffState(); if (!c.open) return t('cut_after'); const h = Math.floor(c.left / 60), m = c.left % 60; return tf('cut_left', { t: h + 'h' + (m ? ' ' + String(m).padStart(2, '0') + 'm' : '') }); }
function freeShipBar(sub) {
  const fs = Number(S.settings.freeShip) || 0;
  const wrap = el('div', { class: 'fs-wrap' });
  if (fs <= 0) return wrap;
  const pct = Math.max(4, Math.min(100, Math.round(sub / fs * 100)));
  const row = el('div', { class: 'fs-bar' });
  const fill = el('i');
  fill.style.width = pct + '%';
  row.append(fill);
  wrap.append(row, el('p', { class: 'fs-lbl' }, sub >= fs ? t('fs_done') : tf('fs_away', { v: money(fs - sub) })));
  return wrap;
}
const SP_NAMES = ['Salma', 'Yasmine', 'Nour', 'Khadija', 'Meryem', 'Lina', 'Aya', 'Rania', 'Sara', 'Imane'];
const WA_GLYPH = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.5 14.1c-.2.7-1.3 1.3-1.9 1.4-.5.1-1.1.2-3.5-.7-2.9-1.2-4.8-4.1-4.9-4.3-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.9 1.4 1.9 2.3 1.3 1.1 2.3 1.5 2.7 1.6.3.2.5.1.7-.1l1-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .8-.3 1.6Z"/></svg>';
function initConversion(page) {
  const b = document.body;
  if (!b || (page || '').indexOf('admin') === 0) return;
  $$('.wa-float, .pd-mbar, .sp-pop, .wel-ovl').forEach(x => x.remove());
  (b.__convTimers || []).forEach(id => { clearInterval(id); clearTimeout(id); });
  b.__convTimers = [];
  const fillCut = () => $$('[data-cutoff]').forEach(n => {
    n.classList.add('cutoff-pill');
    n.textContent = '';
    n.append(el('span', { class: 'cut-dot' }), el('span', {}, cutoffText()));
    if (n.getAttribute('data-cutoff') === 'full') n.append(el('span', { class: 'cut-sep' }, '✦'), el('span', {}, t('trust_line')));
  });
  fillCut();
  b.__convTimers.push(setInterval(fillCut, 60000));
  if (plg('waFloat') && page !== 'product' && page !== 'checkout') {
    const a = el('a', { class: 'wa-float', href: waLink(t('wa_greet')), target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'WhatsApp' });
    a.innerHTML = WA_GLYPH;
    b.append(a);
  }
  if (page === 'product') {
    const tries = { n: 0 };
    const wirePd = () => {
      $$('.pd-mbar').forEach(x => x.remove());
      $$('.trust-line[data-cutoff]').forEach(x => x.remove());
      const buy = $('.pd-buy');
      if (buy) { const tl = el('p', { class: 'trust-line', 'data-cutoff': 'full' }); buy.after(tl); fillCut(); }
      const mbar = el('div', { class: 'pd-mbar' });
      const priceEl = $('.pd-price');
      const mPrice = el('span', { class: 'pd-mbar-p' }, priceEl && priceEl.children[0] ? priceEl.children[0].textContent : '');
    const addB = el('button', { class: 'btn btn-primary pd-mbar-add', type: 'button' }, t('mbar_add'));
    addB.addEventListener('click', () => { const x = $('#pdAddCart'); if (x) x.click(); });
    const waB = el('button', { class: 'pd-mbar-wa', type: 'button', 'aria-label': 'WhatsApp' });
    waB.innerHTML = WA_GLYPH;
    waB.addEventListener('click', () => { const x = $('#pdWa'); if (x) x.click(); });
    mbar.append(mPrice, addB, waB);
    b.append(mbar);
    };
    const tw = () => { if ($('.pd-price') || tries.n++ > 40) wirePd(); else b.__convTimers.push(setTimeout(tw, 60)); };
    tw();
  }
  /* abandoned-cart nudge (re-arms on every visit with a full cart) */
  const cts = Number(store.get('rbm_cart_ts') || 0);
  if (CART.count() > 0) {
    if (cts && Date.now() - cts > 14400000 && page !== 'cart' && page !== 'checkout' && !$('.cart-nudge')) {
      const nb = el('div', { class: 'cart-nudge' });
      const nx = el('button', { class: 'sp-x', type: 'button', 'aria-label': 'close' });
      nx.textContent = '\u00d7';
      nx.addEventListener('click', () => { store.set('rbm_cart_ts', String(Date.now())); nb.remove(); });
      nb.append(el('span', {}, t('nudge_t')), el('a', { class: 'btn btn-primary btn-sm', href: LINKS.cart }, t('nudge_btn')), nx);
      b.append(nb);
    }
    store.set('rbm_cart_ts', String(Date.now()));
  } else { store.del('rbm_cart_ts'); }
  if (plg('welcome') && page !== 'checkout' && !store.get('rbm_wel')) {
    const MS = Number(window.RBM_WEL_MS) || 6500;
    b.__convTimers.push(setTimeout(() => {
      if ($('.wel-ovl')) return;
      const ovl = el('div', { class: 'wel-ovl' });
      const card = el('div', { class: 'wel-card' });
      const x = el('button', { class: 'wel-x', type: 'button', 'aria-label': 'close' });
      x.textContent = '×';
      const close = () => { store.set('rbm_wel', '1'); ovl.classList.remove('show'); setTimeout(() => ovl.remove(), 350); };
      x.addEventListener('click', close);
      ovl.addEventListener('click', e => { if (e.target === ovl) close(); });
      const star = el('div', { class: 'wel-star' });
      star.innerHTML = brandRoseSVG(46);
      const codeRow = el('div', { class: 'wel-code' });
      const chip = el('code', { class: 'wel-chip' }, 'ROSE10');
      const cp = el('button', { class: 'btn btn-outline btn-sm', type: 'button' }, t('wel_copy'));
      cp.addEventListener('click', () => { try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText('ROSE10'); } catch (e) {} toast(t('wel_ok'), 'ok'); });
      codeRow.append(chip, cp);
      const cta = el('a', { class: 'btn btn-primary wel-cta', href: 'shop.html' }, t('wel_cta'));
      cta.addEventListener('click', close);
      card.append(x, star, el('h3', { class: 'wel-h' }, t('wel_t')), el('p', { class: 'wel-d' }, t('wel_d')), codeRow, cta);
      ovl.append(card);
      b.append(ovl);
      requestAnimationFrame(() => ovl.classList.add('show'));
    }, MS));
  }
  if (plg('proof') && page !== 'checkout') {
    const off = Number(store.get('rbm_sp_off') || 0);
    if (!(off && Date.now() - off < 86400000)) {
      const MS = Number(window.RBM_SP_MS) || 13000;
      b.__convTimers.push(setInterval(() => {
        if (document.hidden || $('.sp-pop') || $('.wel-ovl')) return;
        const ps = S.products.filter(x => x.active);
        if (!ps.length) return;
        const p = ps[Math.floor(Math.random() * ps.length)];
        const pop = el('div', { class: 'sp-pop' });
        const xt = el('button', { class: 'sp-x', type: 'button', 'aria-label': 'close' });
        xt.textContent = '×';
        xt.addEventListener('click', () => { store.set('rbm_sp_off', String(Date.now())); pop.classList.remove('show'); setTimeout(() => pop.remove(), 400); });
        const ic = el('span', { class: 'sp-ic' });
        ic.innerHTML = brandRoseSVG(20);
        const tx = el('div', { class: 'sp-tx' });
        tx.append(
          el('b', {}, SP_NAMES[Math.floor(Math.random() * SP_NAMES.length)] + ' ' + t('sp_from')),
          el('span', {}, tf('sp_bought', { p: prodName(p) })),
          el('span', { class: 'sp-time' }, tf('sp_min', { n: String(3 + Math.floor(Math.random() * 45)) }))
        );
        pop.append(ic, tx, xt);
        b.append(pop);
        requestAnimationFrame(() => pop.classList.add('show'));
        setTimeout(() => { if (pop.parentNode) { pop.classList.remove('show'); setTimeout(() => pop.remove(), 450); } }, 7000);
      }, MS));
    }
  }
  window.RBM_CONV_REFRESH = () => initConversion(page);
  try {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && (page || '').indexOf('admin') !== 0 && !window.__rbmSwReg) {
      window.__rbmSwReg = true;
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  } catch (e) {}
}
