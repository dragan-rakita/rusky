import { eq } from 'drizzle-orm';
import { addDays, isDue, MAX_BOX, replay, type ReviewEvent } from '@rusky/core';
import { db } from '../db';
import { review } from '../db/schema';
import { levelSources, type Scope } from './store';

const STRUGGLING_DAYS = 30;
const STRUGGLING_LIMIT = 15;

function reviewsOf(userId: string): ReviewEvent[] {
  return db
    .select({
      id: review.id,
      cardId: review.cardId,
      grade: review.grade,
      reviewedAt: review.reviewedAt,
      firstSide: review.firstSide,
    })
    .from(review)
    .where(eq(review.userId, userId))
    .all();
}

/**
 * One document for a tutor: what the level holds (lessons, grammar topics) and how the
 * learner is doing with it — boxes, what is due, and the cards they keep missing.
 */
export function levelOverview(s: Scope, today: string) {
  const src = levelSources(s);
  const events = reviewsOf(s.userId);
  const states = replay(events);
  const cards = [...src.words, ...src.grammarCards];
  const ids = new Set(cards.map((c) => c.id));

  const boxes = Array<number>(MAX_BOX).fill(0);
  let notStarted = 0;
  let due = 0;
  for (const c of cards) {
    const st = states.get(c.id);
    if (!st?.reviews) notStarted++;
    else boxes[st.box - 1]++;
    if (isDue(st, today)) due++;
  }

  const since = new Date(`${addDays(today, -STRUGGLING_DAYS)}T00:00:00`).getTime();
  const misses = new Map<string, number>();
  for (const e of events) {
    if (e.grade === 'again' && e.reviewedAt >= since && ids.has(e.cardId)) {
      misses.set(e.cardId, (misses.get(e.cardId) ?? 0) + 1);
    }
  }
  const byId = new Map(cards.map((c) => [c.id, c]));
  const struggling = [...misses.entries()]
    .sort((a, b) => b[1] - a[1] || (states.get(a[0])?.box ?? 1) - (states.get(b[0])?.box ?? 1))
    .slice(0, STRUGGLING_LIMIT)
    .map(([id, missed]) => {
      const c = byId.get(id)!;
      return c.kind === 'word'
        ? { id, kind: 'word', target: c.target, native: c.native, lesson: c.lesson, missed, box: states.get(id)?.box }
        : { id, kind: 'grammar', prompt: c.prompt, answer: c.answer, topic: c.topic, missed, box: states.get(id)?.box };
    });

  const week = new Date(`${addDays(today, -6)}T00:00:00`).getTime();
  const lastWeek = events.filter((e) => e.reviewedAt >= week && ids.has(e.cardId));

  return {
    language: s.language,
    level: s.level,
    today,
    lessons: src.lessons.map((l) => ({
      ...l,
      words: src.words.filter((w) => w.lesson === l.number).length,
    })),
    grammarTopics: src.topics.map((t) => ({
      number: t.number,
      slug: t.slug,
      title: t.title,
      summary: t.summary,
      cards: src.grammarCards.filter((c) => c.topic === t.number).length,
    })),
    totals: { words: src.words.length, grammarCards: src.grammarCards.length },
    progress: {
      boxes: Object.fromEntries(boxes.map((n, i) => [`box${i + 1}`, n])),
      notStarted,
      dueToday: due,
      reviewsLast7Days: lastWeek.length,
      daysPractisedLast7: new Set(lastWeek.map((e) => new Date(e.reviewedAt).toDateString())).size,
      struggling,
    },
  };
}
