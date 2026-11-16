/** app.html reads the theme key before the app loads, so it is stored on its own. */
export const THEME_KEY = 'rusky.theme';
export const SETTINGS_KEY = 'rusky.settings';

export const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Must match --bg in layout.css; the phone paints its status bar with it. */
export const THEME_COLORS = { light: '#f1f3f6', dark: '#0a0a0a' } as const;

export const NEW_PER_DAY_OPTIONS = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 30, label: '30' },
];

export const DEFAULT_SETTINGS: Settings = {
  language: 'ru',
  level: 'a1',
  firstSide: 'target',
  newPerDay: 20,
  lastSetup: null,
};
