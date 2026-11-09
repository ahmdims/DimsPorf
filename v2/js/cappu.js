// Cappu, the mascot: it is simply there, full body at the bottom of every page, idling in a loop.
// Decorative only: it never blocks clicks, never holds focus and is hidden from assistive tech. Loaded with `defer`.
//
// The player (js/lottie_light.min.js) and the animation (lottie/cappu-happy.json) are fetched in the first idle
// moment after the HTML is ready, so the page paints first. Cappu fades in as soon as the animation is ready
// and then stays, with no entrance delay and no leaving.
(function () {
  'use strict';

  // ---- guards ----------------------------------------------------------------------------------
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var conn = navigator.connection || {};
  if (conn.saveData) return;

  var script = document.currentScript;
  var jsBase = script && script.src ? script.src.replace(/[^/]*(\?.*)?$/, '') : new URL('js/', document.baseURI).href;
  var siteBase = new URL('../', jsBase).href;

  var box = null;
  var anim = null;

  function loadPlayer(done) {
    if (window.lottie) return done();
    var s = document.createElement('script');
    s.src = jsBase + 'lottie_light.min.js';
    s.async = true;
    s.onload = done;
    s.onerror = function () {}; // no player, no mascot: the page is unaffected
    document.head.appendChild(s);
  }

  function build() {
    box = document.createElement('div');
    box.className = 'cappu';
    box.setAttribute('aria-hidden', 'true');
    document.body.appendChild(box);
    anim = window.lottie.loadAnimation({
      container: box,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: siteBase + 'lottie/cappu-happy.json',
      rendererSettings: { preserveAspectRatio: 'xMidYMax meet', progressiveLoad: true },
    });
    anim.addEventListener('DOMLoaded', function () {
      requestAnimationFrame(function () {
        box.classList.add('is-in');
      });
    });
  }

  function start() {
    loadPlayer(function () {
      if (window.lottie) build();
    });
  }

  // an endless animation should not burn battery while nobody is looking
  document.addEventListener('visibilitychange', function () {
    if (!anim) return;
    if (document.hidden) anim.pause();
    else anim.play();
  });

  window.addEventListener('pagehide', function () {
    if (anim) anim.destroy();
  });

  // start as soon as the HTML is ready (this script is deferred), in an idle moment so the page paints first
  if (window.requestIdleCallback) window.requestIdleCallback(start, { timeout: 1000 });
  else setTimeout(start, 0);
})();
