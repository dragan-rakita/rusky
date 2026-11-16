import { isDue } from './leitner';
import type { Card, CardState } from './types';

export type Shuffle = <T>(items: T[]) => T[];

export const shuffle: Shuffle = (items) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const order = (card: Card) => (card.kind === 'word' ? card.lesson : card.topic);

export type ReviewPlan = {
  due: Card[];
  fresh: Card[];
};

/**
 * Today's review: every card that is due, plus new words in lesson order until the
 * daily allowance for new cards is used up.
 */
export function planReview(
  cards: readonly Card[],
  states: ReadonlyMap<string, CardState>,
  today: string,
  newPerDay: number,
): ReviewPlan {
  const due = cards
    .filter((c) => isDue(states.get(c.id), today))
    .sort((a, b) => (states.get(a.id)!.due! < states.get(b.id)!.due! ? -1 : 1));
  const introducedToday = [...states.values()].filter((s) => s.introduced === today).length;
  const allowance = Math.max(0, newPerDay - introducedToday);
  const fresh = cards
    .filter((c) => c.kind === 'word' && !states.get(c.id)?.reviews)
    .sort((a, b) => order(a) - order(b))
    .slice(0, allowance);
  return { due, fresh };
}

/**
 * A chosen stack: due cards first, then cards never seen, then the rest, cut to size.
 * Each group is shuffled so the same stack never runs in the same order.
 */
export function buildStack(
  cards: readonly Card[],
  states: ReadonlyMap<string, CardState>,
  today: string,
  size: number | 'all',
  mix: Shuffle = shuffle,
): Card[] {
  const due: Card[] = [];
  const fresh: Card[] = [];
  const rest: Card[] = [];
  for (const c of cards) {
    const s = states.get(c.id);
    if (isDue(s, today)) due.push(c);
    else if (!s?.reviews) fresh.push(c);
    else rest.push(c);
  }
  const all = [...mix(due), ...mix(fresh), ...mix(rest)];
  return size === 'all' ? all : all.slice(0, size);
}
