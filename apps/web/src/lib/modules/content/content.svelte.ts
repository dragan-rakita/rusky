import { languages, levels } from 'virtual:rusky/content';
import type { Card } from '@rusky/core';
import { settings } from '../settings/settings.svelte';

class ContentStore {
  languages = languages;
  language = $derived(languages.find((l) => l.code === settings.values.language) ?? languages[0]);
  level = $derived(
    levels[`${this.language.code}/${settings.values.level}`] ??
      levels[`${this.language.code}/${this.language.levels[0]}`],
  );
  cards = $derived<Card[]>([...this.level.words, ...this.level.grammarCards]);
  categories = $derived(new Set(this.level.words.map((w) => w.category)).size);

  /** Short code for each side's label on the card: RU, SR. */
  targetCode = $derived(this.language.code.toUpperCase());
  nativeCode = $derived(this.language.native.split('-')[0].toUpperCase());

  topic(slug: string) {
    return this.level.topics.find((t) => t.slug === slug);
  }

  topicByNumber(n: number) {
    return this.level.topics.find((t) => t.number === n);
  }
}

export const content = new ContentStore();
