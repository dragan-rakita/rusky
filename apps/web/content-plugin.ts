import { readFileSync } from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import type { Plugin } from 'vite';
import { buildLevel, parseLevelFiles } from '../../packages/core/src/content.ts';
import type { Language, LevelContent } from '../../packages/core/src/types.ts';

const VIRTUAL_ID = 'virtual:rusky/content';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

const FILES = {
  words: 'words.csv',
  lessons: 'lessons.csv',
  topics: 'topics.csv',
  grammar: 'grammar.md',
  grammarCards: 'grammar-cards.csv',
} as const;

const render = (md: string) => marked.parse(md, { async: false, gfm: true });

/**
 * The repo's content, built into the app. It is what a signed-out visitor practises
 * and what a new account starts from; a signed-in account's own copy comes from the API.
 */
function loadContent(root: string, watch: (f: string) => void) {
  const read = (file: string) => {
    watch(file);
    return readFileSync(file, 'utf8');
  };
  const languages = JSON.parse(read(path.join(root, 'languages.json'))) as Language[];
  const levels: Record<string, LevelContent> = {};
  for (const lang of languages) {
    for (const level of lang.levels) {
      const dir = path.join(root, lang.code, level);
      const files = Object.fromEntries(
        Object.entries(FILES).map(([key, name]) => [key, read(path.join(dir, name))]),
      ) as Record<keyof typeof FILES, string>;
      levels[`${lang.code}/${level}`] = buildLevel(
        parseLevelFiles(files, lang.code, level),
        render,
      );
    }
  }
  return { languages, levels };
}

/** Serves the repo's content folder as `virtual:rusky/content`, rebuilt when a file changes. */
export function ruskyContent(root: string): Plugin {
  return {
    name: 'rusky-content',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      const { languages, levels } = loadContent(root, (f) => this.addWatchFile(f));
      return `export const languages = ${JSON.stringify(languages)};\nexport const levels = ${JSON.stringify(levels)};\n`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(root)) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}
