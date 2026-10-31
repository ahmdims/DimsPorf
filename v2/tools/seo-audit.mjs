// SEO guardrail for the portfolio. Runs at the end of `node v2/tools/build.mjs` and on its own:
//   node v2/tools/seo-audit.mjs
// It fails (exit code 1) when a page breaks the rules in .claude/skills/portfolio-seo/SKILL.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const V2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(V2, '..');
const { site } = JSON.parse(fs.readFileSync(path.join(V2, 'data/projects.json'), 'utf8'));
const SITE_URL = site.url; // https://primary-host/v2/
const ORIGIN = new URL(SITE_URL).origin;
const ALIASES = site.aliases || [];

const errors = [];
const warns = [];
const err = (page, msg) => errors.push(`${page}: ${msg}`);
const warn = (page, msg) => warns.push(`${page}: ${msg}`);

// ---- collect pages ----------------------------------------------------------------------
const pages = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['css', 'js', 'img', 'fonts', 'source-files', 'data', 'tools', 'project', 'private-src'].includes(e.name)) continue;
      walk(f);
    } else if (e.name === 'index.html') pages.push(f);
  }
};
walk(V2);
const rel = (f) => path.relative(V2, f).replace(/\\/g, '/');
const urlOf = (f) => SITE_URL + rel(f).replace(/index\.html$/, '');

const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const attr = (tag, name) => (tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i')) || [])[1];
const meta = (html, key, by = 'name') => {
  const m = html.match(new RegExp(`<meta[^>]*\\b${by}="${key}"[^>]*>`, 'i'));
  return m ? attr(m[0], 'content') : undefined;
};
const decode = (s = '') => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const titles = new Map();
const descs = new Map();
const sitemap = read(path.join(ROOT, 'sitemap.xml'));
const robots = fs.existsSync(path.join(ROOT, 'robots.txt')) ? read(path.join(ROOT, 'robots.txt')) : '';

const sitemapBlock = (loc) => {
  const i = sitemap.indexOf(`<loc>${loc}</loc>`);
  if (i < 0) return null;
  const j = sitemap.indexOf('</url>', i);
  return sitemap.slice(i, j);
};

for (const f of pages) {
  const name = rel(f);
  const html = read(f);
  const url = urlOf(f);
  const isHome = name === 'index.html';
  const head = html.slice(0, html.indexOf('</head>'));

  // title
  const title = decode((head.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  if (!title) err(name, 'missing <title>');
  else {
    if (title.length < 15) err(name, `title too short (${title.length}): "${title}"`);
    if (title.length > 65) err(name, `title too long (${title.length} > 65): "${title}"`);
    else if (title.length > 60) warn(name, `title may be truncated in Google (${title.length} > 60)`);
    if (titles.has(title)) err(name, `duplicate title with ${titles.get(title)}`);
    titles.set(title, name);
  }

  // description
  const desc = decode(meta(head, 'description') || '').trim();
  if (!desc) err(name, 'missing meta description');
  else {
    if (desc.length < 70) err(name, `description too short (${desc.length} < 70)`);
    if (desc.length > 160) err(name, `description too long (${desc.length} > 160)`);
    if (descs.has(desc)) err(name, `duplicate description with ${descs.get(desc)}`);
    descs.set(desc, name);
  }

  // canonical + robots + language + viewport
  const canonical = (head.match(/<link[^>]*rel="canonical"[^>]*>/i) || [''])[0];
  const canonicalHref = attr(canonical, 'href');
  if (!canonicalHref) err(name, 'missing canonical');
  else if (canonicalHref !== url) err(name, `canonical is ${canonicalHref}, expected ${url}`);
  const robotsMeta = meta(head, 'robots');
  if (robotsMeta && /noindex/i.test(robotsMeta)) err(name, 'page is noindex');
  if (!/<html[^>]*\blang="[a-z-]+"/i.test(html)) err(name, 'missing <html lang>');
  if (!meta(head, 'viewport')) err(name, 'missing viewport');
  const h1s = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1s !== 1) err(name, `expected exactly one <h1>, found ${h1s}`);

  // Open Graph + Twitter
  for (const k of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name']) if (!meta(head, k, 'property')) err(name, `missing ${k}`);
  if (meta(head, 'og:url', 'property') && meta(head, 'og:url', 'property') !== url) err(name, 'og:url differs from canonical');
  if (!meta(head, 'twitter:card')) err(name, 'missing twitter:card');
  const ogImage = meta(head, 'og:image', 'property');
  if (ogImage) {
    if (!ogImage.startsWith(ORIGIN + '/')) err(name, `og:image must be absolute on ${ORIGIN}: ${ogImage}`);
    else if (!fs.existsSync(path.join(ROOT, ogImage.replace(ORIGIN + '/', '')))) err(name, `og:image file not found: ${ogImage}`);
  }

  // structured data
  const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const types = [];
  for (const raw of lds) {
    try {
      const j = JSON.parse(raw);
      for (const o of Array.isArray(j) ? j : [j]) types.push(o['@type']);
      (raw.match(/https?:\/\/[^"]+/g) || []).forEach((u) => {
        if (/schema\.org/.test(u)) return;
        if (!u.startsWith(ORIGIN) && /vercel\.app/.test(u)) err(name, `JSON-LD points to a non-primary host: ${u}`);
      });
    } catch (e) {
      err(name, 'invalid JSON-LD');
    }
  }
  if (isHome && !(types.includes('WebSite') && types.includes('ProfilePage'))) err(name, 'home needs WebSite + ProfilePage JSON-LD');
  if (!isHome && !types.includes('BreadcrumbList')) err(name, 'inner page needs BreadcrumbList JSON-LD');
  if (/^work\/[^/]+\/index\.html$/.test(name) && !types.includes('CreativeWork')) err(name, 'project page needs CreativeWork JSON-LD with ImageObjects');

  // images
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const contentImgs = [];
  for (const tag of imgs) {
    const src = attr(tag, 'src');
    const alt = attr(tag, 'alt');
    if (!src) continue;
    const isLocal = !/^https?:/.test(src);
    if (alt === undefined) err(name, `image without alt attribute: ${src}`);
    if (isLocal && !fs.existsSync(path.join(V2, src))) err(name, `image file not found: ${src}`);
    for (const s of (attr(tag, 'srcset') || '').split(',').map((x) => x.trim().split(/\s+/)[0]).filter(Boolean)) {
      if (isLocal && !fs.existsSync(path.join(V2, s))) err(name, `srcset file not found: ${s}`);
    }
    if (!attr(tag, 'width') || !attr(tag, 'height')) {
      if (alt) err(name, `content image without width/height (layout shift): ${src}`);
    }
    if (alt) {
      contentImgs.push(src);
      if (/\.(webp|jpe?g|png)$/i.test(alt)) err(name, `alt looks like a filename: "${alt}"`);
      if (alt.length < 10) warn(name, `alt is very short (${alt.length}): "${alt}" on ${src}`);
      const base = path.basename(src).replace(/\.[a-z0-9]+$/i, '');
      if (isLocal && !/^[a-z0-9]+(-[a-z0-9]+){2,}$/.test(base) && !/^(og-image|favicon|icon-)/.test(base)) warn(name, `file name is not a descriptive slug: ${path.basename(src)}`);
    }
  }

  // images inside <figure> are content: empty alt is not allowed there
  for (const fig of html.matchAll(/<figure\b[\s\S]*?<\/figure>/gi)) {
    for (const tag of fig[0].matchAll(/<img\b[^>]*>/gi)) {
      if (!(attr(tag[0], 'alt') || '').trim()) err(name, `content image in <figure> has an empty alt: ${attr(tag[0], 'src')}`);
    }
  }

  // links
  const base = '/v2/';
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attr(m[0], 'href');
    if (href === undefined || href === '' || /^javascript:/i.test(href)) err(name, `link without a crawlable href: ${m[0].slice(0, 60)}`);
    if (href && !/^(https?:|mailto:|tel:|#)/.test(href)) {
      const p = path.join(V2, href.split('#')[0].replace(/^\/v2\//, ''));
      if (!fs.existsSync(p) && !fs.existsSync(path.join(p, 'index.html'))) err(name, `broken internal link: ${href}`);
    }
    if (href && ALIASES.some((a) => href.includes(a))) err(name, `link points to alias domain: ${href}`);
  }

  // sitemap + image sitemap
  const block = sitemapBlock(url);
  if (!block) err(name, 'page missing from sitemap.xml');
  else {
    for (const src of new Set(contentImgs)) {
      const abs = /^https?:/.test(src) ? src : SITE_URL + src;
      if (!block.includes(`<image:loc>${abs}</image:loc>`) && !/img\/(marquee|icons|services|backgrounds\/1200x1200)/.test(src) && !/-800\./.test(src)) {
        warn(name, `content image missing from the image sitemap: ${src}`);
      }
    }
  }
}

// ---- site-wide ----------------------------------------------------------------------------
if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) err('robots.txt', `must declare Sitemap: ${ORIGIN}/sitemap.xml`);
if (/Disallow:\s*\/\s*$/m.test(robots)) err('robots.txt', 'disallows the whole site');
for (const loc of [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])) {
  if (!loc.startsWith(ORIGIN + '/')) err('sitemap.xml', `non-primary URL: ${loc}`);
}
if (!/xmlns:image=/.test(sitemap)) err('sitemap.xml', 'missing image sitemap namespace');
if (fs.existsSync(path.join(ROOT, 'vercel.json'))) {
  const vj = fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8');
  for (const a of ALIASES) if (!vj.includes(a)) err('vercel.json', `no 301 redirect from alias domain ${a}`);
  if (!/"destination":\s*"\/v2\/"/.test(vj) && !vj.includes(ORIGIN + '/v2/')) err('vercel.json', 'root is not redirected to /v2/');
} else err('vercel.json', 'missing (needed for the 301 redirects)');

// ---- report ---------------------------------------------------------------------------------
console.log(`\nSEO audit: ${pages.length} pages, primary host ${ORIGIN}`);
for (const w of warns) console.log('  warn  ' + w);
for (const e of errors) console.log('  ERROR ' + e);
console.log(errors.length ? `\nSEO audit FAILED: ${errors.length} error(s), ${warns.length} warning(s)\n` : `SEO audit passed (${warns.length} warning(s))\n`);
process.exit(errors.length ? 1 : 0);
