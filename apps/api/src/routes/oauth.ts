import { Hono, type MiddlewareHandler } from 'hono';
import { oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { MCP_TOOL_SCOPES, mcpResourceUrl, oauthIssuerUrl, rfc6749TokenError } from '@rusky/core';
import { auth } from '../auth';
import { env } from '../env';
import { createMcpServer } from '../mcp/server';
import { mcpUnauthorized, verifyMcpAccessToken } from '../oauth/access-token';

/** Claude only reconnects on `invalid_grant`; see `rfc6749TokenError`. */
export const tokenErrors: MiddlewareHandler = async (c, next) => {
  const grantType = new URLSearchParams(await c.req.raw.clone().text()).get('grant_type');
  await next();
  if (c.res.ok) return;
  const body = (await c.res
    .clone()
    .json()
    .catch(() => null)) as { error?: string; error_description?: string } | null;
  // Codes and descriptions only: a token request carries grants, never logged.
  console.warn(
    '[oauth] token refused:',
    grantType,
    c.res.status,
    body?.error,
    body?.error_description,
  );
  const mapped = rfc6749TokenError(c.res.status, body, grantType);
  if (mapped) {
    c.res = new Response(JSON.stringify(mapped.body), {
      status: mapped.status,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
};

/**
 * RFC 7591 answers a registration with 201, and better-auth drops the plugin's 201.
 * Every attempt is logged, because a refusal reaches the user only as Claude's
 * "Couldn't register" message.
 */
export const registrationStatus: MiddlewareHandler = async (c, next) => {
  const sent = (await c.req.raw
    .clone()
    .json()
    .catch(() => null)) as {
    client_name?: string;
    redirect_uris?: string[];
    scope?: string;
  } | null;
  await next();
  if (c.res.status === 200) {
    c.res = new Response(c.res.body, { status: 201, headers: c.res.headers });
  }
  console.info(
    '[oauth] client registration:',
    c.res.status,
    JSON.stringify({
      client_name: sent?.client_name,
      redirect_uris: sent?.redirect_uris,
      scope: sent?.scope,
    }),
  );
};

const authServerMetadata = oauthProviderAuthServerMetadata(auth);

/** The discovery documents and the MCP endpoint, outside /api because their paths are fixed. */
export const connector = new Hono()
  .get('/.well-known/oauth-protected-resource/mcp', (c) =>
    c.json({
      resource: mcpResourceUrl(env.origin),
      authorization_servers: [oauthIssuerUrl(env.origin)],
      scopes_supported: MCP_TOOL_SCOPES,
      bearer_methods_supported: ['header'],
      resource_name: 'Rusky',
    }),
  )
  .get('/.well-known/oauth-authorization-server/api/auth', (c) => authServerMetadata(c.req.raw))
  // Stateless: a server and transport per request, answered as JSON, so nothing is held
  // between calls or lost on a restart.
  .post('/mcp', async (c) => {
    const grant = verifyMcpAccessToken(c.req.header('authorization'));
    if (!grant) return mcpUnauthorized(env.origin);
    const server = createMcpServer(grant);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    try {
      return await transport.handleRequest(c.req.raw);
    } finally {
      await server.close();
    }
  })
  // No server-initiated stream. Unauthenticated, it still answers 401, which is how a
  // client discovers the OAuth server.
  .get('/mcp', (c) => {
    if (!verifyMcpAccessToken(c.req.header('authorization'))) return mcpUnauthorized(env.origin);
    return c.body(null, 405, { allow: 'POST' });
  });
