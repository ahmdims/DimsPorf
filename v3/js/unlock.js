// Password gate for private case studies (v3).
// The page ships only ciphertext (AES-256-GCM, key from PBKDF2). Nothing private is readable or
// downloadable until the correct password is entered. Deterrents here slow down casual saving;
// they cannot stop screenshots. See v3/tools/README.md.
(function () {
  var root = document.querySelector('[data-private]');
  var payloadEl = document.getElementById('private-payload');
  if (!root || !payloadEl || !window.crypto || !crypto.subtle) return;

  var payload = JSON.parse(payloadEl.textContent);
  var gate = root.querySelector('.gate');
  var form = root.querySelector('.gate__form');
  var input = root.querySelector('.gate__input');
  var errorEl = root.querySelector('.gate__error');
  var slot = root.querySelector('.private-slot');
  var STORE = 'dimsporf.pv';
  var fails = 0;
  var busy = false;

  function b64(s) {
    var bin = atob(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function deriveKey(password) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: b64(payload.salt), iterations: payload.iter, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
    });
  }
  // layout: 12 byte iv | ciphertext | 16 byte tag
  function decrypt(key, bytes) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  }
  function fetchDecrypted(key, name) {
    return fetch(payload.base + name)
      .then(function (r) {
        if (!r.ok) throw new Error('missing ' + name);
        return r.arrayBuffer();
      })
      .then(function (buf) { return decrypt(key, new Uint8Array(buf)); });
  }

  // ---- DOM helpers (text via textContent only) ----
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function block(label) {
    var sec = el('section', 'block');
    var grid = el('div', 'block__grid');
    grid.appendChild(el('h2', 'block__label eyebrow', label));
    var body = el('div', 'block__body');
    grid.appendChild(body);
    sec.appendChild(grid);
    return { sec: sec, body: body };
  }
  function frame(title, small, href, hrefLabel, src) {
    var f = el('div', 'frame');
    var bar = el('div', 'frame__bar');
    var t = el('span', 'frame__title', title + ' ');
    t.appendChild(el('small', null, small));
    bar.appendChild(t);
    if (href) {
      var a = el('a', 'mono text-link', hrefLabel);
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener';
      bar.appendChild(a);
    }
    f.appendChild(bar);
    var view = el('div', 'frame__view');
    var ifr = document.createElement('iframe');
    ifr.title = title;
    ifr.allowFullscreen = true;
    ifr.src = src;
    view.appendChild(ifr);
    f.appendChild(view);
    return f;
  }
  function lightbox(bmp, caption) {
    var ov = el('div', 'lightbox');
    var stage = el('div', 'lightbox__stage');
    var c = document.createElement('canvas');
    var scale = Math.min(window.innerWidth * 0.9 / bmp.width, (window.innerHeight - 140) / bmp.height, 1);
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    stage.appendChild(c);
    ov.appendChild(stage);
    var cap = el('div', 'lightbox__cap');
    cap.appendChild(el('span', null, caption || ''));
    cap.appendChild(el('span', null, 'Esc'));
    ov.appendChild(cap);
    function close() { ov.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    ov.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);
  }

  function render(data, key) {
    var frag = document.createDocumentFragment();
    var jobs = [];

    if (data.overview) {
      var o = block('Overview');
      o.body.appendChild(el('p', 'prose', data.overview));
      frag.appendChild(o.sec);
    }
    if (data.approach && data.approach.length) {
      var a = block('Approach');
      var ol = el('ol', 'steps');
      data.approach.forEach(function (s) {
        var li = el('li');
        li.appendChild(el('h3', 'steps__title', s.title));
        li.appendChild(el('p', 'steps__text', s.text));
        ol.appendChild(li);
      });
      a.body.appendChild(ol);
      frag.appendChild(a.sec);
    }
    (data.decks || []).forEach(function (d) {
      var b = block(d.label || 'Pitch deck');
      frag.appendChild(b.sec);
      if (d.pdf) {
        jobs.push(
          fetchDecrypted(key, d.file).then(function (buf) {
            var url = URL.createObjectURL(new Blob([buf], { type: 'application/pdf' }));
            b.body.appendChild(frame(d.title, 'PDF', null, '', url + '#toolbar=0&navpanes=0&scrollbar=0'));
          })
        );
      } else {
        b.body.appendChild(frame(d.title, d.kind, d.open, 'Open fullscreen', d.src));
      }
    });
    if (data.prototype) {
      var p = block('Prototype');
      p.body.appendChild(frame(data.prototype.title, data.prototype.kind, data.prototype.open, 'Open in new tab', data.prototype.src));
      frag.appendChild(p.sec);
    }
    if (data.gallery && data.gallery.length) {
      var g = block('Screens & artefacts');
      var grid = el('div', 'gallery');
      g.body.appendChild(grid);
      frag.appendChild(g.sec);
      data.gallery.forEach(function (it) {
        var fig = el('figure');
        grid.appendChild(fig);
        jobs.push(
          fetchDecrypted(key, it.file)
            .then(function (buf) { return createImageBitmap(new Blob([buf], { type: it.mime })); })
            .then(function (bmp) {
              var c = document.createElement('canvas');
              c.width = bmp.width;
              c.height = bmp.height;
              c.setAttribute('role', 'img');
              c.setAttribute('aria-label', it.caption || 'Private image');
              c.getContext('2d').drawImage(bmp, 0, 0);
              var btn = el('button', 'gallery__btn');
              btn.type = 'button';
              btn.appendChild(c);
              btn.addEventListener('click', function () { lightbox(bmp, it.caption); });
              fig.appendChild(btn);
              if (it.caption) fig.appendChild(el('figcaption', null, it.caption));
            })
        );
      });
    }
    slot.appendChild(frag);
    return Promise.all(jobs);
  }

  function addRelock() {
    var bar = el('div', 'private-bar');
    var btn = el('button', 'btn');
    btn.type = 'button';
    btn.textContent = 'Lock again';
    btn.addEventListener('click', function () {
      try { sessionStorage.removeItem(STORE); } catch (e) {}
      window.location.reload();
    });
    bar.appendChild(btn);
    slot.insertBefore(bar, slot.firstChild);
  }

  function show(data, key) {
    return render(data, key).then(function () {
      gate.hidden = true;
      slot.hidden = false;
      slot.classList.add('is-protected');
      addRelock();
    });
  }
  function tryPassword(password) {
    return deriveKey(password).then(function (key) {
      return decrypt(key, b64(payload.data)).then(function (plain) {
        return show(JSON.parse(new TextDecoder().decode(plain)), key);
      });
    });
  }
  function remember(pw) {
    try {
      var list = JSON.parse(sessionStorage.getItem(STORE) || '[]');
      if (list.indexOf(pw) === -1) list.push(pw);
      sessionStorage.setItem(STORE, JSON.stringify(list));
    } catch (e) {}
  }
  function guard() {
    ['contextmenu', 'dragstart', 'copy', 'cut'].forEach(function (evt) {
      slot.addEventListener(evt, function (e) { e.preventDefault(); });
    });
    document.addEventListener('keydown', function (e) {
      var k = (e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'p') && !slot.hidden) e.preventDefault();
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    busy = true;
    errorEl.hidden = true;
    var pw = input.value;
    tryPassword(pw)
      .then(function () { remember(pw); guard(); })
      .catch(function () {
        fails++;
        input.value = '';
        errorEl.textContent = 'Wrong password. Please try again.';
        errorEl.hidden = false;
        return new Promise(function (r) { setTimeout(r, Math.min(fails, 5) * 800); });
      })
      .then(function () { busy = false; });
  });

  // reopen automatically in this tab if a correct password was already entered
  try {
    var saved = JSON.parse(sessionStorage.getItem(STORE) || '[]');
    (function next(i) {
      if (i >= saved.length) return;
      tryPassword(saved[i]).then(guard, function () { next(i + 1); });
    })(0);
  } catch (e) {}
})();
