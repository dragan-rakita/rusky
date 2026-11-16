/** Routes that show the bottom tab bar; practice and forms take the whole screen. */
export const TAB_ROUTES = ['/', '/words', '/grammar', '/grammar/[slug]'];

/** Languages on the way, shown as not started until their content folder exists. */
export const PLANNED_LANGUAGES = [
  { code: 'de', name: 'Deutsch', english: 'German' },
  { code: 'en', name: 'English', english: 'English' },
];

/** The small outlined button at the end of a profile row. */
export const PROFILE_ACTION =
  'h-11 shrink-0 rounded-xl border-[1.5px] border-strong bg-card px-3.5 text-sm font-semibold text-ink disabled:opacity-50';

export const MONO_LABEL = 'font-mono text-[11px] font-semibold tracking-[0.06em]';
