(function () {
  var d = document, root = d.documentElement;
  root.classList.add('js');

  function copyText(text, btn) {
    text = String(text || '');
    function ok() {
      if (!btn) return;
      var prev = btn.getAttribute('data-label') || btn.textContent;
      btn.setAttribute('data-label', prev);
      var span = btn.querySelector('span');
      if (span) span.textContent = 'Copied'; else btn.textContent = 'Copied';
      btn.classList.add('is-copied');
      setTimeout(function () {
        if (span) span.textContent = prev; else btn.textContent = prev;
        btn.classList.remove('is-copied');
      }, 1600);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok).catch(function () { fallback(); });
    } else {
      fallback();
    }
    function fallback() {
      var ta = d.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      d.body.appendChild(ta);
      ta.select();
      try { d.execCommand('copy'); ok(); } catch (e) {}
      d.body.removeChild(ta);
    }
  }

  // reactive state: <state x="0" />, {x} in text, on:click="x++"
  var state = new Proxy(window.__STK_STATE__ || {}, {
    set: function (t, k, v) { t[k] = v; paint(); return true; }
  });
  var binds = [].slice.call(d.querySelectorAll('[data-bind]'));
  function paint() {
    binds.forEach(function (el) {
      var v = state[el.getAttribute('data-bind')];
      el.textContent = v === undefined ? '' : v;
    });
  }
  [].forEach.call(d.querySelectorAll('*'), function (el) {
    [].forEach.call(el.attributes, function (a) {
      if (a.name.indexOf('data-on-') !== 0) return;
      var fn;
      try {
        // Pass globals explicitly — with(state) can shadow document/navigator
        fn = new Function('s', 'e', 'document', 'navigator', 'window', 'with(s){' + a.value + '}');
      } catch (err) { console.error('[stack] invalid handler:', a.value, err); return; }
      el.addEventListener(a.name.slice(8), function (e) {
        try { fn(state, e, d, navigator, window); } catch (err) { console.error('[stack]', err); }
      });
    });
  });
  paint();

  // data-copy="text" or data-copy-from="#selector"
  [].forEach.call(d.querySelectorAll('[data-copy], [data-copy-from]'), function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var text = el.getAttribute('data-copy');
      if (!text && el.getAttribute('data-copy-from')) {
        var src = d.querySelector(el.getAttribute('data-copy-from'));
        text = src ? (src.textContent || src.value || '') : '';
      }
      copyText(text.trim(), el);
    });
  });

  // theme switching
  function setTheme(n) {
    root.setAttribute('data-theme', n);
    try { localStorage.setItem('stk-theme', n); } catch (e) {}
    [].forEach.call(d.querySelectorAll('[data-theme-select]'), function (s) { s.value = n; });
  }
  [].forEach.call(d.querySelectorAll('[data-theme-set]'), function (el) {
    el.addEventListener('click', function () { setTheme(el.getAttribute('data-theme-set')); });
  });
  [].forEach.call(d.querySelectorAll('[data-theme-select]'), function (s) {
    s.value = root.getAttribute('data-theme');
    s.addEventListener('change', function () { setTheme(s.value); });
  });

  // copy buttons on code blocks
  [].forEach.call(d.querySelectorAll('pre'), function (pre) {
    if (pre.querySelector('.stk-copy')) return;
    var code = pre.querySelector('code');
    if (!code) return;
    var b = d.createElement('button');
    b.type = 'button'; b.className = 'stk-copy'; b.textContent = 'Copy';
    b.addEventListener('click', function () { copyText(code.innerText, b); });
    pre.appendChild(b);
  });

  // Lucide icons
  if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
})();
