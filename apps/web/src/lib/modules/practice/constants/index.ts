import type { Grade } from '@rusky/core';

/** Card text size by visible length, as a share of the card's width (cqw). */
export const CARD_TEXT_STEPS = [
  { max: 8, cqw: 12.5 },
  { max: 13, cqw: 10.3 },
  { max: 19, cqw: 8.6 },
  { max: 26, cqw: 7.1 },
  { max: Infinity, cqw: 6 },
] as const;

export const GRADES: { grade: Grade; label: string; key: string }[] = [
  { grade: 'again', label: 'Again', key: '1' },
  { grade: 'almost', label: 'Almost', key: '2' },
  { grade: 'knew', label: 'Knew it', key: '3' },
  { grade: 'done', label: 'Done', key: '4' },
];

export const DECKS: { value: PracticeDeck; label: string }[] = [
  { value: 'words', label: 'Words' },
  { value: 'grammar', label: 'Grammar' },
  { value: 'traps', label: 'Traps' },
];

export const SIDE_CHOICES: FirstSideChoice[] = ['target', 'native', 'mix'];

export const SESSION_SIZES = ['10', '20', 'all'] as const;
export const DEFAULT_SESSION_SIZE = 20;

/** Grammar topics drilled under "Traps": mistakes Serbian speakers make, and false friends. */
export const TRAP_SLUGS = ['common-mistakes', 'false-friends'];

/** A turned-over card snaps back without animating, or the next answer would show mid-turn. */
export const SNAP_BACK_MS = 40;
