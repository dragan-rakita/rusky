import { addDays, localDay } from './dates';
import type { CardState, Grade, ReviewEvent } from './types';

/** Days until a card in box N comes back: box 1 daily … box 5 every two weeks. */
export const BOX_INTERVAL_DAYS = [1, 2, 4, 7, 14] as const;
export const MAX_BOX = BOX_INTERVAL_DAYS.length;

export function newCardState(): CardState {
  return { box: 1, due: null, reviews: 0, introduced: null, lastGrade: null };
}

/** The box a card moves to: again → box 1, almost → stays, knew → one box up. */
export function nextBox(box: number, grade: Grade): number {
  if (grade === 'again') return 1;
  if (grade === 'almost') return box;
  return Math.min(box + 1, MAX_BOX);
}

/** How many days until the card comes back if graded this way. */
export function intervalFor(state: CardState, grade: Grade): number {
  return BOX_INTERVAL_DAYS[nextBox(state.box, grade) - 1];
}

export function applyGrade(state: CardState, grade: Grade, day: string): CardState {
  const box = nextBox(state.box, grade);
  return {
    box,
    due: addDays(day, BOX_INTERVAL_DAYS[box - 1]),
    reviews: state.reviews + 1,
    introduced: state.introduced ?? day,
    lastGrade: grade,
  };
}

/**
 * Card states rebuilt from every review, oldest first. Reviews from several devices
 * merge into the same answer whatever order they arrived in.
 */
export function replay(events: readonly ReviewEvent[]): Map<string, CardState> {
  const sorted = [...events].sort(
    (a, b) => a.reviewedAt - b.reviewedAt || a.id.localeCompare(b.id),
  );
  const states = new Map<string, CardState>();
  for (const e of sorted) {
    const prev = states.get(e.cardId) ?? newCardState();
    states.set(e.cardId, applyGrade(prev, e.grade, localDay(e.reviewedAt)));
  }
  return states;
}

export function isDue(state: CardState | undefined, today: string): boolean {
  return !!state && state.due !== null && state.due <= today;
}
