import { and, asc, eq, gt } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ReviewEvent, SyncResponse } from '@rusky/core';
import { ensureContent } from '../content/store';
import { db } from '../db';
import { review } from '../db/schema';
import type { AppEnv } from '../types';

const MAX_EVENTS_PER_REQUEST = 5000;

const syncBody = z.object({
  since: z.number().int().min(0),
  events: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        cardId: z.string().min(1).max(100),
        grade: z.enum(['again', 'almost', 'knew']),
        reviewedAt: z.number().int().positive(),
        firstSide: z.enum(['target', 'native']),
      }),
    )
    .max(MAX_EVENTS_PER_REQUEST),
});

export const sync = new Hono<AppEnv>().post('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Sign in to sync' }, 401);

  const parsed = syncBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`);
    return c.json({ error: 'Invalid sync request', issues }, 400);
  }
  const { since, events } = parsed.data;

  if (events.length > 0) {
    db.transaction((tx) => {
      for (const e of events) {
        tx.insert(review)
          .values({ ...e, userId: user.id })
          .onConflictDoNothing()
          .run();
      }
    });
  }

  const rows = db
    .select()
    .from(review)
    .where(and(eq(review.userId, user.id), gt(review.seq, since)))
    .orderBy(asc(review.seq))
    .all();

  const body: SyncResponse = {
    cursor: rows.length ? rows[rows.length - 1].seq : since,
    contentVersion: ensureContent(user.id),
    events: rows.map((r): ReviewEvent => ({
      id: r.id,
      cardId: r.cardId,
      grade: r.grade,
      reviewedAt: r.reviewedAt,
      firstSide: r.firstSide,
    })),
  };
  return c.json(body);
});
