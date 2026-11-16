import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:rusky/content';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/**
 * Serves the list of languages as `virtual:rusky/content`. Words and grammar are not
 * built in: they come from the signed-in account, through the API.
 */
export function ruskyContent(root: string): Plugin {
  const file = path.join(root, 'languages.json');
  return {
    name: 'rusky-content',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      this.addWatchFile(file);
      return `export const languages = ${JSON.stringify(JSON.parse(readFileSync(file, 'utf8')))};\n`;
    },
    handleHotUpdate({ file: changed, server }) {
      if (changed !== file) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}
