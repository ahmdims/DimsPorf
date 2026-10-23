// Generates v2/work/<slug>/index.html and the portfolio cards on v2/index.html
// from v2/data/projects.json. Run: node v2/tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
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

function projectPage(p, i) {
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

  if (p.video && p.video.youtube) {
    blocks.push(`<div class="content__block case-block">
${indent(subtitle('Video'), 2)}
  <div class="deck animate-in-up">
    <div class="deck__frame">
      <iframe src="https://www.youtube-nocookie.com/embed/${p.video.youtube}" title="${esc(p.video.title || p.title)}" loading="lazy" allowfullscreen></iframe>
    </div>
  </div>
</div>`);
  }

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

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: site.name, item: site.url },
        { '@type': 'ListItem', position: 2, name: 'Work', item: site.url + '#portfolio' },
        { '@type': 'ListItem', position: 3, name: p.title, item: url },
      ],
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
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(p.short)}">
  <meta name="twitter:image" content="${abs(p.cover)}">

  <script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
  </script>

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
              <div class="inner__name">
                <div class="content__block name-block">
                  <a class="section-name icon-left animate-in-up" href="work/">
                    <i class="ph ph-arrow-left"></i>
                    <span class="section-name-caption">All work</span>
                  </a>
                </div>
              </div>
            </div>

            <div class="col-12 col-xl-8">
              <div class="inner__content">

                <div class="content__block case-head loading-wrap">
                  <p class="tagline-chapter loading__item">${esc(cats)}</p>
                  <h1 class="case-head__title loading__item">${esc(p.title)}</h1>
                  <p class="case-head__lead type-basic-160lh loading__item">${esc(p.short)}</p>
                </div>

${indent(blocks.join('\n\n'), 16)}

                <div class="content__block case-block">
                  <a class="case-next animate-in-up" href="work/${next.slug}/">
                    <span class="tagline-chapter">Next project</span>
                    <span class="case-next__row">
                      <span class="case-next__title">${esc(next.title)}</span>
                      <i class="ph ph-arrow-right"></i>
                    </span>
                  </a>
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

  <a href="#0" id="to-top" class="btn btn-to-top slide-up">
    <i class="ph ph-arrow-up"></i>
  </a>

${PSWP}

  <script src="js/libs.min.js"></script>
  <script src="js/gallery-init.js"></script>
  <script src="js/app.js"></script>
</body>

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
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <link rel="icon" href="img/favicon/favicon.ico" sizes="any">
  <link rel="icon" href="img/favicon/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="img/favicon/apple-touch-icon.png">
  <link rel="manifest" href="img/favicon/manifest.webmanifest">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${site.name}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${abs('img/og-image.jpg')}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${abs('img/og-image.jpg')}">

  <script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
  </script>

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
                  <p class="tagline-chapter loading__item">${projects.length} projects</p>
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

  <a href="#0" id="to-top" class="btn btn-to-top slide-up">
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
        `<button class="work-tabs__tab${i ? '' : ' is-active'}" type="button" role="tab" id="tab-${f.id}" aria-selected="${i ? 'false' : 'true'}" tabindex="${i ? '-1' : '0'}" data-filter="${f.id}"><span>${f.label}</span><sup>${count(f.id)}</sup></button>`
    )
    .join('\n');
  const items = list
    .map((p) => {
      const hasDeck = (p.decks || []).length > 0;
      return `<a class="work-card animate-in-up" href="work/${p.slug}/" data-cats="${p.categories.join(' ')}">
  <div class="work-card__media">
    <img src="${p.cover}" alt="${esc(p.title)}" width="1920" height="1080" loading="lazy">
    ${hasDeck ? '<span class="work-card__badge"><i class="ph ph-presentation-chart"></i>Deck</span>' : ''}
  </div>
  <div class="work-card__body">
    <div class="work-card__row">
      <h3 class="work-card__title">${esc(p.title)}</h3>
      <i class="ph ph-arrow-up-right"></i>
    </div>
    <p class="work-card__cats">${p.categories.map((c) => catLabel[c]).join(' · ')}${p.year ? ' · ' + p.year : ''}</p>
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
  return `${filterHtml}<div class="work-grid" role="tabpanel">
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
  fs.writeFileSync(path.join(dir, 'index.html'), projectPage(p, i));
});
fs.writeFileSync(path.join(V2, 'work/index.html'), workIndexPage());
inject(path.join(V2, 'index.html'), 'work-cards', indent(cards(projects.filter((p) => p.featured), false), 14));

// sitemap: keep everything outside the v2-work markers untouched
const smap = path.join(ROOT, 'sitemap.xml');
const today = new Date().toISOString().slice(0, 10);
const urls = [
  `  <url>\n    <loc>${site.url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>`,
  `  <url>\n    <loc>${site.url}work/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
  ...projects.map(
    (p) => `  <url>\n    <loc>${site.url}work/${p.slug}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
  ),
].join('\n');
let sm = fs.readFileSync(smap, 'utf8');
const block = `  <!-- build:v2 -->\n${urls}\n  <!-- /build:v2 -->`;
sm = /<!-- build:v2 -->/.test(sm)
  ? sm.replace(/ *<!-- build:v2 -->[\s\S]*?<!-- \/build:v2 -->/, block)
  : sm.replace('</urlset>', `${block}\n</urlset>`);
fs.writeFileSync(smap, sm);
console.log(`built ${projects.length} project pages`);
