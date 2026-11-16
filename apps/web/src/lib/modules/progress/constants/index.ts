export const DB_NAME = 'rusky';
export const DB_VERSION = 1;

/** Grades are batched: a sync goes out a moment after the last one. */
export const SYNC_DEBOUNCE_MS = 2500;

/** How often each box comes back, in the words the Today screen uses. */
export const BOX_LABELS = ['daily', '2 days', '4 days', 'weekly', '2 weeks'];
