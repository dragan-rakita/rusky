import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseLevelFiles, type Language, type LevelSources } from '@rusky/core';

/** The repo's content folder: the languages the app knows, and what a new account starts with. */
const CONTENT_DIR = process.env.CONTENT_DIR ?? path.resolve(process.cwd(), '../../content');

const read = (...parts: string[]) => readFileSync(path.join(CONTENT_DIR, ...parts), 'utf8');

export const languages: Language[] = JSON.parse(read('languages.json'));

export function seedSources(): LevelSources[] {
  return languages.flatMap((lang) =>
    lang.levels.map((level) =>
      parseLevelFiles(
        {
          words: read(lang.code, level, 'words.csv'),
          lessons: read(lang.code, level, 'lessons.csv'),
          topics: read(lang.code, level, 'topics.csv'),
          grammar: read(lang.code, level, 'grammar.md'),
          grammarCards: read(lang.code, level, 'grammar-cards.csv'),
        },
        lang.code,
        level,
      ),
    ),
  );
}
