// Draws the app icons (two index cards on ink, the front one with its red rule and a
// word whose stressed vowel is red) and writes them as PNGs into apps/web/static.
// Usage: yarn icons
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../apps/web/static/', import.meta.url);

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const INK = hex('#161b26');
const PAPER = hex('#ffffff');
const BACK = hex('#5b6372');
const RED = hex('#d6334a');
const TEXT = hex('#161b26');

/** A rounded rectangle rotated about its centre, in unit coordinates. */
const rect = (cx, cy, w, h, deg, r) => {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const lx = Math.abs(dx * cos + dy * sin);
    const ly = Math.abs(-dx * sin + dy * cos);
    if (lx > w / 2 || ly > h / 2) return false;
    const ex = lx - (w / 2 - r);
    const ey = ly - (h / 2 - r);
    return ex <= 0 || ey <= 0 || ex * ex + ey * ey <= r * r;
  };
};

const local = (cx, cy, deg) => {
  const a = (deg * Math.PI) / 180;
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    return [dx * Math.cos(a) + dy * Math.sin(a), -dx * Math.sin(a) + dy * Math.cos(a)];
  };
};

function scene(scale) {
  const s = (v) => 0.5 + (v - 0.5) * scale;
  const w = 0.7 * scale;
  const h = (w * 3) / 7;
  const back = rect(s(0.53), s(0.43), w, h, 7, 0.02 * scale);
  const front = rect(s(0.49), s(0.55), w, h, -5, 0.02 * scale);
  const toFront = local(s(0.49), s(0.55), -5);
  return (x, y) => {
    if (front(x, y)) {
      const [lx, ly] = toFront(x, y);
      const ruleY = -h / 2 + h * 0.22;
      if (Math.abs(ly - ruleY) < 0.011 * scale) return RED;
      const barY = h * 0.12;
      if (Math.abs(ly - barY) < 0.03 * scale) {
        if (lx > -0.2 * scale && lx < -0.07 * scale) return TEXT;
        if (lx > -0.045 * scale && lx < 0.025 * scale) return RED;
        if (lx > 0.05 * scale && lx < 0.2 * scale) return TEXT;
      }
      return PAPER;
    }
    if (back(x, y)) return BACK;
    return INK;
  };
}

function render(size, scale) {
  const paint = scene(scale);
  const n = 4;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < n; sy++) {
        for (let sx = 0; sx < n; sx++) {
          const c = paint((x + (sx + 0.5) / n) / size, (y + (sy + 0.5) / n) / size);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r / (n * n));
      rgba[i + 1] = Math.round(g / (n * n));
      rgba[i + 2] = Math.round(b / (n * n));
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, k) => {
  let c = k;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function png(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const icons = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  // Maskable icons are cropped to a circle on Android; keep the cards in its safe zone.
  ['icon-maskable-512.png', 512, 0.78],
  ['apple-touch-icon.png', 180, 1],
  ['favicon-32.png', 32, 1.1],
];

for (const [name, size, scale] of icons) {
  writeFileSync(new URL(name, OUT), png(size, render(size, scale)));
  console.log(`Wrote ${name}`);
}
