export const ACUTE = '\u0301';

export type StressSegment = { text: string; stressed: boolean };

/**
 * Splits text into runs so the stressed vowels can be drawn in their own colour.
 * A vowel followed by a combining acute is stressed, and so is every ё.
 */
export function stressSegments(text: string): StressSegment[] {
  const chars = Array.from(text);
  const out: StressSegment[] = [];
  let plain = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === ACUTE) continue;
    const acute = chars[i + 1] === ACUTE;
    if (acute || c === 'ё' || c === 'Ё') {
      if (plain) out.push({ text: plain, stressed: false });
      plain = '';
      out.push({ text: acute ? c + ACUTE : c, stressed: true });
    } else {
      plain += c;
    }
  }
  if (plain) out.push({ text: plain, stressed: false });
  return out;
}

/** Text without stress marks, lower-cased, for searching. */
export function plainText(text: string): string {
  return text.replaceAll(ACUTE, '').toLowerCase();
}

/** Visible length of the text, not counting stress marks. */
export function visibleLength(text: string): number {
  return Array.from(text.replaceAll(ACUTE, '')).length;
}
