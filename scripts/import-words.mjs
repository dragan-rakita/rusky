// Turns the words spreadsheet exported from the tutor sessions into the content CSV.
// Usage: yarn content:import <words.xlsx> [content/ru/a1/words.csv] [ru-a1-w]
// The "#" column becomes the card id, so a number must never be reused for another word:
// progress is stored against it.
import { readFileSync, writeFileSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';

const [, , input, output = 'content/ru/a1/words.csv', prefix = 'ru-a1-w'] = process.argv;
if (!input) {
  console.error('Usage: yarn content:import <words.xlsx> [output.csv] [id-prefix]');
  process.exit(1);
}

const files = unzipSync(readFileSync(input));
const xml = (name) => (files[name] ? strFromU8(files[name]) : '');

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');

const texts = (fragment) =>
  [...fragment.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join('');

const shared = [...xml('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
  texts(m[1]),
);

const columnIndex = (ref) => {
  const letters = ref.replace(/\d+/g, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

const rows = [];
for (const row of xml('xl/worksheets/sheet1.xml').matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
  const cells = [];
  for (const cell of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = cell[1];
    const body = cell[2] ?? '';
    const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
    const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
    const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
    let text = '';
    if (type === 's' && value !== undefined) text = shared[Number(value)] ?? '';
    else if (type === 'inlineStr') text = texts(body);
    else if (value !== undefined) text = decode(value);
    cells[ref ? columnIndex(ref) : cells.length] = text.trim();
  }
  rows.push(cells);
}

const [header, ...data] = rows;
const col = (name) => {
  const i = header.findIndex((h) => h?.toLowerCase() === name.toLowerCase());
  if (i < 0) throw new Error(`Column "${name}" is missing from ${input}`);
  return i;
};
const c = {
  num: col('#'),
  target: col('Russian'),
  native: col('Serbian'),
  english: col('English'),
  category: col('Category'),
  lesson: col('Lesson'),
  note: col('Note'),
};

const field = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

const seen = new Set();
const lines = ['id,lesson,category,target,native,english,note'];
for (const r of data) {
  if (!r[c.target]) continue;
  const n = Number(r[c.num]);
  if (!Number.isInteger(n) || n < 1) throw new Error(`Row "${r[c.target]}" has no number in #`);
  if (seen.has(n)) throw new Error(`Number ${n} is used twice`);
  seen.add(n);
  const id = `${prefix}-${String(n).padStart(3, '0')}`;
  lines.push(
    [id, r[c.lesson], r[c.category], r[c.target], r[c.native], r[c.english], r[c.note]]
      .map(field)
      .join(','),
  );
}

writeFileSync(output, lines.join('\n') + '\n');
console.log(`Wrote ${lines.length - 1} words to ${output}`);
