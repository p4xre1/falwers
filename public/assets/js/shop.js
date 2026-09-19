'use strict';
/* ============================================================
   Rose by Marry v2 — storefront logic (all customer pages)
   Page dispatch via <body data-page="...">
   ============================================================ */

/* ---------- shared pricing (promo & delivery) ---------- */
function appliedPromo() {
  let code = '';
  try { code = sanitize(sessionStorage.getItem('rbm_promo') || '', 20).toUpperCase(); } catch (e) {}
  if (!code) return null;
  const pc = S.promoCodes.find(c => c.enabled && c.code === code);
  if (!pc) return null;
  const sub = cartSubtotal();
  if (sub < pc.minTotal) return { pc, blocked: true };
  const disc = pc.type === 'percent' ? Math.round(sub * pc.value) / 100 : Math.min(pc.value, sub);
  return { pc, disc, blocked: false };
}
function currentZone() { return zoneById(store.get('rbm_zone')) || S.zones[0] || null; }
function deliveryFee(sub) {
  const z = currentZone();
  if (!z) return 0;
  if (S.settings.freeShip > 0 && sub >= S.settings.freeShip) return 0;
  return Number(z.fee) || 0;
}
function appliedManual(base) {
  const list = (S.discounts || []).filter(d => d && d.enabled);
  for (const d of list) {
    if (base >= (d.minTotal || 0)) {
      const amt = Math.min(d.type === 'percent' ? base * d.value / 100 : d.value, base);
      if (amt > 0) return { d, amt };
    }
  }
  return null;
}
function recentIds(exclude) { let a = []; try { a = JSON.parse(store.get('rbm_recent') || '[]') || []; } catch (e) {} return a.filter(id => id !== exclude).slice(0, 8); }
function recordRecent(pid) { if (!pid) return; let a = []; try { a = JSON.parse(store.get('rbm_recent') || '[]') || []; } catch (e) {} a = [pid].concat(a.filter(x => x !== pid)).slice(0, 8); store.set('rbm_recent', JSON.stringify(a)); }
function renderRecentStrip(host, exclude) {
  host = typeof host === 'string' ? $(host) : host;
  if (!host) return;
  const ids = recentIds(exclude).map(id => prodById(id)).filter(p => p && p.active);
  if (!ids.length) { if (host.parentNode) host.remove(); return; }
  host.textContent = '';
  host.append(el('h2', { class: 'section-title', style: { fontSize: '1.4rem', margin: '34px 0 16px' } }, t('recent_t')));
  const g = el('div', { class: 'grid-prod' });
  ids.slice(0, 4).forEach(p => g.append(productCard(p)));
  bindCardActions(g);
  host.append(g);
}
function cartTotals() {
  const sub = cartSubtotal();
  const ap = appliedPromo();
  const disc1 = ap && !ap.blocked ? ap.disc : 0;
  const am = appliedManual(sub - disc1);
  const disc2 = am ? am.amt : 0;
  const disc = disc1 + disc2;
  const ship = CART.items.length ? deliveryFee(sub - disc) : 0;
  return { sub, disc, disc1, disc2, am, ship, total: Math.max(0, sub - disc) + ship, ap };
}
function setPromo(code) {
  try { if (code) sessionStorage.setItem('rbm_promo', String(code).toUpperCase()); else sessionStorage.removeItem('rbm_promo'); } catch (e) {}
}

/* ---------- WhatsApp order message ---------- */
function itemsLines(items) {
  const L = [];
  items.forEach((it, i) => {
    const unit = it.price != null ? (Number(it.price) || 0) : itemUnitPrice(it);
    const name = it.custom ? (t('base_lbl') + ' — ' + it.custom.qty + ' 🌹') : (prodName(prodById(it.pid) || { ar: it.name || '?' }));
    const col = it.colorId && colorById(it.colorId) ? colorName(colorById(it.colorId)) : '';
    const extras = Array.isArray(it.addons)
      ? it.addons.map(aid => { const a = addonById(aid); return a ? addonName(a) + (a.price > 0 ? ' (+' + a.price + ')' : '') : ''; }).filter(Boolean).join('، ')
      : String(it.addons || '');
    let line = (i + 1) + ') ' + name;
    if (col) line += '\n   • ' + t('color_t') + ': ' + col;
    if (extras) line += '\n   • ' + t('d_addons_q') + ': ' + extras;
    if (it.note) line += '\n   • 💌: ' + it.note;
    line += '\n   • ' + it.qty + ' × ' + money(unit) + ' = ' + money(unit * it.qty);
    L.push(line);
  });
  return L.join('\n');
}
function buildOrderMessage(order) {
  const L2 = '----------------------------------------';
  const lines = [];
  lines.push(L2);
  lines.push('🌹 *طلب جديد من المتجر - Rose by Marry*');
  lines.push('🆔 ' + order.id);
  lines.push(L2);
  if (order.gift) lines.push(t('gift_wa'));
  lines.push('🛍 *العناصر:*');
  lines.push(itemsLines(order.items));
  lines.push(L2);
  if (order.promo) lines.push('🎟 *كود الخصم:* ' + order.promo + ' (−' + money(order.discount) + ')');
  if (order.manual) lines.push('*خصم إداري:* −' + money(order.manual));
  lines.push('🚚 *التوصيل:* ' + (order.zoneName || '—') + ' (' + money(order.zoneFee) + ')');
  lines.push('• *الاسم الكامل:* ' + order.name);
  lines.push('• *الهاتف:* ' + order.phone);
  lines.push('• *المدينة / العنوان:* ' + order.city);
  if (order.date) lines.push('• *تاريخ التوصيل:* ' + order.date);
  if (order.note) lines.push('• *ملاحظات:* ' + order.note);
  lines.push('• *طريقة الدفع:* الدفع عند الاستلام (COD)');
  lines.push('💰 *المبلغ الإجمالي:* ' + money(order.total));
  lines.push(L2);
  return lines.join('\n');
}
function logOrder(order) {
  S.orders.unshift(order);
  if (S.orders.length > 1000) S.orders.length = 1000;
  if (order.promo) { const pc = S.promoCodes.find(c => c.code === order.promo); if (pc) pc.used++; }
  saveState();
}

/* ---------- badges-of-page helpers ---------- */
function notFound(container, msg) {
  container.textContent = '';
  container.append(el('p', { class: 'empty no-results' }, msg));
}

/* Product-page dead end: a missing/inactive product must still leave a usable,
   scrollable page with a way back into the shop (never a one-line blank screen). */
function productMissing(root) {
  if (!root) return;
  root.textContent = '';
  const art = el('div', { style: { width: '96px', margin: '0 auto', opacity: '.9', color: 'var(--wine)' } });
  art.innerHTML = bouquetArt('#C8102E', 5, true);
  root.append(
    el('div', { class: 'empty no-results' },
      art,
      el('p', { style: { fontWeight: '700', color: 'var(--wine)' } }, t('no_results')),
      el('div', { class: 'pd-missing-actions' },
        el('a', { class: 'btn btn-primary', href: LINKS.shop }, t('nav_shop')),
        el('a', { class: 'btn btn-outline', href: LINKS.home }, t('nav_home'))
      )
    )
  );
  const picks = S.products.filter(x => x.active).slice(0, 4);
  if (picks.length) {
    root.append(el('h2', { class: 'section-title', style: { fontSize: '1.3rem', margin: '38px 0 16px' } }, t('related')));
    const grid = el('div', { class: 'grid-prod' });
    picks.forEach(x => grid.append(productCard(x)));
    root.append(grid);
    bindCardActions(grid);
  }
}

/* ============================================================
   PAGE: home
   ============================================================ */
function pageHome() {
  /* categories -> editorial tiles */
  const catsBox = $('#catsGrid');
  if (catsBox) {
    catsBox.textContent = '';
    for (const c of S.categories) {
      const img = catTileImg(c);
      const tile = el('a', { class: 'tile reveal', href: 'shop.html?cat=' + encodeURIComponent(c.id) });
      if (img) {
        tile.append(el('span', { class: 'tile-img', style: { backgroundImage: 'url(' + img + ')' } }));
      } else {
        tile.append(el('span', { class: 'tile-img', style: { background: 'radial-gradient(120% 90% at 50% 10%, #6B1A2E, #470D1B)' } }));
        tile.append(el('span', { style: { position: 'absolute', inset: '0', display: 'grid', placeItems: 'center', fontSize: '2.4rem' } }, c.icon));
      }
      tile.append(el('span', { class: 'tile-lbl' }, catName(c)));
      catsBox.append(tile);
    }
  }
  /* featured products */
  const feat = $('#featGrid');
  if (feat) {
    feat.textContent = '';
    const list = S.products.filter(p => p.active && p.featured).slice(0, 8);
    if (!list.length) S.products.filter(p => p.active).slice(0, 4).forEach(p => feat.append(productCard(p)));
    else list.forEach(p => feat.append(productCard(p)));
    bindCardActions(feat);
  }
  /* testimonials */
  const tb = $('#testiGrid');
  if (tb) {
    tb.textContent = '';
    const avatars = ['img/tile-box.jpg', 'img/tile-occ.jpg', 'img/tile-gift.jpg'];
    const rs = S.reviews.slice().sort((a, b) => b.rating - a.rating || b.ts - a.ts).slice(0, 3);
    if (!rs.length) tb.append(el('p', { class: 'empty', style: { gridColumn: '1/-1' } }, t('no_reviews')));
    rs.forEach((r, i) => {
      tb.append(el('div', { class: 'tcard reveal' },
        el('div', { class: 'tavatar', style: { backgroundImage: 'url(' + avatars[i % avatars.length] + ')' } }),
        el('div', { style: { marginBottom: '10px' } }, starsEl(r.rating)),
        el('p', { class: 'tquote' }, '“' + r.text + '”'),
        el('div', { class: 'tname' }, r.name)
      ));
    });
  }
  /* hero art & CTA */
  const heroArt = $('#heroArt');
  if (heroArt) { const hc = S.colors.find(x => x.available) || S.colors[0]; heroArt.innerHTML = bouquetArt(hc ? hc.hex : '#C8102E', 9, true); }
  const ctaWa = $('#ctaWa');
  if (ctaWa) ctaWa.addEventListener('click', () => {
    const greet = lang === 'fr' ? 'Bonjour *Rose by Marry*, je souhaite un renseignement sur vos bouquets de roses satin.'
      : lang === 'en' ? 'Hello *Rose by Marry*, I would like to ask about your satin rose bouquets.'
      : 'مرحباً *Rose by Marry*، أريد الاستفسار عن باقات ورد الساتان.';
    openWa(greet);
  });
  initBuilder();
}
function rerenderHome() { pageHome(); }
/* ---------- custom bouquet builder (home) ---------- */
function initBuilder() {
  const selB = { tierId: null, custom: false, qty: 5, colorId: null, addonSel: {}, addonText: {} };
  const tiers = S.builderTiers.slice().sort((a, b) => a.qty - b.qty);
  const defT = tiers.find(x => x.qty === 5) || tiers[0];
  if (defT) { selB.tierId = defT.id; selB.qty = defT.qty; }
  const defC = S.colors.find(c => c.available) || S.colors[0];
  if (defC) selB.colorId = defC.id;

  function basePrice() {
    if (selB.custom) return clampNum(Math.round(selB.qty), 1, 999) * S.settings.builderUnit;
    const tr = tiers.find(x => x.id === selB.tierId);
    return tr ? tr.price : 0;
  }
  function qtyNow() { return selB.custom ? clampNum(Math.round(selB.qty), 1, 999) : (tiers.find(x => x.id === selB.tierId) || { qty: 0 }).qty; }
  function addonsTotal() { let s = 0; for (const a of S.addons) if (a.enabled && selB.addonSel[a.id]) s += a.price; return s; }

  function tierUnit(qty) {
    if (lang === 'ar') return qty === 1 ? t('tier_u1') : (qty >= 3 && qty <= 10) ? t('tier_un') : t('tier_u1');
    return qty === 1 ? t('tier_u1') : t('tier_un');
  }
  function renderTiers() {
    const box = $('#bTiers');
    box.textContent = '';
    const popQty = tiers.some(x => x.qty === 10) ? 10 : 0;
    for (const tr of tiers) {
      const on = !selB.custom && selB.tierId === tr.id;
      const card = el('button', {
        class: 'tier' + (on ? ' sel' : '') + (tr.qty === popQty ? ' pop' : ''), type: 'button', 'data-id': tr.id,
        onclick: () => { selB.custom = false; selB.tierId = tr.id; selB.qty = tr.qty; softRefresh(); }
      },
        el('span', { class: 'tick' }, '✦'),
        el('span', { class: 't-rose', 'aria-hidden': 'true' }, ''),
        el('div', { class: 'q' }, String(tr.qty)),
        el('div', { class: 'u' }, tierUnit(tr.qty)),
        el('div', { class: 'p' }, money(tr.price))
      );
      if (tr.qty === popQty) card.append(el('span', { class: 'pop-badge' }, t('tier_pop')));
      const roseSlot = card.querySelector('.t-rose');
      if (roseSlot) roseSlot.innerHTML = brandRoseSVG(22);
      box.append(card);
    }
    const cu = el('div', { class: 'tier tier-custom' + (selB.custom ? ' sel' : '') },
      el('span', { class: 'cu-t' }, t('custom_t')),
      (() => {
        const inp = el('input', { type: 'number', min: '1', max: '999', inputmode: 'numeric', 'aria-label': t('custom_t') });
        if (selB.custom) inp.value = String(selB.qty);
        inp.addEventListener('input', () => {
          const v = parseInt(inp.value, 10);
          if (isNaN(v) || v < 1) { selB.custom = false; softRefresh(); return; }
          selB.custom = true; selB.qty = clampNum(v, 1, 999);
          const m = tiers.find(x => x.qty === selB.qty);
          if (m) { selB.custom = false; selB.tierId = m.id; }
          softRefresh();
        });
        return inp;
      })(),
      el('span', { class: 'hint' }, t('custom_hint') + ' ' + money(S.settings.builderUnit))
    );
    box.append(cu);
  }
  function renderColors() {
    const box = $('#bColors');
    box.textContent = '';
    for (const c of S.colors) {
      box.append(el('button', {
        class: 'sw' + (selB.colorId === c.id ? ' sel' : '') + (c.available ? '' : ' off'),
        type: 'button', disabled: c.available ? null : true,
        onclick: () => { if (c.available) { selB.colorId = c.id; renderColors(); refreshArt(); renderSum(); } }
      },
        el('span', { class: 'dot', style: { background: 'radial-gradient(circle at 35% 30%, ' + lighten(c.hex, .35) + ', ' + c.hex + ' 70%, ' + darken(c.hex, .18) + ')' } }),
        el('span', { class: 'nm' }, colorName(c))
      ));
    }
  }
  function renderAddonsB() {
    const box = $('#bAddons');
    box.textContent = '';
    for (const a of S.addons) {
      if (!a.enabled) continue;
      const wrap = el('div');
      const row = el('label', { class: 'a-row' + (selB.addonSel[a.id] ? ' sel' : '') },
        (() => {
          const chk = el('input', { class: 'a-chk', type: 'checkbox' });
          chk.checked = !!selB.addonSel[a.id];
          chk.addEventListener('change', () => {
            selB.addonSel[a.id] = chk.checked;
            row.classList.toggle('sel', chk.checked);
            const nf = wrap.querySelector('.note-field');
            if (nf) nf.classList.toggle('show', chk.checked && a.hasText);
            renderSum();
          });
          return chk;
        })(),
        el('span', { class: 'switch', 'aria-hidden': 'true' }),
        el('span', { class: 'a-ico' }, a.icon),
        el('span', { class: 'a-nm' }, addonName(a)),
        el('span', { class: 'a-pr' }, a.price > 0 ? '+' + money(a.price) : t('free_t'))
      );
      wrap.append(row);
      if (a.hasText) {
        const nf = el('div', { class: 'note-field' + (selB.addonSel[a.id] ? ' show' : '') });
        const inp = el('input', { type: 'text', maxlength: '120', placeholder: t('note_ph') });
        inp.addEventListener('input', () => { selB.addonText[a.id] = inp.value.slice(0, 120); });
        nf.append(inp);
        wrap.append(nf);
      }
      box.append(wrap);
    }
  }
  function refreshArt() {
    const c = colorById(selB.colorId) || S.colors[0];
    $('#bArt').innerHTML = bouquetArt(c ? c.hex : '#C8102E', qtyNow() || 5, true);
  }
  function renderSum() {
    const total = basePrice() + addonsTotal();
    $('#bTotal').textContent = money(total);
    $('#bArt').__total = total;
  }
  function softRefresh() {
    /* keep focus in custom input: update classes & totals without full rebuild */
    $$('#bTiers .tier[data-id]').forEach(b => b.classList.toggle('sel', !selB.custom && b.dataset.id === selB.tierId));
    const cu = $('#bTiers .tier-custom');
    if (cu) cu.classList.toggle('sel', selB.custom);
    renderSum();
    refreshArt();
  }
  function snapshotItem() {
    const c = colorById(selB.colorId);
    const addons = [];
    for (const a of S.addons) if (a.enabled && selB.addonSel[a.id]) addons.push(a.id);
    let note = '';
    for (const a of S.addons) if (a.enabled && a.hasText && selB.addonSel[a.id] && selB.addonText[a.id]) note = sanitize(selB.addonText[a.id], 120);
    return {
      key: uid(), pid: 'custom', custom: { qty: qtyNow() || 5, price: basePrice() },
      colorId: c ? c.id : null, qty: 1, addons, note
    };
  }
  $('#bAddCart').addEventListener('click', () => {
    if (basePrice() <= 0) { toast(t('toast_empty'), 'err'); return; }
    CART.add(snapshotItem());
    updateBadges();
    toast(t('added_to_cart'), 'ok');
  });
  $('#bOrderWa').addEventListener('click', () => {
    if (basePrice() <= 0) { toast(t('toast_empty'), 'err'); return; }
    const it = snapshotItem();
    const c = it.colorId ? colorById(it.colorId) : null;
    const extras = it.addons.map(aid => { const a = addonById(aid); return a ? addonName(a) : ''; }).filter(Boolean).join('، ');
    const L2 = '----------------------------------------';
    let msg = L2 + '\n🌹 *طلب جديد من المتجر - Rose by Marry*\n' + L2 + '\n'
      + '• *الحجم:* ' + it.custom.qty + ' وردة ساتان\n'
      + '• *اللون:* ' + (c ? colorName(c) : '') + '\n'
      + '• *الإضافات:* ' + (extras || 'بدون إضافات') + '\n'
      + (it.note ? '• *بطاقة الإهداء:* ' + it.note + '\n' : '')
      + '• *طريقة الدفع:* الدفع عند الاستلام (COD)\n'
      + '💰 *المبلغ الإجمالي:* ' + money(it.custom.price + addonsTotal()) + '\n' + L2;
    openWa(msg);
  });
  renderTiers(); renderColors(); renderAddonsB(); refreshArt(); renderSum();
}

/* ============================================================
   PAGE: shop
   ============================================================ */
function pageShop() {
  const grid = $('#shopGrid');
  const state = { cat: '', q: '', sort: 'rec', max: 0, color: '', occ: '' };
  try {
    const u = new URL(location.href);
    state.cat = u.searchParams.get('cat') || '';
    const occV = u.searchParams.get('occ') || '';
    state.occ = ['birth', 'anniv', 'wed', 'grad', 'baby', 'thanks'].indexOf(occV) >= 0 ? occV : '';
    if (u.searchParams.get('q')) state.q = sanitize(u.searchParams.get('q'), 60);
    const mx = Number(u.searchParams.get('max'));
    if (mx > 0) state.max = Math.min(mx, 100000);
    if (u.searchParams.get('sort') && ['rec', 'pa', 'pd', 'rate'].indexOf(u.searchParams.get('sort')) >= 0) state.sort = u.searchParams.get('sort');
  } catch (e) {}

  /* build category pills */
  const pills = $('#catPills');
  pills.textContent = '';
  const colorBox0 = $('#colorFilter');
  colorBox0.textContent = '';
  pills.append(el('button', { class: 'pill' + (state.cat === '' ? ' act' : ''), type: 'button', 'data-cat': '' }, t('filter_all')));
  for (const c of S.categories) {
    pills.append(el('button', { class: 'pill' + (state.cat === c.id ? ' act' : ''), type: 'button', 'data-cat': c.id }, c.icon + ' ' + catName(c)));
  }
  const search = $('#shopSearch');
  search.value = state.q;
  const sortSel = $('#shopSort');
  const maxInp = $('#shopMax');
  const colorBox = $('#colorFilter');
  for (const c of S.colors) {
    colorBox.append(el('button', {
      class: 'sw', type: 'button', title: colorName(c), style: { padding: '4px' },
      onclick: () => {
        state.color = state.color === c.id ? '' : c.id;
        $$('button', colorBox).forEach((b, i) => b.classList.toggle('sel', S.colors[i].id === state.color));
        renderGrid();
      }
    }, el('span', { class: 'dot', style: { background: c.hex, width: '26px', height: '26px' } })));
  }
  function renderGrid() {
    let list = S.products.filter(p => p.active);
    if (state.cat) list = list.filter(p => p.cat === state.cat);
    if (state.occ) { const f = list.filter(p => (p.occ || []).indexOf(state.occ) >= 0); if (f.length) list = f; }
    if (state.color) {
      /* color is an aesthetic filter: keep all (satin recolorable), but sort matching first */
      list = list.slice();
    }
    if (state.q) {
      const q = state.q.toLowerCase();
      list = list.filter(p => (p.ar + ' ' + p.fr + ' ' + p.en).toLowerCase().includes(q));
    }
    if (state.max > 0) list = list.filter(p => p.price <= state.max);
    if (state.sort === 'pa') list.sort((a, b) => a.price - b.price);
    else if (state.sort === 'pd') list.sort((a, b) => b.price - a.price);
    else if (state.sort === 'rate') list.sort((a, b) => prodRating(b.id).avg - prodRating(a.id).avg);
    else list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    grid.textContent = '';
    $('#shopCount').textContent = list.length + ' ' + t('results');
    if (!list.length) { notFound(grid, t('no_results')); return; }
    list.forEach(p => grid.append(productCard(p)));
    let rs = $('#recentWrap');
    if (!rs) { rs = el('div', { id: 'recentWrap', class: 'recent-sec' }); grid.parentNode.append(rs); }
    renderRecentStrip(rs);
  }
  pills.addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    state.cat = b.dataset.cat;
    $$('button', pills).forEach(x => x.classList.toggle('act', x === b));
    renderGrid();
  });
  search.addEventListener('input', debounce(() => { state.q = sanitize(search.value, 60); renderGrid(); }, 250));
  sortSel.addEventListener('change', () => { state.sort = sortSel.value; renderGrid(); });
  maxInp.addEventListener('input', debounce(() => { state.max = Number(maxInp.value) || 0; renderGrid(); }, 300));
  if (state.max > 0) maxInp.value = String(state.max);
  if (state.sort !== 'rec') sortSel.value = state.sort;
  renderGrid();
  bindCardActions(grid);
  window.__shopRerun = pageShop;
}

/* ============================================================
   PAGE: product
   ============================================================ */
function pageProduct() {
  let pid = '';
  try { pid = sanitize(new URL(location.href).searchParams.get('id') || '', 90); } catch (e) {}
  const p = prodBySlug(pid);
  try {
    if (p) {
      try { document.title = prodName(p) + ' | ورد ساتان — Rose by Marry'; } catch (e) {}
      const ld = { '@context': 'https://schema.org', '@type': 'Product',
        name: prodName(p), description: prodDesc(p) || undefined,
        sku: String(p.id), brand: { '@type': 'Brand', name: 'Rose by Marry' },
        offers: { '@type': 'Offer', priceCurrency: 'MAD', price: String(p.price),
          availability: p.active ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: location.href.split('#')[0] } };
      const catP = S.categories.find(c => c.id === p.cat);
      const bc = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: t('nav_home'), item: 'https://rosebymarry.com/' },
        { '@type': 'ListItem', position: 2, name: t('nav_shop'), item: 'https://rosebymarry.com/shop' }
      ] };
      if (catP) bc.itemListElement.push({ '@type': 'ListItem', position: 3, name: catName(catP), item: 'https://rosebymarry.com/shop.html?cat=' + encodeURIComponent(catP.id) });
      bc.itemListElement.push({ '@type': 'ListItem', position: catP ? 4 : 3, name: prodName(p), item: location.href.split('#')[0] });
      const sc = document.createElement('script');
      sc.type = 'application/ld+json';
      sc.textContent = JSON.stringify(ld);
      document.head.appendChild(sc);
      const sc2 = document.createElement('script');
      sc2.type = 'application/ld+json';
      sc2.textContent = JSON.stringify(bc);
      document.head.appendChild(sc2);
    }
  } catch (e) {}
  const root = $('#pdRoot');
  if (!p || !p.active) { productMissing(root); return; }

  const st = { colorId: null, qty: 1, addonSel: {}, note: '' };
  const defC = S.colors.find(c => c.available) || S.colors[0];
  if (defC) st.colorId = defC.id;
  const rating = prodRating(p.id);
  const cat = S.categories.find(c => c.id === p.cat);

  function renderAll() { renderMain(); renderAddons(); renderReviews(); renderRelated(); }
  function renderMain() {
    const c = colorById(st.colorId) || S.colors[0];
    root.textContent = '';
    root.append(
      el('div', { class: 'crumbs' },
        el('a', { href: LINKS.home }, t('nav_home')), el('span', { class: 'sep' }, '›'),
        el('a', { href: LINKS.shop }, t('nav_shop')), el('span', { class: 'sep' }, '›'),
        cat ? el('a', { href: 'shop.html?cat=' + encodeURIComponent(cat.id) }, catName(cat)) : el('span'),
        el('span', { class: 'sep' }, '›'), el('span', {}, prodName(p))
      ),
      el('div', { class: 'pd-grid' },
        el('div', { class: 'pd-art', id: 'pdArt' }, (() => { const w = el('div'); w.innerHTML = productArt(p, c ? c.hex : '#C8102E'); return w.firstElementChild; })()),
        el('div', { class: 'pd-info' },
          el('span', { class: 'pc-cat' }, cat ? cat.icon + ' ' + catName(cat) : ''),
          el('h1', {}, prodName(p)),
          el('div', { class: 'pc-rate' }, starsEl(rating.avg), el('span', {}, rating.n ? rating.avg.toFixed(1) + ' · ' + rating.n + ' ' + t('reviews_t') : '—')),
          el('div', { class: 'pd-price' },
            el('span', {}, money(p.price)),
            p.old > p.price ? el('span', { class: 'op' }, money(p.old)) : el('span')
          ),
          el('div', { class: 'pd-specs', id: 'pdSpecs' },
            el('div', { class: 'lbl' }, t('pd_specs')),
            el('ul', {},
              el('li', {}, String(p.qty) + ' ' + t('size_h_qty')),
              el('li', {}, p.cat === 'box' ? t('sbx_m') : p.cat === 'bouq' ? t('sb_m') : t('size_note').split('—')[0].trim()),
              el('li', {}, t('size_cta').split('?')[0].trim())
            ),
            el('a', { class: 'spec-link', href: 'size-guide.html' }, t('pd_spec_link'))
          ),
          el('div', { class: 'pd-share' },
            el('button', { class: 'btn btn-sm', id: 'pdShare', type: 'button' }, t('pd_share')),
            el('a', { class: 'btn btn-sm', href: 'https://api.whatsapp.com/send?text=' + encodeURIComponent(prodName(p) + ' — Rose by Marry: ' + location.href.split('#')[0]), target: '_blank', rel: 'noopener noreferrer' }, 'WhatsApp')
          ),
          el('p', { class: 'pd-desc' }, prodDesc(p)),
          el('div', { class: 'pd-sec' },
            el('div', { class: 'lbl' }, t('color_t')),
            (() => {
              const box = el('div', { class: 'swatches', id: 'pdColors' });
              for (const cc of S.colors) {
                box.append(el('button', {
                  class: 'sw' + (st.colorId === cc.id ? ' sel' : '') + (cc.available ? '' : ' off'),
                  type: 'button', disabled: cc.available ? null : true,
                  onclick: () => { if (!cc.available) return; st.colorId = cc.id; const art = $('#pdArt'); art.innerHTML = productArt(p, cc.hex); $$('#pdColors .sw').forEach(b => b.classList.toggle('sel', b === arguments[0])); renderColorsSel(cc.id); }
                },
                  el('span', { class: 'dot', style: { background: 'radial-gradient(circle at 35% 30%, ' + lighten(cc.hex, .35) + ', ' + cc.hex + ' 70%, ' + darken(cc.hex, .18) + ')' } }),
                  el('span', { class: 'nm' }, colorName(cc))
                ));
              }
              return box;
            })()
          ),
          el('div', { class: 'pd-sec' },
            el('div', { class: 'lbl' }, t('qty_t')),
            (() => {
              const stp = el('div', { class: 'stepper' },
                el('button', { type: 'button', 'aria-label': '-', onclick: () => { st.qty = Math.max(1, st.qty - 1); qv.textContent = String(st.qty); } }, '−'),
                el('span', { class: 'qv' }, String(st.qty)),
                el('button', { type: 'button', 'aria-label': '+', onclick: () => { st.qty = Math.min(99, st.qty + 1); qv.textContent = String(st.qty); } }, '+')
              );
              const qv = stp.querySelector('.qv');
              return stp;
            })()
          ),
          el('div', { class: 'pd-sec' },
            el('div', { class: 'lbl' }, t('extras_t')),
            el('div', { class: 'addons-list', id: 'pdAddons' })
          ),
          el('div', { class: 'pd-buy' },
            el('button', { class: 'btn btn-primary btn-lg', id: 'pdAddCart', type: 'button' }, t('add_cart')),
            el('button', { class: 'btn btn-outline btn-lg', id: 'pdWa', type: 'button' }, t('buy_wa')),
            el('button', { class: 'btn btn-outline btn-lg', id: 'pdCopy', type: 'button', title: t('btn_copy') }, t('btn_copy')),
            (() => { const hb = el('button', { class: 'icon-heart' + (WISH.has(p.id) ? ' on' : ''), type: 'button', title: 'wishlist', 'aria-label': 'wishlist', 'aria-pressed': WISH.has(p.id) ? 'true' : 'false', style: { width: '50px', height: '50px' } }); hb.append(heartEl()); hb.addEventListener('click', () => { const on = WISH.toggle(p.id); hb.classList.toggle('on', on); hb.setAttribute('aria-pressed', on ? 'true' : 'false'); updateBadges(); toast(on ? t('wishlist_added') : t('wishlist_removed')); }); return hb; })()
          )
        )
      ),
      el('div', { class: 'tabs' },
        el('button', { class: 'tab-btn act', type: 'button', 'data-tab': 'desc' }, t('desc_t')),
        el('button', { class: 'tab-btn', type: 'button', 'data-tab': 'revs' }, t('reviews_t') + ' (' + rating.n + ')')
      ),
      el('div', { id: 'tabDesc' }, el('p', { class: 'pd-desc', style: { maxWidth: '720px' } }, prodDesc(p))),
      el('div', { id: 'tabRevs', class: 'hidden' },
        el('div', { id: 'revList' }),
        el('h3', { style: { color: 'var(--wine)', margin: '18px 0 10px', fontSize: '1.05rem' } }, t('rev_one')),
        revForm()
      ),
      el('h2', { class: 'section-title', style: { fontSize: '1.4rem', margin: '34px 0 16px' } }, t('related')),
      el('div', { class: 'grid-prod', id: 'relGrid' }),
      el('div', { id: 'recentSec' })
    );
    /* share */
    const shb = $('#pdShare');
    if (shb) shb.addEventListener('click', async () => {
      const data = { title: prodName(p) + ' — Rose by Marry', text: prodName(p) + ' — ' + (prodDesc(p) || ''), url: location.href.split('#')[0] };
      try { if (navigator.share) { await navigator.share(data); return; } } catch (e) {}
      try { if (navigator.clipboard) navigator.clipboard.writeText(data.url); } catch (e) {}
      toast(t('pd_copied'), 'ok');
    });
    /* tabs */
    $$('.tab-btn', root).forEach(b => b.addEventListener('click', () => {
      $$('.tab-btn', root).forEach(x => x.classList.toggle('act', x === b));
      $('#tabDesc').classList.toggle('hidden', b.dataset.tab !== 'desc');
      $('#tabRevs').classList.toggle('hidden', b.dataset.tab !== 'revs');
    }));
    /* add to cart */
    $('#pdCopy').addEventListener('click', () => copyText(location.href));
    $('#pdAddCart').addEventListener('click', () => {
      const addons = [];
      for (const a of S.addons) if (a.enabled && st.addonSel[a.id]) addons.push(a.id);
      let note = '';
      for (const a of S.addons) if (a.enabled && a.hasText && st.addonSel[a.id] && st.note) note = st.note;
      CART.add({ key: uid(), pid: p.id, colorId: st.colorId, qty: st.qty, addons, note: sanitize(st.note, 120) });
      updateBadges();
      toast(t('added_to_cart'), 'ok');
    });
    $('#pdWa').addEventListener('click', () => {
      const c = colorById(st.colorId);
      const addons = [];
      for (const a of S.addons) if (a.enabled && st.addonSel[a.id]) addons.push(a);
      const L2 = '----------------------------------------';
      let msg = L2 + '\n🌹 *طلب جديد من المتجر - Rose by Marry*\n' + L2 + '\n'
        + '• *المنتج:* ' + prodName(p) + '\n'
        + '• *الحجم:* ' + (p.qty || 1) + ' وردة ساتان\n'
        + '• *اللون:* ' + (c ? colorName(c) : '') + '\n'
        + '• *الكمية:* ' + st.qty + '\n'
        + (addons.length ? '• *الإضافات:* ' + addons.map(a => addonName(a) + (a.price > 0 ? ' (+' + a.price + ')' : '')).join('، ') + '\n' : '')
        + (st.note ? '• *بطاقة الإهداء:* ' + st.note + '\n' : '')
        + '• *طريقة الدفع:* الدفع عند الاستلام (COD)\n'
        + '💰 *المبلغ الإجمالي:* ' + money((p.price + addons.reduce((s, a) => s + a.price, 0)) * st.qty) + '\n' + L2;
      openWa(msg);
    });
  }
  function renderColorsSel(id) { $$('#pdColors .sw').forEach((b, i) => b.classList.toggle('sel', S.colors[i] && S.colors[i].id === id)); }
  function renderAddons() {
    const box = $('#pdAddons');
    box.textContent = '';
    for (const a of S.addons) {
      if (!a.enabled) continue;
      const row = el('label', { class: 'a-row' },
        (() => {
          const chk = el('input', { class: 'a-chk', type: 'checkbox' });
          chk.addEventListener('change', () => {
            st.addonSel[a.id] = chk.checked;
            row.classList.toggle('sel', chk.checked);
            if (a.hasText) {
              const nf = box.querySelector('.note-field');
              if (nf) nf.classList.toggle('show', chk.checked);
            }
          });
          return chk;
        })(),
        el('span', { class: 'switch', 'aria-hidden': 'true' }),
        el('span', { class: 'a-ico' }, a.icon),
        el('span', { class: 'a-nm' }, addonName(a)),
        el('span', { class: 'a-pr' }, a.price > 0 ? '+' + money(a.price) : t('free_t'))
      );
      box.append(row);
      if (a.hasText) {
        const nf = el('div', { class: 'note-field' });
        const inp = el('input', { type: 'text', maxlength: '120', placeholder: t('note_ph') });
        inp.addEventListener('input', () => { st.note = inp.value.slice(0, 120); });
        nf.append(inp);
        box.append(nf);
      }
    }
  }
  function revForm() {
    const stars = { v: 5 };
    const wrap = el('div', { class: 'card', style: { maxWidth: '560px' } });
    const starRow = el('div', { class: 'star-in', role: 'radiogroup', 'aria-label': 'rating' });
    function paint() { $$('span', starRow).forEach((sp, i) => sp.classList.toggle('on', i < stars.v)); }
    for (let i = 1; i <= 5; i++) {
      const sp = el('span', { 'data-i': String(i) }, '✦');
      sp.addEventListener('click', () => { stars.v = i; paint(); });
      starRow.append(sp);
    }
    paint();
    const nameIn = el('input', { type: 'text', maxlength: '40', placeholder: t('rev_name'), style: { width: '100%', border: '1.5px solid var(--line-2)', borderRadius: '12px', padding: '10px 13px', font: 'inherit', margin: '10px 0', background: 'var(--soft)' } });
    const textIn = el('textarea', { maxlength: '400', placeholder: t('rev_text'), style: { width: '100%', border: '1.5px solid var(--line-2)', borderRadius: '12px', padding: '10px 13px', font: 'inherit', minHeight: '80px', background: 'var(--soft)' } });
    const btn = el('button', { class: 'btn btn-primary', type: 'button', style: { marginTop: '10px' } }, t('rev_send'));
    btn.addEventListener('click', () => {
      const nmS = sanitize(nameIn.value, 40);
      const txS = sanitize(textIn.value, 400);
      if (nmS.length < 2 || txS.length < 3) { toast(t('e_name'), 'err'); return; }
      S.reviews.unshift({ id: uid(), pid: p.id, name: nmS, rating: stars.v, text: txS, ts: Date.now() });
      saveState();
      toast(t('rev_thanks'), 'ok');
      renderAll();
    });
    wrap.append(starRow, nameIn, textIn, btn);
    return wrap;
  }
  function renderReviews() {
    const box = $('#revList');
    box.textContent = '';
    const rs = S.reviews.filter(r => r.pid === p.id).sort((a, b) => b.ts - a.ts);
    if (!rs.length) { box.append(el('p', { class: 'empty' }, t('no_reviews'))); return; }
    for (const r of rs) {
      box.append(el('div', { class: 'rev' },
        el('div', { class: 'rh' }, el('span', { class: 'rn' }, r.name), starsEl(r.rating), el('span', { class: 'rd' }, fmtDate(r.ts))),
        el('p', {}, r.text)
      ));
    }
  }
  function renderRelated() {
    const grid = $('#relGrid');
    grid.textContent = '';
    S.products.filter(x => x.active && x.cat === p.cat && x.id !== p.id).slice(0, 4).forEach(x => grid.append(productCard(x)));
    bindCardActions(grid);
  }
  recordRecent(p.id);
  renderAll();
  renderRecentStrip('#recentSec', p.id);
  window.RBM_RERENDER = () => { renderAll(); renderRecentStrip('#recentSec', p.id); };
}

/* ============================================================
   PAGE: cart
   ============================================================ */
function pageCart() {
  const root = $('#cartRoot');
  function render() {
    root.textContent = '';
    if (!CART.items.length) {
      root.append(el('div', { class: 'empty', style: { padding: '60px 20px' } },
        (() => { const w = el('div', { style: { width: '120px', margin: '0 auto 6px', opacity: '.85' } }); w.innerHTML = bouquetArt('#C8102E', 5, true); return w; })(),
        el('p', { style: { fontWeight: '700', color: 'var(--wine)' } }, t('empty_cart')),
        el('a', { class: 'btn btn-primary', href: LINKS.shop, style: { marginTop: '16px', display: 'inline-flex' } }, t('continue_shopping'))
      ));
      return;
    }
    const grid = el('div', { class: 'cart-grid' });
    const lines = el('div');
    for (const it of CART.items) {
      const p = it.custom ? null : prodById(it.pid);
      const c = it.colorId ? colorById(it.colorId) : null;
      const name = it.custom ? t('base_lbl') + ' — ' + it.custom.qty + ' ' + t('units') : (p ? prodName(p) : '—');
      const artHTML = it.custom ? bouquetArt(c ? c.hex : '#C8102E', it.custom.qty, true) : (p ? productArt(p, c ? c.hex : '#C8102E') : '');
      const extras = (it.addons || []).map(aid => { const a = addonById(aid); return a ? addonName(a) : ''; }).filter(Boolean).join('، ');
      const line = el('div', { class: 'cartline' },
        el('div', { class: 'cl-art' }, (() => { const w = el('div'); w.innerHTML = artHTML; return w.firstElementChild || w; })()),
        el('div', {},
          el('div', { class: 'cl-name' }, name),
          el('div', { class: 'cl-meta' },
            c ? el('span', {}, el('span', { class: 'cl-dot', style: { background: c.hex } }), ' ' + colorName(c)) : el('span'),
            extras ? el('span', {}, extras) : el('span'),
            it.note ? el('span', {}, it.note) : el('span')
          ),
          (() => {
            const stp = el('div', { class: 'stepper', style: { marginTop: '8px' } },
              el('button', { type: 'button', onclick: () => { CART.setQty(it.key, it.qty - 1); render(); updateBadges(); } }, '−'),
              el('span', { class: 'qv' }, String(it.qty)),
              el('button', { type: 'button', onclick: () => { CART.setQty(it.key, it.qty + 1); render(); updateBadges(); } }, '+')
            );
            return stp;
          })()
        ),
        el('div', { class: 'cl-right' },
          el('span', { class: 'cl-price' }, money(itemUnitPrice(it) * it.qty)),
          el('button', { class: 'cl-rm', type: 'button', onclick: async () => { CART.remove(it.key); render(); updateBadges(); toast(t('toast_deleted')); } }, t('remove_t'))
        )
      );
      lines.append(line);
    }
    /* summary card */
    const sums = cartTotals();
    const aside = el('div', { class: 'side-card' },
      el('h3', { style: { color: 'var(--wine)', fontSize: '1.1rem', marginBottom: '10px' } }, t('sum_t')),
      el('div', { class: 'sumline' }, el('span', {}, t('subtotal')), el('b', {}, money(sums.sub))),
      el('div', { class: 'promo-sec' },
        el('div', { class: 'lbl', style: { fontWeight: '700', fontSize: '.85rem', marginTop: '8px' } }, t('promo_code_t')),
        (() => {
          const row = el('div', { class: 'promo-row' });
          const inp = el('input', { type: 'text', maxlength: '20', placeholder: t('promo_ph') });
          const cur = appliedPromo();
          if (cur) inp.value = cur.pc.code;
          const btn = el('button', { class: 'btn btn-wine btn-sm', type: 'button' }, t('promo_apply'));
          const msg = el('div');
          btn.addEventListener('click', () => {
            const code = sanitize(inp.value, 20).toUpperCase();
            if (!code) { setPromo(''); render(); return; }
            const pc = S.promoCodes.find(x => x.enabled && x.code === code);
            if (!pc) { msg.className = 'promo-err'; msg.textContent = t('promo_invalid'); return; }
            if (cartSubtotal() < pc.minTotal) { msg.className = 'promo-err'; msg.textContent = t('promo_min') + ': ' + money(pc.minTotal); return; }
            setPromo(code); render();
            toast(t('promo_ok'), 'ok');
          });
          row.append(inp, btn);
          return el('div', {}, row, msg);
        })()
      ),
      el('div', { style: { marginTop: '12px' } },
        el('div', { class: 'lbl', style: { fontWeight: '700', fontSize: '.85rem', marginBottom: '6px' } }, t('zone_t')),
        (() => {
          const selN = el('select', { style: { width: '100%', border: '1.5px solid var(--line-2)', borderRadius: '12px', padding: '10px', font: 'inherit', background: 'var(--soft)' } });
          for (const z of S.zones) {
            const op = el('option', { value: z.id }, zoneName(z) + ' — ' + (z.fee > 0 ? money(z.fee) : t('free_t')));
            if (currentZone() && currentZone().id === z.id) op.selected = true;
            selN.append(op);
          }
          selN.addEventListener('change', () => { store.set('rbm_zone', selN.value); render(); });
          return selN;
        })(),
        S.settings.freeShip > 0 ? freeShipBar(sums.sub) : el('span')
      ),
      el('div', { style: { marginTop: '12px' } },
        sums.disc1 > 0 ? el('div', { class: 'sumline' }, el('span', {}, t('discount') + (sums.ap ? ' (' + sums.ap.pc.code + ')' : '')), el('b', { class: 'g' }, '−' + money(sums.disc1))) : el('span'),
        sums.disc2 > 0 ? el('div', { class: 'sumline' }, el('span', {}, t('man_disc')), el('b', { class: 'g' }, '−' + money(sums.disc2))) : el('span'),
        el('div', { class: 'sumline' }, el('span', {}, t('delivery_t')), el('b', { class: sums.ship === 0 ? 'g' : '' }, sums.ship === 0 ? t('free_t') : money(sums.ship))),
        el('div', { class: 'sum-total2' }, el('span', {}, t('total_t')), el('span', {}, money(sums.total)))
      ),
      el('a', { class: 'btn btn-primary btn-lg', href: 'checkout.html', style: { width: '100%', marginTop: '14px', display: 'flex' } }, t('to_checkout') + ' →'),
      el('p', { class: 'cod-note' }, t('cod_note'))
    );
    grid.append(lines, aside);
    const xs = S.products.filter(x => x.active && !CART.items.some(it => it.pid === x.id)).sort((a, b) => a.price - b.price).slice(0, 4);
    let xsSec = null;
    if (xs.length) {
      const xc = S.colors.find(z => z.available) || null;
      const row = el('div', { class: 'xs-row' });
      xs.forEach(x => {
        const chip = el('div', { class: 'xs-chip' });
        const aw = el('span', { class: 'xs-art' });
        aw.innerHTML = productArt(x, xc ? xc.hex : '#C8102E');
        const ab = el('button', { class: 'xs-add', type: 'button', 'aria-label': t('add_cart_s') }, '+');
        ab.addEventListener('click', () => { CART.add({ key: uid(), pid: x.id, colorId: xc ? xc.id : null, qty: 1, addons: [], note: '' }); updateBadges(); toast(t('added_to_cart'), 'ok'); render(); });
        chip.append(aw, el('span', { class: 'xs-name' }, prodName(x), el('small', {}, money(x.price))), ab);
        row.append(chip);
      });
      xsSec = el('div', { class: 'xsell' }, el('h3', { class: 'section-title', style: { fontSize: '1.15rem', margin: '0 0 14px' } }, t('xsell_t')), row);
    }
    root.append(
      el('div', { class: 'crumbs' }, el('a', { href: LINKS.home }, t('nav_home')), el('span', { class: 'sep' }, '›'), el('span', {}, t('cart_your'))),
      el('h1', { class: 'section-title', style: { fontSize: '1.7rem', margin: '6px 0 18px' } }, t('cart_your')),
      grid
    );
    if (xsSec) root.append(xsSec);
  }
  render();
  window.RBM_RERENDER = render;
}

/* ============================================================
   PAGE: checkout
   ============================================================ */
function pageCheckout() {
  const root = $('#coRoot');
  if (!CART.items.length) { location.href = 'cart.html'; return; }
  let lastOrder = null;
  function render() {
    const sums = cartTotals();
    root.textContent = '';
    const formCard = el('div', { class: 'side-card' });
    formCard.append(el('h3', { style: { color: 'var(--wine)', fontSize: '1.15rem', marginBottom: '14px' } }, t('co_t')));
    const mini = el('div', { class: 'co-mini' });
    CART.items.forEach((it, i) => {
      const p = it.custom ? null : prodById(it.pid);
      const name = it.custom ? t('base_lbl') + ' — ' + it.custom.qty + ' ' + t('units') : (p ? prodName(p) : '—');
      mini.append(el('div', { class: 'r' }, el('span', {}, (i + 1) + '. ' + name), el('b', {}, '×' + it.qty)));
    });
    formCard.append(mini);
    const f = {};
    function fld(id, labelKey, type, req, ph) {
      const w = el('div', { class: 'fld' });
      const lb = el('label', { for: id }, t(labelKey) + (req ? '' : ' ' + t('opt')));
      const inp = el('input', { id, type: type || 'text', maxlength: type === 'tel' ? '20' : '160', autocomplete: 'on' });
      if (ph) inp.setAttribute('placeholder', ph);
      if (type === 'tel') inp.classList.add('ltr');
      const err = el('span', { class: 'err' });
      w.append(lb, inp, err);
      f[id] = { inp, err };
      return w;
    }
    const nameF = fld('co_name', 'f_name', 'text', true);
    const phoneF = fld('co_phone', 'f_phone', 'tel', true, '06XXXXXXXX');
    const cityF = fld('co_city', 'f_city', 'text', true);
    const dateF = fld('co_date', 'f_date', 'date', false);
    const notesF = fld('co_notes', 'f_notes', 'text', false);
    const giftCb = el('input', { type: 'checkbox', id: 'co_gift' });
    const giftW = el('label', { class: 'chk-gift', for: 'co_gift' }, giftCb, el('span', {}, t('co_gift')));
    /* zone select */
    const zoneW = el('div', { class: 'fld' });
    const zoneSel = el('select', { id: 'co_zone', style: { width: '100%', border: '1.5px solid var(--line-2)', borderRadius: '13px', padding: '12px 14px', font: 'inherit', background: 'var(--soft)' } });
    for (const z of S.zones) {
      const op = el('option', { value: z.id }, zoneName(z) + ' — ' + (z.fee > 0 ? money(z.fee) : t('free_t')));
      if (currentZone() && currentZone().id === z.id) op.selected = true;
      zoneSel.append(op);
    }
    zoneSel.addEventListener('change', () => { store.set('rbm_zone', zoneSel.value); render(); });
    zoneW.append(el('label', { for: 'co_zone' }, t('f_zone')), zoneSel, el('p', { class: 'hintline', style: { marginTop: '6px' } }, t('ship_tanger')));
    const submit = el('button', { class: 'btn btn-primary btn-lg', type: 'button', style: { width: '100%' } }, t('co_submit'));
    formCard.append(nameF, phoneF, cityF, zoneW, el('div', { class: 'fld-row' }, dateF, notesF), giftW, submit, el('p', { class: 'cod-note' }, t('co_pay')));

    /* summary aside */
    const aside = el('div', { class: 'side-card' },
      el('h3', { style: { color: 'var(--wine)', fontSize: '1.1rem', marginBottom: '10px' } }, t('your_order')),
      (() => { const w = el('div'); w.innerHTML = itemsLines(CART.items.map(it => Object.assign({}, it, { name: '' }))).split('\n').map(l => l).join('<br>'); const pre = el('div', { style: { fontSize: '.8rem', lineHeight: '1.9', whiteSpace: 'pre-line', color: '#4a3a40' } }); pre.textContent = itemsLines(CART.items); return pre; })(),
      S.settings.freeShip > 0 ? freeShipBar(sums.sub) : el('span'),
      el('div', { style: { marginTop: '12px' } },
        el('div', { class: 'sumline' }, el('span', {}, t('subtotal')), el('b', {}, money(sums.sub))),
        sums.disc1 > 0 ? el('div', { class: 'sumline' }, el('span', {}, t('discount')), el('b', { class: 'g' }, '−' + money(sums.disc1))) : el('span'),
        sums.disc2 > 0 ? el('div', { class: 'sumline' }, el('span', {}, t('man_disc')), el('b', { class: 'g' }, '−' + money(sums.disc2))) : el('span'),
        el('div', { class: 'sumline' }, el('span', {}, t('delivery_t')), el('b', { class: sums.ship === 0 ? 'g' : '' }, sums.ship === 0 ? t('free_t') : money(sums.ship))),
        el('div', { class: 'sum-total2' }, el('span', {}, t('total_t')), el('span', {}, money(sums.total)))
      )
    );
    root.append(el('div', { class: 'co-grid' }, formCard, aside));

    function setErr(fldObj, on, msgKey) { fldObj.inp.classList.toggle('invalid', on); if (on) fldObj.err.textContent = t(msgKey); else fldObj.err.textContent = ''; fldObj.err.classList.toggle('show', on); }
    submit.addEventListener('click', () => {
      const name = sanitize(f['co_name'].inp.value, 60);
      const phoneRaw = sanitize(f['co_phone'].inp.value, 20);
      const city = sanitize(f['co_city'].inp.value, 160);
      const date = sanitize(f['co_date'].inp.value, 20);
      const notes = sanitize(f['co_notes'].inp.value, 240);
      let bad = false;
      if (name.length < 2) { setErr(f['co_name'], true, 'e_name'); bad = true; } else setErr(f['co_name'], false);
      const pd = phoneRaw.replace(/[^\d]/g, '');
      if (pd.length < 8 || !/^[+]?[\d\s-]{8,15}$/.test(phoneRaw)) { setErr(f['co_phone'], true, 'e_phone'); bad = true; } else setErr(f['co_phone'], false);
      if (city.length < 3) { setErr(f['co_city'], true, 'e_city'); bad = true; } else setErr(f['co_city'], false);
      if (bad) return;
      const z = currentZone();
      const totals = cartTotals();
      const order = {
        id: 'RBM-' + Date.now().toString(36).toUpperCase(), ts: Date.now(), status: 'new',
        name, phone: phoneRaw, city,
        zoneName: z ? zoneName(z) : '', zoneFee: totals.ship,
        items: CART.items.map(it => {
          const p2 = it.custom ? null : prodById(it.pid);
          const c2 = it.colorId ? colorById(it.colorId) : null;
          return {
            name: it.custom ? t('base_lbl') + ' — ' + it.custom.qty + ' ' + t('units') : (p2 ? prodName(p2) : '—'),
            pid: it.pid, qty: it.qty, colorId: it.colorId, color: c2 ? colorName(c2) : '',
            addons: (it.addons || []).map(aid => { const a = addonById(aid); return a ? addonName(a) + (a.price > 0 ? ' (+' + a.price + ')' : '') : ''; }).filter(Boolean).join('، '),
            note: it.note || '', price: itemUnitPrice(it)
          };
        }),
        promo: totals.ap && !totals.ap.blocked ? totals.ap.pc.code : '',
        manual: totals.disc2,
        discount: totals.disc, date, note: notes,
        gift: giftCb.checked,
        total: totals.total, currency: S.settings.currency
      };
      logOrder(order);
      const msg = buildOrderMessage(order);
      lastOrder = { msg, link: waLink(msg) };
      /* success panel */
      root.textContent = '';
      const okp = el('div', { class: 'ok-panel', style: { maxWidth: '560px', margin: '0 auto' } });
      const badge = el('div', { class: 'ok-badge' }, (() => { const s = el('span'); s.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1F7A45" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'; return s.firstElementChild; })());
      const idRow = el('div', { class: 'co-mini', style: { direction: 'ltr', textAlign: 'center', fontWeight: '800', fontSize: '1rem' } }, order.id);
      okp.append(badge, el('h3', { style: { color: '#1F7A45' } }, t('ok_t')), el('p', { style: { color: 'var(--muted)', fontSize: '.9rem', margin: '8px 0' } }, t('ok_d')), idRow, el('p', { class: 'hintline', style: { marginBottom: '12px' } }, t('track_hint')));
      const openB = el('a', { class: 'btn btn-primary btn-lg', href: lastOrder.link, target: '_blank', rel: 'noopener noreferrer', style: { width: '100%', display: 'flex' } }, t('ok_open'));
      const copyB = el('button', { class: 'btn btn-outline', type: 'button', style: { width: '100%', marginTop: '8px' } }, t('ok_copy'));
      copyB.addEventListener('click', () => copyText(lastOrder.msg));
      const trackB = el('a', { class: 'btn btn-wine', href: LINKS.track + '?id=' + encodeURIComponent(order.id), style: { width: '100%', marginTop: '8px', display: 'flex' } }, t('nav_track') + ' →');
      okp.append(openB, copyB, trackB);
      const ta = el('textarea', { class: 'msg-box', readonly: true, style: { marginTop: '12px' } });
      ta.value = lastOrder.msg;
      okp.append(ta);
      root.append(okp);
      CART.clear(); setPromo(''); updateBadges();
      toast(t('toast_order'), 'ok');
      if (sanitizeDigits(S.settings.whatsapp, 16).length >= 8) window.open(lastOrder.link, '_blank', 'noopener');
    });
  }
  render();
  window.RBM_RERENDER = render;
}

/* ============================================================
   PAGE: wishlist
   ============================================================ */
function pageWishlist() {
  const root = $('#wishRoot');
  function render() {
    root.textContent = '';
    const ps = S.products.filter(p => WISH.has(p.id) && p.active);
    root.append(el('h1', { class: 'section-title', style: { fontSize: '1.7rem', margin: '10px 0 18px' } }, t('wish_t')));
    if (!ps.length) {
      root.append(el('div', { class: 'empty', style: { padding: '50px 20px' } },
        (() => { const w = el('div', { style: { width: '64px', margin: '0 auto 8px', color: 'var(--wine)' } }); w.innerHTML = heartSvg; return w; })(),
        el('p', { style: { fontWeight: '700', color: 'var(--wine)' } }, t('empty_wish')),
        el('a', { class: 'btn btn-primary', href: LINKS.shop, style: { marginTop: '16px', display: 'inline-flex' } }, t('continue_shopping'))
      ));
      return;
    }
    const grid = el('div', { class: 'grid-prod' });
    ps.forEach(p => grid.append(productCard(p)));
    root.append(grid);
    bindCardActions(grid);
  }
  render();
  window.RBM_RERENDER = render;
}

/* ============================================================
   PAGE: track
   ============================================================ */
function pageTrack() {
  const root = $('#trackRoot');
  let qid = '';
  try { qid = sanitize(new URL(location.href).searchParams.get('id') || '', 30).toUpperCase(); } catch (e) {}
  function render(q) {
    root.textContent = '';
    root.append(
      el('h1', { class: 'section-title', style: { fontSize: '1.7rem' } }, t('track_t')),
      el('p', { class: 'section-sub', style: { marginBottom: '18px' } }, t('track_d'))
    );
    const row = el('div', { class: 'promo-row', style: { maxWidth: '460px' } });
    const inp = el('input', { type: 'text', maxlength: '30', placeholder: t('track_ph'), value: q || '' });
    inp.style.cssText = 'flex:1;border:1.5px solid var(--line-2);border-radius:12px;padding:11px 14px;font:inherit;background:var(--soft);direction:ltr;text-align:start';
    const btn = el('button', { class: 'btn btn-primary', type: 'button' }, t('track_btn'));
    const res = el('div', { style: { marginTop: '22px' } });
    function lookup() {
      const id = sanitize(inp.value, 30).toUpperCase();
      res.textContent = '';
      const o = S.orders.find(x => x.id.toUpperCase() === id);
      if (!o) { res.append(el('p', { class: 'empty' }, t('track_none'))); return; }
      const steps = o.status === 'cancelled'
        ? [['new', '1'], ['cancelled', '×']]
        : [['new', '1'], ['confirmed', '2'], ['delivered', '3']];
      const order = ['new', 'confirmed', 'delivered'];
      const tl = el('div', { class: 'tl' });
      let doneReached = true;
      if (o.status === 'cancelled') {
        tl.append(tlStep(t('st_new'), '1', true), tlStep(t('st_can'), '×', true));
      } else {
        const idx = order.indexOf(o.status);
        [['new', '1'], ['confirmed', '2'], ['delivered', '3']].forEach((s2, i) => {
          tl.append(tlStep(t(s2[0] === 'new' ? 'st_new' : s2[0] === 'confirmed' ? 'st_conf' : 'st_del'), s2[1], i <= idx));
        });
      }
      function tlStep(lbl, ico, done) { return el('div', { class: 'tl-step' + (done ? ' done' : '') }, el('div', { class: 'tl-dot' }, ico), el('div', { class: 'tl-lbl' }, lbl)); }
      const card = el('div', { class: 'side-card', style: { maxWidth: '620px' } },
        el('div', { class: 'ord-top' }, el('span', { class: 'ord-id' }, o.id), el('span', { class: 'ord-date' }, new Date(o.ts).toLocaleString()), (() => { const b = { new: 'st-new', confirmed: 'st-conf', delivered: 'st-del', cancelled: 'st-new' }[o.status]; return el('span', { class: 'badge ' + b }, t(o.status === 'new' ? 'st_new' : o.status === 'confirmed' ? 'st_conf' : o.status === 'delivered' ? 'st_del' : 'st_can')); })()),
        tl,
        el('div', { class: 'ord-grid' },
          el('div', {}, el('div', { class: 'k' }, t('th_cust')), el('div', { class: 'v' }, o.name)),
          el('div', {}, el('div', { class: 'k' }, t('f_city')), el('div', { class: 'v' }, o.city)),
          el('div', {}, el('div', { class: 'k' }, t('items_t')), el('div', { class: 'v' }, String(o.items.reduce((s, i) => s + i.qty, 0)))),
          el('div', {}, el('div', { class: 'k' }, t('th_total')), el('div', { class: 'v ord-total' }, money(o.total)))
        )
      );
      res.append(card);
    }
    btn.addEventListener('click', lookup);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') lookup(); });
    row.append(inp, btn);
    root.append(row, res);
    if (qid) { setTimeout(lookup, 0); }
  }
  render(qid);
  window.RBM_RERENDER = () => render('');
}

/* ============================================================
   PAGE: contact
   ============================================================ */
/* ---------- blog ---------- */
function publishedArticles() { return (S.articles || []).filter(a => a.published).sort((a, b) => b.ts - a.ts); }
function artTitle(a) { return a.title[lang] || a.title.ar || a.title.fr || a.title.en || ''; }
function artDesc(a) { return a.desc[lang] || a.desc.ar || a.desc.fr || ''; }
function artBody(a) { return a.body[lang] || a.body.ar || a.body.fr || ''; }
function articleUrl(a) { return 'article.html?id=' + encodeURIComponent(a.slug || a.id); }
function readMins(a) { const w = (artBody(a) || '').split(/\s+/).filter(Boolean).length; return Math.max(1, Math.round(w / 180)); }
function artDate(a) { try { return new Date(a.ts).toLocaleDateString(lang === 'fr' ? 'fr-MA' : lang === 'en' ? 'en-GB' : 'ar-MA'); } catch (e) { return ''; } }
function artCard(a) {
  const c = el('a', { class: 'blog-card', href: articleUrl(a) });
  c.innerHTML =
    '<span class="blog-tags">' + (a.tags || []).join(' \u00b7 ') + '</span>'
    + '<h3>' + sanitize(artTitle(a), 140) + '</h3>'
    + '<p>' + sanitize(artDesc(a), 220) + '</p>'
    + '<span class="blog-meta">' + artDate(a) + ' \u00b7 ' + readMins(a) + ' ' + t('min_read') + '</span>'
    + '<span class="blog-go">' + t('read_more') + ' \u2190</span>';
  return c;
}
function pageBlog() {
  const root = $('#blogRoot');
  function render() {
    root.textContent = '';
    root.append(
      el('div', { class: 'crumbs' }, el('a', { href: LINKS.home }, t('nav_home')), el('span', { class: 'sep' }, '\u203a'), el('span', {}, t('nav_blog'))),
      el('h1', { class: 'section-title', style: { fontSize: '1.9rem', margin: '6px 0 8px' } }, t('blog_t')),
      el('p', { class: 'section-sub', style: { marginBottom: '28px' } }, t('blog_sub'))
    );
    const list = publishedArticles();
    if (!list.length) { root.append(el('p', { class: 'hintline' }, t('ab_none'))); return; }
    const grid = el('div', { class: 'blog-grid' });
    list.forEach(a => grid.append(artCard(a)));
    root.append(grid);
  }
  render();
  window.RBM_RERENDER = render;
}
function pageArticle() {
  const root = $('#artRoot');
  let a = null;
  try {
    const idv = sanitize(new URL(location.href).searchParams.get('id') || '', 90);
    a = (S.articles || []).find(x => x.slug === idv) || (S.articles || []).find(x => x.id === idv) || null;
  } catch (e) {}
  function setMeta(name, content, attr) {
    attr = attr || 'name';
    let m = document.querySelector('meta[' + attr + '="' + name + '"]');
    if (!m) { m = el('meta'); m.setAttribute(attr, name); document.head.append(m); }
    m.setAttribute('content', content);
  }
  if (a && a.published) {
    a.views = clampNum((a.views || 0) + 1, 0, 10000000);
    saveState();
    const url = 'https://rosebymarry.com/article.html?id=' + encodeURIComponent(a.slug || a.id);
    document.title = artTitle(a) + ' | Rose by Marry';
    setMeta('description', artDesc(a));
    setMeta('og:title', artTitle(a), 'property');
    setMeta('og:description', artDesc(a), 'property');
    setMeta('og:url', url, 'property');
    const can = document.querySelector('link[rel="canonical"]');
    if (can) can.setAttribute('href', url);
    const absImg = a.image && a.image.url ? (a.image.url.indexOf('http') === 0 ? a.image.url : 'https://rosebymarry.com/' + a.image.url.replace(/^\//, '')) : 'https://rosebymarry.com/og-image.jpg';
    const ld = el('script', { type: 'application/ld+json', id: 'artLd' });
    const ldObj = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: artTitle(a), description: artDesc(a), inLanguage: lang, image: [absImg], datePublished: new Date(a.ts).toISOString(), author: { '@type': 'Organization', name: 'Rose by Marry' }, publisher: { '@type': 'Organization', name: 'Rose by Marry' }, mainEntityOfPage: url };
    if (a.faq && a.faq.length) ldObj.about = { '@type': 'FAQPage', mainEntity: a.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
    ld.textContent = JSON.stringify(ldObj);
    document.head.append(ld);
    if (a.faq && a.faq.length) {
      const fld = el('script', { type: 'application/ld+json', id: 'artFaqLd' });
      fld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: a.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
      document.head.append(fld);
    }
  }
  function render() {
    root.textContent = '';
    const crumbs = el('div', { class: 'crumbs' }, el('a', { href: LINKS.home }, t('nav_home')), el('span', { class: 'sep' }, '\u203a'), el('a', { href: 'blog.html' }, t('nav_blog')));
    root.append(crumbs);
    if (!a || !a.published) {
      root.append(el('h1', { class: 'section-title', style: { fontSize: '1.6rem' } }, t('art_none')));
      root.append(el('a', { class: 'btn btn-primary', href: 'blog.html', style: { marginTop: '18px', display: 'inline-flex' } }, t('art_back')));
      return;
    }
    root.append(
      el('span', { class: 'blog-tags', style: { display: 'inline-block' } }, (a.tags || []).join(' \u00b7 ')),
      el('h1', { class: 'section-title', style: { fontSize: 'clamp(1.6rem,3.4vw,2.3rem)', margin: '10px 0 8px' } }, artTitle(a)),
      el('p', { class: 'blog-meta', style: { marginBottom: '26px' } }, artDate(a) + ' \u00b7 ' + readMins(a) + ' ' + t('min_read'))
    );
    if (a.image && a.image.url) {
      const fig = el('figure', { class: 'art-fig' });
      const im = el('img', { src: a.image.url, alt: a.image.alt || artTitle(a), loading: 'lazy', style: { width: '100%', borderRadius: '16px', display: 'block' } });
      fig.append(im);
      if (a.image.alt && lang === 'ar') fig.append(el('figcaption', {}, a.image.alt));
      root.append(fig);
    }
    const bodyW = el('div', { class: 'art-body' });
    (artBody(a) || '').split(/\n\s*\n/).filter(Boolean).forEach(p => bodyW.append(el('p', {}, p)));
    root.append(bodyW);
    if (a.faq && a.faq.length) {
      root.append(el('h2', { class: 'section-title', style: { fontSize: '1.3rem', margin: '36px 0 14px' } }, t('faq_t')));
      const fw = el('div');
      a.faq.forEach(f => fw.append(el('details', { class: 'faq-item' }, el('summary', {}, el('span', {}, f.q)), el('p', { class: 'faq-a' }, f.a))));
      root.append(fw);
    }
    const cta = el('div', { class: 'art-cta' },
      el('h3', {}, t('cta2_t')), el('p', {}, t('blog_sub')),
      el('a', { class: 'btn btn-primary', href: LINKS.shop }, t('cta_shop')));
    root.append(cta);
    const others = publishedArticles().filter(x => x.id !== a.id).slice(0, 2);
    if (others.length) {
      root.append(el('h2', { class: 'section-title', style: { fontSize: '1.3rem', margin: '40px 0 16px' } }, t('art_rel')));
      const g = el('div', { class: 'blog-grid' });
      others.forEach(x => g.append(artCard(x)));
      root.append(g);
    }
  }
  render();
  window.RBM_RERENDER = render;
}

function pageContact() {
  const ta = $('#ctMsg');
  const btn = $('#ctSend');
  if (btn) btn.addEventListener('click', () => {
    const msg = sanitize(ta.value, 500);
    if (msg.length < 3) { toast(t('e_name'), 'err'); return; }
    openWa('*Rose by Marry*\n' + msg);
  });
}

/* ============================================================
   PAGE: search (store-wide live search)
   ============================================================ */
function pageSearch() {
  const inp = $('#qSearch');
  if (!inp) return;
  let q = '';
  try { q = sanitize(new URL(location.href).searchParams.get('q') || '', 60); } catch (e) {}
  inp.value = q;
  const outP = $('#qProd'), outA = $('#qArt'), outF = $('#qFaq');
  const secP = $('#qSecProd'), secA = $('#qSecArt'), secF = $('#qSecFaq'), cnt = $('#qCount');
  function run() {
    const s = sanitize(inp.value, 60).toLowerCase();
    const has = s.length >= 2;
    secP.style.display = has ? '' : 'none';
    secA.style.display = has ? '' : 'none';
    secF.style.display = has ? '' : 'none';
    cnt.textContent = has ? t('search_q_res') + ' «' + sanitize(inp.value, 60) + '»' : '';
    if (!has) return;
    /* products: name + desc + category + occurrences */
    const hits = S.products.filter(p => p.active !== false && ((p.ar + ' ' + p.fr + ' ' + p.en + ' ' + (p.dar || '') + ' ' + (p.dfr || '') + ' ' + (p.den || '') + ' ' + String(p.price)).toLowerCase().includes(s)));
    outP.textContent = '';
    hits.slice(0, 8).forEach(p => outP.append(productCard(p)));
    if (!hits.length) outP.append(el('p', { class: 'section-sub' }, t('search_no')));
    /* articles */
    const arts = (S.articles || []).filter(a => a.published !== false && ((JSON.stringify(a.title) + JSON.stringify(a.desc) + (a.keyword || '')).toLowerCase().includes(s)));
    outA.textContent = '';
    arts.slice(0, 6).forEach(a => outA.append(el('a', { class: 'occ-card', href: 'article.html?id=' + encodeURIComponent(a.slug || a.id) }, el('h3', {}, artTitle ? artTitle(a) : a.title.ar), el('p', {}, artDesc ? artDesc(a) : a.desc.ar))));
    if (!arts.length) outA.append(el('p', { class: 'section-sub' }, t('search_no')));
    /* FAQ */
    outF.textContent = '';
    const FQ = ['fq1', 'fq2', 'fq3', 'fq4', 'fq5', 'fq6'];
    let nf = 0;
    FQ.forEach(k => {
      const qt = t(k + '_q'), at = t(k + '_a');
      if ((qt + ' ' + at).toLowerCase().includes(s)) {
        nf++;
        outF.append(el('details', { class: 'faq-item' }, el('summary', {}, el('span', {}, qt)), el('p', { class: 'faq-a' }, at)));
      }
    });
    if (!nf) outF.append(el('p', { class: 'section-sub' }, t('search_no')));
    bindCardActions(outP);
  }
  inp.addEventListener('input', debounce(run, 250));
  run();
}

/* ============================================================
   PAGE: offers (copy code)
   ============================================================ */
function pageOffers() {
  const b = $('#offCopyBtn');
  if (b) b.addEventListener('click', () => {
    try { if (navigator.clipboard) navigator.clipboard.writeText(($('#offCode') || {}).textContent || 'ROSE10'); } catch (e) {}
    toast(t('off_copied'), 'ok');
  });
  /* live values from the CMS state (edited in dashboard marketing/settings) */
  const pc = (S.promoCodes || []).find(c => c.enabled && c.type === 'percent');
  if (pc) {
    const bd = $('#offBadge1'), cd = $('#offCode');
    if (bd) bd.textContent = '-' + pc.value + '%';
    if (cd) cd.textContent = pc.code;
  }
  const b2 = $('#offBadge2');
  if (b2 && Number(S.settings.freeShip) > 0) b2.textContent = S.settings.freeShip + ' DH';
  const b3 = $('#offBadge3');
  if (b3 && Number(S.settings.builderUnit) > 0) b3.textContent = S.settings.builderUnit + ' DH';
}

/* ============================================================
   PAGE: ai (public index of the AI/SEO discovery layer)
   Mirrors the files produced by scripts/{generate-llms-enhanced,optimize-ai-seo}.mjs.
   Grouped by purpose so a human can scan it and an assistant can follow the links.
   ============================================================ */
const AI_FILES = [
  { g: 'aip_k_llms', items: [
    { path: '/llms.txt', ar: 'فهرس مختصر لكل الصفحات والمنتجات — لـ ChatGPT و Perplexity و Claude.', fr: 'Index concis de toutes les pages et produits — pour ChatGPT, Perplexity, Claude.', en: 'Concise index of every page and product — for ChatGPT, Perplexity, Claude.' },
    { path: '/llms-full.txt', ar: 'المرجع الكامل: الكتالوج بثلاث لغات، الألوان، الباني، سياسات التوصيل والأسئلة.', fr: 'Référence complète : catalogue trilingue, couleurs, bouquet libre, politiques et FAQ.', en: 'Full reference: trilingual catalog, colors, builder, policies and FAQ.' }
  ] },
  { g: 'aip_k_policy', items: [
    { path: '/ai.txt', ar: 'ما يُسمح باقتباسه وما هو مستثنى، مع طريقة الإسناد الصحيحة.', fr: 'Ce qui peut être cité ou non, et l’attribution attendue.', en: 'What may be quoted or not, and the expected attribution.' },
    { path: '/robots.txt', ar: 'سماح صريح لأكثر من 20 زاحفاً (GPTBot، ClaudeBot، PerplexityBot…) + روابط الخرائط.', fr: 'Autorisation explicite de 20+ crawlers (GPTBot, ClaudeBot, PerplexityBot…) + plans de site.', en: 'Explicit allowance for 20+ crawlers (GPTBot, ClaudeBot, PerplexityBot…) + sitemap links.' }
  ] },
  { g: 'aip_k_sitemap', items: [
    { path: '/sitemap.xml', ar: 'كل المسارات العامة بما فيها رابط خاص لكل وردة.', fr: 'Toutes les routes publiques, dont un lien par rose.', en: 'Every public route, including one link per rose.' },
    { path: '/ai-sitemap.xml', ar: 'قائمة قراءة قصيرة: صفحات المحتوى فقط، بترتيب الأولوية.', fr: 'Liste de lecture courte : pages de contenu, par ordre de priorité.', en: 'Short reading list: content pages only, in priority order.' }
  ] },
  { g: 'aip_k_manifest', items: [
    { path: '/.well-known/ai-plugin.json', ar: 'مانيفست إضافة ChatGPT (نسخة أيضاً في الجذر).', fr: 'Manifeste de plugin ChatGPT (copie aussi à la racine).', en: 'ChatGPT plugin manifest (also mirrored at the root).' },
    { path: '/.well-known/openapi.json', ar: 'وصف OpenAPI للموارد العامة — قراءة فقط.', fr: 'Description OpenAPI des ressources publiques — lecture seule.', en: 'OpenAPI description of the public resources — read-only.' },
    { path: '/mcp.json', ar: 'كتالوج MCP لربط المساعدات الذكية بالمتجر.', fr: 'Catalogue MCP pour connecter les assistants IA.', en: 'MCP catalog for connecting AI assistants.' }
  ] }
];
function pageAi() {
  const box = $('#aiFiles');
  if (!box) return;
  box.textContent = '';
  for (const group of AI_FILES) {
    box.append(el('h2', { class: 'section-title', style: { fontSize: '1.2rem', marginTop: '26px' } }, t(group.g)));
    const grid = el('div', { class: 'care-grid', style: { marginTop: '14px' } });
    for (const f of group.items) {
      const desc = f[lang] || f.en;
      const card = el('article', { class: 'care-card' },
        el('h3', {}, el('em', { class: 'ltr', style: { direction: 'ltr', unicodeBidi: 'embed' } }, f.path)),
        el('p', {}, desc),
        el('div', { class: 'off-code', style: { marginTop: '10px' } },
          el('a', { class: 'btn btn-sm', href: '.' + f.path, target: '_blank', rel: 'noopener noreferrer' }, t('aip_open')),
          el('button', {
            class: 'btn btn-sm btn-outline', type: 'button',
            onclick: () => {
              try { if (navigator.clipboard) navigator.clipboard.writeText(location.origin + f.path); } catch (e) {}
              toast(t('aip_copied'), 'ok');
            }
          }, t('aip_copy'))
        )
      );
      grid.append(card);
    }
    box.append(grid);
  }
}

/* ============================================================
   PAGE: faq (CMS-driven FAQ list + schema override)
   ============================================================ */
function pageFaq() {
  const list = $('#faqList');
  if (!list || !S.faq || !S.faq.length) return;
  list.textContent = '';
  const built = [];
  S.faq.forEach(f => {
    const q = (f.q && (f.q[lang] || f.q.ar || f.q.fr || f.q.en)) || '';
    const a = (f.a && (f.a[lang] || f.a.ar || f.a.fr || f.a.en)) || '';
    if (!q) return;
    built.push({ q: f.q.ar || q, a: f.a.ar || a });
    list.append(el('details', { class: 'faq-item' }, el('summary', {}, el('span', {}, q)), el('p', { class: 'faq-a' }, a)));
  });
  const ld = document.getElementById('faqLd');
  if (ld && built.length) ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: built.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) });
}

/* ============================================================
   boot
   ============================================================ */
(function bootShop() {
  injectBrandDefs();
  const page = document.body.dataset.page || '';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  applyStaticText();
  renderChrome(page);
  if (typeof initConversion === 'function') initConversion(page);
  trackVisit();
  if (typeof initAnalytics === 'function') initAnalytics();
  initReveal();
  startPetals();
  window.addEventListener('scroll', debounce(() => { const h = $('#siteHeader'); if (h) h.classList.toggle('scrolled', window.scrollY > 8); }, 60), { passive: true });
  const controllers = {
    home: rerenderHome,
    shop: pageShop,
    product: pageProduct,
    cart: pageCart,
    checkout: pageCheckout,
    wishlist: pageWishlist,
    track: pageTrack,
    contact: pageContact,
    blog: pageBlog,
    article: pageArticle,
    search: pageSearch,
    offers: pageOffers,
    faq: pageFaq,
    ai: pageAi,
    occasions: function () {},
    care: function () {},
    sizeguide: function () {},
    about: function () {
      const art = $('#aboutArt');
      if (art) { const c = S.colors.find(x => x.available) || S.colors[0]; art.innerHTML = bouquetArt(c ? c.hex : '#C8102E', 12, true); }
    }
  };
  (controllers[page] || function () {})();
  /* pages with their own render closures (product/cart/checkout/wishlist/track) set RBM_RERENDER;
     the rest re-run their controller on language switch */
  if (!window.RBM_RERENDER) window.RBM_RERENDER = () => { (controllers[page] || function () {})(); };
})();
