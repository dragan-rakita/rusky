import { and, asc, eq, gt, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import type { ConnectionsResponse } from '@rusky/core';
import { db } from '../db';
import { oauthAccessToken, oauthClient, oauthConsent, oauthRefreshToken } from '../db/schema';
import type { AppEnv } from '../types';

/**
 * The apps the signed-in account let in through the connector: those still holding a
 * refresh token. Disconnecting removes this account's tokens and consent, so the app's
 * next call to /mcp is refused and connecting again asks for consent again.
 */
export const connections = new Hono<AppEnv>()
  .get('/', (c) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Sign in first' }, 401);

    const live = new Set(
      db
        .select({ clientId: oauthRefreshToken.clientId })
        .from(oauthRefreshToken)
        .where(
          and(
            eq(oauthRefreshToken.userId, user.id),
            isNull(oauthRefreshToken.revoked),
            gt(oauthRefreshToken.expiresAt, new Date()),
          ),
        )
        .all()
        .map((r) => r.clientId),
    );
    // Consent is given once per client, so its date is when the app was connected.
    const list: ConnectionsResponse['connections'] = db
      .select({
        clientId: oauthClient.clientId,
        name: oauthClient.name,
        connectedAt: oauthConsent.createdAt,
      })
      .from(oauthConsent)
      .innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
      .where(eq(oauthConsent.userId, user.id))
      .orderBy(asc(oauthConsent.createdAt))
      .all()
      .filter((r) => live.has(r.clientId))
      .map((r) => ({
        clientId: r.clientId,
        name: r.name ?? 'Claude',
        connectedAt: r.connectedAt?.getTime() ?? null,
      }));
    return c.json({ connections: list }, 200, { 'cache-control': 'no-store' });
  })
  .delete('/:clientId', (c) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Sign in first' }, 401);
    const clientId = c.req.param('clientId');

    db.transaction((tx) => {
      tx.delete(oauthAccessToken)
        .where(and(eq(oauthAccessToken.clientId, clientId), eq(oauthAccessToken.userId, user.id)))
        .run();
      tx.delete(oauthRefreshToken)
        .where(and(eq(oauthRefreshToken.clientId, clientId), eq(oauthRefreshToken.userId, user.id)))
        .run();
      tx.delete(oauthConsent)
        .where(and(eq(oauthConsent.clientId, clientId), eq(oauthConsent.userId, user.id)))
        .run();
    });
    return c.json({ ok: true });
  });
