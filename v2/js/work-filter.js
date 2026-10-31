// Category tabs for the work grid (all-work page). Cards come from tools/build.mjs.
(function () {
  var tabsEl = document.querySelector('.work-tabs');
  var grid = document.querySelector('.work-grid');
  if (!tabsEl || !grid) return;
  var tabs = Array.prototype.slice.call(tabsEl.querySelectorAll('.work-tabs__tab'));
  var bar = tabsEl.querySelector('.work-tabs__bar');
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.work-card'));
  var current = tabs[0];

  function moveBar() {
    bar.style.width = current.offsetWidth + 'px';
    bar.style.transform = 'translateX(' + current.offsetLeft + 'px)';
  }

  function apply(filter) {
    cards.forEach(function (card) {
      card.hidden = !(filter === 'all' || card.getAttribute('data-cats').split(' ').indexOf(filter) !== -1);
    });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  function select(tab, opts) {
    opts = opts || {};
    if (tab === current && !opts.force) return;
    current = tab;
    tabs.forEach(function (t) {
      var on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    moveBar();
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
      if (filter === 'all') url.searchParams.delete('cat');
      else url.searchParams.set('cat', filter);
      history.replaceState(null, '', url);
    } catch (e) {}
    if (opts.focus) tab.focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab); });
    tab.addEventListener('keydown', function (ev) {
      var next = null;
      if (ev.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (ev.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (ev.key === 'Home') next = tabs[0];
      if (ev.key === 'End') next = tabs[tabs.length - 1];
      if (next) { ev.preventDefault(); select(next, { focus: true }); }
    });
  });

  // open a category directly: /v2/work/?cat=ux
  var initial = new URLSearchParams(window.location.search).get('cat');
  var start = tabs.filter(function (t) { return t.getAttribute('data-filter') === initial; })[0] || tabs[0];
  select(start, { force: true, instant: true });

  window.addEventListener('resize', moveBar);
  window.addEventListener('load', moveBar);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveBar);
})();
