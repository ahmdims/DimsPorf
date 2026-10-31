// Generates the v3 site (home, all-work, project pages) from v3/data/*.json.
// Run: node v3/tools/build.mjs      (see v3/tools/README.md for locked projects)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const V3 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(V3, '..');
const { site, categories, projects } = JSON.parse(fs.readFileSync(path.join(V3, 'data/projects.json'), 'utf8'));
const me = JSON.parse(fs.readFileSync(path.join(V3, 'data/profile.json'), 'utf8'));
const SITE_URL = 'https://dimsporf.vercel.app/v3/';
const YEAR = new Date().getFullYear();
const LOGO = fs.readFileSync(path.join(V3, 'tools/partials/logo.svg.html'), 'utf8').replace(/\r\n/g, '\n').trim();
const catLabel = Object.fromEntries(categories.map((c) => [c.id, c.label]));

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (p) => (/^https?:/.test(p) ? p : SITE_URL + p);
const indent = (s, n) => s.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');
const write = (rel, content) => {
  const f = path.join(V3, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
};

// ---- icons (Heroicons outline, 24x24) -----------------------------------------------
const icon = (d, cls = '') =>
  `<svg${cls ? ` class="${cls}"` : ''} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`;
const I = {
  upRight: (c) => icon('M4.5 19.5 19.5 4.5m0 0H8.25m11.25 0v11.25', c),
  left: (c) => icon('M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18', c),
  right: (c) => icon('M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3', c),
  up: (c) => icon('M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18', c),
  sun: (c) => icon('M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z', c),
  moon: (c) => icon('M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z', c),
  bars: (c) => icon('M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5', c),
  lock: (c) => icon('M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z', c),
};

// ---- embeds (Google Slides / Canva / Figma / PDF) -------------------------------------
function embedFor(raw) {
  const url = raw.trim();
  let m;
  if ((m = url.match(/docs\.google\.com\/presentation\/d\/(e\/)?([\w-]+)/))) {
    const id = (m[1] || '') + m[2];
    return { kind: 'Google Slides', src: `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000`, open: `https://docs.google.com/presentation/d/${id}/present` };
  }
  if (/canva\.com\/design\//.test(url)) {
    const base = url.split('?')[0].replace(/\/(view|edit|watch)$/, '/view');
    return { kind: 'Canva', src: `${base}?embed`, open: base };
  }
  if (/figma\.com\/(proto|design|deck|slides|file|board)\//.test(url)) {
    return { kind: 'Figma', src: url.replace('://www.figma.com/', '://embed.figma.com/') + (url.includes('?') ? '&' : '?') + 'embed-host=share', open: url };
  }
  if (/\.pdf($|[?#])/i.test(url)) return { kind: 'PDF', src: url + (url.includes('#') ? '' : '#view=FitH'), open: url, pdf: true };
  return { kind: 'Embed', src: url, open: url };
}

// ---- locked projects (PBKDF2 -> AES-256-GCM, decrypted in the browser) ----------------
const ITER = 600000;
const PRIVATE_SRC = path.join(V3, 'private-src');
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
    return Buffer.concat([iv, ct, c.getAuthTag()]);
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
    decks: (p.decks || []).map((d) => ({
      title: d.title || p.title,
      label: d.label || 'Pitch deck',
      ...(d.file ? { ...addFile(d.file), kind: 'PDF', pdf: true } : embedFor(d.url)),
    })),
    gallery: (p.gallery || []).map((g) => ({ ...addFile(g.file), caption: g.caption || '' })),
  };
  const body = enc(Buffer.from(JSON.stringify(data)));
  return { files, payload: { v: 1, iter: ITER, salt: salt.toString('base64'), data: body.toString('base64'), base: `work/${p.slug}/private/` } };
}

// ---- shared page chrome ---------------------------------------------------------------
const NAV = [
  ['work/', 'Work', 'work'],
  ['#about', 'About', 'about'],
  ['#experience', 'Experience', 'experience'],
  ['#contact', 'Contact', 'contact'],
];

function head({ title, desc, url, image, type = 'website', ld = [] }) {
  return `<head>
  <base href="/v3/">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="author" content="${me.name}">
  <meta name="robots" content="noindex, nofollow">
  <link rel="canonical" href="${url}">
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#babec8">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#141414">

  <link rel="icon" href="img/favicon/favicon.ico" sizes="any">
  <link rel="icon" href="img/favicon/icon.svg" type="image/svg+xml">

  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="${site.name}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${abs(image)}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${abs(image)}">
${ld.map((o) => `  <script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n  </script>`).join('\n')}

  <script>
    (function () {
      var r = document.documentElement;
      r.classList.add('js');
      try {
        var t = localStorage.getItem('dimsporf.theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        r.setAttribute('data-theme', t);
      } catch (e) {}
    })();
  </script>
  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/components.css">
</head>`;
}

function header(active) {
  const links = NAV.map(([href, label, id]) => `<a href="${href}"${active === id ? ' aria-current="page"' : ''}>${label}</a>`).join('\n          ');
  return `<a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="container site-header__bar">
      <a class="brand" href="./" aria-label="${site.name} home">
${indent(LOGO, 8)}
        <span>${site.name}</span>
      </a>
      <nav class="nav" id="nav" aria-label="Main">
          ${links}
      </nav>
      <div class="tools">
        <button class="icon-btn theme-toggle" type="button" aria-label="Toggle light and dark theme">${I.sun('i-sun')}${I.moon('i-moon')}</button>
        <button class="icon-btn menu-toggle" type="button" aria-label="Menu" aria-controls="nav" aria-expanded="false">${I.bars()}</button>
      </div>
    </div>
  </header>`;
}

function footer() {
  const socials = me.socials.map((s) => `<a href="${s.href}" target="_blank" rel="noopener">${s.label}</a>`).join('\n          ');
  return `<footer class="site-footer" id="contact">
    <div class="container">
      <div class="cta">
        <div>
          <span class="eyebrow">Contact</span>
          <p class="cta__title">Have a project<br>in mind?</p>
        </div>
        <a href="mailto:${me.email}?subject=Message%20from%20DimsPorf" aria-label="Email me"><span class="circle-btn">${I.right()}</span></a>
      </div>
      <div class="contact-data">
        <div><span class="eyebrow">Location</span><a href="${me.locationHref}" target="_blank" rel="noopener">${me.location}</a></div>
        <div><span class="eyebrow">Phone</span><a href="tel:${me.phoneHref}">${me.phone}</a></div>
        <div><span class="eyebrow">Email</span><a href="mailto:${me.email}?subject=Message%20from%20DimsPorf">${me.email}</a></div>
      </div>
      <div class="footer-bar">
        <span>&copy; ${YEAR} ${me.name}</span>
        <nav class="socials" aria-label="Social">
          ${socials}
        </nav>
      </div>
    </div>
  </footer>`;
}

function page({ headHtml, active, body, scripts = [] }) {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">

${headHtml}

<body id="top">
  ${header(active)}

  <main id="main">
${indent(body, 4)}
  </main>

  ${footer()}

  <script src="js/main.js"></script>
${scripts.map((s) => `  <script src="${s}"></script>`).join('\n')}
</body>

</html>
`;
}

// ---- pieces ----------------------------------------------------------------------------
const tag = (c) => `<span class="tag" data-cat="${c}">${catLabel[c]}</span>`;

function card(p) {
  return `<a class="card reveal" href="work/${p.slug}/" data-cats="${p.categories.join(' ')}">
  <div class="card__media">
    <img src="${p.cover}" alt="${esc(p.title)}" width="1920" height="1080" loading="lazy">
    <span class="card__go">${I.upRight()}</span>
  </div>
  <div class="card__body">
    <div class="tags">${p.categories.map(tag).join('')}</div>
    <h3 class="card__title">${esc(p.title)}</h3>
    <p class="card__text muted">${esc(p.short)}</p>
  </div>
</a>`;
}

// first, third... plain; second, fourth... pushed down (staggered rhythm). JS redoes this when filtering.
const cardsHtml = (list, attrs = '') =>
  `<div class="cards"${attrs}>
${indent(list.map((p, i) => card(p).replace('class="card reveal"', i % 2 ? 'class="card reveal is-even"' : 'class="card reveal"')).join('\n'), 2)}
</div>`;

const secHead = (label, title, right = '') => `<div class="sec-head">
  <div>
    <span class="eyebrow">${label}</span>
    <h2 class="h2">${title}</h2>
  </div>
  ${right}
</div>`;

const rows = (list) =>
  `<ul class="rows">
${list
  .map(
    (r, i) => `  <li>
    <span class="rows__num mono">${String(i + 1).padStart(2, '0')}.</span>
    <span class="rows__year">${esc(r.year)}</span>
    <span class="rows__role">${esc(r.role)}</span>
    <span class="rows__org">${r.href ? `<a href="${r.href}" target="_blank" rel="noopener">${esc(r.org)}</a>` : esc(r.org)}</span>
    <span class="rows__note">${esc(r.note || '')}</span>
  </li>`
  )
  .join('\n')}
</ul>`;

const TOOL_ICON = {
  figma: 'figma', illustrator: 'illustrator', photoshop: 'photoshop', affinity: 'affinity', miro: 'miro', notion: 'notion',
  jira: 'jira', php: 'php', laravel: 'laravel', javascript: 'javascript', html5: 'html', css3: 'css', bootstrap: 'bootstrap',
  mysql: 'mysql', postgresql: 'postgresql',
};
const tool = (t) => {
  const f = TOOL_ICON[t.toLowerCase()];
  return f
    ? `<li class="tool"><img src="img/icons/icon-${f}.svg" alt="" width="44" height="44" loading="lazy"><span>${esc(t)}</span></li>`
    : `<li class="tool tool--text">${esc(t)}</li>`;
};

function marquee() {
  const tiles = [
    ['letter', 'd'], ['img', 'dreamjourney'], ['letter', 'i'], ['img', 'puspresnas'], ['letter', 'm'],
    ['img', 'bem-dcc'], ['letter', 'a'], ['img', 'pemberdayaan'], ['letter', 's'],
  ].map(([k, n]) =>
    k === 'letter'
      ? `<div class="m-item m-item--letter"><img src="img/icons/dimas/${n}.svg" alt="" loading="lazy"></div>`
      : `<div class="m-item m-item--img"><img src="img/marquee/${n}.webp" alt="" loading="lazy"></div>`
  );
  const set = tiles.join('\n');
  return `<div class="marquee" aria-hidden="true">
  <div class="marquee__track">
${indent(set + '\n' + set, 4)}
  </div>
</div>`;
}

// ---- home --------------------------------------------------------------------------------
function homePage() {
  const featured = projects.filter((p) => p.featured);
  const title = `${me.name}: UX Researcher, UI Designer & Web Developer | ${site.name}`;
  const desc = 'Portfolio of Ahmad Dimas: UX research, UI design and web development case studies, with pitch decks, prototypes and the process behind each project.';
  const body = `<section class="hero">
  <div class="hero__decor" aria-hidden="true">
    <img class="d1" data-speed="0.18" src="img/backgrounds/1200x1200_bg01.webp" alt="" width="600" height="600">
    <img class="d2" data-speed="-0.12" src="img/backgrounds/1200x1200_bg02.webp" alt="" width="300" height="300">
  </div>
  <div class="container">
    <span class="eyebrow">Hello! I am Ahmad Dimas</span>
    <h1 class="display">Research-led<br><em>product design</em></h1>
    <p class="lead">I research how people actually behave, design the experience around what I learn, and build it in code.</p>
    <div class="hero__cta">
      <a class="btn btn--solid" href="work/">View case studies ${I.right()}</a>
      <a class="btn" href="${me.cv}" target="_blank" rel="noopener">Download CV ${I.upRight()}</a>
    </div>
    <div class="facts">
      <span>${me.location}</span>
      <span>Software Engineer at SEVIMA</span>
      <span>Research, UX, UI, Web</span>
    </div>
  </div>
</section>

${marquee()}

<section class="section container" id="work">
${indent(secHead('Selected work', 'Case studies, <em>not screenshots</em>', '<a class="btn" href="work/">Show all projects ' + I.right() + '</a>'), 2)}
${indent(cardsHtml(featured), 2)}
</section>

<section class="section container" id="about">
${indent(secHead('About me', 'Curious first,<br><em>designer second</em>'), 2)}
  <div class="about">
    <div class="about__photo reveal"><img src="img/profile.webp" alt="Portrait of ${me.name}" width="1000" height="999" loading="lazy"></div>
    <div class="about__text reveal">
      <p>${esc(me.about)}</p>
      <div class="about__links">
        <a class="btn btn--solid" href="${me.cv}" target="_blank" rel="noopener">Download CV ${I.upRight()}</a>
        <a class="btn" href="mailto:${me.email}?subject=Message%20from%20DimsPorf">Email me</a>
      </div>
    </div>
  </div>
</section>

<section class="section container" id="approach">
${indent(secHead('Approach', 'From question<br><em>to shipped screen</em>'), 2)}
  <ul class="caps">
${me.capabilities
  .map(
    (c, i) => `    <li class="cap reveal">
      <img class="cap__art" src="img/services/800x1000_s0${i + 1}.webp" alt="" width="400" height="500" loading="lazy">
      <div class="cap__top"><span class="tag" data-cat="${c.id}">${String(i + 1).padStart(2, '0')}</span></div>
      <div class="cap__body">
        <h3 class="h3">${esc(c.title)}</h3>
        <p>${esc(c.text)}</p>
      </div>
    </li>`
  )
  .join('\n')}
  </ul>
</section>

<section class="section container" id="experience">
${indent(secHead('Resume', 'The digital<br><em>journey</em>'), 2)}
  <div class="rows-group reveal"><span class="eyebrow">Work experience</span>
${indent(rows(me.experience), 4)}
  </div>
  <div class="rows-group reveal"><span class="eyebrow">Education</span>
${indent(rows(me.education), 4)}
  </div>
  <div class="rows-group reveal"><span class="eyebrow">Recognition</span>
${indent(rows(me.awards), 4)}
  </div>
  <div class="rows-group reveal"><span class="eyebrow">My favourite tools</span>
    <ul class="tool-grid">
${indent(me.tools.map(tool).join('\n'), 6)}
    </ul>
  </div>
</section>`;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: SITE_URL },
    {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      mainEntity: {
        '@type': 'Person',
        name: me.name,
        alternateName: site.name,
        url: SITE_URL,
        jobTitle: 'UX Researcher, UI Designer & Software Engineer',
        sameAs: me.socials.map((s) => s.href),
      },
    },
  ];
  return page({ headHtml: head({ title, desc, url: SITE_URL, image: 'img/og-image.jpg', ld }), active: '', body });
}

// ---- all work ------------------------------------------------------------------------------
function workIndexPage() {
  const url = `${SITE_URL}work/`;
  const title = `All Work: UX, UI & Research Case Studies | ${site.name}`;
  const desc = 'All case studies by Ahmad Dimas: UX research, UI design and web projects, with pitch decks, prototypes and process.';
  const tabs = [{ id: 'all', label: 'All' }, ...categories].filter((f) => f.id === 'all' || projects.some((p) => p.categories.includes(f.id)));
  const body = `<section class="page-head page-head--center container">
  <span class="eyebrow">Work</span>
  <h1 class="h1">All <em>work</em></h1>
  <p class="lead">Research, UX, UI and web projects. Open any of them for the full case study.</p>
</section>
<section class="container" style="padding-bottom: var(--s-9)">
  <div class="tabs" role="tablist" aria-label="Filter projects by category">
${tabs
  .map(
    (f, i) =>
      `    <button class="tabs__tab" type="button" role="tab" id="tab-${f.id}" aria-selected="${i ? 'false' : 'true'}" tabindex="${i ? '-1' : '0'}" data-filter="${f.id}">${f.label}</button>`
  )
  .join('\n')}
    <span class="tabs__thumb" aria-hidden="true"></span>
  </div>
${indent(cardsHtml(projects, ' data-filterable role="tabpanel"'), 2)}
</section>`;
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: site.name, item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Work', item: url },
      ],
    },
  ];
  return page({ headHtml: head({ title, desc, url, image: 'img/og-image.jpg', ld }), active: 'work', body });
}

// ---- project -------------------------------------------------------------------------------
const block = (label, inner) => `<section class="block container">
  <div class="block__grid reveal">
    <h2 class="block__label eyebrow">${esc(label)}</h2>
    <div class="block__body">
${indent(inner, 6)}
    </div>
  </div>
</section>`;

const frameHtml = (title, kind, href, hrefLabel, src) => `<div class="frame">
  <div class="frame__bar">
    <span class="frame__title">${esc(title)} <small>${kind}</small></span>
    <a class="mono text-link" href="${esc(href)}" target="_blank" rel="noopener">${hrefLabel}</a>
  </div>
  <div class="frame__view"><iframe src="${esc(src)}" title="${esc(title)}" loading="lazy" allowfullscreen></iframe></div>
</div>`;

function gate(p, payload) {
  const mail = `mailto:${me.email}?subject=${encodeURIComponent('Access request: ' + p.title)}`;
  return `<section class="block container" id="private" data-private>
  <div class="block__grid">
    <h2 class="block__label eyebrow">Private case study</h2>
    <div class="block__body">
      <div class="gate">
        <div class="gate__ghost" aria-hidden="true">
          <i style="width:100%"></i><i style="width:92%"></i><i style="width:58%"></i>
          <div class="row"><i></i><i></i><i style="height:3.5rem"></i></div>
          <div class="row"><i></i><i></i><i style="height:3.5rem"></i></div>
          <div class="imgs"><i></i><i></i></div>
        </div>
        <div class="gate__card">
          <span class="gate__icon">${I.lock()}</span>
          <h3 class="gate__title">This case study is confidential</h3>
          <p class="gate__text">This case study contains confidential details. To request access, email <a href="${mail}">${me.email}</a> or use the credentials in my CV, if available.</p>
          <form class="gate__form" autocomplete="off">
            <label class="sr-only" for="pv-pass">Password</label>
            <input id="pv-pass" class="gate__input" type="password" placeholder="Password" autocomplete="off" required>
            <button class="btn btn--solid" type="submit">Unlock</button>
          </form>
          <p class="gate__error" role="alert" hidden></p>
          <a class="gate__mail" href="${mail}">Request access via email</a>
        </div>
      </div>
      <div class="private-slot" hidden></div>
    </div>
  </div>
  <script type="application/json" id="private-payload">${JSON.stringify(payload)}</script>
</section>`;
}

function projectPage(p, i, sealed) {
  const next = projects[(i + 1) % projects.length];
  const url = `${SITE_URL}work/${p.slug}/`;
  const title = `${p.title}: Case Study | ${site.name}`;
  const s = p.sections || {};
  const parts = [];

  parts.push(`<section class="page-head container">
  <a class="back mono" href="work/"><span class="circle-btn">${I.left()}</span> All work</a>
  <div class="tags">${p.categories.map(tag).join('')}</div>
  <h1 class="h1">${esc(p.title)}</h1>
  <p class="lead">${esc(p.short)}</p>
</section>`);

  const meta = [['Type', p.type], ['Role', p.role], p.year && ['Year', p.year], p.tools && p.tools.length && ['Tools', p.tools.join(', ')]].filter(Boolean);
  parts.push(`<section class="container">
  <dl class="meta" style="--cols:${meta.length}">
${meta.map(([k, v]) => `    <div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('\n')}
  </dl>
  <figure class="cover"><img src="${p.cover}" alt="${esc(p.title)} cover" width="1920" height="1080"></figure>${
    p.liveUrl
      ? `\n  <div class="live-link"><a class="btn" href="${p.liveUrl}" target="_blank" rel="noopener">${esc(p.liveLabel || 'Open live project')} ${I.upRight()}</a></div>`
      : ''
  }
</section>`);

  const videoBlock = () =>
    block('Video', `<div class="frame"><div class="frame__view"><iframe src="https://www.youtube-nocookie.com/embed/${p.video.youtube}" title="${esc(p.video.title || p.title)}" loading="lazy" allowfullscreen></iframe></div></div>`);
  const hasVideo = !!(p.video && p.video.youtube);

  if (p.locked) {
    if (hasVideo) parts.push(videoBlock());
    parts.push(gate(p, sealed.payload));
  } else {
    if (s.overview) parts.push(block('Overview', `<p class="prose">${esc(s.overview)}</p>`));
    if (s.approach && s.approach.length) {
      parts.push(
        block(
          'Approach',
          `<ol class="steps">
${s.approach.map((a, n) => `  <li><span class="steps__num mono">${String(n + 1).padStart(2, '0')}</span><h3 class="steps__title">${esc(a.title)}</h3><p class="steps__text">${esc(a.text)}</p></li>`).join('\n')}
</ol>`
        )
      );
    }
    (p.decks || []).forEach((d) => {
      const e = embedFor(d.url);
      parts.push(block(d.label || 'Pitch deck', frameHtml(d.title || p.title, e.kind, e.open, e.pdf ? 'Open / download PDF' : 'Open fullscreen', e.src)));
    });
    if (p.prototype) {
      const e = embedFor(p.prototype.url);
      parts.push(block('Prototype', frameHtml(p.prototype.title || 'Interactive prototype', e.kind, e.open, 'Open in new tab', e.src)));
    }
    if (hasVideo) parts.push(videoBlock());
    if (p.gallery && p.gallery.length) {
      parts.push(
        block(
          'Screens & artefacts',
          `<div class="gallery">
${p.gallery
  .map(
    (g) => `  <figure>
    <button class="gallery__btn" type="button" data-lightbox="${g.src}" data-caption="${esc(g.caption || '')}"><img src="${g.src}" alt="${esc(g.caption || p.title)}" width="${g.w || 1920}" height="${g.h || 1080}" loading="lazy"></button>
    ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}
  </figure>`
  )
  .join('\n')}
</div>`
        )
      );
    }
  }

  parts.push(`<section class="container">
  <a class="next" href="work/${next.slug}/">
    <div>
      <span class="eyebrow">Next project</span>
      <span class="next__title">${esc(next.title)}</span>
    </div>
    <span class="circle-btn">${I.right()}</span>
  </a>
</section>`);

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: site.name, item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Work', item: `${SITE_URL}work/` },
        { '@type': 'ListItem', position: 3, name: p.title, item: url },
      ],
    },
  ];
  return page({
    headHtml: head({ title, desc: p.short, url, image: p.cover, type: 'article', ld }),
    active: 'work',
    body: parts.join('\n\n'),
    scripts: p.locked ? ['js/unlock.js'] : [],
  });
}

// ---- run -------------------------------------------------------------------------------------
write('index.html', homePage());
write('work/index.html', workIndexPage());
projects.forEach((p, i) => {
  const dir = path.join(V3, 'work', p.slug);
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
  write(`work/${p.slug}/index.html`, projectPage(p, i, sealed));
});
console.log(`built v3: home, work index, ${projects.length} project pages`);
