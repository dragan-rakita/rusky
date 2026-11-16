import { Layers, List, SlidersHorizontal, Table2 } from '@lucide/svelte';

/** Routes that show the bottom tab bar; practice and forms take the whole screen. */
export const TAB_ROUTES = ['/', '/words', '/grammar', '/grammar/[slug]', '/profile'];

/** Routes that show the sidebar on a wide screen, where it replaces the tab bar. */
export const SIDEBAR_ROUTES = [...TAB_ROUTES, '/setup', '/profile/password'];

/** Routes without the sidebar that still widen their column on a wide screen. */
export const FOCUS_ROUTES = ['/practice'];

/** Tailwind's `lg` breakpoint, for the few places script has to know the layout. */
export const DESKTOP_QUERY = '(min-width: 64rem)';

export const NAV_TABS = [
  { href: '/', label: 'Today', icon: Layers, match: (p: string) => p === '/' },
  { href: '/words', label: 'Words', icon: List, match: (p: string) => p.startsWith('/words') },
  {
    href: '/grammar',
    label: 'Grammar',
    icon: Table2,
    match: (p: string) => p.startsWith('/grammar'),
  },
];

/** The last tab on the phone, shown as the user's initial; the sidebar keeps it at the bottom. */
export const PROFILE_TAB = {
  href: '/profile',
  label: 'Profile',
  match: (p: string) => p.startsWith('/profile'),
};

export const SIDEBAR_LINKS = [
  ...NAV_TABS,
  {
    href: '/setup',
    label: 'New session',
    icon: SlidersHorizontal,
    match: (p: string) => p.startsWith('/setup'),
  },
];

/** Languages on the way, shown as not started until their content folder exists. */
export const PLANNED_LANGUAGES = [
  { code: 'de', name: 'Deutsch', english: 'German' },
  { code: 'en', name: 'English', english: 'English' },
];

/** The small outlined button at the end of a profile row. */
export const PROFILE_ACTION =
  'h-11 shrink-0 rounded-xl border-[1.5px] border-strong bg-card px-3.5 text-sm font-semibold text-ink disabled:opacity-50';

export const MONO_LABEL = 'font-mono text-[11px] font-semibold tracking-[0.06em]';
