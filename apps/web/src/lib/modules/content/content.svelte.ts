import { languages } from 'virtual:rusky/content';
import type { Card, ContentResponse, LevelContent } from '@rusky/core';
import { openRuskyDb } from '../progress/db';
import { settings } from '../settings/settings.svelte';

const CACHE_KEY = 'content';

const emptyLevel = (language: string, level: string): LevelContent => ({
  language,
  level,
  lessons: [],
  words: [],
  topics: [],
  grammarCards: [],
});

class ContentStore {
  languages = languages;
  /** The signed-in account's words and grammar; null until they are downloaded once. */
  remote = $state.raw<ContentResponse | null>(null);
  /** The device's copy has been looked for, so a null `remote` means there is none. */
  ready = $state(false);
  levels = $derived(this.remote?.levels ?? {});

  language = $derived(languages.find((l) => l.code === settings.values.language) ?? languages[0]);
  levelCodes = $derived(
    Object.keys(this.levels)
      .filter((k) => k.startsWith(`${this.language.code}/`))
      .map((k) => k.split('/')[1])
      .sort(),
  );
  level = $derived(
    this.levels[`${this.language.code}/${settings.values.level}`] ??
      this.levels[`${this.language.code}/${this.levelCodes[0]}`] ??
      emptyLevel(this.language.code, settings.values.level),
  );
  cards = $derived<Card[]>([...this.level.words, ...this.level.grammarCards]);
  categories = $derived(new Set(this.level.words.map((w) => w.category)).size);

  /** Short code for each side's label on the card: RU, SR. */
  targetCode = $derived(this.language.code.toUpperCase());
  nativeCode = $derived(this.language.native.split('-')[0].toUpperCase());

  topic(slug: string) {
    return this.level.topics.find((t) => t.slug === slug);
  }

  /** The account's content as last downloaded, so it is there offline from the first paint. */
  async loadCached() {
    try {
      const db = await openRuskyDb();
      this.remote = ((await db.get('meta', CACHE_KEY)) as ContentResponse | undefined) ?? null;
    } catch (e) {
      console.error('Could not read cached content', e);
    } finally {
      this.ready = true;
    }
  }

  /** Downloads the account's content when the server's version differs from the cached one. */
  async refresh(version: number) {
    if (this.remote?.version === version) return;
    try {
      const res = await fetch('/api/content', { credentials: 'include' });
      if (!res.ok) return;
      const body = (await res.json()) as ContentResponse;
      this.remote = body;
      const db = await openRuskyDb();
      await db.put('meta', body, CACHE_KEY);
    } catch (e) {
      console.error('Could not download content', e);
    }
  }

  /** Forgets the downloaded content, after signing out. */
  async clear() {
    this.remote = null;
    try {
      const db = await openRuskyDb();
      await db.delete('meta', CACHE_KEY);
    } catch (e) {
      console.error('Could not clear cached content', e);
    }
  }
}

export const content = new ContentStore();
