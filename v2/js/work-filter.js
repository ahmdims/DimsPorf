// Portfolio category filter (home page). Cards come from tools/build.mjs.
(function () {
  var buttons = document.querySelectorAll('.work-filter__btn');
  var cards = document.querySelectorAll('.work-card');
  if (!buttons.length) return;

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var filter = btn.getAttribute('data-filter');
      buttons.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      cards.forEach(function (card) {
        var show = filter === 'all' || card.getAttribute('data-cats').split(' ').indexOf(filter) !== -1;
        card.hidden = !show;
      });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });
})();
