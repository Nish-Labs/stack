(function () {
  var d = document, root = d.documentElement;
  root.classList.add('js');

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
      try { fn = new Function('s', 'e', 'with(s){' + a.value + '}'); }
      catch (err) { console.error('[stack] invalid handler:', a.value, err); return; }
      el.addEventListener(a.name.slice(8), function (e) {
        try { fn(state, e); } catch (err) { console.error('[stack]', err); }
      });
    });
  });
  paint();

  // theme switching: <themeswitch />, or any element with data-theme-set="name"
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
    var code = pre.querySelector('code');
    if (!code) return;
    var b = d.createElement('button');
    b.type = 'button'; b.className = 'stk-copy'; b.textContent = 'Copy';
    b.addEventListener('click', function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(code.innerText).then(function () {
        b.textContent = 'Copied';
        setTimeout(function () { b.textContent = 'Copy'; }, 1400);
      });
    });
    pre.appendChild(b);
  });

  // Lucide icons
  if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
})();
