(function () {
  'use strict';
  var d = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- intro veil (first visit) and cover hold (repeat visits) ---- */
  (function () {
    var first = d.classList.contains('veil'), hold = d.classList.contains('hold');
    if (!first && !hold) return;
    var t0 = Date.now(), min = first ? 1200 : 0, cap = first ? 2500 : 3000, line = $('.veil-line b'), finished = false;
    function finish() {
      if (finished) return; finished = true;
      if (line) { line.style.animation = 'none'; line.style.transition = 'transform .25s ease'; line.style.transform = 'scaleX(1)'; }
      setTimeout(function () {
        d.classList.add('veil-out');
        try { localStorage.setItem('ct_seen', '1'); } catch (e) {}
        setTimeout(function () { d.classList.remove('veil', 'hold', 'veil-out'); }, reduce ? 0 : 850);
      }, first && !reduce ? 260 : 0);
    }
    var ready = Promise.all([
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
      Promise.all($$('img[data-wait]').map(function (i) { return i.decode ? i.decode().catch(function () {}) : Promise.resolve(); }))
    ]);
    var capTimer = setTimeout(finish, cap);
    ready.then(function () {
      var wait = Math.max(0, min - (Date.now() - t0));
      setTimeout(function () { clearTimeout(capTimer); finish(); }, wait);
    });
  })();

  /* ---- header logo appears once the first screen is behind us (home) ---- */
  var header = $('#header');
  var band = $('.hero-band');
  if (header && band && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      var e = es[0];
      header.classList.toggle('logo-on', !e.isIntersecting && e.boundingClientRect.top < 0);
    }, { threshold: 0 }).observe(band);
  }

  /* ---- drawer ---- */
  var drawer = $('#drawer'), burger = $('.burger');
  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) drawer.removeAttribute('inert'); else drawer.setAttribute('inert', '');
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { var x = $('.drawer-x', drawer); if (x) x.focus(); } else if (burger && document.activeElement && drawer.contains(document.activeElement)) burger.focus();
  }
  if (burger) burger.addEventListener('click', function () { setDrawer(true); });
  if (drawer) {
    $('.drawer-x', drawer).addEventListener('click', function () { setDrawer(false); });
    $('.drawer-scrim', drawer).addEventListener('click', function () { setDrawer(false); });
    $$('nav a, .drawer-meta a', drawer).forEach(function (a) { a.addEventListener('click', function () { setDrawer(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) setDrawer(false); });
  }

  /* ---- dialogs: Arabic note and directions ---- */
  function openDlg(dlg) { if (!dlg) return; if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  var arD = $('#ar-dialog'), dirD = $('#dirs');
  $$('[data-ar]').forEach(function (b) { b.addEventListener('click', function () { setDrawer(false); openDlg(arD); }); });
  $$('[data-dirs]').forEach(function (b) { b.addEventListener('click', function () { openDlg(dirD); }); });
  $$('dialog').forEach(function (dlg) {
    $$('[data-close]', dlg).forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  });

  /* ---- whole-section fades and the brush loop ---- */
  var loops = $$('.loop');
  function drawLoops(scope) { $$('.loop', scope).forEach(function (l) { l.classList.add('go'); setTimeout(function () { l.classList.add('done'); }, 1500); }); }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        if (e.target.hasAttribute('data-draw')) drawLoops(e.target);
        if (e.target.classList.contains('rv')) e.target.classList.add('in');
      });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    $$('.rv, [data-draw]').forEach(function (s) { io.observe(s); });
    var mh = $('.menu-hero'); if (mh) drawLoops(mh);
  } else {
    $$('.rv').forEach(function (s) { s.classList.add('in'); });
    drawLoops(document);
  }

  /* ---- phone dock: hides on scroll down, over the booking section and the footer ---- */
  var dock = $('#dock');
  if (dock) {
    var always = dock.hasAttribute('data-always'), lastY = window.scrollY, hidden = { book: false, foot: false }, ticking = false, on = always;
    var hero = $('.hero');
    function update() {
      ticking = false;
      var y = window.scrollY, dy = y - lastY;
      var past = always || (hero ? y > hero.offsetHeight * 0.55 : y > 200);
      if (dy > 6) on = false; else if (dy < -6) on = true;
      if (Math.abs(dy) > 6) lastY = y;
      dock.classList.toggle('show', on && past && !hidden.book && !hidden.foot);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    if ('IntersectionObserver' in window) {
      [['#book', 'book'], ['#footer', 'foot']].forEach(function (p) {
        var el = $(p[0]); if (!el) return;
        new IntersectionObserver(function (es) { hidden[p[1]] = es[0].isIntersecting; update(); }, { threshold: 0 }).observe(el);
      });
    }
    update();
  }

  /* ---- booking form -> WhatsApp ---- */
  var form = $('#bookform');
  if (form) {
    var date = $('#f-date'), guests = $('#f-guests'), err = $('#f-err');
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var now = new Date(); var iso = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    date.min = iso;
    $$('.stepper button', form).forEach(function (b) {
      b.addEventListener('click', function () {
        var v = parseInt(guests.value, 10) || 2; v += parseInt(b.getAttribute('data-step'), 10);
        guests.value = Math.min(40, Math.max(1, v));
      });
    });
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#f-name').value.trim(), dv = date.value, bad = [];
      $('#f-name').setAttribute('aria-invalid', name ? 'false' : 'true');
      date.setAttribute('aria-invalid', dv ? 'false' : 'true');
      if (!name) bad.push('your name');
      if (!dv) bad.push('a date');
      if (bad.length) { err.textContent = 'Please add ' + bad.join(' and ') + '.'; return; }
      err.textContent = '';
      var p = dv.split('-'), dt = new Date(+p[0], +p[1] - 1, +p[2]);
      var nice = days[dt.getDay()] + ' ' + dt.getDate() + ' ' + months[dt.getMonth()] + ' ' + dt.getFullYear();
      var note = $('#f-note').value.trim();
      var msg = 'Hello Casa Talia, I would like to book a table.\n' +
        'Branch: ' + $('#f-branch').value + '\n' +
        'Name: ' + name + '\n' +
        'Date: ' + nice + '\n' +
        'Time: ' + $('#f-time').value + '\n' +
        'Guests: ' + (parseInt(guests.value, 10) || 2) + '\n' +
        'Occasion: ' + $('#f-occ').value + (note ? '\nNote: ' + note : '');
      var a = document.createElement('a');
      a.href = 'https://wa.me/201029565960?text=' + encodeURIComponent(msg);
      a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    });
  }

  /* ---- menu chips: scroll-spy, centre the active chip, arrows ---- */
  var chips = $('#chips');
  if (chips) {
    var strip = $('.chips-in', chips), links = $$('.chip', chips), secs = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    function activate(i) {
      links.forEach(function (a, k) { a.classList.toggle('active', k === i); if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      var a = links[i]; if (!a) return;
      var target = a.offsetLeft - (strip.clientWidth - a.offsetWidth) / 2;
      if (strip.scrollTo) strip.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' }); else strip.scrollLeft = target;
    }
    var cur = -1;
    function spy() {
      var line = (header ? header.offsetHeight : 56) + chips.offsetHeight + 24, idx = 0;
      secs.forEach(function (s, k) { if (s && s.getBoundingClientRect().top <= line) idx = k; });
      if (window.scrollY < 40 && secs[0] && secs[0].getBoundingClientRect().top > line) idx = -2;
      if (idx !== cur) { cur = idx; if (idx >= 0) activate(idx); else { links.forEach(function (a) { a.classList.remove('active'); a.removeAttribute('aria-current'); }); strip.scrollLeft = 0; } }
    }
    var tk = false;
    window.addEventListener('scroll', function () { if (!tk) { tk = true; requestAnimationFrame(function () { tk = false; spy(); }); } }, { passive: true });
    links.forEach(function (a, k) { a.addEventListener('click', function () { cur = k; activate(k); }); });
    var step = function (dir) { return function () { strip.scrollBy({ left: dir * strip.clientWidth * 0.7, behavior: reduce ? 'auto' : 'smooth' }); }; };
    $('.chips-prev', chips).addEventListener('click', step(-1));
    $('.chips-next', chips).addEventListener('click', step(1));
    spy();
  }

  /* ---- signature ---- */
  (function () { var a = document.querySelector('a.sig'); if (!a) return; function play() { a.classList.remove('on'); void a.getBoundingClientRect(); a.classList.add('on') } a.addEventListener('mouseenter', function () { if (!a.classList.contains('on')) play() }); if (!matchMedia('(hover: none)').matches || !('IntersectionObserver' in window)) return; var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); setTimeout(play, 400) } }, { threshold: .9 }); io.observe(a) })();
})();
