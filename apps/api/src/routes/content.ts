import { Hono } from 'hono';
import type { ContentResponse } from '@rusky/core';
import { loadAllLevels } from '../content/store';
import type { AppEnv } from '../types';

/** The signed-in account's own words and grammar, every level, rendered for the app. */
export const content = new Hono<AppEnv>().get('/', (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Sign in to load your cards' }, 401);
  const body: ContentResponse = loadAllLevels(user.id);
  return c.json(body, 200, { 'cache-control': 'no-store' });
});
