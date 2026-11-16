import { and, asc, eq, sql } from 'drizzle-orm';
import { marked } from 'marked';
import {
  buildLevel,
  grammarCardId,
  idNumber,
  plainText,
  slugify,
  wordId,
  type GrammarCard,
  type LevelContent,
  type LevelSources,
  type Side,
  type WordCard,
} from '@rusky/core';
import { db } from '../db';
import { contentState, grammarCard, grammarTopic, lesson, word } from '../db/schema';
import { seedSources } from './files';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type Scope = { userId: string; language: string; level: string };

export class ContentProblem extends Error {}

const render = (md: string) => marked.parse(md, { async: false, gfm: true });

const inLevel = <T extends typeof word | typeof grammarCard | typeof lesson | typeof grammarTopic>(
  table: T,
  s: Scope,
) => and(eq(table.userId, s.userId), eq(table.language, s.language), eq(table.level, s.level));

function insertSources(tx: Tx, userId: string, src: LevelSources) {
  const base = { userId, language: src.language, level: src.level };
  for (const l of src.lessons) {
    tx.insert(lesson).values({ ...base, ...l }).onConflictDoNothing().run();
  }
  for (const w of src.words) {
    tx.insert(word)
      .values({
        ...base,
        id: w.id,
        lesson: w.lesson,
        category: w.category,
        target: w.target,
        native: w.native,
        english: w.english,
        note: w.note,
      })
      .onConflictDoNothing()
      .run();
  }
  for (const t of src.topics) {
    tx.insert(grammarTopic).values({ ...base, ...t }).onConflictDoNothing().run();
  }
  for (const c of src.grammarCards) {
    tx.insert(grammarCard)
      .values({
        ...base,
        id: c.id,
        topic: c.topic,
        label: c.label,
        prompt: c.prompt,
        promptSide: c.promptSide,
        answer: c.answer,
        answerSide: c.answerSide,
        note: c.note,
      })
      .onConflictDoNothing()
      .run();
  }
}

/**
 * The account's content version, copying the repo's content in the first time an
 * account is used. Synchronous end to end, so two first requests cannot both seed.
 */
export function ensureContent(userId: string): number {
  const row = db.select().from(contentState).where(eq(contentState.userId, userId)).get();
  if (row) return row.version;
  const sources = seedSources();
  db.transaction((tx) => {
    for (const src of sources) insertSources(tx, userId, src);
    tx.insert(contentState).values({ userId, version: 1 }).onConflictDoNothing().run();
  });
  return 1;
}

function bump(tx: Tx, userId: string): number {
  const row = tx
    .update(contentState)
    .set({ version: sql`${contentState.version} + 1` })
    .where(eq(contentState.userId, userId))
    .returning({ version: contentState.version })
    .get();
  return row?.version ?? 1;
}

/** Runs a change and bumps the version in one transaction, so a device never sees half of it. */
function change<T>(userId: string, fn: (tx: Tx) => T): T {
  ensureContent(userId);
  return db.transaction((tx) => {
    const result = fn(tx);
    bump(tx, userId);
    return result;
  });
}

const toWord = (r: typeof word.$inferSelect): WordCard => ({
  kind: 'word',
  id: r.id,
  lesson: r.lesson,
  category: r.category,
  target: r.target,
  native: r.native,
  english: r.english,
  note: r.note,
});

const toGrammarCard = (r: typeof grammarCard.$inferSelect): GrammarCard => ({
  kind: 'grammar',
  id: r.id,
  topic: r.topic,
  label: r.label,
  prompt: r.prompt,
  promptSide: r.promptSide,
  answer: r.answer,
  answerSide: r.answerSide,
  note: r.note,
});

export function levelSources(s: Scope): LevelSources {
  ensureContent(s.userId);
  return {
    language: s.language,
    level: s.level,
    lessons: db
      .select({ number: lesson.number, title: lesson.title })
      .from(lesson)
      .where(inLevel(lesson, s))
      .orderBy(asc(lesson.number))
      .all(),
    words: db
      .select()
      .from(word)
      .where(inLevel(word, s))
      .orderBy(asc(word.lesson), asc(word.id))
      .all()
      .map(toWord),
    topics: db
      .select({
        number: grammarTopic.number,
        slug: grammarTopic.slug,
        title: grammarTopic.title,
        summary: grammarTopic.summary,
        markdown: grammarTopic.markdown,
      })
      .from(grammarTopic)
      .where(inLevel(grammarTopic, s))
      .orderBy(asc(grammarTopic.number))
      .all(),
    grammarCards: db
      .select()
      .from(grammarCard)
      .where(inLevel(grammarCard, s))
      .orderBy(asc(grammarCard.topic), asc(grammarCard.id))
      .all()
      .map(toGrammarCard),
  };
}

/** Every level the account has, rendered as the app shows it. */
export function loadAllLevels(userId: string): { version: number; levels: Record<string, LevelContent> } {
  const version = ensureContent(userId);
  const pairs = db
    .selectDistinct({ language: lesson.language, level: lesson.level })
    .from(lesson)
    .where(eq(lesson.userId, userId))
    .all();
  const levels: Record<string, LevelContent> = {};
  for (const p of pairs) {
    levels[`${p.language}/${p.level}`] = buildLevel(levelSources({ userId, ...p }), render);
  }
  return { version, levels };
}

// ─── Words ───

export type NewWord = {
  target: string;
  native: string;
  english?: string;
  category?: string;
  note?: string;
};

export function addWords(s: Scope, lessonNumber: number, lessonTitle: string | undefined, items: NewWord[]) {
  return change(s.userId, (tx) => {
    const existingLesson = tx
      .select()
      .from(lesson)
      .where(and(inLevel(lesson, s), eq(lesson.number, lessonNumber)))
      .get();
    if (!existingLesson) {
      if (!lessonTitle) {
        throw new ContentProblem(
          `Lesson ${lessonNumber} does not exist yet; pass lessonTitle to create it.`,
        );
      }
      tx.insert(lesson).values({ ...s, number: lessonNumber, title: lessonTitle }).run();
    } else if (lessonTitle && lessonTitle !== existingLesson.title) {
      tx.update(lesson)
        .set({ title: lessonTitle })
        .where(and(inLevel(lesson, s), eq(lesson.number, lessonNumber)))
        .run();
    }

    const current = tx.select().from(word).where(inLevel(word, s)).all();
    const byText = new Map(current.map((w) => [plainText(w.target), w]));
    let next = Math.max(0, ...current.map((w) => idNumber(w.id))) + 1;

    const added: { id: string; target: string }[] = [];
    const skipped: { target: string; existingId: string; lesson: number }[] = [];
    for (const item of items) {
      const key = plainText(item.target.trim());
      const dup = byText.get(key);
      if (dup) {
        skipped.push({ target: item.target, existingId: dup.id, lesson: dup.lesson });
        continue;
      }
      const row = {
        ...s,
        id: wordId(s.language, s.level, next++),
        lesson: lessonNumber,
        category: item.category?.trim() ?? '',
        target: item.target.trim(),
        native: item.native.trim(),
        english: item.english?.trim() ?? '',
        note: item.note?.trim() ?? '',
      };
      tx.insert(word).values(row).run();
      byText.set(key, { ...row, createdAt: new Date(), updatedAt: new Date() });
      added.push({ id: row.id, target: row.target });
    }
    return { lesson: lessonNumber, added, skipped };
  });
}

export function updateWord(s: Scope, id: string, patch: Partial<NewWord> & { lesson?: number }) {
  return change(s.userId, (tx) => {
    const found = tx.select().from(word).where(and(inLevel(word, s), eq(word.id, id))).get();
    if (!found) throw new ContentProblem(`No word with id ${id}.`);
    if (patch.lesson !== undefined) {
      const exists = tx
        .select()
        .from(lesson)
        .where(and(inLevel(lesson, s), eq(lesson.number, patch.lesson)))
        .get();
      if (!exists) throw new ContentProblem(`Lesson ${patch.lesson} does not exist.`);
    }
    const set = Object.fromEntries(
      Object.entries(patch)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
    );
    const updated = tx
      .update(word)
      .set(set)
      .where(and(inLevel(word, s), eq(word.id, id)))
      .returning()
      .get();
    return toWord(updated!);
  });
}

export function removeWord(s: Scope, id: string) {
  return change(s.userId, (tx) => {
    const removed = tx
      .delete(word)
      .where(and(inLevel(word, s), eq(word.id, id)))
      .returning()
      .get();
    if (!removed) throw new ContentProblem(`No word with id ${id}.`);
    return toWord(removed);
  });
}

export function setLessonTitle(s: Scope, number: number, title: string) {
  return change(s.userId, (tx) => {
    tx.insert(lesson)
      .values({ ...s, number, title })
      .onConflictDoUpdate({
        target: [lesson.userId, lesson.language, lesson.level, lesson.number],
        set: { title },
      })
      .run();
    return { number, title };
  });
}

// ─── Grammar ───

export function saveTopic(
  s: Scope,
  t: { number: number; title: string; summary?: string; markdown: string; slug?: string },
) {
  return change(s.userId, (tx) => {
    const existing = tx
      .select()
      .from(grammarTopic)
      .where(and(inLevel(grammarTopic, s), eq(grammarTopic.number, t.number)))
      .get();
    const slug = t.slug?.trim() || existing?.slug || slugify(t.title);
    const clash = tx
      .select()
      .from(grammarTopic)
      .where(and(inLevel(grammarTopic, s), eq(grammarTopic.slug, slug)))
      .get();
    if (clash && clash.number !== t.number) {
      throw new ContentProblem(`Topic ${clash.number} already uses the slug "${slug}".`);
    }
    const row = {
      ...s,
      number: t.number,
      slug,
      title: t.title.trim(),
      summary: t.summary?.trim() ?? existing?.summary ?? '',
      markdown: t.markdown.trim(),
    };
    tx.insert(grammarTopic)
      .values(row)
      .onConflictDoUpdate({
        target: [grammarTopic.userId, grammarTopic.language, grammarTopic.level, grammarTopic.number],
        set: { slug: row.slug, title: row.title, summary: row.summary, markdown: row.markdown },
      })
      .run();
    return { number: row.number, slug: row.slug, title: row.title, created: !existing };
  });
}

export type NewGrammarCard = {
  label: string;
  prompt: string;
  promptSide: Side;
  answer: string;
  answerSide: Side;
  note?: string;
};

export function addGrammarCards(s: Scope, topic: number, cards: NewGrammarCard[]) {
  return change(s.userId, (tx) => {
    const t = tx
      .select()
      .from(grammarTopic)
      .where(and(inLevel(grammarTopic, s), eq(grammarTopic.number, topic)))
      .get();
    if (!t) throw new ContentProblem(`Topic ${topic} does not exist; save its notes first.`);
    const current = tx
      .select()
      .from(grammarCard)
      .where(and(inLevel(grammarCard, s), eq(grammarCard.topic, topic)))
      .all();
    let next = Math.max(0, ...current.map((c) => idNumber(c.id))) + 1;
    const added = cards.map((c) => {
      const id = grammarCardId(s.language, s.level, topic, next++);
      tx.insert(grammarCard)
        .values({
          ...s,
          id,
          topic,
          label: c.label.trim().toUpperCase(),
          prompt: c.prompt.trim(),
          promptSide: c.promptSide,
          answer: c.answer.trim(),
          answerSide: c.answerSide,
          note: c.note?.trim() ?? '',
        })
        .run();
      return { id, prompt: c.prompt, answer: c.answer };
    });
    return { topic, added };
  });
}

export function updateGrammarCard(s: Scope, id: string, patch: Partial<NewGrammarCard>) {
  return change(s.userId, (tx) => {
    const set = Object.fromEntries(
      Object.entries(patch)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, k === 'label' ? String(v).trim().toUpperCase() : String(v).trim()]),
    );
    const updated = tx
      .update(grammarCard)
      .set(set)
      .where(and(inLevel(grammarCard, s), eq(grammarCard.id, id)))
      .returning()
      .get();
    if (!updated) throw new ContentProblem(`No grammar card with id ${id}.`);
    return toGrammarCard(updated);
  });
}

export function removeGrammarCard(s: Scope, id: string) {
  return change(s.userId, (tx) => {
    const removed = tx
      .delete(grammarCard)
      .where(and(inLevel(grammarCard, s), eq(grammarCard.id, id)))
      .returning()
      .get();
    if (!removed) throw new ContentProblem(`No grammar card with id ${id}.`);
    return toGrammarCard(removed);
  });
}
