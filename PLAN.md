# Plan: protected app, profile, practice changes, app icon

Written 2026-11-16 for the Opus session that will execute it. Do the tasks in the order under "Order"; each one is a self-contained brief.

## Rules for every task

- Read `AGENTS.md` first and follow it. Never stage, commit, push or touch GitHub.
- Work on the `dev` checkout as it is. The working tree already holds uncommitted work (see "Already written"); keep it, do not revert it.
- After your change: `yarn format`, then `yarn run check`, `yarn lint`, `yarn test` (the `run` matters). Fix what they find in your own files; report anything failing in someone else's.
- Constants in `apps/web/src/lib/modules/<m>/constants/index.ts`, ambient types in `modules/<m>/types/*.d.ts`, kebab-case filenames, Lucide icons, colours only through the tokens in `apps/web/src/routes/layout.css`.
- Never hard-code Russian or Serbian in code.
- Never test against ports 1389/1390 or `apps/api/rusky.db`. Use your own ports and a throwaway `DATABASE_URL` (Task 4 has the recipe).
- Migrations may only add. This plan needs none; if you think you need one, stop and report.
- Must not break: offline start for a signed-in user (no start-up server check; trust `localStorage['rusky.user']`, re-check in the background), and the Claude connector (`/login` and `/consent` reachable signed out, `/login` resumes with `oauthResumeUrl`, `/api/auth/*`, `/mcp`, `/.well-known/oauth-*` public).
- At the end of each task, tell the user: files changed, what was verified and how, what was not.

## Decisions (confirmed by the user, 2026-11-16)

These are settled. Do not reopen them; if one turns out to be impossible, stop and say why.

1. **"Done" is a fourth grade button.** Again / Almost / Knew it keep moving cards through the five boxes; Done retires a card for good. The alternative from the feedback ("Knew it" itself means gone for ever) would retire a word after one correct answer and empty the boxes on Today. The core logic for the fourth button is already written.
2. **A done word can be brought back** from the Words list (it returns to box 1, due tomorrow), so a mis-tap is not permanent.
3. **Nothing under the card for words**, except a note when the word has one. EN and "from Lesson N" go; the "Show English after flipping" switch goes with them. Grammar cards keep their rule and topic link.
4. **Words and grammar are no longer built into the web bundle.** Signed out there is nothing to show; signed in they come from the account and are cached on the device.
5. **Sign out keeps reviews that could not be uploaded** on the device and uploads them at the next sign-in (today's behaviour). The cached words and grammar are cleared.
6. **Icon:** the paper card with its red rule and "Rú" in Golos Text Bold, the "ú" and its accent in red, a second card with a blue rule behind, on ink.

## Already written (uncommitted, untested)

Nothing has been run against this yet. Task 4 verifies it; Tasks 1–3 build on it.

- `packages/core`: grade `done`, `CardState.done`, `BoxGrade`; `applyGrade`, `isDue`, `buildStack` handle it; tests added in `core.test.ts`. Types `Connection`, `ConnectionsResponse`.
- `apps/api`: `sync` accepts `done`; overview reports `progress.done`; new `routes/connections.ts` (`GET /api/connections`, `DELETE /api/connections/:clientId`, per signed-in user) mounted in `index.ts`. The `grade` column is plain text, so no migration.
- `apps/web`:
  - `content-plugin.ts` serves only `languages`; `content.svelte.ts` has no built-in levels, an empty level until content arrives, and `ready`.
  - `progress.sync()` awaits `content.refresh()`.
  - `auth.svelte.ts`: `initial`, `updateName`, `changePassword`, `deviceCount`, `signOutOthers`. `auth/constants`: `PUBLIC_ROUTES`, `MIN_PASSWORD_LENGTH`.
  - `+layout.svelte`: signed out and not on a public route → `/login`; signed in without downloaded cards → "Getting your cards" with Try again.
  - `/login` rebuilt to the canvas; `/profile` and `/profile/password` new; `PROFILE_ACTION` in `ui/constants`.
  - `showEnglish` removed from the `Settings` type and defaults. **Three files still use it, so `yarn run check` fails until Task 1 is done.**

## Task 1 — finish the web screens

Files: `apps/web/src` only, and not `routes/login`, `routes/profile`, `+layout.svelte` unless a check forces it.

1. **Languages sheet** (`ui/components/settings-sheet.svelte`): remove the SYNC card, the CLAUDE card and the "Show English after flipping" switch, with the code only they used. They live on `/profile` now.
2. **Today** (`routes/+page.svelte`):
   - Header: next to the New session button, a 44px round link to `/profile` showing `auth.initial` (`bg-btn text-btn-fg`, `aria-label="Profile"`), 8px gap.
   - Boxes: done cards (`state.done`) leave the five box counts and show as a sixth column labelled "done". Keep it visibly different from the boxes (no red or ink top edge).
3. **Practice** (`routes/practice/+page.svelte`, `practice/faces.ts`, `practice/constants`):
   - Four grade buttons: Again, Almost, Knew it, Done (keys 1–4). Done records grade `done`; its second line reads "never again". `intervalFor` takes only the three box grades.
   - "Show answer" and the grade buttons are the same height (56px). The second line of each grade button is smaller (11px).
   - Words: no EN, no FROM. Show the note line only when the word has one. Drop the `showEnglish` argument. The card must not jump when it is flipped.
   - Finished screen: count done cards as known in the headline and give them their own tile.
4. **Setup** (`routes/setup/+page.svelte`): remove the English switch.
5. **Words** (`routes/words/+page.svelte`): a done word shows a "Done" control in place of the box meter; tapping it brings the word back by recording an `again` review (box 1, due tomorrow). Label it for screen readers.

Done when: `yarn run check`, `yarn lint`, `yarn test` pass, and `grep -rn showEnglish apps/web/src` is empty.

## Task 2 — app icon

Files: `scripts/make-icons.mjs`, `apps/web/static/*`, `package.json` only if the script's usage changes.

- Today's icon is drawn by a hand-written rasteriser and reads as a credit card with bars for text. Replace it with decision 6.
- Draw it as HTML/SVG and render with Playwright from `/Users/dragan/Documents/Business/drtech/holocron/node_modules/playwright` (Rusky has no Playwright; do not add the dependency — let the script take the path from an env var and fail with a clear message without it). Load the font from `node_modules/@fontsource/golos-text/files/`.
- Outputs, same names as now: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (artwork inside the middle 78%), `apple-touch-icon.png` (180, no transparency), `favicon-32.png`, and a matching `favicon.svg` that needs no font.
- Look at every PNG you produce before reporting. The lettering must be readable at 180px.
- Check the manifest in `apps/web/vite.config.ts` still lists what exists. The PWA itself (manifest, service worker, offline precache, `navigateFallbackDenylist`) is already set up; do not change it beyond the icon.

## Task 3 — design canvas

The canvas is https://claude.ai/artifact/4nrbEFMVp75JNb9WDqbTUb. Read it with the Artifact tool, follow its own instructions for revising, and do not render or screenshot it.

- `Practice.dc.html` (the dark, flipped and grammar boards import it): four equal-height grade buttons with the smaller second line, no EN/FROM panel under word cards.
- `Done.dc.html`: the done tile.
- `Main.dc.html`: the sixth "done" column in Boxes.
- `Languages.dc.html`: drop the "Hint after flipping · English" row.
- `Setup.dc.html`: drop the English switch.
- New `Icon.dc.html` (512×512) with a dark-row twin only if the icon differs in dark mode; add it to `canvas.json`.
- Never put the user's real name, email or domain on the canvas; it uses example data ("Ana").

## Task 4 — verify everything, then document

1. `yarn run check`, `yarn lint`, `yarn test`, `yarn build`. Run `yarn db:generate` and confirm it reports no schema change; if it writes a migration, delete it and report.
2. Start a throwaway stack: built API with `DATABASE_URL=<scratch>/test.db PORT=<free> ORIGIN=http://127.0.0.1:<web port> node apps/api/dist/index.js` (migrate the scratch database first, see `AGENTS.md` and `apps/api/.env.example` for the other variables), and `RUSKY_API=http://127.0.0.1:<api port> npx vite dev --port <web port>` in `apps/web`.
3. With Playwright (path in Task 2), at 390×844, light and dark, with screenshots you look at:
   - Signed out: `/`, `/words`, `/grammar`, `/practice`, `/setup`, `/profile` all land on `/login`; no word or grammar text is in the page or in the built JS (`grep` the build for a word from `content/ru/a1/words.csv`).
   - Create the first account, land on Today with cards. Reload with the API stopped: Today still opens and a card can be graded. Restart the API: the review syncs.
   - Profile: rename, change password (old one stops working, new one works), "Sign out others" with a second browser context, sign out returns to `/login`.
   - Practice: the four buttons, equal heights, Done removes the card from the next review and from a chosen stack, Words brings it back.
   - A second account cannot be created while one exists.
4. Connector, end to end against the throwaway stack: register a client at `/api/auth/oauth2/register` with Claude's callback, open the authorize URL with PKCE signed out → `/login` shows the Claude notice → sign in → `/consent` → Allow → capture the redirect to the callback without following it → exchange the code → `tools/list` on `/mcp` answers. Then: the connection is listed on `/profile`; Disconnect; the same token now gets 401 from `/mcp`. Also check `/.well-known/oauth-protected-resource/mcp` and `/.well-known/oauth-authorization-server/api/auth` answer signed out.
5. Fix what fails, in any file, and re-run step 1.
6. Update `AGENTS.md`: the app is protected (public routes, cached user, "Getting your cards"), content is no longer built into the web app, the profile and its endpoints, the `done` grade and how a word comes back, how icons are made. Remove the lines that say the app works signed out.

## Order

1. Task 1 first: the checks fail until it is done.
2. Task 2, then Task 3. They share no files with Task 1 or each other, so they can go to subagents if the user's rules allow it; otherwise do them in turn.
3. Task 4 last, once Tasks 1 and 2 are in.
4. Then tick the tasks off in this file and draft the branch name, commit message and PR comment for the user. No commit, no push, no deploy.

## Progress

- [x] Task 1 — web screens
- [x] Task 2 — app icon
- [x] Task 3 — design canvas
- [x] Task 4 — verified and documented
