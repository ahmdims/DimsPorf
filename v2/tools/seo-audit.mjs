// SEO guardrail for the portfolio. Runs at the end of `node v2/tools/build.mjs` and on its own:
//   node v2/tools/seo-audit.mjs
// It fails (exit code 1) when a page breaks the rules in .claude/skills/portfolio-seo/SKILL.md.
// Covers the v2 site and every stand-alone page listed in data/projects.json -> site.standalone
// (sub-brand projects such as /jejak/ and the archive pages under /v1/).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const V2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(V2, '..');
const { site } = JSON.parse(fs.readFileSync(path.join(V2, 'data/projects.json'), 'utf8'));
const SITE_URL = site.url; // https://primary-host/v2/
const ORIGIN = new URL(SITE_URL).origin;
const ALIASES = site.aliases || [];
const STANDALONE = site.standalone || [];

const errors = [];
const warns = [];
const err = (page, msg) => errors.push(`${page}: ${msg}`);
const warn = (page, msg) => warns.push(`${page}: ${msg}`);

// ---- collect pages ----------------------------------------------------------------------
const entries = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['css', 'js', 'img', 'fonts', 'source-files', 'data', 'tools', 'project', 'private-src'].includes(e.name)) continue;
      walk(f);
    } else if (e.name === 'index.html') {
      const r = path.relative(V2, f).replace(/\\/g, '/');
      entries.push({ file: f, name: 'v2/' + r, url: SITE_URL + r.replace(/index\.html$/, ''), indexable: true, kind: 'v2' });
    }
  }
};
walk(V2);
for (const s of STANDALONE) {
  entries.push({ file: path.join(ROOT, s.file), name: s.file, url: `${ORIGIN}/${s.url}`, indexable: s.index !== false, kind: s.file.startsWith('v1/') ? 'archive' : 'subbrand' });
}

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
  return sitemap.slice(i, sitemap.indexOf('</url>', i));
};

for (const entry of entries) {
  const { file, name, url, indexable, kind } = entry;
  if (!fs.existsSync(file)) { err(name, 'file listed in site.standalone does not exist'); continue; }
  const html = read(file);
  const head = html.slice(0, html.indexOf('</head>'));
  const isHome = name === 'v2/index.html';
  const robotsMeta = meta(head, 'robots') || '';
  const canonicalHref = attr((head.match(/<link[^>]*rel="canonical"[^>]*>/i) || [''])[0], 'href');

  // pages that stay online but must not be indexed
  if (!indexable) {
    if (!/noindex/i.test(robotsMeta)) err(name, 'must carry <meta name="robots" content="noindex, follow"> (not indexed on purpose)');
    if (sitemapBlock(url)) err(name, 'noindex page must not be in sitemap.xml');
    continue;
  }

  // base used to resolve relative image paths
  const baseHref = (html.match(/<base href="([^"]+)"/i) || [])[1] || '/' + path.dirname(path.relative(ROOT, file)).replace(/\\/g, '/') + '/';
  const fileOf = (src) => path.join(ROOT, decodeURIComponent(new URL(src, ORIGIN + baseHref).pathname));

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

  // canonical + robots + language + viewport + h1
  if (!canonicalHref) err(name, 'missing canonical');
  else if (canonicalHref !== url) err(name, `canonical is ${canonicalHref}, expected ${url}`);
  if (/noindex/i.test(robotsMeta)) err(name, 'page is noindex but listed as indexable');
  if (!/max-image-preview:large/.test(robotsMeta)) warn(name, 'robots meta should include max-image-preview:large');
  if (!/<html[^>]*\blang="[a-z-]+"/i.test(html)) err(name, 'missing <html lang>');
  if (!meta(head, 'viewport')) err(name, 'missing viewport');
  const h1s = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1s !== 1) err(name, `expected exactly one <h1>, found ${h1s}`);

  // Open Graph + Twitter
  for (const k of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name']) if (!meta(head, k, 'property')) err(name, `missing ${k}`);
  if (meta(head, 'og:url', 'property') && meta(head, 'og:url', 'property') !== url) err(name, 'og:url differs from canonical');
  if (meta(head, 'twitter:card') !== 'summary_large_image') err(name, 'twitter:card should be summary_large_image');
  const ogImage = meta(head, 'og:image', 'property');
  if (ogImage) {
    if (!ogImage.startsWith(ORIGIN + '/')) err(name, `og:image must be absolute on ${ORIGIN}: ${ogImage}`);
    else if (!fs.existsSync(path.join(ROOT, decodeURIComponent(ogImage.replace(ORIGIN + '/', ''))))) err(name, `og:image file not found: ${ogImage}`);
    if (!meta(head, 'og:image:alt', 'property')) warn(name, 'missing og:image:alt');
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
        if (kind === 'subbrand' && /\/(v1|v2)\//.test(u)) err(name, `stand-alone project must not link to another portfolio version in JSON-LD: ${u}`);
      });
    } catch (e) {
      err(name, 'invalid JSON-LD');
    }
  }
  if (isHome && !(types.includes('WebSite') && types.includes('ProfilePage'))) err(name, 'home needs WebSite + ProfilePage JSON-LD');
  if (kind === 'v2' && !isHome && !types.includes('BreadcrumbList')) err(name, 'inner page needs BreadcrumbList JSON-LD');
  if (/^v2\/work\/[^/]+\/index\.html$/.test(name) && !types.includes('CreativeWork')) err(name, 'project page needs CreativeWork JSON-LD with ImageObjects');
  if (kind === 'subbrand' && !types.includes('CreativeWork')) err(name, 'stand-alone project needs CreativeWork JSON-LD with its own ImageObject');
  if (kind === 'archive' && !types.includes('BreadcrumbList')) err(name, 'archive project page needs BreadcrumbList JSON-LD');

  // images
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const contentImgs = [];
  for (const tag of imgs) {
    const src = attr(tag, 'src');
    const alt = attr(tag, 'alt');
    if (!src) continue;
    const isLocal = !/^https?:/.test(src);
    if (alt === undefined) err(name, `image without alt attribute: ${src}`);
    if (isLocal && !fs.existsSync(fileOf(src))) err(name, `image file not found: ${src}`);
    for (const s of (attr(tag, 'srcset') || '').split(',').map((x) => x.trim().split(/\s+/)[0]).filter(Boolean)) {
      if (isLocal && !fs.existsSync(fileOf(s))) err(name, `srcset file not found: ${s}`);
    }
    if (alt && (!attr(tag, 'width') || !attr(tag, 'height'))) err(name, `content image without width/height (layout shift): ${src}`);
    if (alt && isLocal) {
      contentImgs.push(new URL(src, ORIGIN + baseHref).href);
      if (/\.(webp|jpe?g|png)$/i.test(alt)) err(name, `alt looks like a filename: "${alt}"`);
      if (alt.length < 10) warn(name, `alt is very short (${alt.length}): "${alt}" on ${src}`);
      const base = path.basename(src).replace(/\.[a-z0-9]+$/i, '');
      if (!/^[a-z0-9]+(-[a-z0-9]+){2,}$/.test(base) && !/^(og-image|favicon|icon-)/.test(base)) warn(name, `file name is not a descriptive slug: ${path.basename(src)}`);
    }
  }
  // images inside <figure> are content: empty alt is not allowed there
  for (const fig of html.matchAll(/<figure\b[\s\S]*?<\/figure>/gi)) {
    for (const tag of fig[0].matchAll(/<img\b[^>]*>/gi)) {
      if (!(attr(tag[0], 'alt') || '').trim()) err(name, `content image in <figure> has an empty alt: ${attr(tag[0], 'src')}`);
    }
  }

  // links
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attr(m[0], 'href');
    if (href === undefined || href === '' || /^javascript:/i.test(href)) err(name, `link without a crawlable href: ${m[0].slice(0, 60)}`);
    if (kind === 'v2' && href && !/^(https?:|mailto:|tel:|#)/.test(href)) {
      const p = path.join(V2, href.split('#')[0].replace(/^\/v2\//, ''));
      if (!fs.existsSync(p) && !fs.existsSync(path.join(p, 'index.html'))) err(name, `broken internal link: ${href}`);
    }
    if (href && ALIASES.some((a) => href.includes(a))) err(name, `link points to alias domain: ${href}`);
    // every project stands on its own: v2 must not advertise the other sites
    if (kind === 'v2' && href && /(\/|^)(v1|jejak|pemberdayaan|tanam-harapan)(\/|$|\.html)/.test(href.replace(/^https?:\/\/[^/]+/, ''))) err(name, `v2 must not link to a stand-alone project or archive page: ${href}`);
  }

  // sitemap + image sitemap
  const block = sitemapBlock(url);
  if (!block) err(name, 'page missing from sitemap.xml');
  else {
    for (const abs of new Set(contentImgs)) {
      if (!block.includes(`<image:loc>${abs}</image:loc>`) && !/img\/(marquee|icons|services|backgrounds\/1200x1200)/.test(abs) && !/-800\./.test(abs)) {
        warn(name, `content image missing from the image sitemap: ${abs.replace(ORIGIN, '')}`);
      }
    }
  }
}

// ---- site-wide ----------------------------------------------------------------------------
if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) err('robots.txt', `must declare Sitemap: ${ORIGIN}/sitemap.xml`);
if (/Disallow:\s*\/\s*$/m.test(robots)) err('robots.txt', 'disallows the whole site');
for (const loc of [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])) {
  if (!loc.startsWith(ORIGIN + '/')) err('sitemap.xml', `non-primary URL: ${loc}`);
  if (!entries.some((e) => e.url === loc)) err('sitemap.xml', `URL not covered by the audit (add it to site.standalone): ${loc}`);
}
if (!/xmlns:image=/.test(sitemap)) err('sitemap.xml', 'missing image sitemap namespace');
if (fs.existsSync(path.join(ROOT, 'vercel.json'))) {
  const vj = fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8');
  for (const a of ALIASES) if (!vj.includes(a)) err('vercel.json', `no 301 redirect from alias domain ${a}`);
  if (!/"destination":\s*"\/v2\/"/.test(vj) && !vj.includes(ORIGIN + '/v2/')) err('vercel.json', 'root is not redirected to /v2/');
} else err('vercel.json', 'missing (needed for the 301 redirects)');

// ---- report ---------------------------------------------------------------------------------
const nIdx = entries.filter((e) => e.indexable).length;
console.log(`\nSEO audit: ${entries.length} pages (${nIdx} indexed, ${entries.length - nIdx} noindex), primary host ${ORIGIN}`);
for (const w of warns) console.log('  warn  ' + w);
for (const e of errors) console.log('  ERROR ' + e);
console.log(errors.length ? `\nSEO audit FAILED: ${errors.length} error(s), ${warns.length} warning(s)\n` : `SEO audit passed (${warns.length} warning(s))\n`);
process.exit(errors.length ? 1 : 0);
