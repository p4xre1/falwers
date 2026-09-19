(function () {
  function bar(msg) {
    var b = document.getElementById('rbmErrBar');
    if (!b) {
      b = document.createElement('div');
      b.id = 'rbmErrBar';
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#A03A3A;color:#fff;padding:10px 14px;font:13px/1.6 sans-serif;text-align:center;direction:ltr';
      var x = document.createElement('button');
      x.textContent = '\u00d7';
      x.style.cssText = 'margin-inline-start:12px;background:none;border:1px solid #fff;color:#fff;cursor:pointer;padding:2px 8px';
      x.onclick = function () { b.remove(); };
      b.appendChild(document.createTextNode(msg));
      b.appendChild(x);
      document.body.appendChild(b);
    } else {
      b.firstChild.textContent = msg;
    }
  }
  window.addEventListener('error', function (ev) { bar('Admin error: ' + (ev.message || 'unknown')); });
  window.addEventListener('unhandledrejection', function (ev) { var r = ev.reason; bar('Admin error: ' + ((r && r.message) || r || 'unknown')); });
  var tries = 0;
  var guard = setInterval(function () {
    tries++;
    if (tries > 14) { clearInterval(guard); return; }
    if (!window.RBM_BOOT_OK) return;
    var un = false;
    try { un = localStorage.getItem('rbm_admin_kb') === '1' || sessionStorage.getItem('rbm_admin') === '1'; } catch (e) {}
    if (!un) return;
    if (document.body.classList.contains('gated')) document.body.classList.remove('gated');
    var pane = document.querySelector('.pane.act');
    if (pane && pane.children.length === 0) {
      if (window.RBM_PANE_SHELL) pane.innerHTML = window.RBM_PANE_SHELL;
      if (window.RBM_RERENDER) window.RBM_RERENDER();
    }
  }, 800);
  setTimeout(function () {
    if (!window.RBM_BOOT_OK) {
      var m = document.createElement('div');
      m.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;background:#470D1B;color:#fff;padding:14px 18px;font:14px/1.7 sans-serif;text-align:center;border:1px solid #AE8A50';
      m.innerHTML = 'This screen needs the live server. Open <b style="direction:ltr">/admin/</b> from your site URL (live preview or deployed site), not a file preview.<br>\u0627\u0641\u062a\u062d\u064a \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645 \u0639\u0628\u0631 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u2014 \u0644\u064a\u0633\u062a \u0645\u0639\u0627\u064a\u0646\u0629 \u0645\u0644\u0641.';
      document.body.appendChild(m);
    }
  }, 2500);
})()
