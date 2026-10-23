// Portfolio category filter + "show all" (home page). Cards come from tools/build.mjs.
(function () {
  var grid = document.querySelector('.work-grid');
  if (!grid) return;
  var buttons = document.querySelectorAll('.work-filter__btn');
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.work-card'));
  var more = document.querySelector('.work-more');
  var limit = parseInt(grid.getAttribute('data-limit'), 10) || cards.length;
  var filter = 'all';
  var expanded = false;

  function render() {
    var shown = 0;
    var total = 0;
    cards.forEach(function (card) {
      var match = filter === 'all' || card.getAttribute('data-cats').split(' ').indexOf(filter) !== -1;
      if (match) total++;
      var visible = match && (expanded || shown < limit);
      if (visible) shown++;
      card.hidden = !visible;
    });
    if (more) more.hidden = expanded || total <= limit;
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filter = btn.getAttribute('data-filter');
      buttons.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      render();
    });
  });

  if (more) {
    more.querySelector('button').addEventListener('click', function () {
      expanded = true;
      render();
    });
  }
  render();
})();
