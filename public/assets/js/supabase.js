'use strict';
/* ============================================================
   Rose by Marry — Supabase bridge (optional)
   ------------------------------------------------------------
   Plain fetch against the REST + Storage endpoints. No SDK, no build step,
   so it keeps the site's zero-dependency rule.

   The store works with NO Supabase configured: every function below returns
   an "off" result and callers fall back to LocalStorage. Fill in the URL and
   anon key in Admin > Settings > Supabase to switch photos on.

   Only the PUBLIC anon key belongs in the browser. Row-level security in
   supabase/migrations/0002_media.sql is what actually protects the data:
   anon can read, only signed-in users can write.
   ============================================================ */

/* `var`, not `const`, to match data.js's `var S` — it makes SB reachable as
   window.SB for the test suites and the browser console. */
var SB = {
  cfg() {
    const c = (S && S.settings && S.settings.supabase) || {};
    return { url: String(c.url || '').replace(/\/+$/, ''), key: String(c.anonKey || ''), bucket: String(c.bucket || 'media') };
  },
  on() { const c = this.cfg(); return !!(c.url && c.key); },

  headers(extra) {
    const c = this.cfg();
    const h = Object.assign({ apikey: c.key, Authorization: 'Bearer ' + (SB.token || c.key) }, extra || {});
    return h;
  },

  /* public URL for an object path inside the bucket */
  publicUrl(path) {
    const c = this.cfg();
    if (!c.url || !path) return '';
    return c.url + '/storage/v1/object/public/' + c.bucket + '/' + String(path).replace(/^\/+/, '');
  },

  async req(path, opts) {
    const c = this.cfg();
    if (!c.url || !c.key) throw new Error('supabase-off');
    const o = opts || {};
    const res = await fetch(c.url + '/rest/v1/' + path, {
      method: o.method || 'GET',
      headers: this.headers(Object.assign({ 'Content-Type': 'application/json' }, o.headers)),
      body: o.body ? JSON.stringify(o.body) : undefined
    });
    if (!res.ok) throw new Error('supabase ' + res.status + ': ' + (await res.text()).slice(0, 200));
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  },

  /* ---------- auth (admin uploads need a signed-in user) ---------- */
  token: null,
  async signIn(email, password) {
    const c = this.cfg();
    if (!c.url || !c.key) throw new Error('supabase-off');
    const res = await fetch(c.url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: c.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.access_token) throw new Error(j.error_description || j.msg || 'login failed');
    SB.token = j.access_token;
    try { sessionStorage.setItem('rbm_sb_token', j.access_token); } catch (e) {}
    return j;
  },
  restore() {
    try { SB.token = sessionStorage.getItem('rbm_sb_token') || null; } catch (e) { SB.token = null; }
    return SB.token;
  },
  signOut() { SB.token = null; try { sessionStorage.removeItem('rbm_sb_token'); } catch (e) {} },
  get authed() { return !!SB.token; },

  /* ---------- storage ---------- */
  /* Uploads a File/Blob and returns its object path. */
  async upload(file, path) {
    const c = this.cfg();
    if (!c.url || !c.key) throw new Error('supabase-off');
    if (!SB.token) throw new Error('not-signed-in');
    const clean = String(path).replace(/^\/+/, '');
    const res = await fetch(c.url + '/storage/v1/object/' + c.bucket + '/' + encodeURI(clean), {
      method: 'POST',
      headers: { apikey: c.key, Authorization: 'Bearer ' + SB.token, 'x-upsert': 'true', 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    if (!res.ok) throw new Error('upload ' + res.status + ': ' + (await res.text()).slice(0, 200));
    return clean;
  },
  async remove(paths) {
    const c = this.cfg();
    if (!SB.token) throw new Error('not-signed-in');
    const res = await fetch(c.url + '/storage/v1/object/' + c.bucket, {
      method: 'DELETE',
      headers: { apikey: c.key, Authorization: 'Bearer ' + SB.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: Array.isArray(paths) ? paths : [paths] })
    });
    return res.ok;
  },

  /* ---------- photo rows ---------- */
  listProductImages() { return this.req('product_images?select=*&order=sort'); },
  listColorImages() { return this.req('color_images?select=*'); },
  addProductImage(row) {
    return this.req('product_images', { method: 'POST', headers: { Prefer: 'return=representation' }, body: row });
  },
  setColorImage(row) {
    return this.req('color_images', { method: 'POST', headers: { Prefer: 'return=representation,resolution=merge-duplicates' }, body: row });
  },
  delProductImage(id) { return this.req('product_images?id=eq.' + encodeURIComponent(id), { method: 'DELETE' }); },
  delColorImage(colorId) { return this.req('color_images?color_id=eq.' + encodeURIComponent(colorId), { method: 'DELETE' }); },
  makePrimary(id) {
    return this.req('product_images?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: { is_primary: true } });
  },

  /* ---------- sync ----------
     Pulls every photo row and folds it into the local catalogue so the rest
     of the site keeps reading S.products[].imgs / S.colors[].img and never
     needs to know Supabase exists. */
  async pullPhotos() {
    if (!this.on()) return { ok: false, reason: 'off' };
    const [pImgs, cImgs] = await Promise.all([this.listProductImages(), this.listColorImages()]);
    const byProd = {};
    for (const r of pImgs || []) {
      (byProd[r.product_id] = byProd[r.product_id] || []).push({
        id: r.id, url: this.publicUrl(r.path), colorId: r.color_id || '',
        alt: (lang === 'fr' ? r.alt_fr : lang === 'en' ? r.alt_en : r.alt_ar) || '',
        primary: !!r.is_primary
      });
    }
    let n = 0;
    for (const p of S.products) { p.imgs = byProd[p.id] || []; n += p.imgs.length; }
    for (const c of S.colors) {
      const hit = (cImgs || []).find(x => x.color_id === c.id);
      c.img = hit ? this.publicUrl(hit.path) : '';
      if (hit) n++;
    }
    saveState();
    return { ok: true, count: n };
  }
};
