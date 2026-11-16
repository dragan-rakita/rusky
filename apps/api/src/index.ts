import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { auth, isRegistrationOpen } from './auth';
import { env } from './env';
import { content } from './routes/content';
import { connector, registrationStatus, tokenErrors } from './routes/oauth';
import { sync } from './routes/sync';
import type { AppEnv } from './types';

const api = new Hono<AppEnv>();

api.use(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set('user', session?.user ?? null);
  c.set('session', session?.session ?? null);
  await next();
});

api.use('/auth/oauth2/token', tokenErrors);
api.use('/auth/oauth2/register', registrationStatus);
api.on(['GET', 'POST'], '/auth/*', (c) => auth.handler(c.req.raw));

api.get('/health', (c) => c.json({ ok: true }));
api.get('/registration', async (c) => c.json({ open: await isRegistrationOpen() }));
api.route('/content', content);
api.route('/sync', sync);

const app = new Hono();
app.use(logger());
app.route('/api', api);
app.route('/', connector);

serve({ fetch: app.fetch, port: env.port, hostname: '127.0.0.1' }, (info) => {
  console.log(`Rusky API on http://127.0.0.1:${info.port}/api, connector at ${env.origin}/mcp`);
});
