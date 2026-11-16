import { DEFAULT_SETTINGS, SETTINGS_KEY, THEME_KEY, THEME_MODES } from './constants';

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function readTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return THEME_MODES.some((m) => m.value === raw) ? (raw as ThemeMode) : 'system';
  } catch {
    return 'system';
  }
}

class SettingsStore {
  values = $state<Settings>(DEFAULT_SETTINGS);
  theme = $state<ThemeMode>('system');
  systemDark = $state(false);
  resolvedTheme = $derived<'light' | 'dark'>(
    this.theme === 'system' ? (this.systemDark ? 'dark' : 'light') : this.theme,
  );

  init() {
    this.values = readSettings();
    this.theme = readTheme();
    const query = matchMedia('(prefers-color-scheme: dark)');
    this.systemDark = query.matches;
    query.addEventListener('change', (e) => (this.systemDark = e.matches));
  }

  update(patch: Partial<Settings>) {
    this.values = { ...this.values, ...patch };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.values));
    } catch {
      // Private browsing can refuse storage; the choice still holds for this visit.
    }
  }

  setTheme(mode: ThemeMode) {
    this.theme = mode;
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      // As above.
    }
  }
}

export const settings = new SettingsStore();
