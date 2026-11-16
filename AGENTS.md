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

- **A signed-in account's words and grammar live in the database** (`lesson`, `word`, `grammar_topic`, `grammar_card`, per user), and the Claude connector edits them. `content_state.version` is bumped by every change; `/api/sync` reports it and the app refetches `GET /api/content` when it differs, caching the result in IndexedDB.
- **`content/` is the starting point**: copied into an account the first time it is used (`ensureContent`). Changing these files later does not change an existing account. The web bundle holds only `content/languages.json` (`virtual:rusky/content`); words and grammar are never built into it.
- `content/languages.json` lists the languages the app knows (a new language starts there); each has `content/<lang>/<level>/` with `words.csv`, `lessons.csv`, `grammar.md`, `topics.csv`, `grammar-cards.csv`. `parseLevelFiles` in core checks them, for the web build and the API alike.
- **Card ids are permanent.** Progress is stored against them; changing or reusing an id loses or corrupts that card's history. New words get the next number (`ru-a1-w-170`); a corrected word keeps its id.
- "target" is the language being learned (red, the card's Russian side), "native" the one the user speaks (blue, Serbian). Never hard-code Russian or Serbian in code; German comes later.
- Grammar notes are Markdown, one topic each, rendered with `marked` and `decorateGrammarHtml` (stressed vowels and bold table cells in red).
- A grammar card is a flip card (`mode: 'flip'`) or a fill-the-gap drill (`mode: 'gap'`). A gap drill's `prompt` is the Russian sentence with one part in brackets, other right answers after `|` (`Я [чита́ю] кни́гу.`); `answer` is the first of them, kept in sync by the API. `hint` shows in the gap, `translation` (Serbian) under the card. The learner types the part; `checkGap` in core ignores stress marks, case, ё and outer punctuation, calls one letter off (answers of four letters or more) close, and the practice screen rings the suggested grade (knew, almost, again). Gap drills share the topic's id sequence, boxes and decks with flip cards. Claude adds them with `add_gap_drills`, which skips a sentence already in the level.

## Claude connector (MCP)

- Ported from Holocron; its AGENTS.md "Claude connector (MCP)" section explains each choice. The API is the OAuth server (`@better-auth/oauth-provider`, same exact version as `better-auth`) and serves MCP at `/mcp`: stateless, a server and transport per request, JSON responses.
- URLs outside `/api`: `/mcp`, `/.well-known/oauth-protected-resource/mcp`, `/.well-known/oauth-authorization-server/api/auth`. nginx must pass all three to the API.
- Registration is open only for Claude's callback (`normalizeClientRegistration`), every client gets the `/consent` screen once, tokens are opaque hashed rows, token errors are rewritten to `invalid_grant`. `/login` resumes the flow with `oauthResumeUrl`.
- The OAuth plugin refuses to start when `session` options are set without `storeSessionInDatabase: true`.
- One scope, `cards`. Tools: `get_overview` (lessons, topics, boxes, due, most-missed cards), `list_words`, `add_words`, `update_word`, `remove_word`, `set_lesson_title`, `get_grammar_topic`, `save_grammar_topic`, `add_grammar_cards`, `add_gap_drills`, `update_grammar_card`, `remove_grammar_card`. The instructions in `apps/api/src/mcp/server.ts` ask for stress marks and Serbian in Cyrillic, ijekavian (the user is from Republika Srpska).
- Test against the built API (`node dist/index.js`) on a throwaway `DATABASE_URL`; `RUSKY_API` points a second web dev server at it.

## Progress and sync

- Every grade is an append-only review event (`id` made on the device, `cardId`, `grade`, `reviewedAt`, `firstSide`). Card boxes are never stored: `replay()` in core rebuilds them, so reviews from two phones merge in any order.
- The web app keeps events in IndexedDB and works fully offline once signed in. `POST /api/sync { since, events }` uploads unsent events and returns everything after the cursor; the server ignores ids it already has.
- Grades are `again`, `almost`, `knew` (they move a card through the five boxes) and `done`, which retires a card: `CardState.done`, left out of `planReview` and `buildStack`, counted in its own column on Today and as known on the finished screen. Any later grade brings it back; the Words list shows a done word's "Done" control, which records an `again` (box 1, due tomorrow). `review.grade` is plain text, so `done` needed no migration.
- Sign-up is open only while there are no users, unless `REGISTRATION_OPEN=true`.

## Signed in only

- Signed out the app is `/login` and nothing else, plus `/consent` for the connector (`PUBLIC_ROUTES` in `auth/constants`); `+layout.svelte` sends every other route to `/login`. `/login` resumes an OAuth flow with `oauthResumeUrl` and otherwise goes to Today once signed in.
- No start-up server check: the user remembered in `localStorage['rusky.user']` is trusted, so the app opens offline. The background sync re-checks it; a 401 forgets the user and lands on `/login`.
- Signed in with no cards on the device yet, the layout shows "Getting your cards" with Try again until the first `/api/content` arrives.
- Sign out uploads what it can, keeps reviews that could not be uploaded (they go up at the next sign-in) and clears the cached words and grammar.
- `/profile` (the round initial on Today) holds the name, email, `/profile/password`, sync, devices ("Sign out others"), the Claude connections and the connector address, and Sign out. Name, password and sessions go through better-auth (`update-user`, `change-password` with `revokeOtherSessions`, `list-sessions`, `revoke-other-sessions`). `GET /api/connections` lists the apps holding a live refresh token for this account (Claude asks for `offline_access`); `DELETE /api/connections/:clientId` removes its tokens and consent, so the next `/mcp` call gets 401 and its refresh token `invalid_grant`.

## Design

- The design canvas is the Claude artifact "Rusky App Design" (light and dark rows). The card keeps the 7 × 3 shape of the user's paper cards; the stressed vowel is red.
- Colours are tokens in `apps/web/src/routes/layout.css` (`--target`, `--native`, `--ink`, …), set per `[data-theme]`. Dark surfaces are neutral: no tint.
- Theme is System / Light / Dark; `app.html` applies it before first paint from `localStorage['rusky.theme']`.
- Mobile first: below 1024px nothing changes; every desktop rule is behind `lg:` (wrappers are `contents` on the phone). From `lg`, `SIDEBAR_ROUTES` sit in a centred 1280px frame with a sticky 240px sidebar instead of the tab bar; practice is a wider column without it; login and consent stay narrow. Grammar is master–detail: the topic list in a sticky pane, the note beside it, `/grammar` showing the first topic.
- The app icon is a paper card with its red rule and "Rú" (the ú red) over a card with a blue rule, on ink. `yarn icons` (`scripts/make-icons.mjs`) reads the glyph outlines from Golos Text Bold in `node_modules/@fontsource/golos-text`, builds one SVG and writes `favicon.svg` (paths, no font) and the PNGs in `apps/web/static`. Rusky has no Playwright: run it as `PLAYWRIGHT_MODULE=<another project>/node_modules/playwright yarn icons`.

## Deployment

- **Rusky shares the Holocron server** (holocron2, 2.31.58.8) at https://rusky.holocron66.xyz. Never change anything of Holocron's there: its nginx site, its pm2 process, its port 3000, its database, `~/opt/holocron`. Rusky owns only `~/opt/rusky`, `~/opt/rusky-data`, `/var/www/rusky`, `~/backups/rusky-*`, the `rusky` nginx site and the `rusky-api` pm2 process. (116.203.38.3 is a different machine.)
- Merging a pull request into `main` runs `.github/workflows/deploy.yml` (a direct push to `main` deploys nothing): checks on the new head of `main`, then SSH as `dragan` with the `rusky-deploy@github-actions` key: `git checkout -B main origin/main`, install, back up the database, migrate, build, `rsync` the web build to `/var/www/rusky`, `pm2 restart rusky-api`, then wait for `/api/health`.
- nginx serves `/var/www/rusky` (the home folder is 750, so a build under `~/opt` is unreadable to it) and proxies `/api/`, `/mcp` and `/.well-known/oauth-` to `127.0.0.1:3010`. The site is `deploy/nginx/rusky.conf`; certbot adds the HTTPS block. `proxy_pass` must use `127.0.0.1`, not `localhost`. Run `sudo nginx -t` before every reload, and give a reload a second before testing it.
- The API reads `apps/api/.env` on start and pm2 holds none of those settings, so a plain `pm2 restart` picks up env changes. Never start it from a shell that sourced `.env`: pm2 would freeze those values, and `loadEnvFile` does not override them.
- `rusky-api` takes about three seconds to listen after a restart.
- `pm2 save` after changing the process list; check the saved list still holds `holocron` unchanged.
