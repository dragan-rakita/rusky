import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { auth, isRegistrationOpen } from './auth';
import { env } from './env';
import { sync } from './routes/sync';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>().basePath('/api');

app.use(logger());

app.use(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set('user', session?.user ?? null);
  c.set('session', session?.session ?? null);
  await next();
});

app.on(['GET', 'POST'], '/auth/*', (c) => auth.handler(c.req.raw));

app.get('/health', (c) => c.json({ ok: true }));

app.get('/registration', async (c) => c.json({ open: await isRegistrationOpen() }));

app.route('/sync', sync);

serve({ fetch: app.fetch, port: env.port, hostname: '127.0.0.1' }, (info) => {
  console.log(`Rusky API on http://127.0.0.1:${info.port}/api`);
});
