# Rusky

Flash cards and grammar for the languages I am learning. Russian A1 first, German later.

Each card has the language being learned on one side and Serbian on the other, in the 7 × 3 shape of my paper cards. Flip it, grade it, and the box system brings it back when it is due. Grammar notes become cards too.

It runs in the browser and installs on the phone as an app (Safari → Share → Add to Home Screen), with no App Store account needed. Progress syncs between devices when signed in, and everything works offline.

## Run it

```sh
nvm use
yarn install
cp apps/api/.env.example apps/api/.env   # then set BETTER_AUTH_SECRET
yarn db:migrate
yarn dev                                  # web on http://localhost:1389, API on 1390
```

The first account created can always sign up; after that sign-up closes.

To try it on the phone over Wi-Fi, run `yarn workspace @rusky/web run dev --host` and open the laptop's address on port 1389. Installing as an app and offline mode need the HTTPS deployment.

## Add lessons with Claude

Rusky is a Claude connector. In Claude (claude.ai → Settings → Connectors → Add custom connector) add `https://<domain>/mcp`, sign in and allow it once. It then shows up in every Claude chat and in Claude Code. During a lesson, ask Claude to add the new words or grammar: it sees the lessons, the grammar topics and the cards you keep missing, and it can add, correct and (when asked) remove words, grammar notes and grammar drill cards. The phone picks the changes up on its next sync.

The address is also in the app, under Languages → Claude.

## Starting content

`content/` holds what a new account starts with, and what the app shows when signed out. Once an account exists, its own copy lives in the database and changes through Claude.

- Words: `yarn content:import path/to/words.xlsx` turns a tutor-session spreadsheet into `words.csv`. The `#` column is each card's permanent id.
- Grammar: `content/ru/a1/grammar.md` (one `## N. Title` per topic), `topics.csv` and `grammar-cards.csv`.
- Lesson titles: `content/ru/a1/lessons.csv`.

The build checks the content and stops on a mistake such as a repeated id.

## Layout

```
apps/web        SvelteKit app (static, PWA)
apps/api        Hono API: sign-in, sync, content, and the Claude connector at /mcp
packages/core   shared logic: boxes, review planning, stress marks
content         words, grammar notes and grammar cards
```

## Deploy

Rusky runs at https://rusky.holocron66.xyz on the Holocron server (holocron2, 2.31.58.8), beside Holocron and touching nothing of it:

- `~/opt/rusky`: the checkout, which follows `main`. `apps/api/.env` holds the production settings (`ORIGIN`, `PORT=3010`, `DATABASE_URL` in `~/opt/rusky-data`, `BETTER_AUTH_SECRET`).
- `rusky-api` in pm2, on `127.0.0.1:3010`.
- `/var/www/rusky`: the built web app. nginx cannot read under the home folder (750), so the deploy copies the build here.
- `/etc/nginx/sites-available/rusky`: [deploy/nginx/rusky.conf](deploy/nginx/rusky.conf), plus the HTTPS block certbot adds.
- `~/backups/rusky-*.db`: a database snapshot before every deploy, the newest 30 kept.

Pushing to `main` runs the checks, then deploys over SSH (`.github/workflows/deploy.yml`): pull, install, back up, migrate, build, copy the app to `/var/www/rusky`, restart `rusky-api`, and fail unless it answers again. The repository secrets are `SERVER_HOST`, `SERVER_USER` and `SERVER_SSH_KEY`, a key used only for this (`rusky-deploy@github-actions`, `restrict`ed in `authorized_keys`).

HTTPS comes from Let's Encrypt through certbot (`sudo certbot --nginx -d rusky.holocron66.xyz --redirect`, run once on 2026-11-16), which renews it automatically.
