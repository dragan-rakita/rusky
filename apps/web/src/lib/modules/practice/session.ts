import {
  buildStack,
  planReview,
  shuffle,
  type Card,
  type CardState,
  type LevelContent,
} from '@rusky/core';
import { DECKS, DEFAULT_SESSION_SIZE, SIDE_CHOICES, TRAP_SLUGS } from './constants';

const numbers = (raw: string | null) =>
  (raw ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

export function parseSessionParams(url: URL): SessionParams {
  const q = url.searchParams;
  const deck = q.get('deck');
  const side = q.get('side');
  const size = q.get('size');
  return {
    mode: q.get('mode') === 'custom' ? 'custom' : 'review',
    deck: DECKS.some((d) => d.value === deck) ? (deck as PracticeDeck) : 'words',
    lessons: numbers(q.get('lessons')),
    topics: numbers(q.get('topics')),
    firstSide: SIDE_CHOICES.includes(side as FirstSideChoice) ? (side as FirstSideChoice) : null,
    size: size === 'all' ? 'all' : Number(size) > 0 ? Number(size) : DEFAULT_SESSION_SIZE,
  };
}

export function sessionUrl(p: Partial<SessionParams>): string {
  const q = new URLSearchParams({ mode: p.mode ?? 'custom' });
  if (p.deck) q.set('deck', p.deck);
  if (p.lessons?.length) q.set('lessons', p.lessons.join(','));
  if (p.topics?.length) q.set('topics', p.topics.join(','));
  if (p.firstSide) q.set('side', p.firstSide);
  if (p.size) q.set('size', String(p.size));
  return `/practice?${q}`;
}

export function trapTopics(level: LevelContent): number[] {
  return level.topics.filter((t) => TRAP_SLUGS.includes(t.slug)).map((t) => t.number);
}

/** The cards a custom session draws from. */
export function deckCards(
  p: Pick<SessionParams, 'deck' | 'lessons' | 'topics'>,
  level: LevelContent,
): Card[] {
  if (p.deck === 'words') {
    return p.lessons.length ? level.words.filter((w) => p.lessons.includes(w.lesson)) : level.words;
  }
  if (p.deck === 'traps') {
    const traps = trapTopics(level);
    return level.grammarCards.filter((c) => traps.includes(c.topic));
  }
  return p.topics.length
    ? level.grammarCards.filter((c) => p.topics.includes(c.topic))
    : level.grammarCards;
}

export function buildSession(
  p: SessionParams,
  level: LevelContent,
  states: ReadonlyMap<string, CardState>,
  today: string,
  newPerDay: number,
): Card[] {
  if (p.mode === 'review') {
    const plan = planReview([...level.words, ...level.grammarCards], states, today, newPerDay);
    return [...shuffle(plan.due), ...plan.fresh];
  }
  return buildStack(deckCards(p, level), states, today, p.size);
}
