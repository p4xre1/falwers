'use strict';
/* ============================================================
   Rose by Marry — Admin CMS (multi-page)
   Shared shell: gate, sidebar, per-page controllers.
   Pages: analytics, orders, reviews, colors, products,
          marketing, customers, settings
   ============================================================ */

const ADMIN_PAGE = (document.body && document.body.dataset.adminPage) || 'index';
const ADMIN_PAGES = [
  { id: 'index',     href: 'index.html',     key: 'tab_dash' },
  { id: 'orders',    href: 'orders.html',    key: 'tab_orders', badge: true },
  { id: 'discounts', href: 'discounts.html', key: 'disc_t' },
  { id: 'reviews',   href: 'reviews.html',   key: 'tab_reviews' },
  { id: 'colors',    href: 'colors.html',    key: 'tab_colors' },
  { id: 'products',  href: 'products.html',  key: 'tab_products' },
  { id: 'blog',      href: 'blog.html',      key: 'tab_blog' },
  { id: 'marketing', href: 'marketing.html', key: 'tab_mark' },
  { id: 'customers', href: 'customers.html', key: 'tab_cust' },
  { id: 'interests', href: 'interests.html', key: 'tab_interest' },
  { id: 'faq',       href: 'faq.html',       key: 'faqadm_t' },
  { id: 'plugins',   href: 'plugins.html',   key: 'plg_t' },
  { id: 'mcp',       href: 'mcp.html',       key: 'mcp_t' },
  { id: 'aiseo',     href: 'ai-seo.html',    key: 'aip_t' },
  { id: 'settings',  href: 'settings.html',  key: 'tab_settings' }
];

/* ---------- gate / session ---------- */
let pcAttempts = 0;
function isUnlocked() {
  try { if (sessionStorage.getItem('rbm_admin') === '1' && Date.now() - (Number(sessionStorage.getItem('rbm_admin_ts')) || 0) < 28800000) return true; } catch (e) {}
  try { if (localStorage.getItem('rbm_admin_kb') === '1') return true; } catch (e) {}
  return MEM.__admin === 1;
}
function setUnlocked() {
  MEM.__admin = 1;
  try { sessionStorage.setItem('rbm_admin', '1'); sessionStorage.setItem('rbm_admin_ts', String(Date.now())); } catch (e) {}
  try { localStorage.setItem('rbm_admin_kb', '1'); } catch (e) {}
}
function clearUnlocked() {
  delete MEM.__admin;
  try { sessionStorage.removeItem('rbm_admin'); } catch (e) {}
  try { localStorage.removeItem('rbm_admin_kb'); } catch (e) {}
}
function lockUntil() { return Number(store.get('rbm_lock')) || 0; }
function lockLevel() { return clampNum(Math.round(Number(store.get('rbm_lock_lv'))) || 0, 0, 6); }
function showPcErr(msg) { const e = $('#pcErr'); e.textContent = msg; e.classList.remove('show'); void e.offsetWidth; e.classList.add('show'); }
function sessionAge() { return Date.now() - (Number(sessionStorage.getItem('rbm_admin_ts')) || 0); }
function isUnlocked2() {
  try { if (sessionStorage.getItem('rbm_admin') === '1' && sessionAge() < 28800000) return true; } catch (e) {}
  return false;
}
function tryLogin() {
  if (Date.now() < lockUntil()) { showPcErr(t('pc_wait')); return; }
  /* anti-script: honeypot must be empty and the form must have been visible >= 1.2s */
  const hp = $('#pc_web');
  const t0 = Number($('#pc_ts').value) || 0;
  if (hp && hp.value) { store.set('rbm_lock', String(Date.now() + 60000)); store.set('rbm_lock_lv', String(lockLevel() + 1)); showPcErr(t('pc_wait')); return; }
  if (t0 && Date.now() - t0 < 1200) { showPcErr(t('pc_err')); return; }
  const user = sanitize($('#pcUser').value, 30).toLowerCase();
  const pass = $('#pcInput').value;
  if (!user || !pass) { showPcErr(t('pc_err')); return; }
  hashPass(pass).then(h => {
    const wantUser = sanitize(S.settings.adminUser || 'marry', 30).toLowerCase();
    if (user === wantUser && h === S.settings.passHash) {
      pcAttempts = 0; $('#pcInput').value = ''; $('#pcErr').classList.remove('show');
      S.settings.lastLogin = Date.now(); S.settings.failCount = 0; saveState();
      store.del('rbm_lock'); store.del('rbm_lock_lv');
      setUnlocked(); closeModal('pcModal'); openContent();
    } else {
      pcAttempts++;
      S.settings.failCount = clampNum((S.settings.failCount || 0) + 1, 0, 9999); saveState();
      if (pcAttempts >= 3) {
        const lv = lockLevel() + 1;
        store.set('rbm_lock_lv', String(lv));
        store.set('rbm_lock', String(Date.now() + Math.min(30000 * Math.pow(2, lv - 1), 900000)));
        pcAttempts = 0; showPcErr(t('pc_wait'));
      } else showPcErr(t('pc_err'));
    }
  }).catch(function () { showPcErr(t('pc_err')); });
}
function lockAdmin() { clearUnlocked(); location.reload(); }

/* ---------- shell ---------- */
function updateOrdBadge() {
  const n = S.orders.filter(o => o.status === 'new').length;
  const b = $('#ordCountBadge');
  if (!b) return;
  b.textContent = String(n);
  b.classList.toggle('hidden', n === 0);
}
function renderShell() {
  const head = $('#adHead');
  head.innerHTML =
    '<span class="brand-mark" id="adRose"></span>'
    + '<h2>Rose by Marry — <span data-i18n="ad_t"></span><span class="sub" data-i18n="ad_sub"></span></h2>'
    + '<button class="ad-btn" id="adLang" type="button">' + lang.toUpperCase() + '</button>'
    + '<button class="ad-btn" id="adView" type="button"><span data-i18n="btn_view"></span></button>'
    + '<button class="ad-btn" id="adLock" type="button"><span data-i18n="btn_lock"></span></button>';
  const side = $('#adSide');
  side.innerHTML = ADMIN_PAGES.map(p =>
    '<a class="ad-tab" data-nav="' + p.id + '" href="' + p.href + '"><span>' + t(p.key) + '</span>'
    + (p.badge ? '<span class="cnt hidden" id="ordCountBadge">0</span>' : '') + '</a>'
  ).join('');
  $$('#adSide .ad-tab').forEach(a => { if (a.dataset.nav === ADMIN_PAGE) a.classList.add('act'); });
  $('#adRose').innerHTML = brandRoseSVG(40);
}
function bindHeader() {
  const v = $('#adView'), l = $('#adLock'), g = $('#adLang');
  if (v) v.onclick = () => { location.href = '/'; };
  if (l) l.onclick = lockAdmin;
  if (g) g.onclick = () => {
    const next = lang === 'ar' ? 'fr' : lang === 'fr' ? 'en' : 'ar';
    setLang(next);
    g.textContent = next.toUpperCase();
  };
}
function bindShell() {
  $('#pcGo').addEventListener('click', tryLogin);
  $('#pcInput').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
  $('#pcUser').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
  bindHeader();
  $$('.m-close').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));
  $$('.mbk').forEach(bk => bk.addEventListener('click', e => { if (e.target === bk && bk.id !== 'cfModal') closeModal(bk.id); }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const cf = $('#cfModal');
      if (cf.classList.contains('open')) { $('#cfCancel').click(); return; }
      $$('.mbk.open').forEach(m => closeModal(m.id));
    }
  });
}
function openContent() {
  document.body.classList.remove('gated');
  try {
    applyStaticText();
    renderShell();
    bindHeader();
    const pane = $('.pane.act');
    if (pane && !pane.children.length && window.RBM_PANE_SHELL) pane.innerHTML = window.RBM_PANE_SHELL;
    (PAGE_INIT[ADMIN_PAGE] || function () {})();
    window.RBM_RERENDER = function () { openContent(); };
    updateOrdBadge();
  } catch (err) {
    try {
      const pane = $('.pane.act');
      if (pane) {
        pane.innerHTML = '';
        pane.append(el('div', { class: 'set-card' },
          el('h4', {}, 'Render error'),
          el('p', { class: 'hintline' }, String(err && err.message || err)),
          el('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => location.reload() }, 'Reload')));
      }
    } catch (e2) {}
  }
}

/* ---------- shared admin helpers ---------- */
function saveAndRefresh() { saveState(); updateOrdBadge(); }
const saveAndRefreshDebounced = debounce(saveAndRefresh, 350);
function delBtn(title, fn) {
  return el('button', { class: 'del-btn', type: 'button', title, 'aria-label': title, onclick: async () => { if (await confirmDlg(title)) { fn(); toast(t('toast_deleted')); } } }, '×');
}
function labelWrap(lbl, input) { const w = el('div'); w.append(el('span', { class: 'hintline' }, lbl), input); return w; }
function checkbox(labelKey, get, set, rerender) {
  const lb = el('label', { class: 'hintline', style: { display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' } });
  const chk = el('input', { type: 'checkbox' }); chk.checked = !!get();
  chk.addEventListener('change', () => { set(chk.checked); saveAndRefresh(); if (rerender) rerender(); });
  lb.append(chk, document.createTextNode(t(labelKey)));
  return lb;
}
const ORD_STATUS = ['new', 'confirmed', 'delivered', 'cancelled'];
function ordStatusLabel(st) { return t(st === 'new' ? 'st_new' : st === 'confirmed' ? 'st_conf' : st === 'delivered' ? 'st_del' : 'st_can'); }
function ordStatusBadge(st) {
  const cls = { new: 'st-new', confirmed: 'st-conf', delivered: 'st-del', cancelled: 'st-new' }[st] || 'st-new';
  return el('span', { class: 'badge ' + cls }, ordStatusLabel(st));
}
function suggestedSiteUrl() { try { if (location.protocol === 'http:' || location.protocol === 'https:') return location.origin + '/'; } catch (e) {} return 'https://rose-by-marry.com'; }

/* ============================================================
   PAGE: analytics (index)
   ============================================================ */
function pageDash() {
  function render() {
    const orders = S.orders;
    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const customers = {};
    for (const o of orders) { const k = o.phone || o.name; customers[k] = true; }
    const avg = orders.length ? Math.round(revenue / orders.length) : 0;
    const kpis = $('#kpis');
    if (!kpis) return;
    kpis.textContent = '';
    [[money(revenue), t('kpi_rev')], [String(orders.length), t('kpi_ord')], [money(avg), t('kpi_avg')], [String(Object.keys(customers).length), t('kpi_cust')]]
      .forEach(kv => kpis.append(el('div', { class: 'kpi' }, el('div', { class: 'kv' }, kv[0]), el('div', { class: 'kl' }, kv[1]))));
    chartOrders(orders); chartCats(orders); chartStatus(orders); chartTop(orders);
  }
  function chartOrders(orders) {
    const box = $('#chOrders');
    if (!box) return;
    box.textContent = '';
    if (!orders.length) { box.append(el('p', { class: 'empty' }, t('no_data'))); return; }
    const days = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); days.push({ k: d.toISOString().slice(0, 10), n: 0 }); }
    for (const o of orders) { const k = new Date(o.ts).toISOString().slice(0, 10); const day = days.find(x => x.k === k); if (day) day.n++; }
    const W = 460, H = 170, pad = 24;
    const max = Math.max(1, ...days.map(d => d.n));
    const step = (W - pad * 2) / (days.length - 1);
    const pts = days.map((d, i) => [pad + i * step, H - pad - (H - pad * 2.2) * (d.n / max)]);
    const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = path + ' L ' + pts[pts.length - 1][0].toFixed(1) + ' ' + (H - pad) + ' L ' + pts[0][0].toFixed(1) + ' ' + (H - pad) + ' Z';
    let dots = '', labels = '';
    days.forEach((d, i) => {
      if (d.n) dots += '<circle cx="' + pts[i][0].toFixed(1) + '" cy="' + pts[i][1].toFixed(1) + '" r="3.4" fill="#8A2438"/>';
      if (i % 3 === 0 || i === days.length - 1) labels += '<text x="' + pts[i][0].toFixed(1) + '" y="' + (H - 6) + '" font-size="8.5" fill="#8B7D7B" text-anchor="middle">' + d.k.slice(5) + '</text>';
    });
    box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;direction:ltr">'
      + '<defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A2438" stop-opacity=".3"/><stop offset="1" stop-color="#8A2438" stop-opacity="0"/></linearGradient></defs>'
      + '<line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '" stroke="#E7DDD4" stroke-width="1.5"/>'
      + '<path d="' + area + '" fill="url(#ag)"/><path d="' + path + '" fill="none" stroke="#8A2438" stroke-width="2.4" stroke-linecap="round"/>'
      + dots + labels + '</svg>';
  }
  function chartCats(orders) {
    const box = $('#chCats');
    if (!box) return;
    box.textContent = '';
    if (!orders.length) { box.append(el('p', { class: 'empty' }, t('no_data'))); return; }
    const map = {};
    for (const o of orders) for (const it of o.items) {
      const p = prodById(it.pid);
      const key = p ? p.cat : 'custom';
      map[key] = (map[key] || 0) + it.price * it.qty;
    }
    const palette = ['#8A2438', '#470D1B', '#AE8A50', '#33555E', '#4A6B4A', '#A85D6F'];
    Object.entries(map).sort((a, b) => b[1] - a[1]).forEach((e, i) => {
      const cat = S.categories.find(c => c.id === e[0]);
      const lbl = e[0] === 'custom' ? t('base_lbl') : (cat ? catName(cat) : e[0]);
      const max = Math.max(...Object.values(map));
      const bar = el('div', { style: { height: '9px', borderRadius: '99px', background: '#F0E7DE', overflow: 'hidden', marginTop: '4px' } });
      bar.append(el('div', { style: { height: '100%', width: Math.max(4, e[1] / max * 100) + '%', borderRadius: '99px', background: palette[i % palette.length] } }));
      box.append(el('div', { style: { marginBottom: '10px' } },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', fontWeight: '500', color: 'var(--ink-2)' } }, el('span', {}, lbl), el('span', {}, money(e[1]))), bar));
    });
  }
  function chartStatus(orders) {
    const box = $('#chStatus');
    if (!box) return;
    box.textContent = '';
    if (!orders.length) { box.append(el('p', { class: 'empty' }, t('no_data'))); return; }
    const counts = { new: 0, confirmed: 0, delivered: 0, cancelled: 0 };
    for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;
    const colors = { new: '#8A2438', confirmed: '#33555E', delivered: '#4A6B4A', cancelled: '#8B7D7B' };
    const keys = ORD_STATUS.filter(k => counts[k] > 0);
    const R = 52, C = 2 * Math.PI * R;
    let off = 0, segs = '';
    for (const k of keys) {
      const frac = counts[k] / orders.length;
      segs += '<circle r="' + R + '" cx="70" cy="70" fill="none" stroke="' + colors[k] + '" stroke-width="26" stroke-dasharray="' + (frac * C - 2).toFixed(1) + ' ' + (C - frac * C + 2).toFixed(1) + '" stroke-dashoffset="' + (-off * C + C / 4).toFixed(1) + '"/>';
      off += frac;
    }
    const legend = el('div', { class: 'legend' });
    for (const k of keys) legend.append(el('span', {}, el('span', { class: 'dot', style: { background: colors[k] } }), ordStatusLabel(k) + ' · ' + counts[k]));
    box.innerHTML = '<svg viewBox="0 0 140 140" style="width:130px;height:130px;display:block;margin:0 auto;direction:ltr">' + segs
      + '<text x="70" y="75" text-anchor="middle" font-size="19" font-weight="600" fill="#470D1B">' + orders.length + '</text></svg>';
    box.append(legend);
  }
  function chartTop(orders) {
    const box = $('#chTop');
    if (!box) return;
    box.textContent = '';
    if (!orders.length) { box.append(el('p', { class: 'empty' }, t('no_data'))); return; }
    const map = {};
    for (const o of orders) for (const it of o.items) { const key = it.pid || it.name; if (!map[key]) map[key] = { qty: 0, name: it.name }; map[key].qty += it.qty; }
    const entries = Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
    const max = Math.max(1, ...entries.map(e => e.qty));
    for (const e of entries) {
      const bar = el('div', { style: { height: '9px', borderRadius: '99px', background: '#F0E7DE', overflow: 'hidden', marginTop: '4px' } });
      bar.append(el('div', { style: { height: '100%', width: Math.max(4, e.qty / max * 100) + '%', borderRadius: '99px', background: 'linear-gradient(90deg,#8A2438,#470D1B)' } }));
      box.append(el('div', { style: { marginBottom: '10px' } },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', fontWeight: '500', color: 'var(--ink-2)' } },
          el('span', {}, e.name), el('span', {}, e.qty + ' ' + t('units'))), bar));
    }
  }
  render();
  $('#refreshDash').addEventListener('click', render);
  window.RBM_RERENDER = render;
}

/* ============================================================
   PAGE: orders (track commands)
   ============================================================ */
function pageOrders() {
  function render() {
    const counts = {};
    for (const o of S.orders) counts[o.status] = (counts[o.status] || 0) + 1;
    const chips = $('#ordCounts');
    chips.textContent = '';
    ORD_STATUS.forEach(st => chips.append(el('span', { class: 'badge ' + (st === 'new' ? 'st-new' : st === 'confirmed' ? 'st-conf' : st === 'delivered' ? 'st-del' : 'st-new') }, ordStatusLabel(st) + ': ' + (counts[st] || 0))));
    const box = $('#ordersList');
    box.textContent = '';
    if (!S.orders.length) { box.append(el('p', { class: 'empty' }, t('ord_none'))); return; }
    for (const o of S.orders) {
      const stSel = el('select', { 'aria-label': 'status' });
      ORD_STATUS.forEach(st => { const op = el('option', { value: st }, ordStatusLabel(st)); if (o.status === st) op.selected = true; stSel.append(op); });
      stSel.addEventListener('change', () => { o.status = stSel.value; saveState(); updateOrdBadge(); render(); });
      const grid = el('div', { class: 'ord-grid' });
      const item = (k, v) => grid.append(el('div', {}, el('div', { class: 'k' }, k), el('div', { class: 'v' }, v)));
      item(t('f_name').replace(' *', ''), o.name);
      item(t('f_phone').replace(' *', ''), el('span', { style: { direction: 'ltr', unicodeBidi: 'isolate' } }, o.phone));
      item(t('f_city').replace(' *', ''), o.city);
      item(t('zone_t'), o.zoneName + (o.zoneFee ? ' (' + money(o.zoneFee) + ')' : ''));
      if (o.promo) item(t('promo_t'), o.promo + ' (−' + money(o.discount) + ')');
      if (o.date) item(t('f_date'), o.date);
      if (o.note) item(t('f_notes'), o.note);
      const itemsBox = el('div', { style: { gridColumn: '1/-1', background: 'var(--cream)', padding: '10px 14px', fontSize: '.82rem', lineHeight: '1.9' } });
      o.items.forEach((it, i) => itemsBox.append(el('div', {}, (i + 1) + ') ' + it.name + (it.color ? ' — ' + it.color : '') + (it.addons ? ' — ' + it.addons : '') + (it.note ? ' — ' + it.note : '') + '  |  ×' + it.qty + ' = ' + money(it.price * it.qty))));
      box.append(el('div', { class: 'ord' },
        el('div', { class: 'ord-top' },
          el('span', { class: 'ord-id' }, o.id),
          (o.gift ? el('span', { class: 'gift-tag' }, t('gift_tag')) : el('span')),
          el('span', { class: 'ord-date' }, new Date(o.ts).toLocaleString(lang === 'fr' ? 'fr-MA' : lang === 'en' ? 'en-GB' : 'ar-MA')),
          ordStatusBadge(o.status),
          el('span', { class: 'ord-st' }, stSel, delBtn(t('del_order'), () => { S.orders = S.orders.filter(x => x.id !== o.id); saveState(); updateOrdBadge(); render(); }))),
        el('div', { class: 'ord-grid' }, grid, itemsBox,
          el('div', {}, el('div', { class: 'k' }, t('th_total')), el('div', { class: 'v ord-total' }, money(o.total))))));
    }
  }
  render();
  window.RBM_RERENDER = render;
}

/* ============================================================
   PAGE: reviews (add / remove ratings)
   ============================================================ */
function pageReviews() {
  const stars = { v: 5 };
  const starRow = $('#rvStars');
  function paint() { $$('span', starRow).forEach((sp, i) => sp.classList.toggle('on', i < stars.v)); }
  for (let i = 1; i <= 5; i++) {
    const sp = el('span', { 'data-i': String(i) }, '✦');
    sp.addEventListener('click', () => { stars.v = i; paint(); });
    starRow.append(sp);
  }
  paint();
  const prodSel = $('#rv_prod');
  function fillProducts() {
    prodSel.textContent = '';
    for (const p of S.products.filter(x => x.active)) prodSel.append(el('option', { value: p.id }, prodName(p)));
  }
  function render() {
    fillProducts();
    const box = $('#revList2');
    box.textContent = '';
    if (!S.reviews.length) { box.append(el('p', { class: 'empty' }, t('rev_none'))); return; }
    for (const r of S.reviews.slice().sort((a, b) => b.ts - a.ts)) {
      const p = prodById(r.pid);
      box.append(el('div', { class: 'ord' },
        el('div', { class: 'ord-top' },
          el('span', { style: { fontWeight: '500', letterSpacing: '.12em', textTransform: 'uppercase', fontSize: '.74rem' } }, r.name),
          el('span', { class: 'stars' }, '✦✦✦✦✦'.slice(0, r.rating) + '✧✧✧✧✧'.slice(0, 5 - r.rating)),
          el('span', { class: 'ord-date' }, p ? prodName(p) : '—'),
          el('span', { class: 'ord-date' }, fmtDate(r.ts)),
          el('span', { class: 'ord-st' }, delBtn(t('del_rev'), () => { S.reviews = S.reviews.filter(x => x.id !== r.id); saveState(); render(); }))),
        el('p', { style: { fontSize: '.87rem', color: 'var(--ink-2)' } }, r.text)));
    }
  }
  $('#rvAdd').addEventListener('click', () => {
    const name = sanitize($('#rv_name').value, 40);
    const text = sanitize($('#rv_text').value, 400);
    if (name.length < 2 || text.length < 3) { toast(t('toast_pass_err'), 'err'); return; }
    S.reviews.unshift({ id: uid(), pid: prodSel.value || '', name, rating: stars.v, text, ts: Date.now() });
    saveState();
    $('#rv_name').value = ''; $('#rv_text').value = ''; stars.v = 5; paint();
    render();
    toast(t('toast_saved'), 'ok');
  });
  render();
  window.RBM_RERENDER = render;
}

/* ============================================================
   PAGE: colors (add / edit / remove flower colors)
   ============================================================ */
/* ============================================================
   PHOTOS — shared by the colours and products pages
   ------------------------------------------------------------
   Two storage modes, chosen automatically:
     * Supabase configured + signed in -> the file is uploaded to the `media`
       bucket, the row goes to product_images/color_images, and we keep the
       public CDN URL.
     * Otherwise -> the image is inlined as a data: URL in local state. That
       keeps the feature usable offline today, but it inflates the backup file,
       so the UI says so.
   ============================================================ */
const PHOTO_MAX = 5 * 1024 * 1024;

function photoModeNote() {
  if (typeof SB === 'undefined' || !SB.on()) return t('ph_mode_local');
  return SB.authed ? t('ph_mode_cloud') : t('ph_mode_needlogin');
}
/* Reads a File into a data: URL (local mode / instant preview). */
function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const rd = new FileReader();
    rd.onload = () => res(String(rd.result));
    rd.onerror = () => rej(new Error('read'));
    rd.readAsDataURL(file);
  });
}
/* Uploads to Supabase when possible, else returns a data: URL. */
async function storePhoto(file, keyPath) {
  if (!file) throw new Error('nofile');
  if (!/^image\//.test(file.type)) throw new Error(t('ph_err_type'));
  if (file.size > PHOTO_MAX) throw new Error(t('ph_err_size'));
  if (typeof SB !== 'undefined' && SB.on() && SB.authed) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
    const path = keyPath + '-' + Date.now().toString(36) + '.' + (ext || 'jpg');
    await SB.upload(file, path);
    return { url: SB.publicUrl(path), path };
  }
  return { url: await fileToDataUrl(file), path: '' };
}
/* Hidden <input type=file> + button, returns the button element. */
function photoPickBtn(label, onPick) {
  const inp = el('input', { type: 'file', accept: 'image/*', class: 'hidden' });
  const btn = el('button', { class: 'btn btn-outline btn-sm', type: 'button', onclick: () => inp.click() }, label);
  inp.addEventListener('change', async () => {
    const f = inp.files && inp.files[0];
    inp.value = '';
    if (!f) return;
    try { await onPick(f); } catch (e) { toast(String(e.message || e).slice(0, 120), 'err'); }
  });
  const w = el('span', { style: { display: 'inline-flex', gap: '6px', alignItems: 'center' } }, btn, inp);
  return w;
}
/* One colour's photo row. */
function colorPhotoRow(c, rerender) {
  const wrap = el('div', { class: 'ph-grid', style: { alignItems: 'flex-start', marginBottom: '14px' } });
  if (c.img) {
    const item = el('div', { class: 'ph-item is-primary' },
      el('img', { src: c.img, alt: colorName(c) }),
      el('div', { class: 'ph-bar' }, el('button', { type: 'button', onclick: async () => {
        if (!(await confirmDlg(t('ph_del_q')))) return;
        c.img = ''; saveAndRefresh(); rerender();
        if (typeof SB !== 'undefined' && SB.on() && SB.authed) SB.delColorImage(c.id).catch(() => {});
      } }, t('ph_del'))));
    wrap.append(item);
  } else {
    wrap.append(el('span', { class: 'ph-empty' }, t('ph_none_color')));
  }
  wrap.append(photoPickBtn(c.img ? t('ph_replace') : t('ph_add'), async f => {
    const r = await storePhoto(f, 'colors/' + (c.id || 'color'));
    c.img = r.url;
    saveAndRefresh(); rerender();
    if (r.path && typeof SB !== 'undefined' && SB.on() && SB.authed) {
      SB.setColorImage({ color_id: c.id, path: r.path, alt_ar: c.ar, alt_fr: c.fr, alt_en: c.en }).catch(e => toast(String(e.message).slice(0, 120), 'err'));
    }
    toast(t('toast_saved'), 'ok');
  }));
  wrap.append(el('span', { class: 'hintline', style: { flexBasis: '100%' } }, photoModeNote()));
  return wrap;
}

/* One pack's gallery. `slot` is '' for general shots, or a colour id for
   "this pack in that colour". Mirrors product_images in 0002_media.sql. */
function productPhotoBox(p, rerender) {
  const box = el('div', { class: 'ph-wrap', style: { gridColumn: '1/-1', padding: '4px 0 14px' } });
  const sel = el('select', { style: { maxWidth: '190px' } });
  sel.append(el('option', { value: '' }, t('ph_slot_all')));
  for (const c of S.colors) { const o = el('option', { value: c.id }, colorName(c)); if (p.__slot === c.id) o.selected = true; sel.append(o); }
  sel.addEventListener('change', () => { p.__slot = sel.value; rerender(); });
  const slot = p.__slot || '';

  const grid = el('div', { class: 'ph-grid' });
  const shots = (p.imgs || []).filter(im => (im.colorId || '') === slot);
  if (!shots.length) grid.append(el('span', { class: 'ph-empty' }, t('ph_none_prod')));
  for (const im of shots) {
    const item = el('div', { class: 'ph-item' + (im.primary ? ' is-primary' : '') },
      el('img', { src: im.url, alt: im.alt || prodName(p) }),
      im.primary ? el('span', { class: 'ph-tag' }, t('ph_main')) : el('span'),
      el('div', { class: 'ph-bar' },
        im.primary ? el('span') : el('button', { type: 'button', title: t('ph_make_main'), onclick: () => {
          p.imgs.forEach(o => { if ((o.colorId || '') === slot) o.primary = (o === im); });
          saveAndRefresh(); rerender();
          if (typeof SB !== 'undefined' && SB.on() && SB.authed && im.id) SB.makePrimary(im.id).catch(() => {});
        } }, '★'),
        el('button', { type: 'button', title: t('ph_del'), onclick: async () => {
          if (!(await confirmDlg(t('ph_del_q')))) return;
          const wasPrimary = im.primary;
          p.imgs = p.imgs.filter(o => o !== im);
          /* keep the DB rule locally: a slot always keeps one primary */
          if (wasPrimary) { const next = p.imgs.find(o => (o.colorId || '') === slot); if (next) next.primary = true; }
          saveAndRefresh(); rerender();
          if (typeof SB !== 'undefined' && SB.on() && SB.authed && im.id) SB.delProductImage(im.id).catch(() => {});
        } }, '✕')));
    grid.append(item);
  }

  grid.append(photoPickBtn(t('ph_add'), async f => {
    const r = await storePhoto(f, 'products/' + p.id + (slot ? '/' + slot : ''));
    p.imgs = p.imgs || [];
    const first = !p.imgs.some(o => (o.colorId || '') === slot);
    const row = { id: uid(), url: r.url, colorId: slot, alt: prodName(p), primary: first };
    p.imgs.push(row);
    saveAndRefresh(); rerender();
    if (r.path && typeof SB !== 'undefined' && SB.on() && SB.authed) {
      SB.addProductImage({ product_id: p.id, color_id: slot || null, path: r.path, alt_ar: p.ar, alt_fr: p.fr, alt_en: p.en, is_primary: first })
        .then(res => { const got = Array.isArray(res) ? res[0] : res; if (got && got.id) row.id = got.id; saveState(); })
        .catch(e => toast(String(e.message).slice(0, 120), 'err'));
    }
    toast(t('toast_saved'), 'ok');
  }));

  box.append(
    el('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } },
      el('span', { class: 'set-sub', style: { margin: '0' } }, t('ph_for') + ' ' + prodName(p)),
      sel,
      el('span', { class: 'hintline' }, slot ? t('ph_slot_hint_color') : t('ph_slot_hint_all'))),
    grid);
  return box;
}

function pageColors() {
  function render() {
    const box = $('#colorsList');
    box.textContent = '';
    for (const c of S.colors) {
      const hexNorm = c.hex.length === 4 ? '#' + c.hex.slice(1).split('').map(x => x + x).join('') : c.hex;
      const cIn = el('input', { type: 'color', value: hexNorm, 'aria-label': t('th_hex') });
      const hexT = el('input', { type: 'text', class: 'hex-t', maxlength: '7', value: c.hex, 'aria-label': 'HEX' });
      const ar = el('input', { type: 'text', maxlength: '40', value: c.ar, placeholder: t('th_name_ar') });
      const fr = el('input', { type: 'text', maxlength: '40', value: c.fr, placeholder: t('th_name_fr') });
      const en = el('input', { type: 'text', maxlength: '40', value: c.en, placeholder: t('th_name_en') });
      cIn.addEventListener('input', () => { c.hex = cIn.value; hexT.value = cIn.value; saveAndRefreshDebounced(); });
      hexT.addEventListener('change', () => {
        if (isHexColor(hexT.value)) {
          c.hex = hexT.value;
          cIn.value = hexT.value.length === 4 ? '#' + hexT.value.slice(1).split('').map(x => x + x).join('') : hexT.value;
          saveAndRefresh();
        } else hexT.value = c.hex;
      });
      ar.addEventListener('input', () => { c.ar = sanitize(ar.value, 40) || c.ar; saveAndRefreshDebounced(); });
      fr.addEventListener('input', () => { c.fr = sanitize(fr.value, 40); saveAndRefreshDebounced(); });
      en.addEventListener('input', () => { c.en = sanitize(en.value, 40); saveAndRefreshDebounced(); });
      box.append(el('div', { class: 'arow rows-colors' },
        cIn, hexT, ar, fr, en,
        checkbox('th_avail', () => c.available, v => { c.available = v; }),
        delBtn(t('del_color'), () => { S.colors = S.colors.filter(x => x.id !== c.id); saveAndRefresh(); render(); })));
      /* real close-up photo for this colour — replaces the flat hex dot on the
         storefront once uploaded; the hex stays as the loading tint */
      box.append(colorPhotoRow(c, render));
    }
    if (!S.colors.length) box.append(el('p', { class: 'empty' }, lang === 'fr' ? 'Aucune couleur — ajoutez-en une.' : lang === 'en' ? 'No colors — add one.' : 'لا توجد ألوان — أضف واحداً.'));
  }
  $('#addColor').addEventListener('click', () => {
    const palette = ['#3A5FA8', '#C8102E', '#6E1423', '#4A6B4A', '#AE8A50', '#33555E', '#A85D6F'];
    const hex = palette[S.colors.length % palette.length];
    S.colors.push({ id: uid(), ar: lang === 'ar' ? 'لون جديد' : 'New color', fr: 'Nouvelle couleur', en: 'New color', hex, available: true });
    saveAndRefresh(); render();
    toast(t('toast_saved'), 'ok');
  });
  render();
  window.RBM_RERENDER = render;
}

/* ============================================================
   PAGE: products (+ categories + builder sizes + add-ons)
   ============================================================ */
function pageProducts() {
  function renderCats() {
    const cbox = $('#catsList');
    cbox.textContent = '';
    for (const c of S.categories) {
      const icon = el('input', { type: 'text', maxlength: '4', value: c.icon });
      const ar = el('input', { type: 'text', maxlength: '40', value: c.ar, placeholder: t('th_name_ar') });
      const fr = el('input', { type: 'text', maxlength: '40', value: c.fr, placeholder: t('th_name_fr') });
      const en = el('input', { type: 'text', maxlength: '40', value: c.en, placeholder: t('th_name_en') });
      icon.addEventListener('input', () => { c.icon = sanitize(icon.value, 8); saveAndRefreshDebounced(); });
      ar.addEventListener('input', () => { c.ar = sanitize(ar.value, 40) || c.ar; saveAndRefreshDebounced(); });
      fr.addEventListener('input', () => { c.fr = sanitize(fr.value, 40); saveAndRefreshDebounced(); });
      en.addEventListener('input', () => { c.en = sanitize(en.value, 40); saveAndRefreshDebounced(); });
      cbox.append(el('div', { class: 'arow', style: { gridTemplateColumns: '54px 1fr 1fr 1fr 44px' } }, icon, ar, fr, en,
        delBtn(t('del_cat'), () => {
          S.products.forEach(p => { if (p.cat === c.id) p.cat = ''; });
          S.categories = S.categories.filter(x => x.id !== c.id);
          saveAndRefresh(); renderAll();
        })));
    }
  }
  function renderProducts() {
    const box = $('#prodList');
    box.textContent = '';
    for (const p of S.products) {
      const catSel = el('select');
      catSel.append(el('option', { value: '' }, '—'));
      for (const c of S.categories) { const op = el('option', { value: c.id }, c.icon + ' ' + catName(c)); if (p.cat === c.id) op.selected = true; catSel.append(op); }
      catSel.addEventListener('change', () => { p.cat = catSel.value; saveAndRefreshDebounced(); });
      const typeSel = el('select');
      [['bouquet', 'type_bouquet'], ['box', 'type_box'], ['single', 'type_single'], ['gift', 'type_gift']].forEach(tv => {
        const op = el('option', { value: tv[0] }, t(tv[1])); if (p.type === tv[0]) op.selected = true; typeSel.append(op);
      });
      typeSel.addEventListener('change', () => { p.type = typeSel.value; saveAndRefreshDebounced(); });
      const ar = el('input', { type: 'text', maxlength: '60', value: p.ar, placeholder: t('th_name_ar') });
      const desc = el('input', { type: 'text', maxlength: '400', value: (lang === 'fr' ? p.dfr : lang === 'en' ? p.den : p.dar) || '', placeholder: t('th_desc') });
      const price = el('input', { type: 'number', min: '0', step: '1', value: String(p.price), 'aria-label': t('th_price') });
      const old = el('input', { type: 'number', min: '0', step: '1', value: String(p.old || 0), 'aria-label': t('th_old') });
      const qty = el('input', { type: 'number', min: '1', max: '999', value: String(p.qty), 'aria-label': t('th_qty') });
      const badgeSel = el('select');
      [['', 'badge_none'], ['new', 'badge_new'], ['best', 'badge_best'], ['promo', 'badge_promo']].forEach(bv => {
        const op = el('option', { value: bv[0] }, t(bv[1])); if (p.badge === bv[0]) op.selected = true; badgeSel.append(op);
      });
      badgeSel.addEventListener('change', () => { p.badge = badgeSel.value; saveAndRefreshDebounced(); });
      ar.addEventListener('input', () => { p.ar = sanitize(ar.value, 60) || p.ar; saveAndRefreshDebounced(); });
      desc.addEventListener('input', () => {
        const v = sanitize(desc.value, 400);
        if (lang === 'fr') p.dfr = v; else if (lang === 'en') p.den = v; else p.dar = v;
        saveAndRefreshDebounced();
      });
      price.addEventListener('input', () => { p.price = clampNum(Number(price.value) || 0, 0, 100000); saveAndRefreshDebounced(); });
      old.addEventListener('input', () => { p.old = clampNum(Number(old.value) || 0, 0, 100000); saveAndRefreshDebounced(); });
      qty.addEventListener('input', () => { p.qty = clampNum(Math.round(Number(qty.value) || 1), 1, 999); saveAndRefreshDebounced(); });
      const prev = el('span', { style: { width: '46px', height: '46px', borderRadius: '2px', background: 'var(--cream)', display: 'grid', placeItems: 'center', overflow: 'hidden', flex: 'none' } });
      prev.innerHTML = productArt(p, '#C8102E');
      box.append(el('div', { class: 'arow', style: { gridTemplateColumns: '46px 130px 92px 1fr 1.2fr 84px 84px 66px 92px 110px 70px 70px 44px' } },
        prev, catSel, typeSel, ar, desc, qty, price, old, badgeSel,
        (() => { const w = el('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' } }); w.append(checkbox('th_feat', () => p.featured, v => { p.featured = v; }), checkbox('th_act', () => p.active, v => { p.active = v; })); return w; })(),
        delBtn(t('del_prod'), () => { S.products = S.products.filter(x => x.id !== p.id); saveAndRefresh(); renderAll(); })));
      box.append(productPhotoBox(p, renderProducts));
    }
    if (!box.children.length) box.append(el('p', { class: 'empty' }, t('no_data')));
  }
  function renderTiers() {
    const tbox = $('#tiersList');
    tbox.textContent = '';
    for (const tr of S.builderTiers.slice().sort((a, b) => a.qty - b.qty)) {
      const qty = el('input', { type: 'number', min: '1', max: '999', value: String(tr.qty) });
      const pr = el('input', { type: 'number', min: '0', value: String(tr.price) });
      qty.addEventListener('input', () => { tr.qty = clampNum(Math.round(Number(qty.value) || 1), 1, 999); saveAndRefreshDebounced(); });
      pr.addEventListener('input', () => { tr.price = clampNum(Number(pr.value) || 0, 0, 100000); saveAndRefreshDebounced(); });
      tbox.append(el('div', { class: 'arow', style: { gridTemplateColumns: '1fr 1fr 44px' } }, labelWrap(t('th_qty'), qty), labelWrap(t('th_price'), pr),
        delBtn(t('del_tier'), () => { S.builderTiers = S.builderTiers.filter(x => x.id !== tr.id); saveAndRefresh(); renderAll(); })));
    }
  }
  function renderAddons() {
    const abox = $('#addonsList');
    abox.textContent = '';
    for (const a of S.addons) {
      const icon = el('input', { type: 'text', maxlength: '4', value: a.icon });
      const ar = el('input', { type: 'text', maxlength: '50', value: a.ar, placeholder: t('th_name_ar') });
      const pr = el('input', { type: 'number', min: '0', value: String(a.price) });
      icon.addEventListener('input', () => { a.icon = sanitize(icon.value, 8); saveAndRefreshDebounced(); });
      ar.addEventListener('input', () => { a.ar = sanitize(ar.value, 50) || a.ar; saveAndRefreshDebounced(); });
      pr.addEventListener('input', () => { a.price = clampNum(Number(pr.value) || 0, 0, 10000); saveAndRefreshDebounced(); });
      abox.append(el('div', { class: 'arow', style: { gridTemplateColumns: '54px 1fr 1fr 92px 70px 70px 44px' } },
        icon, ar, el('span', { class: 'hintline', style: { direction: 'ltr' } }, a.fr + ' / ' + a.en), pr,
        checkbox('th_text', () => a.hasText, v => { a.hasText = v; }),
        checkbox('th_enabled', () => a.enabled, v => { a.enabled = v; }),
        delBtn(t('del_addon'), () => { S.addons = S.addons.filter(x => x.id !== a.id); saveAndRefresh(); renderAll(); })));
    }
  }
  function renderAll() { renderCats(); renderProducts(); renderTiers(); renderAddons(); }
  $('#addProd').addEventListener('click', () => {
    S.products.unshift({
      id: 'p' + Date.now().toString(36), cat: S.categories[0] ? S.categories[0].id : '', type: 'bouquet', qty: 9,
      ar: lang === 'ar' ? 'منتج جديد' : 'New product', fr: 'Nouveau produit', en: 'New product',
      dar: '', dfr: '', den: '', price: 100, old: 0, badge: '', featured: false, active: true
    });
    saveAndRefresh(); renderAll();
  });
  $('#addCat').addEventListener('click', () => {
    S.categories.push({ id: 'c' + Date.now().toString(36), icon: '', ar: lang === 'ar' ? 'فئة جديدة' : 'New category', fr: 'Nouvelle catégorie', en: 'New category' });
    saveAndRefresh(); renderAll();
  });
  $('#addTier').addEventListener('click', () => {
    const maxQ = S.builderTiers.reduce((m, x) => Math.max(m, x.qty), 0);
    S.builderTiers.push({ id: uid(), qty: maxQ ? Math.min(maxQ + 5, 999) : 1, price: 50 });
    saveAndRefresh(); renderAll();
  });
  $('#addAddon').addEventListener('click', () => {
    S.addons.push({ id: uid(), icon: '', ar: lang === 'ar' ? 'إضافة جديدة' : 'New add-on', fr: 'Nouveau supplément', en: 'New add-on', price: 5, hasText: false, enabled: true });
    saveAndRefresh(); renderAll();
  });
  renderAll();
  window.RBM_RERENDER = renderAll;
}

/* ============================================================
   PAGE: marketing (promo codes + delivery zones)
   ============================================================ */
function pageMarketing() {
  function renderPromos() {
    const pbox = $('#promoList');
    pbox.textContent = '';
    for (const pc of S.promoCodes) {
      const code = el('input', { type: 'text', maxlength: '20', value: pc.code, class: 'hex-t' });
      code.style.textTransform = 'uppercase';
      const typeSel = el('select');
      [['percent', 't_percent'], ['fixed', 't_fixed']].forEach(tv => { const op = el('option', { value: tv[0] }, t(tv[1])); if (pc.type === tv[0]) op.selected = true; typeSel.append(op); });
      const val = el('input', { type: 'number', min: '0', value: String(pc.value) });
      const min = el('input', { type: 'number', min: '0', value: String(pc.minTotal) });
      code.addEventListener('input', () => { pc.code = sanitize(code.value, 20).toUpperCase() || pc.code; saveAndRefreshDebounced(); });
      typeSel.addEventListener('change', () => { pc.type = typeSel.value; saveAndRefreshDebounced(); });
      val.addEventListener('input', () => { pc.value = clampNum(Number(val.value) || 0, 0, 100000); saveAndRefreshDebounced(); });
      min.addEventListener('input', () => { pc.minTotal = clampNum(Number(min.value) || 0, 0, 100000); saveAndRefreshDebounced(); });
      const used = el('span', { class: 'hintline' }, t('th_used') + ': ' + pc.used);
      const w = el('div');
      w.append(checkbox('th_enabled', () => pc.enabled, v => { pc.enabled = v; }), used);
      pbox.append(el('div', { class: 'arow', style: { gridTemplateColumns: '130px 130px 90px 110px 130px 44px' } },
        labelWrap(t('th_code'), code), labelWrap(t('th_value'), typeSel), labelWrap('→', val), labelWrap(t('th_min'), min), w,
        delBtn(t('del_promo'), () => { S.promoCodes = S.promoCodes.filter(x => x.id !== pc.id); saveAndRefresh(); renderAll(); })));
    }
  }
  function renderZones() {
    const zbox = $('#zoneList');
    zbox.textContent = '';
    for (const z of S.zones) {
      const ar = el('input', { type: 'text', maxlength: '40', value: z.ar, placeholder: t('th_name_ar') });
      const fr = el('input', { type: 'text', maxlength: '40', value: z.fr, placeholder: t('th_name_fr') });
      const en = el('input', { type: 'text', maxlength: '40', value: z.en, placeholder: t('th_name_en') });
      const fee = el('input', { type: 'number', min: '0', value: String(z.fee) });
      ar.addEventListener('input', () => { z.ar = sanitize(ar.value, 40) || z.ar; saveAndRefreshDebounced(); });
      fr.addEventListener('input', () => { z.fr = sanitize(fr.value, 40); saveAndRefreshDebounced(); });
      en.addEventListener('input', () => { z.en = sanitize(en.value, 40); saveAndRefreshDebounced(); });
      fee.addEventListener('input', () => { z.fee = clampNum(Number(fee.value) || 0, 0, 10000); saveAndRefreshDebounced(); });
      zbox.append(el('div', { class: 'arow', style: { gridTemplateColumns: '1fr 1fr 1fr 110px 44px' } }, ar, fr, en, labelWrap(t('th_fee'), fee),
        delBtn(t('del_zone'), () => { S.zones = S.zones.filter(x => x.id !== z.id); saveAndRefresh(); renderAll(); })));
    }
  }
  function renderAll() { renderPromos(); renderZones(); }
  $('#addPromo').addEventListener('click', () => {
    S.promoCodes.push({ id: uid(), code: 'ROSE' + Math.floor(Math.random() * 90 + 10), type: 'percent', value: 10, minTotal: 0, enabled: true, used: 0 });
    saveAndRefresh(); renderAll();
  });
  $('#addZone').addEventListener('click', () => {
    S.zones.push({ id: uid(), ar: lang === 'ar' ? 'مدينة جديدة' : 'New city', fr: 'Nouvelle ville', en: 'New city', fee: 30 });
    saveAndRefresh(); renderAll();
  });
  renderAll();
  window.RBM_RERENDER = renderAll;
}

/* ============================================================
   PAGE: customers
   ============================================================ */
function pageCustomers() {
  function render() {
    const box = $('#custList');
    box.textContent = '';
    const map = {};
    for (const o of S.orders) {
      const k = o.phone || o.name;
      if (!map[k]) map[k] = { name: o.name, phone: o.phone, city: o.city, count: 0, total: 0, last: 0 };
      map[k].count++; map[k].total += o.total; map[k].last = Math.max(map[k].last, o.ts);
      if (o.city) map[k].city = o.city;
    }
    const list = Object.values(map).sort((a, b) => b.total - a.total);
    if (!list.length) { box.append(el('p', { class: 'empty' }, t('cust_none'))); return; }
    for (const c of list) {
      box.append(el('div', { class: 'ord' },
        el('div', { class: 'ord-top' },
          el('span', { style: { fontWeight: '500', letterSpacing: '.1em', color: 'var(--wine)' } }, c.name),
          el('span', { class: 'ord-date', style: { direction: 'ltr' } }, c.phone),
          el('span', { class: 'ord-st' },
            el('span', { class: 'badge st-new' }, c.count + ' ' + t('orders_count')),
            el('span', { class: 'badge st-conf' }, money(c.total)),
            el('span', { class: 'ord-date' }, t('last_order') + ': ' + fmtDate(c.last)))),
        el('div', { class: 'hintline' }, (c.city || '—'))));
    }
  }
  render();
  window.RBM_RERENDER = render;
}

/* ============================================================
   PAGE: settings (+ passcode + data backup + SEO)
   ============================================================ */
function pageSettings() {
  function renderSeo() {
    let u = sanitize($('#set_site').value || S.settings.siteUrl || '', 200);
    if (!u) u = suggestedSiteUrl();
    u = u.replace(/\/+$/, '');
    const today = new Date().toISOString().slice(0, 10);
    $('#robotsOut').value = '# robots.txt — Rose by Marry\n# generated: ' + today + '\nUser-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ' + u + '/sitemap.xml\n';
    $('#sitemapOut').value = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      + '  <url><loc>' + u + '/</loc><lastmod>' + today + '</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n'
      + '  <url><loc>' + u + '/shop.html</loc><lastmod>' + today + '</lastmod><priority>0.9</priority></url>\n'
      + '  <url><loc>' + u + '/about.html</loc><lastmod>' + today + '</lastmod><priority>0.5</priority></url>\n'
      + '  <url><loc>' + u + '/contact.html</loc><lastmod>' + today + '</lastmod><priority>0.5</priority></url>\n'
      + '</urlset>\n';
  }
  $('#set_wa').value = S.settings.whatsapp;
  $('#set_cur').value = S.settings.currency;
  $('#set_unit').value = String(S.settings.builderUnit);
  $('#set_free').value = String(S.settings.freeShip);
  $('#set_site').value = S.settings.siteUrl || suggestedSiteUrl();
  $('#set_ig').value = S.settings.instagram || '';
  $('#set_tt').value = S.settings.tiktok || '';
  $('#set_ga').value = S.settings.gaId || '';
  $('#set_user').value = S.settings.adminUser || 'marry';
  try {
    const ll = S.settings.lastLogin;
    $('#secLast').textContent = ll ? new Date(ll).toLocaleString('ar-MA') : t('sec_never');
    $('#secFails').textContent = String(S.settings.failCount || 0);
  } catch (e) {}
  const st = $('#storStatus');
  st.textContent = '';
  st.append(document.createTextNode(canLS ? t('stor_ok') : t('stor_mem')));
  try { if ('indexedDB' in window) st.append(document.createTextNode('  •  ' + t('idb_note'))); } catch (e) {}
  renderSeo();

  $('#setSave').addEventListener('click', () => {
    const wa = sanitizeDigits($('#set_wa').value, 16);
    if (wa.length < 8) { toast(t('toast_wa_short'), 'err'); return; }
    const ga = sanitize($('#set_ga').value, 20).toUpperCase();
    if (ga && !/^G-[A-Z0-9]{6,12}$/.test(ga)) { toast(t('set_ga_bad'), 'err'); return; }
    S.settings.gaId = ga;
    S.settings.whatsapp = wa;
    S.settings.currency = sanitize($('#set_cur').value, 8) || 'DH';
    S.settings.builderUnit = clampNum(Number($('#set_unit').value) || 9, 0.5, 1000);
    S.settings.freeShip = clampNum(Number($('#set_free').value) || 0, 0, 100000);
    S.settings.siteUrl = sanitize($('#set_site').value, 200);
    S.settings.instagram = sanitize($('#set_ig').value, 200);
    S.settings.tiktok = sanitize($('#set_tt').value, 200);
    S.settings.adminUser = (sanitize($('#set_user').value, 30) || 'marry').toLowerCase();
    saveState(); renderSeo();
    toast(t('toast_saved'), 'ok');
  });
  $('#pcChange').addEventListener('click', async () => {
    const cur = $('#pc_cur').value, nw = $('#pc_new').value, cf = $('#pc_conf').value;
    const curHash = await hashPass(cur);
    if (curHash !== S.settings.passHash) { toast(t('pc_err'), 'err'); return; }
    if (nw.length < 4 || nw !== cf) { toast(t('toast_pass_err'), 'err'); return; }
    S.settings.passHash = await hashPass(nw);
    saveState();
    $('#pc_cur').value = ''; $('#pc_new').value = ''; $('#pc_conf').value = '';
    toast(t('toast_pass_ok'), 'ok');
  });
  $('#exportBtn').addEventListener('click', () => {
    const payload = { app: 'rose-by-marry', version: 3, exportedAt: new Date().toISOString(), state: S };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'rose-by-marry-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.append(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast(t('toast_export'), 'ok');
    } catch (e) { toast(t('toast_copy_err'), 'err'); }
  });
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = async () => {
      try {
        const parsed = JSON.parse(String(rd.result));
        const incoming = parsed && parsed.state ? parsed.state : parsed;
        if (!incoming || typeof incoming !== 'object' || (!incoming.products && !incoming.settings && !incoming.tiers)) throw new Error('bad');
        if (!(await confirmDlg(t('import_q')))) return;
        S = migrate(incoming);
        saveState();
        toast(t('toast_import_ok'), 'ok');
        setTimeout(() => location.reload(), 600);
      } catch (err) { toast(t('toast_import_err'), 'err'); }
    };
    rd.readAsText(file);
    e.target.value = '';
  });
  $('#resetBtn').addEventListener('click', async () => {
    if (!(await confirmDlg(t('reset_q')))) return;
    const ph = S.settings.passHash;
    S = defaultState();
    S.settings.passHash = ph;
    saveState();
    toast(t('toast_reset'), 'ok');
    setTimeout(() => location.reload(), 600);
  });
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => { const ta = $('#' + b.dataset.copy); if (ta) copyText(ta.value); }));

  /* ---------- Supabase panel ---------- */
  (function supabasePanel() {
    if (typeof SB === 'undefined' || !$('#sb_url')) return;
    SB.restore();
    const cfg = () => S.settings.supabase || (S.settings.supabase = { url: '', anonKey: '', bucket: 'media' });
    $('#sb_url').value = cfg().url || '';
    $('#sb_key').value = cfg().anonKey || '';
    $('#sb_bucket').value = cfg().bucket || 'media';
    function paint() {
      const st = $('#sbStatus');
      if (!st) return;
      const on = SB.on();
      st.className = 'seo-row ' + (on ? 'ok' : 'bad');
      st.textContent = !on ? t('sb_off') : (SB.authed ? t('sb_on') + ' · ' + t('sb_authed') : t('sb_on') + ' · ' + t('sb_anon'));
    }
    paint();
    $('#sbSave').addEventListener('click', () => {
      const c = cfg();
      c.url = sanitize($('#sb_url').value, 200).replace(/\/+$/, '');
      c.anonKey = sanitize($('#sb_key').value, 400);
      c.bucket = sanitize($('#sb_bucket').value, 60) || 'media';
      saveState(); paint();
      toast(t('toast_saved'), 'ok');
    });
    $('#sbLogin').addEventListener('click', async () => {
      try {
        await SB.signIn($('#sb_email').value.trim(), $('#sb_pass').value);
        $('#sb_pass').value = '';
        paint(); toast(t('toast_saved'), 'ok');
      } catch (e) { toast(String(e.message || e).slice(0, 140), 'err'); }
    });
    $('#sbLogout').addEventListener('click', () => { SB.signOut(); paint(); });
    $('#sbPull').addEventListener('click', async () => {
      try {
        const r = await SB.pullPhotos();
        if (!r.ok) { toast(t('sb_off'), 'err'); return; }
        toast(t('sb_pulled') + ' (' + r.count + ')', 'ok');
      } catch (e) { toast(String(e.message || e).slice(0, 140), 'err'); }
    });
  })();

  window.RBM_RERENDER = renderSeo;
}

/* ---------- page dispatch ---------- */
function pageDiscounts() {
  function render() {
    const box = $('#discList');
    box.textContent = '';
    const list = S.discounts || [];
    if (!list.length) box.append(el('p', { class: 'empty' }, t('disc_hint')));
    for (const d of list) {
      const typeSel = el('select');
      [['percent', 'd_pct'], ['fixed', 'd_fix']].forEach(tv => { const op = el('option', { value: tv[0] }, t(tv[1])); if (d.type === tv[0]) op.selected = true; typeSel.append(op); });
      const val = el('input', { type: 'number', min: '0', value: String(d.value) });
      const min = el('input', { type: 'number', min: '0', value: String(d.minTotal || 0) });
      typeSel.addEventListener('change', () => { d.type = typeSel.value; saveAndRefreshDebounced(); });
      val.addEventListener('input', () => { d.value = clampNum(Number(val.value) || 0, 0, 100000); saveAndRefreshDebounced(); });
      min.addEventListener('input', () => { d.minTotal = clampNum(Number(min.value) || 0, 0, 100000); saveAndRefreshDebounced(); });
      const w = el('div');
      w.append(checkbox('th_enabled', () => d.enabled, v => { d.enabled = v; }));
      box.append(el('div', { class: 'arow', style: { gridTemplateColumns: '150px 110px 130px 140px 44px' } },
        labelWrap(t('th_value'), typeSel), labelWrap('→', val), labelWrap(t('th_min'), min), w,
        delBtn(t('del_disc'), () => { S.discounts = list.filter(x => x.id !== d.id); saveAndRefresh(); render(); })));
    }
  }
  $('#addDisc').addEventListener('click', () => {
    S.discounts = S.discounts || [];
    S.discounts.push({ id: uid(), type: 'percent', value: 10, minTotal: 0, enabled: true });
    saveAndRefresh(); render();
  });
  render();
  window.RBM_RERENDER = render;
}

function pageInterests() {
  function pgLabel(k) {
    if (k === 'home') return t('nav_home');
    if (k === 'shop') return t('nav_shop');
    if (k === 'cart') return t('cart_t');
    if (k === 'track') return t('nav_track');
    if (k === 'product' || k.indexOf('product:') === 0) return t('pg_product') + (k.split(':')[1] ? ' — ' + k.split(':')[1] : '');
    return t('pg_other') + ' — ' + k;
  }
  function render() {
    const pv = S.pageviews || {}, pvv = S.prodViews || {};
    const tp = Object.keys(pv).reduce((a, k) => a + pv[k], 0);
    const tpv = Object.keys(pvv).reduce((a, k) => a + pvv[k], 0);
    const kt = $('#intTotals');
    kt.textContent = '';
    kt.append(
      el('div', { class: 'kpi' }, el('span', { class: 'kl' }, t('int_pages')), el('span', { class: 'kv' }, String(tp))),
      el('div', { class: 'kpi' }, el('span', { class: 'kl' }, t('int_prods')), el('span', { class: 'kv' }, String(tpv)))
    );
    const pb = $('#pagesInt');
    pb.textContent = '';
    const pk = Object.keys(pv).sort((a, b) => pv[b] - pv[a]);
    if (!pk.length) pb.append(el('p', { class: 'empty' }, t('no_data')));
    for (const k of pk) {
      const pct = tp ? Math.round(pv[k] * 100 / tp) : 0;
      pb.append(el('div', { class: 'arow', style: { gridTemplateColumns: '1fr 170px' } },
        el('span', { style: { fontSize: '.95rem' } }, pgLabel(k)),
        el('span', { class: 'badge st-new' }, String(pv[k]) + ' · ' + pct + '%')));
    }
    const db = $('#prodsInt');
    db.textContent = '';
    const dk = Object.keys(pvv).sort((a, b) => pvv[b] - pvv[a]);
    if (!dk.length) db.append(el('p', { class: 'empty' }, t('no_data')));
    for (const k of dk) {
      const p = prodById(k);
      db.append(el('div', { class: 'arow', style: { gridTemplateColumns: '1fr 90px 110px' } },
        el('span', { style: { fontSize: '.95rem' } }, p ? prodName(p) : k),
        el('span', { class: 'badge st-conf' }, String(pvv[k])),
        p ? el('a', { class: 'ad-btn', href: '../' + productUrl(p), target: '_blank', rel: 'noopener noreferrer' }, t('btn_view')) : el('span')));
    }
  }
  $('#intReset').addEventListener('click', async () => {
    if (await confirmDlg(t('int_reset'))) { S.pageviews = {}; S.prodViews = {}; saveState(); render(); toast(t('toast_reset')); }
  });
  render();
  window.RBM_RERENDER = render;
}

const PAGE_INIT = {
  index: pageDash,
  orders: pageOrders,
  discounts: pageDiscounts,
  reviews: pageReviews,
  colors: pageColors,
  products: pageProducts,
  blog: pageBlogAdmin,
  marketing: pageMarketing,
  customers: pageCustomers,
  interests: pageInterests,
  faq: pageFaqAdmin,
  plugins: pagePluginsAdmin,
  mcp: pageMcpAdmin,
  aiseo: pageAiSeo,
  settings: pageSettings
};
/* ============================================================
   PAGE: blog (articles CMS + live SEO checker)
   ============================================================ */
function pageBlogAdmin() {
  let editingId = null;
  const F = ['bl_title_ar', 'bl_title_fr', 'bl_title_en', 'bl_desc', 'bl_body', 'bl_tags', 'bl_keyword', 'bl_slug'];
  function seoCheck() {
    const tA = $('#bl_title_ar').value.trim() || $('#bl_title_fr').value.trim() || $('#bl_title_en').value.trim();
    const desc = $('#bl_desc').value.trim();
    const body = $('#bl_body').value.trim();
    const kw = ($('#bl_keyword').value.trim() || '').toLowerCase();
    const slug = $('#bl_slug').value.trim();
    const words = body ? body.split(/\s+/).filter(Boolean).length : 0;
    const firstPara = (body.split(/\n\s*\n/)[0] || '').toLowerCase();
    const rules = [
      [t('seo_tlen'), tA.length >= 30 && tA.length <= 60],
      [t('seo_dlen'), desc.length >= 70 && desc.length <= 160],
      [t('seo_ktitle'), !kw || tA.toLowerCase().includes(kw)],
      [t('seo_kdesc'), !kw || desc.toLowerCase().includes(kw)],
      [t('seo_kbody'), !kw || firstPara.includes(kw)],
      [t('seo_words'), words >= 300],
      [t('seo_slug'), /^[a-z0-9\u0621-\u064A][a-z0-9\u0621-\u064A-]*$/.test(slug) && slug.length <= 90]
    ];
    const box = $('#seoList');
    box.textContent = '';
    rules.forEach(rl => box.append(el('div', { class: 'seo-row' + (rl[1] ? ' ok' : ' bad') }, el('span', {}, rl[0]), el('b', {}, rl[1] ? '✓' : '✕'))));
    const n = rules.filter(r => r[1]).length;
    const sc = $('#seoScore');
    sc.textContent = t('seo_score') + ': ' + n + '/' + rules.length + (n === rules.length ? ' ✓' : '');
    sc.className = 'seo-score' + (n === rules.length ? ' all' : '');
  }
  function renderList() {
    const box = $('#blList');
    box.textContent = '';
    const list = (S.articles || []).slice().sort((a, b) => b.ts - a.ts);
    if (!list.length) { box.append(el('p', { class: 'empty' }, t('ab_none'))); return; }
    list.forEach(a => {
      const row = el('div', { class: 'bl-row' },
        el('div', { class: 'bl-inf' },
          el('b', {}, a.title.ar || a.title.fr || a.title.en || a.id),
          el('span', {}, artDateSafe(a) + ' · ' + (a.views || 0) + ' ' + t('ab_views') + ' · /' + (a.slug || ''))),
        el('span', { class: 'bl-st' + (a.published ? ' on' : '') }, a.published ? t('ab_pub') : t('ab_draft')),
        el('button', { class: 'btn btn-outline btn-sm', type: 'button' }, t('ab_edit')),
        el('button', { class: 'btn btn-outline btn-sm bl-del', type: 'button' }, t('ab_del')));
      const [editB, delB] = row.querySelectorAll('button');
      editB.addEventListener('click', () => loadForm(a));
      delB.addEventListener('click', () => {
        S.articles = (S.articles || []).filter(x => x.id !== a.id);
        saveState(); renderList(); toast(t('toast_deleted'));
      });
      box.append(row);
    });
  }
  function artDateSafe(a) { try { return new Date(a.ts).toLocaleDateString(lang === 'fr' ? 'fr-MA' : 'ar-MA'); } catch (e) { return ''; } }
  function clearForm() {
    editingId = null;
    F.forEach(id => { const n = $('#' + id); if (n) n.value = ''; });
    const p = $('#bl_pub'); if (p) p.checked = true;
    seoCheck();
  }
  function loadForm(a) {
    editingId = a.id;
    $('#bl_title_ar').value = a.title.ar || '';
    $('#bl_title_fr').value = a.title.fr || '';
    $('#bl_title_en').value = a.title.en || '';
    $('#bl_desc').value = a.desc.ar || a.desc.fr || '';
    $('#bl_body').value = a.body.ar || a.body.fr || a.body.en || '';
    $('#bl_tags').value = (a.tags || []).join(', ');
    $('#bl_keyword').value = a.keyword || '';
    $('#bl_slug').value = a.slug || '';
    $('#bl_pub').checked = !!a.published;
    try { $('.ad-main').scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
    seoCheck();
  }
  $('#bl_title_ar').addEventListener('input', () => {
    const s = $('#bl_slug');
    if (!editingId && s && !s.value.trim()) s.value = typeof slugify === 'function' ? slugify($('#bl_title_ar').value || $('#bl_title_fr').value) : '';
    seoCheck();
  });
  F.forEach(id => { const n = $('#' + id); if (n) n.addEventListener('input', seoCheck); });
  $('#blNew').addEventListener('click', clearForm);
  $('#blSave').addEventListener('click', () => {
    const tA = sanitize($('#bl_title_ar').value, 140);
    const body = sanitize($('#bl_body').value, 30000);
    if (tA.length < 3 || body.length < 30) { toast(t('e_name'), 'err'); return; }
    const tF = sanitize($('#bl_title_fr').value, 140), tE = sanitize($('#bl_title_en').value, 140);
    const art = {
      id: editingId || (typeof uid === 'function' ? uid() : 'a' + Date.now()),
      slug: sanitize($('#bl_slug').value, 90) || (typeof slugify === 'function' ? slugify(tF || tE || tA) : tA.slice(0, 40)),
      title: { ar: tA, fr: tF, en: tE },
      desc: { ar: sanitize($('#bl_desc').value, 220), fr: sanitize($('#bl_desc').value, 220), en: sanitize($('#bl_desc').value, 220) },
      body: { ar: body, fr: editingId ? (S.articles.find(x => x.id === editingId).body.fr || '') : '', en: editingId ? (S.articles.find(x => x.id === editingId).body.en || '') : '' },
      tags: $('#bl_tags').value.split(',').map(x => sanitize(x, 30)).filter(Boolean).slice(0, 6),
      keyword: sanitize($('#bl_keyword').value, 60),
      ts: editingId ? (S.articles.find(x => x.id === editingId).ts || Date.now()) : Date.now(),
      published: $('#bl_pub').checked,
      views: editingId ? (S.articles.find(x => x.id === editingId).views || 0) : 0
    };
    const i = (S.articles || []).findIndex(x => x.id === art.id);
    if (i >= 0) S.articles[i] = art; else { S.articles = S.articles || []; S.articles.unshift(art); }
    saveState();
    clearForm();
    renderList();
    toast(t('toast_order'), 'ok');
  });
  function parseBulk(txt) {
    return String(txt || '').split(/\n-{3,}\n/).map(b => b.trim()).filter(Boolean).map(block => {
      const lines = block.split('\n');
      let title = '', desc = '', kw = '', faq = [];
      const bodyLines = [];
      lines.forEach(l => {
        let m;
        if ((m = l.match(/^title:\s*(.+)$/i))) title = m[1].trim();
        else if ((m = l.match(/^desc:\s*(.+)$/i))) desc = m[1].trim();
        else if ((m = l.match(/^kw:\s*(.+)$/i))) kw = m[1].trim();
        else if ((m = l.match(/^faq:\s*(.+)$/i))) {
          faq = m[1].split(';;').map(pair => { const kv = pair.split('::'); return { q: sanitize(kv[0] || '', 200), a: sanitize(kv[1] || '', 600) }; }).filter(x => x.q && x.a);
        } else bodyLines.push(l);
      });
      return { title, desc, kw, faq, body: bodyLines.join('\n').trim() };
    }).filter(x => x.title && x.body);
  }
  $('#blBulkGo').addEventListener('click', () => {
    const arts = parseBulk($('#bl_bulk').value);
    if (!arts.length) { toast(t('e_name'), 'err'); return; }
    S.articles = S.articles || [];
    arts.forEach(x => S.articles.unshift({
      id: (typeof uid === 'function' ? uid() : 'a' + Date.now() + Math.random().toString(36).slice(2, 6)),
      slug: (typeof slugify === 'function' ? slugify(x.title) : x.title.slice(0, 40)) || ('post-' + Date.now()),
      title: { ar: sanitize(x.title, 140), fr: '', en: '' },
      desc: { ar: sanitize(x.desc, 220), fr: '', en: '' },
      body: { ar: sanitize(x.body, 30000), fr: '', en: '' },
      tags: x.kw ? [sanitize(x.kw, 30)] : [],
      keyword: sanitize(x.kw, 60),
      ts: Date.now(), published: true, views: 0,
      faq: x.faq, image: { url: '', alt: '' }
    }));
    saveState();
    $('#bl_bulk').value = '';
    renderList();
    toast(t('ab_bulk') + ': ' + arts.length, 'ok');
  });
  renderList();
  seoCheck();
}

/* ============================================================
   PAGE: faq (site FAQ CMS)
   ============================================================ */
function pageFaqAdmin() {
  const box = $('#faqAdmList');
  if (!box) return;
  const LANGS = ['ar', 'fr', 'en'];
  function faqRow(f) {
    const wrap = el('div', { class: 'faq-adm-row' });
    const grid = el('div', { class: 'faq-adm-grid' });
    LANGS.forEach(l => {
      grid.append(el('input', { type: 'text', maxlength: 200, 'data-f': 'q', 'data-l': l, placeholder: t('faqadm_q') + ' ' + l.toUpperCase(), value: (f && f.q && f.q[l]) || '' }));
    });
    LANGS.forEach(l => {
      grid.append(el('input', { type: 'text', maxlength: 800, 'data-f': 'a', 'data-l': l, placeholder: t('faqadm_a') + ' ' + l.toUpperCase(), value: (f && f.a && f.a[l]) || '' }));
    });
    wrap.append(grid);
    wrap.append(el('button', { class: 'del-btn btn-sm', type: 'button' }, t('toast_deleted')));
    wrap.querySelector('.del-btn').addEventListener('click', () => { wrap.remove(); });
    return wrap;
  }
  function collect() {
    return $$('.faq-adm-row', box).map(r => {
      const e = { q: {}, a: {} };
      $$('input', r).forEach(inp => { e[inp.dataset.f][inp.dataset.l] = sanitize(inp.value, inp.dataset.f === 'q' ? 200 : 800); });
      return e;
    }).filter(x => x.q.ar);
  }
  function render() {
    box.textContent = '';
    (S.faq || []).forEach(f => box.append(faqRow(f)));
    if (!(S.faq || []).length) box.append(el('p', { class: 'set-sub' }, t('faqadm_hint')));
  }
  $('#faqAdd').addEventListener('click', () => { const p = box.querySelector('.set-sub'); if (p) p.remove(); box.append(faqRow(null)); });
  $('#faqSave').addEventListener('click', () => {
    S.faq = collect().slice(0, 10);
    saveState();
    render();
    toast(t('faqadm_ok'), 'ok');
  });
  $('#faqBulkGo').addEventListener('click', () => {
    const lines = String($('#faqBulk').value || '').split('\n').map(l => l.trim()).filter(Boolean);
    const rows = lines.map(l => {
      const k = l.split('::').map(x => x.trim());
      return { q: { ar: k[0] || '', fr: k[2] || '', en: k[4] || '' }, a: { ar: k[1] || '', fr: k[3] || '', en: k[5] || '' } };
    }).filter(x => x.q.ar);
    if (!rows.length) { toast(t('e_name'), 'err'); return; }
    S.faq = (S.faq || []).concat(rows).slice(0, 10);
    saveState();
    $('#faqBulk').value = '';
    render();
    toast(t('faqadm_ok') + ' (' + rows.length + ')', 'ok');
  });
  render();
}

/* ============================================================
   PAGE: plugins (feature toggles)
   ============================================================ */
function pagePluginsAdmin() {
  const P = [['welcome', 'plg_welcome'], ['proof', 'plg_proof'], ['petals', 'plg_petals'], ['waFloat', 'plg_wafloat'], ['blog', 'plg_blog']];
  const box = $('#plgList');
  if (!box) return;
  box.textContent = '';
  const S2 = S.settings.plugins || {};
  P.forEach(pair => {
    const cb = el('input', { type: 'checkbox', id: 'plg_' + pair[0] });
    cb.checked = S2[pair[0]] !== false;
    const row = el('label', { class: 'chk-gift', for: 'plg_' + pair[0] }, cb, el('span', {}, t(pair[1])));
    box.append(row);
  });
  $('#plgSave').addEventListener('click', () => {
    S.settings.plugins = S.settings.plugins || {};
    P.forEach(pair => { const n = $('#plg_' + pair[0]); if (n) S.settings.plugins[pair[0]] = n.checked; });
    saveState();
    renderChrome(document.body.dataset.page || '');
    toast(t('plg_ok'), 'ok');
  });
}

/* ============================================================
   PAGE: mcp (AI assistant discovery)
   ============================================================ */
function pageMcpAdmin() {
  const tok = $('#mcpTokenView');
  if (!tok) return;
  let reveal = false;
  function paint() {
    tok.value = reveal ? (S.settings.mcpToken || '') : (S.settings.mcpToken || '').slice(0, 4) + '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
  }
  paint();
  $('#mcpReveal').addEventListener('click', () => { reveal = !reveal; paint(); });
  $('#mcpCopy').addEventListener('click', () => { try { if (navigator.clipboard) navigator.clipboard.writeText(S.settings.mcpToken || ''); } catch (e) {} toast(t('mcp_copied'), 'ok'); });
  $('#mcpRegen').addEventListener('click', () => {
    S.settings.mcpToken = 'rbm_' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 6);
    saveState();
    reveal = true;
    paint();
    toast(t('mcp_gen'), 'ok');
  });
  const eps = $('#mcpEps');
  if (eps) {
    [['https://rosebymarry.com/mcp.json', 'MCP catalog'], ['https://rosebymarry.com/ai-plugin.json', 'AI plugin manifest'], ['https://rosebymarry.com/llms.txt', 'llms.txt'], ['https://rosebymarry.com/ai.txt', 'ai.txt'], ['https://rosebymarry.com/sitemap.xml', 'sitemap']].forEach(pair => {
      eps.append(el('div', { class: 'seo-row ok' }, el('span', {}, pair[1]), el('a', { href: pair[0], target: '_blank', rel: 'noopener noreferrer', class: 'bl-st on' }, pair[0].replace('https://rosebymarry.com', ''))));
    });
  }
}

/* ============================================================
   PAGE: aiseo (published AI/SEO discovery files)
   Read-only index. Paths mirror scripts/{generate-llms-enhanced,optimize-ai-seo}.mjs
   and the public /ai page — keep the three in sync when a file is added.
   ============================================================ */
const AI_SEO_FILES = [
  { path: '/llms.txt', label: 'llms.txt', note: { ar: 'فهرس مختصر لكل الصفحات والمنتجات', fr: 'Index concis des pages et produits', en: 'Concise index of pages and products' } },
  { path: '/llms-full.txt', label: 'llms-full.txt', note: { ar: 'المرجع الكامل بثلاث لغات', fr: 'Référence complète trilingue', en: 'Full trilingual reference' } },
  { path: '/ai.txt', label: 'ai.txt', note: { ar: 'سياسة الاستخدام والإسناد', fr: 'Politique d’usage et attribution', en: 'Usage policy and attribution' } },
  { path: '/robots.txt', label: 'robots.txt', note: { ar: 'سماح لأكثر من 20 زاحفاً + الخرائط', fr: '20+ crawlers autorisés + plans', en: '20+ crawlers allowed + sitemaps' } },
  { path: '/sitemap.xml', label: 'sitemap.xml', note: { ar: 'كل المسارات العامة والمنتجات', fr: 'Toutes les routes et produits', en: 'All public routes and products' } },
  { path: '/ai-sitemap.xml', label: 'ai-sitemap.xml', note: { ar: 'قائمة قراءة قصيرة للذكاء الاصطناعي', fr: 'Liste de lecture courte pour l’IA', en: 'Short AI reading list' } },
  { path: '/.well-known/ai-plugin.json', label: 'ai-plugin.json', note: { ar: 'مانيفست ChatGPT', fr: 'Manifeste ChatGPT', en: 'ChatGPT manifest' } },
  { path: '/.well-known/openapi.json', label: 'openapi.json', note: { ar: 'وصف OpenAPI للقراءة فقط', fr: 'Description OpenAPI en lecture seule', en: 'Read-only OpenAPI description' } },
  { path: '/mcp.json', label: 'mcp.json', note: { ar: 'كتالوج MCP للمساعدات الذكية', fr: 'Catalogue MCP pour assistants IA', en: 'MCP catalog for AI assistants' } },
  { path: '/ai', label: '/ai', note: { ar: 'الصفحة العامة التي تعرض هذه الملفات', fr: 'La page publique listant ces fichiers', en: 'The public page listing these files' } }
];
function pageAiSeo() {
  const box = $('#aiSeoList');
  if (!box) return;
  box.textContent = '';
  const base = (S.settings.siteUrl || '').replace(/\/$/, '');
  for (const f of AI_SEO_FILES) {
    /* relative href keeps it working on localhost, staging and the live domain alike */
    const href = '..' + (f.path === '/ai' ? '/ai.html' : f.path);
    box.append(el('div', { class: 'seo-row ok' },
      el('span', {}, el('b', { style: { fontFamily: 'monospace', background: 'none', width: 'auto', height: 'auto', display: 'inline', color: 'inherit' } }, f.label),
        el('span', { class: 'hintline', style: { display: 'block' } }, (f.note[lang] || f.note.en))),
      el('a', { href, target: '_blank', rel: 'noopener noreferrer', class: 'bl-st on', title: base ? base + f.path : f.path }, t('aip_open'))
    ));
  }
}

/* ---------- boot ---------- */
(async function bootAdmin() {
  if (!store.get(STATE_KEY)) {
    const old = await idbLoad();
    if (old) S = migrate(old);
  }
  if (!S.settings.passHash || !/^(s2|fb):/.test(S.settings.passHash)) { S.settings.passHash = await hashPass('1234'); saveState(); }
  applyStaticText();
  renderShell();
  bindShell();
  window.RBM_PANE_SHELL = ($('.pane.act') || {}).innerHTML || '';
  updateOrdBadge();
  if (isUnlocked()) openContent();
  else {
    document.body.classList.add('gated');
    openModal('pcModal');
  }
  window.RBM_RERENDER = () => { if (isUnlocked()) openContent(); };
  setTimeout(function () { if (isUnlocked() && document.body.classList.contains('gated')) openContent(); }, 400);
  window.RBM_BOOT_OK = true;
})().catch(function (err) {
  try {
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;background:#A03A3A;color:#fff;padding:14px 18px;font-size:14px;direction:ltr;text-align:left';
    box.textContent = 'Admin error: ' + (err && err.message ? err.message : err);
    document.body.appendChild(box);
  } catch (e) {}
});
