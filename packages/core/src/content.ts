import { parseCsvRecords } from './csv';
import type {
  GrammarCard,
  GrammarTopicSource,
  LevelContent,
  LevelSources,
  Side,
  WordCard,
} from './types';

const SIDES: Side[] = ['target', 'native'];

export class ContentError extends Error {}

function fail(file: string, message: string): never {
  throw new ContentError(`Content error in ${file}: ${message}`);
}

/** The raw text of one level's content files. */
export type LevelFiles = {
  words: string;
  lessons: string;
  topics: string;
  grammar: string;
  grammarCards: string;
};

/** Reads one level's files and checks them: unique ids, known lessons and topics, valid sides. */
export function parseLevelFiles(files: LevelFiles, language: string, level: string): LevelSources {
  const ids = new Set<string>();
  const unique = (id: string, where: string) => {
    if (!id) fail(where, 'a row has no id');
    if (ids.has(id)) fail(where, `id ${id} is used twice`);
    ids.add(id);
  };

  const words: WordCard[] = parseCsvRecords(files.words).map((r) => {
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

  const grammarCards: GrammarCard[] = parseCsvRecords(files.grammarCards).map((r) => {
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

  const lessons = parseCsvRecords(files.lessons).map((r) => ({
    number: Number(r.number),
    title: r.title,
  }));
  for (const w of words) {
    if (!lessons.some((l) => l.number === w.lesson)) {
      fail('lessons.csv', `lesson ${w.lesson} (used by ${w.id}) has no title`);
    }
  }

  const meta = new Map(parseCsvRecords(files.topics).map((r) => [Number(r.number), r]));
  const topics: GrammarTopicSource[] = splitGrammarNotes(files.grammar).map((t) => {
    const m = meta.get(t.number);
    if (!m) fail('topics.csv', `topic ${t.number} has no slug`);
    return { ...t, slug: m.slug, summary: m.summary };
  });
  for (const c of grammarCards) {
    if (!topics.some((t) => t.number === c.topic)) {
      fail('grammar-cards.csv', `${c.id} points at topic ${c.topic}, which grammar.md lacks`);
    }
  }

  return { language, level, lessons, words, topics, grammarCards };
}

/** One `## N. Title` section of the grammar notes per topic, front matter dropped. */
export function splitGrammarNotes(md: string): Omit<GrammarTopicSource, 'slug' | 'summary'>[] {
  return md
    .replace(/^---[\s\S]*?\n---\n/, '')
    .split(/^## /m)
    .slice(1)
    .map((part) => {
      const nl = part.indexOf('\n');
      const heading = /^(\d+)\.\s+(.+)$/.exec(part.slice(0, nl).trim());
      if (!heading) fail('grammar.md', `"## ${part.slice(0, nl)}" must look like "## 5. Title"`);
      return { number: Number(heading[1]), title: heading[2], markdown: part.slice(nl + 1).trim() };
    });
}

/** Marks stressed vowels in rendered grammar notes and lets wide tables scroll on a phone. */
export function decorateGrammarHtml(html: string): string {
  return html
    .replace(/([аеиоуыэюяАЕИОУЫЭЮЯ])\u0301/g, '<span class="stress">$1\u0301</span>')
    .replace(/[ёЁ]/g, '<span class="stress">$&</span>')
    .replaceAll('<table>', '<div class="table-wrap"><table>')
    .replaceAll('</table>', '</table></div>');
}

/** The level as the app shows it: grammar notes rendered, counts filled in. */
export function buildLevel(
  sources: LevelSources,
  renderMarkdown: (md: string) => string,
): LevelContent {
  return {
    language: sources.language,
    level: sources.level,
    lessons: sources.lessons.map((l) => ({
      ...l,
      wordCount: sources.words.filter((w) => w.lesson === l.number).length,
    })),
    words: sources.words,
    topics: sources.topics.map((t) => ({
      number: t.number,
      slug: t.slug,
      title: t.title,
      summary: t.summary,
      html: decorateGrammarHtml(renderMarkdown(t.markdown)),
      cardCount: sources.grammarCards.filter((c) => c.topic === t.number).length,
    })),
    grammarCards: sources.grammarCards,
  };
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/** Card ids: `ru-a1-w-170` for words, `ru-a1-g-05-31` for grammar cards. Never reused. */
export function wordId(language: string, level: string, n: number): string {
  return `${language}-${level}-w-${String(n).padStart(3, '0')}`;
}

export function grammarCardId(language: string, level: string, topic: number, n: number): string {
  return `${language}-${level}-g-${String(topic).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
}

/** The number at the end of an id, or 0 for an id not in that shape. */
export function idNumber(id: string): number {
  const n = Number(/-(\d+)$/.exec(id)?.[1]);
  return Number.isInteger(n) ? n : 0;
}
