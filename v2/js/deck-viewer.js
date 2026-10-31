// Slide deck viewer: prev/next, keyboard, thumbnails, fullscreen. Slides come from tools/build.mjs.
(function () {
  document.querySelectorAll('[data-deck]').forEach(function (root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll('.deck-viewer__slide'));
    var thumbs = Array.prototype.slice.call(root.querySelectorAll('.deck-viewer__thumb'));
    var count = root.querySelector('.deck-viewer__count b');
    var cap = root.querySelector('.deck-viewer__cap');
    var total = slides.length;
    var index = 0;

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function go(i) {
      index = (i + total) % total;
      slides.forEach(function (s, n) { s.classList.toggle('is-active', n === index); });
      thumbs.forEach(function (t, n) {
        var on = n === index;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      count.textContent = pad(index + 1);
      cap.textContent = thumbs[index].getAttribute('data-caption') || '';
      var t = thumbs[index];
      var strip = t.parentNode;
      strip.scrollTo({ left: t.offsetLeft - strip.clientWidth / 2 + t.clientWidth / 2, behavior: 'smooth' });
    }

    root.querySelector('.deck-viewer__prev').addEventListener('click', function () { go(index - 1); });
    root.querySelector('.deck-viewer__next').addEventListener('click', function () { go(index + 1); });
    thumbs.forEach(function (t, n) { t.addEventListener('click', function () { go(n); }); });

    root.setAttribute('tabindex', '0');
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    });

    // swipe on touch screens
    var x0 = null;
    var stage = root.querySelector('.deck-viewer__stage');
    stage.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });

    var fs = root.querySelector('.deck-viewer__fs');
    fs.addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (root.requestFullscreen) root.requestFullscreen();
    });
  });
})();
