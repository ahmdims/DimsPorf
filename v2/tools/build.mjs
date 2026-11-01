// Generates v2/work/<slug>/index.html and the portfolio cards on v2/index.html
// from v2/data/projects.json. Run: node v2/tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const V2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(V2, '..');
const data = JSON.parse(fs.readFileSync(path.join(V2, 'data/projects.json'), 'utf8'));
const { site, categories, projects } = data;
const catLabel = Object.fromEntries(categories.map((c) => [c.id, c.label]));
const partial = (n) => fs.readFileSync(path.join(V2, 'tools/partials', n), 'utf8');
const LOGO = partial('logo.svg.html');
const PSWP = partial('pswp.html');
const EMAIL = 'ahmaddimas1945@gmail.com';

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (p) => (/^https?:/.test(p) ? p : site.url + p);
const indent = (s, n) => s.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');

// ---- locked (password protected) projects ------------------------------------------
// Private content is encrypted at build time (PBKDF2 -> AES-256-GCM) and decrypted in the browser by
// js/unlock.js. The password is read from the environment and is never written to the repo.
const ITER = 600000;
const PRIVATE_SRC = path.join(V2, 'private-src');
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.pdf': 'application/pdf' };
const passwordFor = (slug) =>
  process.env['PORTFOLIO_PASSWORD_' + slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')] || process.env.PORTFOLIO_PASSWORD || '';

function sealProject(p, password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, ITER, 32, 'sha256');
  const enc = (buf) => {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([c.update(buf), c.final()]);
    return Buffer.concat([iv, ct, c.getAuthTag()]); // iv | ciphertext | tag  (what WebCrypto expects)
  };
  const files = [];
  const addFile = (rel) => {
    const abs = path.join(PRIVATE_SRC, p.slug, rel);
    if (!fs.existsSync(abs)) throw new Error(`private file missing: ${path.relative(ROOT, abs)}`);
    const name = `f${files.length}.enc`;
    files.push({ name, buf: enc(fs.readFileSync(abs)) });
    return { file: name, mime: MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream' };
  };
  const s = p.sections || {};
  const data = {
    overview: s.overview || '',
    approach: s.approach || [],
    prototype: p.prototype ? { title: p.prototype.title || 'Interactive prototype', ...embedFor(p.prototype.url) } : null,
    decks: (p.decks || []).map((d) => {
      if (d.slides) throw new Error(`${p.slug}: slide-image decks are not supported on locked projects yet`);
      return {
      title: d.title || p.title,
      label: d.label || 'Pitch deck',
      ...(d.file ? { ...addFile(d.file), kind: 'PDF', pdf: true } : embedFor(d.url)),
    };
    }),
    gallery: (p.gallery || []).map((g) => ({ ...addFile(g.file), w: g.w || 1920, h: g.h || 1080, caption: g.caption || '' })),
  };
  const body = enc(Buffer.from(JSON.stringify(data)));
  return {
    files,
    payload: { v: 1, iter: ITER, salt: salt.toString('base64'), data: body.toString('base64'), base: `work/${p.slug}/private/` },
  };
}

const lockIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>';

function lockBlock(p, payload) {
  return `<div class="content__block case-block" id="private" data-private data-slug="${p.slug}">
${indent(subtitle('Private case study'), 2)}
  <div class="pv-gate animate-in-up">
  <div class="pv-ghost" aria-hidden="true">
    <span class="pv-sk pv-sk--label"></span>
    <span class="pv-sk pv-sk--rule"></span>
    <span class="pv-sk pv-sk--line" style="width:100%"></span>
    <span class="pv-sk pv-sk--line" style="width:94%"></span>
    <span class="pv-sk pv-sk--line" style="width:62%"></span>
    <span class="pv-sk pv-sk--label pv-sk--gap"></span>
    <span class="pv-sk pv-sk--rule"></span>
    <div class="pv-ghost__row"><span class="pv-sk pv-sk--num"></span><span class="pv-sk pv-sk--title"></span><span class="pv-sk pv-sk--para"></span></div>
    <div class="pv-ghost__row"><span class="pv-sk pv-sk--num"></span><span class="pv-sk pv-sk--title"></span><span class="pv-sk pv-sk--para"></span></div>
    <div class="pv-ghost__row"><span class="pv-sk pv-sk--num"></span><span class="pv-sk pv-sk--title"></span><span class="pv-sk pv-sk--para"></span></div>
    <div class="pv-ghost__imgs"><span class="pv-sk pv-sk--img"></span><span class="pv-sk pv-sk--img"></span></div>
  </div>
  <div class="pv-lock">
    <span class="pv-lock__icon">${lockIcon}</span>
    <h3 class="pv-lock__title">This case study is confidential</h3>
    <p class="pv-lock__text type-basic-160lh">This case study contains confidential details. To request access, email <a class="pv-mail" href="mailto:${EMAIL}?subject=${encodeURIComponent('Access request: ' + p.title)}">${EMAIL}</a> or use the credentials in my CV, if available.</p>
    <form class="pv-form" autocomplete="off">
      <label class="pv-sr" for="pv-pass">Password</label>
      <input id="pv-pass" class="pv-input" type="password" placeholder="Password" autocomplete="off" required>
      <button class="pv-unlock" type="submit">Unlock</button>
    </form>
    <p class="pv-error" role="alert" hidden></p>
    <a class="link-small-underline" href="mailto:${EMAIL}?subject=${encodeURIComponent('Access request: ' + p.title)}">Request access via email</a>
  </div>
  </div>
  <div class="pv-slot" hidden></div>
  <script type="application/json" id="private-payload">${JSON.stringify(payload)}</script>
</div>`;
}

// ---- slide deck / prototype embeds ------------------------------------------------
// Accepts the normal "share" link and converts it to the embeddable form.
function embedFor(raw) {
  const url = raw.trim();
  let m;
  if ((m = url.match(/docs\.google\.com\/presentation\/d\/(e\/)?([\w-]+)/))) {
    const id = (m[1] || '') + m[2];
    return {
      kind: 'Google Slides',
      src: `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000`,
      open: `https://docs.google.com/presentation/d/${id}/present`,
    };
  }
  if (/canva\.com\/design\//.test(url)) {
    const base = url.split('?')[0].replace(/\/(view|edit|watch)$/, '/view');
    return { kind: 'Canva', src: `${base}?embed`, open: base };
  }
  if (/figma\.com\/(proto|design|deck|slides|file|board)\//.test(url)) {
    return { kind: 'Figma', src: url.replace('://www.figma.com/', '://embed.figma.com/') + (url.includes('?') ? '&' : '?') + 'embed-host=share', open: url };
  }
  if (/\.pdf($|[?#])/i.test(url)) {
    return { kind: 'PDF', src: url + (url.includes('#') ? '' : '#view=FitH'), open: url, pdf: true };
  }
  return { kind: 'Embed', src: url, open: url };
}

// ---- shared chrome ------------------------------------------------------------------
const NAV = [
  ['home', 'Home', 'house-simple'],
  ['portfolio', 'Work', 'squares-four'],
  ['about', 'About Me', 'user'],
  ['services', 'Approach', 'compass'],
  ['resume', 'Resume', 'article'],
  ['contact', 'Contact', 'envelope'],
];
const navHtml = NAV.map(
  ([id, label, icon]) => `          <li class="menu__item">
            <a class="menu__link btn" href="#${id}">
              <span class="menu__caption">${label}</span>
              <i class="ph ph-${icon}"></i>
            </a>
          </li>`
).join('\n');

const chrome = (homeHref) => `  <!-- Loader Start -->
  <div id="loader" class="loader">
    <div class="loader__wrapper">
      <div class="loader__content">
        <div class="loader__count">
          <span class="count__text">0</span>
          <span class="count__percent">%</span>
        </div>
      </div>
    </div>
  </div>
  <!-- Loader End -->

  <!-- Header Start -->
  <header id="header" class="header d-flex justify-content-center loading__fade">
    <div class="header__navigation d-flex justify-content-start">
      <nav id="menu" class="menu">
        <ul class="menu__list d-flex justify-content-start">
${navHtml}
        </ul>
      </nav>
    </div>
  </header>
  <!-- Header End -->

  <!-- Fixed Logo Start -->
  <div class="logo loading__fade">
    <a href="${homeHref}" class="logo__link">
${LOGO}
      <span class="logo-text">DimsPorf</span>
    </a>
  </div>
  <!-- Fixed Logo End -->

  <!-- Fixed Color Switch Start -->
  <div class="color loading__fade">
    <button id="color-switcher" class="color-switcher" type="button" role="switch" aria-label="light/dark mode"
      aria-checked="true"></button>
  </div>
  <!-- Fixed Color Switch End -->`;

const footer = `    <!-- Inner Section - Contact - Start -->
    <section id="contact" class="inner contact inner-grid-bottom no-padding-bottom">
      <div class="inner__wrapper">
        <div class="container-fluid p-0">
          <div class="row g-0">
            <div class="col-12 col-xl-2">
              <div class="inner__name">
                <div class="content__block name-block">
                  <span class="section-name icon-right animate-in-up">
                    <span class="section-name-caption">Contact</span>
                    <i class="ph ph-arrow-down-right"></i>
                  </span>
                </div>
              </div>
            </div>
            <div class="col-12 col-xl-8">
              <div class="inner__content">
                <footer class="footer">
                  <div class="container-fluid p-0">
                    <div class="row g-0">
                      <div class="col-12">
                        <div class="content__block pre-grid-items">
                          <div class="footer__link d-flex flex-column flex-md-row justify-content-md-between align-items-md-center">
                            <div class="footer__text reveal-type animate-in-up">Have a project<br>in mind?</div>
                            <div class="footer__btn animate-in-up">
                              <a href="mailto:${EMAIL}?subject=Message%20from%20DimsPorf" class="btn btn-circle-icon hover-circle" aria-label="Email me">
                                <em></em>
                                <i class="ph-light ph-arrow-right"></i>
                              </a>
                            </div>
                          </div>
                          <div class="footer__divider animate-in-up"></div>
                        </div>
                        <div class="content__block grid-block">
                          <div class="container-fluid p-0 contact-data">
                            <div class="row g-0">
                              <div class="col-12 col-lg-3 contact-data__item grid-item">
                                <a href="./" class="footer-logo logo-text animate-in-up">
${indent(LOGO, 2)}
                                  <span>DimsPorf</span>
                                </a>
                              </div>
                              <div class="col-12 col-md-4 col-lg-3 contact-data__item grid-item">
                                <p class="contact-data__title tagline-chapter animate-in-up">Location</p>
                                <p class="contact-data__text small type-basic-160lh">
                                  <a class="link-small-160lh animate-in-up" href="https://maps.app.goo.gl/aN3v6VRmUuGEWTUCA" target="_blank" rel="noopener">East Java,<br>Indonesia</a>
                                </p>
                              </div>
                              <div class="col-12 col-md-4 col-lg-3 contact-data__item grid-item">
                                <p class="contact-data__title tagline-chapter animate-in-up">Phone</p>
                                <p class="contact-data__text small type-basic-160lh">
                                  <a class="link-small-160lh animate-in-up" href="tel:+6282334543975">+62 823-3454-3975</a>
                                </p>
                              </div>
                              <div class="col-12 col-md-4 col-lg-3 contact-data__item grid-item">
                                <p class="contact-data__title tagline-chapter animate-in-up">Email</p>
                                <p class="contact-data__text small type-basic-160lh">
                                  <a class="link-small-160lh animate-in-up" href="mailto:${EMAIL}?subject=Message%20from%20DimsPorf">${EMAIL}</a>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </footer>
              </div>
            </div>
            <div class="col-12 col-xl-2"></div>
          </div>
        </div>
      </div>
    </section>
    <!-- Inner Section - Contact - End -->`;

// ---- project page -------------------------------------------------------------------
function subtitle(label) {
  return `<div class="block__subtitle">
  <p class="tagline-chapter animate-in-up">${esc(label)}</p>
</div>
<div class="resume-divider animate-in-up"></div>`;
}

// ---- image helpers ----------------------------------------------------------------------
const imgExists = (rel) => fs.existsSync(path.join(V2, rel));
const small = (rel) => rel.replace(/\.webp$/, '-800.webp');
const imgAbs = (rel) => (/^https?:/.test(rel) ? rel : site.url + rel);
const slideAlt = (p, s, i) => `${p.title} case study, slide ${String(i + 1).padStart(2, '0')}: ${s.caption || ''}`.trim();

function slideFigure(p, s, i) {
  const srcset = imgExists(small(s.src)) ? ` srcset="${small(s.src)} 800w, ${s.src} 1600w" sizes="(min-width: 1200px) 70vw, 100vw"` : '';
  return `    <figure class="slide-stack__item animate-in-up">
      <img src="${s.src}"${srcset} alt="${esc(slideAlt(p, s, i))}" width="1600" height="900"${i > 1 ? ' loading="lazy" decoding="async"' : ''}>
    </figure>`;
}

// every content image of a project, for structured data and the image sitemap
function projectImages(p) {
  const list = [{ src: p.cover, name: `${p.title} cover` }];
  (p.decks || []).forEach((d) => (d.slides || []).forEach((s, i) => list.push({ src: s.src, name: slideAlt(p, s, i), caption: s.caption })));
  (p.gallery || []).forEach((g) => { if (g.src) list.push({ src: g.src, name: g.caption || p.title, caption: g.caption }); });
  const seen = new Set();
  return list.filter((x) => x.src && !seen.has(x.src) && seen.add(x.src));
}

function projectPage(p, i, sealed) {
  const next = projects[(i + 1) % projects.length];
  const url = `${site.url}work/${p.slug}/`;
  const cats = p.categories.map((c) => catLabel[c]).join(' · ');
  const title = `${p.title} — Case Study | ${site.name}`;
  const s = p.sections || {};
  const blocks = [];

  const meta = [
    ['Type', p.type],
    ['Role', p.role],
    p.year && ['Year', p.year],
    p.tools && p.tools.length && ['Tools', p.tools.join(', ')],
  ].filter(Boolean);
  blocks.push(`<div class="content__block case-block">
  <dl class="case-meta animate-in-up">
${meta.map(([k, v]) => `    <div class="case-meta__item"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('\n')}
  </dl>
</div>`);

  blocks.push(`<div class="content__block case-block">
  <figure class="case-cover animate-in-up">
    <img src="${p.cover}" alt="${esc(p.title)} cover" width="1920" height="1080">
  </figure>
</div>`);

  if (p.liveUrl) {
    blocks.push(`<div class="content__block case-block case-live">
  <a class="btn btn-line-small icon-right slide-right-down animate-in-up" href="${p.liveUrl}" target="_blank" rel="noopener">
    <span class="btn-caption">${esc(p.liveLabel || 'Open live project')}</span>
    <i class="ph ph-arrow-up-right"></i>
  </a>
</div>`);
  }

  // A YouTube link is already public, so the video stays visible even on locked projects.
  const hasVideo = !!(p.video && p.video.youtube);
  const videoBlock = () => `<div class="content__block case-block">
${indent(subtitle('Video'), 2)}
  <div class="deck animate-in-up">
    <div class="deck__frame">
      <iframe src="https://www.youtube-nocookie.com/embed/${p.video.youtube}" title="${esc(p.video.title || p.title)}" loading="lazy" allowfullscreen></iframe>
    </div>
  </div>
</div>`;

  if (p.locked) {
    if (hasVideo) blocks.push(videoBlock());
    blocks.push(lockBlock(p, sealed.payload));
  } else {
  if (s.overview) {
    blocks.push(`<div class="content__block case-block">
${indent(subtitle('Overview'), 2)}
  <p class="case-text type-basic-160lh animate-in-up">${esc(s.overview)}</p>
</div>`);
  }

  if (s.approach && s.approach.length) {
    blocks.push(`<div class="content__block case-block">
${indent(subtitle('Approach'), 2)}
  <ol class="case-steps">
${s.approach
  .map(
    (a, n) => `    <li class="case-steps__item animate-in-up">
      <span class="case-steps__num type-basic-160lh">${String(n + 1).padStart(2, '0')}.</span>
      <h4 class="case-steps__title">${esc(a.title)}</h4>
      <p class="case-steps__text type-basic-160lh">${esc(a.text)}</p>
    </li>`
  )
  .join('\n')}
  </ol>
</div>`);
  }

  // Slides / pitch decks (Google Slides, Canva, Figma, PDF)
  (p.decks || []).forEach((d, n) => {
    if (d.slides) {
      blocks.push(`<div class="content__block case-block" id="deck${n ? n + 1 : ''}">
${indent(subtitle(d.label || 'Case study'), 2)}
  <div class="slide-stack">
${d.slides.map((s, i) => slideFigure(p, s, i)).join('\n')}
  </div>
</div>`);
      return;
    }
    const e = embedFor(d.url);
    blocks.push(`<div class="content__block case-block" id="deck${n ? n + 1 : ''}">
${indent(subtitle(d.label || 'Pitch deck'), 2)}
  <div class="deck animate-in-up">
    <div class="deck__bar">
      <span class="deck__title"><i class="ph ph-presentation-chart"></i>${esc(d.title || p.title)} <small>${e.kind}</small></span>
      <a class="link-small-underline" href="${esc(e.open)}" target="_blank" rel="noopener">${e.pdf ? 'Open / download PDF' : 'Open fullscreen'}</a>
    </div>
    <div class="deck__frame">
      <iframe src="${esc(e.src)}" title="${esc(d.title || p.title)}" loading="lazy" allowfullscreen></iframe>
    </div>
  </div>
</div>`);
  });

  if (p.prototype) {
    const e = embedFor(p.prototype.url);
    blocks.push(`<div class="content__block case-block" id="prototype">
${indent(subtitle('Prototype'), 2)}
  <div class="deck animate-in-up">
    <div class="deck__bar">
      <span class="deck__title"><i class="ph ph-cursor-click"></i>${esc(p.prototype.title || 'Interactive prototype')} <small>${e.kind}</small></span>
      <a class="link-small-underline" href="${esc(e.open)}" target="_blank" rel="noopener">Open in new tab</a>
    </div>
    <div class="deck__frame">
      <iframe src="${esc(e.src)}" title="${esc(p.prototype.title || 'Prototype')}" loading="lazy" allowfullscreen></iframe>
    </div>
  </div>
</div>`);
  }

  if (hasVideo) blocks.push(videoBlock());

  if (p.gallery && p.gallery.length) {
    blocks.push(`<div class="content__block case-block">
${indent(subtitle('Screens & artefacts'), 2)}
</div>
<div class="content__block grid-block">
  <div class="container-fluid px-0 inner__gallery">
    <div class="row gx-0 my-gallery" itemscope itemtype="http://schema.org/ImageGallery" data-masonry='{"percentPosition": true }'>
${p.gallery
  .map(
    (g) => `      <figure class="col-12 col-md-6 gallery__item grid-item animate-in-up" itemprop="associatedMedia" itemscope itemtype="http://schema.org/ImageObject">
        <a href="${g.src}" data-image="${g.src}" class="gallery__link" itemprop="contentUrl" data-size="${g.w || 1920}x${g.h || 1080}">
          <img src="${g.src}" class="gallery__image" itemprop="thumbnail" alt="${esc(g.caption || p.title)}">
        </a>
        <figcaption class="gallery__descr" itemprop="caption description">
          <h5>${esc(g.caption || '')}</h5>
        </figcaption>
      </figure>`
  )
  .join('\n')}
    </div>
  </div>
</div>`);
  }

  }

  const person = { '@type': 'Person', name: site.author || 'Ahmad Dimas', url: site.url };
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: site.name, item: site.url },
        { '@type': 'ListItem', position: 2, name: 'Work', item: site.url + 'work/' },
        { '@type': 'ListItem', position: 3, name: p.title, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      '@id': url + '#work',
      name: p.title,
      headline: p.title,
      description: p.short,
      url,
      inLanguage: 'en',
      genre: p.categories.map((c) => catLabel[c]),
      creator: person,
      author: person,
      isPartOf: { '@type': 'WebSite', name: site.name, url: site.url },
      image: projectImages(p).map((im) => ({
        '@type': 'ImageObject',
        contentUrl: imgAbs(im.src),
        url: imgAbs(im.src),
        name: im.name,
        caption: im.caption || im.name,
        creator: person,
        representativeOfPage: im.src === p.cover,
      })),
    },
  ];

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">

<head>
  <base href="/v2/">
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(p.short)}">
  <meta name="author" content="${site.author}">
  <link rel="canonical" href="${url}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <link rel="icon" href="img/favicon/favicon.ico" sizes="any">
  <link rel="icon" href="img/favicon/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="img/favicon/apple-touch-icon.png">
  <link rel="manifest" href="img/favicon/manifest.webmanifest">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${site.name}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(p.short)}">
  <meta property="og:image" content="${abs(p.cover)}">
  <meta property="og:image:alt" content="${esc(p.title)} case study cover">
  <meta property="og:url" content="${url}">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(p.short)}">
  <meta name="twitter:image" content="${abs(p.cover)}">

  <script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=DM+Mono:wght@400&family=DM+Serif+Display&display=swap" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=DM+Mono:wght@400&family=DM+Serif+Display&display=swap"></noscript>
  <link rel="stylesheet" href="css/loaders/loader.css">
  <link rel="stylesheet" href="css/plugins.css">
  <link rel="stylesheet" href="css/main.css">
  <link rel="stylesheet" href="css/custom.css">

  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#BABEC8">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#141414">
</head>

<body>
${chrome('./')}

  <main id="page-content" class="page-content">
    <!-- Case study: ${p.slug} -->
    <section id="case" class="inner inner-grid-bottom case">
      <div class="inner__wrapper">
        <div class="container-fluid p-0">
          <div class="row g-0">

            <div class="col-12 col-xl-2">
              <div class="inner__name"></div>
            </div>

            <div class="col-12 col-xl-8">
              <div class="inner__content">

                <div class="content__block case-head loading-wrap">
                  <p class="tagline-chapter loading__item">${esc(cats)}</p>
                  <h1 class="case-head__title loading__item">${esc(p.title)}</h1>
                  <p class="case-head__lead type-basic-160lh loading__item">${esc(p.short)}</p>
                </div>

${indent(blocks.join('\n\n'), 16)}

${projects.length > 1 ? `                <div class="content__block case-block">
                  <a class="case-next animate-in-up" href="work/${next.slug}/">
                    <span class="tagline-chapter">Next project</span>
                    <span class="case-next__row">
                      <span class="case-next__title">${esc(next.title)}</span>
                      <i class="ph ph-arrow-right"></i>
                    </span>
                  </a>
                </div>
` : ''}
              </div>
            </div>

            <div class="col-12 col-xl-2"></div>
          </div>
        </div>
      </div>
    </section>

${footer}
  </main>

  <div class="header-offset"></div>

  <a href="#0" id="to-top" class="btn btn-to-top slide-up" aria-label="Back to top">
    <i class="ph ph-arrow-up"></i>
  </a>

${PSWP}

  <script src="js/libs.min.js"></script>
  <script src="js/gallery-init.js"></script>
  <script src="js/app.js"></script>
${p.locked ? '  <script src="js/unlock.js"></script>\n' : ''}</body>

</html>
`;
}

// ---- all-work page ------------------------------------------------------------------
function workIndexPage() {
  const url = `${site.url}work/`;
  const title = `All Work — UX, UI & Research Case Studies | ${site.name}`;
  const desc =
    'All case studies by Ahmad Dimas: UX research, UI design and web projects, with pitch decks, prototypes and process.';
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: site.name, item: site.url },
        { '@type': 'ListItem', position: 2, name: 'Work', item: url },
      ],
    },
  ];
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">

<head>
  <base href="/v2/">
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="author" content="${site.author}">
  <link rel="canonical" href="${url}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <link rel="icon" href="img/favicon/favicon.ico" sizes="any">
  <link rel="icon" href="img/favicon/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="img/favicon/apple-touch-icon.png">
  <link rel="manifest" href="img/favicon/manifest.webmanifest">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${site.name}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${abs('img/ahmad-dimas-ux-researcher-ui-designer-og.jpg')}">
  <meta property="og:image:alt" content="Ahmad Dimas, UX researcher and UI designer">
  <meta property="og:url" content="${url}">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${abs('img/ahmad-dimas-ux-researcher-ui-designer-og.jpg')}">

  <script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=DM+Mono:wght@400&family=DM+Serif+Display&display=swap" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=DM+Mono:wght@400&family=DM+Serif+Display&display=swap"></noscript>
  <link rel="stylesheet" href="css/loaders/loader.css">
  <link rel="stylesheet" href="css/plugins.css">
  <link rel="stylesheet" href="css/main.css">
  <link rel="stylesheet" href="css/custom.css">

  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#BABEC8">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#141414">
</head>

<body>
${chrome('./')}

  <main id="page-content" class="page-content">
    <section id="case" class="inner inner-grid-bottom case">
      <div class="inner__wrapper">
        <div class="container-fluid p-0">
          <div class="row g-0">

            <div class="col-12 col-xl-2">
              <div class="inner__name">
                <div class="content__block name-block">
                  <a class="section-name icon-left animate-in-up" href="./#portfolio">
                    <i class="ph ph-arrow-left"></i>
                    <span class="section-name-caption">Home</span>
                  </a>
                </div>
              </div>
            </div>

            <div class="col-12 col-xl-8">
              <div class="inner__content">
                <div class="content__block case-head loading-wrap">
                  <h1 class="case-head__title loading__item">All work</h1>
                  <p class="case-head__lead type-basic-160lh loading__item">Research, UX, UI and web projects. Open any of them for the full case study.</p>
                </div>

                <div class="content__block case-block">
${indent(cards(projects, true), 18)}
                </div>
              </div>
            </div>

            <div class="col-12 col-xl-2"></div>
          </div>
        </div>
      </div>
    </section>

${footer}
  </main>

  <div class="header-offset"></div>

  <a href="#0" id="to-top" class="btn btn-to-top slide-up" aria-label="Back to top">
    <i class="ph ph-arrow-up"></i>
  </a>

  <script src="js/libs.min.js"></script>
  <script src="js/app.js"></script>
  <script src="js/work-filter.js"></script>
</body>

</html>
`;
}

// ---- home page cards ---------------------------------------------------------------
function cards(list, withFilter) {
  const count = (id) => (id === 'all' ? list.length : list.filter((p) => p.categories.includes(id)).length);
  const filters = [{ id: 'all', label: 'All' }, ...categories].filter((f) => count(f.id) > 0);
  const tabs = filters
    .map(
      (f, i) =>
        `<button class="work-tabs__tab${i ? '' : ' is-active'}" type="button" role="tab" id="tab-${f.id}" aria-selected="${i ? 'false' : 'true'}" tabindex="${i ? '-1' : '0'}" data-filter="${f.id}"><span>${f.label}</span></button>`
    )
    .join('\n');
  const items = list
    .map((p) => {
      return `<a class="work-card animate-in-up" href="work/${p.slug}/" data-cats="${p.categories.join(' ')}">
  <div class="work-card__media">
    <img src="${p.cover}" alt="${esc(p.title)}" width="1920" height="1080" loading="lazy">
  </div>
  <div class="work-card__body">
    <div class="work-card__meta">
      <span class="work-card__type">${esc(p.type)}</span>
      ${p.categories.map((c) => `<span class="work-card__chip">${catLabel[c]}</span>`).join('\n      ')}
    </div>
    <h3 class="work-card__title">${esc(p.title)}</h3>
    <p class="work-card__text">${esc(p.short)}</p>
  </div>
</a>`;
    })
    .join('\n');
  const filterHtml = withFilter
    ? `<div class="work-tabs animate-in-up" role="tablist" aria-label="Filter projects by category">
${indent(tabs, 2)}
  <span class="work-tabs__bar" aria-hidden="true"></span>
</div>
`
    : '';
  return `${filterHtml}<div class="work-grid work-list" role="tabpanel">
${indent(items, 2)}
</div>`;
}

function inject(file, name, html) {
  const re = new RegExp(`(<!-- build:${name} -->)[\\s\\S]*?(<!-- /build:${name} -->)`);
  let src = fs.readFileSync(file, 'utf8');
  if (!re.test(src)) throw new Error(`marker build:${name} missing in ${file}`);
  src = src.replace(re, (_, a, b) => `${a}\n${html}\n${b}`);
  fs.writeFileSync(file, src);
}

// ---- run ------------------------------------------------------------------------------
projects.forEach((p, i) => {
  const dir = path.join(V2, 'work', p.slug);
  fs.mkdirSync(dir, { recursive: true });
  let sealed = null;
  if (p.locked) {
    const pw = passwordFor(p.slug);
    if (!pw) {
      if (fs.existsSync(path.join(dir, 'index.html'))) {
        console.warn(`! ${p.slug}: locked, no password in env, keeping the existing page`);
        return;
      }
      throw new Error(`${p.slug} is locked: set PORTFOLIO_PASSWORD (or PORTFOLIO_PASSWORD_${p.slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')})`);
    }
    sealed = sealProject(p, pw);
    const pdir = path.join(dir, 'private');
    fs.rmSync(pdir, { recursive: true, force: true });
    fs.mkdirSync(pdir, { recursive: true });
    sealed.files.forEach((f) => fs.writeFileSync(path.join(pdir, f.name), f.buf));
  }
  fs.writeFileSync(path.join(dir, 'index.html'), projectPage(p, i, sealed));
});
fs.writeFileSync(path.join(V2, 'work/index.html'), workIndexPage());
inject(path.join(V2, 'index.html'), 'work-cards', indent(cards(projects.filter((p) => p.featured), false), 14));

// sitemap: keep everything outside the v2 markers untouched. Pages carry their images (image sitemap).
const smap = path.join(ROOT, 'sitemap.xml');
const today = new Date().toISOString().slice(0, 10);
const imgXml = (list) => list.map((src) => `\n    <image:image>\n      <image:loc>${imgAbs(src)}</image:loc>\n    </image:image>`).join('');
const entryAt = (loc, lastmod, freq, prio, images = []) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>${imgXml(images)}\n  </url>`;
const entry = (loc, freq, prio, images = []) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>${imgXml(images)}\n  </url>`;
const urls = [
  entry(site.url, 'weekly', '0.9', ['img/backgrounds/ahmad-dimas-ux-researcher-ui-designer-portrait.webp', ...projects.map((p) => p.cover)]),
  entry(site.url + 'work/', 'weekly', '0.8', projects.map((p) => p.cover)),
  ...projects.map((p) => entry(site.url + 'work/' + p.slug + '/', 'monthly', '0.7', projectImages(p).map((x) => x.src))),
].join('\n');
let sm = fs.readFileSync(smap, 'utf8');
if (!sm.includes('xmlns:image')) sm = sm.replace('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
const block = `  <!-- build:v2 -->\n${urls}\n  <!-- /build:v2 -->`;
sm = /<!-- build:v2 -->/.test(sm)
  ? sm.replace(/ *<!-- build:v2 -->[\s\S]*?<!-- \/build:v2 -->/, block)
  : sm.replace('</urlset>', `${block}\n</urlset>`);
fs.writeFileSync(smap, sm);

// Stand-alone pages (sub-brand projects and archive pages) get their own sitemap entries with images.
const ORIGIN_URL = new URL(site.url).origin;
function standaloneImages(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const baseHref = (html.match(/<base href="([^"]+)"/i) || [])[1] || '/' + path.dirname(file).split(path.sep).join('/') + '/';
  const out = new Set();
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = (m[0].match(/\ssrc="([^"]+)"/) || [])[1];
    const alt = (m[0].match(/\salt="([^"]*)"/) || [])[1];
    if (!src || !alt || /^https?:/.test(src)) continue;
    out.add(new URL(src, ORIGIN_URL + baseHref).href);
  }
  const og = (html.match(/property="og:image"\s+content="([^"]+)"/) || [])[1];
  if (og && og.startsWith(ORIGIN_URL)) out.add(og);
  return [...out];
}
const standaloneUrls = (site.standalone || [])
  .filter((s) => s.index !== false)
  .map((s) => {
    const mtime = fs.statSync(path.join(ROOT, s.file)).mtime.toISOString().slice(0, 10);
    return entryAt(ORIGIN_URL + '/' + s.url, mtime, 'monthly', '0.6', standaloneImages(s.file));
  })
  .join('\n');
const sb = '  <!-- build:standalone -->\n' + standaloneUrls + '\n  <!-- /build:standalone -->';
sm = fs.readFileSync(smap, 'utf8');
if (/<!-- build:standalone -->/.test(sm)) {
  sm = sm.replace(/ *<!-- build:standalone -->[\s\S]*?<!-- \/build:standalone -->/, sb);
} else {
  // first run: replace the hand-written entries that followed the v2 block
  const i = sm.indexOf('<!-- /build:v2 -->') + '<!-- /build:v2 -->'.length;
  sm = sm.slice(0, i) + '\n\n' + sb + '\n</urlset>\n';
}
fs.writeFileSync(smap, sm);
console.log(`built ${projects.length} project pages`);

// SEO guardrail: fail the build when a page breaks the portfolio SEO rules
import('node:child_process').then(({ spawnSync }) => {
  const r = spawnSync(process.execPath, [path.join(V2, 'tools/seo-audit.mjs')], { stdio: 'inherit' });
  if (r.status) process.exitCode = r.status;
});
