import { describe, expect, it } from 'vitest';
import {
  addDays,
  applyGrade,
  buildStack,
  daysBetween,
  intervalFor,
  newCardState,
  parseCsv,
  parseCsvRecords,
  planReview,
  replay,
  stressSegments,
  visibleLength,
  type Card,
  type CardState,
  type ReviewEvent,
} from './index';

const word = (id: string, lesson: number): Card => ({
  kind: 'word',
  id,
  lesson,
  category: 'Nouns',
  target: id,
  native: id,
  english: id,
  note: '',
});

const at = (day: string, hour = 12) =>
  new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`).getTime();

describe('stressSegments', () => {
  it('marks the vowel before a combining acute', () => {
    expect(stressSegments('хорошо́')).toEqual([
      { text: 'хорош', stressed: false },
      { text: 'о́', stressed: true },
    ]);
  });

  it('marks every ё and handles several stresses in a phrase', () => {
    const segs = stressSegments('Счёт, пожа́луйста.');
    expect(segs.filter((s) => s.stressed).map((s) => s.text)).toEqual(['ё', 'а́']);
    expect(segs.map((s) => s.text).join('')).toBe('Счёт, пожа́луйста.');
  });

  it('leaves text without marks as one run', () => {
    expect(stressSegments('Dobar dan!')).toEqual([{ text: 'Dobar dan!', stressed: false }]);
  });

  it('counts length without stress marks', () => {
    expect(visibleLength('спаси́бо')).toBe(7);
  });
});

describe('csv', () => {
  it('reads quoted fields with commas, quotes and newlines', () => {
    expect(parseCsv('a,"b, c","say ""hi""","x\ny"\r\n1,2,3,4\n')).toEqual([
      ['a', 'b, c', 'say "hi"', 'x\ny'],
      ['1', '2', '3', '4'],
    ]);
  });

  it('keys rows by the header and skips blank lines', () => {
    expect(parseCsvRecords('id,name\n\n1, one \n')).toEqual([{ id: '1', name: 'one' }]);
  });
});

describe('dates', () => {
  it('adds days across month ends', () => {
    expect(addDays('2026-11-30', 2)).toBe('2026-12-02');
    expect(daysBetween('2026-11-30', '2026-12-02')).toBe(2);
  });
});

describe('leitner', () => {
  it('moves a known card up one box and schedules it by that box', () => {
    const s = applyGrade(newCardState(), 'knew', '2026-11-16');
    expect(s).toMatchObject({ box: 2, due: '2026-11-18', reviews: 1, introduced: '2026-11-16' });
  });

  it('sends a missed card back to box 1 for tomorrow', () => {
    const s: CardState = {
      box: 4,
      due: '2026-11-16',
      reviews: 5,
      introduced: '2026-11-01',
      lastGrade: 'knew',
    };
    expect(applyGrade(s, 'again', '2026-11-16')).toMatchObject({ box: 1, due: '2026-11-17' });
  });

  it('keeps an almost-known card in its box', () => {
    const s: CardState = { box: 3, due: null, reviews: 2, introduced: null, lastGrade: null };
    expect(intervalFor(s, 'almost')).toBe(4);
    expect(intervalFor(s, 'knew')).toBe(7);
    expect(intervalFor(s, 'again')).toBe(1);
  });

  it('caps at box 5', () => {
    const s: CardState = { box: 5, due: null, reviews: 9, introduced: null, lastGrade: null };
    expect(applyGrade(s, 'knew', '2026-11-16')).toMatchObject({ box: 5, due: '2026-11-30' });
  });

  it('replays reviews in time order regardless of arrival order', () => {
    const events: ReviewEvent[] = [
      { id: 'b', cardId: 'c1', grade: 'knew', reviewedAt: at('2026-11-18'), firstSide: 'target' },
      { id: 'a', cardId: 'c1', grade: 'knew', reviewedAt: at('2026-11-16'), firstSide: 'native' },
    ];
    expect(replay(events).get('c1')).toMatchObject({ box: 3, due: '2026-11-22', reviews: 2 });
    expect(replay([...events].reverse()).get('c1')).toEqual(replay(events).get('c1'));
  });
});

describe('queues', () => {
  const cards = [word('w1', 1), word('w2', 1), word('w3', 2), word('w4', 3)];

  it('plans due cards plus new words up to the daily allowance', () => {
    const states = replay([
      { id: 'e1', cardId: 'w3', grade: 'knew', reviewedAt: at('2026-11-14'), firstSide: 'target' },
      { id: 'e2', cardId: 'w4', grade: 'again', reviewedAt: at('2026-11-16'), firstSide: 'target' },
    ]);
    const plan = planReview(cards, states, '2026-11-16', 2);
    expect(plan.due.map((c) => c.id)).toEqual(['w3']);
    expect(plan.fresh.map((c) => c.id)).toEqual(['w1']);
  });

  it('builds a stack with due cards first, then new, then the rest', () => {
    const states = replay([
      { id: 'e1', cardId: 'w2', grade: 'knew', reviewedAt: at('2026-11-14'), firstSide: 'target' },
      { id: 'e2', cardId: 'w4', grade: 'knew', reviewedAt: at('2026-11-16'), firstSide: 'target' },
    ]);
    const keep = <T>(xs: T[]) => xs;
    expect(buildStack(cards, states, '2026-11-16', 'all', keep).map((c) => c.id)).toEqual([
      'w2',
      'w1',
      'w3',
      'w4',
    ]);
    expect(buildStack(cards, states, '2026-11-16', 2, keep)).toHaveLength(2);
  });
});
