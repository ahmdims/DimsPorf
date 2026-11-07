// Cappu peeks in from the bottom of the screen every now and then, plays its Lottie animation and slides away.
// Decorative only: it never blocks clicks, never holds focus and is hidden from assistive tech.
// Loaded with `defer` on every page; the player (js/lottie_light.min.js) and the animation (lottie/cappu-thinking.json)
// are fetched only when the first visit is about to happen, so they never compete with the page for bandwidth.
(function () {
  'use strict';

  // ---- settings ------------------------------------------------------------------------------
  var FIRST_DELAY = 7000; // ms after the page has loaded until the first visit
  var STAY = 30000; // ms Cappu stays up, idling in a loop, before it slides back down
  var EVERY = 10000; // ms between sliding down and the next visit
  var SLIDE = 700; // ms, must match the transition in css/custom.css (.cappu)

  // ---- guards ----------------------------------------------------------------------------------
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var conn = navigator.connection || {};
  if (conn.saveData) return;

  var script = document.currentScript;
  var jsBase = script && script.src ? script.src.replace(/[^/]*(\?.*)?$/, '') : new URL('js/', document.baseURI).href;
  var siteBase = new URL('../', jsBase).href;

  var box = null;
  var anim = null;
  var timer = null;
  var stayTimer = null;
  var ready = false;

  function schedule(ms) {
    clearTimeout(timer);
    timer = setTimeout(visit, ms);
  }

  function loadPlayer(done) {
    if (window.lottie) return done();
    var s = document.createElement('script');
    s.src = jsBase + 'lottie_light.min.js';
    s.async = true;
    s.onload = done;
    s.onerror = function () {}; // no player, no mascot: the page is unaffected
    document.head.appendChild(s);
  }

  function build(done) {
    box = document.createElement('div');
    box.className = 'cappu';
    box.setAttribute('aria-hidden', 'true');
    document.body.appendChild(box);
    anim = window.lottie.loadAnimation({
      container: box,
      renderer: 'svg',
      loop: true, // the idle animation repeats for as long as Cappu is up
      autoplay: false,
      path: siteBase + 'lottie/cappu-thinking.json',
      rendererSettings: { preserveAspectRatio: 'xMidYMax meet', progressiveLoad: true },
    });
    anim.addEventListener('DOMLoaded', function () {
      ready = true;
      done();
    });
  }

  function enter() {
    anim.goToAndStop(0, true);
    box.classList.add('is-in');
    anim.play(); // idles while it slides up and for the whole stay
    clearTimeout(stayTimer);
    stayTimer = setTimeout(leave, SLIDE + STAY);
  }

  function leave() {
    if (!box) return;
    box.classList.remove('is-in');
    setTimeout(function () {
      if (anim) anim.goToAndStop(0, true); // rest the animation while it is out of sight
    }, SLIDE);
    schedule(EVERY + SLIDE);
  }

  function visit() {
    // never while the tab is in the background; wait until it is back
    if (document.hidden) {
      schedule(2000);
      return;
    }
    if (ready) return enter();
    loadPlayer(function () {
      if (!window.lottie) return;
      build(enter);
    });
  }

  function start() {
    schedule(FIRST_DELAY);
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });

  window.addEventListener('pagehide', function () {
    clearTimeout(timer);
    clearTimeout(stayTimer);
    if (anim) anim.destroy();
  });
})();
