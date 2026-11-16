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

## Add lessons

- Words: export the spreadsheet from the tutor session and run `yarn content:import path/to/words.xlsx`. The `#` column is each card's permanent id.
- Grammar: edit `content/ru/a1/grammar.md` (one `## N. Title` per topic), `topics.csv` and `grammar-cards.csv`.
- Lesson titles: `content/ru/a1/lessons.csv`.

The build checks the content and stops on a mistake such as a repeated id.

## Layout

```
apps/web        SvelteKit app (static, PWA)
apps/api        Hono API: sign-in and sync
packages/core   shared logic: boxes, review planning, stress marks
content         words, grammar notes and grammar cards
```

## Deploy

Pushing to `main` deploys, the same way as Holocron. One-time server setup:

1. `git clone` into `~/opt/rusky`, then `yarn install`.
2. `apps/api/.env`: `DATABASE_URL` (an absolute path outside the repo), `ORIGIN=https://<domain>`, `PORT=3010`, `BETTER_AUTH_SECRET`.
3. `yarn db:migrate && yarn build && pm2 start ecosystem.config.cjs && pm2 save`.
4. nginx site:

```nginx
server {
  server_name <domain>;
  root /home/<user>/opt/rusky/apps/web/build;

  location /api/ {
    proxy_pass http://127.0.0.1:3010;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /_app/immutable/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  location = /sw.js {
    add_header Cache-Control "no-cache";
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

5. HTTPS with certbot, and the repository secrets `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`.
