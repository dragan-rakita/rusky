import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Workspace packages ship TypeScript source, so they are bundled in; everything
// else stays a runtime import (better-sqlite3 is native and cannot be bundled).
const external = Object.keys(pkg.dependencies).filter((d) => !d.startsWith('@rusky/'));

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: true,
  external,
});

console.log('Built dist/index.js');
