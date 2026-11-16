import { ACUTE } from './stress';
import type { BoxGrade } from './types';

/** A sentence with one part to type: `Я [чита́ю] кни́гу.`, other right answers after `|`. */
export type Gap = { before: string; answers: string[]; after: string };

export type GapResult = 'right' | 'close' | 'wrong';

const GAP = /\[([^[\]]+)\]/g;

/** The sentence split around its gap, or null unless it has exactly one non-empty `[gap]`. */
export function parseGap(sentence: string): Gap | null {
  const found = [...sentence.matchAll(GAP)];
  if (found.length !== 1 || /[[\]]/.test(sentence.replace(GAP, ''))) return null;
  const m = found[0];
  const answers = [
    ...new Set(
      m[1]
        .split('|')
        .map((a) => a.trim())
        .filter(Boolean),
    ),
  ];
  if (!answers.length) return null;
  return {
    before: sentence.slice(0, m.index),
    answers,
    after: sentence.slice(m.index + m[0].length),
  };
}

/** The sentence with its gap filled by the first answer and the brackets gone. */
export function fillGap(sentence: string): string {
  const gap = parseGap(sentence);
  return gap ? gap.before + gap.answers[0] + gap.after : sentence;
}

/** What counts when comparing a typed answer: no stress marks, case, ё, outer punctuation. */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFD')
    .replaceAll(ACUTE, '')
    .normalize('NFC')
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,!?;:…"'«»„“”()-]+|[\s.,!?;:…"'«»„“”()-]+$/g, '');
}

function editDistance(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const row = [i];
    for (let j = 1; j <= y.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[y.length];
}

/** Right, one letter off (a typo, for answers of four letters or more), or wrong. */
export function checkGap(typed: string, answers: string[]): GapResult {
  const t = normalizeAnswer(typed);
  if (!t) return 'wrong';
  const wanted = answers.map(normalizeAnswer);
  if (wanted.includes(t)) return 'right';
  if (wanted.some((w) => Array.from(w).length >= 4 && editDistance(t, w) === 1)) return 'close';
  return 'wrong';
}

export const GAP_GRADE: Record<GapResult, BoxGrade> = {
  right: 'knew',
  close: 'almost',
  wrong: 'again',
};
