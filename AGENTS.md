# AGENTS.md

## Rules (MUST follow)

1. **Always read this file first** before starting any work on this project.
2. **Never stage or commit changes**: that is the user's responsibility.
3. **Run `yarn run check`, `yarn lint` and `yarn test` after completing every prompt** and fix what they find. Note the `run`: bare `yarn check` is yarn 1.x's own dependency checker, and `yarn workspace <name> check` hits the same trap, so the root scripts call `yarn workspace <name> run check`.
4. **Constants go in `apps/web/src/lib/modules/<module>/constants/index.ts`**, not inline in components.
5. **Web types go in `apps/web/src/lib/modules/<module>/types/*.d.ts`** as ambient `type Foo = { ... }`: no `export`, no `declare global`, no `interface`. Shared types live in `packages/core/src/types.ts` and are exported, because two apps import them.
6. **Format with Prettier** before linting: `yarn format`.
7. **Never revert the user's manual edits.** Read the file first and keep their change.
8. **Filenames are kebab-case**: `flash-card.svelte`, not `FlashCard.svelte`.

## Project

- Monorepo, yarn 1 workspaces, Node 24 (`.nvmrc`):
  - `packages/core`: shared TypeScript, consumed as source. Card and review types, the Leitner boxes, review planning, stress marks, CSV parsing.
  - `apps/api`: Hono on Node, Drizzle + better-sqlite3, better-auth (email and password). Bundled by esbuild into `dist/index.js`.
  - `apps/web`: SvelteKit (Svelte 5 runes) as a static single-page app (`adapter-static`, `ssr = false`), Tailwind 4, installable as a PWA. The same static build can be wrapped by Capacitor later if an App Store app is ever wanted.
  - `content/`: the learning material, as files.
- Icons: Lucide, named imports from `@lucide/svelte`.
- Dev ports: web 1389 (proxies `/api` to 1390), API 1390. Production API: 3010 behind nginx.

## Content

- `content/languages.json` lists languages; each has `content/<lang>/<level>/` with `words.csv`, `lessons.csv`, `grammar.md`, `topics.csv`, `grammar-cards.csv`.
- The web build reads these through `apps/web/content-plugin.ts` (`virtual:rusky/content`) and fails the build on a duplicate id, a missing lesson title, or a grammar card pointing at a topic `grammar.md` lacks.
- **Card ids are permanent.** Progress is stored against them; changing or reusing an id loses or corrupts that card's history. New words get new numbers; a corrected word keeps its id.
- `yarn content:import <words.xlsx>` turns the tutor session's spreadsheet into `words.csv`; its `#` column becomes the id (`ru-a1-w-001`).
- "target" is the language being learned (red, the card's Russian side), "native" the one the user speaks (blue, Serbian). Never hard-code Russian or Serbian in code; German comes later.
- Grammar notes in `grammar.md`: one `## N. Title` per topic; `topics.csv` gives each number a slug and a one-line summary.

## Progress and sync

- Every grade is an append-only review event (`id` made on the device, `cardId`, `grade`, `reviewedAt`, `firstSide`). Card boxes are never stored: `replay()` in core rebuilds them, so reviews from two phones merge in any order.
- The web app keeps events in IndexedDB and works fully offline and signed out. `POST /api/sync { since, events }` uploads unsent events and returns everything after the cursor; the server ignores ids it already has.
- Sign-up is open only while there are no users, unless `REGISTRATION_OPEN=true`.

## Design

- The design canvas is the Claude artifact "Rusky App Design" (light and dark rows). The card keeps the 7 × 3 shape of the user's paper cards; the stressed vowel is red.
- Colours are tokens in `apps/web/src/routes/layout.css` (`--target`, `--native`, `--ink`, …), set per `[data-theme]`. Dark surfaces are neutral: no tint.
- Theme is System / Light / Dark; `app.html` applies it before first paint from `localStorage['rusky.theme']`.

## Deployment

- Same server and pattern as Holocron: push to `main` runs `.github/workflows/deploy.yml` (checks, then SSH: pull, install, back up the database, migrate, build, `pm2 restart rusky-api`).
- nginx serves `apps/web/build` and proxies `/api` to `127.0.0.1:3010`; see README.md. `proxy_pass` must use `127.0.0.1`, not `localhost`.
- The API reads `apps/api/.env` on start, so a plain `pm2 restart` picks up env changes.
