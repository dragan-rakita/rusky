import { languages, levels as builtIn } from 'virtual:rusky/content';
import type { Card, ContentResponse } from '@rusky/core';
import { openRuskyDb } from '../progress/db';
import { settings } from '../settings/settings.svelte';

const CACHE_KEY = 'content';

class ContentStore {
  languages = languages;
  /** The signed-in account's own words and grammar; null means the content built into the app. */
  remote = $state.raw<ContentResponse | null>(null);
  levels = $derived(this.remote?.levels ?? builtIn);

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
      builtIn[`${this.language.code}/${this.language.levels[0]}`],
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

  /** Back to the built-in content, after signing out. */
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
