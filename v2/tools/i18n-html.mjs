// Translates the hand-written home page (v2/index.html) into another language without touching the English
// source. Every visible text segment and every text attribute is looked up in a dictionary
// (v2/data/home.<lang>.json: { "<English segment>": "<translation>" }). A segment is the text between two tags,
// whitespace collapsed and <br> kept ("Research-led<br>product design"). Strict by design: a segment that has
// letters but no dictionary entry is reported, so a page can never ship half translated. Proper nouns are
// listed in the dictionary with themselves as the value.
const PROTECTED = /(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->)/g;
const HAS_LETTERS = /[A-Za-zÀ-ɏ]/;
const META_KEYS = new Set(['description', 'og:title', 'og:description', 'og:image:alt', 'twitter:title', 'twitter:description', 'twitter:image:alt']);

export const normalizeSegment = (s) => s.replace(/\s*<br\s*\/?>\s*/gi, '<br>').replace(/\s+/g, ' ').trim();

export function translateHtml(html, dict) {
  const missing = new Set();
  const lookup = (key, where) => {
    if (!HAS_LETTERS.test(key)) return null;
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    missing.add(`${where}: ${key}`);
    return null;
  };

  const out = html
    .split(PROTECTED)
    .map((chunk, idx) => {
      if (idx % 2 === 1) {
        // JSON-LD: translate whole string values that are in the dictionary; everything else stays
        if (/^<script type="application\/ld\+json">/.test(chunk)) {
          return chunk.replace(/"((?:[^"\\]|\\.)*)"/g, (m, v) => (Object.prototype.hasOwnProperty.call(dict, v) ? `"${dict[v]}"` : m));
        }
        return chunk;
      }

      // text between tags
      let c = chunk.replace(/>((?:[^<>]|<br\s*\/?>)+)</g, (m, seg) => {
        const key = normalizeSegment(seg);
        const t = lookup(key, 'text');
        if (t === null) return m;
        const lead = seg.match(/^\s*/)[0];
        const trail = seg.match(/\s*$/)[0];
        return `>${lead}${t}${trail}<`;
      });

      // text attributes of tags
      c = c.replace(/<(meta|img|a|button|input|svg|div|span|label)\b[^>]*>/g, (tag) => {
        if (tag.startsWith('<meta')) {
          const key = (tag.match(/\b(?:name|property)="([^"]+)"/) || [])[1];
          if (!META_KEYS.has(key)) return tag;
          return tag.replace(/\bcontent="([^"]*)"/, (m, v) => {
            const t = lookup(v.replace(/\s+/g, ' ').trim(), `meta ${key}`);
            return t === null ? m : `content="${t}"`;
          });
        }
        return tag.replace(/\b(alt|aria-label|title|placeholder)="([^"]*)"/g, (m, a, v) => {
          const t = lookup(v.replace(/\s+/g, ' ').trim(), a);
          return t === null ? m : `${a}="${t}"`;
        });
      });
      return c;
    })
    .join('');
  return { html: out, missing: [...missing] };
}

// every translatable segment of a page (used to build / review the dictionary)
export function segmentsOf(html) {
  const found = new Set();
  translateHtml(html, {}).missing.forEach((m) => found.add(m));
  return [...found];
}
