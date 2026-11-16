import { eq } from 'drizzle-orm';
import { MCP_PATH, MCP_TOOL_SCOPES, toolScopes, type McpToolScope } from '@rusky/core';
import { db } from '../db';
import { oauthAccessToken, oauthClient } from '../db/schema';
import { hashOAuthToken } from './token-hash';

export type McpGrant = {
  userId: string;
  clientId: string;
  scopes: McpToolScope[];
};

/**
 * The user and client behind a bearer token, or null for anything the MCP endpoint must
 * answer with 401: no token, an unknown or expired one, a disabled client, a token
 * without a tool scope.
 */
export function verifyMcpAccessToken(
  authorization: string | undefined,
  now = new Date(),
): McpGrant | null {
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return null;

  const row = db
    .select({
      userId: oauthAccessToken.userId,
      clientId: oauthAccessToken.clientId,
      expiresAt: oauthAccessToken.expiresAt,
      scopes: oauthAccessToken.scopes,
      clientDisabled: oauthClient.disabled,
    })
    .from(oauthAccessToken)
    .innerJoin(oauthClient, eq(oauthClient.clientId, oauthAccessToken.clientId))
    .where(eq(oauthAccessToken.token, hashOAuthToken(token)))
    .get();

  if (!row?.userId || !row.expiresAt || row.expiresAt <= now || row.clientDisabled) return null;
  const scopes = toolScopes(row.scopes);
  if (scopes.length === 0) return null;
  return { userId: row.userId, clientId: row.clientId, scopes };
}

/** The 401 that starts Claude's OAuth flow: it names the metadata to read and the scopes to ask for. */
export function mcpUnauthorized(origin: string): Response {
  const metadata = `${origin}/.well-known/oauth-protected-resource${MCP_PATH}`;
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' }, id: null }),
    {
      status: 401,
      headers: {
        'content-type': 'application/json',
        'www-authenticate': `Bearer resource_metadata="${metadata}", scope="${MCP_TOOL_SCOPES.join(' ')}"`,
      },
    },
  );
}
