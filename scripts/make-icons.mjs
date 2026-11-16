// Draws the app icon (a paper card with its red rule and "Rú", the ú in red, a card with a
// blue rule behind it, on ink) as SVG, writes favicon.svg and renders the PNGs with Playwright.
// The lettering is Golos Text Bold, turned into paths, so no SVG needs the font.
// Usage: PLAYWRIGHT_MODULE=<path to node_modules/playwright> yarn icons
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { inflateSync } from 'node:zlib';

const OUT = new URL('../apps/web/static/', import.meta.url);
const FONT = new URL(
  '../node_modules/@fontsource/golos-text/files/golos-text-latin-700-normal.woff',
  import.meta.url,
);

const INK = '#161b26';
const PAPER = '#ffffff';
const BACK_PAPER = '#dde1e8';
const RED = '#d6334a';
const BLUE = '#2f5fc4';

/** The tables of a WOFF 1 file with TrueType outlines. */
function readWoff(buf) {
  const tables = {};
  for (let i = 0; i < buf.readUInt16BE(12); i++) {
    const o = 44 + i * 20;
    const offset = buf.readUInt32BE(o + 4);
    const data = buf.subarray(offset, offset + buf.readUInt32BE(o + 8));
    tables[buf.toString('ascii', o, o + 4)] =
      data.length < buf.readUInt32BE(o + 12) ? inflateSync(data) : data;
  }
  return tables;
}

function openFont(buf) {
  const t = readWoff(buf);
  const longLoca = t.head.readInt16BE(50) === 1;
  const loca = (g) => (longLoca ? t.loca.readUInt32BE(g * 4) : t.loca.readUInt16BE(g * 2) * 2);

  let format4 = 0;
  for (let i = 0; i < t.cmap.readUInt16BE(2); i++) {
    const o = 4 + i * 8;
    const offset = t.cmap.readUInt32BE(o + 4);
    if (t.cmap.readUInt16BE(o) === 3 && t.cmap.readUInt16BE(offset) === 4) format4 = offset;
  }
  if (!format4) throw new Error('The font has no Unicode cmap (format 4)');
  const glyphOf = (code) => {
    const c = t.cmap;
    const segs = c.readUInt16BE(format4 + 6) / 2;
    const ends = format4 + 14;
    const starts = ends + segs * 2 + 2;
    const deltas = starts + segs * 2;
    const ranges = deltas + segs * 2;
    for (let i = 0; i < segs; i++) {
      if (code > c.readUInt16BE(ends + i * 2)) continue;
      const start = c.readUInt16BE(starts + i * 2);
      if (code < start) return 0;
      const delta = c.readInt16BE(deltas + i * 2);
      const range = c.readUInt16BE(ranges + i * 2);
      if (!range) return (code + delta) & 0xffff;
      const g = c.readUInt16BE(ranges + i * 2 + range + (code - start) * 2);
      return g ? (g + delta) & 0xffff : 0;
    }
    return 0;
  };

  const advance = (g) => {
    const metrics = t.hhea.readUInt16BE(34);
    return t.hmtx.readUInt16BE(Math.min(g, metrics - 1) * 4);
  };

  /** Contours of points { x, y, on }, composites resolved. */
  const contours = (g) => {
    const start = loca(g);
    if (loca(g + 1) === start) return [];
    const d = t.glyf.subarray(start);
    const count = d.readInt16BE(0);
    if (count < 0) {
      const out = [];
      let o = 10;
      for (let more = true; more;) {
        const flags = d.readUInt16BE(o);
        const part = d.readUInt16BE(o + 2);
        o += 4;
        if (!(flags & 0x2)) throw new Error('Point-matched composite glyphs are not supported');
        const words = flags & 0x1;
        const dx = words ? d.readInt16BE(o) : d.readInt8(o);
        const dy = words ? d.readInt16BE(o + 2) : d.readInt8(o + 1);
        o += words ? 4 : 2;
        let [a, b, c, e] = [1, 0, 0, 1];
        const f2 = (at) => d.readInt16BE(at) / 16384;
        if (flags & 0x8) [a, e, o] = [f2(o), f2(o), o + 2];
        else if (flags & 0x40) [a, e, o] = [f2(o), f2(o + 2), o + 4];
        else if (flags & 0x80) [a, b, c, e, o] = [f2(o), f2(o + 2), f2(o + 4), f2(o + 6), o + 8];
        for (const contour of contours(part)) {
          out.push(
            contour.map((p) => ({
              x: a * p.x + c * p.y + dx,
              y: b * p.x + e * p.y + dy,
              on: p.on,
            })),
          );
        }
        more = !!(flags & 0x20);
      }
      return out;
    }
    const ends = Array.from({ length: count }, (_, i) => d.readUInt16BE(10 + i * 2));
    const n = ends[count - 1] + 1;
    let o = 10 + count * 2;
    o += 2 + d.readUInt16BE(o);
    const flags = [];
    while (flags.length < n) {
      const f = d[o++];
      flags.push(f);
      if (f & 0x8) for (let r = d[o++]; r > 0; r--) flags.push(f);
    }
    const coords = (short, same) => {
      let v = 0;
      return flags.map((f) => {
        if (f & short) v += f & same ? d[o++] : -d[o++];
        else if (!(f & same)) [v, o] = [v + d.readInt16BE(o), o + 2];
        return v;
      });
    };
    const xs = coords(0x2, 0x10);
    const ys = coords(0x4, 0x20);
    const points = xs.map((x, i) => ({ x, y: ys[i], on: !!(flags[i] & 1) }));
    return ends.map((end, i) => points.slice(i ? ends[i - 1] + 1 : 0, end + 1));
  };

  return { unitsPerEm: t.head.readUInt16BE(18), glyphOf, advance, contours };
}

/** An SVG path for TrueType contours, y pointing down, scaled and moved to (x, y). */
function pathOf(contours, scale, x, y) {
  const fmt = (p) => `${(x + p.x * scale).toFixed(2)} ${(y - p.y * scale).toFixed(2)}`;
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: true });
  return contours
    .map((pts) => {
      const first = pts.findIndex((p) => p.on);
      const ring =
        first < 0
          ? [mid(pts[0], pts[1]), ...pts.slice(1), pts[0]]
          : [...pts.slice(first), ...pts.slice(0, first)];
      let d = `M${fmt(ring[0])}`;
      for (let i = 1; i <= ring.length; i++) {
        const p = ring[i % ring.length];
        if (p.on) {
          d += `L${fmt(p)}`;
          continue;
        }
        const next = ring[(i + 1) % ring.length];
        const end = next.on ? next : mid(p, next);
        d += `Q${fmt(p)} ${fmt(end)}`;
        if (next.on) i++;
      }
      return `${d}Z`;
    })
    .join('');
}

/** "Rú" as two paths, its ink centred on (0, 0), `height` tall. */
function lettering(font, height) {
  const glyphs = [
    { g: font.glyphOf('R'.codePointAt(0)), fill: INK },
    { g: font.glyphOf('ú'.codePointAt(0)), fill: RED },
  ];
  if (glyphs.some((l) => !l.g)) throw new Error('The font lacks R or ú');
  // Tracking as on the card: -0.01em.
  const track = -0.01 * font.unitsPerEm;
  let pen = 0;
  for (const l of glyphs) {
    l.contours = font.contours(l.g).map((c) => c.map((p) => ({ ...p, x: p.x + pen })));
    pen += font.advance(l.g) + track;
  }
  const all = glyphs.flatMap((l) => l.contours.flat());
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y));
  const scale = height / (maxY - minY);
  const x = (-(minX + maxX) / 2) * scale;
  const y = ((minY + maxY) / 2) * scale;
  return glyphs
    .map((l) => `<path fill="${l.fill}" d="${pathOf(l.contours, scale, x, y)}"/>`)
    .join('');
}

/** The icon in a 512 × 512 box; `scale` shrinks the cards about the centre. */
function iconSvg(text, { scale = 1, rounded = false } = {}) {
  const w = 372;
  const h = (w * 3) / 7;
  const rule = -h / 2 + h * 0.215;
  const card = (fill, ruleColour, inner = '') =>
    `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="10" fill="${fill}"/>` +
    `<rect x="${-w / 2}" y="${rule - 3}" width="${w}" height="6" fill="${ruleColour}"/>` +
    inner;
  const textCentre = (rule + 3 + h / 2) / 2;
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
    `<rect width="512" height="512" ${rounded ? 'rx="112" ' : ''}fill="${INK}"/>`,
    `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">`,
    `<g transform="translate(270 220) rotate(6)">${card(BACK_PAPER, BLUE)}</g>`,
    `<g transform="translate(244 286) rotate(-4)">`,
    card(PAPER, RED, `<g transform="translate(0 ${textCentre.toFixed(2)})">${text}</g>`),
    '</g></g></svg>',
  ].join('');
}

const font = openFont(readFileSync(FONT));
const text = lettering(font, 92);

const favicon = iconSvg(text, { scale: 1.14, rounded: true });
writeFileSync(new URL('favicon.svg', OUT), `${favicon}\n`);
console.log('Wrote favicon.svg');

const modulePath = process.env.PLAYWRIGHT_MODULE;
if (!modulePath) {
  console.error(
    'Set PLAYWRIGHT_MODULE to a Playwright package folder (e.g. another project’s node_modules/playwright) to render the PNGs.',
  );
  process.exit(1);
}
const { chromium } = createRequire(import.meta.url)(modulePath);

const icons = [
  ['icon-192.png', 192, iconSvg(text)],
  ['icon-512.png', 512, iconSvg(text)],
  // Android crops maskable icons, at most to a circle 80% wide; the cards stay inside 78%.
  ['icon-maskable-512.png', 512, iconSvg(text, { scale: 0.78 })],
  ['apple-touch-icon.png', 180, iconSvg(text)],
  ['favicon-32.png', 32, favicon],
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [name, size, svg] of icons) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    );
    await page.screenshot({
      path: new URL(name, OUT).pathname,
      omitBackground: name === 'favicon-32.png',
    });
    console.log(`Wrote ${name}`);
  }
} finally {
  await browser.close();
}
