import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { normalizeClientRegistration, OAUTH_SCOPES } from '@rusky/core';

/**
 * Registration is open to anyone, which is how Claude connects, but only for Claude's
 * callback (see `normalizeClientRegistration`). Runs on the router-matched path and the
 * parsed body, so no spelling of the URL gets past it. The body is corrected in place:
 * a body returned from a hook is merged over the original and can never remove a field.
 */
export function claudeOnlyRegistration(): BetterAuthPlugin {
  return {
    id: 'claude-only-registration',
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === '/oauth2/register',
          handler: createAuthMiddleware(async (ctx) => {
            const body: Record<string, unknown> =
              ctx.body && typeof ctx.body === 'object' ? ctx.body : {};
            const result = normalizeClientRegistration(body, OAUTH_SCOPES);
            if ('error' in result) {
              throw new APIError('BAD_REQUEST', {
                error: 'invalid_redirect_uri',
                error_description: result.error,
              });
            }
            for (const key of Object.keys(body)) delete body[key];
            Object.assign(body, result.body);
          }),
        },
      ],
    },
  };
}
