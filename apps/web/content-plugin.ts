import { readFileSync } from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import type { Plugin } from 'vite';
import { parseCsvRecords } from '../../packages/core/src/csv.ts';
import type {
  GrammarCard,
  GrammarTopic,
  Language,
  Lesson,
  LevelContent,
  Side,
  WordCard,
} from '../../packages/core/src/types.ts';

const VIRTUAL_ID = 'virtual:rusky/content';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

const SIDES: Side[] = ['target', 'native'];

function fail(file: string, message: string): never {
  throw new Error(`Content error in ${file}: ${message}`);
}

function readCsv(file: string, watch: (f: string) => void) {
  watch(file);
  return parseCsvRecords(readFileSync(file, 'utf8'));
}

/** Marks stressed vowels and lets wide tables scroll on a phone. */
function decorate(html: string): string {
  return html
    .replace(/([аеиоуыэюяАЕИОУЫЭЮЯ])\u0301/g, '<span class="stress">$1\u0301</span>')
    .replace(/[ёЁ]/g, '<span class="stress">$&</span>')
    .replaceAll('<table>', '<div class="table-wrap"><table>')
    .replaceAll('</table>', '</table></div>');
}

function loadLevel(dir: string, language: string, level: string, watch: (f: string) => void) {
  const file = (name: string) => path.join(dir, name);
  const ids = new Set<string>();
  const unique = (id: string, where: string) => {
    if (!id) fail(where, 'a row has no id');
    if (ids.has(id)) fail(where, `id ${id} is used twice`);
    ids.add(id);
  };

  const words: WordCard[] = readCsv(file('words.csv'), watch).map((r) => {
    unique(r.id, 'words.csv');
    const lesson = Number(r.lesson);
    if (!Number.isInteger(lesson)) fail('words.csv', `${r.id} has no lesson`);
    if (!r.target || !r.native) fail('words.csv', `${r.id} is missing a side`);
    return {
      kind: 'word',
      id: r.id,
      lesson,
      category: r.category,
      target: r.target,
      native: r.native,
      english: r.english,
      note: r.note,
    };
  });

  const grammarCards: GrammarCard[] = readCsv(file('grammar-cards.csv'), watch).map((r) => {
    unique(r.id, 'grammar-cards.csv');
    const promptSide = r.prompt_side as Side;
    const answerSide = r.answer_side as Side;
    if (!SIDES.includes(promptSide) || !SIDES.includes(answerSide)) {
      fail('grammar-cards.csv', `${r.id} needs prompt_side and answer_side of target or native`);
    }
    return {
      kind: 'grammar',
      id: r.id,
      topic: Number(r.topic),
      label: r.label,
      prompt: r.prompt,
      promptSide,
      answer: r.answer,
      answerSide,
      note: r.note,
    };
  });

  const lessons: Lesson[] = readCsv(file('lessons.csv'), watch).map((r) => ({
    number: Number(r.number),
    title: r.title,
    wordCount: words.filter((w) => w.lesson === Number(r.number)).length,
  }));
  for (const w of words) {
    if (!lessons.some((l) => l.number === w.lesson)) {
      fail('lessons.csv', `lesson ${w.lesson} (used by ${w.id}) has no title`);
    }
  }

  const topicMeta = new Map(readCsv(file('topics.csv'), watch).map((r) => [Number(r.number), r]));
  watch(file('grammar.md'));
  const md = readFileSync(file('grammar.md'), 'utf8').replace(/^---[\s\S]*?\n---\n/, '');
  const topics: GrammarTopic[] = md
    .split(/^## /m)
    .slice(1)
    .map((part) => {
      const nl = part.indexOf('\n');
      const heading = /^(\d+)\.\s+(.+)$/.exec(part.slice(0, nl).trim());
      if (!heading) fail('grammar.md', `"## ${part.slice(0, nl)}" must look like "## 5. Title"`);
      const number = Number(heading[1]);
      const meta = topicMeta.get(number);
      if (!meta) fail('topics.csv', `topic ${number} has no slug`);
      return {
        number,
        slug: meta.slug,
        title: heading[2],
        summary: meta.summary,
        html: decorate(marked.parse(part.slice(nl + 1), { async: false, gfm: true })),
        cardCount: grammarCards.filter((c) => c.topic === number).length,
      };
    });
  for (const c of grammarCards) {
    if (!topics.some((t) => t.number === c.topic)) {
      fail('grammar-cards.csv', `${c.id} points at topic ${c.topic}, which grammar.md lacks`);
    }
  }

  return { language, level, lessons, words, topics, grammarCards } satisfies LevelContent;
}

function loadContent(root: string, watch: (f: string) => void) {
  const manifest = path.join(root, 'languages.json');
  watch(manifest);
  const languages = JSON.parse(readFileSync(manifest, 'utf8')) as Language[];
  const levels: Record<string, LevelContent> = {};
  for (const lang of languages) {
    for (const level of lang.levels) {
      levels[`${lang.code}/${level}`] = loadLevel(
        path.join(root, lang.code, level),
        lang.code,
        level,
        watch,
      );
    }
  }
  return { languages, levels };
}

/** Serves the repo's content folder as `virtual:rusky/content`, rebuilt when a file changes. */
export function ruskyContent(root: string): Plugin {
  return {
    name: 'rusky-content',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      const { languages, levels } = loadContent(root, (f) => this.addWatchFile(f));
      return `export const languages = ${JSON.stringify(languages)};\nexport const levels = ${JSON.stringify(levels)};\n`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(root)) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}
