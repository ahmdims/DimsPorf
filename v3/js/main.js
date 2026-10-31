// DimsPorf v3: theme, mobile menu, reveal, work tabs, lightbox. No dependencies.
(function () {
  var root = document.documentElement;

  // ---- theme ----
  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('dimsporf.theme', next); } catch (e) {}
      toggle.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
    });
    toggle.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'dark' ? 'true' : 'false');
  }

  // ---- mobile menu ----
  var menuBtn = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---- reveal on scroll ----
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  // ---- work tabs (all-work page) ----
  var tabsEl = document.querySelector('.tabs');
  var grid = document.querySelector('.cards[data-filterable]');
  if (tabsEl && grid) {
    var tabs = Array.prototype.slice.call(tabsEl.querySelectorAll('.tabs__tab'));
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
    var thumb = tabsEl.querySelector('.tabs__thumb');
    var current = tabs[0];
    var moveThumb = function () {
      if (!thumb) return;
      thumb.style.width = current.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + current.offsetLeft + 'px)';
    };

    var apply = function (filter) {
      cards.forEach(function (c) {
        c.hidden = !(filter === 'all' || c.getAttribute('data-cats').split(' ').indexOf(filter) !== -1);
      });
      var n = 0;
      cards.forEach(function (c) {
        if (c.hidden) return;
        c.classList.toggle('is-even', n % 2 === 1);
        n++;
      });
    };
    var select = function (tab, opts) {
      opts = opts || {};
      if (tab === current && !opts.force) return;
      current = tab;
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      moveThumb();
      var filter = tab.getAttribute('data-filter');
      if (opts.instant) {
        apply(filter);
      } else {
        grid.classList.add('is-switching');
        setTimeout(function () {
          apply(filter);
          grid.classList.remove('is-switching');
        }, 180);
      }
      try {
        var url = new URL(window.location.href);
        if (filter === 'all') url.searchParams.delete('cat'); else url.searchParams.set('cat', filter);
        history.replaceState(null, '', url);
      } catch (e) {}
      if (opts.focus) tab.focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (ev) {
        var n = null;
        if (ev.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (ev.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (ev.key === 'Home') n = tabs[0];
        if (ev.key === 'End') n = tabs[tabs.length - 1];
        if (n) { ev.preventDefault(); select(n, { focus: true }); }
      });
    });
    var initial = new URLSearchParams(window.location.search).get('cat');
    var start = tabs.filter(function (t) { return t.getAttribute('data-filter') === initial; })[0] || tabs[0];
    select(start, { force: true, instant: true });
    window.addEventListener('resize', moveThumb);
    window.addEventListener('load', moveThumb);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveThumb);
  }

  // ---- parallax (hero decor) ----
  var decor = Array.prototype.slice.call(document.querySelectorAll('[data-speed]'));
  if (decor.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ticking = false;
    var update = function () {
      var y = window.scrollY;
      decor.forEach(function (el) {
        el.style.transform = 'translate3d(0,' + (y * parseFloat(el.getAttribute('data-speed'))).toFixed(1) + 'px,0)';
      });
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }

  // ---- lightbox (public gallery images) ----
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
  if (items.length) {
    var box = null;
    var idx = 0;
    var arrow = function (d) {
      return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="' + d + '"/></svg>';
    };
    var show = function (i) {
      idx = (i + items.length) % items.length;
      var it = items[idx];
      box.querySelector('.lightbox__stage').innerHTML = '';
      var img = new Image();
      img.alt = it.getAttribute('data-caption') || '';
      img.src = it.getAttribute('data-lightbox');
      box.querySelector('.lightbox__stage').appendChild(img);
      box.querySelector('.lightbox__cap span:first-child').textContent = it.getAttribute('data-caption') || '';
      box.querySelector('.lightbox__cap span:last-child').textContent = (idx + 1) + ' / ' + items.length;
    };
    var close = function () {
      if (!box) return;
      box.remove();
      box = null;
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    var onKey = function (e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    };
    var open = function (i) {
      box = document.createElement('div');
      box.className = 'lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.innerHTML =
        '<button class="icon-btn lightbox__close" type="button" aria-label="Close">' + arrow('M6 18 18 6M6 6l12 12') + '</button>' +
        '<button class="icon-btn lightbox__prev" type="button" aria-label="Previous">' + arrow('m15.75 19.5-7.5-7.5 7.5-7.5') + '</button>' +
        '<div class="lightbox__stage"></div>' +
        '<button class="icon-btn lightbox__next" type="button" aria-label="Next">' + arrow('m8.25 4.5 7.5 7.5-7.5 7.5') + '</button>' +
        '<div class="lightbox__cap"><span></span><span></span></div>';
      box.querySelector('.lightbox__close').addEventListener('click', close);
      box.querySelector('.lightbox__prev').addEventListener('click', function () { show(idx - 1); });
      box.querySelector('.lightbox__next').addEventListener('click', function () { show(idx + 1); });
      box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('lightbox__stage')) close(); });
      document.body.appendChild(box);
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onKey);
      show(i);
    };
    items.forEach(function (it, i) {
      it.addEventListener('click', function () { open(i); });
    });
  }
})();
