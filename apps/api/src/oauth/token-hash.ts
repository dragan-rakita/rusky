import { createHash } from 'node:crypto';

/**
 * How OAuth codes and tokens are stored. Passed to the OAuth server as its hasher and
 * used again by the MCP endpoint to find an access token, so the two cannot drift
 * apart. SHA-256, base64url without padding: the plugin's own default.
 */
export function hashOAuthToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}
