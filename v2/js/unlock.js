// Password gate for private case studies.
// The page ships only ciphertext (AES-256-GCM, key from PBKDF2). Nothing private is readable
// or downloadable until the correct password is entered. See v2/tools/README.md.
(function () {
  var root = document.querySelector('[data-private]');
  var payloadEl = document.getElementById('private-payload');
  if (!root || !payloadEl || !window.crypto || !crypto.subtle) return;

  var payload = JSON.parse(payloadEl.textContent);
  var form = root.querySelector('.pv-form');
  var input = root.querySelector('.pv-input');
  var errorEl = root.querySelector('.pv-error');
  var lockEl = root.querySelector('.pv-lock');
  var slot = root.querySelector('.pv-slot');
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

  // ---- tiny DOM helpers (all text via textContent, never innerHTML) ----
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function block(label) {
    var wrap = el('div', 'content__block case-block pv-fade');
    var sub = el('div', 'block__subtitle');
    sub.appendChild(el('p', 'tagline-chapter', label));
    wrap.appendChild(sub);
    wrap.appendChild(el('div', 'resume-divider'));
    return wrap;
  }
  function link(href, text) {
    var a = el('a', 'link-small-underline', text);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }
  function frame(title, small, linkNode, src) {
    var deck = el('div', 'deck');
    var bar = el('div', 'deck__bar');
    var t = el('span', 'deck__title', title + ' ');
    t.appendChild(el('small', null, small));
    bar.appendChild(t);
    if (linkNode) bar.appendChild(linkNode);
    deck.appendChild(bar);
    var f = el('div', 'deck__frame');
    var ifr = document.createElement('iframe');
    ifr.title = title;
    ifr.allowFullscreen = true;
    ifr.referrerPolicy = 'no-referrer';
    ifr.src = src;
    f.appendChild(ifr);
    deck.appendChild(f);
    return deck;
  }

  function drawCanvas(blob, w, h, caption) {
    var c = el('canvas', 'pv-canvas');
    c.width = w;
    c.height = h;
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', caption || 'Private image');
    return createImageBitmap(blob).then(function (bmp) {
      c.width = bmp.width;
      c.height = bmp.height;
      c.getContext('2d').drawImage(bmp, 0, 0);
      c._bmp = bmp;
      return c;
    });
  }

  function lightbox(bmp) {
    var ov = el('div', 'pv-lightbox');
    var c = document.createElement('canvas');
    var scale = Math.min(window.innerWidth * 0.94 / bmp.width, window.innerHeight * 0.9 / bmp.height, 1);
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    ov.appendChild(c);
    function close() {
      ov.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    ov.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);
  }

  function render(data, key) {
    var frag = document.createDocumentFragment();
    var jobs = [];

    if (data.overview) {
      var b1 = block('Overview');
      b1.appendChild(el('p', 'case-text type-basic-160lh', data.overview));
      frag.appendChild(b1);
    }
    if (data.approach && data.approach.length) {
      var b2 = block('Approach');
      var ol = el('ol', 'case-steps');
      data.approach.forEach(function (a, i) {
        var li = el('li', 'case-steps__item');
        li.appendChild(el('span', 'case-steps__num type-basic-160lh', String(i + 1).padStart(2, '0') + '.'));
        li.appendChild(el('h4', 'case-steps__title', a.title));
        li.appendChild(el('p', 'case-steps__text type-basic-160lh', a.text));
        ol.appendChild(li);
      });
      b2.appendChild(ol);
      frag.appendChild(b2);
    }
    (data.decks || []).forEach(function (d) {
      var bd = block(d.label || 'Pitch deck');
      var holder = el('div');
      bd.appendChild(holder);
      frag.appendChild(bd);
      if (d.pdf) {
        jobs.push(
          fetchDecrypted(key, d.file).then(function (buf) {
            var url = URL.createObjectURL(new Blob([buf], { type: 'application/pdf' }));
            holder.appendChild(frame(d.title, 'PDF', null, url + '#toolbar=0&navpanes=0&scrollbar=0'));
          })
        );
      } else {
        holder.appendChild(frame(d.title, d.kind, link(d.open, 'Open fullscreen'), d.src));
      }
    });
    if (data.prototype) {
      var bp = block('Prototype');
      bp.appendChild(frame(data.prototype.title, data.prototype.kind, link(data.prototype.open, 'Open in new tab'), data.prototype.src));
      frag.appendChild(bp);
    }
    if (data.video) {
      var bv = block('Video');
      bv.appendChild(frame(data.video.title || 'Video', 'YouTube', null, 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(data.video.youtube)));
      frag.appendChild(bv);
    }
    if (data.gallery && data.gallery.length) {
      var bg = block('Screens & artefacts');
      var grid = el('div', 'pv-gallery');
      bg.appendChild(grid);
      frag.appendChild(bg);
      data.gallery.forEach(function (g) {
        var cell = el('figure', 'pv-gallery__item');
        grid.appendChild(cell);
        jobs.push(
          fetchDecrypted(key, g.file)
            .then(function (buf) { return drawCanvas(new Blob([buf], { type: g.mime }), g.w, g.h, g.caption); })
            .then(function (c) {
              c.addEventListener('click', function () { lightbox(c._bmp); });
              cell.appendChild(c);
              if (g.caption) cell.appendChild(el('figcaption', null, g.caption));
            })
        );
      });
    }

    slot.appendChild(frag);
    return Promise.all(jobs);
  }

  function show(data, key) {
    return render(data, key).then(function () {
      lockEl.hidden = true;
      slot.hidden = false;
      slot.classList.add('pv-protected');
      root.querySelector('.block__subtitle .tagline-chapter').textContent = 'Case study details';
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }

  function tryPassword(password) {
    return deriveKey(password).then(function (key) {
      return decrypt(key, b64(payload.data)).then(function (plain) {
        return show(JSON.parse(new TextDecoder().decode(plain)), key).then(function () { return true; });
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

  // Deterrents while content is visible (they slow casual saving; they cannot stop screenshots)
  function guard() {
    ['contextmenu', 'dragstart', 'copy', 'cut'].forEach(function (evt) {
      slot.addEventListener(evt, function (e) { e.preventDefault(); });
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'S' || e.key === 'P') && !slot.hidden) e.preventDefault();
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    busy = true;
    errorEl.hidden = true;
    var pw = input.value;
    tryPassword(pw)
      .then(function () {
        remember(pw);
        guard();
      })
      .catch(function () {
        fails++;
        input.value = '';
        errorEl.textContent = 'Wrong password. Please try again.';
        errorEl.hidden = false;
        // simple client-side throttle
        return new Promise(function (r) { setTimeout(r, Math.min(fails, 5) * 800); });
      })
      .then(function () { busy = false; });
  });

  // Re-open automatically in this tab if a correct password was already entered
  try {
    var saved = JSON.parse(sessionStorage.getItem(STORE) || '[]');
    (function next(i) {
      if (i >= saved.length) return;
      tryPassword(saved[i]).then(guard, function () { next(i + 1); });
    })(0);
  } catch (e) {}
})();
